#!/usr/bin/env node
/* No.8 採点エンジンの検証（合格にすべき例・不合格にすべき例）
   node grade-no8.js  → 結果を表示する */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
global.window = {};
require(path.join(ROOT, 'js/problems.js'));
require(path.join(ROOT, 'js/problems/no08.js'));
require(path.join(ROOT, 'js/engine.js'));
const Engine = window.Engine, CABLES = window.CABLE_TYPES;
const P0 = window.PROBLEMS.find(p => p.id === 'no8');
const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });

/* app.js の reassignSlots と同じ：利用者が選んでいない心線を、空いているケーブルの心線に割りふる */
function reslot(st) {
  (P0.runs || []).forEach(run => {
    if (!run.slots) return;
    const ws = Engine.wiresOfRun(P0, st, run);
    const used = {};
    const take = (k, color) => { const s = used[k] = used[k] || {}; if (s[color]) return false; s[color] = true; return true; };
    ws.forEach(w => {
      if (!w.slot) return;
      const pc = Engine.slotPiece(st, w.slot); const t = pc && CABLES[pc.type];
      if (!t || t.cores.indexOf(w.color) < 0 || !take(w.slot, w.color)) { delete w.slot; delete w.slotPicked; }
    });
    ws.filter(w => !w.slot).forEach(w => {
      for (let i = 0; i < run.slots; i++) {
        const k = Engine.slotKey(run, i);
        const pc = Engine.slotPiece(st, k); const t = pc && CABLES[pc.type];
        if (!t || t.cores.indexOf(w.color) < 0) continue;
        if (!take(k, w.color)) continue;
        w.slot = k; delete w.slotPicked; break;
      }
    });
  });
  return st;
}

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
  return reslot(state);
}

/* ---- ヘルパ ---- */
function Wf(st, x, y, color) {
  const w = st.wires.find(w => ((w.a.id === x && w.b.id === y) || (w.a.id === y && w.b.id === x)) && (!color || w.color === color));
  if (!w) throw new Error(`電線が無い ${x}|${y}:${color || ''}`);
  return w;
}
function termEp(st, t) {
  for (const w of st.wires) { if (w.a.k === 't' && w.a.id === t) return w.a; if (w.b.k === 't' && w.b.id === t) return w.b; }
  throw new Error('端子に電線が無い ' + t);
}
/* 2つの端子の電線を入れ替える（ボックス側の接続・色はそのまま） */
function swapT(st, t1, t2) { const e1 = termEp(st, t1), e2 = termEp(st, t2); e1.id = t2; e2.id = t1; }
function endOf(st, x, y) {
  const w = Wf(st, x, y);
  return w.id + ':' + ((w.a.k === 'jb' && w.a.id === 'jb') ? 'a' : 'b');
}
/* 接続点 ab1 黒4本 ab2 白4本 ab3 イ帰り ab4 ロ帰り ab5 ハ帰り */
const Bd = (st, id) => st.bundles.find(b => b.id === id);
const E = {
  L: (st) => endOf(st, 'src.L', 'jb'), N: (st) => endOf(st, 'src.N', 'jb'),
  Ia: (st) => endOf(st, 'jb', 'ryI.a'), Ib: (st) => endOf(st, 'jb', 'ryI.b'),
  Ra: (st) => endOf(st, 'jb', 'ryRo.a'), Rb: (st) => endOf(st, 'jb', 'ryRo.b'),
  Ha: (st) => endOf(st, 'jb', 'ryHa.a'), Hb: (st) => endOf(st, 'jb', 'ryHa.b'),
  iX: (st) => endOf(st, 'jb', 'ceilI.X'), iW: (st) => endOf(st, 'jb', 'ceilI.W'),
  rX: (st) => endOf(st, 'jb', 'lampRo.X'), rW: (st) => endOf(st, 'jb', 'lampRo.W'),
  hX: (st) => endOf(st, 'jb', 'ceilHa.X'), hW: (st) => endOf(st, 'jb', 'ceilHa.W')
};
function setB(st, id, keys) { Bd(st, id).ends = keys.map(k => E[k](st)); }
const piece = (st, key) => st.pieces.find(p => p.id === st.cables[key]);

