#!/usr/bin/env node
/* No.12 採点エンジンの検証（合格にすべき例・不合格にすべき例） */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
global.window = {};
require(path.join(ROOT, 'js/problems.js'));
require(path.join(ROOT, 'js/problems/no12.js'));
require(path.join(ROOT, 'js/engine.js'));
const Engine = window.Engine, CABLES = window.CABLE_TYPES;
const P0 = window.PROBLEMS.find(p => p.id === 'no12');
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
/* 端点と（任意で）色で模範解答の wire を探す */
const W = (ans, a, b, color) => {
  const w = ans.wires.find(w => ((w.a === a && w.b === b) || (w.a === b && w.b === a)) && (!color || w.color === color));
  if (!w) throw new Error(`wire なし ${a}|${b}:${color || ''}`);
  return w;
};
const B = (ans, label) => { const b = ans.bundles.find(x => x.label.indexOf(label) >= 0); if (!b) throw new Error('束なし ' + label); return b; };
const Bjb = (ans, jb, label) => { const b = ans.bundles.find(x => x.jb === jb && x.label.indexOf(label) >= 0); if (!b) throw new Error('束なし ' + jb + label); return b; };
const setPiece = (st, slot, patch) => Object.assign(st.pieces.find(p => p.id === st.cables[slot]), patch);

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
const joinInfo = (st) => st.bundles.map(b => { const i = Engine.bundleInfo(P0, st, b); return b.jb + '=' + (i.method === 'connector' ? 'コネクタ' + i.count : i.sleeve + '/' + i.mark); }).join(',');
const simCheck = (st) => { const s = simAll(st); return { note: s, ok: s === EXPECT_SIM }; };

const cases = [];
const T = (desc, expected, build, extra) => cases.push({ desc, expected, build, extra });

