#!/usr/bin/env node
/* No.7 採点エンジンの検証（合格にすべき例・不合格にすべき例）
   node grade-no7.js  → 結果を表示する */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
global.window = {};
require(path.join(ROOT, 'js/problems.js'));
require(path.join(ROOT, 'js/problems/no07.js'));
require(path.join(ROOT, 'js/engine.js'));
const Engine = window.Engine, CABLES = window.CABLE_TYPES;
const P0 = window.PROBLEMS.find(p => p.id === 'no7');
const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });

/* check-problems.js の answerState と同じ（slot の割り当てまで） */
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
  if (unresolved.length) throw new Error('未解決の接続点: ' + unresolved.join(', '));
  return state;
}

/* ---- state を直接いじるヘルパ ---- */
const epId = (e) => e.id;
/* 端点（端子 id またはボックス id）の組と色で電線を探す */
function Wf(st, x, y, color) {
  const w = st.wires.find(w => ((epId(w.a) === x && epId(w.b) === y) || (epId(w.a) === y && epId(w.b) === x)) &&
    (!color || w.color === color));
  if (!w) throw new Error(`電線が無い ${x}|${y}:${color || ''}`);
  return w;
}
/* 端子 t につながる電線の、端子側の端点 */
function termEp(st, t) {
  for (const w of st.wires) { if (w.a.k === 't' && w.a.id === t) return w.a; if (w.b.k === 't' && w.b.id === t) return w.b; }
  throw new Error('端子に電線が無い ' + t);
}
/* 2つの端子の電線を入れ替える（ボックス側の接続はそのまま） */
function swapT(st, t1, t2) { const e1 = termEp(st, t1), e2 = termEp(st, t2); e1.id = t2; e2.id = t1; }
/* ボックス jb 側の線端キー */
function endOf(st, x, y, color, jb) {
  const w = Wf(st, x, y, color);
  return w.id + ':' + ((w.a.k === 'jb' && w.a.id === jb) ? 'a' : 'b');
}
/* 接続点 ab1..ab10（answer.bundles の順）
   A: ab1 L(黒)  ab2 N(白)  ab3 S.1＋3C赤  ab4 S.3＋3C黒
   B: ab5 N 3本  ab6 帰り 3本  ab7 3C赤＋4路1  ab8 3C黒＋4路3  ab9 4路2＋S2.1  ab10 4路4＋S2.3 */
const Bd = (st, id) => st.bundles.find(b => b.id === id);
const E = {
  srcL: (st) => endOf(st, 'src.L', 'jbA', null, 'jbA'),
  srcN: (st) => endOf(st, 'src.N', 'jbA', null, 'jbA'),
  aS0: (st) => endOf(st, 'jbA', 's3S.0', null, 'jbA'),
  aS1: (st) => endOf(st, 'jbA', 's3S.1', null, 'jbA'),
  aS3: (st) => endOf(st, 'jbA', 's3S.3', null, 'jbA'),
  abW_A: (st) => endOf(st, 'jbA', 'jbB', 'white', 'jbA'),
  abR_A: (st) => endOf(st, 'jbA', 'jbB', 'red', 'jbA'),
  abK_A: (st) => endOf(st, 'jbA', 'jbB', 'black', 'jbA'),
  abW_B: (st) => endOf(st, 'jbA', 'jbB', 'white', 'jbB'),
  abR_B: (st) => endOf(st, 'jbA', 'jbB', 'red', 'jbB'),
  abK_B: (st) => endOf(st, 'jbA', 'jbB', 'black', 'jbB'),
  lW: (st) => endOf(st, 'jbB', 'lamp.W', null, 'jbB'),
  lX: (st) => endOf(st, 'jbB', 'lamp.X', null, 'jbB'),
  oW: (st) => endOf(st, 'jbB', 'lampO.W', null, 'jbB'),
  oX: (st) => endOf(st, 'jbB', 'lampO.X', null, 'jbB'),
  f1: (st) => endOf(st, 'jbB', 's4.1', null, 'jbB'),
  f2: (st) => endOf(st, 'jbB', 's4.2', null, 'jbB'),
  f3: (st) => endOf(st, 'jbB', 's4.3', null, 'jbB'),
  f4: (st) => endOf(st, 'jbB', 's4.4', null, 'jbB'),
  l0: (st) => endOf(st, 'jbB', 's3L.0', null, 'jbB'),
  l1: (st) => endOf(st, 'jbB', 's3L.1', null, 'jbB'),
  l3: (st) => endOf(st, 'jbB', 's3L.3', null, 'jbB')
};
/* 接続点の中身を書き換え（キーの名前の配列） */
function setB(st, id, keys) { Bd(st, id).ends = keys.map(k => E[k](st)); }
/* ケーブルの置き場（run.id#i）の切れ端 */
const piece = (st, key) => st.pieces.find(p => p.id === st.cables[key]);

