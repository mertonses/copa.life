/* Final mac simulasyonu: event-driven engine, S-curve power, match phases, momentum, headless runner. */
/* sim and _simPaused are declared in index.html — do not redeclare */
var speedMul = parseFloat(localStorage.getItem("copa_spd") || "1") || 1;

function setSpeed(s) {
  speedMul = s;
  try { localStorage.setItem("copa_spd", s); } catch (e) {}
  document.querySelectorAll(".spd").forEach(b => b.classList.toggle("on", parseFloat(b.dataset.s) === s));
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

  return { events, score, won, motm, keyMoment, penaltyNote, stats };
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
    const alpha = Math.min(0.88, v < 0.15 ? v / 0.15 * 0.35 : 0.35 + v * 0.55);
    ctx.fillStyle = `hsla(${hue},${sat}%,${lit}%,${alpha})`;
    ctx.fillRect(c * cw, r * ch, cw, ch);
  }
  /* centered label */
  const isTR = (typeof LANG !== "undefined" ? LANG : "tr") === "tr";
  const lbl = "🔥 " + (isTR ? "TOP YOĞUNLUK HARİTASI" : "BALL HEAT MAP");
  ctx.font = "bold 8px 'Inter',sans-serif";
  const lblW = ctx.measureText(lbl).width + 16;
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fillRect((W - lblW) / 2, H - 22, lblW, 17);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(lbl, W / 2, H - 13);
}

