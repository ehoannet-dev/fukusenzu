#!/usr/bin/env node
/* No.10 採点エンジンの検証（合格にすべき例・不合格にすべき例） */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
global.window = {};
require(path.join(ROOT, 'js/problems.js'));
require(path.join(ROOT, 'js/problems/no10.js'));
require(path.join(ROOT, 'js/engine.js'));
const Engine = window.Engine, CABLES = window.CABLE_TYPES;
const P0 = window.PROBLEMS.find(p => p.id === 'no10');
const clone = (o) => JSON.parse(JSON.stringify(o));
const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });

/* check-problems.js の answerState と同じ（answer を差し替えられるようにした） */
function answerState(problem, answer) {
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
  if (unresolved.length) throw new Error('未解決の接続点: ' + unresolved.join(', '));
  return state;
}

/* 模範解答の wires を id（a|b）で書き換えるヘルパ */
function mutate(fn) {
  const ans = clone(P0.answer);
  fn(ans);
  return ans;
}
const W = (ans, a, b) => ans.wires.find(w => (w.a === a && w.b === b) || (w.a === b && w.b === a));
const B = (ans, label) => ans.bundles.find(x => x.label.indexOf(label) >= 0);

/* 通電試験：スイッチ 切／入 で各器具の点灯を返す */
function sim(state) {
  const off = Engine.simulate(P0, state, { sw: false });
  const on = Engine.simulate(P0, state, { sw: true });
  const pick = (s) => ['ceil', 'lamp', 'pl', 'oc'].map(k => k + ':' + (s.lit[k] ? '1' : '0')).join(' ') + (s.shorted ? ' SHORT' : '');
  return { off: pick(off), on: pick(on) };
}

const cases = [];
const T = (desc, expected, build, extra) => cases.push({ desc, expected, build, extra });

/* ===== 合格にすべき例 ===== */
T('模範解答そのまま（公式「正解の例」）', 'pass', () => answerState(P0), (st, g) => {
  const s = sim(st);
  const okSim = s.off === 'ceil:0 lamp:0 pl:0 oc:1' && s.on === 'ceil:1 lamp:1 pl:1 oc:1';
  const infos = st.bundles.map(b => Engine.bundleInfo(P0, st, b)).map(i => i.method === 'connector' ? 'コネクタ' + i.count : i.sleeve + '/' + i.mark);
  const okSl = infos.join(',') === '中/中,小/小,コネクタ3';
  return { note: `切=${s.off} 入=${s.on} 接続=${infos.join(',')}`, ok: okSim && okSl };
});
T('確認表示灯の上下（左右）入れ替え：白わたり→pl.X、赤（帰り）→pl.W、スイッチ行き→pl.W（極性なし）', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'oc.W', 'pl.W').b = 'pl.X';
  const r = W(a, 'j1', 'pl.X'); r.b = 'pl.W';
  W(a, 'pl.X', 'sw.L').a = 'pl.W';
  B(a, 'イの帰り').wires = ['j1|ceil.X', 'j1|lamp.X', 'j1|pl.W'];
})));
T('片切スイッチの端子の入れ替え：黒わたり→sw.L、帰りわたり→sw.C（極性なし）', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'oc.L', 'sw.C').b = 'sw.L';
  W(a, 'pl.X', 'sw.L').b = 'sw.C';
})));
T('帰りのわたり線（PL→SW）を赤に色替え（色は問わない）', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'pl.X', 'sw.L').color = 'red';
})));
T('帰りのわたり線（PL→SW）を白に色替え（色は問わない＝エンジンは許す）', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'pl.X', 'sw.L').color = 'white';
})));
T('公式の別解：3C黒をスイッチへ直接、黒わたり線 sw.C→oc.L', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'j1', 'oc.L').b = 'sw.C';
  const w = W(a, 'oc.L', 'sw.C'); // わたり（向きはそのまま）
  B(a, '非接地側').wires = ['cb.L|j1', 'j1|sw.C'];
})));
T('公式の別解：3C白をPLへ直接、白わたり線 pl.W→oc.W', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'j1', 'oc.W').b = 'pl.W';
  B(a, '接地側').wires = ['cb.N|j1', 'j1|ceil.W', 'j1|lamp.W', 'j1|pl.W'];
})));
T('公式の別解：3C赤をスイッチの負荷側へ直接、帰りわたり線 sw.L→pl.X', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'j1', 'pl.X').b = 'sw.L';
  B(a, 'イの帰り').wires = ['j1|ceil.X', 'j1|lamp.X', 'j1|sw.L'];
})));
T('J1 の接続点の中の線の並び順・接続点の順番の入れ替え', 'pass', () => {
  const st = answerState(P0);
  st.bundles.reverse(); st.bundles.forEach(b => b.ends.reverse());
  return st;
});
T('電線の登録順（引いた順）を逆にしても同じ', 'pass', () => {
  const st = answerState(P0);
  st.wires.reverse();
  return st;
});

