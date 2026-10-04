#!/usr/bin/env node
/* No.13 採点エンジンの検証（合格にすべき例・不合格にすべき例） */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
global.window = {};
require(path.join(ROOT, 'js/problems.js'));
require(path.join(ROOT, 'js/problems/no13.js'));
require(path.join(ROOT, 'js/engine.js'));
const Engine = window.Engine, CABLES = window.CABLE_TYPES;
const P0 = window.PROBLEMS.find(p => p.id === 'no13');
const clone = (o) => JSON.parse(JSON.stringify(o));
const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });

/* check-problems.js の answerState と同じ（answer を差し替え可・reassignSlots も同じ） */
function answerState(problem, answer, tweakPieces) {
  const a = answer || problem.answer;
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
  if (unresolved.length) throw new Error('未解決の接続点: ' + unresolved.join(', '));
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
  if (tweakPieces) tweakPieces(state);
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
  return state;
}

function mutate(fn) { const ans = clone(P0.answer); fn(ans); return ans; }
const W = (ans, a, b, color) => {
  const w = ans.wires.find(w => ((w.a === a && w.b === b) || (w.a === b && w.b === a)) && (!color || w.color === color));
  if (!w) throw new Error(`wire なし ${a}|${b}:${color || ''}`);
  return w;
};
const Bjb = (ans, jb, label) => { const b = ans.bundles.find(x => x.jb === jb && x.label.indexOf(label) >= 0); if (!b) throw new Error('束なし ' + jb + label); return b; };
const setPiece = (st, slot, patch) => Object.assign(st.pieces.find(p => p.id === st.cables[slot]), patch);
const dropWire = (a, x, y, col) => { const w = W(a, x, y, col); a.wires.splice(a.wires.indexOf(w), 1); };

/* 通電試験：イ（swI）× 自動点滅器（as：入＝暗い）の 4 通り */
function simAll(st) {
  const out = [];
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, r]) => {
    const s = Engine.simulate(P0, st, { swI: !!i, as: !!r });
    out.push(`イ${i}暗${r}:lamp${s.lit.lamp ? 1 : 0}ol${s.lit.ol ? 1 : 0}oe${s.lit.oe ? 1 : 0}${s.shorted ? 'SHORT' : ''}`);
  });
  return out.join(' ');
}
const EXPECT_SIM = 'イ0暗0:lamp0ol0oe1 イ1暗0:lamp1ol0oe1 イ0暗1:lamp0ol1oe1 イ1暗1:lamp1ol1oe1';
const joinInfo = (st) => st.bundles.map(b => { const i = Engine.bundleInfo(P0, st, b); return b.jb + '=' + (i.method === 'connector' ? 'コネクタ' + i.count : i.sleeve + '/' + i.mark); }).join(',');
const simCheck = (st) => { const s = simAll(st); return { note: s, ok: s === EXPECT_SIM }; };

const cases = [];
const T = (desc, expected, build, extra) => cases.push({ desc, expected, build, extra });