/* ===== 合格にすべき例 ===== */
T('模範解答そのまま（解答の概念図・複線図の形）＋全スイッチ状態の点灯＋接続材料', 'pass', () => answerState(P0), (st) => {
  const s = simAll(st), j = joinInfo(st);
  const okJ = j === 'jbB=小/小,jbB=小/小,jbB=小/○,jbB=小/○,jbA=コネクタ3,jbA=コネクタ2,jbA=コネクタ2';
  return { note: s + ' / ' + j, ok: s === EXPECT_SIM && okJ };
});
T('公式の別解（解答「正解の例」）：IV黒→コンセント非接地側、わたり線 oc.L→swRo.C', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'swRo.C').b = 'oc.L';
  const j = W(a, 'swRo.C', 'oc.L', 'black'); j.a = 'oc.L'; j.b = 'swRo.C';
  B(a, '非接地側（黒）3本').wires = ['src.L|jbB', 'jbB|swI.C', 'jbB|oc.L'];
})), simCheck);
T('3Cの赤・黒の割り当て（イ／ロ）入れ替え：3C黒＝ロの帰り、3C赤＝イの帰り', 'pass', () => answerState(P0, mutate(a => {
  const r = W(a, 'jbA', 'jbB', 'red'), k = W(a, 'jbA', 'jbB', 'black');
  r.color = 'black'; k.color = 'red';
  a.bundles.forEach(b => { b.wires = b.wires.map(x => x === 'jbA|jbB:red' ? 'jbA|jbB:black' : x === 'jbA|jbB:black' ? 'jbA|jbB:red' : x); });
})), simCheck);
T('スイッチイの端子入れ替え（極性なし）：黒→負荷側表示の端子、白（帰り）→電源側表示の端子', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'swI.C', 'black').b = 'swI.L';
  W(a, 'jbB', 'swI.L', 'white').b = 'swI.C';
  B(a, '非接地側（黒）3本').wires = ['src.L|jbB', 'jbB|swI.L', 'jbB|swRo.C'];
  B(a, 'イの帰り 2本').wires = ['jbB|swI.C', 'jbA|jbB:black'];
})), simCheck);
T('スイッチロの端子入れ替え（極性なし）：IV黒＋わたり線→swRo.L、IV赤→swRo.C', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'swRo.C', 'black').b = 'swRo.L__x';
  W(a, 'jbB', 'swRo.L', 'red').b = 'swRo.C';
  W(a, 'jbB', 'swRo.L__x', 'black').b = 'swRo.L';
  W(a, 'swRo.C', 'oc.L', 'black').a = 'swRo.L';
  B(a, '非接地側（黒）3本').wires = ['src.L|jbB', 'jbB|swI.C', 'jbB|swRo.L'];
  B(a, 'ロの帰り 2本').wires = ['jbB|swRo.C', 'jbA|jbB:red'];
})), simCheck);
T('公式の別解＋スイッチロの端子入れ替え：IV黒→oc.L、わたり oc.L→swRo.L、IV赤→swRo.C', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'swRo.C', 'black').b = 'oc.L';
  W(a, 'jbB', 'swRo.L', 'red').b = 'swRo.C';
  const j = W(a, 'swRo.C', 'oc.L', 'black'); j.a = 'oc.L'; j.b = 'swRo.L';
  B(a, '非接地側（黒）3本').wires = ['src.L|jbB', 'jbB|swI.C', 'jbB|oc.L'];
  B(a, 'ロの帰り 2本').wires = ['jbB|swRo.C', 'jbA|jbB:red'];
})), simCheck);
T('PF16 の中の IV の置き順（置き場0＝黒・1＝白・2＝赤）', 'pass', () => answerState(P0, null, st => {
  setPiece(st, 'B-frame#0', { type: 'iv16-black' });
  setPiece(st, 'B-frame#1', { type: 'iv16-white' });
  setPiece(st, 'B-frame#2', { type: 'iv16-red' });
}), simCheck);
T('接続点の順番・接続点内の線の並び・電線の登録順を逆にする', 'pass', () => {
  const st = answerState(P0);
  st.bundles.reverse(); st.bundles.forEach(b => b.ends.reverse()); st.wires.reverse();
  return st;
}, simCheck);
T('わたり線の向き（a/b）を逆に登録', 'pass', () => answerState(P0, mutate(a => {
  const j = W(a, 'swRo.C', 'oc.L', 'black'); j.a = 'oc.L'; j.b = 'swRo.C';
})), simCheck);