/* 通電試験：リレー3個の8通り。各灯は自分のリレーが入のときだけ点く */
const SW = ['ryI', 'ryRo', 'ryHa'], LD = ['ceilI', 'lampRo', 'ceilHa'];
function sim8(st) {
  let ok = true; const txt = [];
  for (let m = 0; m < 8; m++) {
    const s = {}; SW.forEach((id, k) => { s[id] = !!((m >> k) & 1); });
    const r = Engine.simulate(P0, st, s);
    const v = LD.map(id => !!r.lit[id]);
    if (r.shorted || v.some((x, k) => x !== s[SW[k]])) ok = false;
    txt.push(m.toString(2).padStart(3, '0').split('').reverse().join('') + ':' + v.map(x => (x ? 1 : 0)).join('') + (r.shorted ? 'S' : ''));
  }
  return { ok, txt: txt.join(' ') };
}
const joinInfo = (st) => st.bundles.map(b => { const i = Engine.bundleInfo(P0, st, b); return i.method === 'connector' ? 'コネ' + i.count : i.sleeve + '/' + i.mark; }).join(',');

const cases = [];
const T = (desc, expected, build, extra) => cases.push({ desc, expected, build, extra });
const simExtra = (want) => (st) => { const s = sim8(st); return { note: '8通り(イロハ:点灯)=' + s.txt, ok: want == null ? undefined : s.ok === want }; };

/* ================= 合格にすべき例 ================= */
T('模範解答そのまま（8通りで各灯が自分のリレーだけで点く／黒4・白4＝差込形4本用、帰り線3か所＝小・○）', 'pass', () => answerState(P0), (st) => {
  const s = sim8(st), j = joinInfo(st);
  return { note: `8通り=${s.txt} 接続=${j}`, ok: s.ok && j === 'コネ4,コネ4,小/○,小/○,小/○' };
});
T('リレー イ の黒と白を上下入れ替え（公式解答の注記：欠陥としない）', 'pass', () => {
  const st = answerState(P0); swapT(st, 'ryI.a', 'ryI.b'); return st;
}, simExtra(true));
T('リレー イ・ロ・ハ の3組とも黒と白を上下入れ替え', 'pass', () => {
  const st = answerState(P0); SW.forEach(r => swapT(st, r + '.a', r + '.b')); return st;
}, simExtra(true));
T('リレー ロ だけ黒白の上下入れ替え', 'pass', () => {
  const st = answerState(P0); swapT(st, 'ryRo.a', 'ryRo.b'); return st;
}, simExtra(true));
T('接続点の中の並び順・接続点の順番を入れ替え（電気的に同じ）', 'pass', () => {
  const st = answerState(P0);
  st.bundles.forEach(b => b.ends.reverse()); st.bundles.reverse(); return st;
}, simExtra(true));
T('電線の向き（a/b）と並び順を逆にして心線を割りふり直す', 'pass', () => {
  const st = answerState(P0);
  st.wires.forEach(w => { delete w.slot; });
  // 向きを逆にすると線端キーの :a/:b も入れ替わる
  const map = {};
  st.wires.forEach(w => { const t = w.a; w.a = w.b; w.b = t; map[w.id + ':a'] = w.id + ':b'; map[w.id + ':b'] = w.id + ':a'; });
  st.bundles.forEach(b => { b.ends = b.ends.map(e => map[e]); });
  st.wires.reverse();
  return reslot(st);
}, simExtra(true));
T('心線ピッカーで選んだ心線（slotPicked）：イ＝3本目のケーブル、ハ＝1本目のケーブル（各リレー1本ずつ）', 'pass', () => {
  const st = answerState(P0);
  const pick = (t, k) => { const w = Wf(st, 'jb', t); w.slot = 'jb-ry#' + k; w.slotPicked = true; };
  pick('ryI.a', 2); pick('ryI.b', 2); pick('ryRo.a', 1); pick('ryRo.b', 1); pick('ryHa.a', 0); pick('ryHa.b', 0);
  return st;
}, simExtra(true));
T('心線ピッカー（slotPicked）＋リレー ハ の黒白上下入れ替え', 'pass', () => {
  const st = answerState(P0);
  const pick = (t, k) => { const w = Wf(st, 'jb', t); w.slot = 'jb-ry#' + k; w.slotPicked = true; };
  pick('ryI.a', 0); pick('ryI.b', 0); pick('ryRo.a', 1); pick('ryRo.b', 1); pick('ryHa.a', 2); pick('ryHa.b', 2);
  swapT(st, 'ryHa.a', 'ryHa.b');
  return st;
}, simExtra(true));

