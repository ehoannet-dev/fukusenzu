#!/usr/bin/env node
/* No.11 採点エンジンの検証（合格にすべき例・不合格にすべき例） */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
global.window = {};
require(path.join(ROOT, 'js/problems.js'));
require(path.join(ROOT, 'js/problems/no11.js'));
require(path.join(ROOT, 'js/engine.js'));
const Engine = window.Engine, CABLES = window.CABLE_TYPES;
const P0 = window.PROBLEMS.find(p => p.id === 'no11');
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
const B = (ans, label) => { const b = ans.bundles.find(x => x.label.indexOf(label) >= 0); if (!b) throw new Error('束なし ' + label); return b; };
const setPiece = (st, slot, patch) => Object.assign(st.pieces.find(p => p.id === st.cables[slot]), patch);
const repl = (b, from, to) => { const i = b.wires.indexOf(from); if (i < 0) throw new Error('束に無い ' + from); b.wires[i] = to; };

/* 通電試験：スイッチ全状態（イ・ロ 2^2） */
function simAll(st) {
  const out = [];
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, r]) => {
    const s = Engine.simulate(P0, st, { swI: !!i, swRo: !!r });
    out.push(`イ${i}ロ${r}:ceil${s.lit.ceil ? 1 : 0}lamp${s.lit.lamp ? 1 : 0}oc${s.lit.oc ? 1 : 0}${s.shorted ? 'SHORT' : ''}`);
  });
  return out.join(' ');
}
const EXPECT_SIM = 'イ0ロ0:ceil0lamp0oc1 イ1ロ0:ceil1lamp0oc1 イ0ロ1:ceil0lamp1oc1 イ1ロ1:ceil1lamp1oc1';
const joinInfo = (st) => st.bundles.map(b => { const i = Engine.bundleInfo(P0, st, b); return (i.method === 'connector' ? 'コネクタ' + i.count : i.sleeve + '/' + i.mark); }).sort().join(',');
const EXPECT_JOIN = 'コネクタ2,コネクタ2,中/中,小/小';
const simCheck = (st) => { const s = simAll(st), j = joinInfo(st); return { note: s + ' / ' + j, ok: s === EXPECT_SIM && j === EXPECT_JOIN }; };
const noteSim = (st) => ({ note: simAll(st) + ' / ' + joinInfo(st) });

const cases = [];
const T = (desc, expected, build, extra) => cases.push({ desc, expected, build, extra });

