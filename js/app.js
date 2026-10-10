/* ===========================================================
   app.js — 画面制御（操作・採点表示・保存）
   =========================================================== */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const COLOR_JA = { black: '黒', white: '白', red: '赤', green: '緑' };

  let problem = null;
  let state = null;
  let history = [];
  let future = [];
  let savedWork = null;
  let showingAnswer = false;

  const view = {
    color: 'black',
    selectedWire: null,
    selectedBundle: null,
    selectedEnds: new Set(),
    pending: null,
    cursor: null,
    hover: null,
    showLabels: true,
    powerMode: true,   // 通電の色分け・流れの表示はつねにON
    focus: null,
    sim: null,
    viewBox: null,
    dragCable: null,     // ドラッグ中の「切ったケーブル」のid
    pickCable: null,     // クリックで持ち上げている「切ったケーブル」のid
    pickRoll: null,      // えらんだ支給ケーブル（長いまま）の種別
    cutPicker: null,     // ケーブルを切るダイアログ {type, key}
    selectedSlot: null,  // 選択中のケーブル置き場
    corePicker: null,    // 心線えらびを開いているケーブル {key,color}
    pickedCores: [],     // えらんだ心線 [{slot,color,term}]
    pickBox: null,       // えらんだ心線が集まるジョイントボックス
    pickTerm: null,      // つなぎ先にえらんだ端子
    selectedLink: null,  // えらんだ「つなぎ目」（接続点との1本／端子との1本）
    hintSlot: null,      // 「ここにケーブルが要る」と光らせる区間
    wsZoom: 1            // スマホだけ：作業エリアを描く大きさ（1＝基本の幅 PHONE_W、'fit'＝枠に全体を収める）
  };

  /* ---------------- スマホ（縦・横）の作業エリア（2026-10-10） ----------------
     スマホでは作業エリアを画面の幅に縮めず、基本の幅 PHONE_W で描いて、枠（.ws-scroll）の中で左右にスクロールする。
     文字・札・端子は「画面上で何px」で描くので、狭く縮めると相対的に大きくなって重なる。幅を保てばタブレット並みに重ならない。
     ＋／－は描く大きさを段階で変え（ZOOMS）、「全体」は枠に全体を収める。css/style.css の同じ条件（PHONE_MQ）と対。
     タブレット・パソコンでは何もしない（.ws-scroll は display:contents、svg の大きさは CSS のまま）。 */
  const PHONE_MQ = '(max-width: 699px), (max-height: 500px) and (max-width: 1000px)';
  const PHONE_W = 700;
  const ZOOMS = [1, 1.4, 1.9];
  function isPhone() { return !!(window.matchMedia && window.matchMedia(PHONE_MQ).matches); }
  function wsScroller() { const ws = $('#workspace'); return ws && ws.parentNode && ws.parentNode.classList && ws.parentNode.classList.contains('ws-scroll') ? ws.parentNode : null; }
  // 作業エリアの svg の大きさ（px）を決める。スマホ以外では CSS に任せる（何も書かない）
  function sizeWorkspace() {
    const ws = $('#workspace');
    const sc = wsScroller();
    if (!ws) return;
    if (!sc || !isPhone()) {
      if (ws.style.width || ws.style.height) { ws.style.width = ''; ws.style.height = ''; }
      return;
    }
    const b = baseBox();
    const availW = sc.clientWidth || (sc.parentNode && sc.parentNode.clientWidth) || 340;
    let w;
    if (view.wsZoom === 'fit') {
      // 横向きは枠の高さにも収める（縦向きは枠の高さが図に合わせて決まるので幅だけ）
      const landscape = window.matchMedia('(max-height: 500px)').matches;
      const availH = landscape ? sc.clientHeight : 0;
      w = availH > 40 ? Math.min(availW, availH * b.w / b.h) : availW;
    } else {
      w = Math.max(availW, Math.round(PHONE_W * (+view.wsZoom || 1)));
    }
    w = Math.floor(w);
    const h = Math.round(w * b.h / b.w);
    if (ws.style.width !== w + 'px') ws.style.width = w + 'px';
    if (ws.style.height !== h + 'px') ws.style.height = h + 'px';
  }
  // スマホの拡大・縮小：大きさを変えても、いま見ている所（指定があればその点）が枠の真ん中に来るようにする
  function phoneZoomTo(z, focusPt) {
    const sc = wsScroller();
    const ws = $('#workspace');
    if (!sc || !ws) return;
    const b = baseBox();
    const oldW = ws.clientWidth || 1, oldH = ws.clientHeight || 1;
    let fx, fy;   // 図の中の割合（0〜1）
    if (focusPt) { fx = (focusPt.x - b.x) / b.w; fy = (focusPt.y - b.y) / b.h; }
    else { fx = (sc.scrollLeft + sc.clientWidth / 2) / oldW; fy = (sc.scrollTop + sc.clientHeight / 2) / oldH; }
    view.wsZoom = z;
    view.viewBox = null;
    draw();
    const nw = ws.clientWidth, nh = ws.clientHeight;
    sc.scrollLeft = Math.max(0, fx * nw - sc.clientWidth / 2);
    sc.scrollTop = Math.max(0, fy * nh - sc.clientHeight / 2);
  }
  function phoneZoomStep(dir) {
    const cur = view.wsZoom === 'fit' ? 0 : ZOOMS.indexOf(+view.wsZoom);
    const idx = view.wsZoom === 'fit' ? (dir > 0 ? 0 : -1) : Math.max(-1, Math.min(ZOOMS.length - 1, (cur < 0 ? 0 : cur) + dir));
    phoneZoomTo(idx < 0 ? 'fit' : ZOOMS[idx]);
    const zl = view.wsZoom === 'fit' ? '全体' : Math.round(100 * view.wsZoom) + '%';
    toast(view.wsZoom === 'fit' ? '図の全体を表示しています（＋で大きく）' : `図の大きさ ${zl}（指で左右に動かせます）`);
  }

  /* ---------------- 状態 ---------------- */
  function emptyState(p) {
    const sw = {};
    Engine.switchables(p).forEach(d => { sw[d.id] = false; });
    return { wires: [], bundles: [], switches: sw, cables: {}, pieces: [], power: false, seq: 1 };
  }

  const snapshot = () => JSON.stringify({
    wires: state.wires, bundles: state.bundles, cables: state.cables, pieces: state.pieces, seq: state.seq
  });
  function pushHistory() {
    if (showingAnswer) return;   // 模範解答の操作は履歴に混ぜない
    history.push(snapshot());
    if (history.length > 120) history.shift();
    future.length = 0;
  }
  function restore(json) {
    const o = sanitize(json);
    if (!o) return false;
    state.wires = o.wires; state.bundles = o.bundles; state.cables = o.cables;
    state.pieces = o.pieces; state.seq = o.seq;
    view.selectedWire = view.selectedBundle = view.selectedSlot = view.selectedLink = null;
    view.pickedCores = []; view.pickBox = null; view.pickTerm = null;
    view.selectedEnds.clear();
    return true;
  }

  /* 保存データを検証して安全な形に直す（壊れていたら null） */
  function sanitize(json) {
    let o;
    try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { return null; }
    if (!o || typeof o !== 'object') return null;
    const okEp = (e) => e && typeof e.id === 'string' && (
      e.k === 'jb' ? !!Engine.deviceOf(problem, e.id)
        : e.k === 'g' ? problem.devices.some(d => d.group === e.id)
        : e.k === 't' ? !!Engine.terminalRef(problem, e.id)
        : false);
    const wires = (Array.isArray(o.wires) ? o.wires : []).filter(w =>
      w && typeof w.id === 'string' && okEp(w.a) && okEp(w.b) && ['black', 'white', 'red', 'green'].indexOf(w.color) >= 0);
    const ids = new Set(wires.map(w => w.id));
    const bundles = (Array.isArray(o.bundles) ? o.bundles : []).filter(b =>
      b && typeof b.id === 'string' && Engine.deviceOf(problem, b.jb) && Array.isArray(b.ends))
      .map(b => ({ id: b.id, jb: b.jb, ends: b.ends.filter(e => typeof e === 'string' && ids.has(e.split(':')[0])) }))
      .filter(b => b.ends.length >= 1);
    // 切り出したケーブル（ピース）
    const pieces = (Array.isArray(o.pieces) ? o.pieces : []).filter(pc =>
      pc && typeof pc.id === 'string' && Engine.cableType(pc.type) &&
      typeof pc.len === 'number' && pc.len > 0);
    const pieceIds = new Set(pieces.map(pc => pc.id));
    const cables = {};
    const usedPiece = new Set();
    const rawCables = (o.cables && typeof o.cables === 'object') ? o.cables : {};
    Object.keys(rawCables).forEach(k => {
      const [rid, idx] = String(k).split('#');
      const run = Engine.runById(problem, rid);
      const i = parseInt(idx, 10);
      if (!run || !(i >= 0) || i >= (run.slots || 0)) return;
      const pid = rawCables[k];
      if (!pieceIds.has(pid) || usedPiece.has(pid)) return;   // 1本を2か所には置けない
      usedPiece.add(pid);
      cables[k] = pid;
    });
    let seq = Number(o.seq);
    if (!isFinite(seq) || seq < 1) seq = 1;
    const maxNum = (arr) => arr.reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D+/g, ''), 10) || 0), 0);
    seq = Math.max(seq, maxNum(wires) + 1, maxNum(bundles) + 1, maxNum(pieces) + 1);
    return { wires, bundles, cables, pieces, seq };
  }

  const storageKey = () => 'fukusenzu:' + problem.id;
  function save() {
    if (showingAnswer) return;   // 模範解答の表示中は自分の配線を上書きしない
    try { localStorage.setItem(storageKey(), snapshot()); } catch (e) { /* noop */ }
  }
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(storageKey()); } catch (e) { return; }
    if (!raw) return;
    if (!restore(raw)) {
      try { localStorage.removeItem(storageKey()); } catch (e) { /* noop */ }
      setTimeout(() => toast('保存されていた配線が読めなかったため、最初からにしました'), 400);
      return;
    }
    // ケーブルを切る工程が無かったころの保存データ（pieces という項目そのものが無い）：正しく切って置いた状態にしておく。
    // いまの形式で「渡り線だけ引いた」ような状態を読み込んだときに誤って動かないよう、項目の有無で見分ける
    let legacy = false;
    try { const o = JSON.parse(raw); legacy = !!o && !Array.isArray(o.pieces); } catch (e) { legacy = false; }
    if (legacy && state.wires.length && !Object.keys(state.cables).length) {
      (problem.runs || []).forEach(run => {
        if (!run.slots) return;
        for (let i = 0; i < run.slots; i++) {
          const pc = { id: 'c' + (state.seq++), type: Engine.slotNeed(run, i), len: run.cut || 0 };
          state.pieces.push(pc);
          state.cables[Engine.slotKey(run, i)] = pc.id;
        }
      });
      setTimeout(() => toast('前回の配線には、区間ごとの正しいケーブルをあらかじめ切って置きました'), 500);
    }
  }

  /* ---------------- 参照ヘルパ ---------------- */
  const parseEp = (s) => (String(s).indexOf('.') >= 0 ? { k: 't', id: s } : { k: 'jb', id: s });
  const sameEp = (a, b) => a.k === b.k && a.id === b.id;

  function terminalMax(t, dev) {
    if (t.max) return t.max;
    if (t.kind === 'sw-com' || t.kind === 'outlet-l' || t.kind === 'outlet-n' ||
        t.kind === 'tb-l' || t.kind === 'tb-n') return 2;
    if (dev && dev.poleSwap && t.kind === 'sw-load') return 2;   // 片切は無極性
    return 1;
  }
  function wiresAtTerminal(tid) {
    return state.wires.filter(w => (w.a.k === 't' && w.a.id === tid) || (w.b.k === 't' && w.b.id === tid));
  }
  function wiresInRun(ga, gb) {
    return state.wires.filter(w => {
      const a = Engine.groupOfEndpoint(problem, w.a), b = Engine.groupOfEndpoint(problem, w.b);
      return (a === ga && b === gb) || (a === gb && b === ga);
    });
  }

  /* 引きかけ中、クリック位置のいちばん近い「つなげる先」を探す */
  function pendingGroupOf() {
    const p = view.pending;
    if (!p) return null;
    if (p.k === 'jb') return p.id;
    if (p.k === 'b') return jbOfBundle(p.id);
    const t = Engine.terminalRef(problem, p.id);
    return t ? t.device.group : null;
  }

  function nearestTarget(pt) {
    const fromGroup = pendingGroupOf();
    if (!fromGroup || !pt) return null;
    let best = null, bestD = Infinity;
    problem.devices.forEach(d => {
      if (d.group === fromGroup) return;
      if (!Engine.runFor(problem, fromGroup, d.group)) return;
      if (d.type === 'jointbox') {
        const dist = Math.max(0, Math.hypot(pt.x - d.x, pt.y - d.y) - d.r);
        if (dist < bestD) { bestD = dist; best = { k: 'jb', id: d.id }; }
      } else {
        (d.terminals || []).forEach(t => {
          const dist = Math.hypot(pt.x - (d.x + t.dx), pt.y - (d.y + t.dy));
          if (dist < bestD) { bestD = dist; best = { k: 't', id: d.id + '.' + t.id }; }
        });
      }
    });
    return bestD <= 80 ? best : null;
  }

  /* あるボックスに入っている線端 */
  function endsOfBox(jbId) {
    const out = [];
    state.wires.forEach(w => ['a', 'b'].forEach(side => {
      const ep = side === 'a' ? w.a : w.b;
      if (ep.k === 'jb' && ep.id === jbId) {
        out.push({ key: w.id + ':' + side, wire: w, other: side === 'a' ? w.b : w.a });
      }
    }));
    return out;
  }

  /* 線端・接続点が属するジョイントボックス */
  function jbOfEnd(key) {
    const [wid, side] = String(key).split(':');
    const w = state.wires.find(x => x.id === wid);
    if (!w) return null;
    const ep = side === 'a' ? w.a : w.b;
    return ep.k === 'jb' ? ep.id : null;
  }
  function jbOfBundle(id) {
    const b = state.bundles.find(x => x.id === id);
    return b ? b.jb : null;
  }

  /* 端子の役割から、使うべき電線の色が決まるか */
  function requiredColor(ep) {
    if (!ep || ep.k !== 't') return null;
    const t = Engine.terminalRef(problem, ep.id);
    if (!t) return null;
    if (t.terminal && t.terminal.color) return t.terminal.color;   // 端子ごとに色が決まっているもの（三相の相別など）
    // 極性の無い負荷（同時点滅の確認表示灯など）は色を決めない
    if (t.device.poleSwap && (t.kind === 'load-n' || t.kind === 'load-x')) return null;
    if (t.kind === 'source-n' || t.kind === 'load-n' || t.kind === 'outlet-n' || t.kind === 'tb-n') return 'white';
    if (t.kind === 'source-l' || t.kind === 'outlet-l' || t.kind === 'tb-l') return 'black';
    if (t.kind === 'earth') return 'green';
    return null;
  }

  /* ---------------- 経路（どのボックスを経由するか） ---------------- */
  function routeBetween(ga, gb) {
    if (!ga || !gb || ga === gb) return null;
    const jbGroups = new Set(problem.devices.filter(d => d.type === 'jointbox').map(d => d.group));
    const adj = {};
    problem.runs.forEach(r => {
      if (r.a === r.b) return;
      (adj[r.a] = adj[r.a] || []).push(r.b);
      (adj[r.b] = adj[r.b] || []).push(r.a);
    });
    const prev = {}, seen = new Set([ga]), q = [ga];
    while (q.length) {
      const cur = q.shift();
      if (cur === gb) break;
      (adj[cur] || []).forEach(nx => {
        if (seen.has(nx)) return;
        if (nx !== gb && !jbGroups.has(nx)) return;   // 経由できるのはジョイントボックスだけ
        seen.add(nx); prev[nx] = cur; q.push(nx);
      });
    }
    if (!seen.has(gb)) return null;
    const path = [gb];
    let c = gb;
    while (c !== ga) { c = prev[c]; if (!c) return null; path.unshift(c); }
    return path;
  }

  /* 「①電源N→ボックスA ②ボックスA→…」という手順文を作る */
  function routeSteps(path, fromEp, toEp) {
    const nameAt = (g, i) => {
      if (i === 0 && fromEp) return Engine.endpointLabel(problem, fromEp);
      if (i === path.length - 1 && toEp) return Engine.endpointLabel(problem, toEp);
      return Engine.groupLabel(problem, g);
    };
    const out = [];
    for (let i = 0; i < path.length - 1; i++) {
      out.push(`${'①②③④⑤'[i] || (i + 1) + '.'} ${nameAt(path[i], i)} → ${nameAt(path[i + 1], i + 1)}`);
    }
    return out;
  }

  /* ---------------- 電線の作成 ---------------- */
  /* 接続点（bundle）を端点に指定できる。実体はそのボックス内の線端になる */
  function resolveEp(ep) {
    if (!ep) return null;
    if (ep.k !== 'b') return ep;
    const b = state.bundles.find(x => x.id === ep.id);
    return b ? { k: 'jb', id: b.jb, joinBundle: b.id } : null;
  }

  function tryCreateWire(rawFrom, rawTo) {
    const from = resolveEp(rawFrom), to = resolveEp(rawTo);
    if (!from || !to) return;
    // 接続点を選んだまま、そのボックス自体をクリックした場合は
    // 「このボックスから新しい電線を引く」に切り替える
    if (from.k === 'jb' && to.k === 'jb' && from.id === to.id) {
      if (rawFrom && rawFrom.k === 'b') {
        view.pending = { k: 'jb', id: to.id };
        view.selectedBundle = null;
        setStatus(`${Engine.endpointLabel(problem, to)} から ${COLOR_JA[view.color]}線を引きます。つなぎ先をクリック。`);
      } else {
        setStatus('電線を引くのをやめました。');
      }
      draw();
      return;
    }
    return createWire(from, to);
  }

  /* ---------------- 区間のケーブル（支給材料） ---------------- */
  const slotRun = (key) => Engine.runById(problem, String(key).split('#')[0]);
  const cableAt = (key) => { const pc = Engine.slotPiece(state, key); return pc ? Engine.cableType(pc.type) : null; };
  const pieceAt = (key) => Engine.slotPiece(state, key);
  const mm = (n) => n + 'mm';
  const coresJa = (type) => type.cores.map(c => COLOR_JA[c]).join('・');

  /* その区間で、いま使える心線の色（残っているもの） */
  function freeColorsOf(run) {
    return Engine.freeCores(problem, state, run).map(c => COLOR_JA[c]);
  }

  function cableSummary(run) {
    const cap = Engine.runCapacity(problem, state, run);
    if (!cap) return '';
    if (!cap.placed) return `<b>${Engine.runName(problem, run)}</b> にはまだケーブルがありません。`;
    const list = Engine.placedCables(state, run).map(c => c.name).join(' ＋ ');
    const free = freeColorsOf(run);
    return `<b>${Engine.runName(problem, run)}</b>：${list}。` +
      (free.length ? `いま使える心線は <b>${free.join('・')}</b>。` : 'この区間の心線は使い切りました。');
  }

  /* 切り出したケーブル（ピース）を区間に置く */
  function placePiece(key, pieceId) {
    if (answerGuard()) return;
    const run = slotRun(key);
    const pc = Engine.pieceOf(state, pieceId);
    if (!run || !pc) return;
    const type = Engine.cableType(pc.type);
    if (!type) return;
    if (state.cables[key] === pieceId) { toast('このケーブルはもうここに置いてあります'); return; }
    // ほかの区間に置いてあるものは動かさない
    const usedElsewhere = Object.keys(state.cables).some(k => k !== key && state.cables[k] === pieceId);
    if (usedElsewhere) { toast('このケーブルは別の区間で使っています'); return; }
    pushHistory();
    let dropped = 0;
    const cur = state.cables[key];
    if (cur) dropped = dropWiresOfRunIfNeeded(run, key, pc.type);   // 置き換えると心線は入らなくなる
    state.cables[key] = pieceId;
    view.selectedSlot = key;
    view.hintSlot = null;
    view.pickCable = null; view.dragCable = null;
    view.corePicker = null;   // 置いたら一覧は閉じる（つぎの枠が隠れないように）
    const okLen = !run.cut || pc.len === run.cut;
    setStatus(`<b>${Engine.runName(problem, run)}</b> に <b>${type.name}（${mm(pc.len)}）</b> を置きました。` +
      `この区間で使える心線は <b>${coresJa(type)}</b> です。` +
      (okLen ? '' : `<br><span style="color:var(--bad)">※この区間は <b>${mm(run.cut)}</b> です（図の寸法 ${mm(run.span)} ＋ 接続・結線するぶん）</span>`) +
      (dropped ? `<br><span style="color:var(--warn)">取り替えたので、この区間の電線 ${dropped}本は外しました（⌘Zで戻せます）</span>` : '') +
      `<br>つぎは、<b>ケーブルをタップして心線（色）をえらび</b>、もう1本えらんで<b>「接続する」</b>。`, okLen ? '' : 'bad');
    toast(`${type.name}（${mm(pc.len)}）を置きました`);
    afterChange();
  }

  /* ---------------- ケーブルを切る ---------------- */
  /* 選んだ長さが正しいかを判定し、ちがうときは理由を返す */
  /* 切る長さ＝図の寸法＋「接続・結線する端」ごとに 50mm。
     電源側と施工省略側は切りっぱなしなので足さない */
  function cutReason(run, len) {
    const right = run.cut, span = run.span;
    if (len === right) return null;
    const add = right - span;   // 足すぶんの合計（0 / 50 / 100）
    if (len === span) {
      return `<b>${mm(len)}</b> は図に書いてある寸法そのままです。` +
        `ジョイントボックスの中で接続するぶんや、器具に結線するぶん（<b>片側50mm</b>）が足りません。`;
    }
    if (len < right) {
      return `<b>${mm(len)}</b> では足りません。図の寸法 ${mm(span)} に、` +
        `<b>接続・結線する端ごとに50mm</b>（この区間は合計 ${mm(add)}）を足します。`;
    }
    return `<b>${mm(len)}</b> は長すぎます。足すのは<b>端ごとに50mm</b>までです` +
      `（電源側や施工省略側は切りっぱなしなので足しません）。あとの区間のぶんが足りなくなります。`;
  }

  /* その区間の長さの選択肢（正解1つ＋まぎらわしいもの） */
  function cutChoices(run) {
    const right = run.cut, span = run.span;
    const cand = [span, span + 50, span + 100, span + 200];
    const rest = [];
    cand.forEach(v => { if (v > 0 && v !== right && rest.indexOf(v) < 0) rest.push(v); });
    return [right].concat(rest.slice(0, 3)).sort((a, b) => a - b);
  }

  function cutPiece(typeId, runId, i, len) {
    if (answerGuard()) return false;
    const run = Engine.runById(problem, runId);
    const type = Engine.cableType(typeId);
    if (!run || !type) return false;
    const why = cutReason(run, len);
    if (why) {
      toast('その長さでは切れません');
      setStatus(`<b>${Engine.runName(problem, run)}</b>：${why}<br>` +
        `<small>この区間の図の寸法は <b>${mm(run.span)}</b> です。もう一度えらんでください。</small>`, 'bad');
      return false;
    }
    const st = Engine.cableStock(problem, state)[typeId];
    if (st && !Engine.canCut(problem, state, typeId, len)) {
      const split = st.left >= len;   // 合計は足りるが、どう分けても1本ずつからは取れない
      toast(`${type.name} の残りが足りません`);
      setStatus(`<b>${type.name}</b> の残りは <b>${mm(st.left)}</b>` +
        (split ? `（${st.count}本に分かれていて、これまでに切った長さと合わせると、どう分けても1本から ${mm(len)} を取れません）` : '') +
        ` です。${mm(len)} は切り出せません。<br>` +
        `<small>切りすぎた分は、切ったケーブルを区間から外しても戻りません。<b>「1からやり直す」</b>か <kbd>⌘Z</kbd> で戻してください。</small>`, 'bad');
      return false;
    }
    pushHistory();
    const pc = { id: 'c' + (state.seq++), type: typeId, len };
    state.pieces.push(pc);
    const left = Engine.cableStock(problem, state)[typeId];
    setStatus(`<b>${type.name}</b> を <b>${mm(len)}</b> で切りました` +
      `（${Engine.runName(problem, run)} ぶん）。残り <b>${mm(left ? left.left : 0)}</b>。<br>` +
      `図の点線の枠をタップして、切ったケーブルを置きます。`);
    toast(`${type.name} を ${mm(len)} で切りました`);
    afterChange();
    return true;
  }

  /* ケーブルを外す・取り替えるとき、そのケーブルに入っていた心線だけを外す
     （同じ区間にもう1本ケーブルがあるときは、そちらの心線は残す） */
  function dropWiresOfRunIfNeeded(run, key, nextType) {
    const ws = Engine.wiresOfRun(problem, state, run);
    if (!ws.length) return 0;
    const cables = [];
    for (let i = 0; i < (run.slots || 0); i++) {
      const k = Engine.slotKey(run, i);
      const t = k === key ? Engine.cableType(nextType) : cableAt(k);
      if (t) cables.push({ k, cores: t.cores, used: {} });
    }
    const keep = new Set();
    ws.forEach(w => {
      if (w.slot === key) return;   // 外す（取り替える）ケーブルの心線
      const c = cables.find(x => (w.slot ? x.k === w.slot : true) &&
        x.cores.indexOf(w.color) >= 0 && !x.used[w.color]);
      if (c) { c.used[w.color] = true; w.slot = c.k; keep.add(w.id); }
    });
    const gone = ws.filter(w => !keep.has(w.id));
    if (!gone.length) return 0;
    const ids = new Set(gone.map(w => w.id));
    state.wires = state.wires.filter(w => !ids.has(w.id));
    state.bundles.forEach(b => { b.ends = b.ends.filter(e => !ids.has(e.split(':')[0])); });
    state.bundles = state.bundles.filter(b => b.ends.length >= 1);
    return gone.length;
  }

  function removeCable(key) {
    if (answerGuard()) return;
    const run = slotRun(key);
    const type = cableAt(key);
    if (!run || !type) return;
    pushHistory();
    const n = dropWiresOfRunIfNeeded(run, key, null);
    delete state.cables[key];
    view.selectedSlot = null;
    setStatus(`<b>${Engine.runName(problem, run)}</b> の ${type.name} を外しました` +
      (n ? `（この区間の電線 ${n}本もいっしょに外しました）` : '') + '。⌘Zで戻せます。');
    toast('ケーブルを外しました（⌘Zで戻せます）');
    afterChange();
  }

  /* その電線の、指定ボックス側の線端キー（なければ null） */
  function endKeyAt(w, boxId) {
    if (w.a.k === 'jb' && w.a.id === boxId) return w.id + ':a';
    if (w.b.k === 'jb' && w.b.id === boxId) return w.id + ':b';
    return null;
  }
  const endIsFree = (k) => !!k && !state.bundles.some(b => b.ends.indexOf(k) >= 0);

  /* すでに引いてある電線を、接続点に取り込む
     （3心ケーブルのように、先に区間の電線を引いてから接続点に加えたいとき）
     新しい電線は増やさない。取り込めたら true */
  function attachExisting(from, to, ga, gb, run) {
    const sides = [];
    if (from.k === 'jb' && from.joinBundle) sides.push({ box: from.id, bundle: from.joinBundle });
    if (to.k === 'jb' && to.joinBundle) sides.push({ box: to.id, bundle: to.joinBundle });
    if (!sides.length) return false;

    let cands = wiresInRun(ga, gb).filter(w => sides.every(s => endIsFree(endKeyAt(w, s.box))));
    if (!cands.length) return false;
    const sameColor = cands.filter(w => w.color === view.color);
    if (sameColor.length) cands = sameColor;

    if (cands.length > 1) {
      toast('この区間には電線が数本あります。つなぎたい線端をクリックしてください');
      setStatus(
        `<b>${Engine.runName(problem, run)}</b> には、まだ接続点に入っていない電線が <b>${cands.length}本</b> あります。<br>` +
        `どれをつなぐか決めるため、<b>ボックスの中のその線端をクリック</b>してから<b>接続点をクリック</b>してください。`, 'bad');
      view.pending = null; view.cursor = null;
      draw();
      return true;
    }

    const w = cands[0];
    pushHistory();
    let n = 0;
    sides.forEach(s => {
      const b = state.bundles.find(x => x.id === s.bundle);
      const k = endKeyAt(w, s.box);
      if (b && k && b.ends.indexOf(k) < 0) { b.ends.push(k); n++; }
    });
    view.pending = null; view.cursor = null;
    view.selectedBundle = null; view.selectedEnds.clear();
    setStatus(
      `すでに引いてある電線（${Engine.wireLabel(problem, w)}）を` +
      `${n > 1 ? '<b>両方の接続点</b>' : '<b>この接続点</b>'}につなぎました。` +
      `<b>電線は増やしていません</b>（1つの区間に通せるのはケーブル1本ぶんの心線だけです）。`);
    toast('すでにある電線を接続点につなぎました');
    afterChange();
    return true;
  }

  function createWire(from, to) {
    if (sameEp(from, to)) {   // 同じ場所を2回 → 取り消し（ダブルクリックの拡大と競合させない）
      setStatus('電線を引くのをやめました。');
      draw();
      return;
    }
    if (answerGuard()) return;

    // 施工条件と色が違うときは知らせるだけ（選んだ色は変えない）
    pendingNote = '';
    const need = requiredColor(from) || requiredColor(to);
    if (need && view.color !== need) {
      pendingNote = need === 'white'
        ? `<span style="color:var(--warn)">※接地側には施工条件で<b>白線</b>を使います（いまは${COLOR_JA[view.color]}線）</span>`
        : `<span style="color:var(--warn)">※電源の非接地側には施工条件で<b>黒線</b>を使います（いまは${COLOR_JA[view.color]}線）</span>`;
    }

    const ga = Engine.groupOfEndpoint(problem, from);
    const gb = Engine.groupOfEndpoint(problem, to);
    const run = Engine.runFor(problem, ga, gb);
    if (!run) {
      const path = routeBetween(ga, gb);
      if (path && path.length > 2) {
        const boxes = path.slice(1, -1).map(g => Engine.groupLabel(problem, g)).join('・');
        const steps = routeSteps(path, from, to);
        setStatus(
          `この2か所の間には <b>${boxes}</b> があります。ケーブルはボックスで区切るので、` +
          `<b>${steps.length}本</b>に分けてつなぎます：<br>` + steps.join('　') +
          `<br>→ いまは <b>${Engine.endpointLabel(problem, from)}</b> を選んだままです。つぎは <b>${Engine.groupLabel(problem, path[1])}</b> をクリック。`,
          'bad');
        toast(`${boxes} を経由します。まず ${Engine.groupLabel(problem, path[1])} をクリック`);
        view.pending = from.joinBundle ? { k: 'b', id: from.joinBundle } : from;
        draw();
        return;
      }
      toast('配線図では、この2か所はつながっていません');
      setStatus('配線図をよく見て、線が引かれている区間だけをつなぎます。', 'bad');
      return;
    }
    const cap = Engine.runCapacity(problem, state, run);
    const runLabel = Engine.runName(problem, run);

    /* ケーブルを置く前は、心線を引けない */
    if (cap && !cap.placed) {
      view.hintSlot = run.id;
      view.pending = null; view.cursor = null;
      view.selectedSlot = null;
      toast('先に、この区間のケーブルを選びます');
      setStatus(
        `<b>${runLabel}</b> には、まだ<b>ケーブルがありません</b>。<br>` +
        `図の<b>光っている点線の枠をタップ</b>すると、置けるケーブルの一覧が出ます` +
        `（上の材料からドラッグしても置けます）。<br>` +
        `<small>この区間に心線が<b>何本</b>必要かを単線図から考えて選びます。迷ったら「つぎに何をする？」</small>`, 'bad');
      draw();
      return;
    }

    if (cap) {
      const inRun = wiresInRun(ga, gb);
      const freeColors = Object.keys(cap.byColor)
        .filter(c => inRun.filter(w => w.color === c).length < cap.byColor[c])
        .map(c => COLOR_JA[c]);

      if (inRun.length >= cap.total) {
        // 「もう1本引く」のではなく「すでにある電線をこの接続点につなぐ」だった場合
        if (attachExisting(from, to, ga, gb, run)) return;
        toast(`${runLabel} は ${cap.total}心。もう空きがありません`);
        setStatus(
          `<b>${runLabel}</b> に置いたケーブルは <b>${cap.total}心</b>（${Engine.placedCables(state, run).map(c => c.name).join(' ＋ ')}）で、すでに ${inRun.length} 本使っています。<br>` +
          `この区間の電線は<b>すべて接続点に入っています</b>。いらない電線を消すか（電線をクリック→<b>×</b>／右クリック）、配線を見直してください。`, 'bad');
        view.pending = null; view.cursor = null;
        draw();
        return;
      }
      const same = inRun.filter(w => w.color === view.color);
      if (same.length >= (cap.byColor[view.color] || 0)) {
        // 選んだ色がもう無い＝たいていは「すでに引いてある電線をこの接続点につなぎたい」
        if (attachExisting(from, to, ga, gb, run)) return;
        const used = same.map(w => `「${Engine.endpointLabel(problem, w.a)} ⇄ ${Engine.endpointLabel(problem, w.b)}」`).join('、');
        // その電線の線端がすでに別の接続点に入っているなら、それを伝える
        const box = from.k === 'jb' ? from.id : to.k === 'jb' ? to.id : null;
        const taken = box && same.some(w => {
          const k = endKeyAt(w, box);
          return k && !endIsFree(k);
        });
        toast(`この区間の${COLOR_JA[view.color]}線はもう空きがありません` +
          (freeColors.length ? `。残っている心線：${freeColors.join('・')}` : ''));
        setStatus(
          `<b>${runLabel}</b> は ${Engine.placedCables(state, run).map(c => c.name).join(' ＋ ')}。${COLOR_JA[view.color]}線は <b>${cap.byColor[view.color] || 0}本まで</b>で、` +
          (used ? `すでに ${used} で使っています。` : 'すでに使い切っています。') +
          (taken ? `その電線の線端は<b>すでに別の接続点に入っています</b>。<br>` : '<br>') +
          (freeColors.length
            ? `この区間で<b>まだ使える心線は ${freeColors.join('・')}</b> です。色を変えてからもう一度つないでください。`
            : 'この区間はもう空きがありません。いらない電線を消してください。'), 'bad');
        // 引きかけは残す（色を変えてすぐ続けられるように）
        view.pending = from.joinBundle ? { k: 'b', id: from.joinBundle } : from;
        draw();
        return;
      }
    }
    for (const ep of [from, to]) {
      if (ep.k !== 't') continue;
      const t = Engine.terminalRef(problem, ep.id);
      if (wiresAtTerminal(ep.id).length >= terminalMax(t.terminal, t.device)) {
        toast(`${t.name} には、これ以上電線をつなげません`);
        return;
      }
    }
    pushHistory();
    const id = 'w' + (state.seq++);
    /* 渡り線（ケーブルを使わない区間）の色は、端子の役割から決める。
       直前にえらんだ心線の色を持ち越すと、緑や白の渡り線ができてしまう */
    let color = view.color;
    if (!pullSlotKey) {
      color = requiredColor(from) || requiredColor(to) || 'black';
    }
    const wire = {
      id,
      a: { k: from.k, id: from.id },
      b: { k: to.k, id: to.id },
      color
    };
    // どのケーブルの心線かを覚えておく（1本のケーブルに同じ色は1本だけ）
    // ケーブルをクリックして引いた心線は、利用者がそのケーブルを選んだもの（採点で「どのケーブルか」を信じてよい）
    if (pullSlotKey && cableAt(pullSlotKey) && !coreWire(pullSlotKey, color)) { wire.slot = pullSlotKey; wire.slotPicked = true; }
    state.wires.push(wire);
    // 接続点から引いた線は、その接続点に自動で仲間入りする
    let joined = 0;
    [['a', from], ['b', to]].forEach(([side, ep]) => {
      if (!ep.joinBundle) return;
      const b = state.bundles.find(x => x.id === ep.joinBundle);
      if (b) { b.ends.push(id + ':' + side); joined++; }
    });
    // ケーブルから引いたときは、ボックス側の線端をそのまま「選択中」にしておく
    // （もう1本えらんで「接続する」を押すだけで接続点ができるように）
    let picked = '';
    if (autoPickEnd && !joined) {
      const w = state.wires[state.wires.length - 1];
      let ends = boxEndsOf(w);
      if (ends.length === 2) {
        // 両端ともボックスのとき（A⇄B など）は、すでに選んでいる側にそろえる
        const cur = Array.from(view.selectedEnds).map(jbOfEnd).filter(Boolean)[0];
        ends = cur ? ends.filter(e => e.jb === cur) : [];
      }
      if (ends.length === 1) {
        const box = ends[0].jb;
        Array.from(view.selectedEnds).forEach(k => { if (jbOfEnd(k) !== box) view.selectedEnds.delete(k); });
        view.selectedEnds.add(ends[0].key);
        const n = view.selectedEnds.size;
        picked = n >= 2
          ? `<br><b>${Engine.groupLabel(problem, box)} の中で ${n}本</b>えらんでいます。<b>「接続する（${n}本）」</b>で接続点になります。`
          : `<br>${Engine.groupLabel(problem, box)} の中のこの線端を<b>えらんでいます</b>。もう1本えらぶと接続できます。`;
      }
    }
    const label = `${COLOR_JA[color]}線をつなぎました：${Engine.endpointLabel(problem, from)} ⇄ ${Engine.endpointLabel(problem, to)}`;
    setStatus((pendingNote ? pendingNote + '。' : '') + label + (joined ? '（接続点に追加しました）' : '') + picked);
    pendingNote = '';
    afterChange();
  }

  function deleteWire(id) {
    if (answerGuard()) return;
    const w = state.wires.find(x => x.id === id);
    const label = w ? Engine.wireLabel(problem, w) : '電線';
    pushHistory();
    state.wires = state.wires.filter(x => x.id !== id);
    const touched = state.bundles.filter(b => b.ends.some(e => e.split(':')[0] === id));
    state.bundles.forEach(b => { b.ends = b.ends.filter(e => e.split(':')[0] !== id); });
    const dropped = state.bundles.filter(b => b.ends.length < 1);
    state.bundles = state.bundles.filter(b => b.ends.length >= 1);
    const kept = touched.length - dropped.length;
    if (dropped.length) toast(`空になった接続点 ${dropped.length} か所も外しました`);
    view.selectedWire = null;
    view.pickedCores = []; view.pickTerm = null; view.pickBox = null;
    setStatus(`<b>${label}</b> を1本だけ消しました。` +
      (kept > 0 ? `<b>接続点と、ほかの心線はそのまま</b>です。` : '') +
      (dropped.length ? `<span style="color:var(--warn)">空になった接続点 ${dropped.length} か所は外れました。</span>` : '') +
      ` <kbd>⌘Z</kbd> で戻せます。`);
    afterChange();
  }

  function deleteBundle(id) {
    if (answerGuard()) return;
    pushHistory();
    state.bundles = state.bundles.filter(b => b.id !== id);
    view.selectedBundle = null;
    afterChange();
  }

  function makeBundle(skipHistory) {
    if (answerGuard()) return false;
    const lay = Render.layout(problem, state);
    const keys = Array.from(view.selectedEnds)
      .filter(k => lay.ends.has(k) && !state.bundles.some(b => b.ends.indexOf(k) >= 0));
    const target = view.selectedBundle ? state.bundles.find(b => b.id === view.selectedBundle) : null;

    if (!keys.length) {
      toast(target ? 'この接続点に追加する線端を選んでください' : 'ボックス内の線端を2本以上選んでください');
      return false;
    }
    if (!target && keys.length < 2) {
      toast('線端を2本以上選ぶと接続できます');
      return false;
    }

    const jbs = new Set(keys.map(k => lay.ends.get(k).jb));
    if (target) jbs.add(target.jb);
    if (jbs.size !== 1) { toast('同じジョイントボックスの中の線端を選んでください'); return false; }

    // 差込形コネクタは4本用まで（物理的に入らない）
    const jbDev = Engine.deviceOf(problem, jbs.values().next().value);
    const total = (target ? target.ends.length : 0) + keys.length;
    const members = (target ? target.ends : []).concat(keys)
      .map(k => state.wires.find(x => x.id === String(k).split(':')[0])).filter(Boolean);
    if (jbDev && Engine.connectMethodOf(problem, jbDev, members) === 'connector' && total > 4) {
      toast(`差込形コネクタは4本用までです（${total}本になります）。接続を分けてください`);
      return false;
    }

    if (!skipHistory) pushHistory();
    if (target) {
      target.ends = target.ends.concat(keys);
    } else {
      state.bundles.push({ id: 'b' + (state.seq++), jb: jbs.values().next().value, ends: keys });
      // 続けて別のグループを接続できるように、「この接続点に追加」モードは残さない
      view.selectedBundle = null;
    }
    view.selectedEnds.clear();
    const b = target || state.bundles[state.bundles.length - 1];
    const info = Engine.bundleInfo(problem, state, b);
    view.pending = null; view.cursor = null;
    setStatus(`${info.count}本を接続しました（${info.spec}）。` +
      `<b>この接続点をクリック</b>してから心線をえらぶと、あとから本数を足せます。`);
    afterChange();
    return true;
  }

  /* 引きかけをやめて、接続点を選ぶ前の状態に戻す */
  function cancelPending(msg) {
    view.pending = null; view.cursor = null; view.corePicker = null;
    view.pickedCores = []; view.pickBox = null; view.pickTerm = null;
    view.selectedWire = null; view.selectedBundle = null; view.selectedSlot = null; view.selectedLink = null;
    view.selectedEnds.clear();
    view.focus = null;
    if (msg) setStatus(msg);
    draw();
    renderPanels();
  }

  /* 接続点から1本だけ外す */
  function removeEndFromBundle(bid, key) {
    if (answerGuard()) return;
    const b = state.bundles.find(x => x.id === bid);
    if (!b || b.ends.indexOf(key) < 0) return;
    const w = state.wires.find(x => x.id === key.split(':')[0]);
    pushHistory();
    b.ends = b.ends.filter(k => k !== key);
    // 0本になったときだけ接続点を消す（1本なら残す＝そこにまた足せる）
    let gone = false;
    if (!b.ends.length) { state.bundles = state.bundles.filter(x => x.id !== bid); gone = true; }
    const left = b.ends.length;
    const info = gone ? null : Engine.bundleInfo(problem, state, b);
    toast('この心線だけを外しました（⌘Zで戻せます）');
    setStatus(
      `<b>${w ? COLOR_JA[w.color] + '線' : 'この心線'}</b> を接続点から外しました。<b>電線はそのまま残っています。</b>` +
      (gone ? '<br>接続点は空になったので外れました。'
        : `<br>接続点には <b>${left}本</b> 残っています（${info && info.ng ? '<span style="color:var(--warn)">あと1本つなぐと接続になります</span>' : info.spec}）。` +
          `<b>この接続点をクリック</b>して心線をえらべば、また足せます。`) +
      ` <kbd>⌘Z</kbd> で戻せます。`);
    afterChange();
  }

  function answerGuard() {
    if (!showingAnswer) return false;
    toast('模範解答の表示中です。「自分の配線に戻る」を押してから編集してください');
    return true;
  }

  /* ---------------- 描画更新 ---------------- */
  function afterChange() {
    // 消えた接続点を指したままにしない
    if (view.pending && view.pending.k === 'b' && !state.bundles.some(b => b.id === view.pending.id)) {
      view.pending = null; view.cursor = null;
    }
    if (view.selectedBundle && !state.bundles.some(b => b.id === view.selectedBundle)) {
      view.selectedBundle = null;
    }
    reassignSlots();
    view.sim = Engine.simulate(problem, state, state.switches, state.power !== false);
    save();
    draw();
    renderPanels();
  }

  function draw() {
    const ws = $('#workspace');
    const act = document.activeElement;
    const keep = act && ws.contains(act)
      ? ['term', 'jb', 'end', 'bundle', 'wire'].map(k => act.dataset && act.dataset[k] ? [k, act.dataset[k]] : null).filter(Boolean)[0]
      : null;
    sizeWorkspace();
    try {
      Render.drawWorkspace(ws, problem, state, view);
    } catch (err) {
      console.error(err);
      setStatus('表示でエラーが起きました。「最初から」を押すと復帰できます。', 'bad');
      return;
    }
    if (keep) {
      const again = ws.querySelector(`[data-${keep[0]}="${keep[1]}"]`);
      if (again && again.focus) { try { again.focus({ preventScroll: true }); } catch (e) { again.focus(); } }
    }
    ws.style.touchAction = view.viewBox ? 'none' : 'manipulation';
    const bd = $('#btn-delete');
    if (bd) {
      bd.textContent = view.selectedLink ? 'このつなぎ目を外す'
        : view.selectedWire ? 'この電線を削除'
        : view.selectedBundle ? 'この接続点をはずす' : '選択を削除';
      bd.disabled = !(view.selectedWire || view.selectedBundle || view.selectedLink);
    }
    const bc = $('#btn-connect');
    const nPick = view.pickedCores.length + view.selectedEnds.size;
    if (bc) {
      if (view.pickTerm) {
        bc.disabled = !!badTermReason(view.pickTerm);
        bc.textContent = 'ここに接続する';
      } else if (view.selectedBundle && nPick) {
        bc.disabled = false;
        bc.textContent = `この接続点に追加（${nPick}本）`;
      } else {
        bc.disabled = nPick < 2;
        bc.textContent = nPick >= 2 ? `接続する（${nPick}本）` : '心線をえらぶ';
      }
    }
    const gh = $('#ghost-hint');
    const emptySlots = (problem.runs || []).filter(r => r.slots)
      .reduce((n, r) => n + Engine.runSlots(state, r).filter(c => !c).length, 0);
    const nSel = view.pickedCores.length + view.selectedEnds.size;
    gh.textContent = view.pickCable
      ? 'ケーブルを持っています。図の点線の枠をクリックして置いてください（右クリックでやめる）'
      : emptySlots
        ? `①「支給ケーブル」をえらんで「ケーブルを切る」→ 図の枠（残り${emptySlots}か所）に置きます`
        : view.pickTerm
          ? '「ここに接続する」を押すとつながります（別の場所をクリックすると選び直せます）'
          : nSel >= 2
            ? `「接続する（${nSel}本）」を押すと、ジョイントボックスの中でつながります`
            : nSel === 1
              ? 'つなぎ先（器具の端子・接続点）をクリック、またはもう1本の心線をえらびます'
              : '②ケーブルをクリック → 心線の色をえらぶ → つなぎ先をクリック';
    gh.classList.toggle('is-hidden',
      state.wires.length > 4 && !nSel && !view.pickCable && !emptySlots && !view.pickTerm);
    renderCorePicker();
  }

  let shortWarned = false;
  function toastShort() {
    if (shortWarned) return;
    shortWarned = true;
    toast('⚡ 短絡しています！配線を見直してください');
    setTimeout(() => { shortWarned = false; }, 4000);
  }

  /* ---------------- 支給材料（ケーブル）パレット ---------------- */
  function renderMaterials() {
    const ul = $('#materials');
    if (!ul) return;
    const supply = (problem.supply && problem.supply.cables) || {};
    const stock = Engine.cableStock(problem, state);
    ul.innerHTML = '';
    // ---- ①支給ケーブル（長いまま。ここから切り出す）----
    Object.keys(supply).forEach(id => {
      const t = Engine.cableType(id);
      if (!t) return;
      const st = stock[id] || { left: 0, total: 0, len: 0, count: 1 };
      const li = document.createElement('li');
      li.className = 'cable-chip roll-chip' + (st.left <= 0 ? ' is-empty' : '') +
        (view.pickRoll === id ? ' is-picked' : '');
      li.dataset.roll = id;
      li.title = t.full + `（支給 ${st.len}mm × ${st.count}本）` +
        (st.official ? `／実際の材料表は ${st.official}` : '');
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      li.innerHTML =
        `<span class="cable-swatch" style="--sheath:${t.sheath};--edge:${t.edge}">` +
        t.cores.map(c => `<i class="core core-${c}"></i>`).join('') + `</span>` +
        `<span class="cable-text"><b class="cable-name">` +
        `<span class="nm-full">${t.name}</span><span class="nm-short">${t.abbr || t.name}</span></b>` +
        `<span class="cable-cores">${st.len}mm × ${st.count}本</span></span>` +
        `<span class="cable-left"><span class="cnt-full">残り</span><b>${st.left}</b><small>mm</small></span>`;
      ul.appendChild(li);
    });
    // ---- ②切ったケーブル（区間に置けるのはこちら）----
    const ulp = $('#materials-cut');
    if (ulp) {
      const free = Engine.freePieces(state);
      ulp.innerHTML = '';
      if (!free.length) {
        const li = document.createElement('li');
        li.className = 'cut-empty';
        li.textContent = 'まだありません。支給ケーブルをえらんで「ケーブルを切る」';
        ulp.appendChild(li);
      }
      free.forEach(pc => {
        const t = Engine.cableType(pc.type);
        if (!t) return;
        const li = document.createElement('li');
        li.className = 'cable-chip piece-chip' + (view.pickCable === pc.id ? ' is-picked' : '');
        li.draggable = true;
        li.dataset.piece = pc.id;
        li.title = `${t.name} ${pc.len}mm（図の枠にドラッグ、または枠をタップしてえらぶ）`;
        li.setAttribute('role', 'button');
        li.tabIndex = 0;
        li.innerHTML =
          `<span class="cable-swatch" style="--sheath:${t.sheath};--edge:${t.edge}">` +
          t.cores.map(c => `<i class="core core-${c}"></i>`).join('') + `</span>` +
          `<span class="cable-text"><b class="cable-name">` +
          `<span class="nm-full">${t.name}</span><span class="nm-short">${t.abbr || t.name}</span></b>` +
          `<span class="cable-cores">心線 ${t.cores.map(c => COLOR_JA[c]).join('・')}</span></span>` +
          `<span class="cable-left"><b>${pc.len}</b><small>mm</small></span>`;
        ulp.appendChild(li);
      });
    }
    const bcut = $('#btn-cut');
    if (bcut) {
      const t = view.pickRoll && Engine.cableType(view.pickRoll);
      bcut.disabled = !t;
      bcut.textContent = t ? `${t.abbr || t.name} を切る` : 'ケーブルを切る';
    }
    // ---- 接続材料（リングスリーブ・差込形コネクタ）----
    const ul2 = $('#materials-join') || ul;
    if (ul2 !== ul) ul2.innerHTML = '';
    const sv = problem.supply || {};
    const use = materialUsage();
    const matChip = (kind, key, label, sub, have) => {
      if (!have) return;
      const used = kind === 'sleeve' ? (use.sleeves[key] || 0) : (use.connectors[key] || 0);
      const left = have - used;
      const li2 = document.createElement('li');
      li2.className = 'cable-chip mat-chip' + (left <= 0 ? ' is-empty' : '');
      li2.title = kind === 'sleeve' ? `リングスリーブ「${key}」（圧着して使います）` : `差込形コネクタ ${key}本用`;
      const shortLabel = kind === 'sleeve' ? `スリーブ${key}` : `差コネ${key}`;
      li2.innerHTML =
        `<span class="mat-icon ${kind}">${key}</span>` +
        `<span class="cable-text"><b class="cable-name">` +
        `<span class="nm-full">${label}</span><span class="nm-short">${shortLabel}</span></b>` +
        `<span class="cable-cores">${sub}</span></span>` +
        `<span class="cable-left"><span class="cnt-full">残り</span>` +
        `<b${left < 0 ? ' style="color:var(--bad)"' : ''}>${left}</b>／${have}</span>`;
      ul2.appendChild(li2);
    };
    Object.keys(sv.sleeves || {}).forEach(sz => {
      matChip('sleeve', sz, `リングスリーブ「${sz}」`, '圧着して接続', (sv.sleeves || {})[sz]);
    });
    Object.keys(sv.connectors || {}).forEach(n => {
      matChip('connector', n, `差コネ${n}`, `差込形コネクタ ${n}本用`, (sv.connectors || {})[n]);
    });
  }

  /* 使った接続材料の数 */
  function materialUsage() {
    const use = { sleeves: {}, connectors: {} };
    state.bundles.forEach(b => {
      const info = Engine.bundleInfo(problem, state, b);
      if (info.count < 2 || info.ng) return;
      if (info.method === 'connector') use.connectors[info.count] = (use.connectors[info.count] || 0) + 1;
      else use.sleeves[info.sleeve] = (use.sleeves[info.sleeve] || 0) + 1;
    });
    return use;
  }

  /* 支給ケーブル（長いまま）をえらぶ：ここから「ケーブルを切る」 */
  function pickRoll(id) {
    if (answerGuard()) return;
    const t = Engine.cableType(id);
    if (!t) return;
    view.pickRoll = (view.pickRoll === id) ? null : id;
    view.pickCable = null;
    const st = Engine.cableStock(problem, state)[id];
    setStatus(view.pickRoll
      ? `<b>${t.name}</b> をえらびました（残り <b>${st ? st.left : 0}mm</b>）。` +
        `<b>「ケーブルを切る」</b>を押して、区間と長さをえらびます。`
      : 'ケーブルの選択をやめました。');
    renderMaterials();
    return;
  }

  /* 切ったケーブルをクリック：置き場を選んでいればそこに置く。でなければ「持ち上げる」 */
  function pickCable(id) {
    if (answerGuard()) return;
    const pc = Engine.pieceOf(state, id);
    if (!pc) return;
    const t = Engine.cableType(pc.type);
    if (!t) return;
    // 空いている枠を選んでいたら、そこに置く
    if (view.selectedSlot && !cableAt(view.selectedSlot)) { placePiece(view.selectedSlot, id); return; }
    view.pickCable = (view.pickCable === id) ? null : id;
    view.pickRoll = null;
    view.pending = null; view.cursor = null;
    view.selectedWire = view.selectedBundle = null;
    view.selectedEnds.clear();
    setStatus(view.pickCable
      ? `<b>${t.name}（${pc.len}mm）</b> を持ちました。図の<b>点線の枠</b>をタップして置いてください（ドラッグでも置けます）。`
      : 'ケーブルを置くのをやめました。');
    renderMaterials();
    draw();
  }

  /* ドロップ位置から、いちばん近いケーブル置き場を探す */
  function slotAtPoint(pt) {
    let best = null, bestD = Infinity;
    Render.slots().forEach((p, key) => {
      const dx = Math.max(Math.abs(pt.x - p.x) - p.w, 0);
      const dy = Math.max(Math.abs(pt.y - p.y) - p.h, 0);
      const d = Math.hypot(dx, dy);
      if (d < bestD) { bestD = d; best = key; }
    });
    return bestD <= 90 ? best : null;
  }

  /* ---------------- 右パネル ---------------- */
  function renderPanels() {
    renderMaterials();
    // スイッチ・点灯の確認は作業エリアの図の中で行う（右のパネルは廃止）
    const sim = view.sim || Engine.simulate(problem, state, state.switches, state.power !== false);
    if (sim && sim.shorted) {
      toastShort();
    }

    // ボックスの中（操作パネル）
    const bl = $('#bundle-list');
    bl.innerHTML = '';
    problem.devices.filter(d => d.type === 'jointbox').forEach(jb => {
      const all = endsOfBox(jb.id);
      const bundles = state.bundles.filter(b => b.jb === jb.id);
      const bundled = new Set();
      bundles.forEach(b => b.ends.forEach(k => bundled.add(k)));
      const loose = all.filter(e => !bundled.has(e.key));

      const block = document.createElement('div');
      block.className = 'jb-block';
      const method = jb.methodLabel || (jb.connect === 'connector' ? '差込形コネクタ' : 'リングスリーブ');
      block.innerHTML =
        `<div class="jb-head"><span>${jb.label}</span><span class="method">${method}／線端 ${all.length}本</span></div>`;
      const body = document.createElement('div');
      body.className = 'jb-body-list';
      block.appendChild(body);

      const rowFor = (e) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'end-row' + (view.selectedEnds.has(e.key) ? ' is-selected' : '');
        const col = e.wire.color === 'white' ? '#ffffff' : e.wire.color === 'red' ? '#e0362f' : '#21262c';
        btn.innerHTML =
          `<i class="dot" style="background:${col}"></i>` +
          `<span class="who">${COLOR_JA[e.wire.color]}線 ← ${Engine.endpointLabel(problem, e.other)}</span>` +
          `<span class="row-del" title="この電線を削除">✕</span>`;
        btn.addEventListener('click', (ev) => {
          if (ev.target.classList.contains('row-del')) {
            deleteWire(e.wire.id);
            toast('電線を削除しました（「元に戻す」／⌘Zで戻せます）');
            return;
          }
          toggleEndSelection(e.key);
        });
        return btn;
      };

      // 未接続の線端
      const sel = loose.filter(e => view.selectedEnds.has(e.key));
      if (loose.length) {
        const h = document.createElement('div');
        h.className = 'jb-sub';
        h.textContent = `まだ接続していない線端（${loose.length}本）`;
        body.appendChild(h);
        loose.forEach(e => body.appendChild(rowFor(e)));

        const acts = document.createElement('div');
        acts.className = 'jb-actions';
        const targetBundle = view.selectedBundle && bundles.find(b => b.id === view.selectedBundle);
        const mk = document.createElement('button');
        mk.className = 'btn btn-sm';
        mk.textContent = targetBundle
          ? `＋ 選んだ線端を この接続点に追加（${sel.length}本）`
          : `選んだ線端を接続する（${sel.length}本）`;
        mk.disabled = sel.length < (targetBundle ? 1 : 2);
        mk.addEventListener('click', makeBundle);
        acts.appendChild(mk);
        body.appendChild(acts);
      } else if (!bundles.length) {
        const p = document.createElement('div');
        p.className = 'bundle-empty';
        p.textContent = 'まだ電線が入っていません。器具の端子 → このボックス の順にクリックします。';
        body.appendChild(p);
      }

      // 接続点
      bundles.forEach((b, i) => {
        const info = Engine.bundleInfo(problem, state, b);
        const box = document.createElement('div');
        box.className = 'pt-block' + (view.selectedBundle === b.id ? ' is-selected' : '');
        const spec = info.method === 'connector' ? `差コネ${info.mark}` : `${info.sleeve}／${info.mark}`;
        box.innerHTML =
          `<div class="pt-head"><span>接続点 ${i + 1}（${info.count}本）</span><span class="sleeve">${spec}</span></div>` +
          `<ul class="pt-members">` +
          b.ends.map(k => {
            const e = all.find(x => x.key === k);
            return e ? `<li><span>${COLOR_JA[e.wire.color]}：${Engine.endpointLabel(problem, e.other)}</span>` +
              `<button type="button" class="member-del" data-key="${k}" title="この1本を接続点から外す">✕</button></li>` : '';
          }).join('') + `</ul>`;
        const tools = document.createElement('div');
        tools.className = 'pt-tools';
        const add = document.createElement('button');
        add.className = 'btn btn-sm';
        add.textContent = view.selectedBundle === b.id ? '線端を選んで追加' : '＋ この接続点に追加';
        add.addEventListener('click', () => {
          // すでに線端を選んでいれば、そのまま追加する
          const picked = Array.from(view.selectedEnds).filter(k => jbOfEnd(k) === b.jb &&
            !state.bundles.some(x => x.ends.indexOf(k) >= 0));
          if (picked.length) {
            view.selectedBundle = b.id;
            makeBundle();
            return;
          }
          selectBundle(b.id);
          setStatus('追加したい<b>線端</b>を選んで、もう一度「＋ この接続点に追加」を押します。');
        });
        const del = document.createElement('button');
        del.className = 'btn btn-sm btn-ghost';
        del.textContent = 'はずす';
        del.addEventListener('click', () => deleteBundle(b.id));
        tools.appendChild(add); tools.appendChild(del);
        box.appendChild(tools);
        box.querySelectorAll('.member-del').forEach(btn => {
          btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            removeEndFromBundle(b.id, btn.dataset.key);
          });
        });
        box.addEventListener('click', (ev) => { if (ev.target.closest('button')) return; selectBundle(b.id); });
        body.appendChild(box);
      });

      bl.appendChild(block);
    });

    // 手順
    const steps = Engine.steps(problem, state);
    const se = $('#steps');
    se.innerHTML = '';
    let currentMarked = false;
    steps.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = s.text;
      if (s.done) li.className = 'done';
      else if (!currentMarked) { li.className = 'current'; currentMarked = true; }
      se.appendChild(li);
    });
  }

  function toggleSwitch(id) {
    state.switches[id] = !state.switches[id];
    afterChange();
  }

  /* ---------------- 採点 ---------------- */
  /* 低い画面（スマホ横）では、採点したら結果が見える位置まで動かす */
  function scrollScoreIntoView() {
    if (!window.matchMedia('(max-height: 620px), (max-width: 1180px)').matches) return;
    const card = document.querySelector('.card-score');
    if (!card) return;
    setTimeout(() => {
      const y = card.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo(0, y);
    }, 80);
  }

  /* 低い画面では、左の参考カードは最初たたんでおく（作業エリアを広く） */
  function collapseRefCardsIfShort() {
    if (!window.matchMedia('(max-height: 620px), (max-width: 1180px)').matches) return;
    document.querySelectorAll('.pane-left details.card').forEach(d => { d.open = false; });
  }

  function runGrade() {
    const g = Engine.grade(problem, state);
    const ring = $('#score-ring') || document.querySelector('.score-ring');
    $('#score-value').textContent = g.score;
    ring.dataset.state = g.passed ? 'ok' : 'bad';
    $('#score-label').innerHTML = g.passed
      ? '<b style="color:var(--ok)">合格！</b> 欠陥はありません。通電試験でも確認しましょう。'
      : `<b style="color:var(--bad)">不合格</b>：欠陥 <b>${g.badCount}</b> 件` +
        (g.circuitOk
          ? '<br><small><b>電気は正しく流れています</b>が、施工としての欠陥が残っています。' +
            '（余った心線・つないでいない端子・1本だけの接続点など）下の指摘をクリックすると、その場所が光ります。</small>'
          : `<br><small>チェック項目 ${g.checks.passed}/${g.checks.total} クリア（技能試験では欠陥が1つでもあると不合格です）</small>`);

    const ul = $('#issues');
    ul.innerHTML = '';
    const order = { bad: 0, warn: 1, info: 2 };
    g.issues.slice().sort((a, b) => order[a.level] - order[b.level]).forEach(is => {
      const li = document.createElement('li');
      li.className = 'lv-' + is.level + (is.focus ? ' is-focusable' : '');
      li.innerHTML = is.msg + (is.detail ? `<small>${is.detail}</small>` : '');
      if (is.focus) li.addEventListener('click', () => focusOn(is.focus));
      ul.appendChild(li);
    });
    if (!g.issues.length) {
      ul.innerHTML = '<li class="lv-ok">指摘はありません。</li>';
    }
    const prev = document.querySelector('.card-score .copy-issues');
    if (prev) prev.remove();
    const copy = document.createElement('button');
    copy.className = 'btn btn-sm btn-wide copy-issues';
    copy.textContent = '指摘をコピー';
    copy.addEventListener('click', () => {
      const txt = `【採点】${g.score}点 / ${g.passed ? '合格' : '不合格'}（欠陥${g.badCount}件）\n` +
        g.issues.map(i => `・[${i.level}] ${i.msg}`).join('\n');
      try {
        navigator.clipboard.writeText(txt);
        toast('指摘をコピーしました');
      } catch (e) {
        toast('コピーできませんでした');
      }
    });
    ul.parentNode.appendChild(copy);
    setStatus(g.passed ? '合格！ 完璧な複線図です。' : `欠陥 ${g.badCount} 件。右の指摘をクリックすると場所が光ります。`, g.passed ? 'ok' : 'bad');
    scrollScoreIntoView();
  }

  function focusOn(f) {
    view.focus = f;
    view.selectedEnds.clear();
    view.selectedWire = f.type === 'wire' ? f.id : null;
    view.selectedBundle = f.type === 'bundle' ? f.id : null;
    view.hintSlot = f.type === 'run' ? f.id : null;
    draw();
    setTimeout(() => { view.focus = null; view.hintSlot = null; draw(); }, 2600);
  }

  /* ---------------- 正解表示 ---------------- */
  function toggleAnswer() {
    if (!showingAnswer) {
      savedWork = snapshot();
      loadAnswer();
      showingAnswer = true;
      $('#btn-answer').textContent = '自分の配線に戻る';
      const ul = $('#issues');
      ul.innerHTML = '';
      problem.answer.explain.forEach(t => {
        const li = document.createElement('li');
        li.className = 'lv-ok';
        li.innerHTML = t;
        ul.appendChild(li);
      });
      $('#score-label').innerHTML = '<b>模範解答</b>を表示しています。';
      setStatus('模範解答を表示中。スイッチを切り替えて通電の流れを確かめてみましょう。');
    } else {
      restore(savedWork);
      showingAnswer = false;
      $('#btn-answer').textContent = '正解を見る';
      setStatus('自分の配線に戻りました。');
      afterChange();
    }
  }

  function loadAnswer() {
    const a = problem.answer;
    const wires = a.wires.map((w, i) => ({
      id: 'aw' + (i + 1), a: parseEp(w.a), b: parseEp(w.b), color: w.color, role: w.role
    }));
    const bundles = a.bundles.map((b, i) => {
      const ends = b.wires.map(key => {
        const [pair, color] = key.split(':');
        const [ka, kb] = pair.split('|');
        const w = wires.find(x =>
          ((x.a.id === ka && x.b.id === kb) || (x.a.id === kb && x.b.id === ka)) &&
          (!color || x.color === color));
        if (!w) return null;
        const side = (w.a.k === 'jb' && w.a.id === b.jb) ? 'a' : 'b';
        return w.id + ':' + side;
      }).filter(Boolean);
      if (ends.length !== b.wires.length) {
        console.warn('模範解答の接続点を解決できませんでした:', b);
      }
      return { id: 'ab' + (i + 1), jb: b.jb, ends };
    });
    // 模範解答：区間ごとに正しい長さで切ったケーブルを置く
    const cables = {}, pieces = [];
    (problem.runs || []).forEach(run => {
      for (let i = 0; i < (run.slots || 0); i++) {
        const pc = { id: 'ac' + (pieces.length + 1), type: Engine.slotNeed(run, i), len: run.cut || 0 };
        pieces.push(pc);
        cables[Engine.slotKey(run, i)] = pc.id;
      }
    });
    state.wires = wires;
    state.bundles = bundles;
    state.cables = cables;
    state.pieces = pieces;
    state.seq = 900;
    reassignSlots();
    view.selectedEnds.clear();
    view.selectedWire = view.selectedBundle = null;
    view.sim = Engine.simulate(problem, state, state.switches, state.power !== false);
    draw();
    renderPanels();
  }

  /* ---------------- 入力 ---------------- */
  /* ---------------- ズーム・パン ---------------- */
  function baseBox() {
    const v = problem.workspace.viewBox.split(/\s+/).map(Number);
    return { x: v[0], y: v[1], w: v[2], h: v[3] };
  }
  function currentBox() {
    if (!view.viewBox) return baseBox();
    const v = view.viewBox.split(/\s+/).map(Number);
    return { x: v[0], y: v[1], w: v[2], h: v[3] };
  }
  function setBox(b) {
    const base = baseBox();
    const maxW = base.w * 1.05, minW = base.w * 0.22;
    let w = Math.max(minW, Math.min(b.w, maxW));
    let h = w * base.h / base.w;
    let x = Math.max(base.x - base.w * 0.1, Math.min(b.x, base.x + base.w - w + base.w * 0.1));
    let y = Math.max(base.y - base.h * 0.1, Math.min(b.y, base.y + base.h - h + base.h * 0.1));
    view.viewBox = `${x} ${y} ${w} ${h}`;
    draw();
  }
  function resetZoom() { view.viewBox = null; draw(); }
  function zoomToDevice(id) {
    const d = Engine.deviceOf(problem, id);
    if (!d) return;
    const base = baseBox();
    const w = (d.r ? d.r * 4.2 : 420);
    setBox({ x: d.x - w / 2, y: d.y - (w * base.h / base.w) / 2, w });
  }
  function zoomAt(pt, factor) {
    const b = currentBox();
    const w = b.w * factor;
    const h = w * b.h / b.w;
    setBox({ x: pt.x - (pt.x - b.x) * (w / b.w), y: pt.y - (pt.y - b.y) * (h / b.h), w });
  }

  function svgPoint(svg, evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
  }

  function onStageClick(e) {
    const t = e.target;
    const term = t.closest('[data-term]');
    const jb = t.closest('[data-jb]');
    const end = t.closest('[data-end]');
    const bundle = t.closest('[data-bundle]');
    const connectBtn = t.closest('[data-connect]');
    const wire = t.closest('[data-wire]');
    const sw = t.closest('[data-sw]');

    const slot = t.closest('[data-slot]');
    const link = t.closest('[data-link]');
    const delWire = t.closest('[data-delwire]');
    const delBundle = t.closest('[data-delbundle]');
    const delSlot = t.closest('[data-delslot]');
    const delLink = t.closest('[data-dellink]');
    if (delLink) { removeLink(delLink.dataset.dellink); return; }
    if (delSlot) { removeCable(delSlot.dataset.delslot); return; }
    if (slot && view.pickCable) { placePiece(slot.dataset.slot, view.pickCable); return; }
    if (delWire) {
      deleteWire(delWire.dataset.delwire);
      toast('電線を削除しました（「元に戻す」／⌘Zで戻せます）');
      return;
    }
    if (delBundle) {
      deleteBundle(delBundle.dataset.delbundle);
      toast('接続点をはずしました（「元に戻す」／⌘Zで戻せます）');
      return;
    }

    // ケーブル以外の場所をさわったら、心線えらびの小窓は閉じる
    if (view.corePicker && !slot) view.corePicker = null;

    if (t.closest('[data-power]')) {
      state.power = !state.power;
      setStatus(state.power
        ? '<b>電源を入れました。</b>点滅器のスイッチを入れて、対応する器具だけが光るか確かめましょう。'
        : '<b>電源を切りました。</b>（図の電源スイッチでいつでも入／切できます）');
      toast(state.power ? '電源 入' : '電源 切');
      afterChange();
      return;
    }
    if (sw) { toggleSwitch(sw.dataset.sw); return; }
    if (connectBtn) { doConnect(); return; }

    /* ---- ケーブル（置き場）をクリック ---- */
    if (slot) {
      const key = slot.dataset.slot;
      if (view.corePicker && view.corePicker.key === key) {
        view.corePicker = null;
        setStatus('心線えらびを閉じました。');
        draw();
        return;
      }
      selectSlot(key);
      return;
    }

    /* ---- 器具の端子をクリック ---- */
    if (term) {
      const id = term.dataset.term;
      if (view.pickedCores.length) { setPickTerm(id); return; }
      // 渡り線（点滅器どうしなど、ケーブルのいらない区間）
      const tr = Engine.terminalRef(problem, id);
      const selfRun = tr && Engine.runFor(problem, tr.device.group, tr.device.group);
      if (selfRun) {
        if (view.pending && view.pending.k === 't' && view.pending.id !== id) {
          const from = view.pending;
          view.pending = null;
          createWire(from, { k: 't', id });
          return;
        }
        view.pending = { k: 't', id };
        view.pickTerm = null;
        setStatus(`<b>${tr.name}</b> を選びました。<b>渡り線</b>をつなぐなら、となりの点滅器の端子をクリックしてください（やめるには Esc）。`);
        draw();
        return;
      }
      view.pending = null;
      setStatus(`<b>${tr ? tr.name : ''}</b>。ここにつなぐには、先に<b>ケーブルをクリックして心線（色）をえらび</b>、そのあとでここをクリックします。`, 'bad');
      draw();
      return;
    }

    /* ---- 接続点をクリック ---- */
    if (bundle) {
      const id = bundle.dataset.bundle;
      if (view.pickedCores.length || view.selectedEnds.size) { setPickBundle(id); return; }
      selectBundle(id);
      return;
    }

    /* ---- つなぎ目（接続点との1本／端子との1本）をクリック ---- */
    if (link) { selectLink(link.dataset.link); return; }

    /* ---- ボックスの中の線端をクリック ---- */
    if (end) { toggleEndSelection(end.dataset.end); return; }

    /* ---- ジョイントボックスそのもの ---- */
    if (jb) {
      setStatus('ジョイントボックスの中でつなぐには、<b>ケーブルの心線を2本えらんで「接続する」</b>、' +
        'または<b>線端どうしをえらんで「接続する」</b>。（ダブルクリックで拡大）');
      draw();
      return;
    }

    if (wire) {
      view.selectedWire = wire.dataset.wire;
      view.selectedBundle = null; view.selectedEnds.clear();
      const w = state.wires.find(x => x.id === view.selectedWire);
      if (w) setStatus(`選択中：${Engine.wireLabel(problem, w)}<br>線の真ん中の<b>×</b>を押すと削除できます（右クリック／Deleteキーでも削除、⌘Zで戻せます）`);
      draw();
      renderPanels();
      return;
    }

    // 何もない所
    view.pending = null; view.cursor = null; view.corePicker = null;
    view.selectedWire = view.selectedBundle = view.selectedSlot = view.selectedLink = null;
    view.selectedLink = null;
    view.selectedEnds.clear();
    view.pickTerm = null;
    if (view.pickedCores.length) { view.pickedCores = []; view.pickBox = null; view.pickTerm = null; toast('えらんだ心線を取り消しました'); }
    if (view.pickCable) { view.pickCable = null; renderMaterials(); toast('ケーブルを置くのをやめました'); }
    draw();
  }

  /* つなぎ目をえらぶ（1本ぶんの接続だけを外すため） */
  function selectLink(id) {
    if (view.selectedLink === id) { view.selectedLink = null; setStatus('選択を解除しました。'); draw(); return; }
    view.selectedLink = id;
    view.selectedWire = view.selectedBundle = null;
    view.selectedEnds.clear();
    view.pickTerm = null;
    const info = linkInfo(id);
    if (!info) { view.selectedLink = null; draw(); return; }
    setStatus(info.kind === 'inbox'
      ? `<b>${COLOR_JA[info.wire.color]}線</b> と <b>${info.spec}</b> のつなぎ目をえらびました。` +
        `<b>×</b> を押すと<b>この1本だけ</b>を接続点から外します（<b>電線も、ほかの心線も残ります</b>）。`
      : `<b>${COLOR_JA[info.wire.color]}線</b> と <b>${info.termName}</b> のつなぎ目をえらびました。` +
        `<b>×</b> を押すと<b>この端子から外します</b>（電線そのものは残ります）。`);
    draw();
    renderPanels();
  }

  /* つなぎ目の中身 */
  function linkInfo(id) {
    const parts = String(id).split(':');
    if (parts[0] === 'inbox') {
      const key = parts[1] + ':' + parts[2];
      const w = state.wires.find(x => x.id === parts[1]);
      const b = state.bundles.find(x => x.ends.indexOf(key) >= 0);
      if (!w || !b) return null;
      const info = Engine.bundleInfo(problem, state, b);
      return { kind: 'inbox', key, wire: w, bundle: b, spec: `接続点（${info.count}本・${info.spec}）` };
    }
    if (parts[0] === 'term') {
      const w = state.wires.find(x => x.id === parts[1]);
      const side = parts[2];
      if (!w) return null;
      const ep = side === 'a' ? w.a : w.b;
      if (!ep || ep.k !== 't') return null;
      const t = Engine.terminalRef(problem, ep.id);
      return { kind: 'term', wire: w, side, termName: t ? t.name : ep.id, group: t ? t.device.group : null };
    }
    return null;
  }

  /* つなぎ目を1つだけ外す */
  function removeLink(id) {
    if (answerGuard()) return;
    const info = linkInfo(id);
    if (!info) return;
    view.selectedLink = null;
    if (info.kind === 'inbox') {
      removeEndFromBundle(info.bundle.id, info.key);
      return;
    }
    pushHistory();
    const w = info.wire;
    w[info.side] = { k: 'g', id: info.group };
    setStatus(`<b>${COLOR_JA[w.color]}線</b> を <b>${info.termName}</b> から外しました。` +
      `電線は残っています（ケーブルの端に<span style="color:var(--bad)">赤い丸</span>）。` +
      `つなぎ直すときは、その心線をえらんで端子をクリックします。<kbd>⌘Z</kbd> で戻せます。`);
    toast('端子から外しました（⌘Zで戻せます）');
    afterChange();
  }

  /* つなぎ先に端子をえらんだ（まだつながない。ボタンを出すだけ） */
  function setPickTerm(id) {
    const tr = Engine.terminalRef(problem, id);
    if (!tr) return;
    if (view.pickTerm === id) { view.pickTerm = null; setStatus('つなぎ先の選択をやめました。'); draw(); return; }
    view.pickTerm = id;
    view.selectedBundle = null;
    const bad = badTermReason(id);
    setStatus(bad
      ? `<span style="color:var(--bad)">${bad}</span>`
      : `<b>${tr.name}</b> につなぎます。<br>${pickList()}<br><b>「ここに接続する」</b>を押すと、この心線がここにつながります。`,
      bad ? 'bad' : undefined);
    draw();
    renderPanels();
  }

  /* つなぎ先に接続点をえらんだ */
  function setPickBundle(id) {
    const b = state.bundles.find(x => x.id === id);
    if (!b) return;
    view.selectedBundle = id;
    view.pickTerm = null;
    updatePickBox();
    setStatus(`<b>${Engine.groupLabel(problem, b.jb)} の接続点</b>に足します。<br>${pickList()}<br>` +
      `<b>「この接続点に追加」</b>を押すとつながります。`);
    draw();
    renderPanels();
  }

  /* その端子につなげない理由（なければ null） */
  function badTermReason(id) {
    const tr = Engine.terminalRef(problem, id);
    if (!tr) return '端子が見つかりません。';
    if (view.pickedCores.length !== 1) {
      return `端子には心線を<b>1本だけ</b>つなげます（いま${view.pickedCores.length}本えらんでいます）。`;
    }
    const it = view.pickedCores[0];
    const run = slotRun(it.slot);
    const g = tr.device.group;
    const exist = coreWire(it.slot, it.color);
    if (exist && !(exist.a.k === 'g' || exist.b.k === 'g')) {
      return 'この心線はもう両はしともつながっています。';
    }
    if (run.a !== g && run.b !== g) {
      return `この心線（${Engine.runName(problem, run)}）は <b>${tr.name}</b> までは届きません。`;
    }
    if (wiresAtTerminal(id).length >= terminalMax(tr.terminal, tr.device)) {
      return `<b>${tr.name}</b> には、これ以上電線をつなげません。`;
    }
    return null;
  }

  /* ケーブル置き場を選ぶ（置いてあれば、そこから心線を引ける状態にする） */
  function selectSlot(key) {
    const run = slotRun(key);
    if (!run) return;
    view.selectedSlot = key;
    view.selectedWire = null;
    // えらんだ線端・接続点は消さない（別のケーブルの心線とつなぐため）
    view.cursor = null; view.hintSlot = null;
    const type = cableAt(key);
    if (type) {
      view.pending = null;
      view.corePicker = { key, color: null };
      setStatus(`<b>${type.name}</b>（${Engine.runName(problem, run)}）の<b>心線（${coresJa(type)}）から1本えらんで</b>ください。` +
        `えらんでも線は引かれません。<b>2本えらぶと「接続する」</b>が出ます。`);
    } else {
      view.pending = null;
      view.corePicker = { key, color: null };
      setStatus(`<b>${Engine.runName(problem, run)}</b> に置く<b>ケーブルをえらんで</b>ください。`);
    }
    draw();
    renderPanels();
  }

  /* ---------------- 心線を選ぶポップアップ ---------------- */
  /* その心線（ケーブル1本の中の1色）がすでに電線になっていれば、その電線を返す */
  function coreWire(key, color) {
    return state.wires.find(w => w.slot === key && w.color === color) || null;
  }

  /* 電線を「どのケーブルの心線か」に割りふる（1本のケーブルに同じ色は1本だけ） */
  function reassignSlots() {
    (problem.runs || []).forEach(run => {
      if (!run.slots) return;
      const ws = Engine.wiresOfRun(problem, state, run);
      const used = {};
      const take = (k, color) => {
        const set = used[k] = used[k] || {};
        if (set[color]) return false;
        set[color] = true; return true;
      };
      ws.forEach(w => {
        if (!w.slot) return;
        const t = cableAt(w.slot);
        if (!t || slotRun(w.slot) !== run || t.cores.indexOf(w.color) < 0 || !take(w.slot, w.color)) {
          delete w.slot; delete w.slotPicked;   // 利用者が選んだ心線ではなくなる
        }
      });
      ws.filter(w => !w.slot).forEach(w => {
        for (let i = 0; i < run.slots; i++) {
          const k = Engine.slotKey(run, i);
          const t = cableAt(k);
          if (!t || t.cores.indexOf(w.color) < 0) continue;
          if (!take(k, w.color)) continue;
          w.slot = k; delete w.slotPicked; break;
        }
      });
    });
  }
  /* その電線の、ジョイントボックス側の線端（両方ボックスなら2つ） */
  function boxEndsOf(w) {
    const out = [];
    ['a', 'b'].forEach(side => {
      const ep = side === 'a' ? w.a : w.b;
      if (ep.k === 'jb') out.push({ key: w.id + ':' + side, jb: ep.id });
    });
    return out;
  }

  /* 区間の両端のうち、ジョイントボックスでない側（端子をえらぶ側） */
  function deviceSideOf(run) {
    const isBox = (g) => {
      const ds = problem.devices.filter(d => d.group === g);
      return ds.length === 1 && ds[0].type === 'jointbox';
    };
    if (!isBox(run.a)) return run.a;
    if (!isBox(run.b)) return run.b;
    return null;   // 両端ともジョイントボックス
  }
  /* その区間で、ジョイントボックス側のグループ（1つか2つ） */
  function boxSidesOf(run) {
    const isBox = (g) => {
      const ds = problem.devices.filter(d => d.group === g);
      return ds.length === 1 && ds[0].type === 'jointbox';
    };
    return [run.a, run.b].filter(isBox);
  }
  /* そのグループの端子（連用スイッチなら3個ぶん全部） */
  function terminalsOfGroup(g) {
    const out = [];
    problem.devices.filter(d => d.group === g).forEach(d => {
      (d.terminals || []).forEach(t => out.push({
        id: d.id + '.' + t.id,
        label: (d.mark ? d.mark + ' ' : '') + (t.short || t.name),
        name: t.name, device: d
      }));
    });
    return out;
  }

  const pickedKey = (it) => it.slot + '/' + it.color;
  const isPicked = (slot, color) => view.pickedCores.some(it => it.slot === slot && it.color === color);

  function renderCorePicker() {
    const box = $('#core-picker');
    if (!box) return;

    /* ---- ケーブルを切るダイアログ ---- */
    if (view.cutPicker) {
      const cp = view.cutPicker;
      const t = Engine.cableType(cp.type);
      if (!t) { view.cutPicker = null; box.hidden = true; return; }
      const st = Engine.cableStock(problem, state)[cp.type] || { left: 0 };
      const close = `<button class="cp-close" data-cp="close" aria-label="閉じる">✕</button>`;
      if (!cp.key) {
        // 同じ区間に同じケーブルが何本も入るときは1行にまとめる（押すたびに1本ぶん切る）
        const plan0 = [];
        Engine.cutPlan(problem, state, cp.type).filter(x => !x.done).forEach(x => {
          const same = plan0.find(y => y.run === x.run);
          if (same) same.n++; else plan0.push(Object.assign({ n: 1 }, x));
        });
        // 切ったがまだ置いていないピース（長さが合うもの）のぶんは、もう切らなくてよい
        const spare = Engine.freePieces(state).filter(pc => pc.type === cp.type).map(pc => pc.len);
        plan0.forEach(x => {
          while (x.n > 0) {
            const k = spare.indexOf(x.cut);
            if (k < 0) break;
            spare.splice(k, 1); x.n--;
          }
        });
        const plan = plan0.filter(x => x.n > 0);
        const rows = plan.length
          ? plan.map(x =>
              `<button class="cp-core cp-cutrun" data-cp="cutrun" data-key="${x.key}">` +
              `<span><span class="cp-name">${Engine.runName(problem, x.run)}</span>` +
              `<small>図の寸法 ${x.span}mm${x.n > 1 ? `｜あと <b>${x.n}本</b>` : ''}</small></span>` +
              `<span class="cp-left">えらぶ ▸</span></button>`).join('')
          : plan0.length
            ? `<div class="cp-note">この種類は、必要なぶんを<b>もう切ってあります</b>。「② 切ったケーブル」から図の点線の枠に置いてください。</div>`
            : `<div class="cp-note">この種類のケーブルは、もう全部の区間に置いてあります。</div>`;
        box.innerHTML =
          `<div class="cp-head"><span class="cp-title"><b>${t.name} を切る</b>` +
          `<small>残り ${st.left}mm ／ どの区間ぶんを切りますか？</small></span>${close}</div>` +
          `<div class="cp-cores">${rows}</div>`;
      } else {
        const run = slotRun(cp.key);
        const choices = cutChoices(run);
        box.innerHTML =
          `<div class="cp-head"><span class="cp-title"><b>${Engine.runName(problem, run)}</b>` +
          `<small>図の寸法 ${run.span}mm｜何mmで切りますか？</small></span>${close}</div>` +
          `<div class="cp-cores">` + choices.map(v =>
            `<button class="cp-core cp-cutlen" data-cp="cutlen" data-len="${v}">` +
            `<span><span class="cp-name">${v}mm</span></span></button>`).join('') +
          `</div>` +
          `<div class="cp-foot"><button class="btn btn-sm" data-cp="cutback">← 区間をえらび直す</button></div>`;
      }
      box.hidden = false;
      box.classList.add('is-center');
      return;
    }
    box.classList.remove('is-center');

    const pick = view.corePicker;
    const key = pick && pick.key;
    const run = key ? slotRun(key) : null;
    const type = key ? cableAt(key) : null;
    if (!run) { box.hidden = true; box.innerHTML = ''; return; }

    const head = `<div class="cp-head"><span class="cp-title"><b>${type ? type.name : 'ケーブルをえらぶ'}</b>` +
      `<small>${Engine.runName(problem, run)}</small></span>` +
      `<button class="cp-close" data-cp="close" aria-label="閉じる">✕</button></div>`;
    let body = '';

    if (!type) {
      // ---- ケーブルがまだ無い枠：切ってあるケーブルの一覧 ----
      const free = Engine.freePieces(state);
      body = free.length
        ? `<div class="cp-cores">` + free.map(pc => {
            const t = Engine.cableType(pc.type);
            if (!t) return '';
            const ok = (!run.cut || pc.len === run.cut) && (!run.need || Engine.slotNeeds(run).indexOf(pc.type) >= 0);
            return `<button class="cp-core cp-cable" data-cp="pick" data-piece="${pc.id}">` +
              `<span class="cable-swatch" style="--sheath:${t.sheath};--edge:${t.edge}">` +
              t.cores.map(c => `<i class="core core-${c}"></i>`).join('') + `</span>` +
              `<span><span class="cp-name">${t.name}</span>` +
              `<small>心線 ${t.cores.map(c => COLOR_JA[c]).join('・')}</small></span>` +
              `<span class="cp-left"><b${ok ? '' : ' style="color:var(--bad)"'}>${pc.len}</b>mm</span>` +
              `</button>`;
          }).join('') + `</div>`
        : `<div class="cp-note">切ってあるケーブルがありません。<br>` +
          `上の<b>「① 支給ケーブル」</b>をえらんで <b>「ケーブルを切る」</b> を押してください。` +
          (run.span ? `<br><small>この区間の図の寸法は <b>${run.span}mm</b> です。</small>` : '') +
          `</div>`;
      box.innerHTML = head + body;
      box.hidden = false;
      placePicker(box, key);
      return;
    }

    body = `<div class="cp-cores">` + type.cores.map(color => {
      const w = coreWire(key, color);
      const free = w ? boxEndsOf(w).filter(e => !state.bundles.some(b => b.ends.indexOf(e.key) >= 0)) : [];
      const picked = isPicked(key, color);
      const loose = w && (w.a.k === 'g' || w.b.k === 'g');
      const note = picked ? 'えらんでいます（もう一度でとりけし）'
        : !w ? 'この心線をえらぶ'
        : loose ? '器具の端子につなぐ（まだ未接続）'
        : free.length ? `${Engine.deviceOf(problem, free[0].jb).label} がわをえらぶ`
        : 'もう接続ずみ';
      return `<div class="cp-row">` +
        `<button class="cp-core${picked ? ' is-selected' : ''}${(w && !free.length && !loose) ? ' is-full' : ''}"` +
        ` data-cp="color" data-color="${color}">` +
        `<i class="core core-${color}"></i>` +
        `<span><span class="cp-name">${COLOR_JA[color]}線</span><small>${note}</small></span></button>` +
        (w ? `<button class="cp-del" data-cp="delcore" data-color="${color}"` +
             ` title="この心線だけを消す（接続点や他の心線はそのまま）">✕</button>` : '') +
        `</div>`;
    }).join('') + `</div>`;

    box.innerHTML = head + body +
      `<div class="cp-foot"><button class="btn btn-sm" data-cp="remove">このケーブルを外す</button></div>`;
    box.hidden = false;
    placePicker(box, key);
  }

  /* ポップアップを枠のそばに置く（画面からはみ出さないように） */
  function placePicker(box, key) {
    const pos = Render.slots().get(key);
    const svg = $('#workspace');
    const stage = document.querySelector('.stage');
    if (!pos || !svg || !stage) return;
    const m = svg.getScreenCTM();
    if (!m) return;
    const pt = svg.createSVGPoint();
    pt.x = pos.x; pt.y = pos.y + pos.h;
    const sp = pt.matrixTransform(m);
    const sr = stage.getBoundingClientRect();
    const w = box.offsetWidth || 210, h = box.offsetHeight || 120;
    let left = sp.x - sr.left - w / 2;
    let top = sp.y - sr.top + 10;
    left = Math.max(6, Math.min(left, sr.width - w - 6));
    if (top + h > sr.height - 6) top = Math.max(6, sr.height - h - 6);
    box.style.left = left + 'px';
    box.style.top = Math.max(6, top) + 'px';
  }

  /* 色をえらんだとき：線は引かない。えらぶだけ */
  function chooseCore(color) {
    const pick = view.corePicker;
    const key = pick && pick.key;
    const run = key ? slotRun(key) : null;
    if (!run) return;
    setColor(color, false);

    // すでにえらんでいたら取り消し
    if (isPicked(key, color)) {
      view.pickedCores = view.pickedCores.filter(it => !(it.slot === key && it.color === color));
      view.corePicker = null;
      afterPick(`${COLOR_JA[color]}線をえらぶのをやめました。`);
      return;
    }
    const w = coreWire(key, color);
    // まだ器具につながっていない心線 → 端子につなぐためにえらぶ
    if (w && (w.a.k === 'g' || w.b.k === 'g')) {
      view.pickedCores.push({ slot: key, color, term: null });
      view.corePicker = null;
      afterPick(`<b>${COLOR_JA[color]}線</b>（${Engine.runName(problem, run)}）をえらびました` +
        `（この心線はまだ<b>器具につながっていません</b>）。`);
      return;
    }
    // すでにつながっている心線 → ボックス側の線端をえらぶ
    if (w) {
      const free = boxEndsOf(w).filter(e => !state.bundles.some(b => b.ends.indexOf(e.key) >= 0));
      if (!free.length) { toast('この心線はもう接続されています'); return; }
      const owner = null;
      const box = free[0].jb;
      Array.from(view.selectedEnds).forEach(k => { if (jbOfEnd(k) !== box) view.selectedEnds.delete(k); });
      view.selectedEnds.add(free[0].key);
      view.corePicker = null;
      afterPick(`${COLOR_JA[color]}線（${Engine.groupLabel(problem, box)}がわ）をえらびました。`);
      return;
    }
    // まだ引いていない心線 → えらぶだけ。つなぎ先は図の上でクリックしてもらう
    view.pickedCores.push({ slot: key, color, term: null });
    view.corePicker = null;
    afterPick(`<b>${COLOR_JA[color]}線</b>（${Engine.runName(problem, run)}）をえらびました。`);
  }

  /* えらんだあとの共通処理：つぎに何をすればよいかを出す */
  function afterPick(msg) {
    view.pickTerm = null;
    updatePickBox();
    draw();
    renderPanels();
    const n = view.pickedCores.length + view.selectedEnds.size;
    const unlanded = view.pickedCores.filter(it => !coreWire(it.slot, it.color) && deviceSideOf(slotRun(it.slot)));
    if (n === 1 && unlanded.length === 1) {
      const run = slotRun(unlanded[0].slot);
      setStatus(`${msg}<br><b>つなぎ先を図の上でクリック</b>してください` +
        `（${Engine.groupLabel(problem, deviceSideOf(run))} の端子、またはジョイントボックスの中の接続点）。` +
        `クリックすると<b>「ここに接続する」</b>ボタンが出ます。`);
      return;
    }
    if (n >= 2 && view.pickBox) {
      setStatus(`${msg}<br>${pickList()}<br>` +
        `<b>「接続する（${n}本）」</b>で、<b>${Engine.groupLabel(problem, view.pickBox)}</b> の中でこの${n}本がつながります。`);
      return;
    }
    if (n >= 2) {
      setStatus(`${msg}<br>${pickList()}<br>` +
        `<span style="color:var(--bad)">この心線どうしは<b>同じジョイントボックスに集まりません</b>。</span>`, 'bad');
      return;
    }
    setStatus(`${msg}<br><b>つなぎ先を図の上でクリック</b>（端子・接続点）するか、<b>もう1本の心線</b>をえらんでください。`);
  }

  const pickCount = () => view.pickedCores.length + view.selectedEnds.size;

  function pickList() {
    const parts = view.pickedCores.map(it => {
      const run = slotRun(it.slot);
      return `${COLOR_JA[it.color]}：${it.term ? Engine.endpointLabel(problem, { k: 't', id: it.term }) : Engine.runName(problem, run)}`;
    });
    Array.from(view.selectedEnds).forEach(k => {
      const w = state.wires.find(x => x.id === k.split(':')[0]);
      if (w) parts.push(`${COLOR_JA[w.color]}：${Engine.wireLabel(problem, w).replace(/^.線：/, '')}`);
    });
    return '選択中 ' + parts.length + '本 … ' + parts.join(' ／ ');
  }

  /* えらんだ心線が集まるジョイントボックスを求める */
  function updatePickBox() {
    let common = null;
    const push = (arr) => {
      common = common === null ? arr.slice() : common.filter(x => arr.indexOf(x) >= 0);
    };
    view.pickedCores.forEach(it => {
      const run = slotRun(it.slot);
      push(boxSidesOf(run));
    });
    Array.from(view.selectedEnds).forEach(k => { const b = jbOfEnd(k); if (b) push([b]); });
    if (view.selectedBundle) {
      const b = state.bundles.find(x => x.id === view.selectedBundle);
      if (b) push([b.jb]);
    }
    view.pickBox = common && common.length ? common[0] : null;
  }

  /* 「接続する」ボタン：えらんだ心線を、えらんだ場所につなぐ */
  function doConnect() {
    if (answerGuard()) return;

    /* ① つなぎ先が「器具の端子」のとき */
    if (view.pickTerm) {
      const bad = badTermReason(view.pickTerm);
      if (bad) { toast('ここにはつなげません'); setStatus(bad, 'bad'); return; }
      const it = view.pickedCores[0];
      const run = slotRun(it.slot);
      const tr = Engine.terminalRef(problem, view.pickTerm);
      const box = (run.a === tr.device.group ? run.b : run.a);
      pushHistory();
      const exist = coreWire(it.slot, it.color);
      if (exist) {
        // すでにボックスの中でつないである心線の、あいている端を器具につなぐ
        const side = exist.a.k === 'g' ? 'a' : exist.b.k === 'g' ? 'b' : null;
        if (!side) { toast('この心線はもうつながっています'); return; }
        exist[side] = { k: 't', id: view.pickTerm };
      } else {
        // 反対側がジョイントボックスでない区間（コンセントの送り配線など）は、
        // 反対の端を「まだ器具につないでいない端」として作る
        const boxIsJb = problem.devices.filter(d => d.group === box).every(d => d.type === 'jointbox');
        const id = 'w' + (state.seq++);
        state.wires.push({
          id, a: boxIsJb ? { k: 'jb', id: box } : { k: 'g', id: box },
          b: { k: 't', id: view.pickTerm },
          color: it.color, slot: it.slot, slotPicked: true
        });
      }
      const note = requiredColor({ k: 't', id: view.pickTerm });
      view.pickedCores = []; view.pickTerm = null; view.pickBox = null;
      setStatus(`<b>${COLOR_JA[it.color]}線</b>をつなぎました：${tr.name} ⇄ ${Engine.groupLabel(problem, box)}` +
        (note && note !== it.color
          ? `<br><span style="color:var(--warn)">※ここは施工条件では<b>${COLOR_JA[note]}</b>を使います</span>` : '') +
        `<br>ボックスの中では、この心線と別の心線をえらんで<b>「接続する」</b>でまとめます。`);
      toast(`${COLOR_JA[it.color]}線を ${tr.name} につなぎました`);
      afterChange();
      return;
    }

    /* ② ジョイントボックスの中でまとめるとき */
    if (!view.pickedCores.length) { makeBundle(); return; }
    updatePickBox();
    const box = view.pickBox;
    if (!box) {
      toast('同じジョイントボックスに集まる心線をえらんでください');
      setStatus('えらんだ心線が<b>同じジョイントボックスに集まりません</b>。えらび直してください。', 'bad');
      return;
    }
    const need = view.selectedBundle ? 1 : 2;
    if (pickCount() < need) { toast('心線を2本以上えらんでください'); return; }

    pushHistory();
    const landedLater = [];
    view.pickedCores.forEach(it => {
      const w = coreWire(it.slot, it.color);
      if (w) {
        const e = boxEndsOf(w).find(x => x.jb === box);
        if (e) view.selectedEnds.add(e.key);
        return;
      }
      const run = slotRun(it.slot);
      const other = run.a === box ? run.b : run.a;
      const otherIsBox = problem.devices.filter(d => d.group === other).every(d => d.type === 'jointbox');
      const id = 'w' + (state.seq++);
      state.wires.push({
        id,
        a: { k: 'jb', id: box },
        b: otherIsBox ? { k: 'jb', id: other } : { k: 'g', id: other },
        color: it.color, slot: it.slot, slotPicked: true
      });
      view.selectedEnds.add(id + ':a');
      if (!otherIsBox) landedLater.push({ id, group: other, color: it.color });
    });
    view.pickedCores = [];
    view.pickTerm = null;
    if (!makeBundle(true)) {
      // まとめられなかった（差込形コネクタの本数の上限など）：いま作った電線ごと取り消す
      restore(history.pop());
      afterChange();
      return;
    }
    if (landedLater.length) {
      const names = landedLater.map(x => `${COLOR_JA[x.color]}線（${Engine.groupLabel(problem, x.group)}がわ）`).join('、');
      setStatus($('#statusbar').innerHTML +
        `<br><span style="color:var(--warn)">※ ${names} は、まだ<b>器具の端子につながっていません</b>。` +
        `そのケーブルの心線をえらんで<b>端子をクリック</b>するとつながります。</span>`);
    }
  }

  /* ケーブルから心線を引くとき、クリックしてよい相手か */
  function cableTargets(run, from) {
    const fromG = from ? Engine.groupOfEndpoint(problem, from) : null;
    return fromG ? [run.a === fromG ? run.b : run.a] : [run.a, run.b];
  }

  /* 少し外した所をクリックしたとき、いちばん近い「その区間の端」を探す */
  function nearestCableEnd(pt, run, from) {
    if (!pt) return null;
    const ok = cableTargets(run, from);
    let best = null, bestD = Infinity;
    problem.devices.forEach(d => {
      if (ok.indexOf(d.group) < 0) return;
      if (d.type === 'jointbox') {
        const dx = Math.max(Math.abs(pt.x - d.x) - d.r, 0);
        const dy = Math.max(Math.abs(pt.y - d.y) - d.r, 0);
        const dist = Math.hypot(dx, dy);
        if (dist < bestD) { bestD = dist; best = { k: 'jb', id: d.id }; }
      } else {
        (d.terminals || []).forEach(t => {
          const dist = Math.hypot(pt.x - (d.x + t.dx), pt.y - (d.y + t.dy));
          if (dist < bestD) { bestD = dist; best = { k: 't', id: d.id + '.' + t.id }; }
        });
      }
    });
    return bestD <= 110 ? best : null;
  }

  /* ケーブルから心線を1本引く（両端をクリックして決める。片方がボックスならその場で完成） */
  let autoPickEnd = false;   // ケーブルから引いた直後だけ true
  let pullSlotKey = null;    // どのケーブルの心線を引いているか

  function cableClick(ep) {
    const p = view.pending;
    const run = slotRun(p.key);
    if (!run) { cancelPending(''); return; }
    const g = Engine.groupOfEndpoint(problem, ep);
    const ok = cableTargets(run, p.from);
    if (ok.indexOf(g) < 0) {
      toast('このケーブルの両端（青く光っている所）をクリックしてください');
      setStatus(`<b>${cableAt(p.key).name}</b> は <b>${Engine.runName(problem, run)}</b> のケーブルです。` +
        `<b>${ok.map(x => Engine.groupLabel(problem, x)).join(' か ')}</b> をクリックしてください（やめるには Esc）。`, 'bad');
      draw();
      return;
    }
    if (!p.from) {
      const otherG = g === run.a ? run.b : run.a;
      const devs = problem.devices.filter(d => d.group === otherG);
      if (devs.length === 1 && devs[0].type === 'jointbox') {
        // 反対側がジョイントボックス＝行き先は1つしかないので、そのまま引く
        view.pending = null; view.cursor = null;
        autoPickEnd = true; pullSlotKey = p.key;
        tryCreateWire(ep, { k: 'jb', id: devs[0].id });
        autoPickEnd = false; pullSlotKey = null;
        return;
      }
      view.pending = { k: 'cable', key: p.key, from: ep };
      setStatus(`${Engine.endpointLabel(problem, ep)} から引きます。` +
        `つぎに<b>${Engine.groupLabel(problem, otherG)}</b> の端子をクリックしてください。`);
      draw();
      return;
    }
    const from = p.from;
    view.pending = null; view.cursor = null;
    autoPickEnd = true; pullSlotKey = p.key;
    tryCreateWire(from, ep);
    autoPickEnd = false; pullSlotKey = null;
  }

  let panFrom = null, suppressClick = false;
  function onPan(e) {
    if (!panFrom) return;
    const stage = $('#workspace');
    const rect = stage.getBoundingClientRect();
    const b = panFrom.box;
    // SVG は preserveAspectRatio=meet なので、拡大率は縦横とも同じ
    const scale = Math.min(rect.width / b.w, rect.height / b.h) || 1;
    const dx = (e.clientX - panFrom.sx) / scale;
    const dy = (e.clientY - panFrom.sy) / scale;
    if (Math.abs(e.clientX - panFrom.sx) + Math.abs(e.clientY - panFrom.sy) > 4) suppressClick = true;
    setBox({ x: b.x - dx, y: b.y - dy, w: b.w });
  }

  /* 線端の選択（キャンバスでもパネルでも同じ動き） */
  function toggleEndSelection(k) {
    if (answerGuard()) return;
    const owner = state.bundles.find(b => b.ends.indexOf(k) >= 0);
    if (owner) { selectBundle(owner.id); return; }
    if (view.selectedBundle) {
      const sb = state.bundles.find(x => x.id === view.selectedBundle);
      if (!sb || sb.jb !== jbOfEnd(k)) view.selectedBundle = null;
    }
    if (view.selectedEnds.has(k)) view.selectedEnds.delete(k);
    else view.selectedEnds.add(k);
    view.selectedWire = null;
    view.pending = null; view.cursor = null;
    draw();
    renderPanels();
    if (view.selectedEnds.size >= 2) {
      setStatus(view.selectedBundle
        ? 'この接続点に追加します。「＋ この接続点に追加」を押してください'
        : `線端を ${view.selectedEnds.size} 本選びました。「接続する」を押すとまとめて圧着します（Enterでも可）`);
    } else if (view.selectedEnds.size === 1) {
      const box = jbOfEnd(k);
      const hasPoint = state.bundles.some(b => b.jb === box);
      setStatus(view.selectedBundle
        ? '「＋ この接続点に追加」を押すと、この線端が接続点に加わります'
        : hasPoint
          ? '<b>もう1本の線端</b>を選んで「接続する」。すでにある<b>接続点をクリック</b>すると、その接続点に追加します。'
          : 'もう1本えらぶと接続できます（右の「ジョイントボックスの中」からも選べます）');
    }
  }

  /* 接続点を選ぶ＝そこから電線を引ける状態にする
     （未接続の線端を選んだ状態でクリックしたときは、その接続点にまとめる） */
  function selectBundle(id) {
    const b = state.bundles.find(x => x.id === id);
    if (!b) return;
    const picked = Array.from(view.selectedEnds).filter(k =>
      jbOfEnd(k) === b.jb && !state.bundles.some(x => x.ends.indexOf(k) >= 0));
    if (picked.length) {          // 選んでいた線端を、この接続点に追加する
      view.selectedBundle = id;
      makeBundle();
      return;
    }
    view.selectedBundle = id;
    view.selectedWire = null;
    view.selectedEnds.clear();
    view.pending = { k: 'b', id };
    view.cursor = null;
    const info = Engine.bundleInfo(problem, state, b);
    setStatus(`接続点（${info.count}本・${info.spec}）を選択中。<b>ケーブルをクリックして心線をえらぶ</b>と、` +
      `<b>「この接続点に追加」</b>でこの接続点に足せます（器具の端子や となりのボックスをクリックして、ここから電線を伸ばすこともできます）。`);
    draw();
    renderPanels();
  }

  function onStageMove(e) {
    if (!view.pending) return;
    const stage = $('#workspace');
    view.cursor = svgPoint(stage, e);
    if (!Render.updatePreview(stage, view.cursor)) draw();
  }

  function onStageOver(e) {
    const term = e.target.closest('[data-term]');
    const jb = e.target.closest('[data-jb]');
    const next = term ? { k: 't', id: term.dataset.term } : jb ? { k: 'jb', id: jb.dataset.jb } : null;
    const cur = view.hover;
    if ((next && cur && next.k === cur.k && next.id === cur.id) || (!next && !cur)) return;
    view.hover = next;
    draw();
  }

  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      const a = document.activeElement;
      if (a && a.dataset && (a.dataset.term || a.dataset.jb || a.dataset.end || a.dataset.bundle || a.dataset.wire || a.dataset.sw)) {
        a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        e.preventDefault();
        return;
      }
    }
    if (e.key === 'Escape') { cancelPending('やめました。1つ前の状態に戻しました。'); }
    else if (e.key === '1') setColor('black');
    else if (e.key === '2') setColor('white');
    else if (e.key === '3') setColor('red');
    else if (e.key === 'Enter' && (view.pickedCores.length + view.selectedEnds.size) >= (view.selectedBundle ? 1 : 2)) doConnect();
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (view.selectedLink) { removeLink(view.selectedLink); e.preventDefault(); }
      else if (view.selectedWire) { deleteWire(view.selectedWire); e.preventDefault(); }
      else if (view.selectedBundle) { deleteBundle(view.selectedBundle); e.preventDefault(); }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
  }

  const countState = () => ({
    cables: Object.keys(state.cables).length,
    wires: state.wires.length,
    bundles: state.bundles.length
  });
  /* 何がどう変わったかを日本語にする（「押しても何も起きない」と思わせないため） */
  function describeChange(before, after) {
    const parts = [];
    const add = (label, a, b, unit) => { if (a !== b) parts.push(`${label} ${a}${unit} → <b>${b}${unit}</b>`); };
    add('ケーブル', before.cables, after.cables, '本');
    add('電線', before.wires, after.wires, '本');
    add('接続点', before.bundles, after.bundles, 'か所');
    return parts.join('／');
  }
  function undo() {
    if (answerGuard()) return;
    if (!history.length) {
      toast('これ以上戻れません');
      setStatus('これ以上<b>元に戻せません</b>（いまが、いちばん古い状態です）。すべて消すなら<b>「1からやり直す」</b>。', 'bad');
      return;
    }
    const before = countState();
    future.push(snapshot());
    restore(history.pop());
    afterChange();
    const diff = describeChange(before, countState());
    setStatus('<b>1つ元に戻しました。</b>' + (diff ? '　' + diff : '（接続のまとめ方が戻りました）') +
      `　残り ${history.length} 回戻せます。`);
    toast('1つ元に戻しました');
  }
  function redo() {
    if (answerGuard()) return;
    if (!future.length) {
      toast('やり直す操作がありません');
      setStatus('<b>やり直す操作がありません</b>（いまが、いちばん新しい状態です）。', 'bad');
      return;
    }
    const before = countState();
    history.push(snapshot());
    restore(future.pop());
    afterChange();
    const diff = describeChange(before, countState());
    setStatus('<b>1つやり直しました。</b>' + (diff ? '　' + diff : '') + `　残り ${future.length} 回やり直せます。`);
    toast('1つやり直しました');
  }

  /* すべて消して、何もない状態に戻す */
  function resetAll() {
    if (showingAnswer) toggleAnswer();
    pushHistory();
    state.wires = [];
    state.bundles = [];
    state.cables = {};
    state.pieces = [];      // 切ったケーブルも戻す
    state.seq = 1;
    Object.keys(state.switches).forEach(k => { state.switches[k] = false; });
    state.power = false;
    view.pending = null; view.cursor = null; view.focus = null; view.viewBox = null; view.wsZoom = 1;
    const scr = wsScroller(); if (scr) { scr.scrollLeft = 0; scr.scrollTop = 0; }
    view.selectedWire = view.selectedBundle = view.selectedSlot = view.selectedLink = null;
    view.pickCable = view.dragCable = view.hintSlot = view.corePicker = null;
    view.pickRoll = null; view.cutPicker = null;
    view.pickedCores = []; view.pickBox = null; view.pickTerm = null;
    view.selectedEnds.clear();
    showingAnswer = false;
    savedWork = null;
    $('#btn-answer').textContent = '正解を見る';
    $('#score-value').textContent = '—';
    document.querySelector('.score-ring').dataset.state = 'idle';
    $('#score-label').textContent = '「採点する」を押してください';
    $('#issues').innerHTML = '';
    view.powerMode = true;
    try { localStorage.removeItem(storageKey()); } catch (e) { /* noop */ }
    setStatus('<b>まっさらにしました。</b>' + firstHint());
    toast('すべて消しました（⌘Zで戻せます）');
    afterChange();
    scrollWorkspaceToContent();   // スマホ：図の大きさを元に戻したので、器具の描いてある所から見せる
  }

  function setColor(c, announce) {
    view.color = c;
    document.querySelectorAll('.swatch').forEach(b => b.classList.toggle('is-active', b.dataset.color === c));
    if (announce !== false) setStatus(`電線の色：<b>${COLOR_JA[c]}</b>`);
  }

  /* ---------------- ちいさなUI ---------------- */
  let pendingNote = '';
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function setStatus(html, kind) {
    const s = $('#statusbar');
    s.innerHTML = html;
    s.className = 'statusbar' + (kind === 'ok' ? ' is-ok' : kind === 'bad' ? ' is-bad' : '');
  }

  /* ---------------- 初期化 ---------------- */
  /* 電源の N・L にあたる端子（配線用遮断器などを電源にする問題では srcTerms で指定） */
  function srcTerm(which) {
    const sn = Engine.srcNodes(problem);
    const id = (which === 'N' ? sn.N : sn.L).slice(2);
    const t = Engine.terminalRef(problem, id);
    return { id, group: t ? t.device.group : 'src', t };
  }

  /* 最初の一手を具体的に示す */
  function firstHint() {
    const left = (problem.runs || []).filter(r => r.slots)
      .reduce((n, r) => n + Engine.runSlots(state, r).filter(c => !c).length, 0);
    if (left) {
      return `まず <b>①ケーブルを切る</b>。上の<b>「① 支給ケーブル」</b>をえらんで <b>「ケーブルを切る」</b> を押し、` +
        `<b>区間</b>と<b>長さ</b>をえらびます（切る長さ＝<b>図の寸法＋接続・結線する端ごとに50mm</b>）。` +
        `切ったら図の<b>点線の枠（${left}か所）</b>に置きます。`;
    }
    const n = Engine.allTerminals(problem).find(t => t.kind === 'load-n');
    const sN = srcTerm('N');
    const g = n ? routeBetween(sN.group, n.device.group) : null;
    const nextBox = g && g.length > 1 ? Engine.groupLabel(problem, g[1]) : 'ジョイントボックス';
    const srcName = sN.t && sN.t.device.id !== 'src' ? `${sN.t.device.label}の「${sN.t.terminal.tbName || sN.t.terminal.id}」` : '電源の「N 接地側」';
    return `ケーブルがそろいました。つぎは <b>白</b>を選び、<b>${srcName}（青い端子）</b> → <b>${nextBox}</b> の順にクリックします。`;
  }

  const LAST_KEY = 'fukusenzu:last';

  function loadProblem(id) {
    problem = window.PROBLEMS.find(p => p.id === id) || window.PROBLEMS[0];
    try { localStorage.setItem(LAST_KEY, problem.id); } catch (e) { /* 使えなくても続行 */ }
    state = emptyState(problem);
    history = []; future = []; savedWork = null; showingAnswer = false;
    view.pending = null; view.cursor = null; view.focus = null; view.viewBox = null; view.wsZoom = 1;
    const scr = wsScroller(); if (scr) { scr.scrollLeft = 0; scr.scrollTop = 0; }
    view.selectedWire = view.selectedBundle = view.selectedSlot = view.selectedLink = null; view.selectedEnds.clear();
    view.pickCable = view.dragCable = view.hintSlot = view.corePicker = null;
    view.pickRoll = null; view.cutPicker = null;
    view.pickedCores = []; view.pickBox = null; view.pickTerm = null;
    $('#btn-answer').textContent = '正解を見る';
    load();

    Render.drawSingleLine($('#single-line'), problem);
    $('#conditions').innerHTML = problem.conditions.map(c => `<li>${c}</li>`).join('');
    $('#tips').innerHTML = (problem.tips || []).map(c => `<li>${c}</li>`).join('');
    renderMaterials();
    $('#score-value').textContent = '—';
    document.querySelector('.score-ring').dataset.state = 'idle';
    $('#score-label').textContent = '「採点する」を押してください';
    $('#issues').innerHTML = '';
    afterChange();
    if (!state.wires.length) setStatus(firstHint());
    scrollWorkspaceToContent();
  }

  /* スマホ：問題を開いたら、図の左の何も無い所を飛ばして、器具の描いてある所から見せる */
  function scrollWorkspaceToContent() {
    const sc = wsScroller();
    const ws = $('#workspace');
    if (!sc || !ws || !isPhone() || sc.scrollWidth <= sc.clientWidth + 1) return;
    let x0 = Infinity;
    ws.querySelectorAll(':scope > g').forEach(g => {
      try { const b = g.getBBox(); if (b.width || b.height) x0 = Math.min(x0, b.x); } catch (e) { /* 描けていない */ }
    });
    if (!isFinite(x0)) return;
    const b = baseBox();
    sc.scrollLeft = Math.max(0, (x0 - b.x) * ws.clientWidth / b.w - 8);
  }

  function init() {
    collapseRefCardsIfShort();
    const sel = $('#problem-select');
    window.PROBLEMS.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.title + '｜' + p.subtitle;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => loadProblem(sel.value));

    document.querySelectorAll('.swatch').forEach(b =>
      b.addEventListener('click', () => setColor(b.dataset.color, true)));

    /* ---- ①支給ケーブル（長いまま）：えらんで「切る」 ---- */
    const mats = $('#materials');
    mats.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-roll]');
      if (chip) pickRoll(chip.dataset.roll);
    });
    mats.addEventListener('keydown', (e) => {
      const chip = e.target.closest('[data-roll]');
      if (chip && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickRoll(chip.dataset.roll); }
    });

    /* ---- ②切ったケーブル：クリック／ドラッグ＆ドロップで区間に置く ---- */
    const cuts = $('#materials-cut');
    if (cuts) {
      cuts.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-piece]');
        if (chip) pickCable(chip.dataset.piece);
      });
      cuts.addEventListener('keydown', (e) => {
        const chip = e.target.closest('[data-piece]');
        if (chip && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickCable(chip.dataset.piece); }
      });
      cuts.addEventListener('dragstart', (e) => {
        const chip = e.target.closest('[data-piece]');
        if (!chip) return;
        if (answerGuard()) { e.preventDefault(); return; }
        view.dragCable = chip.dataset.piece;
        view.pickCable = null;
        view.pending = null; view.cursor = null;
        try {
          e.dataTransfer.setData('text/plain', chip.dataset.piece);
          e.dataTransfer.effectAllowed = 'copy';
        } catch (err) { /* noop */ }
        chip.classList.add('is-dragging');
        draw();
      });
      cuts.addEventListener('dragend', (e) => {
        const chip = e.target.closest('[data-piece]');
        if (chip) chip.classList.remove('is-dragging');
        view.dragCable = null;
        draw();
      });
    }

    /* ---- 「ケーブルを切る」ボタン ---- */
    const bcut = $('#btn-cut');
    if (bcut) bcut.addEventListener('click', () => {
      if (answerGuard()) return;
      if (!view.pickRoll) { toast('先に、上の支給ケーブルをえらんでください'); return; }
      view.cutPicker = { type: view.pickRoll, key: null };
      view.corePicker = null;
      renderCorePicker();
    });

    /* ---- 心線えらびポップアップ ---- */
    $('#core-picker').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cp]');
      if (!b) return;
      const what = b.dataset.cp;
      if (what === 'close') { view.corePicker = null; setStatus('心線えらびを閉じました。'); draw(); return; }
      if (what === 'remove') { const k = view.corePicker.key; view.corePicker = null; removeCable(k); return; }
      if (what === 'back') { view.corePicker = { key: view.corePicker.key, color: null }; draw(); return; }
      if (what === 'delcore') {
        const w = coreWire(view.corePicker.key, b.dataset.color);
        if (w) {
          deleteWire(w.id);
          toast(`${COLOR_JA[b.dataset.color]}線を1本だけ消しました（⌘Zで戻せます）`);
        }
        return;
      }
      if (what === 'pick') { placePiece(view.corePicker.key, b.dataset.piece); return; }
      if (what === 'cutrun') { view.cutPicker = { type: view.cutPicker.type, key: b.dataset.key }; renderCorePicker(); return; }
      if (what === 'cutlen') {
        const cp = view.cutPicker;
        const [rid, idx] = String(cp.key).split('#');
        if (cutPiece(cp.type, rid, parseInt(idx, 10), parseInt(b.dataset.len, 10))) {
          view.cutPicker = null; renderCorePicker();
        }
        return;
      }
      if (what === 'cutback') { view.cutPicker = { type: view.cutPicker.type, key: null }; renderCorePicker(); return; }
      if (what === 'color') chooseCore(b.dataset.color);
      if (what === 'term') chooseCoreTerminal(b.dataset.term);
    });

    const stageBox = document.querySelector('.stage');
    stageBox.addEventListener('dragover', (e) => {
      if (!view.dragCable) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'copy'; } catch (err) { /* noop */ }
    });
    stageBox.addEventListener('drop', (e) => {
      let id = view.dragCable;
      try { id = e.dataTransfer.getData('text/plain') || id; } catch (err) { /* noop */ }
      view.dragCable = null;
      if (!Engine.pieceOf(state, id)) { draw(); return; }
      e.preventDefault();
      const hit = e.target.closest && e.target.closest('[data-slot]');
      const key = hit ? hit.dataset.slot : slotAtPoint(svgPoint($('#workspace'), e));
      if (!key) {
        toast('ケーブルは、図の<点線の枠>の上に落としてください'.replace('<', '「').replace('>', '」'));
        setStatus('ケーブルは、図の<b>点線の枠（ケーブルを選ぶ）</b>の上に落としてください。', 'bad');
        draw();
        return;
      }
      placePiece(key, id);
    });

    const stage = $('#workspace');
    stage.addEventListener('click', (e) => { if (suppressClick) { suppressClick = false; return; } onStageClick(e); });
    stage.addEventListener('pointermove', (e) => { onPan(e); onStageMove(e); onStageOver(e); });
    // 右クリック＝取り消し（引きかけをやめる／電線・接続点を消す）
    stage.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const t = e.target;
      const wire = t.closest('[data-wire]');
      const end = t.closest('[data-end]');
      const bundle = t.closest('[data-bundle]');
      const slot = t.closest('[data-slot]');
      const link = t.closest('[data-link]');
      if (link) { removeLink(link.dataset.link); return; }

      if (view.pickCable) {
        view.pickCable = null; renderMaterials(); draw();
        toast('ケーブルを置くのをやめました');
        return;
      }
      if (view.pending) {
        cancelPending(view.pending.k === 'cable'
          ? 'この心線を引くのをやめました。ケーブルはそのままです。'
          : '引きかけの電線をやめました（接続点を選ぶ前の状態に戻しました）。');
        toast('引きかけの電線をやめました');
        return;
      }
      if (end) {
        const k = end.dataset.end;
        const owner = state.bundles.find(b => b.ends.indexOf(k) >= 0);
        if (owner) { removeEndFromBundle(owner.id, k); return; }
        deleteWire(k.split(':')[0]);
        toast('電線を削除しました（「元に戻す」／⌘Zで戻せます）');
        return;
      }
      if (wire) {
        deleteWire(wire.dataset.wire);
        toast('電線を削除しました（「元に戻す」／⌘Zで戻せます）');
        return;
      }
      if (bundle) {
        deleteBundle(bundle.dataset.bundle);
        toast('接続点をはずしました（「元に戻す」／⌘Zで戻せます）');
        return;
      }
      if (slot) {
        if (cableAt(slot.dataset.slot)) removeCable(slot.dataset.slot);
        else toast('ここにはまだケーブルがありません');
        return;
      }
      cancelPending('選択を解除しました。');
    });

    stage.addEventListener('dblclick', (e) => {
      if (isPhone()) {
        // スマホ：ボックスをダブルタップ → 大きくしてそのボックスを真ん中に。何もない所 → 基本の大きさに戻す
        const jbp = e.target.closest('[data-jb]');
        if (jbp) {
          const d = Engine.deviceOf(problem, jbp.dataset.jb);
          view.pending = null;
          const z = view.wsZoom === 'fit' ? 1 : +view.wsZoom || 1;
          phoneZoomTo(ZOOMS.find(x => x > z) || ZOOMS[ZOOMS.length - 1], d ? { x: d.x, y: d.y } : null);
          return;
        }
        if (e.target.closest('[data-term],[data-end],[data-bundle],[data-wire],[data-sw],[data-slot],[data-connect]')) return;
        if (view.wsZoom !== 1 || view.viewBox) phoneZoomTo(1);
        return;
      }
      const jb = e.target.closest('[data-jb]');
      if (jb) { view.pending = null; zoomToDevice(jb.dataset.jb); return; }
      if (e.target.closest('[data-term],[data-end],[data-bundle],[data-wire],[data-sw]')) return;
      resetZoom();
    });
    stage.addEventListener('wheel', (e) => {
      if (isPhone()) return;   // スマホの幅では、ホイールは枠のスクロールに使う
      e.preventDefault();
      zoomAt(svgPoint(stage, e), e.deltaY > 0 ? 1.12 : 0.89);
    }, { passive: false });
    stage.addEventListener('pointerdown', (e) => {
      suppressClick = false;
      // スマホ：拡大（viewBox）していなければ、図を指でなぞるのはブラウザのスクロールに任せる（図をずらさない）
      if (isPhone() && !view.viewBox) return;
      if (e.target.closest('[data-term],[data-jb],[data-end],[data-bundle],[data-wire],[data-sw]')) return;
      panFrom = { sx: e.clientX, sy: e.clientY, box: currentBox() };
    });
    window.addEventListener('pointerup', () => { panFrom = null; });
    window.addEventListener('pointercancel', () => { panFrom = null; });
    const zin = $('#btn-zoom-in'), zout = $('#btn-zoom-out'), zfit = $('#btn-zoom-fit');
    if (zin) zin.addEventListener('click', () => { if (isPhone()) { phoneZoomStep(1); return; } const b = currentBox(); zoomAt({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, 0.8); });
    if (zout) zout.addEventListener('click', () => { if (isPhone()) { phoneZoomStep(-1); return; } const b = currentBox(); zoomAt({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, 1.25); });
    if (zfit) zfit.addEventListener('click', () => {
      if (isPhone()) { phoneZoomTo(view.wsZoom === 'fit' ? 1 : 'fit'); toast(view.wsZoom === 'fit' ? '図の全体を表示しています（もう一度押すと元の大きさ）' : '元の大きさに戻しました'); return; }
      resetZoom();
    });
    // 画面の向き・大きさが変わったら描き直す（文字・札の大きさは画面の幅で決まるため。スマホの幅の切り替えもここで反映）
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { draw(); }, 150);
    });
    document.addEventListener('keydown', onKey);

    const bcEl = $('#btn-connect');
    if (bcEl) bcEl.addEventListener('click', () => doConnect());
    const bdEl = $('#btn-delete');
    if (bdEl) bdEl.addEventListener('click', () => {
      if (view.selectedLink) removeLink(view.selectedLink);
      else if (view.selectedWire) deleteWire(view.selectedWire);
      else if (view.selectedBundle) deleteBundle(view.selectedBundle);
    });
    $('#btn-undo').addEventListener('click', undo);
    const undo2 = $('#btn-undo2');   // スマホの作業エリアの上の行（同じ動き）
    if (undo2) undo2.addEventListener('click', undo);
    const redoBtn = $('#btn-redo');
    if (redoBtn) redoBtn.addEventListener('click', redo);
    $('#btn-check').addEventListener('click', runGrade);
    $('#btn-answer').addEventListener('click', toggleAnswer);
    /* 1からやり直す：2回押しで実行（押しまちがい防止。確認ダイアログが出ない環境があるため） */
    const resetBtns = [$('#btn-reset'), $('#btn-reset2'), $('#btn-reset3')].filter(Boolean);
    const RESET_LABEL = resetBtns.map(b => b.textContent);
    let resetArmed = null;
    const disarmReset = () => {
      if (resetArmed) clearTimeout(resetArmed);
      resetArmed = null;
      resetBtns.forEach((b, i) => { b.textContent = RESET_LABEL[i]; b.classList.remove('is-armed'); });
    };
    resetBtns.forEach(btn => btn.addEventListener('click', () => {
      if (!resetArmed) {
        if (showingAnswer) toggleAnswer();
        const n = state.wires.length, c = Object.keys(state.cables).length, b = state.bundles.length;
        if (!n && !c && !b) { setStatus('すでにまっさらです。' + firstHint()); toast('すでに何もありません'); return; }
        resetBtns.forEach(x => { x.textContent = 'もう一度押すと全部消えます'; x.classList.add('is-armed'); });
        setStatus(`<b>1からやり直しますか？</b> ケーブル ${c}本・電線 ${n}本・接続点 ${b}か所を<b>すべて消して</b>、` +
          `何もない状態に戻します。<b>もう一度「もう一度押すと全部消えます」を押す</b>と実行します` +
          `（押さずに5秒たつと取り消し。実行しても <kbd>⌘Z</kbd> で戻せます）。`, 'bad');
        toast('もう一度押すと全部消えます');
        resetArmed = setTimeout(() => { disarmReset(); setStatus('やり直しを取り消しました。'); }, 5000);
        return;
      }
      disarmReset();
      resetAll();
    }));
    $('#btn-hint').addEventListener('click', () => {
      const steps = Engine.steps(problem, state);
      const idx = steps.findIndex(s => !s.done);
      if (idx < 0) { setStatus('すべての手順が完了しています。採点してみましょう。', 'ok'); return; }
      const next = steps[idx];

      // ②接地側 / ④帰り線 は、クリックする順番まで具体的に出す
      const base = Engine.buildDSU(problem, state, null);
      let concrete = '';
      if (next.id === 'cables') {
        const run = (problem.runs || []).find(r =>
          r.slots && Engine.runSlots(state, r).some(c => !c));
        if (run) {
          // まだ置かれていない種類（管の中の IV のように順不同の区間もある）
          const miss = Engine.cutPlan(problem, state).find(x => x.run === run && !x.done);
          const need = Engine.cableType(miss ? miss.need : Engine.slotNeed(run, 0));
          view.hintSlot = run.id;
          draw();
          setTimeout(() => { view.hintSlot = null; draw(); }, 3000);
          concrete = `<b>${need ? need.name : run.note}</b> を <b>${run.cut || '?'}mm</b> で切って` +
            `（図の寸法 ${run.span || '?'}mm ＋ 端ごとに50mm）、` +
            `<b>${Engine.runName(problem, run)}</b> の点線の枠（いま光っています）に置きます。` +
            (need ? `<br>このケーブルの心線は <b>${need.cores.map(c => COLOR_JA[c]).join('・')}</b> です。` : '');
        }
      } else if (next.id === 'n' || next.id === 'l') {
        // 採点の手順（Engine.steps）と同じ規則で選んだ端子（極性の無い器具は、いまのつなぎ方で向きを読み替え済み）
        const isN = next.id === 'n';
        const node = isN ? Engine.srcNodes(problem).N : Engine.srcNodes(problem).L;
        const t = Engine.terminalRef(problem, (next.targets || [])[0]);
        if (t) {
          const col = isN ? '<b>白線</b>' : '<b>黒線</b>';
          // 同じ取付枠の中に、もう電源が来ている端子があれば渡り線で送る
          const fed = Engine.hasJumper(problem, t.device.group) && Engine.allTerminals(problem)
            .find(x => x.device.group === t.device.group && x.id !== t.id && base.same('T:' + x.id, node));
          if (fed) {
            concrete = `${col}の<b>渡り線</b>で：${fed.name} → ${t.name}`;
          } else {
            const sT = srcTerm(isN ? 'N' : 'L');
            const path = routeBetween(sT.group, t.device.group);
            if (path) concrete = `${col}で：` + routeSteps(path, { k: 't', id: sT.id }, { k: 't', id: t.id }).join('　') +
              (!isN && Engine.hasJumper(problem, t.device.group) ? '（同じ取付枠のほかの点滅器・コンセントへは<b>渡り線</b>で送ります）' : '');
          }
        }
      } else if (next.id === 'return') {
        const p = problem.pairs.find(pp => {
          const sw = Engine.deviceOf(problem, pp.sw), ld = Engine.deviceOf(problem, pp.load);
          if (!sw || !ld) return false;
          const le = Engine.loadEnds(problem, base, ld);
          if (!le) return false;
          const o = Engine.swOrientation(problem, base, sw);
          return !!o.load && !base.same(o.load, le.x);
        });
        if (p) {
          const sw = Engine.deviceOf(problem, p.sw), ld = Engine.deviceOf(problem, p.load);
          const path = routeBetween(sw.group, ld.group);
          const le = Engine.loadEnds(problem, base, ld);
          const o = Engine.swOrientation(problem, base, sw);
          if (path && le) concrete = `${Engine.swTitle(problem, p.sw, p.mark)}の帰り線：` +
            routeSteps(path, { k: 't', id: o.loadId }, { k: 't', id: le.xId }).join('　');
        }
      } else if (next.id === 'trav') {
        // スイッチ相互間（3路の 1・3、4路の 1・3／2・4）
        const f = Engine.travelerFaults(problem, base).faults[0];
        const p = f && problem.pairs.find(pp => Engine.pairSwitches(pp).indexOf(f.dev.id) >= 0);
        if (p) {
          const chain = (p.via || []).concat([p.sw]);   // 電源側 → 負荷側
          const i = chain.indexOf(f.dev.id);
          const peerId = (f.side === 'b' || i === 0) ? chain[i + 1] : chain[i - 1];
          const peer = peerId && Engine.deviceOf(problem, peerId);
          const path = peer && routeBetween(f.dev.group, peer.group);
          if (path) concrete = `${f.dev.label} の ${f.ids.map(x => x.split('.')[1]).join('・')}：` +
            routeSteps(path).join('　') + '（相手の同じ側の2端子へ1本ずつ。入れ替わって交差してもかまいません）';
        }
      }
      setStatus('ヒント：' + (next.hint || next.text.replace(/<[^>]+>/g, '')) + (concrete ? '<br>' + concrete : ''));
      toast((next.hint || next.text.replace(/<[^>]+>/g, '')).slice(0, 60));
    });

    const tl = $('#toggle-labels');
    if (tl) tl.addEventListener('change', (e) => {
      view.showLabels = e.target.checked;
      draw();
    });

    /* 前に開いていた問題があれば、そこから再開する */
    let startId = window.PROBLEMS[0].id;
    try {
      const last = localStorage.getItem(LAST_KEY);
      if (last && window.PROBLEMS.some(p => p.id === last)) startId = last;
    } catch (e) { /* 使えなくても既定の問題で始める */ }
    sel.value = startId;
    loadProblem(startId);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
