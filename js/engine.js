/* ===========================================================
   engine.js — 回路モデル・採点・通電シミュレーション
   （描画には依存しない純粋なロジック）
   =========================================================== */

(function () {
  'use strict';

  const COLOR_JA = { black: '黒', white: '白', red: '赤', green: '緑' };

  /* ---------------- Union-Find ---------------- */
  function DSU() {
    const p = new Map();
    const find = (x) => {
      if (!p.has(x)) p.set(x, x);
      let r = x;
      while (p.get(r) !== r) r = p.get(r);
      while (p.get(x) !== r) { const n = p.get(x); p.set(x, r); x = n; }
      return r;
    };
    return {
      find,
      union(a, b) { const ra = find(a), rb = find(b); if (ra !== rb) p.set(ra, rb); },
      same(a, b) { return find(a) === find(b); },
      keys() { return Array.from(p.keys()); }
    };
  }

  /* ---------------- 参照ヘルパ ---------------- */
  const nodeOfEnd = (wire, side) =>
    (side === 'a' ? wire.a : wire.b).k === 't'
      ? 'T:' + (side === 'a' ? wire.a : wire.b).id
      : 'E:' + wire.id + ':' + side;

  const endKey = (wireId, side) => wireId + ':' + side;

  function deviceOf(problem, id) {
    return problem.devices.find(d => d.id === id) || null;
  }

  /* 電源の節点。問題が source を持たなければ従来どおり src.L / src.N */
  function srcNodes(problem) {
    const s = (problem && problem.srcTerms) || {};
    return { L: 'T:' + (s.l || 'src.L'), N: 'T:' + (s.n || 'src.N') };
  }

  /* 器具の接点（ONのときつながる端子の組）。
     contacts があればそれ、無ければ従来どおり片切スイッチの C–L */
  function contactsOf(dev) {
    if (dev.positions) return dev.positions[1] || [];   // 3路・4路：位置1の接点（表示用）
    if (dev.contacts) return dev.contacts;
    if (dev.type === 'switch') return [['C', 'L']];
    return [];
  }
  /* 位置ごとの接点 [位置0, 位置1]。positions が無ければ従来どおり「切＝なし／入＝contacts」 */
  function positionsOf(dev) {
    if (dev.positions) return dev.positions;
    const c = contactsOf(dev);
    return c.length ? [[], c] : [];
  }
  /* 「入／切」できる器具（片切スイッチ＋contacts を持つ端子台など＋3路・4路） */
  function switchables(problem) {
    return problem.devices.filter(d => positionsOf(d).some(p => p.length > 0));
  }
  /* 複数か所点滅：その pair を受け持つ点滅器（帰り線側の sw ＋ via） */
  const pairSwitches = (p) => [p.sw].concat(p.via || []);

  /* 負荷の接地側・非接地側。poleSwap の負荷（確認表示灯など極性の無いもの）は、
     実際に N が来ている方を接地側とみなす（片切スイッチの swOrientation と同じ考え） */
  function loadEnds(problem, dsu, load) {
    const ts = (load && load.terminals) || [];
    const n = ts.find(t => t.kind === 'load-n'), x = ts.find(t => t.kind === 'load-x');
    if (!n || !x) return null;
    const nId = load.id + '.' + n.id, xId = load.id + '.' + x.id;
    const N = srcNodes(problem).N;
    if (load.poleSwap && dsu && !dsu.same('T:' + nId, N) && dsu.same('T:' + xId, N)) {
      return { n: 'T:' + xId, nId: xId, x: 'T:' + nId, xId: nId, swapped: true };
    }
    return { n: 'T:' + nId, nId, x: 'T:' + xId, xId, swapped: false };
  }

  /* そのグループの中に渡り線（ケーブルを使わない区間）があるか */
  const hasJumper = (problem, g) => (problem.runs || []).some(r => r.free && r.a === g && r.b === g);

  /* 指摘文での点滅器の呼び名。スイッチは「点滅器「イ」」、端子台で代用した器具は代用しているものの名前
     （リモコンリレー「イ」・タイムスイッチ「イ」・自動点滅器「ロ」など。dev.swName で指定もできる） */
  function swTitle(problem, swId, mark) {
    const d = deviceOf(problem, swId);
    if (!d || d.type === 'switch') return `点滅器「${mark}」`;
    const m = /（(.+?)代用）/.exec(d.label || '');
    return `${d.swName || (m ? m[1] : (d.label || '点滅器'))}「${mark}」`;
  }

  /* 区間の置き場ごとの正しいケーブル。need が配列なら置き場の順は問わない */
  function slotNeeds(run) {
    const a = [].concat((run && run.need) || []);
    const out = [];
    for (let i = 0; i < ((run && run.slots) || 0); i++) out.push(a.length > 1 ? a[i] : a[0]);
    return out;
  }
  const slotNeed = (run, i) => slotNeeds(run)[i];
  const anyOrder = (run) => Array.isArray(run && run.need) && run.need.length > 1;
  /* 区間に使うケーブルを人が読める形で（note が無ければケーブル名から作る） */
  function runNeedText(run) {
    if (run && run.note) return run.note;
    const names = slotNeeds(run).map(id => (cableType(id) || {}).name || id);
    return names.join('・');
  }

  function terminalRef(problem, tid) {
    const [devId, termId] = String(tid).split('.');
    const dev = deviceOf(problem, devId);
    if (!dev || !dev.terminals) return null;
    const t = dev.terminals.find(x => x.id === termId);
    if (!t) return null;
    return {
      id: tid, device: dev, terminal: t, kind: t.kind,
      x: dev.x + t.dx, y: dev.y + t.dy, dir: t.dir,
      // 施工省略の器具は、見えている同じ器具と指摘文で見分けられるように「（施工省略）」を付ける
      name: (dev.mark ? dev.mark + ' ' : '') + (dev.label || dev.id) +
        (dev.omitted && String(dev.label || '').indexOf('施工省略') < 0 ? '（施工省略）' : '') + ' の ' + t.name
    };
  }

  function allTerminals(problem) {
    const out = [];
    problem.devices.forEach(d => (d.terminals || []).forEach(t => out.push(terminalRef(problem, d.id + '.' + t.id))));
    return out;
  }

  function groupOfEndpoint(problem, ep) {
    if (ep.k === 'jb') return ep.id;
    if (ep.k === 'g') return ep.id;   // ケーブルの端（まだ器具につないでいない）
    const dev = deviceOf(problem, String(ep.id).split('.')[0]);
    return dev ? dev.group : null;
  }

  function runFor(problem, ga, gb) {
    return problem.runs.find(r => (r.a === ga && r.b === gb) || (r.a === gb && r.b === ga)) || null;
  }

  function runById(problem, id) {
    return (problem.runs || []).find(r => r.id === id) || null;
  }

  function groupLabel(problem, g) {
    const ds = problem.devices.filter(d => d.group === g);
    if (!ds.length) return g;
    if (ds[0].groupName) return ds[0].groupName;
    if (ds.length > 1) return ds[0].label + `（${ds.length}個）`;
    return (ds[0].mark ? ds[0].mark + ' ' : '') + (ds[0].label || ds[0].id);
  }

  function runName(problem, run) {
    return groupLabel(problem, run.a) + ' ⇄ ' + groupLabel(problem, run.b);
  }

  /* ---------------- 支給ケーブル（区間に置く） ---------------- */
  const cableType = (id) => (window.CABLE_TYPES || {})[id] || null;
  const slotKey = (run, i) => run.id + '#' + i;

  /* 切り出したケーブル（1本＝1ピース）。state.cables[slot] にはピースの id が入る */
  function pieceOf(state, id) {
    return ((state && state.pieces) || []).find(p => p.id === id) || null;
  }
  function slotPiece(state, key) {
    return pieceOf(state, ((state && state.cables) || {})[key]);
  }
  /* その区間に置かれているケーブル（置き場の順に。未設置は null） */
  function runSlots(state, run) {
    const out = [];
    for (let i = 0; i < (run.slots || 0); i++) {
      const p = slotPiece(state, slotKey(run, i));
      out.push(p ? cableType(p.type) : null);
    }
    return out;
  }
  /* まだどの区間にも置いていない、切り出し済みのケーブル */
  function freePieces(state, typeId) {
    const used = new Set(Object.keys((state && state.cables) || {}).map(k => state.cables[k]));
    return ((state && state.pieces) || [])
      .filter(p => !used.has(p.id) && (!typeId || p.type === typeId));
  }
  /* その区間が必要とする切断寸法 */
  function runCut(run) { return run && run.cut ? run.cut : null; }
  const placedCables = (state, run) => runSlots(state, run).filter(Boolean);

  /* 置いたケーブルの心線が、色ごとに何本使えるか
     null = ケーブル不要の区間（渡り線）／ placed が 0 ならまだ通せない */
  function runCapacity(problem, state, run) {
    if (!run || run.free) return null;
    const cap = { total: 0, byColor: {}, placed: 0, slots: run.slots || 0 };
    placedCables(state, run).forEach(c => {
      cap.placed++;
      c.cores.forEach(col => {
        cap.byColor[col] = (cap.byColor[col] || 0) + 1;
        cap.total++;
      });
    });
    return cap;
  }

  /* この区間でまだ使える心線の色 */
  function freeCores(problem, state, run) {
    const cap = runCapacity(problem, state, run);
    if (!cap) return ['black', 'white', 'red'];
    const used = {};
    wiresOfRun(problem, state, run).forEach(w => { used[w.color] = (used[w.color] || 0) + 1; });
    return Object.keys(cap.byColor).filter(c => (used[c] || 0) < cap.byColor[c]);
  }

  /* 切ったピース（長さの一覧）を、長さ rollLen の支給ケーブル count 本に、2本にまたがらずに分けられるか。
     分けられるときは各支給ケーブルの残りを返す（無理なら null）。ピースは多くても十数本なので総当たりで足りる */
  function packRolls(lens, rollLen, count) {
    const items = lens.slice().sort((a, b) => b - a);
    const rolls = Array.from({ length: count }, () => rollLen);
    if (items.reduce((s2, x) => s2 + x, 0) > rollLen * count) return null;
    let steps = 0;
    const put = (i) => {
      if (i === items.length) return true;
      if (++steps > 200000) return false;
      const tried = new Set();
      for (let r = 0; r < rolls.length; r++) {
        if (rolls[r] < items[i] || tried.has(rolls[r])) continue;   // 残りが同じ支給ケーブルは1回試せば十分
        tried.add(rolls[r]);
        rolls[r] -= items[i];
        if (put(i + 1)) return true;
        rolls[r] += items[i];
      }
      return false;
    };
    return put(0) ? rolls : null;
  }

  /* 支給ケーブルの残り（長さ[mm]）。
     supply.cables は { id: { len, count, official? } } の形。
     支給が2本以上のときは、1本ずつから切る（2本にまたがっては切れない）。
     fits＝いま切ってあるピースが、支給ケーブルに分けて収まるか。rolls はそのときの各本の残り */
  function cableStock(problem, state) {
    const stock = {};
    const supply = (problem.supply && problem.supply.cables) || {};
    Object.keys(supply).forEach(k => {
      const sp = supply[k];
      const len = (sp && sp.len) || 0, count = (sp && sp.count) || 1;
      stock[k] = {
        len, count, official: (sp && sp.official) || null,
        total: len * count, cut: 0, left: len * count, pieces: 0, lens: [],
        rolls: Array.from({ length: count }, () => len), maxLeft: len, fits: true
      };
    });
    ((state && state.pieces) || []).forEach(p => {
      const st = stock[p.type];
      if (!st) return;
      st.cut += p.len; st.left -= p.len; st.pieces++; st.lens.push(p.len);
    });
    Object.keys(stock).forEach(k => {
      const st = stock[k];
      const r = st.count > 1 ? packRolls(st.lens, st.len, st.count) : (st.left >= 0 ? [st.left] : null);
      st.fits = !!r;
      if (r) st.rolls = r;
      st.maxLeft = r ? Math.max.apply(null, r.concat([0])) : 0;
    });
    return stock;
  }

  /* その種類から、さらに len を切り出せるか（いまのピースと合わせて、支給ケーブルに分けて収まるか） */
  function canCut(problem, state, typeId, len) {
    const st = cableStock(problem, state)[typeId];
    if (!st) return false;
    if (st.left < len) return false;
    return st.count > 1 ? !!packRolls(st.lens.concat([len]), st.len, st.count) : true;
  }

  /* その問題で切り出すべき長さの一覧（区間ごと） */
  function cutPlan(problem, state, typeId) {
    const placed = new Set(Object.keys((state && state.cables) || {}));
    const out = [];
    (problem.runs || []).forEach(run => {
      if (!run.slots) return;
      const needs = slotNeeds(run);
      // 順不同の区間は「その種類が何本置いてあるか」で済みを決める
      const have = {};
      if (anyOrder(run)) for (let i = 0; i < run.slots; i++) {
        const pc = slotPiece(state, slotKey(run, i));
        if (pc) have[pc.type] = (have[pc.type] || 0) + 1;
      }
      const seen = {};
      for (let i = 0; i < run.slots; i++) {
        if (typeId && needs[i] !== typeId) continue;
        const key = slotKey(run, i);
        let done = placed.has(key);
        if (anyOrder(run)) { seen[needs[i]] = (seen[needs[i]] || 0) + 1; done = (have[needs[i]] || 0) >= seen[needs[i]]; }
        out.push({ run, i, key, cut: runCut(run), span: run.span || null, done, need: needs[i] });
      }
    });
    return out;
  }

  function wiresOfRun(problem, state, run) {
    return state.wires.filter(w => {
      const a = groupOfEndpoint(problem, w.a), b = groupOfEndpoint(problem, w.b);
      return (a === run.a && b === run.b) || (a === run.b && b === run.a);
    });
  }

  function wireSize(problem, state, wire) {
    const r = runFor(problem, groupOfEndpoint(problem, wire.a), groupOfEndpoint(problem, wire.b));
    if (!r) return 1.6;
    const placed = state ? placedCables(state, r) : [];
    if (placed.length) return Math.max.apply(null, placed.map(c => c.size));
    const needs = slotNeeds(r).map(cableType).filter(Boolean);
    return needs.length ? Math.max.apply(null, needs.map(c => c.size)) : 1.6;
  }

  function endpointLabel(problem, ep) {
    if (ep.k === 'jb') {
      const d = deviceOf(problem, ep.id);
      return d ? d.label : ep.id;
    }
    if (ep.k === 'g') return groupLabel(problem, ep.id) + '（端子は未接続）';
    const t = terminalRef(problem, ep.id);
    return t ? t.name : ep.id;
  }

  function wireLabel(problem, w) {
    return COLOR_JA[w.color] + '線：' + endpointLabel(problem, w.a) + ' ⇄ ' + endpointLabel(problem, w.b);
  }

  /* ---------------- グラフ構築 ---------------- */
  function buildDSU(problem, state, switchStates) {
    const d = DSU();
    state.wires.forEach(w => {
      d.find(nodeOfEnd(w, 'a'));
      d.find(nodeOfEnd(w, 'b'));
      d.union(nodeOfEnd(w, 'a'), nodeOfEnd(w, 'b'));
    });
    state.bundles.forEach(b => {
      if (!b.ends.length) return;
      const first = 'E:' + b.ends[0];
      b.ends.forEach(e => d.union(first, 'E:' + e));
    });
    /* 器具の内部でもともとつながっている端子（端子台の共通端子など） */
    problem.devices.forEach(dev => {
      (dev.internal || []).forEach(pair => {
        d.union('T:' + dev.id + '.' + pair[0], 'T:' + dev.id + '.' + pair[1]);
      });
    });
    if (switchStates) {
      switchables(problem).forEach(sw => {
        const pos = positionsOf(sw)[switchStates[sw.id] ? 1 : 0] || [];
        pos.forEach(pair => {
          d.union('T:' + sw.id + '.' + pair[0], 'T:' + sw.id + '.' + pair[1]);
        });
      });
    }
    return d;
  }

  /* ----------------------------------------------------------
     片切スイッチ・位置表示灯内蔵スイッチの2端子には極性がない。
     実際に電源の黒（L）が来ている方を「電源側」とみなして読み替える。
     （3路スイッチのように端子表示がある器具は poleSwap を付けない）
     ---------------------------------------------------------- */
  function swOrientation(problem, dsu, sw) {
    // 端子の kind（sw-com／sw-load）を優先。無ければ従来どおり接点の組 [電源側, 負荷側]。
    // 3路・4路（positions を持つ器具）は接点で補わない（S の 0 は電源側だけ、負荷側 3路の 0 は負荷側だけ）
    const ts = sw.terminals || [];
    const idOf = (k) => { const t = ts.find(x => x.kind === k); return t ? t.id : null; };
    const pair = sw.positions ? [null, null] : (contactsOf(sw)[0] || ['C', 'L']);
    const c = idOf('sw-com') || pair[0], l = idOf('sw-load') || pair[1];
    const cid = c ? sw.id + '.' + c : null, lid = l ? sw.id + '.' + l : null;
    const C = cid ? 'T:' + cid : null, Lt = lid ? 'T:' + lid : null, L = srcNodes(problem).L;
    if (sw.poleSwap && C && Lt && !dsu.same(C, L) && dsu.same(Lt, L)) {
      return { line: Lt, lineId: lid, load: C, loadId: cid, swapped: true };
    }
    return { line: C, lineId: cid, load: Lt, loadId: lid, swapped: false };
  }

  function orientations(problem, state) {
    const base = buildDSU(problem, state, null);
    const map = {};
    switchables(problem).forEach(sw => {
      map[sw.id] = swOrientation(problem, base, sw);
    });
    return { map, base };
  }

  /* ---------------- 通電シミュレーション ---------------- */
  function simulate(problem, state, switchStates, powerOn) {
    if (powerOn === false) {
      const wireState = {};
      state.wires.forEach(w => { wireState[w.id] = 'dead'; });
      return { lit: {}, pilots: {}, shorted: false, wireState, dsu: buildDSU(problem, state, switchStates), off: true };
    }
    const d = buildDSU(problem, state, switchStates);
    const sn = srcNodes(problem); const L = sn.L, N = sn.N;
    const hasSrc = state.wires.length > 0;
    const shorted = hasSrc && d.same(L, N);

    const lit = {};
    problem.pairs.forEach(p => {
      const load = deviceOf(problem, p.load);
      if (!load) return;
      const nT = 'T:' + load.id + '.' + (load.terminals.find(t => t.kind === 'load-n') || {}).id;
      const xT = 'T:' + load.id + '.' + (load.terminals.find(t => t.kind === 'load-x') || {}).id;
      // poleSwap の負荷（確認表示灯）は向きを問わない
      lit[load.id] = !shorted && ((d.same(xT, L) && d.same(nT, N)) ||
        (!!load.poleSwap && d.same(nT, L) && d.same(xT, N)));
    });

    /* コンセント・常時点灯の表示灯：点滅器を通さず、L と N の両方が来ていれば通電 */
    problem.devices.forEach(dev => {
      const lt = (dev.terminals || []).find(t => t.kind === 'outlet-l');
      const nt = (dev.terminals || []).find(t => t.kind === 'outlet-n');
      if (!lt || !nt) return;
      lit[dev.id] = !shorted &&
        d.same('T:' + dev.id + '.' + lt.id, L) &&
        d.same('T:' + dev.id + '.' + nt.id, N);
    });

    /* 200V 回路（端子台の 200V 端子から直接とる器具）。相が全部そろっていれば通電 */
    const rails = (((problem.srcTerms || {}).rails) || []).map(r => 'T:' + r);
    if (rails.length >= 2) {
      problem.devices.forEach(dev => {
        const hots = (dev.terminals || []).filter(t => t.kind === 'hot');
        if (hots.length < 2) return;
        // 電源そのもの（端子台の 200V 端子）は光らせない
        if (rails.indexOf('T:' + dev.id + '.' + hots[0].id) >= 0) return;
        const hit = hots.map(t => rails.findIndex(r => d.same('T:' + dev.id + '.' + t.id, r)));
        lit[dev.id] = !shorted && hit.every(i => i >= 0) && new Set(hit).size === hits(hit);
      });
    }
    function hits(a) { return a.length; }

    /* 位置表示灯内蔵スイッチ：接点と並列の表示灯。スイッチを切ると光る */
    const pilots = {};
    const pilotSw = problem.devices.filter(x => x.type === 'switch' && x.variant === 'pilot');
    if (pilotSw.length) {
      const ob = buildDSU(problem, state, null);
      pilotSw.forEach(sw => {
        const pair = problem.pairs.find(x => x.sw === sw.id);
        if (!pair) return;
        const load = deviceOf(problem, pair.load);
        if (!load) return;
        const nT = 'T:' + load.id + '.' + (load.terminals.find(t => t.kind === 'load-n') || {}).id;
        const xT = 'T:' + load.id + '.' + (load.terminals.find(t => t.kind === 'load-x') || {}).id;
        const o = swOrientation(problem, ob, sw);
        pilots[sw.id] = !shorted && !(switchStates && switchStates[sw.id]) &&
          d.same(o.line, L) && d.same(o.load, xT) && d.same(nT, N);
      });
    }

    const wireState = {};
    state.wires.forEach(w => {
      const n = nodeOfEnd(w, 'a');
      wireState[w.id] = shorted ? 'short'
        : d.same(n, L) ? 'live'
        : d.same(n, N) ? 'neutral'
        : 'dead';
    });

    return { lit, pilots, shorted, wireState, dsu: d };
  }

  /* ---------------- リングスリーブ判定 ---------------- */
  function sleeveFor(sizes) {
    const n16 = sizes.filter(s => s === 1.6).length;
    const n20 = sizes.filter(s => s === 2.0).length;
    const total = n16 + n20;
    if (total < 2) return { sleeve: '—', mark: '—', ng: '接続は2本以上必要です' };

    // 公式「リングスリーブの適用（JIS C 2806）」
    const SMALL_O = (n20 === 0 && n16 === 2);
    const SMALL = (n20 === 0 && n16 >= 3 && n16 <= 4) ||
                  (n20 === 1 && n16 >= 1 && n16 <= 2) ||
                  (n20 === 2 && n16 === 0);
    const MEDIUM = (n20 === 0 && n16 >= 5 && n16 <= 6) ||
                   (n20 === 1 && n16 >= 3 && n16 <= 5) ||
                   (n20 === 2 && n16 >= 1 && n16 <= 3) ||
                   (n20 === 3 && n16 <= 1) ||
                   (n20 === 4 && n16 === 0);
    const LARGE = (n20 === 0 && n16 === 7) ||
                  (n20 === 1 && n16 === 6) ||
                  (n20 === 2 && n16 === 4) ||
                  (n20 === 3 && n16 === 2) ||
                  (n20 === 4 && n16 === 1) ||
                  (n20 === 5 && n16 === 0);

    if (SMALL_O) return { sleeve: '小', mark: '○' };
    if (SMALL) return { sleeve: '小', mark: '小' };
    if (MEDIUM) return { sleeve: '中', mark: '中' };
    if (LARGE) return { sleeve: '大', mark: '大' };
    return { sleeve: '—', mark: '—', ng: 'この本数・太さの組合せはリングスリーブの適用表にありません' };
  }

  /* 接続点の接続方法（ボックスごとの規則）
       connectorAt : その本数の接続だけ差込形コネクタ（No.5・No.8＝[4]、No.10＝[3]）
       sleeveWith  : その区間の電線を含む接続はリングスリーブ、ほかは差込形コネクタ（No.11＝電源線）
       connect     : ボックス全体を 'sleeve'／'connector' に固定（No.1〜4 など） */
  function connectMethodOf(problem, jb, members) {
    if (!jb) return 'sleeve';
    if (jb.connectorAt) return jb.connectorAt.indexOf(members.length) >= 0 ? 'connector' : 'sleeve';
    if (jb.sleeveWith) {
      const hit = members.some(w => {
        const r = runFor(problem, groupOfEndpoint(problem, w.a), groupOfEndpoint(problem, w.b));
        return !!r && jb.sleeveWith.indexOf(r.id) >= 0;
      });
      return hit ? 'sleeve' : 'connector';
    }
    return jb.connect === 'connector' ? 'connector' : 'sleeve';
  }

  /* スイッチ相互間（3路の 1・3、4路の 1・3／2・4）。器具ごと・side ごとに2端子ずつ */
  function travelerSides(problem) {
    const out = [];
    problem.devices.forEach(d => {
      const by = {};
      (d.terminals || []).filter(t => t.kind === 'sw-trav').forEach(t => {
        const s = t.side || 'a';
        (by[s] = by[s] || []).push(d.id + '.' + t.id);
      });
      Object.keys(by).forEach(s => out.push({ dev: d, side: s, ids: by[s] }));
    });
    return out;
  }
  /* 相互間の構造：各 side の2端子が、別の器具の「同じ side の2端子」に1本ずつ（入れ替え・交差は可） */
  function travelerFaults(problem, dsu) {
    const sides = travelerSides(problem);
    const faults = [];
    sides.forEach(S => {
      const [a, b] = S.ids;
      const peer = (tid) => sides.filter(o => o.dev.id !== S.dev.id)
        .map(o => ({ o, hit: o.ids.filter(x => dsu.same('T:' + tid, 'T:' + x)) }))
        .filter(x => x.hit.length);
      const pa = peer(a), pb = peer(b);
      // 理由：same＝1 と 3 が同じ節点／none＝相手に届いていない／split＝2本が別々の相手（4路の 1 と 2 など）
      const why = S.ids.length !== 2 ? 'data'
        : dsu.same('T:' + a, 'T:' + b) ? 'same'
        : (!pa.length || !pb.length) ? 'none'
        : (pa.length > 1 || pb.length > 1 || pa[0].o !== pb[0].o) ? 'split'
        : (pa[0].hit.length !== 1 || pb[0].hit.length !== 1 || pa[0].hit[0] === pb[0].hit[0]) ? 'same'
        : null;
      if (why) faults.push(Object.assign({ why }, S));
    });
    return { sides, faults };
  }

  function bundleInfo(problem, state, bundle) {
    const sizes = [];
    const members = [];
    bundle.ends.forEach(e => {
      const [wid] = e.split(':');
      const w = state.wires.find(x => x.id === wid);
      if (!w) return;
      sizes.push(wireSize(problem, state, w));
      members.push(w);
    });
    const jb = deviceOf(problem, bundle.jb);
    const method = connectMethodOf(problem, jb, members);
    const base = { sizes, members, count: members.length, method };

    if (method === 'connector') {
      if (members.length < 2) return Object.assign(base, {
        sleeve: '—', mark: '1', spec: 'あと1本つなぐと接続になります', ng: '接続は2本以上必要です'
      });
      return Object.assign(base, {
        sleeve: 'コネクタ',
        mark: String(members.length),
        spec: `差コネ${members.length}（差込形コネクタ ${members.length}本用）`,
        ng: members.length > 4 ? '差込形コネクタは4本用までです' : null
      });
    }
    const sl = sleeveFor(sizes);
    if (members.length === 1) {
      return Object.assign(base, sl, { mark: '1', spec: 'あと1本つなぐと接続になります' });
    }
    return Object.assign(base, sl, { spec: sl.ng ? '—' : `リングスリーブ「${sl.sleeve}」・刻印「${sl.mark}」` });
  }

  /* ---------------- 採点 ---------------- */
  function grade(problem, state) {
    const issues = [];
    const add = (level, msg, detail, focus) => issues.push({ level, msg, detail: detail || '', focus: focus || null });

    const checks = { total: 0, passed: 0 };
    const check = (ok, level, msg, detail, focus) => {
      checks.total++;
      if (ok) checks.passed++;
      else add(level, msg, detail, focus);
      return ok;
    };

    const base = buildDSU(problem, state, null);
    const allOn = {};
    switchables(problem).forEach(s => { allOn[s.id] = true; });

    const sn = srcNodes(problem); const L = sn.L, N = sn.N;
    const terms = allTerminals(problem);

    /* --- 1. 未接続の端子 --- */
    const usedTerm = new Set();
    state.wires.forEach(w => {
      if (w.a.k === 't') usedTerm.add(w.a.id);
      if (w.b.k === 't') usedTerm.add(w.b.id);
    });
    terms.forEach(t => {
      if (t.terminal.optional) return;   // 使わない端子（端子台の空き端子など）
      check(usedTerm.has(t.id), 'bad',
        `${t.name} に電線がつながっていません`,
        'すべての端子に電線を結線します。', { type: 'terminal', id: t.id });
    });

    /* --- 1-2. 1つの端子に入れられる電線の本数 --- */
    const perTerm = {};
    state.wires.forEach(w => {
      ['a', 'b'].forEach(side => {
        const ep = side === 'a' ? w.a : w.b;
        if (ep.k === 't') perTerm[ep.id] = (perTerm[ep.id] || 0) + 1;
      });
    });
    terms.forEach(t => {
      const poleSwap = t.device && t.device.poleSwap;
      const max = t.terminal.max ||
        ((t.kind === 'sw-com' || t.kind === 'outlet-l' || t.kind === 'outlet-n' ||
          t.kind === 'tb-l' || t.kind === 'tb-n' ||
          (poleSwap && t.kind === 'sw-load')) ? 2 : 1);
      check((perTerm[t.id] || 0) <= max, 'bad',
        `${t.name} に電線が ${perTerm[t.id]} 本入っています（この端子は最大 ${max} 本）`,
        '器具の電線挿入口の数を超えて結線はできません。', { type: 'terminal', id: t.id });
    });

    /* --- 2. ボックス内で未接続の線端 --- */
    const endOwner = new Map();
    state.bundles.filter(b => b.ends.length >= 2).forEach(b => b.ends.forEach(e => {
      endOwner.set(e, (endOwner.get(e) || 0) + 1);
    }));
    let looseEnds = 0;
    state.wires.forEach(w => {
      ['a', 'b'].forEach(side => {
        const ep = side === 'a' ? w.a : w.b;
        if (ep.k !== 'jb') return;
        const k = endKey(w.id, side);
        if (!endOwner.get(k)) looseEnds++;
      });
    });
    check(looseEnds === 0, 'bad',
      `ジョイントボックスの中で、接続していない線端が ${looseEnds} 本あります`,
      'ボックス内の線端どうしを選んで「選んだ線端を接続」で圧着接続します。');

    /* --- 3. 1本だけの接続 --- */
    state.bundles.forEach(b => {
      check(b.ends.length >= 2, 'bad',
        'ボックス内に、1本しかない接続点があります',
        '接続点は2本以上の電線をまとめます。', { type: 'bundle', id: b.id });
    });

    /* --- 4. ケーブルを通せない区間 --- */
    state.wires.forEach(w => {
      const ga = groupOfEndpoint(problem, w.a), gb = groupOfEndpoint(problem, w.b);
      const ok = !!runFor(problem, ga, gb);
      check(ok, 'bad',
        `配線図にない区間に電線が引かれています（${wireLabel(problem, w)}）`,
        '単線図でつながっている区間だけにケーブルを通します。', { type: 'wire', id: w.id });
    });

    /* --- 5. 短絡 ---
       片切・端子台だけの問題は「全部入」が最も多くつながる状態なので、それだけ調べる（従来どおり）。
       3路・4路（positions）は位置でつながり方が変わるので、全部の組み合わせを調べる */
    const nonMono = switchables(problem).some(s => s.positions);
    let shortAt = simulate(problem, state, allOn).shorted ? allOn : null;
    if (nonMono && !shortAt) {
      const ids = switchables(problem).map(s => s.id);
      for (let m = 0; m < (1 << Math.min(ids.length, 10)) && !shortAt; m++) {
        const st = {};
        ids.forEach((id, k) => { st[id] = !!((m >> k) & 1); });
        if (simulate(problem, state, st).shorted) shortAt = st;
      }
    }
    check(!shortAt, 'bad',
      '短絡（ショート）しています',
      nonMono && shortAt !== allOn
        ? 'スイッチの位置によって、電源の黒（L）と白（N）が直接つながります。3路・4路スイッチの線と接続点を見直してください。'
        : '電源の黒（L）と白（N）が直接つながっています。接続点を見直してください。');

    /* --- 6. 接地側（白）の系統 --- */
    const orient = {};
    switchables(problem).forEach(sw => {
      orient[sw.id] = swOrientation(problem, base, sw);
    });

    const loadNTerms = [], loadXTerms = [], swComTerms = [], swLoadTerms = [], netTerms = [], travTerms = [];
    terms.forEach(t => {
      // 負荷：poleSwap（確認表示灯など）は N が来ている方を接地側とみなす
      if (t.kind === 'load-n' || t.kind === 'load-x') {
        const e = loadEnds(problem, base, t.device);
        const isN = e ? e.nId === t.id : t.kind === 'load-n';
        (isN ? loadNTerms : loadXTerms).push(t);
      }
      // tb-n = 端子台の接地側（N）端子。接地側として扱う
      if (t.kind === 'outlet-n' || t.kind === 'tb-n') loadNTerms.push(t);
      // tb-l = 端子台の非接地側（L）端子。コンセントと同じく「必ず L が来る」
      if (t.kind === 'outlet-l' || t.kind === 'tb-l') swComTerms.push(t);
      // earth（接地線）・hot（200V の電圧極）は 100V の L/N に触れてはいけない
      if (t.kind === 'earth' || t.kind === 'hot') netTerms.push(t);
      // 点滅器：極性の無いもの（poleSwap）だけ向きで読み替え、ほかは kind のとおり
      if (t.kind === 'sw-com' || t.kind === 'sw-load') {
        const o = orient[t.device.id];
        if (t.device.poleSwap && o) (o.loadId === t.id ? swLoadTerms : swComTerms).push(t);
        else (t.kind === 'sw-load' ? swLoadTerms : swComTerms).push(t);
      }
      // 3路・4路の 1・3（2・4）＝スイッチ相互間。L にも N にも直接つながらない
      if (t.kind === 'sw-trav') travTerms.push(t);
    });

    loadNTerms.forEach(t => {
      check(base.same('T:' + t.id, N), 'bad',
        `${t.name} に電源の接地側（白）が来ていません`,
        '接地側は、スイッチを通さずに器具へ直接つなぎます（極性）。', { type: 'terminal', id: t.id });
    });
    [].concat(swComTerms, swLoadTerms, loadXTerms, netTerms, travTerms).forEach(t => {
      check(!base.same('T:' + t.id, N), 'bad',
        `${t.name} が電源の接地側（白）につながっています`,
        '接地側（N）をスイッチや器具の非接地側に入れてはいけません。', { type: 'terminal', id: t.id });
    });

    /* --- 7. 非接地側（黒）の系統 --- */
    swComTerms.forEach(t => {
      check(base.same('T:' + t.id, L), 'bad',
        `${t.name} に電源の非接地側（黒）が来ていません`,
        '電源の黒は、点滅器の電源側端子（とコンセント）へつなぎます。', { type: 'terminal', id: t.id });
    });
    [].concat(loadNTerms, loadXTerms, swLoadTerms, netTerms, travTerms).forEach(t => {
      check(!base.same('T:' + t.id, L), 'bad',
        `${t.name} が電源の非接地側（黒）に直接つながっています`,
        t.kind === 'sw-trav'
          ? '3路・4路スイッチの 1・3（2・4）は、相手のスイッチとの間の線（スイッチ相互間）だけをつなぎます。電源の黒は 3路スイッチ S の 0 へ。'
          : 'スイッチを通さずに器具へ電圧をかけてはいけません。', { type: 'terminal', id: t.id });
    });

    /* --- 8. 電線の色 --- */
    const earthNodes = terms.filter(t => t.kind === 'earth').map(t => 'T:' + t.id);
    const onEarth = (node) => earthNodes.some(e => base.same(node, e));
    const railNodes = (((problem.srcTerms || {}).rails) || []).map(id => 'T:' + id);
    const onPower = (node) => base.same(node, N) || base.same(node, L) || railNodes.some(r => base.same(node, r));
    /* nets が色を決めている回路（三相の相別色など） */
    const netColors = [];
    (problem.nets || []).forEach(net => {
      if (!net.color) return;
      ((net.groups || [])[0] || []).forEach(id => netColors.push({ node: 'T:' + id, color: net.color, name: net.name }));
    });
    state.wires.forEach(w => {
      const na = nodeOfEnd(w, 'a');
      const nc = netColors.find(x => base.same(na, x.node));
      if (nc) {
        check(w.color === nc.color, 'bad',
          `${nc.name} に${COLOR_JA[w.color]}色が使われています（${wireLabel(problem, w)}）`,
          `この回路には<b>${COLOR_JA[nc.color]}色</b>を使います。`, { type: 'wire', id: w.id });
        return;
      }
      if (onEarth(na)) {
        // 接地線が電源の回路（100V の N・L、200V の電圧極）とつながってしまったときは、色の指摘を出さない。
        // 本当の原因（つなぎ違い）は 6・7・9 の指摘に出る。ここで「白線を緑に」「緑は接地線以外に」と
        // 読める指摘を並べると、利用者を逆の方向へ導いてしまう
        if (!onPower(na)) {
          check(w.color === 'green', 'bad',
            `接地線に${COLOR_JA[w.color]}色が使われています（${wireLabel(problem, w)}）`,
            '接地線には緑色を使用します。', { type: 'wire', id: w.id });
        }
        return;
      }
      if (w.color === 'green') {
        check(false, 'bad',
          `接地線以外に緑色が使われています（${wireLabel(problem, w)}）`,
          '緑色の電線は接地線にだけ使います。', { type: 'wire', id: w.id });
        return;
      }
      if (base.same(na, N)) {
        check(w.color === 'white', 'bad',
          `接地側の電線に${COLOR_JA[w.color]}色が使われています（${wireLabel(problem, w)}）`,
          '電源の接地側電線には、すべて白色を使用します。', { type: 'wire', id: w.id });
      } else if (base.same(na, L)) {
        check(w.color === 'black', 'bad',
          `電源から点滅器までの非接地側に${COLOR_JA[w.color]}色が使われています（${wireLabel(problem, w)}）`,
          '電源から点滅器・コンセントまでの非接地側電線には、すべて黒色を使用します。', { type: 'wire', id: w.id });
      }
    });

    /* --- 8-0. ケーブルの端が器具につながっているか --- */
    state.wires.forEach(w => {
      ['a', 'b'].forEach(side => {
        const ep = side === 'a' ? w.a : w.b;
        if (ep.k !== 'g') return;
        check(false, 'bad',
          `${COLOR_JA[w.color]}線が ${groupLabel(problem, ep.id)} の端子につながっていません`,
          'ケーブルの心線をえらんで、器具の端子をクリックしてつなぎます。', { type: 'wire', id: w.id });
      });
    });

    /* --- 8-1. 区間ごとのケーブル選び --- */
    problem.runs.forEach(run => {
      if (!run.slots) return;
      const slots = runSlots(state, run);
      const needs = [].concat(run.need);
      const empty = slots.filter(c => !c).length;
      check(empty === 0, 'bad',
        `${runName(problem, run)} のケーブルが ${empty} 本ぶん選ばれていません`,
        `この区間には ${runNeedText(run)} を使います。支給材料からドラッグして置いてください。`,
        { type: 'run', id: run.id });
      if (anyOrder(run)) {
        // 配列の need は「置き場の順は問わない」：置いた種類の集まりが need と同じならよい
        const want = slotNeeds(run).slice();
        slots.forEach(c => {
          if (!c) return;
          const k = want.indexOf(c.id);
          if (k >= 0) want.splice(k, 1);
          check(k >= 0, 'bad',
            `${runName(problem, run)} に ${c.name} が置かれています（この区間は ${runNeedText(run)}）`,
            run.conduit
              ? `${run.conduit.name} の中には ${runNeedText(run)} を通します。置き直してください。`
              : `この区間は ${runNeedText(run)} です。ケーブルを置き直してください。`,
            { type: 'run', id: run.id });
        });
        return;
      }
      slots.forEach((c, i) => {
        const need = cableType(needs.length > 1 ? needs[i] : needs[0]);
        if (!c || !need) return;
        check(c.id === need.id, 'bad',
          `${runName(problem, run)} に ${c.name} が置かれています（正しくは ${need.name}）`,
          `この区間は ${runNeedText(run)} です。心線の数と太さが変わるので、ケーブルを置き直してください。`,
          { type: 'run', id: run.id });
      });
    });

    /* --- 8-3. 切断寸法（図の寸法＋接続・結線するぶん） --- */
    (problem.runs || []).forEach(run => {
      if (!run.slots || !run.cut) return;
      for (let i = 0; i < run.slots; i++) {
        const key = slotKey(run, i);
        const pc = slotPiece(state, key);
        if (!pc) continue;
        check(pc.len === run.cut, 'bad',
          `${runName(problem, run)} に ${pc.len}mm のケーブルが置かれています（この区間は ${run.cut}mm）`,
          `図の寸法 ${run.span}mm に、接続・結線するぶんを足した長さで切ります。`,
          { type: 'run', id: run.id });
      }
    });

    /* --- 8-2. 置いたケーブルの心線で足りるか --- */
    problem.runs.forEach(run => {
      const cap = runCapacity(problem, state, run);
      if (!cap) return;
      const ws = wiresOfRun(problem, state, run);
      if (!cap.placed) {
        check(ws.length === 0, 'bad',
          `${runName(problem, run)} は、ケーブルを置く前に電線が ${ws.length} 本引かれています`,
          'まずこの区間にケーブルを置いてから、中の心線をつなぎます。',
          { type: 'run', id: run.id });
        return;
      }
      check(ws.length <= cap.total, 'bad',
        `${runName(problem, run)} の電線が ${ws.length} 本ありますが、置いたケーブルは ${cap.total} 心です`,
        'ケーブルの心数を超えて配線はできません。', { type: 'run', id: run.id });
      const used = {};
      ws.forEach(w => { used[w.color] = (used[w.color] || 0) + 1; });
      Object.keys(used).forEach(col => {
        check(used[col] <= (cap.byColor[col] || 0), 'bad',
          `${runName(problem, run)} で${COLOR_JA[col]}線を ${used[col]} 本使っていますが、置いたケーブルの${COLOR_JA[col]}は ${cap.byColor[col] || 0} 本です`,
          '2心ケーブルは黒・白、3心ケーブルは黒・白・赤。片方を使ったら残りの色が決まります。',
          { type: 'run', id: run.id });
      });
    });

    /* --- 9. 戻り線（スイッチと器具の対応） --- */
    problem.pairs.forEach(p => {
      const sw = deviceOf(problem, p.sw), load = deviceOf(problem, p.load);
      if (!sw || !load) return;
      const o = orient[sw.id];
      const le = loadEnds(problem, base, load);
      if (!o || !o.load || !le) return;
      const swL = o.load;
      const loadX = le.x;
      // いま、どの器具につながってしまっているか
      const wrong = problem.pairs.filter(q => q.sw !== p.sw).filter(q => {
        const oe = loadEnds(problem, base, deviceOf(problem, q.load));
        return !!oe && base.same(swL, oe.x);
      }).map(q => deviceOf(problem, q.load));

      check(base.same(swL, loadX), 'bad',
        wrong.length
          ? `${swTitle(problem, p.sw, p.mark)}の帰り線が、${load.loadName} ではなく <b>${wrong.map(x => x.loadName).join('・')}</b> につながっています`
          : `${swTitle(problem, p.sw, p.mark)}と ${load.loadName} が帰り線でつながっていません`,
        wrong.length
          ? `ジョイントボックスの中で、${swTitle(problem, p.sw, p.mark)}の帰り線（負荷側端子から来ている心線）を、` +
            `${load.loadName} の非接地側へ行く心線とつなぎ直します。`
          : 'スイッチの負荷側端子から、対応する器具の非接地側端子へ帰り線を引きます。',
        { type: 'terminal', id: o.loadId });

      // 正しい相手につながっているのに、他の器具にも混線しているとき
      if (base.same(swL, loadX)) {
        wrong.forEach(other => {
          check(false, 'bad',
            `${swTitle(problem, p.sw, p.mark)}の帰り線が ${other.loadName} にもつながっています`,
            '1つのスイッチが複数の器具を点滅させてしまいます。',
            { type: 'terminal', id: o.loadId });
        });
      }
    });

    /* --- 9-3. スイッチ相互間（3路・4路）：同じ側の2端子が、相手の同じ側の2端子に1本ずつ ---
       sw-trav の端子が無い問題（No.1〜5）では何もしない */
    const tr = travelerFaults(problem, base);
    if (tr.sides.length) {
      // 1本のまちがいで両側の器具が引っかかるので、指摘は1件にまとめる（点数は side ごとに数える）
      checks.total += tr.sides.length;
      checks.passed += tr.sides.length - tr.faults.length;
      if (tr.faults.length) {
        const f = tr.faults[0];
        const nm = (S) => `${S.dev.mark ? S.dev.mark + ' ' : ''}${S.dev.label} の ${S.ids.map(id => id.split('.')[1]).join('・')}`;
        add('bad',
          `スイッチ相互間の線が正しくつながっていません（${tr.faults.map(nm).join('／')}）`,
          f.why === 'split'
            ? '4路スイッチの 1 と 3（または 2 と 4）には、<b>同じ3路スイッチから来た2本</b>を入れます。1 と 2 のように分けると、点かない位置ができます。'
            : f.why === 'none'
              ? '3路スイッチの 1・3 から出た線を、相手のスイッチ（3路の 1・3、4路の 1・3 か 2・4）まで1本ずつ届かせます。'
              : '1 と 3 の線を同じ接続点に入れてはいけません。相手のスイッチの2端子へ1本ずつ（入れ替え・交差はかまいません）。',
          { type: 'terminal', id: f.ids[0] });
      }
    }

    /* --- 9-4. 1本のケーブルで往復（No.8 施工条件3：各リモコンリレーに2心ケーブル1本） --- */
    /* 利用者が心線ピッカーやケーブルのクリックで選んだ心線（slotPicked）はそのケーブルのものとして動かさない。
       選んでいない心線（アプリが後から空きへ自動で割り当てたもの・模範解答）は、同じ区間の同じ種類のケーブルなら
       入れ替えがきくので、「どの器具も1本のケーブルだけから心線が来る」割り当てがあるかを総当たりで探す
       （1区間の心線は多くても十数本なので軽い）。いちばん良い割り当てでもまたがる器具を欠陥にする */
    const ocDevs = problem.devices.filter(d => d.oneCable);
    if (ocDevs.length) {
      const devOfTerm = {};
      ocDevs.forEach(d => (d.terminals || []).forEach(t => { devOfTerm[d.id + '.' + t.id] = d; }));
      const devOfWire = (w) => (w.a.k === 't' && devOfTerm[w.a.id]) || (w.b.k === 't' && devOfTerm[w.b.id]) || null;
      const spread = {};   // 器具id → 心線が来ているケーブルの本数（いちばん良い割り当てで）
      (problem.runs || []).forEach(run => {
        if (!run.slots) return;
        const keys = [];
        for (let i = 0; i < run.slots; i++) keys.push(slotKey(run, i));
        const ws = state.wires.filter(w => w.slot && keys.indexOf(w.slot) >= 0);
        const rel = ws.filter(w => devOfWire(w));
        if (!rel.length) return;
        const coresOf = (k) => { const pc = slotPiece(state, k); const t = pc && cableType(pc.type); return t ? t.cores : []; };
        const used = {}, at = new Map();
        ws.filter(w => w.slotPicked).forEach(w => { (used[w.slot] = used[w.slot] || {})[w.color] = true; at.set(w, w.slot); });
        const flex = ws.filter(w => !w.slotPicked);
        let best = null, steps = 0;
        const score = () => {
          const per = {};
          rel.forEach(w => { const d = devOfWire(w); (per[d.id] = per[d.id] || new Set()).add(at.get(w)); });
          const n = {}; Object.keys(per).forEach(id => { n[id] = per[id].size; });
          const bad = Object.keys(n).filter(id => n[id] > 1).length;
          if (!best || bad < best.bad) best = { bad, n };
        };
        const walk = (i) => {
          if ((best && best.bad === 0) || ++steps > 50000) return;
          if (i === flex.length) { score(); return; }
          const w = flex[i];
          let any = false;
          keys.forEach(k => {
            if (best && best.bad === 0) return;
            if (coresOf(k).indexOf(w.color) < 0) return;
            const u = used[k] = used[k] || {};
            if (u[w.color]) return;
            u[w.color] = true; at.set(w, k); any = true;
            walk(i + 1);
            u[w.color] = false;
          });
          if (!any) { at.set(w, w.slot); walk(i + 1); }   // 入れられるケーブルが無い：いまの割り当てのまま
        };
        walk(0);
        if (best) Object.keys(best.n).forEach(id => { spread[id] = Math.max(spread[id] || 0, best.n[id]); });
      });
      ocDevs.forEach(d => {
        if (!(d.id in spread)) return;   // まだ結線していない（未接続は 1 番の検査で出る）
        const n = spread[d.id];
        check(n <= 1, 'bad',
          `${d.mark ? d.mark + ' ' : ''}${d.label} に、${n}本のケーブルから心線が来ています`,
          d.oneCableHint || 'この器具へは2心ケーブルを1本だけ使い、黒で行って白で戻します（施工条件）。',
          { type: 'terminal', id: d.id + '.' + ((d.terminals || [])[0] || {}).id });
      });
    }

    /* --- 9-2. 100V以外の回路（200V の電圧極・接地線） --- */
    (problem.nets || []).forEach(net => {
      const gs = (net.groups || []).map(g => g.map(id => ({ id, node: 'T:' + id })));
      if (!gs.length) return;
      const head = gs[0];
      let ok = true;
      // 基準グループの端子どうしが短絡していないこと
      for (let i = 0; i < head.length && ok; i++) {
        for (let j = i + 1; j < head.length; j++) {
          if (base.same(head[i].node, head[j].node)) ok = false;
        }
      }
      // ほかのグループが 1本ずつ対応していること（対応の順番は問わない）
      for (let gi = 1; gi < gs.length && ok; gi++) {
        if (gs[gi].length !== head.length) { ok = false; break; }
        const used = new Set();
        head.forEach(h => {
          const m = gs[gi].filter(x => base.same(x.node, h.node));
          if (m.length !== 1 || used.has(m[0].id)) ok = false; else used.add(m[0].id);
        });
      }
      const focusId = head[0] && head[0].id;
      check(ok, 'bad',
        net.bad || `${net.name} が正しくつながっていません`,
        net.hint || 'この回路の端子どうしを、対応するようにつなぎます。',
        focusId ? { type: 'terminal', id: focusId } : null);
    });
    // 別々の回路どうしが短絡していないこと
    const netHeads = (problem.nets || []).map(n => ({
      name: n.name, node: 'T:' + ((n.groups || [[]])[0] || [])[0]
    })).filter(x => x.node !== 'T:undefined');
    for (let i = 0; i < netHeads.length; i++) {
      for (let j = i + 1; j < netHeads.length; j++) {
        check(!base.same(netHeads[i].node, netHeads[j].node), 'bad',
          `${netHeads[i].name} と ${netHeads[j].name} がつながっています`,
          '別の回路どうしをつないではいけません。');
      }
    }

    /* --- 10. 通電試験 --- */
    const noneOn = {};
    switchables(problem).forEach(s => { noneOn[s.id] = false; });
    const simOff = simulate(problem, state, noneOn);
    /* 1か所点滅（片切・端子台）と、複数か所点滅（3路・4路：pairs に via がある）を分ける。
       No.1〜5 は via が無いので single === problem.pairs（従来と同じ判定・同じ件数） */
    const single = problem.pairs.filter(p => !(p.via || []).length);
    const multi = problem.pairs.filter(p => (p.via || []).length);
    check(single.every(p => !simOff.lit[p.load]), 'bad',
      'すべてのスイッチを切っても点灯する器具があります',
      'スイッチを通さずに電圧がかかっています。');

    let circuitOk = single.every(p => !simOff.lit[p.load]) && !simOff.shorted;
    /* 同じ点滅器が複数の器具を受け持つ問題（No.2 のイなど）があるので、
       「その点滅器が受け持つ器具は全部点き、ほかの器具は点かない」で判定する */
    const bySw = {};
    single.forEach(p => { (bySw[p.sw] = bySw[p.sw] || []).push(p); });
    Object.keys(bySw).forEach(swId => {
      const ps = bySw[swId], mark = ps[0].mark;
      const one = Object.assign({}, noneOn); one[swId] = true;
      const s = simulate(problem, state, one);
      const mine = ps.map(p => p.load);
      const ok = mine.every(id => s.lit[id]) &&
        single.every(q => mine.indexOf(q.load) >= 0 || !s.lit[q.load] || simOff.lit[q.load]);
      if (!ok) circuitOk = false;
      const d0 = deviceOf(problem, swId);
      const who = d0 && d0.type !== 'switch' ? swTitle(problem, swId, mark) : `スイッチ「${mark}」`;
      const nm = (ids) => ids.map(id => (deviceOf(problem, id) || {}).loadName).join('・');
      const dark = mine.filter(id => !s.lit[id]);
      // スイッチを全部切っても点いている器具（常時点灯の誤配線）は、すでに上で指摘しているので数えない
      const extra = single.filter(q => mine.indexOf(q.load) < 0 && s.lit[q.load] && !simOff.lit[q.load]).map(q => q.load);
      // 受け持つ器具が点かないのか、ほかの器具まで点くのかで言い分ける
      check(ok, 'bad',
        dark.length ? `${who}を入れても、${nm(dark)} が点灯しません`
          : `${who}を入れると、受け持っていない ${nm(extra)} まで点灯します`,
        '通電試験で確認してください。');
    });

    /* 10-b. 複数か所点滅：受け持つスイッチの全部の位置（2^n 通り）で、
       「どれを1回切り替えても点灯・消灯が入れ替わる」＝ 点灯 XOR（位置の偶奇）が一定。
       全部 0 位置で点くか消えるか（相互間を 1-1 にしたか交差したか）はどちらでもよい */
    const groups = {};
    multi.forEach(p => {
      const ids = pairSwitches(p);
      const key = ids.slice().sort().join('+');
      (groups[key] = groups[key] || { ids, pairs: [] }).pairs.push(p);
    });
    Object.keys(groups).forEach(key => {
      const G = groups[key], loads = G.pairs.map(p => p.load), mark = G.pairs[0].mark;
      const outside = problem.pairs.map(q => q.load).filter(id => loads.indexOf(id) < 0);
      let k0 = null, why = null;
      for (let m = 0; m < (1 << G.ids.length) && !why; m++) {
        const st = Object.assign({}, noneOn);
        let par = 0;
        G.ids.forEach((id, k) => { const b = (m >> k) & 1; st[id] = !!b; par ^= b; });
        const s = simulate(problem, state, st);
        if (s.shorted) { why = 'short'; break; }
        const v = loads.map(id => !!s.lit[id]);
        if (v.some(x => x !== v[0])) { why = 'split'; break; }
        const k = (v[0] ? 1 : 0) ^ par;
        if (k0 === null) k0 = k; else if (k !== k0) why = 'toggle';
        if (!why && outside.some(id => !!s.lit[id] !== !!simOff.lit[id])) why = 'other';
      }
      // グループの外の点滅器を入れても、この器具は変わらない
      switchables(problem).filter(s => G.ids.indexOf(s.id) < 0).forEach(s => {
        if (why) return;
        const st = Object.assign({}, noneOn); st[s.id] = true;
        const r = simulate(problem, state, st);
        if (loads.some(id => !!r.lit[id] !== !!simOff.lit[id])) why = 'other';
      });
      if (why) circuitOk = false;
      const names = loads.map(id => (deviceOf(problem, id) || {}).loadName).join('・');
      check(!why, 'bad',
        why === 'split' ? `スイッチ「${mark}」で ${names} がそろって点滅しません`
          : why === 'short' ? `スイッチ「${mark}」の位置によって短絡します`
          : why === 'other' ? `スイッチ「${mark}」の回路と、ほかの点滅器の回路がまじっています`
          : `スイッチ「${mark}」のどれかを1回切り替えても、${names} の点灯・消灯が入れ替わらない位置があります`,
        why === 'split' ? '同じ記号の器具は並列に（接地側どうし・帰り線どうしをまとめて）つなぎます。'
          : '3路・4路スイッチは、どれを1回切り替えても点灯と消灯が入れ替わります。' +
            '3路の 0 に電源（S）か帰り線、1・3 と 4路の 1・3／2・4 にはスイッチ相互間の線をつなぎます。');
    });

    /* コンセント・常時点灯の表示灯は、スイッチを全部切っても電気が来ていること */
    problem.devices.forEach(dev => {
      const lt = (dev.terminals || []).find(t => t.kind === 'outlet-l');
      if (!lt || !(dev.terminals || []).some(t => t.kind === 'outlet-n')) return;
      const ok = !!simOff.lit[dev.id];
      if (!ok) circuitOk = false;
      check(ok, 'bad',
        `${dev.label} に常時電気が来ていません`,
        'コンセントや常時点灯の表示灯は、点滅器を通さず電源の L（黒）と N（白）に直接つなぎます。',
        { type: 'terminal', id: dev.id + '.' + lt.id });
    });
    grade._circuitOk = circuitOk;

    /* --- 11. 接続材料（リングスリーブ／差込形コネクタ） --- */
    state.bundles.forEach(b => {
      const info = bundleInfo(problem, state, b);
      if (info.method === 'connector') {
        check(info.count <= 4, 'bad',
          `${deviceOf(problem, b.jb).label}：1か所に ${info.count} 本は接続できません`,
          '差込形コネクタは4本用までです。', { type: 'bundle', id: b.id });
      }
      if (info.ng) return;
      add('info',
        `${deviceOf(problem, b.jb).label}：${info.count}本の接続 → ${info.spec}`,
        '',
        { type: 'bundle', id: b.id });
    });

    /* --- 12. 支給された接続材料で足りるか --- */
    if (problem.supply) {
      const useC = {}, useS = {};
      state.bundles.forEach(b => {
        const info = bundleInfo(problem, state, b);
        if (info.ng) return;
        if (info.method === 'connector') useC[info.count] = (useC[info.count] || 0) + 1;
        else useS[info.sleeve] = (useS[info.sleeve] || 0) + 1;
      });
      Object.keys(useC).forEach(n => {
        const have = (problem.supply.connectors || {})[n] || 0;
        check(useC[n] <= have, 'warn',
          `差込形コネクタ ${n}本用が ${useC[n]} 個必要ですが、支給されるのは ${have} 個です`,
          '接続本数の分け方を見直してください。');
      });
      Object.keys(useS).forEach(sz => {
        const have = (problem.supply.sleeves || {})[sz] || 0;
        check(useS[sz] <= have, 'warn',
          `リングスリーブ「${sz}」が ${useS[sz]} 個必要ですが、支給されるのは ${have} 個です`,
          'スリーブの選定か接続のまとめ方を見直してください。');
      });
      // ケーブルは追加支給が無いので、支給より多く切ったら欠陥（アプリでは切る時点で止めている。保存データなどの保険）
      const stock = cableStock(problem, state);
      Object.keys(stock).forEach(t => {
        const c = cableType(t), st = stock[t];
        const split = st.left >= 0 && !st.fits;   // 合計は足りるが、どう分けても支給ケーブル1本ずつからは取れない
        check(st.left >= 0 && !split, 'bad',
          split ? `${c ? c.name : t} を、1本の支給ケーブル（${st.len}mm）からは取れない組み合わせで切っています`
                : `${c ? c.name : t} を支給ぶんより ${-st.left}mm 多く切っています`,
          `支給は ${st.total}mm（${st.len}mm × ${st.count}本）です。切り出した長さを見直してください。`);
      });
    }

    const bad = issues.filter(i => i.level === 'bad');
    const warn = issues.filter(i => i.level === 'warn');
    const score = checks.total ? Math.round(100 * checks.passed / checks.total) : 0;

    return {
      score, passed: bad.length === 0 && state.wires.length > 0,
      issues, badCount: bad.length, warnCount: warn.length, checks,
      circuitOk: !!grade._circuitOk
    };
  }

  /* ---------------- 手順ガイド ---------------- */
  function steps(problem, state) {
    const base = buildDSU(problem, state, null);
    const sn = srcNodes(problem); const L = sn.L, N = sn.N;
    const terms = allTerminals(problem);
    const loadN = terms.filter(t => {
      if (t.kind === 'load-n' || t.kind === 'load-x') {
        const e = loadEnds(problem, base, t.device);
        return e ? e.nId === t.id : t.kind === 'load-n';
      }
      return t.kind === 'outlet-n' || t.kind === 'tb-n';
    });
    const oo = {};
    switchables(problem).forEach(sw => { oo[sw.id] = swOrientation(problem, base, sw); });
    const swCom = terms.filter(t => {
      if (t.kind === 'outlet-l' || t.kind === 'tb-l') return true;
      if (t.kind !== 'sw-com' && t.kind !== 'sw-load') return false;
      const o = oo[t.device.id];
      return t.device.poleSwap ? !!o && o.lineId === t.id : t.kind === 'sw-com';
    });

    const missingN = loadN.filter(t => !base.same('T:' + t.id, N));
    const missingL = swCom.filter(t => !base.same('T:' + t.id, L));
    const missingReturn = problem.pairs.filter(p => {
      const sw = deviceOf(problem, p.sw), load = deviceOf(problem, p.load);
      const o = sw && oo[sw.id];
      const le = load && loadEnds(problem, base, load);
      if (!o || !o.load || !le) return true;
      return !base.same(o.load, le.x);
    });
    const trav = travelerFaults(problem, base);

    let loose = 0;
    const owner = new Set();
    state.bundles.forEach(b => b.ends.forEach(e => owner.add(e)));
    state.wires.forEach(w => ['a', 'b'].forEach(side => {
      const ep = side === 'a' ? w.a : w.b;
      if (ep.k === 'jb' && !owner.has(endKey(w.id, side))) loose++;
    }));

    const g = grade(problem, state);

    const slotRuns = (problem.runs || []).filter(r => r.slots);
    const emptySlots = [];
    slotRuns.forEach(run => runSlots(state, run).forEach((c, i) => { if (!c) emptySlots.push({ run, i }); }));

    const list = [
      {
        id: 'place',
        text: '<b>器具を配置する</b>（このアプリでは配置済み）',
        done: true, hint: ''
      },
      {
        id: 'cables',
        text: '<b>ケーブルを切って、区間に置く</b>',
        done: emptySlots.length === 0,
        hint: emptySlots.length
          ? `${runName(problem, emptySlots[0].run)} のケーブルがまだです（${emptySlots[0].run.note}` +
            (emptySlots[0].run.cut ? `／図の寸法 ${emptySlots[0].run.span}mm → <b>${emptySlots[0].run.cut}mm</b> で切ります` : '') +
            `）。`
          : ''
      },
      {
        id: 'n',
        text: '<b>電源N側（白線）</b>を、ランプ類・コンセントに繋ぐ',
        done: missingN.length === 0 && loadN.length > 0,
        hint: missingN.length ? `${missingN[0].name} に白線が届いていません。` : '',
        targets: missingN.map(t => t.id)
      },
      {
        id: 'l',
        text: '<b>電源L側（黒線）</b>を、スイッチ・コンセントに繋ぐ',
        done: missingL.length === 0 && swCom.length > 0,
        hint: missingL.length ? `${missingL[0].name} に黒線が届いていません。` +
          (hasJumper(problem, missingL[0].device.group) ? '渡り線も使います。' : '') : '',
        targets: missingL.map(t => t.id)
      },
      {
        id: 'return',
        text: '<b>対応するスイッチとランプ類</b>を繋ぐ（帰り線）',
        done: missingReturn.length === 0,
        hint: missingReturn.length ? `${swTitle(problem, missingReturn[0].sw, missingReturn[0].mark)}の帰り線がまだです。` : ''
      },
      {
        id: 'bundle',
        text: 'ジョイントボックス内の<b>接続点</b>をまとめる',
        done: loose === 0 && state.bundles.length > 0,
        hint: loose ? `ボックス内に未接続の線端が ${loose} 本あります。` : ''
      },
      {
        id: 'test',
        text: '<b>目で見て通電試験</b>（スイッチと器具の対応を確認）',
        done: g.passed,
        hint: g.passed ? '' : '採点して残りの指摘を直してください。'
      }
    ];
    // 3路・4路がある問題だけ「スイッチ相互間」の手順を足す（No.1〜5 は7件のまま）
    if (trav.sides.length) {
      const f = trav.faults[0];
      list.splice(4, 0, {
        id: 'trav',
        text: '3路・4路スイッチの<b>スイッチ相互間</b>（1・3／2・4）をつなぐ',
        done: trav.faults.length === 0,
        hint: f ? `${f.dev.mark ? f.dev.mark + ' ' : ''}${f.dev.label} の ${f.ids.map(x => x.split('.')[1]).join('・')} を、相手のスイッチの同じ側の2端子へ1本ずつ。` : ''
      });
    }
    return list;
  }

  window.Engine = {
    DSU, buildDSU, simulate, grade, steps, srcNodes, contactsOf, switchables,
    allTerminals, terminalRef, deviceOf, groupOfEndpoint, runFor, runById,
    groupLabel, runName, wiresOfRun, swOrientation, orientations,
    cableType, slotKey, runSlots, placedCables, runCapacity, freeCores, cableStock,
    pieceOf, slotPiece, freePieces, runCut, cutPlan,
    wireSize, wireLabel, endpointLabel, bundleInfo, sleeveFor,
    nodeOfEnd, endKey, COLOR_JA,
    // No.6〜13 で追加
    positionsOf, pairSwitches, loadEnds, slotNeeds, slotNeed, anyOrder, swTitle, canCut, packRolls, hasJumper,
    connectMethodOf, travelerSides, travelerFaults
  };
})();