/* ===== 合格にすべき例 ===== */
T('模範解答そのまま（IV黒→コンセント、わたり線 oc.L→swI.C）＋全スイッチ状態の点灯＋接続材料（白＝中/中・黒＝小/小・帰り＝コネクタ2×2）', 'pass', () => answerState(P0), simCheck);
T('公式解答の形（answerWiresAlternative）：IV黒→点滅器イ、わたり線 swI.C→oc.L', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jb', 'oc.L', 'black').b = 'swI.C';
  repl(B(a, '非接地側（黒）3本'), 'jb|oc.L', 'jb|swI.C');
})), simCheck);
T('点滅器イの端子入れ替え（極性なし）：わたり線→swI.L、IV赤（帰り）→swI.C', 'pass', () => answerState(P0, mutate(a => {
  const j = W(a, 'oc.L', 'swI.C', 'black'); j.b = 'swI.L';
  W(a, 'jb', 'swI.L', 'red').b = 'swI.C';
  repl(B(a, 'イの帰り'), 'jb|swI.L', 'jb|swI.C');
})), simCheck);
T('公式解答の形＋点滅器イの端子入れ替え：IV黒→swI.L、わたり swI.L→oc.L、IV赤→swI.C', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jb', 'swI.L', 'red').b = 'swI.C';
  W(a, 'jb', 'oc.L', 'black').b = 'swI.L';
  const j = W(a, 'oc.L', 'swI.C', 'black'); j.a = 'swI.L'; j.b = 'oc.L';
  repl(B(a, '非接地側（黒）3本'), 'jb|oc.L', 'jb|swI.L');
  repl(B(a, 'イの帰り'), 'jb|swI.L', 'jb|swI.C');
})), simCheck);
T('点滅器ロの端子入れ替え（極性なし）：2C黒→swRo.L、2C白（帰り）→swRo.C', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jb', 'swRo.C', 'black').b = 'swRo.L__x';
  W(a, 'jb', 'swRo.L', 'white').b = 'swRo.C';
  W(a, 'jb', 'swRo.L__x', 'black').b = 'swRo.L';
  repl(B(a, '非接地側（黒）3本'), 'jb|swRo.C', 'jb|swRo.L');
  repl(B(a, 'ロの帰り'), 'jb|swRo.L', 'jb|swRo.C');
})), simCheck);
T('E19 の中の IV の置き場の順（置き場0＝赤・1＝黒・2＝白）', 'pass', () => answerState(P0, null, st => {
  setPiece(st, 'jb-frame#0', { type: 'iv16-red' });
  setPiece(st, 'jb-frame#1', { type: 'iv16-black' });
  setPiece(st, 'jb-frame#2', { type: 'iv16-white' });
}), simCheck);
T('接続点の順番・接続点内の線の並び・電線の登録順を逆にする', 'pass', () => {
  const st = answerState(P0);
  st.bundles.reverse(); st.bundles.forEach(b => b.ends.reverse()); st.wires.reverse();
  return st;
}, simCheck);
T('わたり線の向き（a/b）を逆に登録（swI.C→oc.L）', 'pass', () => answerState(P0, mutate(a => {
  const j = W(a, 'oc.L', 'swI.C', 'black'); j.a = 'swI.C'; j.b = 'oc.L';
})), simCheck);
T('全部入り：公式解答の形＋イ・ロ両方の端子入れ替え', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jb', 'swI.L', 'red').b = 'swI.C';
  W(a, 'jb', 'oc.L', 'black').b = 'swI.L';
  const j = W(a, 'oc.L', 'swI.C', 'black'); j.a = 'swI.L'; j.b = 'oc.L';
  W(a, 'jb', 'swRo.C', 'black').b = 'swRo.L__x';
  W(a, 'jb', 'swRo.L', 'white').b = 'swRo.C';
  W(a, 'jb', 'swRo.L__x', 'black').b = 'swRo.L';
  repl(B(a, '非接地側（黒）3本'), 'jb|oc.L', 'jb|swI.L');
  repl(B(a, '非接地側（黒）3本'), 'jb|swRo.C', 'jb|swRo.L');
  repl(B(a, 'イの帰り'), 'jb|swI.L', 'jb|swI.C');
  repl(B(a, 'ロの帰り'), 'jb|swRo.L', 'jb|swRo.C');
})), simCheck);
T('VVF1.6-2C の切り分け順を変える（ピースの登録順を逆に）', 'pass', () => answerState(P0, null, st => { st.pieces.reverse(); }), simCheck);