/* ===== 合格にすべき例 ===== */
T('模範解答そのまま＋全スイッチ状態の点灯＋接続材料（A=小/小,小/小,小/○、B=コネクタ4,3,2）', 'pass', () => answerState(P0), (st) => {
  const s = simAll(st), j = joinInfo(st);
  const okJ = j === 'jbA=小/小,jbA=小/小,jbA=小/○,jbB=コネクタ4,jbB=コネクタ3,jbB=コネクタ2';
  return { note: s + ' / ' + j, ok: s === EXPECT_SIM && okJ };
});
T('点滅器イの端子入れ替え（極性なし）：黒→負荷側表示の端子、白（帰り）→電源側表示の端子', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jbA', 'swI.C', 'black').b = 'swI.L__x';
  W(a, 'jbA', 'swI.L', 'white').b = 'swI.C';
  W(a, 'jbA', 'swI.L__x', 'black').b = 'swI.L';
  Bjb(a, 'jbA', '非接地側').wires = ['src.L|jbA', 'jbA|swI.L', 'jbA|jbB:black'];
  Bjb(a, 'jbA', 'イの帰り').wires = ['jbA|swI.C', 'jbA|jbB:red'];
})), simCheck);
T('接続点の順番・接続点内の線の並び・電線の登録順を逆にする', 'pass', () => {
  const st = answerState(P0);
  st.bundles.reverse(); st.bundles.forEach(b => b.ends.reverse()); st.wires.reverse();
  return st;
}, simCheck);
T('端子台2のわたり（VVR白）の向き（a/b）を逆に登録', 'pass', () => answerState(P0, mutate(a => {
  const w = W(a, 'as.2', 'ol.W', 'white'); w.a = 'ol.W'; w.b = 'as.2';
})), simCheck);
T('VVF1.6-2C（1400mm）から予備を 350mm 余分に切る（合計 1400mm＝支給ちょうど、区間には置かない）', 'pass', () => answerState(P0, null, st => {
  st.pieces.push({ id: 'extra1', type: 'vvf16-2c', len: 350 });
}), simCheck);