/* 通電試験：3個のスイッチの8通り。各状態の lamp/lampO の点灯と短絡 */
const SW = ['s3S', 's4', 's3L'];
function sim8(st) {
  const rows = [];
  for (let m = 0; m < 8; m++) {
    const s = {}; let par = 0;
    SW.forEach((id, k) => { const b = (m >> k) & 1; s[id] = !!b; par ^= b; });
    const r = Engine.simulate(P0, st, s);
    rows.push({ m, par, lamp: !!r.lit.lamp, lampO: !!r.lit.lampO, short: !!r.shorted });
  }
  const bothSame = rows.every(r => r.lamp === r.lampO);
  const k = rows.map(r => (r.lamp ? 1 : 0) ^ r.par);
  const toggles = !rows.some(r => r.short) && bothSame && k.every(x => x === k[0]);
  const txt = rows.map(r => `${r.m.toString(2).padStart(3, '0')}:${r.lamp ? 1 : 0}${r.lampO ? 1 : 0}${r.short ? 'S' : ''}`).join(' ');
  return { toggles, txt };
}
const joinInfo = (st) => st.bundles.map(b => { const i = Engine.bundleInfo(P0, st, b); return i.method === 'connector' ? 'コネ' + i.count : i.sleeve + '/' + i.mark; }).join(',');

const cases = [];
const T = (desc, expected, build, extra) => cases.push({ desc, expected, build, extra });
const simExtra = (wantToggle) => (st) => { const s = sim8(st); return { note: '8通り(S,4,L)=' + s.txt, ok: wantToggle == null ? undefined : s.toggles === wantToggle }; };

/* ================= 合格にすべき例 ================= */
T('模範解答そのまま（8通りで2灯そろって反転／A＝小・小・○・○、B＝コネ3・3・2・2・2・2）', 'pass', () => answerState(P0), (st) => {
  const s = sim8(st);
  const j = joinInfo(st);
  return { note: `8通り=${s.txt} 接続=${j}`, ok: s.toggles && j === '小/小,小/小,小/○,小/○,コネ3,コネ3,コネ2,コネ2,コネ2,コネ2' };
});
T('3路 S の 1・3 の入れ替え（交差）', 'pass', () => { const st = answerState(P0); swapT(st, 's3S.1', 's3S.3'); return st; }, simExtra(true));
T('負荷側3路の 1・3 の入れ替え（交差）', 'pass', () => { const st = answerState(P0); swapT(st, 's3L.1', 's3L.3'); return st; }, simExtra(true));
T('4路の 1・3 の入れ替え（同じ側の中での交差）', 'pass', () => { const st = answerState(P0); swapT(st, 's4.1', 's4.3'); return st; }, simExtra(true));
T('4路の組の入れ替え：3路 S 側を 2・4、負荷側3路を 1・3 へ（answerRules.alternatives）', 'pass', () => {
  const st = answerState(P0);
  setB(st, 'ab7', ['abR_B', 'f2']); setB(st, 'ab8', ['abK_B', 'f4']);
  setB(st, 'ab9', ['f1', 'l1']); setB(st, 'ab10', ['f3', 'l3']);
  return st;
}, simExtra(true));
T('A部分の組（A3/A4）の入れ替え：S.1 を3C黒、S.3 を3C赤と接続', 'pass', () => {
  const st = answerState(P0);
  setB(st, 'ab3', ['aS1', 'abK_A']); setB(st, 'ab4', ['aS3', 'abR_A']);
  return st;
}, simExtra(true));
T('スイッチ相互間の線の色替え：A–S の赤白を入れ替え（S.1＝白、S.3＝赤）', 'pass', () => {
  const st = answerState(P0);
  Wf(st, 'jbA', 's3S.1').color = 'white'; Wf(st, 'jbA', 's3S.3').color = 'red';
  return st;
});
T('スイッチ相互間の線の色替え：B–4路の2心の黒白を入れ替え（4路1＝白、4路3＝黒、4路2＝白、4路4＝黒）', 'pass', () => {
  const st = answerState(P0);
  ['s4.1', 's4.2'].forEach(t => { Wf(st, 'jbB', t).color = 'white'; });
  ['s4.3', 's4.4'].forEach(t => { Wf(st, 'jbB', t).color = 'black'; });
  return st;
});
T('帰り線の色替え：負荷側3路の0を赤、相互間を黒・白（帰り線は色を問わない）', 'pass', () => {
  const st = answerState(P0);
  Wf(st, 'jbB', 's3L.0').color = 'red'; Wf(st, 'jbB', 's3L.3').color = 'black';
  return st;
});
T('帰り線の色替え：負荷側3路の0を白、相互間を黒・赤（白を帰り線に。仕様上は色を問わない）', 'pass', () => {
  const st = answerState(P0);
  Wf(st, 'jbB', 's3L.0').color = 'white'; Wf(st, 'jbB', 's3L.1').color = 'black';
  return st;
});
T('A–B の3C の相互間2本の色替え（赤→黒・黒→赤を入れ替え、白は接地側のまま）', 'pass', () => {
  const st = answerState(P0);
  Wf(st, 'jbA', 'jbB', 'red').color = 'tmp'; Wf(st, 'jbA', 'jbB', 'black').color = 'red'; Wf(st, 'jbA', 'jbB', 'tmp').color = 'black';
  return st;
});
T('全部の交差を同時に（S の1・3、4路の組、4路の1・3、S2 の1・3）', 'pass', () => {
  const st = answerState(P0);
  swapT(st, 's3S.1', 's3S.3'); swapT(st, 's3L.1', 's3L.3');
  setB(st, 'ab7', ['abR_B', 'f2']); setB(st, 'ab8', ['abK_B', 'f4']);
  setB(st, 'ab9', ['f3', 'l1']); setB(st, 'ab10', ['f1', 'l3']);
  return st;
}, simExtra(true));
T('接続点の中の線の並び順・接続点の順番・電線の登録順を逆に', 'pass', () => {
  const st = answerState(P0);
  st.bundles.reverse(); st.bundles.forEach(b => b.ends.reverse()); st.wires.reverse();
  return st;
});
T('B–4路の2本のケーブルの置き場を入れ替え（1本目に2・4、2本目に1・3＝同じ種類の2C）', 'pass', () => {
  const st = answerState(P0);
  const k0 = 'B-f4#0', k1 = 'B-f4#1'; const t = st.cables[k0]; st.cables[k0] = st.cables[k1]; st.cables[k1] = t;
  return st;
});

