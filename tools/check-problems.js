#!/usr/bin/env node
/* ===========================================================
   問題データの検査（ブラウザ不要）
     node tools/check-problems.js            … 全問
     node tools/check-problems.js no6 no7    … 指定した問題だけ
   「正解を見る」と同じ手順で模範解答を state にして採点し、
   100点・合格・欠陥0 になるか、データの食い違いが無いかを確かめる。
   =========================================================== */
'use strict';
const path = require('path');
global.window = {};
const fs = require('fs');
require(path.join(__dirname, '../js/problems.js'));
// 1問1ファイル（js/problems/noNN.js）
const pdir = path.join(__dirname, '../js/problems');
if (fs.existsSync(pdir)) fs.readdirSync(pdir).filter(f => /^no\d+\.js$/.test(f)).sort()
  .forEach(f => require(path.join(pdir, f)));
require(path.join(__dirname, '../js/engine.js'));
const Engine = window.Engine, CABLES = window.CABLE_TYPES;

const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });

function answerState(problem) {
  const a = problem.answer;
  const wires = a.wires.map((w, i) => ({ id: 'aw' + (i + 1), a: parseEp(w.a), b: parseEp(w.b), color: w.color }));
  const unresolved = [];
  const bundles = a.bundles.map((b, i) => {
    const ends = b.wires.map(key => {
      const [pair, color] = key.split(':');
      const [ka, kb] = pair.split('|');
      const w = wires.find(x => ((x.a.id === ka && x.b.id === kb) || (x.a.id === kb && x.b.id === ka)) && (!color || x.color === color));
      if (!w) { unresolved.push(`${b.jb}: ${key}`); return null; }
      return w.id + ':' + ((w.a.k === 'jb' && w.a.id === b.jb) ? 'a' : 'b');
    }).filter(Boolean);
    return { id: 'ab' + (i + 1), jb: b.jb, ends };
  });
  const cables = {}, pieces = [];
  (problem.runs || []).forEach(run => {
    for (let i = 0; i < (run.slots || 0); i++) {
      const pc = { id: 'ac' + (pieces.length + 1), type: Engine.slotNeed(run, i), len: run.cut || 0 };
      pieces.push(pc); cables[Engine.slotKey(run, i)] = pc.id;
    }
  });
  const sw = {};
  Engine.switchables(problem).forEach(d => { sw[d.id] = false; });
  const state = { wires, bundles, cables, pieces, switches: sw, power: true, seq: 900 };
  // app.js の reassignSlots と同じ：各心線をケーブルの心線に割り当てる
  (problem.runs || []).forEach(run => {
    if (!run.slots) return;
    const used = {};
    Engine.wiresOfRun(problem, state, run).forEach(w => {
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
  return { state, unresolved };
}

/* render.js が描ける器具・単線図の記号（無い type は無言で描かれないので検査する） */
const DEVICE_TYPES = ['source', 'jointbox', 'ceiling', 'lamp', 'fluorescent', 'switch', 'outlet', 'pilot',
  'terminal', 'motor', 'earth', 'breaker'];
const SYMBOL_TYPES = ['text', 'jb', 'ceiling', 'lamp', 'switch-dots', 'fluor-omitted', 'outlet', 'pilot',
  'omit-box', 'tb', 'motor', 'earth', 'fluor', 'relay', 'conduit'];

function checkData(p) {
  const errs = [];
  const devIds = new Set(p.devices.map(d => d.id));
  const groups = new Set(p.devices.map(d => d.group));
  const seenIds = new Set();
  p.devices.forEach(d => {
    if (seenIds.has(d.id)) errs.push(`device ${d.id}: id が重複`); seenIds.add(d.id);
    if (DEVICE_TYPES.indexOf(d.type) < 0) errs.push(`device ${d.id}: type '${d.type}' は描けない`);
    if (d.type !== 'jointbox' && d.type !== 'source' && !(typeof d.x === 'number' && typeof d.y === 'number'))
      errs.push(`device ${d.id}: 座標 x/y が無い`);
  });
  ((p.single && p.single.symbols) || []).forEach((sy, i) => {
    if (SYMBOL_TYPES.indexOf(sy.type) < 0) errs.push(`single.symbols[${i}]: type '${sy.type}' は描けない`);
  });
  (p.runs || []).forEach(r => {
    if (!groups.has(r.a) || !groups.has(r.b)) errs.push(`run ${r.id}: 端のグループが無い (${r.a} / ${r.b})`);
    if (r.slots) {
      const needs = Engine.slotNeeds(r);
      needs.forEach(n => { if (!CABLES[n]) errs.push(`run ${r.id}: need のケーブル種別が無い (${n})`); });
      if (Array.isArray(r.need) && r.need.length > 1 && r.need.length !== r.slots)
        errs.push(`run ${r.id}: need 配列の長さ ${r.need.length} が slots ${r.slots} と違う`);
      if (!(r.span > 0)) errs.push(`run ${r.id}: span（図の寸法）が無い`);
      if (!(r.cut > 0)) errs.push(`run ${r.id}: cut（切る長さ）が無い`);
      if (!r.at || r.at.length !== r.slots) errs.push(`run ${r.id}: at（札の位置）の数が slots と違う`);
      if (!r.note) errs.push(`run ${r.id}: note（区間の説明）が無い`);
    }
  });
  const need = {};
  (p.runs || []).filter(r => r.slots).forEach(r => {
    for (let i = 0; i < r.slots; i++) { const n = Engine.slotNeed(r, i); need[n] = (need[n] || 0) + r.cut; }
  });
  const sup = (p.supply && p.supply.cables) || {};
  Object.keys(need).forEach(k => {
    const s = sup[k]; const tot = s ? s.len * (s.count || 1) : 0;
    if (tot < need[k]) errs.push(`supply ${k}: 支給 ${tot}mm < 必要 ${need[k]}mm`);
  });
  p.answer.wires.forEach((w, i) => {
    [w.a, w.b].forEach(ep => {
      const e = parseEp(ep);
      if (e.k === 't' && !Engine.terminalRef(p, e.id)) errs.push(`answer wire #${i + 1}: 端子が無い ${e.id}`);
      if (e.k === 'jb' && !devIds.has(e.id)) errs.push(`answer wire #${i + 1}: ボックスが無い ${e.id}`);
    });
  });
  (p.pairs || []).forEach(pr => {
    const sw = p.devices.find(d => d.id === pr.sw);
    if (!sw) errs.push(`pair: 点滅器が無い ${pr.sw}`);
    // 帰り線チェックは sw の「負荷側の端子」を見る。無いと黙って飛ばされる
    else if (!(sw.terminals || []).some(t => t.kind === 'sw-load'))
      errs.push(`pair ${pr.sw}→${pr.load}: sw に負荷側の端子（kind 'sw-load'）が無い（帰り線チェックが無言で飛ぶ）`);
    (pr.via || []).forEach(v => {
      const d = p.devices.find(x => x.id === v);
      if (!d) errs.push(`pair: via の器具が無い ${v}`);
      else if (!d.positions) errs.push(`pair: via の ${v} に positions が無い（3路・4路ではない）`);
    });
    if (!devIds.has(pr.load)) errs.push(`pair: 負荷が無い ${pr.load}`);
  });
  ['title', 'subtitle', 'conditions', 'tips', 'single', 'workspace'].forEach(k => {
    if (!p[k]) errs.push(`問題の ${k} が無い`);
  });
  if (!p.answer || !p.answer.explain || !p.answer.explain.length) errs.push('answer.explain（解説）が無い');
  return errs;
}

const want = process.argv.slice(2);
let bad = 0;
window.PROBLEMS.filter(p => !want.length || want.indexOf(p.id) >= 0).forEach(p => {
  const dataErrs = checkData(p);
  const { state, unresolved } = answerState(p);
  let g = null, err = null;
  try { g = Engine.grade(p, state); } catch (e) { err = e; }
  const issues = g ? g.issues.filter(x => x.level === 'bad') : [];
  const ok = !err && g && g.passed && g.score === 100 && !dataErrs.length && !unresolved.length;
  if (!ok) bad++;
  console.log(`${ok ? '✅' : '❌'} ${p.id}  ${g ? g.score + '点' : 'ERROR'}  欠陥${issues.length}  データ${dataErrs.length}  未解決の接続点${unresolved.length}`);
  if (err) console.log('   例外:', err.stack.split('\n').slice(0, 3).join(' | '));
  dataErrs.forEach(e => console.log('   データ:', e));
  unresolved.forEach(e => console.log('   接続点:', e));
  issues.slice(0, 12).forEach(x => console.log('   欠陥:', x.msg.replace(/<[^>]+>/g, '')));
});
process.exit(bad ? 1 : 0);
