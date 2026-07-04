/* Final mac simulasyonu: event-driven engine, S-curve power, match phases, momentum, headless runner. */
/* sim and _simPaused are declared in index.html — do not redeclare */
var speedMul = parseFloat(localStorage.getItem("copa_spd") || "1") || 1;

function setSpeed(s) {
  speedMul = s;
  try { localStorage.setItem("copa_spd", s); } catch (e) {}
  document.querySelectorAll(".spd").forEach(b => b.classList.toggle("on", parseFloat(b.dataset.s) === s));
  /* speedMul used directly in Phaser update loop */
}
function simPause() { if (sim && sim.pause) sim.pause(); }
function simSkip() { if (sim && sim.skip) sim.skip(); }

/* ── A. Seeded RNG ── */
function seededRand(seed) {
  let s = (seed ^ 0x9e3779b9) >>> 0;
  return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* ── B. Power model — S-curve ── */
function winProb(a, b) { return 0.5 + 0.45 * Math.tanh((a - b) / 28); }

/* ── C. Match phases ── */
function getPhase(clock) {
  if (clock < 20) return { id: 'early', scoreRate: 0.70, eventRate: 0.75 };
  if (clock < 65) return { id: 'mid',   scoreRate: 1.00, eventRate: 1.00 };
  if (clock < 90) return { id: 'late',  scoreRate: 1.25, eventRate: 1.30 };
                  return { id: 'et',    scoreRate: 0.85, eventRate: 0.80 };
}

/* ── Card bonus (safe global reads) ── */
function _cardBonusFinal() {
  if (typeof cards === "undefined" || typeof cardEff !== "function") return 0;
  const ps = (typeof picksBySlot !== "undefined" ? picksBySlot : []).filter(Boolean);
  let b = 0;
  cards.forEach(k => { try { const v = cardEff(k, ps, 6); if (v > 0) b += v * 0.14; } catch (e) {} });
  return b;
}

/* ── Commentary pools ── */
const _COMM = {
  goal_tr:   ["Goooool!", "Net buluyor!", "İnanılmaz!", "Harika gol!", "Şampiyonluk golü bu!", "Geçilmez!"],
  goal_en:   ["Goooal!", "In the net!", "Incredible!", "What a goal!", "Cup-winning strike!", "Unstoppable!"],
  save_tr:   ["Kaleci kurtardı!", "Müthiş refleks!", "Az kalsın!", "Direğe çarptı!"],
  save_en:   ["Keeper saves!", "Great reflex!", "So close!", "Off the post!"],
  chance_tr: ["Büyük fırsat!", "Tehlikeli atak!", "Neredeyse gol!", "İnanılmaz kaçırdı!"],
  chance_en: ["Big chance!", "Dangerous attack!", "Almost a goal!", "Incredible miss!"],
  wide_tr:   ["Yandan dışarı!", "Iskaladı!", "Az kaldı!", "Kötü şut!"],
  wide_en:   ["Wide of the goal!", "Missed it!", "So close!", "Poor shot!"]
};
function _pickComm(pool, rng) { return pool[Math.floor(rng() * pool.length)]; }

/* ── Scorer helpers ── */
function _pickerA(rng) {
  if (typeof picksBySlot === "undefined") return "?";
  const cands = picksBySlot.filter(p => p && p.pos && !["GK", "CB", "LB", "RB", "WB"].includes(p.pos));
  if (!cands.length) {
    const all = picksBySlot.filter(Boolean);
    return all.length ? all[Math.floor(rng() * all.length)].name.split(" ").pop() : "?";
  }
  return cands[Math.floor(rng() * cands.length)].name.split(" ").pop();
}
function _pickerB(rng) {
  if (typeof oppLineup !== "undefined" && oppLineup.length) {
    const pool = oppLineup.slice(0, 9);
    return pool[Math.floor(rng() * pool.length)].name.split(" ").pop();
  }
  return typeof opponent !== "undefined" ? (opponent.name || "Opponent") : "Opponent";
}
function _assistA(scorer, rng) {
  if (typeof picksBySlot === "undefined") return "";
  const cands = picksBySlot.filter(p => p && p.name.split(" ").pop() !== scorer);
  if (!cands.length) return "";
  return cands[Math.floor(rng() * cands.length)].name.split(" ").pop();
}

/* ── D. simulateMatch — PURE, NO DOM ── */
function simulateMatch(myPow, oppPow, rng) {
  const isTR = (typeof LANG !== "undefined" ? LANG : "tr") === "tr";

  /* state */
  let clock = 0, momentum = 50, gameOver = false, extraTime = false, halfDone = false, etHalf = false;
  const score = { A: 0, B: 0 };
  const stats = { shots: { A: 0, B: 0 }, saves: { A: 0, B: 0 }, corners: { A: 0, B: 0 } };
  const events = [];
  const stoppage = Math.floor(rng() * 4) + 2;
  const FULL = 90 + stoppage;

  function ep(side) {
    const cb = _cardBonusFinal();
    if (side === "A") return myPow + cb + (momentum - 50) * 0.07;
    return oppPow - (momentum - 50) * 0.07;
  }

  function nextGap(phase) {
    const r = Math.max(0.001, rng());
    return -Math.log(1 - r) * 3.5 / phase.eventRate;
  }

  function chooseSide() {
    const pA = Math.max(0.30, Math.min(0.70, 0.30 + momentum * 0.004));
    return rng() < pA ? "A" : "B";
  }

  function evPos(side, type) {
    const x = 0.28 + rng() * 0.44;
    if (type === "corner") {
      /* A attacks toward bottom (y≈1), B attacks toward top (y≈0) */
      return { x: rng() < 0.5 ? 0.01 : 0.99, y: side === "A" ? 0.87 + rng() * 0.08 : 0.05 + rng() * 0.08 };
    }
    /* A attacks toward bottom half; B attacks toward top half */
    const y = side === "A" ? 0.70 + rng() * 0.24 : 0.06 + rng() * 0.24;
    return { x, y };
  }

  function resolveShot(side, zone) {
    const att = ep(side), def = ep(side === "A" ? "B" : "A");
    const base = { close: 0.36, box: 0.19, long: 0.07 }[zone] || 0.07;
    const powFactor = Math.tanh((att - def) / 30) * 0.18;
    const trail = (score[side] < score[side === "A" ? "B" : "A"]) ? 0.06 : 0;
    const phase = getPhase(clock);
    const prob = Math.min(0.54, Math.max(0.04, (base + powFactor + trail) * phase.scoreRate));
    return rng() < prob;
  }

  function updateMom(delta) {
    momentum += delta;
    momentum += (50 - momentum) * 0.09;
    momentum = Math.max(0, Math.min(100, momentum));
  }

  function pushEvent(ev) { events.push(ev); }

  /* clock seed */
  clock = nextGap(getPhase(0)) * 0.5;

  let limit = FULL;
  let etLimit = FULL + 30;
  let penaltyNote = "";
  let keyMoment = "";
  const scorersA = [];

  /* ── MAIN EVENT LOOP ── */
  while (!gameOver) {
    const phase = getPhase(clock);

    /* time limit check */
    if (clock >= limit && !extraTime) {
      if (score.A === score.B) {
        /* go to extra time */
        extraTime = true;
        limit = FULL + 30;
        pushEvent({ minute: Math.floor(clock), type: "et_start", side: null, pos: { x: 0.5, y: 0.5 },
          label: isTR ? "Uzatmalar başlıyor" : "Extra time begins",
          comm: "⏱ " + (isTR ? "30 dakika uzatma!" : "30 minutes of extra time!")
        });
        clock += 0.5;
        continue;
      } else {
        gameOver = true;
        break;
      }
    }

    if (extraTime && clock >= FULL + 30) {
      if (score.A === score.B) {
        /* penalty shootout */
        const boost = (typeof hasCard === "function" && hasCard("sogukkanli_penaltici")) ? 0.08 : 0;
        const diff = (myPow - oppPow) / 200;
        const pA = Math.max(0.42, Math.min(0.93, 0.75 + diff + boost));
        const pB = Math.max(0.42, Math.min(0.93, 0.75 - diff));
        let kA = 0, kB = 0;
        const penResults = [];
        for (let i = 0; i < 5; i++) {
          const a = rng() < pA, b = rng() < pB;
          if (a) kA++; if (b) kB++;
          penResults.push({ a, b, kA, kB });
        }
        let wonA = kA > kB;
        if (kA === kB) {
          const a = rng() < pA, b = rng() < pB;
          if (a && !b) { wonA = true; kA++; }
          else if (b && !a) { wonA = false; kB++; }
          else { wonA = rng() < 0.5; if (wonA) kA++; else kB++; }
          penResults.push({ a: wonA, b: !wonA, kA, kB, sd: true });
        }
        if (wonA) score.A++; else score.B++;
        penaltyNote = wonA
          ? (isTR ? "penaltılarda kazandın" : "won on penalties")
          : (isTR ? "penaltılarda kaybettin" : "lost on penalties");
        pushEvent({ minute: Math.floor(clock), type: "penalty", side: wonA ? "A" : "B",
          pos: { x: 0.5, y: wonA ? 0.88 : 0.12 },
          label: penaltyNote, comm: "🎯 " + penaltyNote,
          penResults, kA, kB, wonA
        });
        if (!keyMoment) keyMoment = penaltyNote;
        gameOver = true;
        break;
      } else {
        gameOver = true;
        break;
      }
    }

    /* half-time pause markers (for UI, not blocking in headless) */
    if (!halfDone && clock >= 45) {
      halfDone = true;
      pushEvent({ minute: 45, type: "halftime", side: null, pos: { x: 0.5, y: 0.5 },
        label: isTR ? "Devre arası" : "Half time",
        comm: "🔔 " + (isTR ? "DEVRE ARASI" : "HALF TIME") + " · " + score.A + "–" + score.B
      });
    }
    if (extraTime && !etHalf && clock >= FULL + 15) {
      etHalf = true;
      pushEvent({ minute: Math.floor(FULL + 15), type: "et_half", side: null, pos: { x: 0.5, y: 0.5 },
        label: isTR ? "ET Devresi" : "ET Half-Time",
        comm: "🔔 " + (isTR ? "ET Devresi" : "ET Half-Time") + " · " + score.A + "–" + score.B
      });
    }

    const side = chooseSide();
    const roll = rng();

    if (roll < 0.38) {
      /* shot */
      const zr = rng();
      const zone = zr < 0.15 ? "close" : zr < 0.55 ? "box" : "long";
      const isGoal = resolveShot(side, zone);
      stats.shots[side]++;

      if (isGoal) {
        score[side]++;
        const scorer = side === "A" ? _pickerA(rng) : _pickerB(rng);
        const assist = side === "A" ? _assistA(scorer, rng) : "";
        if (side === "A") scorersA.push(scorer);
        const min = Math.min(extraTime ? 120 : 90, Math.floor(clock));
        const label = (isTR ? "Goool! " : "Goal! ") + scorer + " " + score.A + "–" + score.B;
        const comm = "⚽ <b>" + min + "'</b> <b>" + scorer + "</b>" + (assist ? " <small>" + (isTR ? "Asist" : "Assist") + " " + assist + "</small>" : "") + " — " + score.A + "–" + score.B;
        if (!keyMoment) keyMoment = scorer + " " + min + "'";
        pushEvent({ minute: min, type: "goal", side, pos: evPos(side, "goal"), scorer, assist, label, comm });
        updateMom(side === "A" ? 22 : -22);
      } else {
        /* save or wide */
        const isSave = rng() < 0.55;
        if (isSave) {
          stats.saves[side === "A" ? "B" : "A"]++;
          const comm = "🧤 " + _pickComm(isTR ? _COMM.save_tr : _COMM.save_en, rng);
          pushEvent({ minute: Math.floor(clock), type: "save", side: side === "A" ? "B" : "A",
            pos: evPos(side, "save"), label: isTR ? "Kaleci kurtardı" : "Keeper save", comm });
          updateMom(side === "A" ? -6 : 6);
          if (!keyMoment && stats.saves.A + stats.saves.B >= 2) keyMoment = isTR ? "kaleci oyunda tuttu" : "keeper kept it alive";
        } else {
          const comm = _pickComm(isTR ? _COMM.wide_tr : _COMM.wide_en, rng);
          pushEvent({ minute: Math.floor(clock), type: "shot_wide", side,
            pos: evPos(side, "shot_wide"), label: isTR ? "Iskaladı" : "Wide", comm });
          updateMom(side === "A" ? -3 : 3);
        }
      }
    } else if (roll < 0.53) {
      /* corner */
      stats.corners[side]++;
      pushEvent({ minute: Math.floor(clock), type: "corner", side,
        pos: evPos(side, "corner"), label: isTR ? "Köşe vuruşu" : "Corner kick",
        comm: (side === "A" ? (isTR ? "⛳ Köşe vuruşu!" : "⛳ Corner kick!") : (isTR ? "⛳ Rakip köşesi!" : "⛳ Opponent corner!"))
      });
      updateMom(side === "A" ? 4 : -4);
    } else if (roll < 0.66) {
      /* chance / near-miss */
      const comm = _pickComm(isTR ? _COMM.chance_tr : _COMM.chance_en, rng);
      pushEvent({ minute: Math.floor(clock), type: "chance", side,
        pos: evPos(side, "chance"), label: isTR ? "Büyük fırsat!" : "Big chance!", comm });
      updateMom(side === "A" ? 3 : -3);
    } else if (roll < 0.74) {
      /* foul / yellow card */
      const fouler = side === "A" ? _pickerB(rng) : _pickerA(rng);
      const isYellow = rng() < 0.6;
      const comm = isYellow
        ? "🟨 " + fouler + " — " + (isTR ? "Sarı kart!" : "Yellow card!")
        : "⚠️ " + fouler + " — " + (isTR ? "Faul!" : "Foul!");
      pushEvent({ minute: Math.floor(clock), type: isYellow ? "yellow" : "foul", side: side === "A" ? "B" : "A",
        pos: evPos(side, "chance"), label: isYellow ? (isTR ? "Sarı kart" : "Yellow card") : (isTR ? "Faul" : "Foul"), comm });
      updateMom(side === "A" ? -2 : 2);
    } else if (roll < 0.80) {
      /* free kick / tactical foul */
      const comm = "🎯 " + (isTR
        ? ["Serbest vuruş!", "Taktik faul!", "Hakem durduruyor!", "İyi pozisyon!"][Math.floor(rng()*4)]
        : ["Free kick!", "Tactical foul!", "Referee stops play!", "Good position!"][Math.floor(rng()*4)]);
      pushEvent({ minute: Math.floor(clock), type: "freekick", side,
        pos: evPos(side, "chance"), label: isTR ? "Serbest vuruş" : "Free kick", comm });
      updateMom(side === "A" ? 2 : -2);
    } else {
      /* atmosphere / crowd moment */
      const comm = isTR
        ? ["📣 Tribünler ayakta!", "🌊 Baskı devam ediyor!", "💨 Tempo yükseliyor!", "🔔 Kritik anlar!", "⚡ Her iki takım da baskılıyor!"][Math.floor(rng()*5)]
        : ["📣 Crowd on their feet!", "🌊 Pressure building!", "💨 The pace is high!", "🔔 Critical moments!", "⚡ Both teams pressing!"][Math.floor(rng()*5)];
      pushEvent({ minute: Math.floor(clock), type: "atmosphere", side,
        pos: {x:0.5,y:0.5}, label: isTR ? "Atmosfer" : "Atmosphere", comm });
      updateMom(0);
    }

    clock += nextGap(phase);
  }

  /* MOTM */
  let motm = "?";
  if (scorersA.length) {
    const freq = {};
    scorersA.forEach(n => freq[n] = (freq[n] || 0) + 1);
    let best = scorersA[0], bc = 0;
    Object.keys(freq).forEach(n => { if (freq[n] > bc) { bc = freq[n]; best = n; } });
    motm = best;
  } else if (typeof picksBySlot !== "undefined") {
    const out = picksBySlot.filter(p => p && p.pos !== "GK");
    const p = out.length ? out[Math.floor(Math.random() * out.length)] : picksBySlot.filter(Boolean)[0];
    if (p) motm = p.name.split(" ").pop();
  }

  const won = score.A > score.B;

  return { events, score, won, motm, keyMoment, penaltyNote, stats, fullTime: FULL };
}

/* ── E. runMatchHeadless ── */
function runMatchHeadless(myPow, oppPow, seed) {
  const rng = seededRand(seed || (Math.random() * 1e9 | 0));
  return simulateMatch(myPow, oppPow, rng);
}

/* ── G. clockDisp helper ── */
function clockDisp(clock, extraTime, FULL) {
  const c = Math.floor(clock);
  if (extraTime) {
    if (c <= FULL + 15) return Math.min(105, 91 + (c - Math.floor(FULL)));
    return Math.min(120, 106 + (c - Math.floor(FULL + 15)));
  }
  if (c > 90) return "90+" + (c - 90);
  return Math.max(1, c);
}

/* ── H. drawHeatmap ── */
function drawHeatmap(ctx, W, H, heatGrid, HGW, HGH) {
  /* Draw pitch background first so field is always visible */
  ctx.fillStyle = "#6fa052";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    if (i % 2 === 0) { ctx.fillStyle = "rgba(0,0,0,0.04)"; ctx.fillRect(0, i * H / 9, W, H / 9); }
  }
  const _GL = (W - W * 0.27) / 2, _GR = _GL + W * 0.27;
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.5;
  ctx.strokeRect(W * 0.03, H * 0.03, W * 0.94, H * 0.94);
  ctx.beginPath(); ctx.moveTo(W * 0.03, H / 2); ctx.lineTo(W * 0.97, H / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W * 0.1, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(_GL, H * 0.03); ctx.lineTo(_GR, H * 0.03); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(_GL, H * 0.97); ctx.lineTo(_GR, H * 0.97); ctx.stroke();
  const _PA_W = W * 0.44, _PA_H = H * 0.28, _PA_L = (W - _PA_W) / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
  ctx.strokeRect(_PA_L, H * 0.03, _PA_W, _PA_H);
  ctx.strokeRect(_PA_L, H * 0.97 - _PA_H, _PA_W, _PA_H);

  /* Gaussian smooth */
  const sm = new Float32Array(HGW * HGH);
  const kn = [0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625];
  for (let r = 0; r < HGH; r++) for (let c = 0; c < HGW; c++) {
    let v = 0, w = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < HGH && cc >= 0 && cc < HGW) {
        const ki = (dr + 1) * 3 + (dc + 1);
        v += heatGrid[rr * HGW + cc] * kn[ki]; w += kn[ki];
      }
    }
    sm[r * HGW + c] = v / w;
  }
  const mx = Math.max(1, ...Array.from(sm));
  const cw = W / HGW, ch = H / HGH;
  for (let r = 0; r < HGH; r++) for (let c = 0; c < HGW; c++) {
    const v = sm[r * HGW + c] / mx;
    if (v < 0.04) continue;
    const hue = v < 0.3 ? 220 - v / 0.3 * 80 : v < 0.6 ? 140 - (v - 0.3) / 0.3 * 100 : v < 0.85 ? 40 - (v - 0.6) / 0.25 * 40 : 0;
    const sat = v < 0.15 ? 70 : 85;
    const lit = v < 0.2 ? 55 : 48 - v * 4;
    const alpha = Math.min(0.85, v < 0.15 ? v / 0.15 * 0.3 : 0.3 + v * 0.55);
    ctx.fillStyle = `hsla(${hue},${sat}%,${lit}%,${alpha})`;
    ctx.fillRect(c * cw, r * ch, cw, ch);
  }
  /* label */
  const isTR = (typeof LANG !== "undefined" ? LANG : "tr") === "tr";
  const lbl = "🔥 " + (isTR ? "ISI HARİTASI" : "HEAT MAP");
  ctx.font = "bold 8px 'Inter',sans-serif";
  const lblW = ctx.measureText(lbl).width + 16;
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fillRect((W - lblW) / 2, H - 22, lblW, 17);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(lbl, W / 2, H - 13);
}