/* ===== 不合格にすべき例 ===== */
T('接地側・非接地側の取り違え（A）：電源の白を黒の束へ、黒を白の束へ', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbA', '非接地側').wires = ['src.N|jbA', 'jbA|swI.C', 'jbA|jbB:black'];
  Bjb(a, 'jbA', '接地側').wires = ['src.L|jbA', 'jbA|jbB:white'];
})), (st) => ({ note: simAll(st) }));
T('帰り線の取り違え（B）：3C赤（イの帰り）をコンセント非接地側へ、黒の束をランプレセプタクルへ', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbB', '非接地側').wires = ['jbA|jbB:black', 'jbB|lamp.X', 'jbB|as.1'];
  Bjb(a, 'jbB', 'イの帰り').wires = ['jbA|jbB:red', 'jbB|oe.L'];
})), (st) => ({ note: simAll(st) }));
T('自動点滅器 1 と 3 の入れ替え：B の黒→端子台 3、VVR 黒→端子台 1（屋外灯が常時点灯）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'as.1', 'black').b = 'as.3__x';
  W(a, 'as.3', 'ol.X', 'black').a = 'as.1';
  W(a, 'jbB', 'as.3__x', 'black').b = 'as.3';
  Bjb(a, 'jbB', '非接地側').wires = ['jbA|jbB:black', 'jbB|oe.L', 'jbB|as.3'];
})), (st) => ({ note: simAll(st) }));
T('屋外灯の黒を端子台 1 から取る（3 は空き＝接点を通らず常時点灯）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'as.3', 'ol.X', 'black').a = 'as.1';
})), (st) => ({ note: simAll(st) }));
T('自動点滅器 1 と 2 の入れ替え：B の黒→端子台 2、B の白＋VVR 白→端子台 1', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'as.1', 'black').b = 'as.2__x';
  W(a, 'jbB', 'as.2', 'white').b = 'as.1';
  W(a, 'as.2', 'ol.W', 'white').a = 'as.1';
  W(a, 'jbB', 'as.2__x', 'black').b = 'as.2';
})), (st) => ({ note: simAll(st) }));
T('屋外灯の白を端子台 3、黒を端子台 2 から取る（接点の出口が接地側へ）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'as.2', 'ol.W', 'white').a = 'as.3';
  W(a, 'as.3', 'ol.X', 'black').a = 'as.2';
  // 取り違えでも 2 に白を2本入れる形にしたいので、端子は VVR の色で入れ替えるだけ
})), (st) => ({ note: simAll(st) }));
T('自動点滅器の 2（白・CdS 回路の接地側）の欠落：B→端子台2 の白を結線しない（B の白は3本）', 'fail', () => answerState(P0, mutate(a => {
  dropWire(a, 'jbB', 'as.2', 'white');
  Bjb(a, 'jbB', '接地側').wires = ['jbA|jbB:white', 'jbB|lamp.W', 'jbB|oe.W'];
})), (st) => ({ note: simAll(st) }));
T('屋外灯の白を B から直接取る（端子台 2 は B からの白1本だけ。配線図に無い B→屋外灯）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'as.2', 'ol.W', 'white').a = 'jbB';
  Bjb(a, 'jbB', '接地側').wires = ['jbA|jbB:white', 'jbB|lamp.W', 'jbB|oe.W', 'jbB|as.2', 'jbB|ol.W'];
})), (st) => ({ note: simAll(st) }));
T('接地線（緑）の欠落', 'fail', () => answerState(P0, mutate(a => {
  dropWire(a, 'oe.E', 'ed.E', 'green');
})));
T('接地線を白で（IV 緑の区間に白）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'oe.E', 'ed.E', 'green').color = 'white';
})));
T('接地線をコンセントの W 端子から取る（接地極端子は空き）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'oe.E', 'ed.E', 'green').a = 'oe.W';
})));
T('コンセントの W に黒・非接地側に白（白を指定端子以外に）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'oe.W', 'white').b = 'oe.L__x';
  W(a, 'jbB', 'oe.L', 'black').b = 'oe.W';
  W(a, 'jbB', 'oe.L__x', 'white').b = 'oe.L';
})), (st) => ({ note: simAll(st) }));
T('ランプレセプタクルの受金ねじ部に黒（帰り）・中心接触片に白', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'lamp.W', 'white').b = 'lamp.X__x';
  W(a, 'jbB', 'lamp.X', 'black').b = 'lamp.W';
  W(a, 'jbB', 'lamp.X__x', 'white').b = 'lamp.X';
})));
T('B でランプの黒を非接地側の束へ（黒4本＝4本用、3C 赤は B でどこにもつながない＝ランプ常時点灯）', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbB', '非接地側').wires = ['jbA|jbB:black', 'jbB|oe.L', 'jbB|as.1', 'jbB|lamp.X'];
  a.bundles = a.bundles.filter(b => !(b.jb === 'jbB' && b.label.indexOf('イの帰り') >= 0));
})), (st) => ({ note: simAll(st) }));
T('B で帰り線（赤＋ランプ黒）を非接地側の束に合体（5本＝4本用超え・イが効かない）', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbB', '非接地側').wires = ['jbA|jbB:black', 'jbB|oe.L', 'jbB|as.1', 'jbA|jbB:red', 'jbB|lamp.X'];
  a.bundles = a.bundles.filter(b => !(b.jb === 'jbB' && b.label.indexOf('イの帰り') >= 0));
})), (st) => ({ note: simAll(st) + ' / ' + joinInfo(st) }));
T('3C の色の役割替え：3C 黒をイの帰り、3C 赤を非接地側に（非接地側は黒の条件違反）', 'fail', () => answerState(P0, mutate(a => {
  a.bundles.forEach(b => { b.wires = b.wires.map(x => x === 'jbA|jbB:red' ? 'jbA|jbB:black' : x === 'jbA|jbB:black' ? 'jbA|jbB:red' : x); });
})), (st) => ({ note: simAll(st) }));
T('点滅器イへの2C：白を非接地側の束へ、黒を帰りの束へ（非接地側に白）', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbA', '非接地側').wires = ['src.L|jbA', 'jbA|swI.L', 'jbA|jbB:black'];
  Bjb(a, 'jbA', 'イの帰り').wires = ['jbA|swI.C', 'jbA|jbB:red'];
})));
T('コンセントを帰り線につなぐ（B の帰りの束に oe.L＝点滅器で入切）', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbB', '非接地側').wires = ['jbA|jbB:black', 'jbB|as.1'];
  Bjb(a, 'jbB', 'イの帰り').wires = ['jbA|jbB:red', 'jbB|lamp.X', 'jbB|oe.L'];
})), (st) => ({ note: simAll(st) }));
T('ケーブルの取り違え：A–B に VVF1.6-2C（3C を使わない）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'A-B#0', { type: 'vvf16-2c' });
}));
T('ケーブルの取り違え：電源–A に VVF1.6-2C（2.0 を使わない）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'src-A#0', { type: 'vvf16-2c' });
}), (st) => ({ note: joinInfo(st) }));
T('ケーブルの取り違え：屋外灯へ VVF1.6-2C（平形。VVR 丸形でない。長さは 250mm で支給内）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'as-ol#0', { type: 'vvf16-2c' });
}));
T('ケーブルの取り違え：B–自動点滅器に VVR1.6-2C（300mm。VVR 支給 250mm も超える）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'B-as#0', { type: 'vvr16-2c' });
}));
T('切断寸法の誤り：B–自動点滅器を 250mm（図の 200mm＋両端50 で 300mm が正しい）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'B-as#0', { len: 250 });
}));
T('切断寸法の誤り：VVR を 200mm（図の寸法のまま。端子台側は結線するので 250mm）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'as-ol#0', { len: 200 });
}));
T('切断寸法の誤り：接地線を 200mm（ED 側は切りっぱなしで 150mm、支給 150mm も超える）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'oe-ed#0', { len: 200 });
}));
T('支給超過の切断：VVF1.6-2C を余分に 400mm 切る（合計 1450mm＞支給 1400mm）', 'fail', () => answerState(P0, null, st => {
  st.pieces.push({ id: 'extra1', type: 'vvf16-2c', len: 400 });
}));
T('A で黒3本の接続点を作らず、点滅器イの黒を白の束へ（短絡ではなく非接地側欠落）', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbA', '非接地側').wires = ['src.L|jbA', 'jbA|jbB:black'];
  Bjb(a, 'jbA', '接地側').wires = ['src.N|jbA', 'jbA|jbB:white', 'jbA|swI.C'];
})), (st) => ({ note: simAll(st) }));
T('B の白5本を1つの接続点（屋外灯白を B から＋4本用コネクタ超え）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'as.2', 'ol.W', 'white').a = 'jbB';
  Bjb(a, 'jbB', '接地側').wires.push('jbB|ol.W');
})), (st) => ({ note: joinInfo(st) }));
T('B の黒の束に端子台 1 を入れ忘れ（1 が未接続＝屋外灯が点かない）', 'fail', () => answerState(P0, mutate(a => {
  dropWire(a, 'jbB', 'as.1', 'black');
  Bjb(a, 'jbB', '非接地側').wires = ['jbA|jbB:black', 'jbB|oe.L'];
})), (st) => ({ note: simAll(st) }));

