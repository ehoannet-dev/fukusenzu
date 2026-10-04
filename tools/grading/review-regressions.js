#!/usr/bin/env node
/* 公開前のコードレビュー（2026-09-29）で見つかった採点エンジンの不具合が、再発していないかを確かめる
     node tools/grading/review-regressions.js   → 最後に「N件中 期待どおり N」 */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
global.window = {};
require(path.join(ROOT, 'js/problems.js'));
fs.readdirSync(path.join(ROOT, 'js/problems')).filter(f => /^no\d+\.js$/.test(f)).sort()
  .forEach(f => require(path.join(ROOT, 'js/problems', f)));
require(path.join(ROOT, 'js/engine.js'));
const Engine = window.Engine;
const P = (id) => window.PROBLEMS.find(p => p.id === id);
const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });

/* 模範解答の state（tools/check-problems.js と同じ作り方） */
function answerState(problem, ans) {
  const a = ans || problem.answer;
  const wires = a.wires.map((w, i) => ({ id: 'aw' + (i + 1), a: parseEp(w.a), b: parseEp(w.b), color: w.color }));
  const bundles = a.bundles.map((b, i) => ({
    id: 'ab' + (i + 1), jb: b.jb,
    ends: b.wires.map(key => {
      const [pair, color] = key.split(':');
      const [ka, kb] = pair.split('|');
      const w = wires.find(x => ((x.a.id === ka && x.b.id === kb) || (x.a.id === kb && x.b.id === ka)) && (!color || x.color === color));
      return w ? w.id + ':' + ((w.a.k === 'jb' && w.a.id === b.jb) ? 'a' : 'b') : null;
    }).filter(Boolean)
  }));
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
  (problem.runs || []).forEach(run => {
    if (!run.slots) return;
    const used = {};
    Engine.wiresOfRun(problem, state, run).forEach(w => {
      for (let i = 0; i < run.slots; i++) {
        const k = Engine.slotKey(run, i);
        const pc = Engine.slotPiece(state, k);
        const t = pc && window.CABLE_TYPES[pc.type];
        if (!t || t.cores.indexOf(w.color) < 0) continue;
        const set = used[k] = used[k] || {};
        if (set[w.color]) continue;
        set[w.color] = true; w.slot = k; break;
      }
    });
  });
  return state;
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const msgs = (g) => g.issues.filter(i => i.level === 'bad').map(i => i.msg);

let ok = 0, n = 0;
const T = (desc, fn) => {
  n++;
  let r;
  try { r = fn(); } catch (e) { r = 'エラー: ' + e.message; }
  if (r === true) { ok++; console.log('OK  ' + desc); } else console.log('NG  ' + desc + (r ? '　… ' + r : ''));
};

/* 1. 2本支給のケーブル：先に余分を切っても、2本に分けて収まるなら切れる（前から詰めるだけの判定で断っていた） */
T('No.1：VVF1.6-2C（900mm×2）から 200×4＋250×3 を切ったあとも、250 をもう1本切れる', () => {
  const st = { pieces: [] };
  [200, 200, 200, 200, 250, 250, 250].forEach((len, i) => st.pieces.push({ id: 'p' + i, type: 'vvf16-2c', len }));
  return Engine.canCut(P('no1'), st, 'vvf16-2c', 250) || '切れない判定になった';
});
T('No.8：VVF1.6-2C（1100mm×2）で 600×2 のあと 700 は切れない（合計 1900 は足りるが、どう分けても1本に入らない）', () => {
  const st = { pieces: [600, 600].map((len, i) => ({ id: 'p' + i, type: 'vvf16-2c', len })) };
  if (!Engine.canCut(P('no8'), { pieces: [] }, 'vvf16-2c', 600)) return '最初の 600 から切れない';
  return !Engine.canCut(P('no8'), st, 'vvf16-2c', 700) || '切れる判定になった';
});
T('支給より多く切ったら（区間に置かない余りでも）不合格', () => {
  const st = answerState(P('no6'));
  st.pieces.push({ id: 'extra', type: 'vvf16-3c', len: 400 });
  const g = Engine.grade(P('no6'), st);
  return !g.passed || '合格になった';
});

/* 2. 接地線が電源の回路とつながったとき、緑の接地線に「接地線以外に緑」と出さない */
['no3', 'no9', 'no13'].forEach(id => {
  T(`${id}：コンセントの W へ行く白を接地極端子へ差し替えても「接地線以外に緑色」を出さない（不合格にはなる）`, () => {
    const p = P(id), ans = clone(p.answer);
    const oe = p.devices.find(d => d.type === 'outlet' && (d.terminals || []).some(t => t.kind === 'earth'));
    const w = ans.wires.find(x => x.b === oe.id + '.W' || x.a === oe.id + '.W');
    if (w.b === oe.id + '.W') w.b = oe.id + '.E'; else w.a = oe.id + '.E';
    ans.bundles.forEach(b => { b.wires = b.wires.map(k => k.split(oe.id + '.W').join(oe.id + '.E')); });
    const g = Engine.grade(p, answerState(p, ans));
    if (g.passed) return '合格になった';
    const bad = msgs(g).filter(m => /接地線以外に緑色|接地線に(白|黒)色/.test(m));
    return !bad.length || bad[0];
  });
});

/* 3. 常時点灯の器具を、ほかの点滅器の混線として報告しない */
T('No.8：イ を常時点灯にしても「リモコンリレー「ロ」を入れると…まで点灯」と出さない', () => {
  const p = P('no8'), ans = clone(p.answer);
  // イ の非接地側を電源の黒の接続点へ（リレー イ の帰り線は外す）
  const b0 = ans.bundles.find(b => b.wires.indexOf('src.L|jb') >= 0);
  const bI = ans.bundles.find(b => b.wires.indexOf('jb|ceilI.X') >= 0);
  bI.wires = bI.wires.filter(k => k !== 'jb|ceilI.X');
  b0.wires.push('jb|ceilI.X');
  const g = Engine.grade(p, answerState(p, ans));
  if (g.passed) return '合格になった';
  const bad = msgs(g).filter(m => /受け持っていない/.test(m));
  return !bad.length || bad[0];
});

/* 4. ヒントの対象端子：極性の無い点滅器を逆向きにつないでも、手順の対象は電源側の端子 */
T('No.1：点滅器イを逆向き（黒を負荷側端子）につないでも、手順 l の対象にイの端子を出さない', () => {
  const p = P('no1'), ans = clone(p.answer);
  ans.wires.forEach(w => {
    ['a', 'b'].forEach(k => {
      if (w[k] === 'swI.C') w[k] = 'swI.L'; else if (w[k] === 'swI.L') w[k] = 'swI.C';
    });
  });
  ans.bundles.forEach(b => { b.wires = b.wires.map(k => k.replace(/swI\.C/g, '@@').replace(/swI\.L/g, 'swI.C').replace(/@@/g, 'swI.L')); });
  const st = answerState(p, ans);
  // ロ⇄ハ の渡り線を外す
  const j = st.wires.findIndex(w => (w.a.id === 'swRo.C' && w.b.id === 'swHa.C') || (w.a.id === 'swHa.C' && w.b.id === 'swRo.C'));
  if (j >= 0) st.wires.splice(j, 1);
  const l = Engine.steps(p, st).find(s => s.id === 'l');
  if (!l || l.done) return 'l の手順が残っていない';
  return (l.targets || []).every(t => t.indexOf('swI.') !== 0) || 'イの端子が対象: ' + l.targets.join(',');
});

console.log(`\n${n}件中 期待どおり ${ok}／期待と違う ${n - ok}`);
process.exitCode = ok === n ? 0 : 1;
