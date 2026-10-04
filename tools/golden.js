#!/usr/bin/env node
/* 回帰用ゴールデン：No.1〜5 の模範解答と「誤配線コーパス」を採点・通電して JSON に書き出す
   node tools/golden.js <engine.js> <out.json> [problems.js] */
'use strict';
const path = require('path');
const fs = require('fs');
const enginePath = path.resolve(process.argv[2]);
const outPath = path.resolve(process.argv[3]);
const problemsPath = path.resolve(process.argv[4] || path.join(__dirname, '../js/problems.js'));
global.window = {};
require(problemsPath);
require(enginePath);
const Engine = window.Engine, CABLES = window.CABLE_TYPES;
const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });
const clone = (o) => JSON.parse(JSON.stringify(o));
const needAt = (run, i) => { const a = [].concat(run.need); return a.length > 1 ? a[i] : a[0]; };

function answerState(problem) {
  const a = problem.answer;
  const wires = a.wires.map((w, i) => ({ id: 'aw' + (i + 1), a: parseEp(w.a), b: parseEp(w.b), color: w.color }));
  const bundles = a.bundles.map((b, i) => {
    const ends = b.wires.map(key => {
      const [pair, color] = key.split(':');
      const [ka, kb] = pair.split('|');
      const w = wires.find(x => ((x.a.id === ka && x.b.id === kb) || (x.a.id === kb && x.b.id === ka)) && (!color || x.color === color));
      if (!w) return null;
      return w.id + ':' + ((w.a.k === 'jb' && w.a.id === b.jb) ? 'a' : 'b');
    }).filter(Boolean);
    return { id: 'ab' + (i + 1), jb: b.jb, ends };
  });
  const cables = {}, pieces = [];
  (problem.runs || []).forEach(run => {
    for (let i = 0; i < (run.slots || 0); i++) {
      const pc = { id: 'ac' + (pieces.length + 1), type: needAt(run, i), len: run.cut || 0 };
      pieces.push(pc); cables[Engine.slotKey(run, i)] = pc.id;
    }
  });
  const sw = {};
  Engine.switchables(problem).forEach(d => { sw[d.id] = false; });
  const state = { wires, bundles, cables, pieces, switches: sw, power: true, seq: 900 };
  reassign(problem, state);
  return state;
}
function reassign(problem, state) {
  (problem.runs || []).forEach(run => {
    if (!run.slots) return;
    const used = {};
    Engine.wiresOfRun(problem, state, run).forEach(w => {
      if (w.slot) { const set = used[w.slot] = used[w.slot] || {}; set[w.color] = true; return; }
    });
    Engine.wiresOfRun(problem, state, run).forEach(w => {
      if (w.slot) return;
      for (let i = 0; i < run.slots; i++) {
        const k = Engine.slotKey(run, i);
        const pc = Engine.slotPiece(state, k);
        const t = pc && CABLES[pc.type];
        if (!t || t.cores.indexOf(w.color) < 0) continue;
        const set = used[k] = used[k] || {};
        if (set[w.color]) continue;
        set[w.color] = true; w.slot = k; break;
      }
    });
  });
}

function corpus(problem) {
  const base = answerState(problem);
  const out = [{ name: 'answer', st: base }];
  base.wires.forEach((w, i) => {
    const st = clone(base);
    st.wires.splice(i, 1);
    st.bundles.forEach(b => { b.ends = b.ends.filter(e => e.split(':')[0] !== w.id); });
    out.push({ name: 'drop-wire-' + w.id, st });
    ['black', 'white', 'red', 'green'].filter(c => c !== w.color).forEach(c => {
      const s2 = clone(base); s2.wires[i].color = c; delete s2.wires[i].slot; reassign(problem, s2);
      out.push({ name: 'recolor-' + w.id + '-' + c, st: s2 });
    });
  });
  base.bundles.forEach((b, i) => {
    const st = clone(base); st.bundles.splice(i, 1);
    out.push({ name: 'drop-bundle-' + b.id, st });
    b.ends.forEach((e, k) => {
      const s2 = clone(base); s2.bundles[i].ends.splice(k, 1);
      out.push({ name: 'drop-end-' + b.id + '-' + e, st: s2 });
    });
    // 2つの接続点をまとめる（混線・短絡を作る）
    base.bundles.forEach((b2, j) => {
      if (j <= i || b2.jb !== b.jb) return;
      const s3 = clone(base);
      s3.bundles[i].ends = s3.bundles[i].ends.concat(s3.bundles[j].ends);
      s3.bundles.splice(j, 1);
      out.push({ name: 'merge-' + b.id + '-' + b2.id, st: s3 });
    });
  });
  // 同じ器具の2端子の電線を入れ替え
  problem.devices.forEach(d => {
    const ts = d.terminals || [];
    for (let x = 0; x < ts.length; x++) for (let y = x + 1; y < ts.length; y++) {
      const A = d.id + '.' + ts[x].id, B = d.id + '.' + ts[y].id;
      const st = clone(base);
      let n = 0;
      st.wires.forEach(w => ['a', 'b'].forEach(s => {
        if (w[s].k !== 't') return;
        if (w[s].id === A) { w[s] = { k: 't', id: B }; n++; }
        else if (w[s].id === B) { w[s] = { k: 't', id: A }; n++; }
      }));
      if (n) out.push({ name: 'swap-' + A + '-' + B, st });
    }
  });
  // ケーブルを外す
  Object.keys(base.cables).forEach(k => {
    const st = clone(base); delete st.cables[k];
    out.push({ name: 'nocable-' + k, st });
  });
  return out;
}

function simAll(problem, st) {
  const ids = Engine.switchables(problem).map(s => s.id);
  const res = [];
  for (let m = 0; m < (1 << ids.length); m++) {
    const ss = {};
    ids.forEach((id, k) => { ss[id] = !!((m >> k) & 1); });
    const r = Engine.simulate(problem, st, ss);
    res.push({ m, lit: r.lit, pilots: r.pilots, shorted: r.shorted, ws: r.wireState });
  }
  return res;
}

const want = ['no1', 'no2', 'no3', 'no4', 'no5'];
const result = {};
window.PROBLEMS.filter(p => want.indexOf(p.id) >= 0).forEach(p => {
  result[p.id] = corpus(p).map(c => {
    const g = Engine.grade(p, c.st);
    const steps = Engine.steps(p, c.st).map(s => [s.id, s.done, s.hint]);
    return {
      name: c.name, score: g.score, passed: g.passed, circuitOk: g.circuitOk,
      checks: g.checks, issues: g.issues.map(i => [i.level, i.msg, i.detail, i.focus]),
      steps, sim: simAll(p, c.st),
      bundles: c.st.bundles.map(b => Engine.bundleInfo(p, c.st, b)).map(i => [i.method, i.sleeve, i.mark, i.spec, i.ng || null])
    };
  });
});
fs.writeFileSync(outPath, JSON.stringify(result));
const n = Object.keys(result).reduce((s, k) => s + result[k].length, 0);
console.log('cases:', n, '→', outPath);