/* ===== 実行 ===== */
const results = [];
cases.forEach(c => {
  let st, g, err = null, extra = {};
  try {
    st = c.build();
    g = Engine.grade(P0, st);
    if (c.extra) extra = c.extra(st, g) || {};
  } catch (e) { err = e; }
  const passed = !!(g && g.passed);
  let ok = !err && (c.expected === 'pass' ? passed : !passed);
  if (extra.ok === false) ok = false;
  const bads = g ? g.issues.filter(x => x.level === 'bad').map(x => x.msg.replace(/<[^>]+>/g, '')) : [];
  const warns = g ? g.issues.filter(x => x.level === 'warn').map(x => x.msg.replace(/<[^>]+>/g, '')) : [];
  results.push({ desc: c.desc, expected: c.expected, passed, ok, score: g ? g.score : -1, bads, warns, note: extra.note || '', err: err ? String(err) : null });
  console.log(`${ok ? 'OK ' : 'NG '} [期待 ${c.expected}] 実際 ${passed ? '合格' : '不合格'} ${g ? g.score + '点' : 'ERR'}  ${c.desc}`);
  if (err) console.log('    例外:', err.message);
  bads.slice(0, 5).forEach(m => console.log('    欠陥:', m));
  warns.slice(0, 3).forEach(m => console.log('    注意:', m));
  if (extra.note) console.log('    ', extra.note);
});
const ng = results.filter(r => !r.ok).length;
console.log(`\n${results.length}例中 期待どおり ${results.length - ng}／期待と違う ${ng}`);
