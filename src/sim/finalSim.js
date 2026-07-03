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
    } else {
      /* silent possession — just decay momentum */
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

/* ── F. buildSim (Phaser 3) ── */
function buildSim(myPow, oppPow) {
  /* Kill previous Phaser instance */
  if (window._phaserGame) { try { window._phaserGame.destroy(true); } catch(e){} window._phaserGame = null; }

  const cvEl = $("cv");
  const W = Math.max(340, Math.min(860, ($("sim") && $("sim").clientWidth) || 600));
  const H = Math.round(W * 0.62);
  const GW = Math.round(W * 0.27), GL = (W - GW) / 2, GR = GL + GW;

  { const clk=$("simClk"); if (clk) clk.textContent="0'"; }
  { const sc=$("simScore"); if (sc) sc.textContent="0–0"; }
  cvEl.innerHTML = "";
  cvEl.style.cssText = `width:${W}px;max-width:100%;height:${H}px;overflow:hidden;border-radius:6px`;
  /* ── Simulation (headless) ── */

  /* ── Player data ── */
  function teamFrom(coords, poses, names, side, inj) {
    return coords.map((c,i) => {
      const hx = side==="A" ? c[0]/100*W : (1-c[0]/100)*W;
      const hy = side==="A" ? c[1]/100*H : (1-c[1]/100)*H;
      return { hx,hy, x:hx,y:hy, gk:i===0, n:i+1,
        nm:((names[i]||"").split(" ").pop()||"?"), isA:side==="A",
        inj:!!(inj&&inj[i]), pos:(poses[i]||"CM") };
    });
  }
  const psA = teamFrom(slots.map(s=>[s[1],s[2]]), slots.map(s=>s[0]),
    picksBySlot.map(p=>p?p.name:""), "A", picksBySlot.map(p=>p&&p.injured));
  const psB = teamFrom(FORMATIONS["4-3-3"].map(s=>[s[1],s[2]]), FORMATIONS["4-3-3"].map(s=>s[0]),
    oppLineup.length?oppLineup.map(o=>o.name):Array(11).fill("?"), "B");
  const allPlayers = [...psA, ...psB];

  /* ── Simulation (headless) ── */
  /* Mix round into seed so each match produces unique events even with same seedNum */
  const _base = typeof seedNum !== "undefined" ? seedNum : Date.now();
  const _r = typeof round !== "undefined" ? round : 1;
  const rng = seededRand(((_base * 1000003) ^ (_r * 2654435761)) >>> 0 || 1);
  const result = simulateMatch(myPow, oppPow, rng);
  const events = result.events;

  window.motm = result.motm; try { motm = result.motm; } catch(e) {}
  window.keyMoment = result.keyMoment; window.penaltyNote = result.penaltyNote;
  window.shotsA = result.stats.shots.A; window.shotsB = result.stats.shots.B;
  window.keeperA = result.stats.saves.B; window.keeperB = result.stats.saves.A;
  window.goals = events.filter(e => e.type === "goal");

  /* Heatmap grid */
  const HGW = 20, HGH = 15;
  const heatGrid = new Float32Array(HGW * HGH);
  events.forEach(ev => {
    if (!ev.pos) return;
    const gx = Math.min(HGW-1, Math.floor(ev.pos.x*HGW));
    const gy = Math.min(HGH-1, Math.floor(ev.pos.y*HGH));
    const w  = ev.type==="goal"?4:(ev.type==="save"||ev.type==="shot_wide")?2:ev.type==="chance"?1.5:0.8;
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
      const rr=gy+dr,cc=gx+dc;
      if (rr>=0&&rr<HGH&&cc>=0&&cc<HGW) heatGrid[rr*HGW+cc]+=w*(dr===0&&dc===0?1:0.4);
    }
  });
  allPlayers.forEach(p => {
    heatGrid[Math.min(HGH-1,Math.floor(p.hy/H*HGH))*HGW+Math.min(HGW-1,Math.floor(p.hx/W*HGW))]+=p.gk?0:0.4;
  });

  const hasPen = events.some(e=>e.type==="penalty");
  const hasET  = events.some(e=>e.type==="et_start");
  const FULL = result.fullTime;
  function _clockDisp(c){ return clockDisp(c, hasET&&c>FULL, FULL); }

  /* ── Match state ── */
  let gameClock=0, eventIdx=0, gameEnded=false, _paused=true;
  let _penaltyRunning=false;
  let momDisplay=50, liveScore={A:0,B:0}, liveShots={A:0,B:0}, liveSaves={A:0,B:0};

  /* Ball physics */
  let bx=W/2, by=H/2, bvx=0, bvy=0;
  const BR = Math.max(6, Math.round(W*0.009));
  const BFRIC = 4.5;

  /* Possession */
  let carrier=-1, recvIdx=-1, passCD=2.0, attackSide="A";
  let phase="play", phaseTimer=0, forced=null;
  let shoutEffect={type:null,timer:0}; /* active shout: more/push/calm/hold */
  let cornerPhase=null; /* {cx,cy,tx,ty} — ball in corner, waiting to cross */
  let microEvtTimer=4.0+Math.random()*3; /* seconds until next micro-commentary */

  /* Speeds in px/s at 1× */
  const SPD_CARRY=W*0.50, SPD_RUN=W*0.60, SPD_DEF=W*0.58, SPD_GK=W*0.45;
  const V_PASS=W*2.0, V_SHOT=W*2.8;

  /* ── DOM helpers ── */
  function updateMomBar(m) {
    const a=Math.round(m);
    const ma=$("momA"),mb=$("momB"),bar=$("momBar");
    if(ma)ma.textContent=a+"%"; if(mb)mb.textContent=(100-a)+"%";
    if(bar)bar.style.background=`linear-gradient(90deg,var(--green) ${a}%,var(--red) ${a}%)`;
  }
  function updateStats() {
    const sh=$("statShot"),sv=$("statSave"),dg=$("statDanger");
    if(sh)sh.textContent=liveShots.A+"-"+liveShots.B;
    if(sv)sv.textContent=liveSaves.A+"-"+liveSaves.B;
    if(dg)dg.textContent=result.stats.shots.A+"-"+result.stats.shots.B;
  }
  function addGoalRow(side,html){
    const el=$("simGoals"); if(!el)return;
    const d=document.createElement("div"); d.className=(side==="A"?"home":"away")+" goal"; d.innerHTML=html;
    el.prepend(d); while(el.children.length>8)el.removeChild(el.lastChild);
  }
  function showGoalBurst(min,name,sc2){
    const gb=$("goalBurst"); if(!gb)return;
    gb.innerHTML=`<b>${min}' ${name}</b><span>${sc2}</span>`;
    gb.classList.remove("hidden","show"); void gb.offsetWidth; gb.classList.add("show");
    setTimeout(()=>gb.classList.add("hidden"),1050);
  }
  let _overlayTxt=null;
  function _updateClock(){
    const cd=_clockDisp(gameClock);
    const clk=$("simClk"); if(clk)clk.textContent=cd+"'";
    const sc=$("simScore"); if(sc)sc.textContent=liveScore.A+"–"+liveScore.B;
    const tv=$("tvover");
    if(tv)tv.innerHTML=(typeof round!=="undefined"&&round>=6?"🏆 "+(typeof L==="function"?L().cupTitle:"CUP"):"🔴 TRT SPOR")+" · "+cd+"' · "+liveScore.A+"–"+liveScore.B;
    if(_overlayTxt)_overlayTxt.setText(liveScore.A+"–"+liveScore.B+"  "+cd+"'");
  }

  function triggerEvent(ev) {
    const i=events.indexOf(ev); if(i>=0&&i>=eventIdx)eventIdx=i+1;
    const comm=$("simComm"),radio=$("simRadio");
    if(comm&&ev.comm)comm.innerHTML=ev.comm;
    if(radio&&ev.comm)radio.innerHTML="📻 "+ev.comm;
    const isTR=(typeof LANG!=="undefined"?LANG:"tr")==="tr";
    const myN=(typeof clip==="function"&&typeof teamName!=="undefined")?clip(teamName||"US",9):(teamName||"US");
    switch(ev.type){
      case "goal":
        liveScore[ev.side]++; liveShots[ev.side]++;
        { const sc=$("simScore"); if(sc)sc.textContent=liveScore.A+"–"+liveScore.B; }
        showGoalBurst(Math.floor(gameClock),ev.scorer||(ev.side==="A"?myN:(typeof opponent!=="undefined"?opponent.name:"OPP")),liveScore.A+"–"+liveScore.B);
        addGoalRow(ev.side,`<b>${Math.floor(gameClock)}'</b><span>⚽ ${ev.scorer||(ev.side==="A"?myN:(typeof opponent!=="undefined"?opponent.name:"OPP"))} ${liveScore.A}–${liveScore.B}</span>`);
        if(typeof sfxGoal==="function")sfxGoal();
        { const isEq=liveScore.A===liveScore.B,isLate=gameClock>78;
          const _w=document.querySelector(".simwrap");
          if(_w&&(isEq||isLate)){_w.classList.remove("shake","equalize");void _w.offsetWidth;_w.classList.add(isEq?"equalize":"shake");setTimeout(()=>_w.classList.remove("equalize","shake"),isEq?900:450);} }
        momDisplay=Math.max(18,Math.min(82,momDisplay+(ev.side==="A"?22:-22))); break;
      case "save":
        liveShots[ev.side==="A"?"B":"A"]++; liveSaves[ev.side]++;
        addGoalRow(ev.side,`<b>${Math.floor(gameClock)}'</b><span>🧤 ${ev.label||(isTR?"Kaleci kurtardı":"Keeper save")}</span>`);
        momDisplay=Math.max(18,Math.min(82,momDisplay+(ev.side==="A"?-6:6))); break;
      case "shot_wide": liveShots[ev.side]++; momDisplay=Math.max(18,Math.min(82,momDisplay+(ev.side==="A"?-3:3))); break;
      case "corner":
        addGoalRow(ev.side,`<b>${Math.floor(gameClock)}'</b><span>🚩 ${isTR?"Köşe vuruşu":"Corner kick"}</span>`);
        momDisplay=Math.max(18,Math.min(82,momDisplay+(ev.side==="A"?4:-4))); break;
      case "card": case "yellow_card": case "red_card": {
        const _cTeam=ev.side==="B"?psB:psA;
        const _cp=_cTeam.find(p=>ev.player&&p.nm&&ev.player.toLowerCase().includes(p.nm.toLowerCase()));
        if(_cp)_cp._yellowEnd=Date.now()+700;
        addGoalRow(ev.side,`<b>${Math.floor(gameClock)}'</b><span>${ev.type==="red_card"?"🟥":"🟨"} ${ev.player||""}</span>`);
      } break;
      case "et_start":  { const ss=$("simState");if(ss)ss.textContent=isTR?"Uzatmalar":"Extra Time"; if(typeof sfxWhistle==="function")sfxWhistle(); } break;
      case "halftime":  if(typeof sfxWhistle==="function")sfxWhistle(); momDisplay=momDisplay*0.7+50*0.3; break;
      case "penalty":   {
        _penaltyRunning=true;
        { const sc2=$("simScore");if(sc2)sc2.textContent=liveScore.A+"–"+liveScore.B; }
        if(ev.penResults){
          const pst=$("simState");if(pst)pst.textContent=isTR?"Penaltılar":"Penalties";
          let delay=300;
          ev.penResults.forEach((r,pi)=>{ delay+=750; setTimeout(()=>{
            const comm2=$("simComm"),mA=r.a?"✅":"❌",mB=r.b?"✅":"❌";
            if(comm2)comm2.innerHTML=`🎯 ${r.sd?"SD":pi+1}. ${mA} <b>${(typeof clip==="function"?clip(typeof teamName!=="undefined"?teamName||"US":"US",7):"US")}</b> <span style="opacity:.5">${r.kA}–${r.kB}</span> <b>${(typeof clip==="function"&&typeof opponent!=="undefined"?clip(opponent.name,7):"OPP")}</b> ${mB}`;
            if(typeof sfxKick==="function")sfxKick(3);
          },delay); });
          setTimeout(()=>{ _penaltyRunning=false; endMatch(); }, delay+800/Math.max(0.2,speedMul));
        } else {
          setTimeout(()=>{ _penaltyRunning=false; endMatch(); }, 800/Math.max(0.2,speedMul));
        }
        } break;
      default: break;
    }
    const stEl=$("simState");
    if(stEl&&ev.type!=="et_start"&&ev.type!=="halftime"){
      const diff=liveScore.A-liveScore.B,t2=(typeof LANG!=="undefined"?LANG:"tr")==="tr";
      if(gameClock>78&&diff===0)stEl.textContent=t2?"Berabere, kritik dakikalar":"Level — final minutes";
      else if(diff>0)stEl.textContent=(typeof teamName!=="undefined"?teamName||"US":"US")+" "+(t2?"önde":"leads");
      else if(diff<0)stEl.textContent=(typeof opponent!=="undefined"?opponent.name:"OPP")+" "+(t2?"önde":"leads");
    }
    updateStats(); updateMomBar(momDisplay);
  }

  /* ── Match event template system ── */
  const _EVTPL=[
    {id:"corner_basic",icon:"🚩",w:14,minM:0,impact:{danger:1,mom:1},
     tr:["{team} köşe vuruşu kazandı.","{player} baskıyı artırdı, top kornere çıktı.","{team} sağ kanattan geldi, savunma topu kornere gönderdi.","{player} ortayı zorladı, {opp} savunması topu uzaklaştırdı.","{team} duran toptan tehlike arıyor."],
     en:["{team} won a corner.","{player} pushed forward, ball went out for a corner.","{team} came from the right, defence cleared to the corner.","{player} forced a cross, {opp} defence cleared.","{team} looking for danger from set pieces."]},
    {id:"wing_attack",icon:"🏃",w:13,minM:0,impact:{danger:1,mom:1},
     tr:["Kanat akını — {player}.","{player} çizgiye indi, ceza sahasına çevirmek istedi.","{team} kanattan yükleniyor, {player} hareketlendi.","{player} bire birde rakibini geçti ama son pas gelmedi.","{team} kanadı iyi kullandı, {opp} savunması zorlandı."],
     en:["Wing run — {player}.","{player} reached the byline, tried to cut inside.","{team} pressing from the flank, {player} made a run.","{player} beat his man but couldn't find the final pass.","{team} used the wing well, {opp} defence under pressure."]},
    {id:"shot_blocked",icon:"⚽",w:12,minM:0,impact:{shot:1,danger:1},
     tr:["{player} şutunu çekti, savunmadan döndü.","{player} ceza sahası dışından denedi, top kalabalığa takıldı.","{team} şut şansı buldu ama {opp} savunması kapandı.","{player} bekletmeden vurdu, top savunmadan sekti.","{team} gole yaklaştı, şut bloklandı."],
     en:["{player} shot — blocked by the defence.","{player} tried from outside the box, lost in the crowd.","{team} found a shooting chance but {opp} defence closed down.","{player} shot quickly, ball deflected.","{team} came close — shot blocked."]},
    {id:"shot_wide",icon:"🎯",w:10,minM:0,impact:{shot:1,danger:1},
     tr:["{player} uzaklardan denedi, top dışarı çıktı.","{player} iyi vuramadı, top auta gitti.","{team} pozisyon buldu ama şut isabetsiz.","{player} kaleyi yokladı, top direğin yanından auta çıktı.","{team} net bir fırsatı değerlendiremedi."],
     en:["{player} tried from range, ball flew wide.","{player} couldn't connect, ball went out.","{team} found space but the shot was off target.","{player} tested the corner — just wide.","{team} couldn't convert a clear chance."]},
    {id:"keeper_save",icon:"🧤",w:9,minM:0,impact:{shot:1,save:1,danger:2},
     tr:["{keeper} kritik bir kurtarış yaptı.","{player} vurdu, {keeper} gole izin vermedi.","{keeper} topu son anda çeldi.","{team} gole çok yaklaştı ama {keeper} ayakta kaldı.","{keeper} refleksiyle takımını oyunda tuttu."],
     en:["{keeper} made a crucial save.","{player} shot, {keeper} denied the goal.","{keeper} tipped it over at the last moment.","{team} came so close but {keeper} stood firm.","{keeper} kept his team in it with a reflex save."]},
    {id:"clearance",icon:"🛡️",w:11,minM:0,impact:{mom:-1},
     tr:["Top uzaklaştırıldı — {defender}.","{defender} tehlikeyi büyümeden kesti.","{opp} atağı olgunlaşmadan {defender} araya girdi.","{defender} ceza sahasında doğru yerdeydi.","{team} savunması panik yapmadan topu uzaklaştırdı."],
     en:["Clearance — {defender}.","{defender} cut out the danger early.","{defender} intercepted before the {opp} attack developed.","{defender} was in the right place in the box.","{team} defence cleared calmly."]},
    {id:"midfield",icon:"🧠",w:12,minM:0,impact:{mom:1},
     tr:["Orta sahada top — {player}.","{player} oyunun temposunu düşürdü.","{team} orta sahada kontrolü ele almaya çalışıyor.","{player} pas trafiğini yönlendirdi.","{team} sabırla boşluk arıyor."],
     en:["Ball in midfield — {player}.","{player} slowed the tempo down.","{team} trying to take control in midfield.","{player} dictated the passing lanes.","{team} patiently looking for space."]},
    {id:"counter",icon:"⚡",w:8,minM:0,impact:{danger:2,mom:2},
     tr:["{team} hızlı çıktı, {player} boş alana koştu.","Kontra atak fırsatı — {player}.","{opp} savunması dengesiz yakalandı.","{player} topu taşıdı, destek gecikti.","{team} hızlı hücumda kaleyi düşündü."],
     en:["{team} broke fast, {player} ran into space.","Counter-attack — {player}.","{opp} defence caught off-balance.","{player} carried the ball, support was late.","{team} looking to goal on the break."]},
    {id:"foul",icon:"🦵",w:8,minM:0,impact:{mom:-1},
     tr:["{player} yerde kaldı, faul.","{opp} müdahalesi sertti, oyun durdu.","{player} faulle durduruldu.","Hakem düdüğü çaldı, serbest vuruş {team}.","{team} tehlikeli bir noktadan serbest vuruş kazandı."],
     en:["{player} went down — foul.","{opp} tackle was hard, play stopped.","{player} was brought down trying to escape.","Referee blows — free kick to {team}.","{team} won a free kick in a dangerous position."]},
    {id:"near_miss",icon:"😮",w:6,minM:0,impact:{shot:1,danger:3,mom:2},
     tr:["{player} çok yaklaştı, top az farkla dışarıda.","{team} tribünleri ayağa kaldırdı ama gol gelmedi.","{player} müsait durumda vurdu, top direğin dibinden çıktı.","{opp} savunması nefesini tuttu.","{team} adına maçın en net fırsatlarından biri kaçtı."],
     en:["{player} so close — ball just wide.","{team} brought the crowd to its feet but no goal.","{player} had a free run and hit the post.","{opp} defence held its breath.","One of the clearest chances of the match goes begging for {team}."]},
    {id:"header",icon:"🤜",w:9,minM:0,impact:{danger:1},
     tr:["Kafa topunda {player} kazandı.","Havalarda {player} galip geldi.","{player} ikinci topu iyi değerlendirdi.","Uzun top — {player} rakibini geride bıraktı.","Standart duran top — {player} kafayla uzaklaştırdı."],
     en:["{player} won the header.","{player} dominant in the air.","{player} read the second ball well.","Long ball — {player} left his opponent behind.","Set piece — {player} headed clear."]},
    {id:"offside",icon:"📐",w:6,minM:0,impact:{mom:-1},
     tr:["Ofsayt tuzağı — {player} ataktan geri döndü.","{opp} ofsaytta kaldı.","Savunma çizgisi iyi çıktı, atak başlamadan bitti.","{player} ofsayt pozisyonundaydı.","{team} ofsayt tuzağıyla atağı boşa çıkardı."],
     en:["Offside trap — {player} recalled from attack.","{opp} caught offside.","Defence line stepped up well, attack ended before it started.","{player} was in an offside position.","{team} sprung the offside trap."]},
    {id:"late_pressure",icon:"🔥",w:7,minM:70,impact:{danger:2,mom:2},
     tr:["{team} son bölümde baskıyı artırdı.","{opp} savunması iyice geriye yaslandı.","{team} beraberlik için yükleniyor.","{player} oyunu rakip yarı alana yıktı.","Maçın temposu yükseldi, {team} risk alıyor."],
     en:["{team} ramping up the pressure late on.","{opp} defence retreating deep.","{team} pushing for the equaliser.","{player} pinned the game in the opponent's half.","The pace has risen — {team} taking risks."]},
    {id:"tactical",icon:"📋",w:5,minM:55,impact:{mom:1},
     tr:["{team} taktiksel olarak daha öne çıkıyor.","{team} orta sahayı kalabalıklaştırdı.","{player} daha serbest oynamaya başladı.","{opp} baskıyı kırmakta zorlanıyor.","{team} oyunun yönünü değiştirmeye çalışıyor."],
     en:["{team} pushing further forward tactically.","{team} packed out the midfield.","{player} started playing more freely.","{opp} struggling to break the press.","{team} trying to change the direction of play."]},
    {id:"crowd",icon:"📣",w:5,minM:0,impact:{mom:1},
     tr:["Tribünler {team} oyuncularını ateşliyor.","{team} taraftarı oyuna ağırlığını koydu.","Stadyumda tansiyon yükseldi.","{player} tribünleri hareketlendiren bir hamle yaptı.","{team} taraftarı bu bölümden memnun."],
     en:["The crowd firing {team} players on.","{team} fans making their weight felt.","Tension rising in the stadium.","{player} made a move that got the crowd going.","{team} fans happy with this spell."]},
    {id:"yellow_card_micro",icon:"🟨",w:4,minM:15,impact:{mom:-1},
     tr:["{player} sarı kart gördü.","Sert müdahale sonrası kart çıktı — {player}.","{player} hakemin sabrını taşırdı.","{team} adına gereksiz bir sarı kart.","{player} bir sonraki müdahalede dikkatli olmak zorunda."],
     en:["{player} shown a yellow card.","Hard tackle leads to a booking — {player}.","{player} tried the referee's patience.","A needless yellow card for {team}.","{player} will need to be careful for the rest of the match."]},
  ];
  let _lastEvtId="";
  function _fireMicroEvent(){
    const isTR=(typeof LANG!=="undefined"?LANG:"tr")==="tr";
    const isA=attackSide==="A";
    const myT=(typeof teamName!=="undefined"?teamName:"Biz");
    const oppT=(typeof opponent!=="undefined"?opponent.name:"Rakip");
    const teamStr=isA?myT:oppT, oppStr=isA?oppT:myT;
    const atTeam=isA?psA:psB, defTeam=isA?psB:psA;
    const outfield=atTeam.filter(p=>!p.gk);
    const defOut=defTeam.filter(p=>!p.gk);
    const keeper=defTeam.find(p=>p.gk);
    const _rp=arr=>arr.length?arr[Math.floor(Math.random()*arr.length)]:null;
    const player=_rp(outfield), defender=_rp(defOut);
    /* weighted random, skip repeat id */
    const pool=_EVTPL.filter(t=>t.id!==_lastEvtId&&gameClock>=(t.minM||0));
    const tot=pool.reduce((s,t)=>s+t.w,0);
    let r=Math.random()*tot, tpl=pool[pool.length-1];
    for(const t of pool){r-=t.w;if(r<=0){tpl=t;break;}}
    _lastEvtId=tpl.id;
    const texts=isTR?tpl.tr:tpl.en;
    const raw=texts[Math.floor(Math.random()*texts.length)];
    const txt=raw
      .replace(/{team}/g,teamStr).replace(/{opp}/g,oppStr)
      .replace(/{player}/g,player?player.nm:teamStr)
      .replace(/{keeper}/g,keeper?keeper.nm:"Kaleci")
      .replace(/{defender}/g,defender?defender.nm:(isTR?"Savunma":"Defence"));
    /* stat impacts */
    if(tpl.impact){
      if(tpl.impact.shot)liveShots[isA?"A":"B"]=Math.min(99,(liveShots[isA?"A":"B"]||0)+tpl.impact.shot);
      if(tpl.impact.save)liveSaves[isA?"A":"B"]=Math.min(99,(liveSaves[isA?"A":"B"]||0)+tpl.impact.save);
      if(tpl.impact.mom)momDisplay=Math.max(18,Math.min(82,momDisplay+(isA?1:-1)*tpl.impact.mom));
      updateStats(); updateMomBar(momDisplay);
    }
    addGoalRow(attackSide,`<b>${Math.floor(gameClock)}'</b><span style="opacity:.75">${tpl.icon} ${txt}</span>`);
    const rb=document.getElementById("simRadio");if(rb)rb.innerHTML="📻 "+txt;
    const comm=document.getElementById("simComm");if(comm)comm.innerHTML=txt;
  }

  function makeReport(won){
    const tr=LANG==="tr";
    const ct=(typeof finalCardSummary==="function"?finalCardSummary():"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
    const kM=result.keyMoment||(window.goals&&window.goals[0]&&window.goals[0].scorer)||"-";
    const rows=[[tr?"Maçın kırılma anı":"Key moment",kM],[tr?"Şutlar":"Shots",result.stats.shots.A+"-"+result.stats.shots.B],[tr?"Kurtarışlar":"Saves",result.stats.saves.A+"-"+result.stats.saves.B],[tr?"Final kart etkisi":"Final card effect",ct||"0"]];
    if(result.penaltyNote)rows.push([tr?"Penaltılar":"Penalties",result.penaltyNote]);
    const ni=Math.floor(Math.random()*6);
    const fw=["Kupa sandığa girdi.","Rüya sezon, şampiyonluk sarhoşluğu.","Son düdüğe kadar didindi.","Bu takım birlikte büyüdü.","Bugün sahada yürüyen kupayı kazandı.","İnançla kaldırdı kupayı."];
    const fe=["The cup comes home.","A dream run. Final glory sealed.","Fought until the last whistle.","Built to win, and they did.","The underdog story ended in glory.","One trophy, one unforgettable run."];
    const lw=["Finale geldi, yetmedi.","Son adımda tökezledi.","Kupa yakındı, bir an fark etti.","Şampiyonluk başka birini seçti.","Sıfırdan başla, bu sefer fark yat.","Bir hata, bir ömür. Sıradaki run."];
    const le=["So close. Build stronger next time.","Fell at the final hurdle.","One moment decided it.","Almost isn't enough in a final.","The squad gave everything.","Fine margins. One more piece next run."];
    rows.push([tr?"Final yorumu":"Final note",won?(tr?fw[ni]:fe[ni]):(tr?lw[ni]:le[ni])]);
    window.finalReportHTML=`<h4>${tr?"Final Karnesi":"Final Report"}</h4>`+rows.map(r=>`<div class="frrow"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");
  }

  function endMatch(){
    if(gameEnded)return;
    gameEnded=true; _paused=true;
    if(window._phaserGame){ try{window._phaserGame.scene.scenes[0].scene.pause();}catch(e){} }
    if(typeof crowdStop==="function")crowdStop();
    if(typeof sfxWhistle==="function")sfxWhistle();
    const hmCv=document.createElement("canvas");
    hmCv.width=W; hmCv.height=H;
    hmCv.style.cssText="position:absolute;inset:0;z-index:20;opacity:.72;pointer-events:none;border-radius:6px";
    cvEl.appendChild(hmCv);
    drawHeatmap(hmCv.getContext("2d"),W,H,heatGrid,HGW,HGH);
    try{window._heatmapImg=hmCv.toDataURL("image/png");}catch(e){}
    { const sc=$("simScore"); if(sc)sc.textContent=result.score.A+"–"+result.score.B; }
    makeReport(result.won);
    setTimeout(()=>endRun(result.won,result.score.A+"–"+result.score.B),1000);
  }

  /* ── Phaser helpers ── */
  function _hex(s){ return parseInt((s||"#888888").replace("#",""),16); }
  function _steer(p,tx,ty,spd,dt){
    const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy); if(d<1)return;
    const s=Math.min(spd*dt,d); p.x+=dx/d*s; p.y+=dy/d*s;
  }
  function _kickBall(tx,ty,spd){
    const dx=tx-bx,dy=ty-by,d=Math.hypot(dx,dy)||1;
    bvx=dx/d*spd; bvy=dy/d*spd; carrier=-1; recvIdx=-1;
  }
  function _kickoff(side){
    bx=W/2; by=H/2; bvx=0; bvy=0; carrier=-1; recvIdx=-1; passCD=1.5; attackSide=side;
    allPlayers.forEach(p=>{ p.x=p.hx; p.y=p.hy; });
    const team=side==="A"?psA:psB;
    const cm=team.find(p=>!p.gk&&(p.pos==="CM"||p.pos==="CDM"))||team.find(p=>!p.gk)||team[1];
    if(cm){ cm.x=W/2+(Math.random()-0.5)*10; cm.y=H/2+(side==="A"?10:-10); carrier=allPlayers.indexOf(cm); bx=cm.x; by=cm.y+(side==="A"?8:-8); }
  }
  function _attemptPass(){
    if(carrier<0)return;
    const p=allPlayers[carrier];
    const team=p.isA?psA:psB;
    const opts=team.filter(t=>!t.gk&&t!==p);
    if(!opts.length)return;
    const goalY=p.isA?H:0;
    const isWideCarrier=/^(LW|RW|LM|RM|LB|RB)$/.test(p.pos||"");
    if(isWideCarrier){
      /* wide carrier: give wide/non-central receivers 40% bonus weight */
      const _wideRe=/^(LW|RW|LM|RM|LB|RB)$/;
      const weighted=[];
      opts.forEach(t=>{ weighted.push(t); if(_wideRe.test(t.pos||""))weighted.push(t); }); /* duplicate = +50% chance */
      weighted.sort((a,b)=>Math.abs(a.y-goalY)-Math.abs(b.y-goalY));
      const recv=weighted[Math.floor(Math.random()*Math.min(4,weighted.length))];
      recvIdx=allPlayers.indexOf(recv);
      _kickBall(recv.x+(Math.random()-0.5)*24,recv.y+(Math.random()-0.5)*18,V_PASS);
    } else {
      opts.sort((a,b)=>Math.abs(a.y-goalY)-Math.abs(b.y-goalY));
      const recv=opts[Math.floor(Math.random()*Math.min(3,opts.length))];
      recvIdx=allPlayers.indexOf(recv);
      _kickBall(recv.x+(Math.random()-0.5)*24,recv.y+(Math.random()-0.5)*18,V_PASS);
    }
  }
  function _shoot(p){
    const goalX=W/2+(Math.random()-0.5)*GW*0.55;
    const goalY=p.isA?H*0.05:H*0.95;
    _kickBall(goalX,goalY,V_SHOT); carrier=-1;
  }
  function _scheduleForced(ev){
    if(!ev.side||ev.type==="halftime"||ev.type==="et_start"||ev.type==="et_half"){
      triggerEvent(ev);
      if(ev.type==="halftime"||ev.type==="et_half"){
        phase="halftime_pause"; phaseTimer=1.5;
        setTimeout(()=>{ if(!gameEnded)_kickoff(liveScore.A>=liveScore.B?"B":"A"); },1500/Math.max(0.2,speedMul));
      }
      return;
    }
    /* Corner: kicker waits at flag, runners pour into box, then cross */
    if(ev.type==="corner"){
      triggerEvent(ev);
      const isA=ev.side==="A";
      const cx=(ev.pos&&ev.pos.x<0.5)?W*0.04:W*0.96;
      const cy=isA?H*0.04:H*0.96;
      bx=cx; by=cy; bvx=0; bvy=0; carrier=-1;
      const cTeam=ev.side==="A"?psA:psB;
      const outfield=cTeam.filter(p=>!p.gk);
      /* closest outfield player becomes kicker and stands at flag */
      const kicker=outfield.reduce((a,b)=>Math.hypot(a.x-cx,a.y-cy)<Math.hypot(b.x-cx,b.y-cy)?a:b);
      kicker.x=cx+(cx<W/2?12:-12); kicker.y=cy+(cy<H/2?12:-12);
      /* others make runs into the penalty box */
      const runners=outfield.filter(p=>p!==kicker).slice(0,4);
      const boxY=isA?H*0.22:H*0.78;
      runners.forEach((p,ii)=>{
        p.x=W/2+(ii%2===0?1:-1)*(GW*0.28+ii*W*0.035);
        p.y=boxY+(Math.random()-0.5)*H*0.07;
      });
      const ctgX=W/2+(Math.random()-0.5)*GW*0.65;
      const ctgY=isA?H*0.22:H*0.78;
      cornerPhase={tx:ctgX,ty:ctgY,timer:0};
      setTimeout(()=>{ if(!gameEnded&&cornerPhase){_kickBall(ctgX,ctgY,V_PASS*1.15);cornerPhase=null;attackSide=ev.side;} },Math.max(500,900/speedMul));
      return;
    }
    const tx=ev.pos?ev.pos.x*W:W/2, ty=ev.pos?ev.pos.y*H:H/2;
    forced={ ev,tx,ty,timer:0 }; attackSide=ev.side;
    const team=ev.side==="A"?psA:psB;
    const fwd=team.filter(p=>!p.gk).sort((a,b)=>Math.hypot(a.x-tx,a.y-ty)-Math.hypot(b.x-tx,b.y-ty))[0];
    if(fwd){ carrier=allPlayers.indexOf(fwd); bx=fwd.x; by=fwd.y; }
  }

  /* ── Phaser scene ── */
  let _pScene;
  function _pCreate(){
    _pScene=this;
    const g=this.add.graphics();
    for(let i=0;i<9;i++){ g.fillStyle(i%2?0x79ad5c:0x6fa052); g.fillRect(0,i*H/9,W,H/9+1); }
    g.lineStyle(2,0xffffff,0.6); g.strokeRect(7,7,W-14,H-14);
    g.beginPath();g.moveTo(7,H/2);g.lineTo(W-7,H/2);g.strokePath();
    g.strokeCircle(W/2,H/2,38);
    g.lineStyle(4,0xffffff,1);
    g.beginPath();g.moveTo(GL,7);g.lineTo(GR,7);g.strokePath();
    g.beginPath();g.moveTo(GL,H-7);g.lineTo(GR,H-7);g.strokePath();
    const PA_W=Math.round(W*0.44),PA_H=Math.round(H*0.28),PA_L=(W-PA_W)/2;
    g.lineStyle(1.5,0xffffff,0.55);
    g.strokeRect(PA_L,7,PA_W,PA_H); g.strokeRect(PA_L,H-7-PA_H,PA_W,PA_H);

    const fSz=Math.max(6,Math.round(W*0.013));
    const nSz=Math.max(5,Math.round(W*0.009));
    allPlayers.forEach(p=>{
      const isA=p.isA,sz=p.gk?10:12;
      const bgC=p.gk?_hex("#e6ad2e"):(isA?_hex(kit.bg):_hex("#eae2cb"));
      p._bgC=bgC; p._yellowEnd=0; p._tackleEnd=0;
      const bdrC=(isA&&!p.gk)?_hex(kit.sec):0xffffff;
      const fgC=p.gk?"#23332a":(isA?kit.fg:"#23332a");
      p._shadow=this.add.ellipse(p.hx+2,p.hy+3,sz*2+2,sz+2,0x000000,0.18);
      p._circ=this.add.circle(p.hx,p.hy,sz,bgC,1);
      p._circ.setStrokeStyle(2,bdrC,1);
      p._num=this.add.text(p.hx,p.hy,String(p.n),{fontSize:fSz+"px",fontFamily:"Inter,Arial,sans-serif",fontStyle:"bold",color:fgC,resolution:2}).setOrigin(0.5,0.5);
      const nmC=isA?"#d4f7e0":"#f3ead2";
      p._name=this.add.text(p.hx,p.hy+sz+3,p.nm.slice(0,9).toUpperCase(),{fontSize:nSz+"px",fontFamily:"Inter,Arial,sans-serif",fontStyle:"bold",color:nmC,backgroundColor:"rgba(0,0,0,0.5)",padding:{x:2,y:1},resolution:2}).setOrigin(0.5,0);
    });
    this._bShadow=this.add.ellipse(W/2+3,H/2+3,BR*2+4,BR+2,0x000000,0.2);
    this._ball=this.add.circle(W/2,H/2,BR,0xffffff,1);
    this._ball.setStrokeStyle(1.5,0x23332a,1);
    this._ovBg=this.add.rectangle(W/2,15,140,22,0x000000,0.55).setOrigin(0.5,0.5);
    _overlayTxt=this.add.text(W/2,15,"0–0  0'",{fontSize:Math.round(W*0.019)+"px",fontFamily:"Inter,Arial,sans-serif",fontStyle:"bold",color:"#ffffff",resolution:2}).setOrigin(0.5,0.5);
    _kickoff("A"); _updateClock();
  }

  function _pUpdate(time,delta){
    if(_paused||gameEnded)return;
    const dt=Math.min(delta,100)/1000*speedMul;
    gameClock=Math.min(hasPen?150:FULL+3, gameClock+dt*1.5);
    /* Shout effect countdown */
    if(shoutEffect.timer>0){shoutEffect.timer-=dt;if(shoutEffect.timer<=0)shoutEffect.type=null;}
    const _sA=shoutEffect.type==="more"?1.30:shoutEffect.type==="calm"?0.78:1.0;
    const _pressDeep=shoutEffect.type==="push";
    const _holdMode=shoutEffect.type==="hold";
    const _calmMode=shoutEffect.type==="calm";

    while(eventIdx<events.length&&gameClock>=events[eventIdx].minute&&!forced){
      const _ev=events[eventIdx]; eventIdx++;
      _scheduleForced(_ev);
    }

    if(_penaltyRunning){ _renderAll(); _updateClock(); return; }
    if(phase==="halftime_pause"||phase==="celebrate"){
      phaseTimer-=dt; if(phaseTimer<=0)phase="play";
      _renderAll(); _updateClock(); return;
    }
    if(gameClock>=FULL&&!hasPen&&!forced){ endMatch(); return; }
    if(gameClock>=FULL+32&&!_penaltyRunning){ endMatch(); return; }

    if(forced){
      forced.timer+=dt;
      const ev=forced.ev,isA=ev.side==="A";
      const dist=carrier>=0?Math.hypot(allPlayers[carrier].x-forced.tx,allPlayers[carrier].y-forced.ty):999;
      if(carrier>=0){
        const cp=allPlayers[carrier];
        _steer(cp,forced.tx,forced.ty,SPD_CARRY*1.4,dt);
        bx=cp.x; by=cp.y+(isA?7:-7);
        const defs=(isA?psB:psA).filter(p=>!p.gk);
        defs.sort((a,b)=>Math.hypot(a.x-cp.x,a.y-cp.y)-Math.hypot(b.x-cp.x,b.y-cp.y));
        if(defs[0])_steer(defs[0],cp.x+(Math.random()-0.5)*30,cp.y+(Math.random()-0.5)*20,SPD_DEF,dt);
      }
      if(dist<W*0.06||forced.timer>2.5){
        triggerEvent(ev);
        if(ev.type==="goal"){
          bx=forced.tx; by=forced.ty; bvx=0; bvy=0; carrier=-1;
          phase="celebrate"; phaseTimer=1.0;
          setTimeout(()=>{ if(!gameEnded)_kickoff(isA?"B":"A"); },Math.max(300,1000/speedMul));
        } else if(ev.type==="save"){
          /* no teleport — GK stays on goal line; ball bounces away */
          bvx=(Math.random()-0.5)*V_PASS*0.4; bvy=(isA?1:-1)*V_PASS*0.35; carrier=-1;
        } else {
          _kickBall(W/2+(Math.random()-0.5)*W*0.3,H/2+(Math.random()-0.5)*H*0.2,V_PASS*0.4);
        }
        forced=null;
      }
    } else {
      const fr=Math.pow(0.01,dt*BFRIC);
      bvx*=fr; bvy*=fr;
      bx+=bvx*dt; by+=bvy*dt;
      if(bx<BR){bx=BR;bvx=Math.abs(bvx)*0.4;} if(bx>W-BR){bx=W-BR;bvx=-Math.abs(bvx)*0.4;}
      if(by<BR){by=BR;bvy=Math.abs(bvy)*0.4;} if(by>H-BR){by=H-BR;bvy=-Math.abs(bvy)*0.4;}

      const bSpd=Math.hypot(bvx,bvy);
      if(carrier<0&&bSpd<W*0.25){
        let minD=W*0.07,minI=-1;
        allPlayers.forEach((p,i)=>{ if(p.gk)return; const d=Math.hypot(p.x-bx,p.y-by); if(d<minD){minD=d;minI=i;} });
        if(minI>=0){carrier=minI;recvIdx=-1;passCD=0.6+Math.random()*1.8;attackSide=allPlayers[minI].isA?"A":"B";}
      }
      if(recvIdx>=0&&carrier<0){
        const recv=allPlayers[recvIdx];
        if(Math.hypot(recv.x-bx,recv.y-by)<W*0.06){carrier=recvIdx;recvIdx=-1;passCD=0.5+Math.random()*1.6;attackSide=recv.isA?"A":"B";}
      }

      allPlayers.forEach((p,i)=>{
        const isCarrier=i===carrier,isRecv=i===recvIdx,isA=p.isA;
        const ownAttacking=attackSide===(isA?"A":"B");
        const goalY=isA?H*0.88:H*0.12;
        const _spd = isA ? _sA : 1.0; /* shout speed multiplier (A team only) */
        if(p.gk){
          /* track ball X only when ball is in own half; else hold center */
          const ballInOwnHalf=isA?(by<H*0.52):(by>H*0.48);
          const clX=ballInOwnHalf?Math.max(GL+10,Math.min(GR-10,bx)):W/2;
          const gkY=isA?H*0.065:H*0.935;
          _steer(p,clX,gkY,SPD_GK*_spd,dt);
        } else if(isCarrier){
          const laneX=p.hx+(Math.sin(time*0.0009+i)*W*0.05);
          const isWideCarrier=/^(LW|RW|LM|RM|LB|RB)$/.test(p.pos||"");
          const targetX=isWideCarrier
            ? p.hx*0.75+bx*0.25
            : laneX*0.35+W/2*0.2+bx*0.45;
          _steer(p,targetX,goalY,SPD_CARRY*_spd,dt);
          bx=p.x; by=p.y+(isA?7:-7);
          passCD-=dt;
          if(_calmMode)passCD+=dt*0.6; /* calm: delay shooting/passing */
          const dGoal=Math.hypot(p.x-W/2,p.y-goalY);
          const shootBias=_holdMode?0.6:(_calmMode?0.5:1.8); /* hold/calm: less risk */
          if(dGoal<W*0.20&&Math.random()<dt*shootBias){_shoot(p);}
          else if(passCD<=0){_attemptPass();passCD=0.6+Math.random()*2.0;}
        } else if(isRecv){
          _steer(p,bx+bvx*0.12,by+bvy*0.12,SPD_RUN*_spd,dt);
        } else if(ownAttacking){
          const isWide=/^(LW|RW|LB|RB|LM|RM)$/.test(p.pos||"");
          /* wide players hug their flank; central players drift with ball */
          const driftX=isWide
            ? p.hx*0.88+(Math.sin(time*0.0007+i*2.3)*W*0.025)
            : p.hx+(bx-W/2)*0.22+(Math.sin(time*0.0007+i*2.3)*W*0.04);
          const driftY=p.hy*0.5+goalY*0.5+(Math.cos(time*0.0006+i*1.9)*H*0.03);
          _steer(p,driftX,driftY,SPD_RUN*_spd*(isWide?0.78:0.65),dt);
        } else {
          if(carrier>=0&&allPlayers[carrier].isA!==isA){
            const cp=allPlayers[carrier];
            /* push mode: defenders press high into opponent half */
            const pressY=_pressDeep&&!isA?(cp.y*0.6+goalY*0.4):(cp.y*0.38+p.hy*0.42+H/2*0.20);
            const intX=cp.x*0.38+p.hx*0.42+W/2*0.20;
            _steer(p,intX,pressY,SPD_DEF*_spd,dt);
          } else {
            /* hold mode: defenders stay deeper */
            const holdOfsY=_holdMode&&!isA?H*0.08:0;
            _steer(p,p.hx+(Math.sin(time*0.0005+i)*W*0.018),(p.hy+holdOfsY)+(Math.cos(time*0.0004+i)*H*0.012),SPD_RUN*0.25,dt);
          }
        }
        p.x=Math.max(8,Math.min(W-8,p.x));
        p.y=Math.max(8,Math.min(H-8,p.y));
      });

      if(carrier>=0&&Math.random()<dt*0.04){
        const cp=allPlayers[carrier];
        const defs=(cp.isA?psB:psA).filter(p=>!p.gk);
        const nearest=defs.sort((a,b)=>Math.hypot(a.x-bx,a.y-by)-Math.hypot(b.x-bx,b.y-by))[0];
        if(nearest&&Math.hypot(nearest.x-bx,nearest.y-by)<W*0.055){
          cp._tackleEnd=Date.now()+280; /* brief red flash on tackled player */
          attackSide=cp.isA?"B":"A";
          _kickBall(nearest.x+(Math.random()-0.5)*20,nearest.y+(Math.random()-0.5)*20,V_PASS*0.35);
        }
      }
    }
    /* Micro-event stream — fire commentary every ~4-8 game seconds */
    if(!forced&&!gameEnded&&phase==="play"){
      microEvtTimer-=dt;
      if(microEvtTimer<=0){ _fireMicroEvent(); microEvtTimer=4.0+Math.random()*4.0; }
    }
    _renderAll(); _updateClock();
  }

  function _renderAll(){
    if(!_pScene)return;
    const _now=Date.now();
    allPlayers.forEach(p=>{
      const sz=p.gk?10:12;
      p._shadow.setPosition(p.x+2,p.y+3);
      p._circ.setPosition(p.x,p.y);
      if(p._yellowEnd&&_now<p._yellowEnd) p._circ.setFillStyle(0xf0e040,1);
      else if(p._tackleEnd&&_now<p._tackleEnd) p._circ.setFillStyle(0xff5533,1);
      else if(p._bgC!==undefined) p._circ.setFillStyle(p._bgC,1);
      p._num.setPosition(p.x,p.y);
      p._name.setPosition(p.x,p.y+sz+3);
    });
    _pScene._bShadow.setPosition(bx+3,by+3);
    _pScene._ball.setPosition(bx,by);
  }

  const game=new Phaser.Game({
    type:Phaser.AUTO, width:W, height:H, parent:cvEl,
    backgroundColor:"#6fa052", banner:false, audio:{noAudio:true},
    scene:{create:_pCreate,update:_pUpdate}
  });
  window._phaserGame=game;

  sim = {
    run:    ()=>{ _simPaused=false; _paused=false; },
    pause:  ()=>{ _simPaused=true; _paused=true; const pb=$("pauseBtn");if(pb){pb.textContent="▶";pb.classList.add("pause");} },
    resume: ()=>{ _simPaused=false; _paused=false; const pb=$("pauseBtn");if(pb){pb.textContent="⏸";pb.classList.remove("pause");} },
    shout:  (t)=>{
      const mp={more:{t:"yüklen!",e:"push up!"},push:{t:"önde bas!",e:"press high!"},calm:{t:"tempoyu düşür",e:"slow tempo"},hold:{t:"skoru koru",e:"protect lead"}};
      const c=mp[t]||mp.more;
      shoutEffect={type:t,timer:3.5}; /* 3.5 seconds of effect */
      if(typeof playUiSample==="function")playUiSample("click",0.18);
      const rb=$("simRadio");
      if(rb)rb.innerHTML="📻 <b>"+(typeof clip==="function"?clip(typeof teamName!=="undefined"?teamName||"US":"US",9):"US")+"</b> "+(LANG==="tr"?c.t:c.e);
    },
    skip: ()=>{
      if(gameEnded)return;
      _paused=false;
      while(eventIdx<events.length){triggerEvent(events[eventIdx]);}
      gameClock=Math.max(FULL,events.length?events[events.length-1].minute:FULL);
      const clk=$("simClk");if(clk)clk.textContent=_clockDisp(gameClock)+"'";
      endMatch();
    }
  };
}

/* ── startFinalSim ── */
function startFinalSim(sp) {
  clearTimeout(autoTimer);
  $("hub").classList.add("hidden");
  $("result").classList.add("hidden");
  $("sim").classList.remove("hidden");
  const x = L();
  $("simA").textContent = clip(teamName || "US", 10);
  $("simB").textContent = clip(opponent.name, 10);
  $("simGoals").innerHTML = "";
  $("simState").textContent = LANG === "tr" ? "Dengeli final" : "Balanced final";
  $("momBar").style.background = "linear-gradient(90deg,var(--green) 50%,var(--red) 50%)";
  $("momA").textContent = "50%";
  $("momB").textContent = "50%";
  ["statShot", "statSave", "statDanger"].forEach(id => { const e = $(id); if (e) e.textContent = "0-0"; });
  { const gb = $("goalBurst"); if (gb) { gb.classList.add("hidden"); gb.classList.remove("show"); gb.innerHTML = ""; } }
  window.finalReportHTML = "";
  setSpeed(parseFloat(localStorage.getItem("copa_spd") || "1") || 1);

  /* ── Godot sim: round 6 finallerinde iframe üzerinden çalışır ── */
  if (round === 6 && _tryGodotSim(sp)) return;

  buildSim(sp.power, opponent.power);
  sfxWhistle();
  crowdStart();

  /* card effects display */
  const _activeCards = cards.filter(k => {
    try { const v = cardEff(k, picksBySlot.filter(Boolean), round), pv = cardEff(k, picksBySlot.filter(Boolean), round - 1); return cardKind(k) === "final" || v !== pv; } catch (e) { return false; }
  });
  $("simComm").innerHTML = LANG === "tr" ? "<b>FINAL</b> başladı!" : "<b>FINAL</b> kicks off!";
  if (_activeCards.length) {
    setTimeout(() => {
      $("simComm").innerHTML = "🃏 " + _activeCards.slice(0, 2).map(k => {
        const cd = L().cards && L().cards[k]; return cd ? "<b>" + cd.n + "</b> aktif" : "";
      }).filter(Boolean).join(" · ");
    }, 900);
  }

  document.querySelectorAll(".shoutbtn").forEach(b => b.classList.remove("lit"));
  _simPaused = false;
  { const pb = $("pauseBtn"); if (pb) { pb.textContent = "⏸"; pb.classList.remove("pause"); } }

  if (LANG === "en") {
    const L2 = { shMore: "Push Up", shPush: "Press High", shCalm: "Slow Tempo", shHold: "Protect Lead" };
    Object.keys(L2).forEach(id => { const e = $(id); if (e) { const sp2 = e.querySelector("span"); if (sp2) sp2.textContent = L2[id]; } });
  }

  const rb = $("simRadio"); if (rb) rb.textContent = "📻 —";
  sim.run();
}


/* ── Godot iframe launcher ───────────────────────────────────────────────── */
function _tryGodotSim(sp) {
  var GODOT_BASE = "godot-final-sim/index.html";
  /* file:// protokolünde fetch bloklandığı için Godot çalışmaz → JS sim'e düş */
  if (window.location.protocol === "file:") {
    buildSim(sp.power, opponent.power); sfxWhistle(); crowdStart(); return true;
  }
  /* Web export var mı kontrol et — yoksa eski motora düş */
  var testImg = new Image();
  var timedOut = false;
  var fallbackTimer = null;
  var resolved = false;

  function _fallback() {
    if (resolved) return;
    resolved = true;
    _removeGodotOverlay();
    buildSim(sp.power, opponent.power);
    sfxWhistle();
    crowdStart();
  }

  function _removeGodotOverlay() {
    var iframe = document.getElementById("godotOverlay");
    if (iframe) iframe.remove();
    var skipBtn = document.querySelector(".fieldframe > button");
    if (skipBtn) skipBtn.remove();
    var cvEl = document.getElementById("cv");
    if (cvEl) Array.from(cvEl.children).forEach(function(c) { c.style.display = ""; });
    window.removeEventListener("message", _onMsg);
  }

  function _onMsg(e) {
    if (!e.data || e.data.type !== "godot_match_result") return;
    if (resolved) return;
    resolved = true;
    clearTimeout(fallbackTimer);
    _removeGodotOverlay();
    var won = !!e.data.won;
    var sh = parseInt(e.data.score_home) || 0;
    var sa = parseInt(e.data.score_away) || 0;
    var scoreStr = sh + "–" + sa;
    setTimeout(function() { endRun(won, scoreStr); }, 400);
  }

  window.addEventListener("message", _onMsg);

  /* Payload oluştur */
  var pb = (typeof powerBreakdown === "function") ? powerBreakdown(6) : null;
  var hp = pb ? pb.power : (sp.power || 84);
  var fp = (typeof finalPenalty !== "undefined") ? finalPenalty : 0;
  var sty = (typeof style !== "undefined") ? style : "gegen";
  var tn = (typeof teamName !== "undefined" && teamName) ? teamName : "copa.life XI";
  var oppName = (opponent && opponent.name) ? opponent.name : "Final Rakibi";
  var oppPow = sp.oppPower || (opponent && opponent.power) || 80;
  var injuredSlots = [];
  if (typeof picksBySlot !== "undefined") {
    picksBySlot.forEach(function(p, i) { if (p && p.injured) injuredSlots.push(i); });
  }
  var cardsDetail = [];
  if (typeof cards !== "undefined") {
    cards.forEach(function(k) {
      var v = (typeof cardVariant !== "undefined" && cardVariant[k]) ? cardVariant[k] : "normal";
      cardsDetail.push({ id: k, variant: v });
    });
  }
  var payload = {
    seed: String(round) + "-" + tn + "-" + sty,
    home_name: tn,
    away_name: oppName,
    home_power: hp,
    away_power: oppPow,
    style: sty,
    final_penalty: fp,
    injuries: injuredSlots,
    cards: (typeof cards !== "undefined") ? cards : [],
    cards_detail: cardsDetail
  };
  var b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  var godotUrl = GODOT_BASE + "?d=" + encodeURIComponent(b64);

  /* #cv içine iframe göm — fieldframe sabit kalır, dış UI dokunulmaz */
  var cvEl = document.getElementById("cv");
  if (!cvEl) { _fallback(); return true; }
  /* Mevcut Phaser canvas'ı gizle */
  Array.from(cvEl.children).forEach(function(c) { c.style.display = "none"; });
  var iframe = document.createElement("iframe");
  iframe.id = "godotOverlay";
  iframe.src = godotUrl;
  iframe.allow = "autoplay";
  iframe.style.cssText = "width:100%;height:100%;min-height:320px;border:none;display:block;background:#1a2a14;border-radius:6px;";
  cvEl.appendChild(iframe);
  var skipBtn = document.createElement("button");
  skipBtn.textContent = "⏭ JS sim";
  skipBtn.style.cssText = "position:absolute;top:4px;right:6px;padding:3px 8px;background:rgba(0,0,0,0.55);color:#fff;border:1px solid #fff3;border-radius:4px;cursor:pointer;font-size:11px;z-index:10;";
  skipBtn.onclick = function() { clearTimeout(fallbackTimer); _fallback(); };
  var fieldframe = cvEl.closest(".fieldframe") || cvEl.parentElement;
  if (fieldframe && getComputedStyle(fieldframe).position === "static") fieldframe.style.position = "relative";
  if (fieldframe) fieldframe.appendChild(skipBtn);

  /* 12 saniye içinde sonuç gelmezse fallback */
  fallbackTimer = setTimeout(_fallback, 12000);

  /* iframe yüklenemezse (web export yok) hemen fallback */
  iframe.onerror = function() { clearTimeout(fallbackTimer); _fallback(); };

  return true; /* startFinalSim'e: Godot devredildi, buildSim çağırma */
}

/* ── Godot Final Sim Bridge ───────────────────────────────────────────────── */
/* Mevcut maç durumundan Godot simülatörü için test_match.json üretir.        */
/* Tarayıcı konsoluna kopyalanabilir JSON yazar ve dosya indirme sunar.       */
function exportGodotBridge() {
  var pb = (typeof powerBreakdown === "function") ? powerBreakdown(6) : null;
  var hp = pb ? pb.power : 84;
  var fp = (typeof finalPenalty !== "undefined") ? finalPenalty : 0;
  var sty = (typeof style !== "undefined") ? style : "gegen";
  var tn = (typeof teamName !== "undefined" && teamName) ? teamName : "copa.life XI";
  var seed = [round, tn, sty].join("-");

  var oppPow = 82;
  if (typeof opponent !== "undefined" && opponent && opponent.power) {
    oppPow = opponent.power;
  } else if (typeof OPP_BASES !== "undefined") {
    var bases = OPP_BASES;
    if ((typeof selectedCountry !== "undefined") && selectedCountry === "EN" && typeof OPP_BASES_EN !== "undefined") bases = OPP_BASES_EN;
    if ((typeof selectedCountry !== "undefined") && selectedCountry === "ES" && typeof OPP_BASES_ES !== "undefined") bases = OPP_BASES_ES;
    if ((typeof selectedCountry !== "undefined") && selectedCountry === "IT" && typeof OPP_BASES_IT !== "undefined") bases = OPP_BASES_IT;
    if ((typeof selectedCountry !== "undefined") && selectedCountry === "DE" && typeof OPP_BASES_DE !== "undefined") bases = OPP_BASES_DE;
    oppPow = bases[Math.min(5, Math.max(0, (typeof round !== "undefined" ? round : 1) - 1))] || 82;
  }

  var injuredSlots = [];
  var activeCardsDetail = [];
  if (typeof picksBySlot !== "undefined") {
    picksBySlot.forEach(function(p, i) {
      if (p && p.injured) injuredSlots.push(i);
    });
  }
  if (typeof cards !== "undefined") {
    var cv = (typeof cardVariant !== "undefined") ? cardVariant : {};
    cards.forEach(function(k) {
      activeCardsDetail.push({ id: k, variant: cv[k] || "normal" });
    });
  }

  var payload = {
    seed: seed,
    home_name: tn,
    away_name: (typeof opponent !== "undefined" && opponent && opponent.name) ? opponent.name : "Final Rakibi",
    home_power: hp,
    away_power: oppPow,
    style: sty,
    cards: (typeof cards !== "undefined") ? cards.slice() : [],
    final_penalty: fp,
    injuries: injuredSlots,
    cards_detail: activeCardsDetail
  };

  var json = JSON.stringify(payload, null, 2);
  console.log("[Godot Bridge] test_match.json:\n" + json);

  var blob = new Blob([json], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "test_match.json";
  a.click();
  URL.revokeObjectURL(a.href);

  return payload;
}
