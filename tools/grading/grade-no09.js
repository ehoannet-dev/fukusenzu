#!/usr/bin/env node
/* No.9 採点エンジンの検証（合格にすべき例・不合格にすべき例） */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
global.window = {};
require(path.join(ROOT, 'js/problems.js'));
require(path.join(ROOT, 'js/problems/no09.js'));
require(path.join(ROOT, 'js/engine.js'));
const Engine = window.Engine, CABLES = window.CABLE_TYPES;
const P0 = window.PROBLEMS.find(p => p.id === 'no9');
const clone = (o) => JSON.parse(JSON.stringify(o));
const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });

/* check-problems.js の answerState と同じ（answer を差し替えられるようにし、slot 割り当ても同じ） */
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

function mutate(fn) { const ans = clone(P0.answer); fn(ans); return ans; }
/* 端点 a|b（と色）で模範解答の電線を探す */
const W = (ans, a, b, color) => ans.wires.find(w => ((w.a === a && w.b === b) || (w.a === b && w.b === a)) && (!color || w.color === color));
const B = (ans, jb, label) => ans.bundles.find(x => x.jb === jb && x.label.indexOf(label) >= 0);

/* 通電試験：スイッチ 切／入 で各器具の点灯 */
function sim(state) {
  const pick = (s) => ['lamp', 'ceil', 'eet', 'o2'].map(k => k + ':' + (s.lit[k] ? '1' : '0')).join(' ') + (s.shorted ? ' SHORT' : '');
  return { off: pick(Engine.simulate(P0, state, { swI: false })), on: pick(Engine.simulate(P0, state, { swI: true })) };
}
const OFF_OK = 'lamp:0 ceil:0 eet:1 o2:1', ON_OK = 'lamp:1 ceil:1 eet:1 o2:1';
const simNote = (st) => { const s = sim(st); return { note: `切=${s.off} 入=${s.on}`, s }; };
const conn = (st) => st.bundles.map(b => { const i = Engine.bundleInfo(P0, st, b); return b.jb + ':' + (i.method === 'connector' ? 'コネクタ' + i.count : i.sleeve + '/' + i.mark); }).join(',');

const cases = [];
const T = (desc, expected, build, extra) => cases.push({ desc, expected, build, extra });

/* ===== 合格にすべき例 ===== */
T('模範解答そのまま（公式の複線図・接続材料）', 'pass', () => answerState(P0), (st) => {
  const { note, s } = simNote(st);
  const c = conn(st);
  const okSim = s.off === OFF_OK && s.on === ON_OK;
  // 施工条件3：A＝差込形コネクタ（2・2・3本用）、B＝リングスリーブ（中/中・中/中・小/○）
  const okC = c === 'jbA:コネクタ2,jbA:コネクタ2,jbA:コネクタ3,jbB:中/中,jbB:中/中,jbB:小/○';
  return { note: note + ' 接続=' + c, ok: okSim && okC };
});
T('片切スイッチの端子の入れ替え：黒（電源）→swI.L、白（帰り）→swI.C（極性なし）', 'pass', () => answerState(P0, mutate(a => {
  W(a, 'jbA', 'swI.C').b = 'swI.L__t';
  W(a, 'jbA', 'swI.L').b = 'swI.C';
  W(a, 'jbA', 'swI.L__t').b = 'swI.L';
  // 束は端点で引くので付け替え（黒＝swI.L を非接地側、白＝swI.C を帰りへ）
  B(a, 'jbA', '非接地側').wires = ['jbA|jbB:black', 'jbA|swI.L'];
  B(a, 'jbA', 'イの帰り').wires = ['jbA|jbB:red', 'jbA|lamp.X', 'jbA|swI.C'];
})), (st) => { const { note, s } = simNote(st); return { note, ok: s.off === OFF_OK && s.on === ON_OK }; });
T('電線の向き（a/b）を逆に引く：器具側から A/B へ、ED から EET へ', 'pass', () => answerState(P0, mutate(a => {
  a.wires.forEach(w => { const t = w.a; w.a = w.b; w.b = t; });
})));
T('接続点の順番・接続点の中の線の並び順を入れ替え', 'pass', () => {
  const st = answerState(P0);
  st.bundles.reverse(); st.bundles.forEach(b => b.ends.reverse());
  return st;
});
T('電線の登録順（引いた順）を逆にしても同じ', 'pass', () => { const st = answerState(P0); st.wires.reverse(); return st; });
T('EET の渡り（2口コンセントへ）を先に引く（同じ極の差込穴2つ・順不同）', 'pass', () => answerState(P0, mutate(a => {
  const i = a.wires.findIndex(w => w.a === 'eet.W' && w.b === 'o2.W');
  const j = a.wires.findIndex(w => w.a === 'eet.L' && w.b === 'o2.L');
  const x = a.wires.splice(Math.max(i, j), 1)[0], y = a.wires.splice(Math.min(i, j), 1)[0];
  a.wires.unshift(x, y);
})));