/* ================= 不合格にすべき例 ================= */
T('電源の黒白の色の取り違え（L に白・N に黒、A の接続は模範どおり）', 'fail', () => {
  const st = answerState(P0);
  Wf(st, 'src.L', 'jbA').color = 'white'; Wf(st, 'src.N', 'jbA').color = 'black';
  return st;
});
T('接地側・非接地側の取り違え：A で電源の白を S の0へ、電源の黒を A–B の白（ランプの受金）へ', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab1', ['srcN', 'aS0']); setB(st, 'ab2', ['srcL', 'abW_A']);
  return st;
}, simExtra());
T('電源から3路 S の0までの非接地側に白（A–S の黒白を入れ替え：S.0＝白、S.3＝黒）', 'fail', () => {
  const st = answerState(P0);
  Wf(st, 'jbA', 's3S.0').color = 'white'; Wf(st, 'jbA', 's3S.3').color = 'black';
  return st;
});
T('接地側に白以外：A–B の接地側に3C赤、相互間に白', 'fail', () => {
  const st = answerState(P0);
  Wf(st, 'jbA', 'jbB', 'white').color = 'tmp'; Wf(st, 'jbA', 'jbB', 'red').color = 'white'; Wf(st, 'jbA', 'jbB', 'tmp').color = 'red';
  return st;
});
T('ランプレセプタクルの受金ねじ部に黒（帰り線）・中心に白（2Cの端子を入れ替え）', 'fail', () => {
  const st = answerState(P0); swapT(st, 'lamp.W', 'lamp.X'); return st;
}, simExtra());
T('受金ねじ部の線が黒（接続は接地側のまま、色だけ黒）', 'fail', () => {
  const st = answerState(P0);
  Wf(st, 'jbB', 'lamp.W').color = 'black'; Wf(st, 'jbB', 'lamp.X').color = 'white';
  return st;
});
T('3路 S の0と1の入れ替え（電源の黒を1へ）', 'fail', () => {
  const st = answerState(P0); swapT(st, 's3S.0', 's3S.1'); return st;
}, simExtra());
T('負荷側3路の0と3の入れ替え（帰り線を3へ）', 'fail', () => {
  const st = answerState(P0); swapT(st, 's3L.0', 's3L.3'); return st;
}, simExtra());
T('相互間の線の合体：A で S.1・S.3 と3C赤・黒を1つにまとめる（4本）', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab3', ['aS1', 'aS3', 'abR_A', 'abK_A']);
  st.bundles = st.bundles.filter(b => b.id !== 'ab4');
  return st;
}, simExtra());
T('4路の 1 と 2 に同じ3路 S から入れる（3C赤→1、3C黒→2、S2 の1・3→4路3・4）', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab7', ['abR_B', 'f1']); setB(st, 'ab8', ['abK_B', 'f2']);
  setB(st, 'ab9', ['f3', 'l1']); setB(st, 'ab10', ['f4', 'l3']);
  return st;
}, simExtra());
T('4路を素通り：S 側の線を S2 へ直結、4路は 1–2・3–4 どうしを輪にする', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab7', ['abR_B', 'l1']); setB(st, 'ab8', ['abK_B', 'l3']);
  setB(st, 'ab9', ['f1', 'f2']); setB(st, 'ab10', ['f3', 'f4']);
  return st;
}, simExtra());
T('2灯を直列（lamp.W と lampO.X をつなぎ、接地側は lampO.W だけ）＝同時点滅にならない', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab5', ['abW_B', 'oW']); setB(st, 'ab6', ['l0', 'lX']);
  st.bundles.push({ id: 'abx', jb: 'jbB', ends: [E.lW(st), E.oX(st)] });
  return st;
}, simExtra());
T('施工省略のランプの帰り線を相互間の接続点へ（片方しか点かない位置）', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab6', ['l0', 'lX']); setB(st, 'ab9', ['f2', 'l1', 'oX']);
  return st;
}, simExtra());
T('常時点灯の形：A で電源の黒を3C黒（→B の帰り線）にも接続、S.3 は S.1 の接続点へ', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab1', ['srcL', 'aS0', 'abK_A']); setB(st, 'ab3', ['aS1', 'aS3', 'abR_A']);
  st.bundles = st.bundles.filter(b => b.id !== 'ab4');
  setB(st, 'ab6', ['abK_B', 'lX', 'oX']); setB(st, 'ab8', ['l0', 'f3']);
  return st;
}, simExtra());
T('B で帰り線3本のうち施工省略側を接続し忘れ（線端が浮く）', 'fail', () => {
  const st = answerState(P0); setB(st, 'ab6', ['l0', 'lX']); return st;
});
T('ケーブルの取り違え：A–S に VVF1.6-2C（3C を使わない）', 'fail', () => {
  const st = answerState(P0); piece(st, 'A-S#0').type = 'vvf16-2c'; return st;
});
T('ケーブルの取り違え：B–負荷側3路に VVF1.6-2C', 'fail', () => {
  const st = answerState(P0); piece(st, 'B-sL#0').type = 'vvf16-2c'; return st;
});
T('ケーブルの取り違え：B–ランプに VVF1.6-3C（2C の区間）', 'fail', () => {
  const st = answerState(P0); piece(st, 'B-lamp#0').type = 'vvf16-3c'; return st;
});
T('ケーブルの取り違え：電源–A に VVF1.6-2C（2.0-2C を使わない）', 'fail', () => {
  const st = answerState(P0); piece(st, 'src-A#0').type = 'vvf16-2c'; return st;
}, (st) => ({ note: 'A接続=' + joinInfo(st) }));
T('切断寸法の誤り：B–施工省略ランプを 250mm（正しくは 250＋50＝300mm）', 'fail', () => {
  const st = answerState(P0); piece(st, 'B-lampO#0').len = 250; return st;
});
T('切断寸法の誤り：電源–A を 250mm（電源側は切りっぱなしなので 200mm）', 'fail', () => {
  const st = answerState(P0); piece(st, 'src-A#0').len = 250; return st;
});
T('支給超過の切断：VVF2.0-2C を 300mm で切る（支給 250mm）', 'fail', () => {
  const st = answerState(P0); piece(st, 'src-A#0').len = 300; return st;
});
T('支給超過の切断：VVF1.6-3C を余分に 400mm 切る（合計 1250mm＞支給 1150mm、区間には置かない）', 'fail', () => {
  const st = answerState(P0); st.pieces.push({ id: 'extra1', type: 'vvf16-3c', len: 400 }); return st;
});
T('3路 S の0に2本（最大1本）：A–S の黒と、もう1本の黒を直接', 'fail', () => {
  const st = answerState(P0);
  st.wires.push({ id: 'x1', a: { k: 'jb', id: 'jbA' }, b: { k: 't', id: 's3S.0' }, color: 'black' });
  Bd(st, 'ab1').ends.push('x1:a');
  return st;
});
T('配線図に無い区間：A からランプへ直接', 'fail', () => {
  const st = answerState(P0);
  st.wires.push({ id: 'x2', a: { k: 'jb', id: 'jbA' }, b: { k: 't', id: 'lamp.X' }, color: 'black' });
  Bd(st, 'ab1').ends.push('x2:a');
  return st;
});
T('A で黒2本（2.0＋1.6）に 1.6 をもう1本足した3本の接続 → 刻印「小」のまま（接続の自動判定の確認）', 'fail', () => {
  // S.0 と S.3 を同じ接続点に（相互間が電源の黒に直結）
  const st = answerState(P0);
  setB(st, 'ab1', ['srcL', 'aS0', 'aS3']); setB(st, 'ab4', ['abK_A', 'abR_A']);
  setB(st, 'ab3', ['aS1']);
  return st;
}, (st) => ({ note: 'A接続=' + joinInfo(st) }));

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