/* ── F. buildSim ── */
function buildSim(myPow, oppPow) {
  const cv = $("cv");
  const wrap = Math.max(340, Math.min(860, ($("sim") && $("sim").clientWidth) || 860));
  const W = wrap, H = Math.round(W * 0.62);
  const GW = Math.round(W * 0.27), GL = (W - GW) / 2, GR = (W + GW) / 2;
  const PR = Math.max(8, Math.round(W * 0.012)), BR = Math.max(5, Math.round(W * 0.007));
  const ctx = cv.getContext("2d");
  const _dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * _dpr; cv.height = H * _dpr;
  cv.style.width = "100%"; cv.style.height = "auto";
  ctx.setTransform(_dpr, 0, 0, _dpr, 0, 0);

  /* player setup */
  function teamFrom(coords, poses, names, side, col, fg, pow, inj) {
    const ps = coords.map((c, i) => {
      let hx, hy;
      if (side === "A") { hx = c[0] / 100 * W; hy = c[1] / 100 * H; }
      else { hx = (1 - c[0] / 100) * W; hy = (1 - c[1] / 100) * H; }
      const pos = poses[i] || "CM";
      const role = (typeof groupOf === "function") ? groupOf(pos) : (["ST","CF","LW","RW"].includes(pos)?"FWD":["CM","CAM","CDM","LM","RM"].includes(pos)?"MID":"DEF");
      const wide = ["LB","RB","WB","LW","RW","LM","RM"].includes(pos);
      return { hx, hy, x: hx, y: hy, gk: i === 0, n: i + 1, nm: ((names[i] || "").split(" ").pop() || "?"), role, wide, inj: !!(inj && inj[i]), isA: side === "A" };
    });
    return { side, col, fg, ps, pow };
  }

  const myCoords = slots.map(s => [s[1], s[2]]);
  const myPoses  = slots.map(s => s[0]);
  const myNames  = picksBySlot.map(p => p ? p.name : "");
  const f433 = FORMATIONS["4-3-3"];
  const oppCoords = f433.map(s => [s[1], s[2]]);
  const oppPoses  = f433.map(s => s[0]);
  const oNames    = oppLineup.length ? oppLineup.map(o => o.name) : oppCoords.map(() => "?");

  const psA = teamFrom(myCoords, myPoses, myNames, "A", kit.bg, kit.fg, myPow, picksBySlot.map(p => p && p.injured));
  const psB = teamFrom(oppCoords, oppPoses, oNames, "B", "#eae2cb", "#23332a", oppPow);
  const allPlayers = [...psA.ps, ...psB.ps];

  /* run simulation */
  const rng = seededRand(typeof seedNum !== "undefined" ? seedNum : Date.now());
  const result = simulateMatch(myPow, oppPow, rng);
  const events = result.events;

  /* set globals */
  window.motm = result.motm;
  try { motm = result.motm; } catch (e) {}
  window.keyMoment = result.keyMoment;
  window.penaltyNote = result.penaltyNote;
  window.shotsA = result.stats.shots.A;
  window.shotsB = result.stats.shots.B;
  window.keeperA = result.stats.saves.B;
  window.keeperB = result.stats.saves.A;
  window.goals = events.filter(e => e.type === "goal");

  /* build heatmap from events */
  const HGW = 20, HGH = 15;
  const heatGrid = new Float32Array(HGW * HGH);
  events.forEach(ev => {
    if (!ev.pos) return;
    const gx = Math.min(HGW - 1, Math.floor(ev.pos.x * HGW));
    const gy = Math.min(HGH - 1, Math.floor(ev.pos.y * HGH));
    const w = ev.type === "goal" ? 4 : (ev.type === "save" || ev.type === "shot_wide") ? 2 : ev.type === "chance" ? 1.5 : 0.8;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = gy + dr, cc = gx + dc;
      if (rr >= 0 && rr < HGH && cc >= 0 && cc < HGW)
        heatGrid[rr * HGW + cc] += w * (dr === 0 && dc === 0 ? 1 : 0.4);
    }
  });
  /* add formation density */
  [...psA.ps, ...psB.ps].forEach(p => {
    if (p.gk) return;
    const gx = Math.min(HGW - 1, Math.floor(p.hx / W * HGW));
    const gy = Math.min(HGH - 1, Math.floor(p.hy / H * HGH));
    heatGrid[gy * HGW + gx] += 0.5;
  });

  /* ── PRE-COMPUTE ball path (frame buffer) ── */
  const TPG = 20; /* ticks per game-minute */
  const _lastMin = events.length ? events[events.length - 1].minute + 4 : 95;
  const _totalTicks = Math.ceil(_lastMin * TPG);

  const _fbX = new Float32Array(_totalTicks); /* ball X per tick */
  const _fbY = new Float32Array(_totalTicks); /* ball Y per tick */

  (function _buildBallPath() {
    function cubic(t, p0, p1, p2, p3) {
      const u = 1 - t;
      return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
    }
    function fillBez(ts, te, ax, ay, bx, by, cx2, cy2, dx, dy) {
      const n = Math.max(1, te - ts);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        _fbX[ts + i] = cubic(t, ax, bx, cx2, dx);
        _fbY[ts + i] = cubic(t, ay, by, cy2, dy);
      }
    }

    let curX = W / 2, curY = H / 2, prevMin = 0;

    events.forEach(ev => {
      const st = Math.floor(prevMin * TPG);
      const et = Math.max(st + 2, Math.floor(ev.minute * TPG));
      const len = et - st;
      const ex = ev.pos ? ev.pos.x * W : W / 2;
      const ey = ev.pos ? ev.pos.y * H : H / 2;

      /* neutral events: glide to centre */
      if (!ev.side || ev.type === "halftime" || ev.type === "et_start" || ev.type === "et_half") {
        fillBez(st, et, curX, curY, W/2, H/2, W/2, H/2, ex, ey);
        curX = ex; curY = ey; prevMin = ev.minute; return;
      }

      /* build a pass chain through possession-team players */
      const sideA = ev.side === "A";
      const pool = (sideA ? psA.ps : psB.ps).filter(p => !p.gk);
      const shuffled = pool.slice().sort(() => Math.random() - 0.5);
      const nPasses = len > TPG * 5 ? Math.min(3, shuffled.length) :
                      len > TPG * 2 ? Math.min(2, shuffled.length) : 0;

      const wps = [{ x: curX, y: curY }];
      for (let i = 0; i < nPasses; i++) {
        const pl = shuffled[i];
        wps.push({ x: pl.hx + (Math.random() - 0.5) * 24, y: pl.hy + (Math.random() - 0.5) * 18 });
      }
      wps.push({ x: ex, y: ey });

      const nSeg = wps.length - 1;
      for (let wi = 0; wi < nSeg; wi++) {
        const segSt = st + Math.floor(wi * len / nSeg);
        const segEt = st + Math.floor((wi + 1) * len / nSeg);
        const p0 = wps[wi], p3 = wps[wi + 1];
        const ddx = p3.x - p0.x, ddy = p3.y - p0.y;
        const jit = Math.sqrt(ddx*ddx + ddy*ddy) * 0.18;
        fillBez(segSt, segEt,
          p0.x, p0.y,
          p0.x + ddx * 0.3 + (Math.random()-0.5)*jit, p0.y + ddy * 0.3 + (Math.random()-0.5)*jit,
          p0.x + ddx * 0.7 + (Math.random()-0.5)*jit, p0.y + ddy * 0.7 + (Math.random()-0.5)*jit,
          p3.x, p3.y);
      }

      curX = ex; curY = ey; prevMin = ev.minute;
    });

    /* hold last position for remaining ticks */
    const lastT = Math.min(_totalTicks - 1, Math.floor((events.length ? events[events.length-1].minute : 0) * TPG));
    for (let t = lastT; t < _totalTicks; t++) { _fbX[t] = curX; _fbY[t] = curY; }
  })();

  /* player EMA smoothing state */
  const _smX = new Float32Array(allPlayers.length);
  const _smY = new Float32Array(allPlayers.length);
  allPlayers.forEach((p, i) => { _smX[i] = p.hx; _smY[i] = p.hy; p.x = p.hx; p.y = p.hy; });

  /* playback state */
  let _tickF = 0, eventIdx = 0, raf = null, gameEnded = false;
  let momDisplay = 50;
  let liveScore = { A: 0, B: 0 };
  let liveShots = { A: 0, B: 0 }, liveSaves = { A: 0, B: 0 };
  let _paused = false;

  /* stoppage data */
  const hasPen = events.some(e => e.type === "penalty");
  const hasET  = events.some(e => e.type === "et_start");
  const stoppage = Math.floor(rng() * 4) + 2;
  const FULL = 90 + stoppage;
  const etLimitLocal = FULL + 30;

  function _clockDisp(c) { return clockDisp(c, hasET && c > FULL, FULL); }

  function updateMomBar(m) {
    const a = Math.round(m), b = 100 - a;
    const ma = $("momA"), mb = $("momB"), bar = $("momBar");
    if (ma) ma.textContent = a + "%";
    if (mb) mb.textContent = b + "%";
    if (bar) bar.style.background = `linear-gradient(90deg,var(--green) ${a}%,var(--red) ${a}%)`;
  }

  function updateStats() {
    const sh = $("statShot"), sv = $("statSave"), dg = $("statDanger");
    if (sh) sh.textContent = liveShots.A + "-" + liveShots.B;
    if (sv) sv.textContent = liveSaves.A + "-" + liveSaves.B;
    if (dg) dg.textContent = result.stats.shots.A + "-" + result.stats.shots.B;
  }

  function addGoalRow(side, html) {
    const el = $("simGoals"); if (!el) return;
    const d = document.createElement("div");
    d.className = (side === "A" ? "home" : "away") + " goal";
    d.innerHTML = html;
    el.prepend(d);
    while (el.children.length > 8) el.removeChild(el.lastChild);
  }

  function showGoalBurst(min, name, scoreStr) {
    const gb = $("goalBurst"); if (!gb) return;
    gb.innerHTML = `<b>${min}' ${name}</b><span>${scoreStr}</span>`;
    gb.classList.remove("hidden", "show");
    void gb.offsetWidth;
    gb.classList.add("show");
    setTimeout(() => gb.classList.add("hidden"), 1050);
  }

  function triggerEvent(ev) {
    /* update commentary */
    const comm = $("simComm"), radio = $("simRadio");
    if (comm && ev.comm) comm.innerHTML = ev.comm;
    if (radio && ev.comm) radio.innerHTML = "📻 " + ev.comm;

    const isTR = (typeof LANG !== "undefined" ? LANG : "tr") === "tr";
    const myN = (typeof clip === "function" && typeof teamName !== "undefined") ? clip(teamName || "US", 9) : (teamName || "US");
    const oppN = (typeof clip === "function" && typeof opponent !== "undefined") ? clip(opponent.name, 8) : (typeof opponent !== "undefined" ? opponent.name : "OPP");

    switch (ev.type) {
      case "goal":
        liveScore[ev.side]++;
        liveShots[ev.side]++;
        const sc = $("simScore");
        if (sc) sc.textContent = liveScore.A + "–" + liveScore.B;
        showGoalBurst(ev.minute, ev.scorer || (ev.side === "A" ? myN : oppN), liveScore.A + "–" + liveScore.B);
        addGoalRow(ev.side, `<b>${ev.minute}'</b><span>⚽ ${ev.scorer || (ev.side === "A" ? myN : oppN)} ${liveScore.A}–${liveScore.B}</span>`);
        if (typeof sfxGoal === "function") sfxGoal();
        /* dramatic moment effects */
        const isEq = liveScore.A === liveScore.B, isLate = gameClock > 78;
        const _wrap = document.querySelector(".simwrap");
        if (_wrap && (isEq || isLate)) {
          _wrap.classList.remove("shake", "equalize"); void _wrap.offsetWidth;
          _wrap.classList.add(isEq ? "equalize" : "shake");
          setTimeout(() => _wrap.classList.remove("equalize", "shake"), isEq ? 900 : 450);
        }
        momDisplay = Math.max(18, Math.min(82, momDisplay + (ev.side === "A" ? 22 : -22)));
        break;

      case "save":
        liveShots[ev.side === "A" ? "B" : "A"]++;
        liveSaves[ev.side]++;
        addGoalRow(ev.side, `<b>${ev.minute}'</b><span>🧤 ${ev.label || (isTR ? "Kaleci kurtardı" : "Keeper save")}</span>`);
        momDisplay = Math.max(18, Math.min(82, momDisplay + (ev.side === "A" ? -6 : 6)));
        break;

      case "shot_wide":
        liveShots[ev.side]++;
        momDisplay = Math.max(18, Math.min(82, momDisplay + (ev.side === "A" ? -3 : 3)));
        break;

      case "corner":
        momDisplay = Math.max(18, Math.min(82, momDisplay + (ev.side === "A" ? 4 : -4)));
        break;

      case "et_start":
        const ss = $("simState"); if (ss) ss.textContent = isTR ? "Uzatmalar" : "Extra Time";
        if (typeof sfxWhistle === "function") sfxWhistle();
        break;

      case "halftime":
        if (typeof sfxWhistle === "function") sfxWhistle();
        momDisplay = momDisplay * 0.7 + 50 * 0.3;
        break;

      case "penalty": {
        const sc2 = $("simScore"); if (sc2) sc2.textContent = liveScore.A + "–" + liveScore.B;
        if (ev.penResults) {
          const st = $("simState"); if (st) st.textContent = isTR ? "Penaltılar" : "Penalties";
          let delay = 300;
          ev.penResults.forEach((r, i) => {
            delay += 750;
            setTimeout(() => {
              const mA = r.a ? "✅" : "❌", mB = r.b ? "✅" : "❌";
              const comm2 = $("simComm");
              if (comm2) comm2.innerHTML = `🎯 ${r.sd ? "SD" : i + 1}. ${mA} <b>${(typeof clip === "function" ? clip(typeof teamName !== "undefined" ? teamName || "US" : "US", 7) : "US")}</b> <span style="opacity:.5">${r.kA}–${r.kB}</span> <b>${(typeof clip === "function" && typeof opponent !== "undefined" ? clip(opponent.name, 7) : "OPP")}</b> ${mB}`;
              if (typeof sfxKick === "function") sfxKick(3);
            }, delay);
          });
        }
        break;
      }

      case "chance":
      default:
        break;
    }

    /* move ball via waypoints: midfield transit → event position */
    /* ball position is driven by frame buffer — no target needed here */

    /* update state text */
    const stEl = $("simState");
    if (stEl && ev.type !== "et_start" && ev.type !== "halftime") {
      const diff = liveScore.A - liveScore.B;
      const isTR2 = (typeof LANG !== "undefined" ? LANG : "tr") === "tr";
      if (gameClock > 78 && diff === 0) stEl.textContent = isTR2 ? "Berabere, kritik dakikalar" : "Level — final minutes";
      else if (diff > 0) stEl.textContent = (typeof teamName !== "undefined" ? teamName || "US" : "US") + " " + (isTR2 ? "önde" : "leads");
      else if (diff < 0) stEl.textContent = (typeof opponent !== "undefined" ? opponent.name : "OPP") + " " + (isTR2 ? "önde" : "leads");
    }

    updateStats();
    updateMomBar(momDisplay);
  }

  /* ── Field drawing ── */
  function drawField() {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? "#79ad5c" : "#6fa052";
      ctx.fillRect(0, i * H / 9, W, H / 9);
    }
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 2;
    ctx.strokeRect(7, 7, W - 14, H - 14);
    ctx.beginPath(); ctx.moveTo(7, H / 2); ctx.lineTo(W - 7, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 38, 0, 7); ctx.stroke();
    /* goals */
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(GL, 7); ctx.lineTo(GR, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(GL, H - 7); ctx.lineTo(GR, H - 7); ctx.stroke();
    /* penalty areas */
    const PA_W = Math.round(W * 0.44), PA_H = Math.round(H * 0.28);
    const PA_L = (W - PA_W) / 2;
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(PA_L, 7, PA_W, PA_H);
    ctx.strokeRect(PA_L, H - 7 - PA_H, PA_W, PA_H);
  }

  function _updatePlayers(bx, by, now) {
    const emaF = Math.min(0.12, 0.038 * speedMul);
    allPlayers.forEach((p, i) => {
      let tx, ty;
      if (p.gk) {
        tx = Math.max(W * 0.22, Math.min(W * 0.78, W * 0.5 + (bx - W * 0.5) * 0.38));
        ty = p.isA ? H * 0.07 : H * 0.93;
      } else {
        const dx = bx - p.hx, dy = by - p.hy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const chase = Math.max(0, 1 - dist / (W * 0.38)) * 0.44;
        const lineShift = (by / H - 0.5) * (p.isA ? 0.14 : -0.14) * H;
        tx = p.hx + dx * chase + Math.sin(now * 0.00032 + p.n * 1.5) * 2.8;
        ty = p.hy + dy * chase + lineShift * 0.28 + Math.cos(now * 0.00041 + p.n * 1.2) * 2.2;
      }
      _smX[i] += (tx - _smX[i]) * emaF;
      _smY[i] += (ty - _smY[i]) * emaF;
      p.x = _smX[i]; p.y = _smY[i];
    });
  }

  function drawPlayers(frame) {
    allPlayers.forEach(p => {
      const isA = p.isA;
      const r = p.gk ? 8 : 9.5;
      const bx = Math.sin((frame + p.n * 9) * 0.16) * 1.1;
      const by = Math.cos((frame + p.n * 5) * 0.14) * 1.1;
      const cx = p.x + bx, cy = p.y + by;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7);
      ctx.fillStyle = p.gk ? "#e6ad2e" : (isA ? kit.bg : "#eae2cb"); ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = (isA && !p.gk) ? kit.sec : "#fff"; ctx.stroke();
      ctx.fillStyle = p.gk ? "#23332a" : (isA ? kit.fg : "#23332a");
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "bold 9px 'Inter',sans-serif"; ctx.fillText(p.n, cx, cy);
      /* name label with subtle background for legibility */
      const nm = (p.nm || "").slice(0, 9).toUpperCase();
      ctx.font = "bold 7px 'Inter',sans-serif";
      const nw = ctx.measureText(nm).width;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(cx - nw / 2 - 2, cy + r + 1, nw + 4, 9);
      ctx.fillStyle = isA ? "#d4f7e0" : "#f3ead2";
      ctx.fillText(nm, cx, cy + r + 6);
      if (p.inj) {
        ctx.fillStyle = "#d6543a"; ctx.fillRect(cx + r - 4, cy - r - 4, 8, 8);
        ctx.fillStyle = "#fff"; ctx.font = "bold 7px 'Inter',sans-serif";
        ctx.fillText("!", cx + r, cy - r + 1);
      }
    });
  }

  function drawScoreOverlay(gameClock) {
    const cd = _clockDisp(gameClock || 0);
    const txt = liveScore.A + "–" + liveScore.B + "  " + cd + "'";
    ctx.font = "bold 12px 'Inter',sans-serif";
    const tw = ctx.measureText(txt).width + 16;
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect((W - tw) / 2, 10, tw, 18);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(txt, W / 2, 19);
    const clk = $("simClk"); if (clk) clk.textContent = cd + "'";
    const tv = $("tvover");
    if (tv) tv.innerHTML = (typeof round !== "undefined" && round >= 6 ? "🏆 " + (typeof L === "function" ? L().cupTitle : "CUP") : "🔴 TRT SPOR") + " · " + cd + "' · " + liveScore.A + "–" + liveScore.B;
  }

  /* ── Playback loop (frame-buffer read) ── */
  let _frame = 0, lastTs = null;
  function frameStep(ts) {
    if (_paused || gameEnded) return;
    if (lastTs === null) lastTs = ts;
    const dt = Math.min(100, ts - lastTs) / 1000;
    lastTs = ts;

    /* advance tick counter */
    _tickF = Math.min(_totalTicks - 1, _tickF + dt * speedMul * TPG * 0.55);
    const _t = Math.floor(_tickF);
    const _gameClock = _tickF / TPG;
    _frame++;

    /* read ball position from buffer */
    const _bx = _fbX[_t], _by = _fbY[_t];

    /* fire events whose game-minute has been reached */
    while (eventIdx < events.length && _gameClock >= events[eventIdx].minute) {
      triggerEvent(events[eventIdx]);
      eventIdx++;
    }

    /* end check */
    if (_t >= _totalTicks - 1 && !gameEnded) { endMatch(); return; }

    /* update player positions (EMA toward ball-driven targets) */
    _updatePlayers(_bx, _by, ts);

    /* draw */
    ctx.clearRect(0, 0, W, H);
    drawField();
    drawPlayers(_frame);
    /* ball */
    ctx.beginPath(); ctx.arc(_bx, _by, BR, 0, 7);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#23332a"; ctx.stroke();
    drawScoreOverlay(_gameClock);

    raf = requestAnimationFrame(frameStep);
  }

  function _drawFinalFrame() {
    const _bx = _fbX[_totalTicks - 1], _by = _fbY[_totalTicks - 1];
    ctx.clearRect(0, 0, W, H);
    drawField();
    drawPlayers(_frame);
    ctx.beginPath(); ctx.arc(_bx, _by, BR, 0, 7);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "#23332a"; ctx.stroke();
    drawHeatmap(ctx, W, H, heatGrid, HGW, HGH);
  }

  function endMatch() {
    if (gameEnded) return;
    gameEnded = true;
    if (raf) cancelAnimationFrame(raf);
    if (typeof crowdStop === "function") crowdStop();
    if (typeof sfxWhistle === "function") sfxWhistle();
    _drawFinalFrame();
    try { window._heatmapImg = cv.toDataURL("image/png"); } catch (e) {}
    const sc = $("simScore"); if (sc) sc.textContent = result.score.A + "–" + result.score.B;
    makeReport(result.won);
    setTimeout(() => endRun(result.won, result.score.A + "–" + result.score.B), 1000);
  }

  /* ── makeReport ── */
  function makeReport(won) {
    const tr = LANG === "tr";
    const cardsTxt = (typeof finalCardSummary === "function" ? finalCardSummary() : "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const kM = result.keyMoment || (window.goals && window.goals[0] && window.goals[0].scorer) || "-";
    const rows = [
      [tr ? "Maçın kırılma anı" : "Key moment", kM],
      [tr ? "Şutlar" : "Shots", result.stats.shots.A + "-" + result.stats.shots.B],
      [tr ? "Kurtarışlar" : "Saves", result.stats.saves.A + "-" + result.stats.saves.B],
      [tr ? "Final kart etkisi" : "Final card effect", cardsTxt || "0"]
    ];
    if (result.penaltyNote) rows.push([tr ? "Penaltılar" : "Penalties", result.penaltyNote]);
    const _fn_wt = ["Kupa sandığa girdi. Bu kadroya saygı duruşu.", "Rüya sezon. Final sahnesi, şampiyonluk sarhoşluğu.", "Son düdüğe kadar didindi. Hak edilmiş bir zafer.", "Bu takım birlikte büyüdü. Kupa onları bekliyordu.", "Rakip daha güçlüydü; ama bugün sahada yürüyen kupayı kazandı.", "İnançla kurulmuş bir kadro, inançla kaldırdı kupayı."];
    const _fn_we = ["The cup comes home. This squad earned every inch.", "A dream run. Final glory sealed.", "Fought until the last whistle. Perfectly deserved.", "Built to win, and they did exactly that.", "The underdog story that wrote its own final chapter.", "One trophy, one squad, one unforgettable run."];
    const _fn_lt = ["Finale geldi, yetmedi. Bir sonraki run daha güçlü.", "Son adımda tökezledi. Ama bu ruh devam edecek.", "Kupa yakındı — bir gol, bir karar, bir an. Sıradaki.", "Bu kadro çok şey gördü. Ama şampiyonluk başka birini seçti.", "Rakip daha hazırdı. Sıfırdan başla, bu sefer fark yat.", "Finaller böyle. Bir hata, bir ömür. Bir sonraki run."];
    const _fn_le = ["So close. Build something stronger next time.", "Fell at the final hurdle. The run had real quality.", "One moment decided it. Come back harder.", "Almost isn't enough in a final. Try again.", "The squad gave everything. The cup found another home.", "Fine margins. One more piece next run."];
    const _ni = Math.floor(Math.random() * 6);
    rows.push([tr ? "Final yorumu" : "Final note", won ? (tr ? _fn_wt[_ni] : _fn_we[_ni]) : (tr ? _fn_lt[_ni] : _fn_le[_ni])]);
    window.finalReportHTML = `<h4>${tr ? "Final Karnesi" : "Final Report"}</h4>` + rows.map(r => `<div class="frrow"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");
  }

  /* expose sim object */
  sim = {
    run: function () {
      _paused = false; _simPaused = false;
      raf = requestAnimationFrame(frameStep);
    },
    pause: function () {
      _paused = true; _simPaused = true;
      if (raf) cancelAnimationFrame(raf);
      const pb = $("pauseBtn"); if (pb) { pb.textContent = "▶"; pb.classList.add("pause"); }
    },
    resume: function () {
      _paused = false; _simPaused = false;
      if (!gameEnded) { lastTs = null; raf = requestAnimationFrame(frameStep); }
      const pb = $("pauseBtn"); if (pb) { pb.textContent = "⏸"; pb.classList.remove("pause"); }
    },
    shout: function (t) {
      const mp = { more: { t: "yüklen!", e: "push up!" }, push: { t: "önde bas!", e: "press high!" }, calm: { t: "tempoyu düşür", e: "slow tempo" }, hold: { t: "skoru koru", e: "protect lead" } };
      const c = mp[t] || mp.more;
      if (typeof playUiSample === "function") playUiSample("click", 0.18);
      const rb = $("simRadio");
      if (rb) rb.innerHTML = "📻 <b>" + (typeof clip === "function" ? clip(typeof teamName !== "undefined" ? teamName || "US" : "US", 9) : "US") + "</b> " + (LANG === "tr" ? c.t : c.e);
    },
    skip: function () {
      if (gameEnded) return;
      _paused = false;
      if (raf) cancelAnimationFrame(raf);
      while (eventIdx < events.length) { triggerEvent(events[eventIdx]); eventIdx++; }
      _tickF = _totalTicks - 1;
      _drawFinalFrame();
      try { window._heatmapImg = cv.toDataURL("image/png"); } catch (e) {}
      const sc = $("simScore"); if (sc) sc.textContent = result.score.A + "–" + result.score.B;
      const clk = $("simClk"); if (clk) clk.textContent = "90'";
      window.motm = result.motm; try { motm = result.motm; } catch (e2) {}
      makeReport(result.won);
      gameEnded = true;
      endRun(result.won, result.score.A + "–" + result.score.B);
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