/* ===== 不合格にすべき例 ===== */
T('電源の色の取り違え：N に黒・L に白（B 側の接続は模範どおり）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'src.N', 'jbB', 'white').color = 'black';
  W(a, 'src.L', 'jbB', 'black').color = 'white';
  B(a, '接地側（白）3本').wires[0] = 'src.N|jbB';
  B(a, '非接地側（黒）3本').wires[0] = 'src.L|jbB';
})));
T('接地側・非接地側の取り違え：電源の白を B の黒の束へ、黒を白の束へ', 'fail', () => answerState(P0, mutate(a => {
  B(a, '接地側（白）3本').wires[0] = 'src.L|jbB';
  B(a, '非接地側（黒）3本').wires[0] = 'src.N|jbB';
})), (st) => ({ note: simAll(st) }));
T('帰り線の取り違え（B）：スイッチイの帰りを3C赤（ロの経路）に、スイッチロの帰りを3C黒に', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'ロの帰り 2本').wires = ['jbB|swRo.L', 'jbA|jbB:black'];
  B(a, 'イの帰り 2本').wires = ['jbB|swI.L', 'jbA|jbB:red'];
})), (st) => ({ note: simAll(st) }));
T('帰り線の取り違え（A）：3C赤→引掛シーリング、3C黒→ランプレセプタクル', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbA', 'ロの帰り').wires = ['jbA|jbB:red', 'jbA|ceil.X'];
  Bjb(a, 'jbA', 'イの帰り').wires = ['jbA|jbB:black', 'jbA|lamp.X'];
})), (st) => ({ note: simAll(st) }));
T('ランプレセプタクルの受金ねじ部に黒（帰り）・中心接触片に白', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbA', 'lamp.W', 'white').b = 'lamp.X';
  W(a, 'jbA', 'lamp.X', 'black').b = 'lamp.W';
  Bjb(a, 'jbA', '接地側').wires = ['jbA|jbB:white', 'jbA|lamp.X:white', 'jbA|ceil.W'];
  Bjb(a, 'jbA', 'ロの帰り').wires = ['jbA|jbB:red', 'jbA|lamp.W:black'];
})));
T('引掛シーリングの接地側極端子に黒・非接地側に白', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbA', 'ceil.W', 'white').b = 'ceil.X';
  W(a, 'jbA', 'ceil.X', 'black').b = 'ceil.W';
  Bjb(a, 'jbA', '接地側').wires = ['jbA|jbB:white', 'jbA|lamp.W', 'jbA|ceil.X:white'];
  Bjb(a, 'jbA', 'イの帰り').wires = ['jbA|jbB:black', 'jbA|ceil.W:black'];
})));
T('コンセントの W にわたり線（黒）・非接地側に IV白', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'oc.W', 'white').b = 'oc.L';
  W(a, 'swRo.C', 'oc.L', 'black').b = 'oc.W';
  B(a, '接地側（白）3本').wires = ['src.N|jbB', 'jbA|jbB:white', 'jbB|oc.L'];
})));
T('わたり線をスイッチロの負荷側から取る（コンセントが点滅する）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'swRo.C', 'oc.L', 'black').a = 'swRo.L';
})), (st) => ({ note: simAll(st) }));
T('わたり線を白にする（非接地側は黒）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'swRo.C', 'oc.L', 'black').color = 'white';
})));
T('わたり線を忘れる（コンセント非接地側が未接続）', 'fail', () => answerState(P0, mutate(a => {
  a.wires = a.wires.filter(w => !(w.a === 'swRo.C' && w.b === 'oc.L'));
})));
T('3C の白を帰り線（イ）に、黒を接地側に（接続点は同じ位置）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbA', 'jbB', 'white').color = 'TMP';
  W(a, 'jbA', 'jbB', 'black').color = 'white';
  W(a, 'jbA', 'jbB', 'TMP').color = 'black';
  // 束は線の役割どおり（接地側束に黒、イの帰り束に白）
  a.bundles.forEach(b => { b.wires = b.wires.map(x => x === 'jbA|jbB:white' ? 'jbA|jbB:black' : x === 'jbA|jbB:black' ? 'jbA|jbB:white' : x); });
})));
T('スイッチイ：2C の白を B の黒（非接地側）の束へ、黒を帰りの束へ', 'fail', () => answerState(P0, mutate(a => {
  B(a, '非接地側（黒）3本').wires = ['src.L|jbB', 'jbB|swI.L', 'jbB|swRo.C'];
  B(a, 'イの帰り 2本').wires = ['jbB|swI.C', 'jbA|jbB:black'];
})));
T('PF16 内の IV：赤をスイッチロの電源側、黒を帰り線に（非接地側は黒）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'swRo.C', 'black').color = 'TMP';
  W(a, 'jbB', 'swRo.L', 'red').color = 'black';
  W(a, 'jbB', 'swRo.C', 'TMP').color = 'red';
})));
T('PF16 内の IV：白をスイッチロの帰り、赤をコンセント W へ', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'swRo.L', 'red').color = 'white';
  W(a, 'jbB', 'oc.W', 'white').color = 'red';
  B(a, '接地側（白）3本').wires = ['src.N|jbB', 'jbA|jbB:white', 'jbB|oc.W'];
  B(a, 'ロの帰り 2本').wires = ['jbB|swRo.L', 'jbA|jbB:red'];
})));
T('B で帰り線2本（イ・ロ）を1つの接続点にまとめる', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'ロの帰り 2本').wires = ['jbB|swRo.L', 'jbA|jbB:red', 'jbB|swI.L', 'jbA|jbB:black'];
  a.bundles = a.bundles.filter(b => b.label.indexOf('イの帰り 2本') < 0);
})), (st) => ({ note: simAll(st) + ' / ' + joinInfo(st) }));
T('A で帰り線4本を1つの4本用コネクタにまとめる', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbA', 'ロの帰り').wires = ['jbA|jbB:red', 'jbA|lamp.X', 'jbA|jbB:black', 'jbA|ceil.X'];
  a.bundles = a.bundles.filter(b => !(b.jb === 'jbA' && b.label.indexOf('イの帰り') >= 0));
})), (st) => ({ note: simAll(st) }));
T('A でランプの帰り線を接続し忘れ（1本だけの接続点）', 'fail', () => answerState(P0, mutate(a => {
  Bjb(a, 'jbA', 'ロの帰り').wires = ['jbA|jbB:red'];
})));
T('B で帰り線（イ）を接地側の束に入れる（イを入れると短絡）', 'fail', () => answerState(P0, mutate(a => {
  B(a, '接地側（白）3本').wires = ['src.N|jbB', 'jbA|jbB:white', 'jbB|oc.W', 'jbB|swI.L'];
  B(a, 'イの帰り 2本').wires = ['jbA|jbB:black'];
})));
T('ケーブルの取り違え：A–B に VVF1.6-2C（3C を使わない）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'A-B#0', { type: 'vvf16-2c' });
}));
T('ケーブルの取り違え：電源–B に VVF1.6-2C（2.0 を使わない）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'src-B#0', { type: 'vvf16-2c' });
}), (st) => ({ note: joinInfo(st) }));
T('ケーブルの取り違え：B–スイッチイに VVF1.6-3C', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'B-swI#0', { type: 'vvf16-3c' });
}));
T('ケーブルの取り違え：PF16 内に VVF1.6-3C を1本（IV でない）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'B-frame#0', { type: 'vvf16-3c' });
}));
T('PF16 内に IV黒を2本・赤なし', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'B-frame#0', { type: 'iv16-black' });
}));
T('切断寸法の誤り：IV白を 200mm（図の寸法のまま、正しくは 300mm）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'B-frame#2', { len: 200 });
}));
T('切断寸法の誤り：電源–B を 250mm（電源側は切りっぱなし、正しくは 200mm）', 'fail', () => answerState(P0, null, st => {
  setPiece(st, 'src-B#0', { len: 250 });
}));
T('支給超過の切断：VVF1.6-2C を余分に 300mm 切る（合計 1050mm＞支給 1000mm、区間には置かない）', 'fail', () => answerState(P0, null, st => {
  st.pieces.push({ id: 'extra1', type: 'vvf16-2c', len: 300 });
}));
T('配線図に無い区間：電源 L からコンセントへ直接（B を経由しない）', 'fail', () => answerState(P0, mutate(a => {
  a.wires.push({ a: 'src.L', b: 'oc.L', color: 'black' });
  a.wires = a.wires.filter(w => !(w.a === 'swRo.C' && w.b === 'oc.L'));
})));
T('A に非接地側を送る形：3C黒を B の黒の束へ、A でイの帰り（シーリング）とつなぐ（常時点灯）', 'fail', () => answerState(P0, mutate(a => {
  B(a, '非接地側（黒）3本').wires = ['src.L|jbB', 'jbB|swI.C', 'jbB|swRo.C', 'jbA|jbB:black'];
  B(a, 'イの帰り 2本').wires = ['jbB|swI.L'];
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
  bads.slice(0, 4).forEach(m => console.log('    欠陥:', m));
  warns.slice(0, 3).forEach(m => console.log('    注意:', m));
  if (extra.note) console.log('    ', extra.note);
});
const ng = results.filter(r => !r.ok).length;
console.log(`\n${results.length}例中 期待どおり ${results.length - ng}／期待と違う ${ng}`);