/* ===== 不合格にすべき例 ===== */
T('電源の N・L の色の取り違え（L に白・N に黒。B の接続は模範どおり）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'src.L', 'jbB').color = 'white__';
  W(a, 'src.N', 'jbB').color = 'black';
  W(a, 'src.L', 'jbB', 'white__').color = 'white';
  B(a, 'jbB', '接地側').wires = ['src.N|jbB:black', 'jbB|eet.W', 'jbA|jbB:white', 'jbB|ceil.W'];
  B(a, 'jbB', '非接地側').wires = ['src.L|jbB:white', 'jbB|eet.L', 'jbA|jbB:black'];
})));
T('電源の N・L の取り違え（電源の白を B の黒系統、黒を白系統へ＝極性が逆）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'jbB', '接地側').wires = ['src.L|jbB', 'jbB|eet.W', 'jbA|jbB:white', 'jbB|ceil.W'];
  B(a, 'jbB', '非接地側').wires = ['src.N|jbB', 'jbB|eet.L', 'jbA|jbB:black'];
})), (st) => simNote(st));
T('引掛シーリングの W に黒（帰り）・非接地側に白（接地側）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'ceil.W').b = 'ceil.X__w';
  W(a, 'jbB', 'ceil.X').b = 'ceil.W';
  W(a, 'jbB', 'ceil.X__w').b = 'ceil.X';
  B(a, 'jbB', '接地側').wires = ['src.N|jbB', 'jbB|eet.W', 'jbA|jbB:white', 'jbB|ceil.X'];
  B(a, 'jbB', 'イの帰り').wires = ['jbA|jbB:red', 'jbB|ceil.W'];
})));
T('ランプレセプタクルの受金ねじ部に黒（帰り）・中心に白', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbA', 'lamp.W').b = 'lamp.X__w';
  W(a, 'jbA', 'lamp.X').b = 'lamp.W';
  W(a, 'jbA', 'lamp.X__w').b = 'lamp.X';
  B(a, 'jbA', '接地側').wires = ['jbA|jbB:white', 'jbA|lamp.X'];
  B(a, 'jbA', 'イの帰り').wires = ['jbA|jbB:red', 'jbA|lamp.W', 'jbA|swI.L'];
})));
T('EET の W に黒・非接地側に白（B からの 2.0-2C を逆に結線）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbB', 'eet.W').b = 'eet.L__x';
  W(a, 'jbB', 'eet.L').b = 'eet.W';
  W(a, 'jbB', 'eet.L__x').b = 'eet.L';
  B(a, 'jbB', '接地側').wires = ['src.N|jbB', 'jbB|eet.L', 'jbA|jbB:white', 'jbB|ceil.W'];
  B(a, 'jbB', '非接地側').wires = ['src.L|jbB', 'jbB|eet.W', 'jbA|jbB:black'];
})));
T('2口コンセントへの渡りの白・黒を逆に（EET の W から黒、非接地側から白）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'eet.W', 'o2.W').color = 'black';
  W(a, 'eet.L', 'o2.L').color = 'white';
})));
T('2口コンセントへの渡りを W→o2.L・L→o2.W と交差（施工省略側の極性が逆）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'eet.W', 'o2.W').b = 'o2.L';
  W(a, 'eet.L', 'o2.L').b = 'o2.W';
})));
T('帰り線の取り違え：B で 3C 赤を非接地側（黒3本）に入れ、シーリングの黒だけ残す（シーリング常時点灯）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'jbB', '非接地側').wires = ['src.L|jbB', 'jbB|eet.L', 'jbA|jbB:black', 'jbA|jbB:red', 'jbB|ceil.X'];
  a.bundles = a.bundles.filter(x => !(x.jb === 'jbB' && x.label.indexOf('イの帰り') >= 0));
})), (st) => simNote(st));
T('帰り線の取り違え：A でランプの黒を非接地側（黒2本）に入れる（ランプ常時点灯）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'jbA', '非接地側').wires = ['jbA|jbB:black', 'jbA|swI.C', 'jbA|lamp.X'];
  B(a, 'jbA', 'イの帰り').wires = ['jbA|jbB:red', 'jbA|swI.L'];
})), (st) => simNote(st));
T('帰り線の取り違え：A で 3C 赤を接地側（白）に入れ、スイッチの白とランプの黒だけ（シーリングが点かない）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'jbA', '接地側').wires = ['jbA|jbB:white', 'jbA|lamp.W', 'jbA|jbB:red'];
  B(a, 'jbA', 'イの帰り').wires = ['jbA|lamp.X', 'jbA|swI.L'];
})), (st) => simNote(st));
T('A で帰り線と非接地側を1つにまとめる（スイッチが効かず2灯常時点灯）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'jbA', '非接地側').wires = ['jbA|jbB:black', 'jbA|swI.C', 'jbA|jbB:red', 'jbA|lamp.X', 'jbA|swI.L'];
  a.bundles = a.bundles.filter(x => !(x.jb === 'jbA' && x.label.indexOf('イの帰り') >= 0));
})), (st) => simNote(st));
T('B で帰り線と接地側を1つにまとめる（スイッチを入れると短絡）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'jbB', '接地側').wires = ['src.N|jbB', 'jbB|eet.W', 'jbA|jbB:white', 'jbB|ceil.W', 'jbA|jbB:red', 'jbB|ceil.X'];
  a.bundles = a.bundles.filter(x => !(x.jb === 'jbB' && x.label.indexOf('イの帰り') >= 0));
})), (st) => simNote(st));
T('3C の赤を非接地側（スイッチの電源）に、黒を帰り線に使う（電源から点滅器までは黒）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbA', 'jbB', 'black').color = 'tmp';
  W(a, 'jbA', 'jbB', 'red').color = 'black';
  W(a, 'jbA', 'jbB', 'tmp').color = 'red';
  // 束のキーは色で引くので付け替え
  B(a, 'jbA', '非接地側').wires = ['jbA|jbB:red', 'jbA|swI.C'];
  B(a, 'jbA', 'イの帰り').wires = ['jbA|jbB:black', 'jbA|lamp.X', 'jbA|swI.L'];
  B(a, 'jbB', '非接地側').wires = ['src.L|jbB', 'jbB|eet.L', 'jbA|jbB:red'];
  B(a, 'jbB', 'イの帰り').wires = ['jbA|jbB:black', 'jbB|ceil.X'];
})), (st) => simNote(st));
T('スイッチ行き 2C の白を電源（非接地側）に、黒を帰り線に使う', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'jbA', 'swI.C').color = 'white';
  W(a, 'jbA', 'swI.L').color = 'black';
})), (st) => simNote(st));
T('接地線（緑）の欠落（EET の ⏚ と ED を結ばない。IV緑は切って置いたまま）', 'fail', () => answerState(P0, mutate(a => {
  a.wires = a.wires.filter(w => w.color !== 'green');
})));
T('接地線（緑）を EET の W（接地側極端子）へ入れる（⏚ 端子は空き）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'eet.E', 'ed.E').a = 'eet.W';
})));
T('接地線を黒で引く（IV緑の代わりに接地線に黒）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'eet.E', 'ed.E').color = 'black';
})));
T('2口コンセントへの渡りを EET からではなく B から出す（配線図にない区間）', 'fail', () => answerState(P0, mutate(a => {
  W(a, 'eet.W', 'o2.W').a = 'jbB';
  W(a, 'eet.L', 'o2.L').a = 'jbB';
  B(a, 'jbB', '接地側').wires.push('jbB|o2.W');
  B(a, 'jbB', '非接地側').wires.push('jbB|o2.L');
})));
T('2口コンセントへの渡りを出し忘れ', 'fail', () => answerState(P0, mutate(a => {
  a.wires = a.wires.filter(w => !/^o2\./.test(w.b));
})));
T('B で 3C の黒（スイッチの電源）を接続し忘れ（線端が浮いている）', 'fail', () => answerState(P0, mutate(a => {
  B(a, 'jbB', '非接地側').wires = ['src.L|jbB', 'jbB|eet.L'];
})), (st) => simNote(st));
T('ケーブルの取り違え：A-B 間に VVF1.6-2C（3C を使わない）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['A-B#0']).type = 'vvf16-2c';
  return st;
});
T('ケーブルの取り違え：B-EET に VVF1.6-2C（2.0-2C を使わない）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['B-eet#0']).type = 'vvf16-2c';
  return st;
}, (st) => ({ note: '接続=' + conn(st) }));
T('ケーブルの取り違え：電源-B に VVF1.6-2C（2.0-2C を使わない）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['src-B#0']).type = 'vvf16-2c';
  return st;
}, (st) => ({ note: '接続=' + conn(st) }));
T('ケーブルの取り違え：A-スイッチに VVF1.6-3C', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['A-sw#0']).type = 'vvf16-3c';
  return st;
});
T('切断寸法の誤り：A-ランプを 200mm で切る（正しくは 150+50+50=250mm）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['A-lamp#0']).len = 200;
  return st;
});
T('切断寸法の誤り：電源-B を 250mm で切る（電源側は切りっぱなしなので 200mm）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['src-B#0']).len = 250;
  return st;
});
T('切断寸法の誤り：EET-ED の IV緑を 100mm で切る（正しくは 100+50=150mm）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.find(p => p.id === st.cables['eet-ed#0']).len = 100;
  return st;
});
T('支給超過の切断：VVF1.6-3C を余分に 150mm 切る（合計 400mm＞支給 350mm、区間には置かない）', 'fail', () => {
  const st = answerState(P0);
  st.pieces.push({ id: 'extra1', type: 'vvf16-3c', len: 150 });
  return st;
});
T('B の黒3本（2.0×2＋1.6×1）が「小」ではなく「中・刻印中」になるか（接続材料の自動判定）', 'pass', () => answerState(P0), (st) => {
  const b = st.bundles.find(x => x.jb === 'jbB' && x.ends.length === 3);
  const i = Engine.bundleInfo(P0, st, b);
  return { note: `黒3本 sizes=${i.sizes.join('+')} → ${i.sleeve}/${i.mark}`, ok: i.sleeve === '中' && i.mark === '中' };
});

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