/* ===== 不合格にすべき例 ===== */
T('電源の色の取り違え：N に黒・L に白（接続点は模範どおり）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'src.N', 'jb', 'white').color = 'black';
  W(a, 'src.L', 'jb', 'black').color = 'white';
})));
T('接地側・非接地側の取り違え：電源の白を黒の束へ、黒を白の束へ', 'fail', () => answerState(P0, mutate(a => {
  repl(B(a, '接地側（白）4本'), 'src.N|jb', 'src.L|jb');
  repl(B(a, '非接地側（黒）3本'), 'src.L|jb', 'src.N|jb');
})), noteSim);
T('帰り線の取り違え：イの帰り（IV赤）→ランプの帰り、ロの帰り（2C白）→シーリングの帰り', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'イの帰り').wires = ['jb|ceil.X', 'jb|swRo.L'];
  B(a, 'ロの帰り').wires = ['jb|lamp.X', 'jb|swI.L'];
})), noteSim);
T('ランプレセプタクルの受金ねじ部に黒（帰り）・中心接点に白', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jb', 'lamp.W', 'white').b = 'lamp.X__x';
  W(a, 'jb', 'lamp.X', 'black').b = 'lamp.W';
  W(a, 'jb', 'lamp.X__x', 'white').b = 'lamp.X';
  repl(B(a, '接地側（白）4本'), 'jb|lamp.W', 'jb|lamp.X:white');
  repl(B(a, 'ロの帰り'), 'jb|lamp.X', 'jb|lamp.W:black');
})));
T('引掛シーリングの接地側極端子に黒・非接地側に白', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jb', 'ceil.W', 'white').b = 'ceil.X__x';
  W(a, 'jb', 'ceil.X', 'black').b = 'ceil.W';
  W(a, 'jb', 'ceil.X__x', 'white').b = 'ceil.X';
  repl(B(a, '接地側（白）4本'), 'jb|ceil.W', 'jb|ceil.X:white');
  repl(B(a, 'イの帰り'), 'jb|ceil.X', 'jb|ceil.W:black');
})));
T('コンセントの W に IV黒＋わたり線、非接地側に IV白', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jb', 'oc.W', 'white').b = 'oc.L__x';
  W(a, 'jb', 'oc.L', 'black').b = 'oc.W';
  W(a, 'jb', 'oc.L__x', 'white').b = 'oc.L';
  W(a, 'oc.L', 'swI.C', 'black').a = 'oc.W';
  repl(B(a, '接地側（白）4本'), 'jb|oc.W', 'jb|oc.L:white');
  repl(B(a, '非接地側（黒）3本'), 'jb|oc.L', 'jb|oc.W:black');
})));
T('わたり線を点滅器イの負荷側から取る（コンセントがイで点滅）', 'fail', () => answerState(P0, mutate(a => {
  // IV黒→swI.C（公式形）、わたり線を swI.L（帰り側）→oc.L
  W(a, 'jb', 'oc.L', 'black').b = 'swI.C';
  repl(B(a, '非接地側（黒）3本'), 'jb|oc.L', 'jb|swI.C');
  const j = W(a, 'oc.L', 'swI.C', 'black'); j.a = 'swI.L'; j.b = 'oc.L';
})), noteSim);
T('わたり線を白にする', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'oc.L', 'swI.C', 'black').color = 'white';
})));
T('わたり線を忘れる（点滅器イの電源側が未接続）', 'fail', () => answerState(P0, mutate(a => {
  a.wires = a.wires.filter(w => !(w.a === 'oc.L' && w.b === 'swI.C'));
})), noteSim);
T('E19 の IV：赤を非接地側（コンセントへ）、黒をイの帰り線に', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jb', 'oc.L', 'black').color = 'TMP';
  W(a, 'jb', 'swI.L', 'red').color = 'black';
  W(a, 'jb', 'oc.L', 'TMP').color = 'red';
})));
T('E19 の IV：白をイの帰り線、赤をコンセント W へ', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jb', 'swI.L', 'red').color = 'white';
  W(a, 'jb', 'oc.W', 'white').color = 'red';
})));
T('点滅器ロ：2C白を非接地側（黒の束）、2C黒を帰り線に', 'fail', () => answerState(P0, mutate(a => {
  repl(B(a, '非接地側（黒）3本'), 'jb|swRo.C', 'jb|swRo.L');
  repl(B(a, 'ロの帰り'), 'jb|swRo.L', 'jb|swRo.C');
})));
T('帰り線2組（イ・ロ）を1つの4本用コネクタにまとめる（同時点滅）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'イの帰り').wires = ['jb|ceil.X', 'jb|swI.L', 'jb|lamp.X', 'jb|swRo.L'];
  a.bundles = a.bundles.filter(b => b.label.indexOf('ロの帰り') < 0);
})), noteSim);
T('常時点灯：イの帰り（IV赤）と引掛シーリングの黒を黒の束に入れる（スイッチを短絡）', 'fail', () => answerState(P0, mutate(a => {
  B(a, '非接地側（黒）3本').wires.push('jb|ceil.X', 'jb|swI.L');
  a.bundles = a.bundles.filter(b => b.label.indexOf('イの帰り') < 0);
})), noteSim);
T('点滅器イを接地側に入れる：シーリングの黒を黒の束へ、シーリングの白をイの帰りへ', 'fail', () => answerState(P0, mutate(a => {
  B(a, '非接地側（黒）3本').wires.push('jb|ceil.X');
  B(a, '接地側（白）4本').wires = B(a, '接地側（白）4本').wires.filter(x => x !== 'jb|ceil.W');
  B(a, 'イの帰り').wires = ['jb|ceil.W', 'jb|swI.L'];
})), noteSim);
T('ランプの帰りの接続を忘れる（1本だけの接続点）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'ロの帰り').wires = ['jb|swRo.L'];
})));
T('白の接続点を2つに分ける（電源白＋シーリング／ランプ＋コンセント）', 'fail', () => answerState(P0, mutate(a => {
  B(a, '接地側（白）4本').wires = ['src.N|jb', 'jb|ceil.W'];
  a.bundles.push({ jb: 'jb', wires: ['jb|lamp.W', 'jb|oc.W'], label: '白その2' });
})), noteSim);
T('配線図に無い区間：電源 L からコンセントへ直接（ボックスを経由しない）', 'fail', () => answerState(P0, mutate(a => {
  const w = W(a, 'jb', 'oc.L', 'black'); w.a = 'src.L'; w.b = 'oc.L';
  B(a, '非接地側（黒）3本').wires = ['src.L|jb', 'jb|swRo.C'];
})));
T('ケーブルの取り違え：電源–ボックスに VVF1.6-2C（2.0 を使わない）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'src-jb#0', { type: 'vvf16-2c' });
}), noteSim);
T('ケーブルの取り違え：ボックス–点滅器ロに VVF1.6-3C（支給外）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'jb-swRo#0', { type: 'vvf16-3c' });
}));
T('ケーブルの取り違え：E19 の中に VVF1.6-2C を1本（IV でない）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'jb-frame#2', { type: 'vvf16-2c' });
}));
T('E19 の中に IV黒を2本・赤なし', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'jb-frame#2', { type: 'iv16-black' });
}));
T('切断寸法の誤り：ボックス–引掛シーリングを 200mm（正しくは 150＋50＋50＝250mm）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'jb-ceil#0', { len: 200 });
}));
T('切断寸法の誤り：電源–ボックスを 250mm（電源側は切りっぱなし、正しくは 200mm）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'src-jb#0', { len: 250 });
}));
T('切断寸法の誤り：IV黒を切らずに 550mm のまま管に通す', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'jb-frame#0', { len: 550 });
}));
T('支給超過の切断：VVF1.6-2C を余分に 300mm 切る（合計 1250mm＞支給 1200mm）', 'fail', () => answerState(P0, null, st => {
  st.pieces.push({ id: 'extra1', type: 'vvf16-2c', len: 300 });
}));
T('支給超過の切断：IV白を余分に 150mm 切る（合計 500mm＞支給 450mm）', 'fail', () => answerState(P0, null, st => {
  st.pieces.push({ id: 'extra2', type: 'iv16-white', len: 150 });
}));

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
  bads.slice(0, 4).forEach(m => console.log('    欠陥:', m));
  warns.slice(0, 3).forEach(m => console.log('    注意:', m));
  if (extra.note) console.log('    ', extra.note);
});
const ng = results.filter(r => !r.ok).length;
console.log(`\n${results.length}例中 期待どおり ${results.length - ng}／期待と違う ${ng}`);
