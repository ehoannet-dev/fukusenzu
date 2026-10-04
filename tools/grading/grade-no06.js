#!/usr/bin/env node
/* No.6 採点エンジンの検証（合格にすべき例・不合格にすべき例）
   node grade-no6.js  → 結果を表示する */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
global.window = {};
require(path.join(ROOT, 'js/problems.js'));
require(path.join(ROOT, 'js/problems/no06.js'));
require(path.join(ROOT, 'js/engine.js'));
const Engine = window.Engine, CABLES = window.CABLE_TYPES;
const P = window.PROBLEMS.find(p => p.id === 'no6');
const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });

/* check-problems.js の answerState と同じ */
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
  if (unresolved.length) throw new Error('未解決: ' + unresolved.join(','));
  const cables = {}, pieces = [];
  (problem.runs || []).forEach(run => {
    for (let i = 0; i < (run.slots || 0); i++) {
      const pc = { id: 'ac' + (pieces.length + 1), type: Engine.slotNeed(run, i), len: run.cut || 0 };
      pieces.push(pc); cables[Engine.slotKey(run, i)] = pc.id;
    }
  });
  const sw = {};
  Engine.switchables(problem).forEach(d => { sw[d.id] = false; });
  return { wires, bundles, cables, pieces, switches: sw, power: true, seq: 900 };
}
function assignSlots(state) {
  (P.runs || []).forEach(run => {
    if (!run.slots) return;
    const used = {};
    Engine.wiresOfRun(P, state, run).forEach(w => {
      delete w.slot;
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

/* 模範解答の電線番号（answer.wires の順、1始まり）
   1 src.L-B黒 2 src.N-B白 3 B-out.L黒 4 B-out.W白 5 B-S.0黒 6 B-S.3白 7 B-S.1赤
   8 A-B白 9 A-B黒 10 A-B赤 11 A-ceil.W白 12 A-ceil.X黒 13 A-ceilO.W白 14 A-ceilO.X黒
   15 A-s3L.0黒 16 A-s3L.3白 17 A-s3L.1赤
   束（answer.bundles の順）：1 B黒 2 B白 3 B相互間(黒/S.3) 4 B相互間(赤/S.1)
   5 A白 6 A負荷 7 A相互間(黒/s3L.3) 8 A相互間(赤/s3L.1) */
const S = () => answerState(P);
const W = (st, n) => st.wires[n - 1];
const Bn = (st, n) => st.bundles[n - 1];
const E = (st, n, jb) => { const w = W(st, n); return w.id + ':' + ((w.a.k === 'jb' && w.a.id === jb) ? 'a' : 'b'); };
const piece = (st, runId) => st.pieces.find(p => p.id === st.cables[runId + '#0']);

/* 通電試験：3路2個の全4状態 */
function sim4(st) {
  const out = [];
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b]) => {
    const s = Engine.simulate(P, st, { s3S: !!a, s3L: !!b });
    out.push(`S${a}L${b}:ceil${s.lit.ceil ? 1 : 0}/omit${s.lit.ceilO ? 1 : 0}/out${s.lit.out ? 1 : 0}${s.shorted ? '/SHORT' : ''}`);
  });
  return out.join(' ');
}
/* 2か所点滅として正しいか（どちらを切り替えても2灯そろって反転・コンセント常時） */
function simOk(st) {
  const r = [];
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([a, b]) => r.push(Engine.simulate(P, st, { s3S: !!a, s3L: !!b })));
  if (r.some(s => s.shorted || !s.lit.out || !!s.lit.ceil !== !!s.lit.ceilO)) return false;
  const v = r.map(s => !!s.lit.ceil);
  return v[0] !== v[1] && v[0] !== v[2] && v[1] !== v[3] && v[2] !== v[3];
}
const infos = (st) => st.bundles.map(b => {
  const i = Engine.bundleInfo(P, st, b);
  return `${b.jb}:` + (i.method === 'connector' ? 'コネクタ' + i.count : i.sleeve + '/' + i.mark);
}).join(',');

const cases = [];
const T = (desc, expected, build, extra) => cases.push({ desc, expected, build, extra });

/* ===== 合格にすべき例 ===== */
T('模範解答そのまま（公式解答）＋通電4状態・接続材料', 'pass', () => S(), (st) => {
  const inf = infos(st);
  const want = 'jbB:小/小,jbB:小/小,jbB:小/○,jbB:小/○,jbA:コネクタ3,jbA:コネクタ3,jbA:コネクタ2,jbA:コネクタ2';
  return { note: sim4(st) + ' | ' + inf, ok: simOk(st) && inf === want };
});
T('相互間の交差：3路S の 1・3 を入れ替え（解答注記「1と3」「3と1」でも正解）', 'pass', () => {
  const st = S(); W(st, 6).b.id = 's3S.1'; W(st, 7).b.id = 's3S.3'; return st;
}, (st) => ({ note: sim4(st), ok: simOk(st) }));
T('相互間の交差：Aの下の3路の 1・3 を入れ替え', 'pass', () => {
  const st = S(); W(st, 16).b.id = 's3L.1'; W(st, 17).b.id = 's3L.3'; return st;
}, (st) => ({ note: sim4(st), ok: simOk(st) }));
T('相互間の交差：両方の3路で 1・3 を入れ替え（1-1・3-3 に戻る）', 'pass', () => {
  const st = S(); W(st, 6).b.id = 's3S.1'; W(st, 7).b.id = 's3S.3';
  W(st, 16).b.id = 's3L.1'; W(st, 17).b.id = 's3L.3'; return st;
}, (st) => ({ note: sim4(st), ok: simOk(st) }));
T('相互間の交差：B で A-B間の黒・赤のつなぎ先を入れ替え（黒→S.1側、赤→S.3側）', 'pass', () => {
  const st = S();
  Bn(st, 3).ends = [E(st, 10, 'jbB'), E(st, 6, 'jbB')];
  Bn(st, 4).ends = [E(st, 9, 'jbB'), E(st, 7, 'jbB')];
  return st;
}, (st) => ({ note: sim4(st), ok: simOk(st) }));
T('色別を問わない線の色替え：S の 1・3（白赤→赤白）、A-B間の相互間（黒赤→赤黒）、Aの下の3路（0白・3赤・1黒）', 'pass', () => {
  const st = S();
  W(st, 6).color = 'red'; W(st, 7).color = 'white';
  W(st, 9).color = 'red'; W(st, 10).color = 'black';
  W(st, 15).color = 'white'; W(st, 16).color = 'red'; W(st, 17).color = 'black';
  return assignSlots(st);
}, (st) => ({ note: sim4(st), ok: simOk(st) }));
T('Aの下の3路の 0 に赤、1・3 に黒・白（色別は問わない）', 'pass', () => {
  const st = S();
  W(st, 15).color = 'red'; W(st, 16).color = 'black'; W(st, 17).color = 'white';
  return assignSlots(st);
});
T('接続点の順番・接続点の中の線の並び・電線を引いた順を逆にしても同じ', 'pass', () => {
  const st = S(); st.bundles.reverse(); st.bundles.forEach(b => b.ends.reverse()); st.wires.reverse(); return st;
});
T('スイッチの位置をすべて入にした状態で採点しても同じ（state.switches は採点に影響しない）', 'pass', () => {
  const st = S(); st.switches = { s3S: true, s3L: true }; return st;
});

/* ===== 不合格にすべき例 ===== */
T('3路S の 0 と 1 の入れ替え（電源の黒を 1 へ、相互間を 0 へ）', 'fail', () => {
  const st = S(); W(st, 5).b.id = 's3S.1'; W(st, 7).b.id = 's3S.0'; return st;
}, (st) => ({ note: sim4(st) }));
T('Aの下の3路の 0 と 1 の入れ替え（負荷側を 1 へ、相互間を 0 へ）', 'fail', () => {
  const st = S(); W(st, 15).b.id = 's3L.1'; W(st, 17).b.id = 's3L.0'; return st;
}, (st) => ({ note: sim4(st) }));
T('相互間の線の合体：B で相互間2本を1つにまとめる', 'fail', () => {
  const st = S(); Bn(st, 3).ends = Bn(st, 3).ends.concat(Bn(st, 4).ends); st.bundles.splice(3, 1); return st;
}, (st) => ({ note: sim4(st) }));
T('相互間の線の合体：A で相互間2本を1つにまとめる（差込形コネクタ4本用）', 'fail', () => {
  const st = S(); Bn(st, 7).ends = Bn(st, 7).ends.concat(Bn(st, 8).ends); st.bundles.splice(7, 1); return st;
}, (st) => ({ note: sim4(st) }));
T('A-B間3心の白を相互間に、黒を接地側に使う（接地側は白）', 'fail', () => {
  const st = S(); W(st, 8).color = 'black'; W(st, 9).color = 'white'; return assignSlots(st);
});
T('3路S の 0 に赤（電源から3路S までの非接地側は黒）：3心の赤を 0、黒を 1 へ', 'fail', () => {
  const st = S(); W(st, 5).color = 'red'; W(st, 7).color = 'black'; return assignSlots(st);
});
T('露出形コンセントの W 極に黒・非接地側に白', 'fail', () => {
  const st = S(); W(st, 3).b.id = 'out.W'; W(st, 4).b.id = 'out.L'; return st;
});
T('引掛シーリングの接地側に黒（帰り線）・非接地側に白', 'fail', () => {
  const st = S(); W(st, 11).b.id = 'ceil.X'; W(st, 12).b.id = 'ceil.W'; return st;
});
T('施工省略の引掛シーリングの白を負荷側に、黒を接地側にまとめる（A で白黒を逆）', 'fail', () => {
  const st = S();
  Bn(st, 5).ends = [E(st, 8, 'jbA'), E(st, 11, 'jbA'), E(st, 14, 'jbA')];
  Bn(st, 6).ends = [E(st, 15, 'jbA'), E(st, 12, 'jbA'), E(st, 13, 'jbA')];
  return st;
});
T('帰り線の取り違え：施工省略の黒を負荷側でなく相互間（A⑦）へつなぐ', 'fail', () => {
  const st = S();
  Bn(st, 6).ends = [E(st, 15, 'jbA'), E(st, 12, 'jbA')];
  Bn(st, 7).ends = Bn(st, 7).ends.concat([E(st, 14, 'jbA')]);
  return st;
}, (st) => ({ note: sim4(st) }));
T('露出形コンセントの黒を B で相互間（③）につなぐ（常時通電でない）', 'fail', () => {
  const st = S();
  Bn(st, 1).ends = [E(st, 1, 'jbB'), E(st, 5, 'jbB')];
  Bn(st, 3).ends = Bn(st, 3).ends.concat([E(st, 3, 'jbB')]);
  return st;
}, (st) => ({ note: sim4(st) }));
T('3路S の 3 の相互間線を B で電源の黒とまとめる（常時点灯になる位置ができる）', 'fail', () => {
  const st = S();
  Bn(st, 1).ends = Bn(st, 1).ends.concat([E(st, 6, 'jbB')]);
  Bn(st, 3).ends = [E(st, 9, 'jbB')];
  return st;
}, (st) => ({ note: sim4(st) }));
T('施工省略の引掛シーリングへのケーブル（A-ceilO）を引かない', 'fail', () => {
  const st = S();
  const ids = [W(st, 13).id, W(st, 14).id];
  st.wires = st.wires.filter(w => ids.indexOf(w.id) < 0);
  st.bundles.forEach(b => { b.ends = b.ends.filter(e => ids.indexOf(e.split(':')[0]) < 0); });
  delete st.cables['A-ceilO#0']; st.pieces = st.pieces.filter(p => p.id !== 'ac7');
  return st;
});
T('B で線端を接続し忘れ（露出形コンセントの白が接地側の接続点に入っていない）', 'fail', () => {
  const st = S(); Bn(st, 2).ends = [E(st, 2, 'jbB'), E(st, 8, 'jbB')]; return st;
});
T('B を経由せず、3路S の 1 から A へ直接（経由する部分で接続しない）', 'fail', () => {
  const st = S();
  W(st, 7).a = { k: 'jb', id: 'jbA' };
  Bn(st, 4).ends = [E(st, 10, 'jbB')];
  st.bundles = st.bundles.filter(b => b.ends.length >= 2);
  Bn(st, 7).ends = Bn(st, 7).ends; // A⑧ を 赤(A-B) の代わりに直接線と
  const b8 = st.bundles.find(b => b.ends.indexOf(E(st, 17, 'jbA')) >= 0);
  b8.ends = [W(st, 7).id + ':a', E(st, 17, 'jbA')];
  return st;
});
T('ケーブルの取り違え：A-B間に VVF1.6-2C（3C を使わない）', 'fail', () => {
  const st = S(); piece(st, 'A-B').type = 'vvf16-2c'; return st;
});
T('ケーブルの取り違え：B-露出形コンセントに VVF1.6-3C', 'fail', () => {
  const st = S(); piece(st, 'B-out').type = 'vvf16-3c'; return st;
});
T('ケーブルの取り違え：電源-B に VVF1.6-2C（2.0-2C を使わない）', 'fail', () => {
  const st = S(); piece(st, 'src-B').type = 'vvf16-2c'; return st;
}, (st) => ({ note: infos(st) }));
T('切断寸法の誤り：施工省略側に 50mm 足して A-ceilO を 200mm（正しくは 150mm）', 'fail', () => {
  const st = S(); piece(st, 'A-ceilO').len = 200; return st;
});
T('切断寸法の誤り：電源側に 50mm 足して 電源-B を 250mm（正しくは 200mm）', 'fail', () => {
  const st = S(); piece(st, 'src-B').len = 250; return st;
});
T('支給超過の切断：VVF1.6-3C を余分に 400mm 切る（合計 1150mm＞支給 1050mm、区間には置かない）', 'fail', () => {
  const st = S(); st.pieces.push({ id: 'extra1', type: 'vvf16-3c', len: 400 }); return st;
});
T('支給超過の切断：VVF2.0-2C を余分に 100mm 切る（合計 300mm＞支給 250mm）', 'fail', () => {
  const st = S(); st.pieces.push({ id: 'extra2', type: 'vvf20-2c', len: 100 }); return st;
});
T('3路S の 0 に2本（最大1本）：非接地側の黒を B から2本', 'fail', () => {
  const st = S();
  st.wires.push({ id: 'x1', a: { k: 'jb', id: 'jbB' }, b: { k: 't', id: 's3S.0' }, color: 'black' });
  Bn(st, 1).ends.push('x1:a');
  return st;
});

/* ===== 実行 ===== */
const results = [];
cases.forEach(c => {
  let st, g, err = null, extra = {};
  try {
    st = c.build();
    g = Engine.grade(P, st);
    if (c.extra) extra = c.extra(st, g) || {};
  } catch (e) { err = e; }
  const passed = !!(g && g.passed);
  let ok = !err && (c.expected === 'pass' ? passed : !passed);
  if (extra.ok === false) ok = false;
  const bads = g ? g.issues.filter(x => x.level === 'bad').map(x => x.msg.replace(/<[^>]+>/g, '')) : [];
  const warns = g ? g.issues.filter(x => x.level === 'warn').map(x => x.msg.replace(/<[^>]+>/g, '')) : [];
  results.push({ desc: c.desc, expected: c.expected, passed, ok, score: g ? g.score : -1, bads, warns, note: extra.note || '', err: err ? String(err) : null });
  console.log(`${ok ? 'OK ' : 'NG '} [期待 ${c.expected}] 実際 ${passed ? '合格' : '不合格'} ${g ? g.score + '点' : 'ERR'}  ${c.desc}`);
  if (err) console.log('    例外:', err.stack.split('\n').slice(0, 2).join(' | '));
  bads.slice(0, 4).forEach(m => console.log('    欠陥:', m));
  warns.slice(0, 3).forEach(m => console.log('    注意:', m));
  if (extra.note) console.log('    ', extra.note);
});
const ng = results.filter(r => !r.ok).length;
console.log(`\n${results.length}例中 期待どおり ${results.length - ng}／期待と違う ${ng}`);