/* ===== 不合格にすべき例 ===== */
T('遮断器の N・L 取り違え（N に黒・L に白、J1 側の接続は模範どおり）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'cb.N', 'j1').color = 'black';
  W(a, 'cb.L', 'j1').color = 'white';
})));
T('遮断器の N・L 取り違え（白を L へ・黒を N へ結線し直す＝接地側系統が L になる）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'cb.N', 'j1').a = 'cb.L__tmp';
  W(a, 'cb.L', 'j1').a = 'cb.N';
  W(a, 'cb.L__tmp', 'j1').a = 'cb.L';
  B(a, '接地側').wires = ['cb.L|j1', 'j1|ceil.W', 'j1|lamp.W', 'j1|oc.W'];
  B(a, '非接地側').wires = ['cb.N|j1', 'j1|oc.L'];
})));
T('確認表示灯を常時点灯の形（スイッチの電源側と接地側の間）', 'fail', () => answerState(P0, mutate(a => {
  // 3C赤はスイッチの負荷側へ直接、PL は sw.C（L）と oc.W（N）の間
  W(a, 'j1', 'pl.X').b = 'sw.L';
  B(a, 'イの帰り').wires = ['j1|ceil.X', 'j1|lamp.X', 'j1|sw.L'];
  const w = W(a, 'pl.X', 'sw.L'); w.a = 'sw.C'; w.b = 'pl.X'; w.color = 'black';
})), (st) => ({ note: JSON.stringify(sim(st)) }));
T('確認表示灯を異時点滅の形（スイッチと並列）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'j1', 'pl.X').b = 'sw.L';
  B(a, 'イの帰り').wires = ['j1|ceil.X', 'j1|lamp.X', 'j1|sw.L'];
  // PL は sw.C と sw.L の間。白わたり（oc.W→pl.W）はやめ、sw.C→pl.W の黒わたり
  const ww = W(a, 'oc.W', 'pl.W'); ww.a = 'sw.C'; ww.b = 'pl.W'; ww.color = 'black';
  // pl.X–sw.L はそのまま
})), (st) => ({ note: JSON.stringify(sim(st)) }));
T('引掛シーリングの帰り線を J1 で非接地側（黒）に入れる（常時点灯）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'イの帰り').wires = ['j1|lamp.X', 'j1|pl.X', 'j1|cb.L__none'].slice(0, 2);
  B(a, '非接地側').wires = ['cb.L|j1', 'j1|oc.L', 'j1|ceil.X'];
})), (st) => ({ note: JSON.stringify(sim(st)) }));
T('引掛シーリングの接地側極端子に黒・非接地側に白（J1 の接続は模範どおりの束）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'j1', 'ceil.W').b = 'ceil.X__w';
  W(a, 'j1', 'ceil.X').b = 'ceil.W';
  W(a, 'j1', 'ceil.X__w').b = 'ceil.X';
  // 束は「白＝接地側」「黒＝帰り」のまま → 接地側束の白が ceil.X、帰り束の黒が ceil.W
  B(a, '接地側').wires = ['cb.N|j1', 'j1|ceil.X', 'j1|lamp.W', 'j1|oc.W'];
  B(a, 'イの帰り').wires = ['j1|ceil.W', 'j1|lamp.X', 'j1|pl.X'];
})));
T('ランプレセプタクルの受金ねじ部に帰り線（黒）・中心に白', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'j1', 'lamp.W').b = 'lamp.X__w';
  W(a, 'j1', 'lamp.X').b = 'lamp.W';
  W(a, 'j1', 'lamp.X__w').b = 'lamp.X';
  B(a, '接地側').wires = ['cb.N|j1', 'j1|ceil.W', 'j1|lamp.X', 'j1|oc.W'];
  B(a, 'イの帰り').wires = ['j1|ceil.X', 'j1|lamp.W', 'j1|pl.X'];
})));
T('コンセントの W に黒・非接地側に白（3C の黒白を入れ替えて結線）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'j1', 'oc.L').b = 'oc.W__x';
  W(a, 'j1', 'oc.W').b = 'oc.L';
  W(a, 'j1', 'oc.W__x').b = 'oc.W';
  B(a, '接地側').wires = ['cb.N|j1', 'j1|ceil.W', 'j1|lamp.W', 'j1|oc.L'];
  B(a, '非接地側').wires = ['cb.L|j1', 'j1|oc.W'];
})));
T('非接地側のわたり線（oc.L→sw.C）を白にする（電源から点滅器までは黒）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'oc.L', 'sw.C').color = 'white';
})));
T('接地側のわたり線（oc.W→pl.W）を黒にする（接地側は白）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'oc.W', 'pl.W').color = 'black';
})));
T('3C の赤を非接地側に使い、黒を帰り線にする（電源から点滅器までは黒）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'j1', 'oc.L').color = 'red';
  W(a, 'j1', 'pl.X').color = 'black';
})));
T('確認表示灯の両端子を帰り線に（PL が点かない）', 'fail', () => answerState(P0, mutate(a => {
  const ww = W(a, 'oc.W', 'pl.W'); ww.a = 'sw.L'; ww.b = 'pl.W'; ww.color = 'black';
})), (st) => ({ note: JSON.stringify(sim(st)) }));
T('J1 で帰り線3本のうち1本（ランプ）を接続し忘れ', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'イの帰り').wires = ['j1|ceil.X', 'j1|pl.X'];
})));
T('J1 で帰り線と接地側を1つにまとめる（スイッチを入れると短絡）', 'fail', () => answerState(P0, mutate(a => {
  B(a, '接地側').wires = ['cb.N|j1', 'j1|ceil.W', 'j1|lamp.W', 'j1|oc.W', 'j1|ceil.X', 'j1|lamp.X', 'j1|pl.X'];
  a.bundles = a.bundles.filter(x => x.label.indexOf('イの帰り') < 0);
})));
T('ケーブルの取り違え：電源 B–J1 に VVF1.6-2C（2.0-2C を使わない）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['cb-j1#0']).type = 'vvf16-2c';
  return st;
}, (st) => ({ note: 'J1接続=' + st.bundles.map(b => { const i = Engine.bundleInfo(P0, st, b); return i.method === 'connector' ? 'コネクタ' + i.count : i.sleeve + '/' + i.mark; }).join(',') }));
T('ケーブルの取り違え：J1–スイッチボックスに VVF1.6-2C（3C を使わない）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['j1-frame#0']).type = 'vvf16-2c';
  return st;
});
T('ケーブルの取り違え：J1–引掛シーリングに VVF1.6-3C', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['j1-ceil#0']).type = 'vvf16-3c';
  return st;
});
T('切断寸法の誤り：J1–ランプレセプタクルを 200mm で切る（正しくは 250mm）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['j1-lamp#0']).len = 200;
  return st;
});
T('支給超過の切断：VVF2.0-2C を 350mm で切る（支給 300mm）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['cb-j1#0']).len = 350;
  return st;
});
T('支給超過の切断：VVF1.6-2C を余分に 250mm 切る（合計 750mm＞支給 650mm、区間には置かない）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.push({ id: 'extra1', type: 'vvf16-2c', len: 250 });
  return st;
});
T('配線図に無い区間：遮断器 L から引掛シーリングへ直接', 'fail', () => answerState(P0, mutate(a => {
  a.wires.push({ a: 'cb.L', b: 'ceil.X', color: 'black' });
})));
T('遮断器の L 端子に2本（最大1本）：L→J1 を2本', 'fail', () => answerState(P0, mutate(a => {
  a.wires.push({ a: 'cb.L', b: 'j1', color: 'black' });
  // 2本目は L 束へ（ケーブルの黒は1本しかない）
  const ws = a.wires.filter(w => w.a === 'cb.L');
  B(a, '非接地側').wires = ['cb.L|j1', 'j1|oc.L'];
})));

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