/* ================= 不合格にすべき例 ================= */
T('電源の黒・白をボックスで逆に（接地側・非接地側の取り違え）', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab1', ['N', 'Ia', 'Ra', 'Ha']); setB(st, 'ab2', ['L', 'iW', 'rW', 'hW']); return st;
}, simExtra(false));
T('帰り線の取り違え：リレー イ の帰り線を ロ へ、リレー ロ の帰り線を イ へ', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab3', ['Rb', 'iX']); setB(st, 'ab4', ['Ib', 'rX']); return st;
}, simExtra(false));
T('端子台の組の取り違え：リレー イ の2端子とリレー ロ の2端子の電線を入れ替え（図2の上から イ・ロ・ハ に反する）', 'fail', () => {
  const st = answerState(P0);
  swapT(st, 'ryI.a', 'ryRo.a'); swapT(st, 'ryI.b', 'ryRo.b'); return st;
}, simExtra(false));
T('リレー イ の帰り線（白）を接地側の白4本に入れる（リレーを入れると短絡）', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab2', ['N', 'iW', 'rW', 'hW', 'Ib']); setB(st, 'ab3', ['iX']); return st;
}, simExtra(false));
T('引掛シーリングローゼット イ の極性逆（W に黒、非接地側に白）', 'fail', () => {
  const st = answerState(P0); swapT(st, 'ceilI.W', 'ceilI.X'); return st;
}, simExtra(false));
T('ランプレセプタクル ロ の受金ねじ部に黒（中心端子に白）', 'fail', () => {
  const st = answerState(P0); swapT(st, 'lampRo.W', 'lampRo.X'); return st;
}, simExtra(false));
T('リレー イ への線の色を逆に（電源から行く線を白、帰り線を黒。端子の位置は模範どおり）：施工条件5②違反', 'fail', () => {
  const st = answerState(P0);
  Wf(st, 'jb', 'ryI.a').color = 'white'; Wf(st, 'jb', 'ryI.b').color = 'black'; return reslot(st);
});
T('常時点灯：イ の黒を電源の黒4本に入れ、リレー イ の2本どうしをつなぐ', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab1', ['L', 'iX', 'Ra', 'Ha']); setB(st, 'ab3', ['Ia', 'Ib']); return st;
}, simExtra(false));
T('混線：リレー ロ・ハ の帰り線と ロ・ハ の黒を1か所（4本）にまとめる', 'fail', () => {
  const st = answerState(P0);
  setB(st, 'ab4', ['Rb', 'rX', 'Hb', 'hX']); st.bundles = st.bundles.filter(b => b.id !== 'ab5'); return st;
}, simExtra(false));
T('施工省略の ハ へのケーブル（jb-ceilHa）を引かず、リレー ハ の帰り線も接続しない', 'fail', () => {
  const st = answerState(P0);
  const drop = ['ceilHa.X', 'ceilHa.W', 'ryHa.b'].map(t => Wf(st, 'jb', t).id);
  st.wires = st.wires.filter(w => !(w.b.id === 'ceilHa.X' || w.b.id === 'ceilHa.W'));
  setB(st, 'ab2', ['N', 'iW', 'rW']);
  st.bundles = st.bundles.filter(b => b.id !== 'ab5');
  delete st.cables['jb-ceilHa#0'];
  st.pieces = st.pieces.filter(p => Object.values(st.cables).indexOf(p.id) >= 0);
  void drop; return st;
});
T('施工条件3違反：リレー イ・ロ に2本のケーブルから心線（心線ピッカーで選択。イ＝1本目の黒＋2本目の白、ロ＝2本目の黒＋1本目の白）', 'fail', () => {
  const st = answerState(P0);
  const pick = (t, k) => { const w = Wf(st, 'jb', t); w.slot = 'jb-ry#' + k; w.slotPicked = true; };
  pick('ryI.a', 0); pick('ryI.b', 1); pick('ryRo.a', 1); pick('ryRo.b', 0); pick('ryHa.a', 2); pick('ryHa.b', 2);
  return st;
}, simExtra(true));
T('施工条件3違反（一部だけ心線ピッカーで選択）：イ の黒＝1本目、ロ の白＝1本目 を選び、残りはアプリの自動割りふり（イ の白・ロ の黒は2本目へ回る）', 'fail', () => {
  const st = answerState(P0);
  st.wires.forEach(w => { if (/^ry(I|Ro)\./.test(w.b.id)) { delete w.slot; delete w.slotPicked; } });
  const pick = (t, k) => { const w = Wf(st, 'jb', t); w.slot = 'jb-ry#' + k; w.slotPicked = true; };
  // ハ は自分のケーブル（3本目）を明示
  pick('ryHa.a', 2); pick('ryHa.b', 2);
  pick('ryI.a', 0); pick('ryRo.b', 0);
  reslot(st);
  const where = ['ryI.a', 'ryI.b', 'ryRo.a', 'ryRo.b'].map(t => { const w = Wf(st, 'jb', t); return t + '=' + w.slot + (w.slotPicked ? '(選)' : '(自動)'); }).join(' ');
  st._where = where;
  return st;
}, (st) => ({ note: '心線の割りふり ' + st._where }));
T('施工条件3違反（ケーブルをクリックして引いた心線＝利用者が選んだケーブル。slotPicked が付く）：イ＝1本目の黒＋2本目の白、ロ＝2本目の黒＋1本目の白', 'fail', () => {
  const st = answerState(P0);
  const put = (t, k) => { const w = Wf(st, 'jb', t); w.slot = 'jb-ry#' + k; w.slotPicked = true; };
  put('ryI.a', 0); put('ryI.b', 1); put('ryRo.a', 1); put('ryRo.b', 0); put('ryHa.a', 2); put('ryHa.b', 2);
  reslot(st);
  st._where = ['ryI.a', 'ryI.b', 'ryRo.a', 'ryRo.b'].map(t => t + '=' + Wf(st, 'jb', t).slot).join(' ');
  return st;
}, (st) => ({ note: '心線の割りふり（reassignSlots 後も保持）' + st._where }));
T('施工条件3違反：リレー イ の2端子とも黒（帰り線に別ケーブルの黒）', 'fail', () => {
  const st = answerState(P0); Wf(st, 'jb', 'ryI.b').color = 'black'; return reslot(st);
});
T('ケーブルの取り違え：リレー行きの1本を VVF1.6-3C に', 'fail', () => {
  const st = answerState(P0); piece(st, 'jb-ry#0').type = 'vvf16-3c'; return reslot(st);
});
T('ケーブルの取り違え：電源–ボックスに VVF1.6-2C（VVR2.0-2C を使わない）', 'fail', () => {
  const st = answerState(P0); piece(st, 'src-jb#0').type = 'vvf16-2c'; return reslot(st);
}, (st) => ({ note: '接続=' + joinInfo(st) }));
T('切断寸法の誤り：VVR2.0-2C を 300mm（電源側は切りっぱなしなので 200＋50＝250mm）', 'fail', () => {
  const st = answerState(P0); piece(st, 'src-jb#0').len = 300; return st;
});
T('切断寸法の誤り：施工省略の ハ へ 250mm（150＋50＝200mm）', 'fail', () => {
  const st = answerState(P0); piece(st, 'jb-ceilHa#0').len = 250; return st;
});
T('切断寸法の誤り：リレー行きを 300mm（250＋50＋50＝350mm）', 'fail', () => {
  const st = answerState(P0); piece(st, 'jb-ry#1').len = 300; return st;
});
T('支給超過の切断：VVF1.6-2C を余分に 300mm（合計 2250mm＞支給 2200mm、区間には置かない）', 'fail', () => {
  const st = answerState(P0); st.pieces.push({ id: 'extra1', type: 'vvf16-2c', len: 300 }); return st;
});
T('1本の支給ケーブルから取れない切り方：余分に 250mm（合計 2200mm ちょうどだが 1100mm×2本 に分けられない）', 'fail', () => {
  const st = answerState(P0); st.pieces.push({ id: 'extra2', type: 'vvf16-2c', len: 250 }); return st;
});
T('配線図に無い区間：電源から直接リレー イ へ', 'fail', () => {
  const st = answerState(P0);
  st.wires.push({ id: 'x1', a: { k: 't', id: 'src.L' }, b: { k: 't', id: 'ryI.a' }, color: 'black' });
  return st;
});
T('施工省略の ハ：ケーブル端の「接地側W」に黒（帰り線）、「非接地側」に白（N）を付ける（アプリの端子表示で判定）', 'fail', () => {
  const st = answerState(P0); swapT(st, 'ceilHa.W', 'ceilHa.X'); return st;
}, simExtra(false));

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