/* ── F. buildSim — pure Canvas 2D, zero dependencies ── */
function buildSim(myPow, oppPow) {
  const cvEl = $("cv");
  const W = Math.max(300, Math.min(780, ($("sim") && $("sim").clientWidth) || 560));
  const H = Math.round(W * 0.64);

  /* canvas setup */
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  canvas.style.cssText = "display:block;width:100%;border-radius:6px";
  cvEl.innerHTML = "";
  cvEl.style.cssText = "position:relative;border-radius:6px;overflow:hidden;background:#3d7a32";
  cvEl.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  /* ── player positions ──
     Team A (home): GK at top (defends top goal), attacks downward toward y≈1
       py_A = (1 - formation_y/100) * H
     Team B (away): GK at bottom, attacks upward toward y≈0
       py_B = formation_y/100 * H
  */
  const _mkTeam = (fmSlots, names, isA, injFlags) => fmSlots.map((s, i) => ({
    hx: isA ? s[1]/100*W : (1-s[1]/100)*W,
    hy: isA ? (1-s[2]/100)*H : s[2]/100*H,
    x:  isA ? s[1]/100*W : (1-s[1]/100)*W,
    y:  isA ? (1-s[2]/100)*H : s[2]/100*H,
    gk: i===0, isA,
    nm: (names[i]||"?").split(" ").pop(),
    inj: !!(injFlags && injFlags[i])
  }));

  const _fmA = (typeof slots !== "undefined") ? slots : (typeof FORMATIONS !== "undefined" ? FORMATIONS["4-4-2"] : []);
  const _fmB = (typeof FORMATIONS !== "undefined") ? (FORMATIONS["4-3-3"] || FORMATIONS["4-4-2"]) : _fmA;
  const _namesA = (typeof picksBySlot !== "undefined") ? picksBySlot.map(p => p ? p.name : "?") : [];
  const _namesB = (typeof oppLineup !== "undefined" && oppLineup.length) ? oppLineup.map(o => o.name) : Array(11).fill("?");
  const _injA = (typeof picksBySlot !== "undefined") ? picksBySlot.map(p => p && p.injured) : [];
  const psA = _mkTeam(_fmA, _namesA, true, _injA);
  const psB = _mkTeam(_fmB, _namesB, false, []);

  /* ── headless simulation ── */
  const _base = typeof seedNum !== "undefined" ? seedNum : (Date.now() & 0xffffff);
  const _r = typeof round !== "undefined" ? round : 1;
  const rng = seededRand(((_base * 1000003) ^ (_r * 2654435761)) >>> 0 || 1);
  const result = simulateMatch(myPow, oppPow, rng);
  const events = result.events;
  const FULL = result.fullTime;
  const hasET = events.some(e => e.type === "et_start");
  const totalMins = FULL + (hasET ? 30 : 0);

  /* propagate globals */
  window.motm = result.motm; try { motm = result.motm; } catch(e2) {}
  window.keyMoment = result.keyMoment;
  window.penaltyNote = result.penaltyNote;
  window.shotsA = result.stats.shots.A; window.shotsB = result.stats.shots.B;
  window.keeperA = result.stats.saves.B; window.keeperB = result.stats.saves.A;
  window.goals = events.filter(e => e.type === "goal");

  /* ── heatmap grid ── */
  const HGW = 20, HGH = 15;
  const heatGrid = new Float32Array(HGW * HGH);
  events.forEach(ev => {
    if (!ev.pos) return;
    const gx = Math.min(HGW-1, Math.floor(ev.pos.x*HGW));
    const gy = Math.min(HGH-1, Math.floor(ev.pos.y*HGH));
    const w = ev.type==="goal"?4:ev.type==="save"||ev.type==="shot_wide"?2:ev.type==="chance"?1.5:0.8;
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
      const rr=gy+dr,cc=gx+dc;
      if(rr>=0&&rr<HGH&&cc>=0&&cc<HGW) heatGrid[rr*HGW+cc]+=w*(dr===0&&dc===0?1:0.4);
    }
  });
  [...psA,...psB].forEach(p => {
    const gy=Math.min(HGH-1,Math.floor(p.hy/H*HGH));
    const gx=Math.min(HGW-1,Math.floor(p.hx/W*HGW));
    if(!p.gk) heatGrid[gy*HGW+gx]+=0.4;
  });

  /* ── animation state ── */
  const BASE_DUR = 90000; /* ms for 1x speed — 90 seconds real time */
  let _simProgress = 0, _simLastTs = null, _simMs = 0;
  let animId = null, gameEnded = false;
  let liveScore = {A:0,B:0}, momDisplay = 50;
  let liveShots = {A:0,B:0}, liveSaves = {A:0,B:0};
  let liveCorners = {A:0,B:0}, liveYellows = {A:0,B:0};
  let nextEvIdx = 0;
  /* ball */
  let bx = W/2, by = H/2, btx = W/2, bty = H/2, prevBx = W/2, prevBy = H/2;
  let ballSegStart = 0, ballSegDur = 1;
  /* overlays */
  let flashAlpha = 0, flashColor = [255,255,255];
  let burstText = "", burstAlpha = 0, burstTimer = 0;
  let commText = "—";
  /* possession smoothed */
  let _possDisplay = 50;

  /* ── geometry helpers ── */
  const GW = W*0.27, GL = (W-GW)/2, GR = GL+GW;
  const PAW = W*0.44, PAH = H*0.24, PAL = (W-PAW)/2;
  const PR = Math.max(5, Math.round(W*0.010)); /* player radius */
  const BR = Math.max(4, Math.round(W*0.009)); /* ball radius */

  function _evToCanvas(ev) {
    if (!ev || !ev.pos) return {x:W/2,y:H/2};
    return {x: ev.pos.x*W, y: ev.pos.y*H};
  }

  /* ── draw functions ── */
  function drawPitch() {
    /* stripe pattern */
    for (let i=0;i<9;i++) {
      ctx.fillStyle = i%2 ? "#3d7a32" : "#448b38";
      ctx.fillRect(0, i*H/9, W, H/9);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1.5;
    /* boundary */
    ctx.strokeRect(W*0.03, H*0.03, W*0.94, H*0.94);
    /* center line */
    ctx.beginPath(); ctx.moveTo(W*0.03,H/2); ctx.lineTo(W*0.97,H/2); ctx.stroke();
    /* center circle */
    ctx.beginPath(); ctx.arc(W/2,H/2,W*0.1,0,Math.PI*2); ctx.stroke();
    /* center spot */
    ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(W/2,H/2,2.5,0,Math.PI*2); ctx.fill();
    /* penalty areas */
    ctx.strokeStyle="rgba(255,255,255,0.55)"; ctx.lineWidth=1;
    ctx.strokeRect(PAL, H*0.03, PAW, PAH);
    ctx.strokeRect(PAL, H*0.97-PAH, PAW, PAH);
    /* goals (Team A defends TOP, Team B defends BOTTOM) */
    ctx.strokeStyle="rgba(255,255,255,0.85)"; ctx.lineWidth=2;
    ctx.strokeRect(GL, H*0.03-H*0.028, GW, H*0.028);  /* top goal */
    ctx.strokeRect(GL, H*0.97, GW, H*0.028);           /* bottom goal */
    /* penalty spots */
    ctx.fillStyle="rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.arc(W/2,H*0.17,2.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(W/2,H*0.83,2.5,0,Math.PI*2); ctx.fill();
    /* corner arcs */
    ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.lineWidth=1;
    const cr=W*0.025;
    [[W*0.03,H*0.03],[W*0.97,H*0.03],[W*0.03,H*0.97],[W*0.97,H*0.97]].forEach(([cx,cy])=>{
      ctx.beginPath();
      const a1=cx<W/2?(cy<H/2?0:Math.PI*1.5):(cy<H/2?Math.PI*0.5:Math.PI);
      ctx.arc(cx,cy,cr,a1,a1+Math.PI*0.5); ctx.stroke();
    });
    /* goal nets (interior grid lines) */
    ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=0.7;
    const nLines=4;
    for(let i=1;i<nLines;i++){
      const nx=GL+i*(GW/nLines);
      ctx.beginPath(); ctx.moveTo(nx,H*0.03-H*0.028); ctx.lineTo(nx,H*0.03); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(nx,H*0.97); ctx.lineTo(nx,H*0.97+H*0.028); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(GL,H*0.03-H*0.014); ctx.lineTo(GR,H*0.03-H*0.014); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(GL,H*0.97+H*0.014); ctx.lineTo(GR,H*0.97+H*0.014); ctx.stroke();
  }

  function drawPlayers(progress) {
    [...psA,...psB].forEach(p => {
      /* subtle drift toward ball */
      const tx = p.hx + (bx-p.hx)*0.08, ty = p.hy + (by-p.hy)*0.06;
      p.x += (tx-p.x)*0.04; p.y += (ty-p.y)*0.04;

      /* shadow */
      ctx.beginPath(); ctx.arc(p.x+1.5, p.y+2.5, PR, 0, Math.PI*2);
      ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fill();

      /* body */
      const col = p.isA ? (p.inj?"#f97316":"#3b82f6") : "#ef4444";
      ctx.beginPath(); ctx.arc(p.x, p.y, PR, 0, Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.2; ctx.stroke();

      /* GK ring */
      if (p.gk) {
        ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(p.x, p.y, PR+3, 0, Math.PI*2); ctx.stroke();
      }

      /* name label — below circle */
      if (W > 300) {
        const fs = Math.max(6, Math.round(W * 0.014));
        ctx.font = `${fs}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        const label = p.nm.slice(0, 5);
        const tw = ctx.measureText(label).width + 4;
        const lx = p.x - tw / 2, ly = p.y + PR + 2;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(lx, ly, tw, fs + 2);
        ctx.fillStyle = p.isA ? "#93c5fd" : "#fca5a5";
        ctx.fillText(label, p.x, ly + 1);
      }
    });
  }

  function drawBall() {
    /* shadow */
    ctx.beginPath(); ctx.arc(bx+2, by+3, BR, 0, Math.PI*2);
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();
    /* ball */
    const g = ctx.createRadialGradient(bx-BR*0.3, by-BR*0.3, BR*0.1, bx, by, BR);
    g.addColorStop(0,"#fff"); g.addColorStop(1,"#ccc");
    ctx.beginPath(); ctx.arc(bx, by, BR, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "#555"; ctx.lineWidth = 0.7; ctx.stroke();
    /* seam lines */
    ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(bx-BR*0.45,by-BR*0.5); ctx.lineTo(bx+BR*0.45,by+BR*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx+BR*0.45,by-BR*0.5); ctx.lineTo(bx-BR*0.45,by+BR*0.5); ctx.stroke();
  }

  function _rrect(x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
  }

  function drawHUD(progress) {
    const isTR=(typeof LANG!=="undefined"?LANG:"tr")==="tr";
    const clockMin = Math.min(120, Math.floor(progress * totalMins));
    const myN=(typeof teamName!=="undefined"&&teamName)?teamName.slice(0,8):"US";
    const oppN=(typeof opponent!=="undefined"&&opponent.name)?opponent.name.slice(0,8):"RAK";
    const lateGame = clockMin >= 80;

    /* ── scoreboard panel (top center) ── */
    const sbW = Math.min(W*0.72, 260), sbH = 32, sbX=(W-sbW)/2, sbY=5;
    ctx.fillStyle="rgba(0,0,0,0.72)"; _rrect(sbX,sbY,sbW,sbH,5); ctx.fill();

    /* team A name (left) */
    const nFS = Math.max(8, Math.round(W*0.018));
    ctx.font=`bold ${nFS}px monospace`; ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillStyle="#93c5fd";
    ctx.fillText(myN.toUpperCase(), sbX+7, sbY+sbH*0.38);

    /* score (center) */
    const scoreFS=Math.round(W*0.038);
    ctx.font=`bold ${scoreFS}px monospace`; ctx.textAlign="center";
    ctx.fillStyle="#fff";
    ctx.fillText(liveScore.A+"–"+liveScore.B, W/2, sbY+sbH*0.5);

    /* team B name (right) */
    ctx.textAlign="right"; ctx.fillStyle="#fca5a5";
    ctx.fillText(oppN.toUpperCase(), sbX+sbW-7, sbY+sbH*0.38);

    /* clock badge (below score) */
    const clkFS=Math.max(7,Math.round(W*0.019));
    ctx.font=`${clkFS}px monospace`; ctx.textAlign="center";
    ctx.fillStyle=lateGame?"#facc15":"rgba(255,255,255,0.7)";
    ctx.fillText(clockMin+"'", W/2, sbY+sbH*0.8);

    /* ── bottom bar: possession + momentum ── */
    _possDisplay += (momDisplay - _possDisplay) * 0.03;
    const mW=W*0.62, mH=6, mX=(W-mW)/2, mY=H-10;
    const pF=_possDisplay/100;

    /* possession bg */
    ctx.fillStyle="rgba(0,0,0,0.45)"; _rrect(mX,mY,mW,mH,3); ctx.fill();
    /* team A side */
    ctx.fillStyle="#3b82f6"; ctx.fillRect(mX,mY,mW*pF,mH);
    /* team B side */
    ctx.fillStyle="#ef4444"; ctx.fillRect(mX+mW*pF,mY,mW*(1-pF),mH);
    /* possession % labels */
    const plFS=Math.max(7,Math.round(W*0.017));
    ctx.font=`${plFS}px monospace`;
    ctx.fillStyle="rgba(255,255,255,0.9)"; ctx.textAlign="left";
    ctx.fillText(Math.round(pF*100)+"%", mX+3, mY-2);
    ctx.textAlign="right";
    ctx.fillText(Math.round((1-pF)*100)+"%", mX+mW-3, mY-2);
    /* possession label */
    ctx.textAlign="center"; ctx.fillStyle="rgba(255,255,255,0.45)";
    ctx.font=`${Math.max(6,Math.round(W*0.014))}px monospace`;
    ctx.fillText(isTR?"TOP":"POSS", W/2, mY-2);

    /* ── burst text (goal announcement) ── */
    if (burstAlpha>0 && burstText) {
      const bfs=Math.round(W*0.052), bY=H*0.44;
      ctx.globalAlpha=Math.min(1,burstAlpha);
      const bw=Math.min(W*0.85, ctx.measureText(burstText).width+32);
      ctx.fillStyle="rgba(0,0,0,0.62)"; _rrect((W-bw)/2,bY-bfs*0.65-6,bw,bfs+14,6); ctx.fill();
      ctx.strokeStyle="rgba(255,215,0,0.7)"; ctx.lineWidth=1.5;
      _rrect((W-bw)/2,bY-bfs*0.65-6,bw,bfs+14,6); ctx.stroke();
      ctx.fillStyle="#fff"; ctx.font=`bold ${bfs}px var(--disp,sans-serif)`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(burstText,W/2,bY);
      ctx.globalAlpha=1;
    }
    /* ── goal flash ── */
    if (flashAlpha>0) {
      ctx.fillStyle=`rgba(${flashColor.join(",")},${flashAlpha*0.32})`;
      ctx.fillRect(0,0,W,H);
    }
  }

  /* ── DOM sync ── */
  function _dom(id,v){const e=$( id);if(e)e.textContent=v;}
  function _html(id,v){const e=$(id);if(e)e.innerHTML=v;}

  function _updateDOMStats(){
    _dom("statShot",liveShots.A+"-"+liveShots.B);
    _dom("statSave",liveSaves.A+"-"+liveSaves.B);
    _dom("statDanger",result.stats.shots.A+"-"+result.stats.shots.B);
    _dom("statCorner",liveCorners.A+"-"+liveCorners.B);
    _dom("statYellow",liveYellows.A+"-"+liveYellows.B);
    const pct=Math.round(_possDisplay);
    _dom("statPoss",pct+"–"+(100-pct));
    const ma=$("momA"),mb=$("momB"),bar=$("momBar");
    const a=Math.round(momDisplay);
    if(ma)ma.textContent=a+"%"; if(mb)mb.textContent=(100-a)+"%";
    if(bar)bar.style.background=`linear-gradient(90deg,var(--green,#3fb950) ${a}%,var(--red,#ef4444) ${a}%)`;
  }

  function _addGoalRow(side,html){
    const el=$("simGoals"); if(!el)return;
    const d=document.createElement("div"); d.className=(side==="A"?"home":"away")+" goal";
    d.innerHTML=html; el.prepend(d);
    while(el.children.length>9)el.removeChild(el.lastChild);
  }

  function triggerEvent(ev) {
    const isTR=(typeof LANG!=="undefined"?LANG:"tr")==="tr";
    const myN=(typeof teamName!=="undefined"&&teamName)?teamName.slice(0,8):"US";
    const oppN=(typeof opponent!=="undefined"&&opponent.name)?opponent.name.slice(0,8):"RAK";

    if(ev.comm) { _html("simComm",ev.comm); _html("simRadio","📻 "+ev.comm); }

    switch(ev.type){
      case "goal":
        liveScore[ev.side]++; liveShots[ev.side]++;
        _dom("simScore",liveScore.A+"–"+liveScore.B);
        burstText="⚽ "+ev.scorer+" "+liveScore.A+"–"+liveScore.B;
        burstAlpha=1; burstTimer=1100;
        flashColor=ev.side==="A"?[74,222,128]:[249,115,22]; flashAlpha=1;
        _addGoalRow(ev.side,`<b>${ev.minute}'</b><span>⚽ ${ev.scorer||""} ${liveScore.A}–${liveScore.B}</span>`);
        if(typeof sfxGoal==="function")sfxGoal();
        momDisplay=Math.max(18,Math.min(82,momDisplay+(ev.side==="A"?22:-22)));
        break;
      case "save":
        liveShots[ev.side==="A"?"B":"A"]++; liveSaves[ev.side]++;
        _addGoalRow(ev.side,`<b>${ev.minute}'</b><span>🧤 ${isTR?"Kurtarış":"Save"}</span>`);
        if(typeof sfxSave==="function")sfxSave();
        momDisplay=Math.max(18,Math.min(82,momDisplay+(ev.side==="A"?-6:6)));
        break;
      case "shot_wide":
        liveShots[ev.side]++;
        if(typeof sfxKick==="function")sfxKick(2);
        momDisplay=Math.max(18,Math.min(82,momDisplay+(ev.side==="A"?-3:3)));
        break;
      case "corner":
        liveCorners[ev.side]++;
        _addGoalRow(ev.side,`<b>${ev.minute}'</b><span>🚩 ${isTR?"Köşe":"Corner"}</span>`);
        if(typeof sfxWhistle==="function")sfxWhistle();
        momDisplay=Math.max(18,Math.min(82,momDisplay+(ev.side==="A"?4:-4)));
        break;
      case "halftime":
        if(typeof sfxWhistle==="function")sfxWhistle();
        momDisplay=momDisplay*0.7+50*0.3;
        _dom("simState",isTR?"DEVRE ARASI":"HALF TIME");
        break;
      case "et_start":
        if(typeof sfxWhistle==="function")sfxWhistle();
        _dom("simState",isTR?"UZATMALAR":"EXTRA TIME");
        break;
      case "penalty": {
        _dom("simState",isTR?"PENALTILAR":"PENALTIES");
        if(ev.penResults){
          let delay=200;
          ev.penResults.forEach((pr,pi)=>{ delay+=600; setTimeout(()=>{
            const mA=pr.a?"✅":"❌",mB=pr.b?"✅":"❌";
            _html("simComm",`🎯 ${pr.sd?"SD":pi+1}. ${mA} <b>${myN}</b> <span style="opacity:.5">${pr.kA}–${pr.kB}</span> <b>${oppN}</b> ${mB}`);
            if(typeof sfxKick==="function")sfxKick(3);
          },delay); });
          setTimeout(endMatch, delay+600);
        } else setTimeout(endMatch,600);
        break;
      }
      case "yellow":
        liveYellows[ev.side]++;
        _addGoalRow(ev.side,`<b>${ev.minute}'</b><span>🟨 ${isTR?"Sarı Kart":"Yellow Card"}</span>`);
        if(typeof sfxCard==="function")sfxCard();
        flashColor=[250,204,21]; flashAlpha=0.5;
        break;
      case "foul":
        if(typeof sfxKick==="function")sfxKick(1);
        break;
      case "freekick":
        _addGoalRow(ev.side,`<b>${ev.minute}'</b><span>🎯 ${isTR?"Serbest Vuruş":"Free Kick"}</span>`);
        if(typeof sfxWhistle==="function")sfxWhistle();
        break;
      case "atmosphere":
        if(typeof sfxGrumble==="function")sfxGrumble();
        break;
      default: break;
    }

    /* simState live update */
    const diff=liveScore.A-liveScore.B;
    if(ev.type!=="halftime"&&ev.type!=="et_start"&&ev.type!=="penalty"){
      if(diff>0)_dom("simState",myN+" "+(isTR?"önde":"leads"));
      else if(diff<0)_dom("simState",oppN+" "+(isTR?"önde":"leads"));
      else _dom("simState",isTR?"Berabere":"Level");
    }
    _updateDOMStats();
  }

  function _calcPlayerRatings() {
    window.lastMatchRatings = null;
    try {
      const players = (typeof picksBySlot !== "undefined" ? picksBySlot : []).filter(Boolean);
      if (!players.length) return;
      /* build goal/assist maps from events (side A = player team) */
      const goalMap = {}, assistMap = {};
      events.forEach(ev => {
        if (ev.type !== "goal" || ev.side !== "A") return;
        const sn = (ev.scorer || "").split(" ").pop();
        if (sn) goalMap[sn] = (goalMap[sn] || 0) + 1;
        const an = (ev.assist || "").split(" ").pop();
        if (an) assistMap[an] = (assistMap[an] || 0) + 1;
      });
      const gFor = result.score.A, gAgainst = result.score.B, won = result.won;
      const seed = typeof seedNum !== "undefined" ? seedNum : 0;
      window.lastMatchRatings = players.map((p, i) => {
        const sn = p.name.split(" ").pop();
        const goals = goalMap[sn] || 0, assists = assistMap[sn] || 0;
        const grp = typeof groupOf === "function" ? groupOf(p.pos) : "MID";
        let r = 6.0;
        r += goals * 1.5 + assists * 0.7;
        r += won ? 0.3 : (gAgainst > gFor ? -0.25 : 0);
        if (grp === "GK") r += gAgainst === 0 ? 0.8 : -gAgainst * 0.25;
        else if (grp === "DEF" && gAgainst === 0) r += 0.3;
        /* seeded per-player variance ±0.3 */
        r += (Math.sin(seed * 31 + i * 17) * 0.5 + 0.5) * 0.6 - 0.3;
        r = Math.round(Math.max(4.5, Math.min(9.5, r)) * 10) / 10;
        return { name: p.name, pos: p.pos, eff: typeof effOf === "function" ? effOf(p) : (p.ov || 0), rating: r, goals, assists };
      });
    } catch (e) {}
  }

  function makeReport(won) {
    const tr=typeof LANG!=="undefined"&&LANG==="tr";
    const kM=result.keyMoment||(window.goals&&window.goals[0]&&window.goals[0].scorer)||"-";
    const ct=(typeof finalCardSummary==="function"?finalCardSummary():"").replace(/<[^>]*>/g," ").trim();
    const rows=[[tr?"Kırılma anı":"Key moment",kM],[tr?"Şutlar":"Shots",result.stats.shots.A+"-"+result.stats.shots.B],[tr?"Kurtarışlar":"Saves",result.stats.saves.A+"-"+result.stats.saves.B],[tr?"Kart etkisi":"Card effect",ct||"0"]];
    if(result.penaltyNote)rows.push([tr?"Penaltılar":"Penalties",result.penaltyNote]);
    const ni=Math.floor(Math.random()*6);
    const fw=["Kupa sandığa girdi.","Rüya sezon!","Son düdüğe kadar didindi.","Bu takım birlikte büyüdü.","Bugün kupayı hak etti.","İnançla kaldırdı kupayı."];
    const lw=["Finale geldi, yetmedi.","Son adımda tökezledi.","Kupa yakındı.","Şampiyonluk başka birini seçti.","Sıfırdan başla.","Bir sonraki run."];
    rows.push([tr?"Final yorumu":"Final note",won?(tr?fw[ni]:fw[ni]):(tr?lw[ni]:lw[ni])]);
    window.finalReportHTML=`<h4>${tr?"Final Karnesi":"Final Report"}</h4>`+rows.map(r=>`<div class="frrow"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");
  }

  function endMatch() {
    if(gameEnded)return; gameEnded=true;
    if(animId){cancelAnimationFrame(animId);animId=null;}
    if(typeof crowdStop==="function")crowdStop();
    if(typeof sfxWhistle==="function")sfxWhistle();
    /* draw final frame with heatmap overlay */
    drawPitch(); drawPlayers(1); drawBall();
    drawHeatmap(ctx,W,H,heatGrid,HGW,HGH);
    try{window._heatmapImg=canvas.toDataURL("image/png");}catch(e2){}
    _dom("simScore",result.score.A+"–"+result.score.B);
    makeReport(result.won);
    _calcPlayerRatings();
    setTimeout(()=>endRun(result.won,result.score.A+"–"+result.score.B),900);
  }

  /* ── animation loop ── */
  function ease(t){return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}

  function tick(ts) {
    if(gameEnded)return;
    if(!_simLastTs)_simLastTs=ts;
    const dt=ts-_simLastTs; _simLastTs=ts; _simMs+=dt;
    const curSpeed=Math.max(0.1,typeof speedMul!=="undefined"?speedMul:1);
    _simProgress=Math.min(1,_simProgress+(dt*curSpeed)/BASE_DUR);
    const progress=_simProgress;
    const clockMin=progress*totalMins;

    /* trigger events one per tick — prevents ball teleporting when events cluster */
    if(nextEvIdx<events.length){
      const ev=events[nextEvIdx];
      if(clockMin>=(ev.minute||0)){
        nextEvIdx++;
        const ep=_evToCanvas(ev);
        prevBx=bx; prevBy=by;
        btx=ep.x; bty=ep.y;
        ballSegStart=_simMs;
        const dist=Math.hypot(btx-bx,bty-by);
        ballSegDur=Math.max(180,Math.min(900,dist*1.2));
        triggerEvent(ev);
        if(ev.type==="penalty")return;
      }
    }

    /* ball interpolation */
    const segProg=Math.min(1,(_simMs-ballSegStart)/ballSegDur);
    const sp=ease(segProg);
    bx=prevBx+(btx-prevBx)*sp;
    by=prevBy+(bty-prevBy)*sp;

    /* flash decay */
    if(flashAlpha>0)flashAlpha=Math.max(0,flashAlpha-0.035);
    /* burst decay */
    if(burstTimer>0){burstTimer-=16;if(burstTimer<=0)burstAlpha=Math.max(0,burstAlpha-0.08);}
    else if(burstAlpha>0)burstAlpha=Math.max(0,burstAlpha-0.04);

    /* render */
    ctx.clearRect(0,0,W,H);
    drawPitch();
    drawPlayers(progress);
    drawBall();
    drawHUD(progress);

    /* sync DOM clock */
    _dom("simClk",Math.min(Math.floor(clockMin),hasET?120:90)+"'");

    if(progress>=1){endMatch();return;}
    animId=requestAnimationFrame(tick);
  }

  /* ── controls ── */
  sim = {
    pause: function(){ if(animId){cancelAnimationFrame(animId);animId=null;} },
    skip:  function(){
      if(gameEnded)return;
      if(animId){cancelAnimationFrame(animId);animId=null;}
      /* fire all remaining events instantly for correct final score */
      while(nextEvIdx<events.length){ triggerEvent(events[nextEvIdx++]); }
      endMatch();
    }
  };

  /* init DOM */
  _dom("simScore","0–0"); _dom("simClk","0'"); _dom("simState","Dengeli final");
  _dom("simComm","—"); _dom("simRadio","📻 —");
  const sg=$("simGoals"); if(sg)sg.innerHTML="";
  _updateDOMStats();
  const isTR2=(typeof LANG!=="undefined"?LANG:"tr")==="tr";
  const myN2=(typeof teamName!=="undefined"&&teamName)?teamName.slice(0,8):"US";
  const oppN2=(typeof opponent!=="undefined"&&opponent.name)?opponent.name.slice(0,8):"RAK";
  _dom("simA", myN2); _dom("simB", oppN2);

  /* start */
  animId=requestAnimationFrame(tick);
}
