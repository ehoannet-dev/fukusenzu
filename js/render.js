/* ===========================================================
   render.js — SVG 描画（単線図・作業エリア）
   =========================================================== */

(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const COLORS = {
    black: { stroke: '#21262c', edge: null },
    white: { stroke: '#ffffff', edge: '#8e9aa6' },
    red: { stroke: '#e0362f', edge: null },
    green: { stroke: '#1f9d55', edge: null }
  };
  const INK = '#1d2732';
  const COLOR_LABEL = { black: '黒', white: '白', red: '赤', green: '緑' };
  const MUTED = '#7b8794';

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, s, opts) {
    const o = opts || {};
    const t = el('text', {
      x, y, fill: o.fill || INK,
      'font-size': o.size || 13,
      'font-weight': o.weight || 500,
      'text-anchor': o.anchor || 'middle',
      'dominant-baseline': o.baseline || 'middle',
      'font-family': '"Hiragino Sans","Noto Sans JP",system-ui,sans-serif',
      opacity: o.opacity
    }, parent);
    t.textContent = s;
    return t;
  }
  const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };

  const DIRV = {
    right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1]
  };

  /* =========================================================
     単線図
     ========================================================= */
  let uid = 0;
  function drawSingleLine(svg, problem) {
    clear(svg);
    const tag = 'jb' + (++uid);
    svg.setAttribute('viewBox', problem.single.viewBox);
    const g = el('g', {}, svg);

    problem.single.lines.forEach(l => {
      el('line', {
        x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2,
        stroke: INK, 'stroke-width': 2.4, 'stroke-linecap': 'round'
      }, g);
    });

    problem.single.symbols.forEach(s => {
      switch (s.type) {
        case 'text':
          text(g, s.x, s.y, s.text, {
            size: s.size || 13, weight: s.weight || 500,
            anchor: 'start', fill: s.fill === 'muted' ? MUTED : INK
          });
          break;

        case 'jb': {
          if (s.box === 'outlet') {
            /* アウトレットボックス（□） */
            el('rect', { x: s.x - s.r, y: s.y - s.r, width: s.r * 2, height: s.r * 2,
              fill: '#fff', stroke: INK, 'stroke-width': 2.4 }, g);
            if (s.label) text(g, s.x + s.r + 12, s.y + s.r - 4, s.label, { size: 15, weight: 700 });
            break;
          }
          el('circle', { cx: s.x, cy: s.y, r: s.r, fill: '#fff', stroke: INK, 'stroke-width': 2.4 }, g);
          const cid = tag + '-' + (++uid);
          const cp = el('clipPath', { id: cid }, g);
          el('circle', { cx: s.x, cy: s.y, r: s.r }, cp);
          const hg = el('g', { 'clip-path': 'url(#' + cid + ')' }, g);
          for (let i = -s.r; i <= s.r; i += 11) {
            el('line', {
              x1: s.x + i, y1: s.y - s.r, x2: s.x + i + s.r, y2: s.y + s.r,
              stroke: INK, 'stroke-width': 1.6, opacity: .85
            }, hg);
          }
          text(g, s.x + s.r + 12, s.y + s.r - 4, s.label, { size: 15, weight: 700 });
          break;
        }

        case 'ceiling':
          if (s.round) el('circle', { cx: s.x, cy: s.y, r: 24, fill: '#fff', stroke: INK, 'stroke-width': 2.4 }, g);
          else el('rect', {
            x: s.x - 45, y: s.y - 20, width: 90, height: 40, rx: 3,
            fill: '#fff', stroke: INK, 'stroke-width': 2.4
          }, g);
          text(g, s.x, s.y + 1, '( )', { size: 20, weight: 600 });
          text(g, s.x + (s.round ? 40 : 62), s.y + 18, s.mark, { size: 16, weight: 700 });
          break;

        case 'lamp':
          el('circle', { cx: s.x, cy: s.y, r: 27, fill: '#fff', stroke: INK, 'stroke-width': 2.4 }, g);
          if (s.outdoor) {
            // 屋外灯（施工省略側。○ に名前を添える）
            if (s.mark) text(g, s.x + 42, s.y + 8, s.mark, { size: 16, weight: 700 });
            if (s.label) text(g, s.x, s.y + 44, s.label, { size: 10, weight: 700, fill: MUTED });
            break;
          }
          text(g, s.x, s.y + 1, 'R', { size: 19, weight: 700 });
          text(g, s.x + 42, s.y + 8, s.mark, { size: 16, weight: 700 });
          break;

        case 'switch-dots':
          /* 点滅器（●）。sub＝右下の添字（3・4・A(3A)・R など）、s＝S の傍記 */
          s.marks.forEach((m, i) => {
            const y = s.y + i * (s.gap || 0);
            el('circle', { cx: s.x, cy: y, r: 9, fill: INK }, g);
            const h = (s.hotaru || [])[i] ? 'H' : '';
            const sub = (s.sub || [])[i];
            if (sub) text(g, s.x + 10, y + 13, sub, { size: 11, weight: 700, anchor: 'start' });
            if ((s.s || [])[i]) text(g, s.x - 14, y - 12, 'S', { size: 13, weight: 800, anchor: 'end' });
            const mx = s.x + 26 + (sub ? Math.max(0, sub.length * 6.5 - 8) : 0);
            text(g, mx, y - (sub ? 3 : 0), h + m, { size: 15, weight: 700, anchor: 'start' });
          });
          break;

        case 'relay': {
          /* リモコンリレー（▲）。横の数字は個数 */
          el('path', { d: `M ${s.x} ${s.y - 11} L ${s.x + 11} ${s.y + 8} L ${s.x - 11} ${s.y + 8} Z`, fill: INK }, g);
          if (s.count) text(g, s.x + 18, s.y + 1, String(s.count), { size: 14, weight: 700, anchor: 'start' });
          if (s.label) text(g, s.x, s.y + 26, s.label, { size: 10, weight: 700, fill: MUTED });
          break;
        }

        case 'conduit':
          /* 管の注記（E19・PF16 など）。線の横に小さく添える */
          text(g, s.x, s.y, s.text, { size: s.size || 12, weight: 700, anchor: s.anchor || 'start', fill: s.fill === 'muted' ? MUTED : INK });
          break;

        case 'tb': {
          /* 端子台（配線用遮断器・タイムスイッチなどの代用）。s.rows に各極の名前 */
          const rows = s.rows || [];
          const h = Math.max(34, rows.length * 22 + 14), w = s.w || 62;
          el('rect', { x: s.x - w / 2, y: s.y - h / 2, width: w, height: h, rx: 3,
            fill: '#fff', stroke: INK, 'stroke-width': 2.4 }, g);
          rows.forEach((r, i) => {
            const y = s.y - h / 2 + 14 + i * 22;
            text(g, s.x, y, r, { size: 12, weight: 700 });
            if (i) el('line', { x1: s.x - w / 2, y1: y - 11, x2: s.x + w / 2, y2: y - 11,
              stroke: INK, 'stroke-width': 1.2, opacity: .5 }, g);
          });
          if (s.label) text(g, s.x, s.y - h / 2 - 9, s.label, { size: 11, weight: 700, fill: MUTED });
          if (s.mark) text(g, s.x + w / 2 + 14, s.y, s.mark, { size: 16, weight: 700 });
          break;
        }

        case 'motor':
          el('circle', { cx: s.x, cy: s.y, r: 22, fill: '#fff', stroke: INK, 'stroke-width': 2.4 }, g);
          text(g, s.x, s.y + 1, 'M', { size: 17, weight: 700 });
          if (s.note) text(g, s.x, s.y + 38, s.note, { size: 10, fill: MUTED });
          break;

        case 'earth':
          /* 接地極（⏚） */
          el('line', { x1: s.x, y1: s.y - 14, x2: s.x, y2: s.y, stroke: INK, 'stroke-width': 2.4 }, g);
          [18, 12, 6].forEach((wd, i) => el('line', {
            x1: s.x - wd / 2, y1: s.y + i * 6, x2: s.x + wd / 2, y2: s.y + i * 6,
            stroke: INK, 'stroke-width': 2.4
          }, g));
          if (s.label) text(g, s.x + 26, s.y + 6, s.label, { size: 13, weight: 700 });
          break;

        case 'fluor':
          el('circle', { cx: s.x, cy: s.y, r: 17, fill: '#fff', stroke: INK, 'stroke-width': 2.4 }, g);
          el('path', {
            d: `M ${s.x - 40} ${s.y - 11} h 26 v 22 h -26 z M ${s.x + 14} ${s.y - 11} h 26 v 22 h -26 z`,
            fill: '#fff', stroke: INK, 'stroke-width': 2.4
          }, g);
          if (s.mark) text(g, s.x + 30, s.y + 40, s.mark, { size: 16, weight: 700 });
          break;

        case 'outlet': {
          /* コンセント（半円の平らな側を電線側に向ける）。from＝電線が来る向き（'up' 既定／'down'／'left'／'right'） */
          const rot = { up: 0, right: 90, down: 180, left: -90 }[s.from || 'up'] || 0;
          const og = rot ? el('g', { transform: `rotate(${rot} ${s.x} ${s.y})` }, g) : g;
          el('path', {
            d: `M ${s.x - 22} ${s.y} a 22 22 0 0 0 44 0 z`,
            fill: '#fff', stroke: INK, 'stroke-width': 2.4
          }, og);
          el('line', { x1: s.x - 10, y1: s.y - 13, x2: s.x - 10, y2: s.y, stroke: INK, 'stroke-width': 2.4 }, og);
          el('line', { x1: s.x + 10, y1: s.y - 13, x2: s.x + 10, y2: s.y, stroke: INK, 'stroke-width': 2.4 }, og);
          if (s.count) text(g, s.x + 34, s.y + 8, String(s.count), { size: 15, weight: 700 });
          if (s.mark) text(g, s.x + 34, s.y - 10, s.mark, { size: 15, weight: 700 });
          if (s.sub) text(g, s.x, s.y + 34, s.sub, { size: 10, weight: 700, fill: MUTED });
          if (s.label) text(g, s.x + 34, s.y + (s.count || s.mark ? 26 : 8), s.label, { size: 12, weight: 700, anchor: 'start' });
          break;
        }

        case 'pilot':
          /* 確認表示灯（パイロットランプ） */
          el('circle', { cx: s.x, cy: s.y, r: 10, fill: '#fff', stroke: INK, 'stroke-width': 2.4 }, g);
          text(g, s.x + 26, s.y, s.label || '', { size: 12, weight: 600, anchor: 'start', fill: MUTED });
          break;

        case 'omit-box':
          /* 施工省略の破線の枠（中身は別のシンボルで描く） */
          el('rect', {
            x: s.x, y: s.y, width: s.w, height: s.h, rx: 6,
            fill: 'none', stroke: MUTED, 'stroke-width': 2, 'stroke-dasharray': '7 6'
          }, g);
          text(g, s.x + s.w / 2, s.y + 13, s.text || '施工省略', { size: 11, fill: MUTED });
          break;

        case 'fluor-omitted': {
          el('rect', {
            x: s.x - 62, y: s.y - 58, width: 150, height: 110, rx: 6,
            fill: 'none', stroke: MUTED, 'stroke-width': 2, 'stroke-dasharray': '7 6'
          }, g);
          text(g, s.x + 60, s.y - 42, '施工省略', { size: 11, fill: MUTED, anchor: 'middle' });
          el('circle', { cx: s.x, cy: s.y, r: 17, fill: '#fff', stroke: INK, 'stroke-width': 2.4 }, g);
          el('path', {
            d: `M ${s.x - 40} ${s.y - 11} h 26 v 22 h -26 z M ${s.x + 14} ${s.y - 11} h 26 v 22 h -26 z`,
            fill: '#fff', stroke: INK, 'stroke-width': 2.4
          }, g);
          text(g, s.x + 30, s.y + 40, s.mark, { size: 16, weight: 700 });
          break;
        }
      }
    });
  }

  /* =========================================================
     レイアウト（ボックス内の線端位置）
     ========================================================= */
  function anchorOf(problem, ep) {
    if (ep.k === 'jb') {
      const d = Engine.deviceOf(problem, ep.id);
      return d ? { x: d.x, y: d.y } : { x: 0, y: 0 };
    }
    const t = Engine.terminalRef(problem, ep.id);
    return t ? { x: t.x, y: t.y } : { x: 0, y: 0 };
  }

  function layout(problem, state) {
    const ends = new Map();
    const geoms = cableGeoms(problem, state);
    problem.devices.filter(d => d.type === 'jointbox').forEach(jb => {
      if (!jb) return;
      const list = [];
      state.wires.forEach(w => ['a', 'b'].forEach(side => {
        const ep = side === 'a' ? w.a : w.b;
        if (ep.k === 'jb' && ep.id === jb.id) {
          // ケーブルの心線は、そのケーブルのボックス側の出口から出す
          const g = w.slot ? geoms.get(w.slot) : null;
          const ex = g && g.type ? coreExit(g, jb.group || jb.id, w.color) : null;
          if (ex) {
            ends.set(w.id + ':' + side, {
              x: ex.x, y: ex.y,
              ang: Math.atan2(ex.y - jb.y, ex.x - jb.x),
              jb: jb.id, color: w.color, wire: w.id, side, cable: w.slot
            });
            return;
          }
          const other = side === 'a' ? w.b : w.a;
          list.push({ w, side, other, anchor: anchorOf(problem, other) });
        }
      }));
      const groups = new Map();
      list.forEach(e => {
        const key = Engine.groupOfEndpoint(problem, e.other) || 'x';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(e);
      });
      groups.forEach(arr => {
        const a0 = Math.atan2(arr[0].anchor.y - jb.y, arr[0].anchor.x - jb.x);
        // 垂直方向（世界座標で向きを揃える）＝ ボックス間でも線が交差しないように
        let px = -Math.sin(a0), py = Math.cos(a0), flipped = false;
        if (py < -1e-6 || (Math.abs(py) <= 1e-6 && px < 0)) { px = -px; py = -py; flipped = true; }
        const proj = (e) => (e.anchor.x - jb.x) * px + (e.anchor.y - jb.y) * py;
        arr.sort((e1, e2) => proj(e1) - proj(e2));
        const n = arr.length;
        const spread = n > 4 ? 0.26 : 0.34;
        const sgn = flipped ? -1 : 1;
        arr.forEach((e, i) => {
          const ang = a0 + sgn * (i - (n - 1) / 2) * spread;
          const r = jb.r * 0.78;
          ends.set(e.w.id + ':' + e.side, {
            x: jb.x + Math.cos(ang) * r,
            y: jb.y + Math.sin(ang) * r,
            ang, jb: jb.id, color: e.w.color, wire: e.w.id, side: e.side
          });
        });
      });
    });

    /* 接続点：重心から始めて、重ならないよう軽く反発させる */
    const bundles = new Map();
    const byBox = new Map();
    state.bundles.forEach(b => {
      const pts = b.ends.map(k => ends.get(k)).filter(Boolean);
      if (!pts.length) return;
      const jb = Engine.deviceOf(problem, b.jb);
      if (!jb) return;
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const node = { id: b.id, jb, x: jb.x + (cx - jb.x) * 0.55, y: jb.y + (cy - jb.y) * 0.55 };
      if (!byBox.has(jb.id)) byBox.set(jb.id, []);
      byBox.get(jb.id).push(node);
    });
    byBox.forEach(nodes => {
      const MIN = 46, LIM = 0.5;
      for (let it = 0; it < 90; it++) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            let dx = b.x - a.x, dy = b.y - a.y;
            let d = Math.hypot(dx, dy);
            if (d < 0.001) { dx = (i - j) || 1; dy = 1; d = Math.hypot(dx, dy); }
            if (d < MIN) {
              const push = (MIN - d) / 2 / d;
              a.x -= dx * push; a.y -= dy * push;
              b.x += dx * push; b.y += dy * push;
            }
          }
        }
        nodes.forEach(n => {
          const dx = n.x - n.jb.x, dy = n.y - n.jb.y;
          const d = Math.hypot(dx, dy), lim = n.jb.r * LIM;
          if (d > lim) { n.x = n.jb.x + dx / d * lim; n.y = n.jb.y + dy / d * lim; }
        });
      }
      nodes.forEach(n => bundles.set(n.id, { x: n.x, y: n.y }));
    });

    return { ends, bundles };
  }

  function pointOf(problem, lay, ep, wireId, side) {
    if (ep.k === 'jb') {
      const p = lay.ends.get(wireId + ':' + side);
      if (p) return { x: p.x, y: p.y, dir: [Math.cos(p.ang), Math.sin(p.ang)], box: true };
      const d = Engine.deviceOf(problem, ep.id);
      return { x: d.x, y: d.y, dir: [0, -1], box: true };
    }
    const t = Engine.terminalRef(problem, ep.id);
    if (!t) return { x: 0, y: 0, dir: [0, 1], box: false, missing: true };
    return { x: t.x, y: t.y, dir: DIRV[t.dir] || [0, 1], box: false };
  }

  function wirePath(p0, p1) {
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const kb = Math.max(34, Math.min(dist * 0.3, 105));
    const k0 = p0.box ? kb : 44;
    const k1 = p1.box ? kb : 44;
    const c1x = p0.x + p0.dir[0] * k0, c1y = p0.y + p0.dir[1] * k0;
    const c2x = p1.x + p1.dir[0] * k1, c2y = p1.y + p1.dir[1] * k1;
    return `M ${p0.x} ${p0.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }

  /* 3次ベジェの真ん中（削除ボタンを置く位置） */
  function wireMid(p0, p1) {
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const kb = Math.max(34, Math.min(dist * 0.3, 105));
    const k0 = p0.box ? kb : 44;
    const k1 = p1.box ? kb : 44;
    const c1x = p0.x + p0.dir[0] * k0, c1y = p0.y + p0.dir[1] * k0;
    const c2x = p1.x + p1.dir[0] * k1, c2y = p1.y + p1.dir[1] * k1;
    return {
      x: (p0.x + 3 * c1x + 3 * c2x + p1.x) / 8,
      y: (p0.y + 3 * c1y + 3 * c2y + p1.y) / 8
    };
  }

  /* その心線がもう電線になっているか */
  function coreDone(state, it) {
    return (state.wires || []).some(w => w.slot === it.slot && w.color === it.color);
  }

  /* ケーブル1本ぶんの形（両端の出口・向き）。layout と描画の両方で使う */
  const CABLE_TH = (type) => (type && type.single ? 4 : (type && type.size >= 2 ? 12.5 : 10.5) + (type && type.round ? 2 : 0));
  function cableGeoms(problem, state) {
    const map = new Map();
    (problem.runs || []).forEach(run => {
      if (!run.slots) return;
      const A = groupShape(problem, run.a), B = groupShape(problem, run.b);
      if (!A || !B) return;
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, px = -uy, py = ux;
      const isBox = (g) => {
        const ds = problem.devices.filter(d => d.group === g);
        return ds.length === 1 && ds[0].type === 'jointbox';
      };
      // ジョイントボックスの中へは「入り口に少しだけ」入り込ませる
      const a0 = isBox(run.a) ? edgeDist(A, ux, uy) - 14 : edgeDist(A, ux, uy) * 0.9;
      const b0 = isBox(run.b) ? edgeDist(B, -ux, -uy) - 14 : edgeDist(B, -ux, -uy) * 0.9;
      const c0 = { x: A.x + ux * a0, y: A.y + uy * a0 };
      const c1 = { x: B.x - ux * b0, y: B.y - uy * b0 };
      const corridor = Math.hypot(c1.x - c0.x, c1.y - c0.y);
      for (let i = 0; i < run.slots; i++) {
        const key = run.id + '#' + i;
        const pc = Engine.slotPiece(state, key);
        const type = pc ? Engine.cableType(pc.type) : null;
        // 管の中の電線は寄せて通す
        const pitch = run.conduit ? 11 : Math.min(corridor * 0.35, 62);
        const off = run.slots > 1 ? (i - (run.slots - 1) / 2) * pitch : 0;
        map.set(key, {
          run, i, type, ux, uy, px, py, corridor, pitch: run.slots > 1 ? pitch : Infinity,
          a: { x: c0.x + px * off, y: c0.y + py * off, group: run.a, box: isBox(run.a) },
          b: { x: c1.x + px * off, y: c1.y + py * off, group: run.b, box: isBox(run.b) }
        });
      }
    });
    return map;
  }
  /* その心線が、ケーブルの中で中心からどれだけ横にずれているか */
  function coreOffset(type, color) {
    if (!type) return 0;
    const ci = type.cores.indexOf(color);
    if (ci < 0) return 0;
    return (ci - (type.cores.length - 1) / 2) * (CABLE_TH(type) * 0.82);
  }
  /* その心線の、指定グループ側の出口（ケーブルの端） */
  function coreExit(geom, group, color) {
    if (!geom) return null;
    const side = geom.a.group === group ? geom.a : geom.b.group === group ? geom.b : null;
    if (!side) return null;
    const o = coreOffset(geom.type, color);
    return { x: side.x + geom.px * o, y: side.y + geom.py * o, box: side.box };
  }

  /* 区間の両端（器具のかたまり）の大きさ */
  function groupShape(problem, g) {
    const ds = problem.devices.filter(d => d.group === g);
    if (!ds.length) return null;
    if (ds.length === 1 && ds[0].type === 'jointbox') {
      return { x: ds[0].x, y: ds[0].y, w: ds[0].r * 2, h: ds[0].r * 2 };
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ds.forEach(d => {
      const rx = (d.shape && d.shape.rx) || 72, ry = (d.shape && d.shape.ry) || 56;
      x0 = Math.min(x0, d.x - rx); x1 = Math.max(x1, d.x + rx);
      y0 = Math.min(y0, d.y - ry); y1 = Math.max(y1, d.y + ry);
    });
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }

  /* 中心から (ux,uy) 方向のふちまでの距離 */
  function edgeDist(shape, ux, uy) {
    if (shape.r) return shape.r;
    // 四角：中心から (ux,uy) 方向のふちまで
    const ax = Math.abs(ux), ay = Math.abs(uy);
    const tx = ax > 1e-6 ? (shape.w / 2) / ax : Infinity;
    const ty = ay > 1e-6 ? (shape.h / 2) / ay : Infinity;
    return Math.min(tx, ty);
  }

  /* 丸い × ボタン */
  function deleteButton(parent, x, y, r, attr, value, title) {
    const g = el('g', { class: 'del-btn', style: 'cursor:pointer' }, parent);
    g.dataset[attr] = value;
    el('circle', { cx: x, cy: y, r, fill: '#e0362f', stroke: '#ffffff', 'stroke-width': Math.max(2, r * 0.18) }, g);
    const a = r * 0.42;
    el('path', {
      d: `M ${x - a} ${y - a} L ${x + a} ${y + a} M ${x + a} ${y - a} L ${x - a} ${y + a}`,
      stroke: '#ffffff', 'stroke-width': Math.max(2, r * 0.26), 'stroke-linecap': 'round'
    }, g);
    if (title) { const t = el('title', {}, g); t.textContent = title; }
    return g;
  }

  /* =========================================================
     作業エリア
     ========================================================= */
  const lastSlots = new Map();

  function drawWorkspace(svg, problem, state, view) {
    clear(svg);
    lastSlots.clear();
    svg.setAttribute('viewBox', view.viewBox || problem.workspace.viewBox);

    const defs = el('defs', {}, svg);
    const glow = el('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: 6, result: 'b' }, glow);
    const m = el('feMerge', {}, glow);
    el('feMergeNode', { in: 'b' }, m);
    el('feMergeNode', { in: 'SourceGraphic' }, m);

    const gFrames = el('g', {}, svg);
    const gBoxes = el('g', {}, svg);
    const gCable = el('g', {}, svg);
    const gWires = el('g', {}, svg);
    const gInner = el('g', {}, svg);
    const gDev = el('g', {}, svg);
    const gTerm = el('g', {}, svg);
    const gSlotUI = el('g', {}, svg);
    const gUI = el('g', {}, svg);
    const gOver = el('g', { 'pointer-events': 'none' }, svg);

    const lay = layout(problem, state);
    const sim = view.sim;

    // 引きかけ中：どこにつなげるか（ハイライト用）
    let pendGroup = null;
    if (view.pending) {
      if (view.pending.k === 't') {
        const t = Engine.terminalRef(problem, view.pending.id);
        pendGroup = t ? t.device.group : null;
      } else if (view.pending.k === 'jb') {
        pendGroup = view.pending.id;
      } else if (view.pending.k === 'b') {
        const b = state.bundles.find(x => x.id === view.pending.id);
        pendGroup = b ? b.jb : null;
      }
    }
    // ケーブルから心線を引いているとき：その区間の両端（片端が決まっていれば残りだけ）
    let cableEnds = null;
    if (view.pending && view.pending.k === 'cable') {
      const run = Engine.runById(problem, String(view.pending.key).split('#')[0]);
      if (run) {
        const from = view.pending.from;
        const fromG = from ? Engine.groupOfEndpoint(problem, from) : null;
        cableEnds = fromG ? [run.a === fromG ? run.b : run.a] : [run.a, run.b];
      }
    }
    const canReach = (group) => cableEnds
      ? cableEnds.indexOf(group) >= 0
      : !!(pendGroup && group && group !== pendGroup && Engine.runFor(problem, pendGroup, group));

    // 画面上のタップ目標をだいたい一定の大きさに保つ（縮小表示・スマホ対策）
    const vb = (view.viewBox || problem.workspace.viewBox).split(/\s+/).map(Number);
    const cssW = svg.clientWidth || svg.parentNode && svg.parentNode.clientWidth || 900;
    const perPx = vb[2] / cssW;
    const hitR = Math.max(14, Math.min(13 * perPx, 46));
    // 文字は「画面上で何px」で決める（縮小表示でも読めるように）
    const PX = Math.max(1, Math.min(perPx, 3.2));
    const fs = n => Math.round(n * PX * 10) / 10;

    /* ---- 枠（連用枠・施工省略） ---- */
    (problem.frames || []).forEach(f => {
      el('rect', {
        x: f.x, y: f.y, width: f.w, height: f.h, rx: 10,
        fill: 'none', stroke: '#b7c1cc', 'stroke-width': 2, 'stroke-dasharray': '8 6'
      }, gFrames);
      text(gFrames, f.x + f.w / 2 + (f.labelDx || 0), f.y + f.h + fs(12), f.label, { size: fs(10.5), fill: MUTED });
    });
    problem.devices.filter(d => d.omitBox).forEach(d => {
      const b = d.omitBox;
      el('rect', {
        x: b.x, y: b.y, width: b.w, height: b.h, rx: 10,
        fill: 'none', stroke: '#b7c1cc', 'stroke-width': 2, 'stroke-dasharray': '8 6'
      }, gFrames);
      text(gFrames, b.x + b.w - 52, b.y + b.h - 16, b.text, { size: fs(10.5), fill: MUTED });
    });

    /* ---- ジョイントボックス（背面） ---- */
    problem.devices.filter(d => d.type === 'jointbox').forEach(d => {
      const hot = view.hover && view.hover.k === 'jb' && view.hover.id === d.id;
      const pend = view.pending && view.pending.k === 'jb' && view.pending.id === d.id;
      const target = canReach(d.group) || (view.pickBox === d.group && (view.pickedCores || []).length >= 2);
      const sq = (pad, attrs) => el('rect', Object.assign({
        x: d.x - d.r - pad, y: d.y - d.r - pad,
        width: (d.r + pad) * 2, height: (d.r + pad) * 2, rx: 8
      }, attrs), gBoxes);
      if (target) {
        sq(7, {
          fill: 'rgba(10,107,212,.10)',
          stroke: '#0a6bd4', 'stroke-width': 3, 'stroke-dasharray': '3 7',
          'pointer-events': 'none'
        });
      }
      // 少し外れてもボックスに当たるように、透明の広い判定を敷く
      sq(30, { fill: 'transparent', class: 'jb-body' }).dataset.jb = d.id;
      // アウトレットボックスは実線の箱（金属製は灰色）。VVF用ジョイントボックスは破線
      const ob = d.box === 'outlet';
      sq(0, {
        fill: target ? '#eff6ff' : ob && d.metal ? '#eceff3' : ob ? '#f4f6f8' : '#fbfcfe',
        stroke: pend || hot || target ? '#0a6bd4' : ob ? '#5b6672' : '#7f8b98',
        'stroke-width': pend || hot || target ? 3.5 : ob ? 3 : 2.4,
        'stroke-dasharray': ob ? null : '10 7',
        class: 'jb-body', tabindex: '0', role: 'button', 'aria-label': d.label
      }).dataset.jb = d.id;
      if (ob) sq(-9, { fill: 'none', stroke: '#b4bec8', 'stroke-width': 1.4, 'pointer-events': 'none' });
      if (target) {
        const msg = view.pickBox === d.group && (view.pickedCores || []).length >= 2 ? 'ここでつながります' : 'ここにつなぐ';
        text(gBoxes, d.x, d.y - d.r + fs(16), msg, { size: fs(11), weight: 800, fill: '#0a6bd4' })
          .setAttribute('pointer-events', 'none');
      }
      // 名前は、下へ出るケーブルや管に隠れないよう上の層に白ふち付きで書く
      const jl = text(gSlotUI, d.x, d.y + d.r + fs(13), d.label, { size: fs(12), weight: 700, fill: '#55616e' });
      // 名前はケーブルより上の層にあるので、タップは下のケーブルへ通す（ボックスの判定は本体の四角が持つ）
      jl.setAttribute('pointer-events', 'none');
      jl.setAttribute('paint-order', 'stroke');
      jl.setAttribute('stroke', '#ffffff');
      jl.setAttribute('stroke-width', String(fs(3.5)));
      jl.setAttribute('stroke-linejoin', 'round');
    });

    /* ---- 区間のケーブル（置き場） ---- */
    const geoms = cableGeoms(problem, state);
    const coreOf = (key, color) => state.wires.find(w => w.slot === key && w.color === color) || null;
    const usedCore = (key, color) => !!coreOf(key, color);
    /* ---- 管（金属管・PF管）：区間の下に太い帯で描く ---- */
    problem.runs.forEach(run => {
      if (!run.conduit || !run.slots) return;
      const gs = [];
      for (let i = 0; i < run.slots; i++) { const gm = geoms.get(run.id + '#' + i); if (gm) gs.push(gm); }
      if (!gs.length) return;
      const avg = (k, c) => gs.reduce((s2, gm) => s2 + gm[k][c], 0) / gs.length;
      const a = { x: avg('a', 'x'), y: avg('a', 'y'), group: gs[0].a.group };
      const b = { x: avg('b', 'x'), y: avg('b', 'y'), group: gs[0].b.group };
      const cd = run.conduit, metal = !!cd.metal;
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: metal ? '#9aa3ab' : '#d8c9a8', 'stroke-width': 44, opacity: .55, 'pointer-events': 'none' }, gCable);
      // PF管は蛇腹に見えるよう細かい縞を重ねる
      if (!metal) el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: '#a8966e', 'stroke-width': 44, opacity: .3, 'stroke-dasharray': '3 7', 'pointer-events': 'none' }, gCable);
      // ボックスコネクタ（六角）
      const at = [a, b].find(e => e.group === cd.fittingAt) || a;
      const hx = [];
      for (let k = 0; k < 6; k++) { const an = Math.PI / 3 * k + Math.PI / 6; hx.push((at.x + Math.cos(an) * 30) + ',' + (at.y + Math.sin(an) * 30)); }
      el('polygon', { points: hx.join(' '), fill: metal ? '#c9ced4' : '#e6dcc6', stroke: '#5b6672', 'stroke-width': 2, opacity: .9, 'pointer-events': 'none' }, gCable);
      const other = at === a ? b : a;
      const tx = at.x + (other.x - at.x) * 0.5, ty = at.y + (other.y - at.y) * 0.5;
      const gm0 = gs[0];
      const lbl = text(gCable, tx - gm0.px * 36, ty - gm0.py * 36, cd.kind, { size: fs(11), weight: 800, fill: metal ? '#4a5561' : '#7a6a45' });
      lbl.setAttribute('pointer-events', 'none');
      lbl.setAttribute('paint-order', 'stroke'); lbl.setAttribute('stroke', '#ffffff'); lbl.setAttribute('stroke-width', String(fs(3)));
    });

    problem.runs.forEach(run => {
      if (!run.slots) return;
      const bw = fs(27), bh = fs(8.5);
      for (let i = 0; i < run.slots; i++) {
        const key = run.id + '#' + i;
        const gm = geoms.get(key);
        if (!gm) continue;
        const type = gm.type;
        const mx = (gm.a.x + gm.b.x) / 2, my = (gm.a.y + gm.b.y) / 2;
        const at = (run.at || [])[i];
        const badge = at ? { x: at[0], y: at[1] } : { x: mx + gm.px * bh * 2.6, y: my + gm.py * bh * 2.6 };
        const hot = view.dragCable || view.pickCable;
        const warnSlot = view.hintSlot === run.id;
        const sel = view.selectedSlot === key || (view.corePicker && view.corePicker.key === key);

        const g = el('g', { class: 'cable-slot', style: 'cursor:pointer' }, gCable);
        g.dataset.slot = key;

        if (type) {
          const th = CABLE_TH(type);
          // クリックしやすいように透明の太い線（となりの置き場の線まで覆わない太さまで。管の中の IV は間が狭い）
          el('line', {
            x1: gm.a.x, y1: gm.a.y, x2: gm.b.x, y2: gm.b.y,
            stroke: 'transparent', 'stroke-width': Math.min(th * 2 + 26, gm.pitch), 'stroke-linecap': 'round'
          }, g);
          if (!type.single || sel) {
            el('line', {
              x1: gm.a.x, y1: gm.a.y, x2: gm.b.x, y2: gm.b.y,
              stroke: sel ? '#0a6bd4' : type.edge,
              'stroke-width': th * 2 + (sel ? 6 : 3), 'stroke-linecap': 'round', opacity: .95
            }, g);
          }
          if (!type.single) {
            el('line', {
              x1: gm.a.x, y1: gm.a.y, x2: gm.b.x, y2: gm.b.y,
              stroke: type.sheath, 'stroke-width': th * 2, 'stroke-linecap': 'round'
            }, g);
            // VVR（丸形）は筒に見えるよう、真ん中を明るくする
            if (type.round) el('line', {
              x1: gm.a.x, y1: gm.a.y, x2: gm.b.x, y2: gm.b.y,
              stroke: '#ffffff', 'stroke-width': th, 'stroke-linecap': 'round', opacity: .45, 'pointer-events': 'none'
            }, g);
          }
          // 中の心線（使っている心線は濃く・太く）
          const pickedHere = (view.pickedCores || []).filter(it => it.slot === key).map(it => it.color);
          type.cores.forEach(col => {
            const o = coreOffset(type, col);
            const c = COLORS[col] || COLORS.black;
            const w4 = coreOf(key, col);
            const on = pickedHere.indexOf(col) >= 0 || (w4 && view.selectedWire === w4.id);
            const used = usedCore(key, col);
            if (on) {
              el('line', {
                x1: gm.a.x + gm.px * o, y1: gm.a.y + gm.py * o,
                x2: gm.b.x + gm.px * o, y2: gm.b.y + gm.py * o,
                stroke: '#0a6bd4', 'stroke-width': 11, 'stroke-linecap': 'round',
                opacity: .9, 'pointer-events': 'none'
              }, g);
            }
            const solo = !!type.single;
            if (c.edge && (used || on || solo)) {
              el('line', {
                x1: gm.a.x + gm.px * o, y1: gm.a.y + gm.py * o,
                x2: gm.b.x + gm.px * o, y2: gm.b.y + gm.py * o,
                stroke: c.edge, 'stroke-width': 7, 'stroke-linecap': 'round', 'pointer-events': 'none'
              }, g);
            }
            el('line', {
              x1: gm.a.x + gm.px * o, y1: gm.a.y + gm.py * o,
              x2: gm.b.x + gm.px * o, y2: gm.b.y + gm.py * o,
              stroke: c.stroke, 'stroke-width': used || on || solo ? 5 : 2.8,
              'stroke-linecap': 'round', opacity: used || on ? 1 : solo ? .8 : .45, 'pointer-events': 'none'
            }, g);
            // まだ器具につながっていない端に、赤い印を出す
            if (used) {
              const w3 = coreOf(key, col);
              ['a', 'b'].forEach(side => {
                const ep = side === 'a' ? w3.a : w3.b;
                if (!ep || ep.k !== 'g') return;
                const sd = gm.a.group === ep.id ? gm.a : gm.b.group === ep.id ? gm.b : null;
                if (!sd) return;
                el('circle', {
                  cx: sd.x + gm.px * o, cy: sd.y + gm.py * o, r: 6.5,
                  fill: '#ffffff', stroke: '#e0362f', 'stroke-width': 2.6, 'pointer-events': 'none'
                }, g);
              });
            }
            // 通電試験：ケーブルの中を流れている心線も光らせる
            if (view.powerMode && used && sim) {
              const w2 = coreOf(key, col);
              const st2 = w2 && sim.wireState[w2.id];
              if (st2 === 'live' || st2 === 'short') {
                el('line', {
                  x1: gm.a.x + gm.px * o, y1: gm.a.y + gm.py * o,
                  x2: gm.b.x + gm.px * o, y2: gm.b.y + gm.py * o,
                  stroke: st2 === 'short' ? '#ff3b30' : '#ffb300',
                  'stroke-width': 2.4, 'stroke-dasharray': '10 12', class: 'wire live-flow',
                  'pointer-events': 'none'
                }, g);
              }
            }
          });
        }

        // 名前（札）。指でタップしやすいよう、いちばん上のレイヤーに大きめに描く
        const picked = (view.pickedCores || []).filter(it => it.slot === key);
        const piece = Engine.slotPiece(state, key);
        const label = type ? type.name : 'ケーブルを選ぶ';
        const tw = fs(type ? 29 : 33), th2 = fs(type ? 10 : 13);
        el('line', {
          x1: mx, y1: my, x2: badge.x, y2: badge.y,
          stroke: type ? (type.edge || '#b9c3cd') : hot ? '#0a6bd4' : '#9aa6b2',
          'stroke-width': 1.4, 'stroke-dasharray': '4 4', opacity: type ? .5 : .9,
          'pointer-events': 'none'
        }, g);
        const gb = el('g', { class: 'cable-slot slot-badge', style: 'cursor:pointer' }, gSlotUI);
        gb.dataset.slot = key;
        // 透明の当たり判定（指でも押せる大きさ）
        const hpx = fs(10), hpy = fs(11);
        el('rect', {
          x: badge.x - tw - hpx, y: badge.y - th2 - hpy,
          width: (tw + hpx) * 2, height: (th2 + hpy) * 2, rx: fs(8), fill: 'transparent'
        }, gb);
        el('rect', {
          x: badge.x - tw, y: badge.y - th2, width: tw * 2, height: th2 * 2, rx: fs(5),
          fill: !type ? (hot || warnSlot ? 'rgba(10,107,212,.16)' : 'rgba(255,255,255,.92)')
                      : 'rgba(255,255,255,.80)',
          stroke: sel ? '#0a6bd4' : !type ? (hot || warnSlot ? '#0a6bd4' : '#0a6bd4') : 'none',
          'stroke-width': sel || hot || warnSlot ? 2.4 : !type ? 1.8 : 1.2,
          'stroke-dasharray': type ? null : '6 4'
        }, gb);
        const tEl = text(gb, badge.x, badge.y + (picked.length ? -fs(3) : 0), label, {
          size: fs(type ? 10 : 10.5), weight: 800,
          fill: type ? (sel ? '#0a6bd4' : '#6f6146') : '#0a6bd4'
        });
        tEl.setAttribute('pointer-events', 'none');
        if (picked.length) {
          const gap = fs(7.5);
          picked.forEach((it, pi) => {
            const c = COLORS[it.color] || COLORS.black;
            el('circle', {
              cx: badge.x + (pi - (picked.length - 1) / 2) * gap, cy: badge.y + fs(6.5),
              r: fs(2.8), fill: c.stroke, stroke: '#0a6bd4', 'stroke-width': 1.4,
              'pointer-events': 'none'
            }, gb);
          });
        }
        if (piece) {
          const lenOk = !run.cut || piece.len === run.cut;
          const lt = text(gb, badge.x, badge.y + th2 + fs(9), piece.len + 'mm',
            { size: fs(9), weight: 800, fill: lenOk ? '#8a939c' : '#e0362f' });
          lt.setAttribute('paint-order', 'stroke');
          lt.setAttribute('stroke', '#ffffff');
          lt.setAttribute('stroke-width', String(fs(3)));
          lt.setAttribute('stroke-linejoin', 'round');
        }
        const ttl2 = el('title', {}, gb);
        ttl2.textContent = type
          ? `${type.name}${piece ? '（' + piece.len + 'mm）' : ''}：タップすると心線（${type.cores.map(c => COLOR_LABEL[c]).join('・')}）をえらべます`
          : `${Engine.runName(problem, run)}：タップしてケーブルをえらびます`;
        lastSlots.set(key, { x: badge.x, y: badge.y, w: tw, h: th2, run: run.id, empty: !type });
        const ttl = el('title', {}, g);
        ttl.textContent = type
          ? `${type.name}（${Engine.runName(problem, run)}）：クリックすると心線（${type.cores.map(c => COLOR_LABEL[c]).join('・')}）をえらべます`
          : `${Engine.runName(problem, run)}：ここにケーブルをドラッグします`;
        if (sel && type) deleteButton(gUI, badge.x + tw, badge.y - th2, fs(8.5), 'delslot', key, 'このケーブルを外す');
      }
    });

    /* ---- 電線 ---- */
    state.wires.forEach(w => {
      const gm = w.slot ? geoms.get(w.slot) : null;
      if (gm && gm.type) {
        // ケーブルの心線：ケーブルの外（器具側）だけを描く。
        // ボックスの中は「出口 → 接続点」で描かれる
        ['a', 'b'].forEach(side => {
          const ep = side === 'a' ? w.a : w.b;
          if (ep.k !== 't') return;
          const t = Engine.terminalRef(problem, ep.id);
          if (!t) return;
          const ex = coreExit(gm, t.device.group, w.color);
          if (!ex) return;
          const c = COLORS[w.color] || COLORS.black;
          const st = sim ? sim.wireState[w.id] : null;
          const td = DIRV[t.dir] || [0, 1];
          const p0 = { x: t.x, y: t.y, dir: td, box: false };
          // ケーブルの向きのまま器具へ入ると、横向きの端子（スイッチの左右など）へは本体の裏を通って見えなくなる。
          // 端子の向きがケーブルと直角のときは、端子と同じ側へふくらませて本体をよける
          const sg = gm.a.group === t.device.group ? 1 : -1;
          const cd = [-gm.ux * sg, -gm.uy * sg];
          const perp = Math.abs(td[0] * cd[0] + td[1] * cd[1]) < 0.5;
          const p1 = { x: ex.x, y: ex.y, dir: perp ? td : cd, box: false };
          const d = wirePath(p0, p1);
          if (c.edge) el('path', { d, class: 'wire', stroke: c.edge, 'stroke-width': 8 }, gWires);
          const path = el('path', {
            d, class: 'wire' + (view.selectedWire === w.id ? ' is-selected' : ''),
            stroke: c.stroke, 'stroke-width': 5.5
          }, gWires);
          if (view.powerMode && (st === 'live' || st === 'short')) {
            el('path', {
              d, class: 'wire live-flow',
              stroke: st === 'short' ? '#ff3b30' : '#ffb300',
              'stroke-width': 3, 'stroke-dasharray': '10 12', opacity: .95
            }, gWires);
          }
          const linkId = 'term:' + w.id + ':' + side;
          const hit = el('path', { d, class: 'wire-hit', style: 'cursor:pointer' }, gWires);
          hit.dataset.link = linkId;
          path.dataset.link = linkId;
          const ttl3 = el('title', {}, hit);
          ttl3.textContent = 'この心線を、この端子から外す';
          if (view.selectedLink === linkId) {
            const m = wireMid(p0, p1);
            el('path', {
              d, class: 'wire', stroke: '#0a6bd4', 'stroke-width': 11,
              opacity: .55, 'pointer-events': 'none'
            }, gWires);
            deleteButton(gUI, m.x, m.y, Math.max(11, hitR * 0.6), 'dellink', linkId, 'この心線を端子から外す');
          }
        });
        return;
      }
      const p0 = pointOf(problem, lay, w.a, w.id, 'a');
      const p1 = pointOf(problem, lay, w.b, w.id, 'b');
      if (p0.missing || p1.missing) return;
      const d = wirePath(p0, p1);
      const c = COLORS[w.color] || COLORS.black;
      const st = sim ? sim.wireState[w.id] : null;

      if (c.edge) el('path', { d, class: 'wire', stroke: c.edge, 'stroke-width': 8 }, gWires);
      const path = el('path', {
        d, class: 'wire' + (view.selectedWire === w.id ? ' is-selected' : ''),
        stroke: c.stroke, 'stroke-width': 5.5
      }, gWires);
      if (view.powerMode && (st === 'live' || st === 'short')) {
        el('path', {
          d, class: 'wire live-flow',
          stroke: st === 'short' ? '#ff3b30' : '#ffb300',
          'stroke-width': 3, 'stroke-dasharray': '10 12', opacity: .95
        }, gWires);
      }
      const hit = el('path', { d, class: 'wire-hit' }, gWires);
      hit.dataset.wire = w.id;
      path.dataset.wire = w.id;
    });

    /* ---- ボックス内：接続点と線端 ---- */
    state.bundles.forEach(b => {
      const bp = lay.bundles.get(b.id);
      if (!bp) return;
      b.ends.forEach(k => {
        const p = lay.ends.get(k);
        if (!p) return;
        const c = COLORS[p.color] || COLORS.black;
        const linkId = 'inbox:' + k;
        const selW = view.selectedWire === p.wire || (view.selectedLink === linkId);
        if (selW) {
          el('line', {
            x1: p.x, y1: p.y, x2: bp.x, y2: bp.y,
            stroke: '#0a6bd4', 'stroke-width': 9, 'stroke-linecap': 'round',
            opacity: .85, 'pointer-events': 'none'
          }, gInner);
        }
        if (c.edge) {
          el('line', {
            x1: p.x, y1: p.y, x2: bp.x, y2: bp.y,
            stroke: c.edge, 'stroke-width': 5, 'stroke-linecap': 'round'
          }, gInner);
        }
        el('line', {
          x1: p.x, y1: p.y, x2: bp.x, y2: bp.y,
          stroke: c.stroke, 'stroke-width': 3.2, 'stroke-linecap': 'round'
        }, gInner);
        // クリック用（この1本の「接続」だけを外せる）
        const hit = el('line', {
          x1: p.x, y1: p.y, x2: bp.x, y2: bp.y,
          stroke: 'transparent', 'stroke-width': 15, 'stroke-linecap': 'round',
          style: 'cursor:pointer'
        }, gInner);
        hit.dataset.link = linkId;
        const ttl2 = el('title', {}, hit);
        ttl2.textContent = 'この心線を、この接続点から外す';
        if (view.selectedLink === linkId) {
          deleteButton(gUI, (p.x + bp.x) / 2, (p.y + bp.y) / 2, Math.max(9, hitR * 0.5),
            'dellink', linkId, 'この心線だけを接続点から外す');
        }
      });
      const info = Engine.bundleInfo(problem, state, b);
      const sel = view.selectedBundle === b.id;
      const conn = info.method === 'connector';
      const g = el('g', { class: 'bundle' }, gInner);
      if (sel) {
        const ring = el('circle', {
          cx: bp.x, cy: bp.y, r: 24, fill: 'none',
          stroke: '#0a6bd4', 'stroke-width': 2.5, 'stroke-dasharray': '5 4', opacity: .95,
          'pointer-events': 'none'
        }, g);
        el('animate', { attributeName: 'r', values: '21;27;21', dur: '1.6s', repeatCount: 'indefinite' }, ring);
      }
      el('circle', {
        cx: bp.x, cy: bp.y, r: Math.max(20, hitR * 0.9), fill: 'transparent',
        tabindex: '0', role: 'button', style: 'cursor:pointer',
        'aria-label': `接続点 ${info.count}本（${info.spec}）`
      }, g).dataset.bundle = b.id;
      const lone = info.count < 2;
      el('rect', {
        x: bp.x - (conn ? 23 : 15), y: bp.y - (conn ? 11 : 9),
        width: conn ? 46 : 30, height: conn ? 22 : 18, rx: conn ? 4 : 6,
        fill: conn ? '#e8eef5' : '#d9a441',
        stroke: sel ? '#0a6bd4' : lone ? '#e0362f' : conn ? '#5b6b7c' : '#8a6516',
        'stroke-width': sel ? 3 : lone ? 2.6 : 1.6,
        'stroke-dasharray': lone ? '4 3' : null
      }, g).dataset.bundle = b.id;
      text(g, bp.x, bp.y + .5, conn ? '差コネ' + (info.mark || '') : (info.mark || ''),
        { size: conn ? 8.5 : 11, weight: 700, fill: conn ? '#2b3640' : '#3a2a06' })
        .setAttribute('pointer-events', 'none');
    });

    lay.ends.forEach((p, k) => {
      const w = state.wires.find(x => x.id === p.wire);
      if (!w) return;
      const c = COLORS[w.color] || COLORS.black;
      const selected = view.selectedEnds.has(k);
      const bundled = state.bundles.some(b => b.ends.indexOf(k) >= 0);
      el('circle', {
        cx: p.x, cy: p.y, r: Math.max(11, hitR * 0.7), fill: 'transparent',
        class: 'end-dot', tabindex: '0', role: 'button',
        'aria-label': 'ボックス内の線端（' + (COLOR_LABEL[w.color] || '') + '）'
      }, gInner).dataset.end = k;
      const dot = el('circle', {
        cx: p.x, cy: p.y, r: selected ? 9 : 7,
        fill: c.stroke,
        stroke: selected ? '#0a6bd4' : bundled ? (c.edge || '#3a444f') : '#e0362f',
        'stroke-width': selected ? 3.5 : bundled ? 1.6 : 2.6,
        class: 'end-dot' + (selected ? ' is-selected' : '')
      }, gInner);
      dot.dataset.end = k;
      if (!bundled) {
        el('circle', {
          cx: p.x, cy: p.y, r: 13, fill: 'none',
          stroke: '#e0362f', 'stroke-width': 1.4, 'stroke-dasharray': '3 3', opacity: .8,
          'pointer-events': 'none'
        }, gInner);
      }
    });

    /* ---- 器具 ---- */
    problem.devices.forEach(d => {
      if (d.type === 'jointbox') return;
      drawDevice(gDev, problem, d, state, view, sim, fs);
    });

    /* ---- 端子 ---- */
    problem.devices.forEach(d => {
      (d.terminals || []).forEach(t => {
        const id = d.id + '.' + t.id;
        const x = d.x + t.dx, y = d.y + t.dy;
        const isPending = (view.pending && view.pending.k === 't' && view.pending.id === id) || view.pickTerm === id;
        const isHover = view.hover && view.hover.k === 't' && view.hover.id === id;
        const g = el('g', {
          class: 'term-hit', tabindex: '0', role: 'button',
          'aria-label': (Engine.terminalRef(problem, id) || {}).name || id
        }, gTerm);
        g.dataset.term = id;
        el('circle', { cx: x, cy: y, r: hitR, fill: 'transparent' }, g);
        const coreRuns = (view.pickedCores || []).map(it => {
          const r = Engine.runById(problem, String(it.slot).split('#')[0]);
          return r && (r.a === d.group || r.b === d.group) && !coreDone(state, it);
        });
        if (canReach(d.group) || coreRuns.some(Boolean)) {
          el('circle', {
            cx: x, cy: y, r: 15, fill: 'rgba(10,107,212,.16)',
            stroke: '#0a6bd4', 'stroke-width': 2, 'pointer-events': 'none'
          }, g);
        }
        const isN = !d.poleSwap && (t.kind === 'load-n' || t.kind === 'outlet-n' || t.kind === 'source-n' || t.kind === 'tb-n');
        const ring = isN ? '#0a6bd4' : '#3a444f';
        el('circle', {
          cx: x, cy: y, r: isPending || isHover ? 9.5 : 7.5,
          fill: isPending ? '#0a6bd4' : isN ? '#eaf3ff' : '#ffffff',
          stroke: isPending || isHover ? '#0a6bd4' : ring,
          'stroke-width': isN ? 3.2 : 2.4, class: 'term-dot'
        }, g);
        if (view.showLabels && t.short) {
          const dv = DIRV[t.labelDir || t.dir] || [0, 1];
          const lx = x + dv[0] * (hitR + 9), ly = y + dv[1] * (hitR + 8);
          const lbl = text(g, lx, ly, t.short, {
            size: fs(11.5), weight: 800, fill: isN ? '#0a6bd4' : '#48535f',
            anchor: dv[0] > 0 ? 'start' : dv[0] < 0 ? 'end' : 'middle'
          });
          lbl.setAttribute('class', 'term-label');
          lbl.dataset.tx = x; lbl.dataset.ty = y;
          lbl.setAttribute('paint-order', 'stroke');
          lbl.setAttribute('stroke', '#ffffff');
          lbl.setAttribute('stroke-width', String(fs(3.2)));
          lbl.setAttribute('stroke-linejoin', 'round');
        }
      });
    });

    // 範囲の判定は、拡大中でも元の作業エリア全体で行う（拡大範囲の外の文字を端へ寄せ集めない）
    const baseVB = problem.workspace.viewBox.split(/\s+/).map(Number);
    declutterBadges(svg, baseVB);
    if (view.showLabels) declutterTermLabels(svg, hitR);
    if (!view.viewBox) keepTextsInside(svg, baseVB);

    /* ---- 選択中の電線・接続点を消す × ボタン ---- */
    if (view.selectedWire) {
      const w = state.wires.find(x => x.id === view.selectedWire);
      const gmSel = w && w.slot ? geoms.get(w.slot) : null;
      if (w && gmSel && gmSel.type) {
        // ケーブルの心線：器具側の線の真ん中、なければケーブルの真ん中
        const tEp = [w.a, w.b].find(e => e.k === 't');
        let m = null;
        if (tEp) {
          const t = Engine.terminalRef(problem, tEp.id);
          const ex = t && coreExit(gmSel, t.device.group, w.color);
          if (t && ex) m = { x: (t.x + ex.x) / 2, y: (t.y + ex.y) / 2 };
        }
        if (!m) {
          const o = coreOffset(gmSel.type, w.color);
          m = {
            x: (gmSel.a.x + gmSel.b.x) / 2 + gmSel.px * o,
            y: (gmSel.a.y + gmSel.b.y) / 2 + gmSel.py * o
          };
        }
        deleteButton(gUI, m.x, m.y, Math.max(9, hitR * 0.55), 'delwire', w.id, 'この心線だけを消す');
      } else if (w) {
        const p0 = pointOf(problem, lay, w.a, w.id, 'a');
        const p1 = pointOf(problem, lay, w.b, w.id, 'b');
        if (!p0.missing && !p1.missing) {
          const m = wireMid(p0, p1);
          deleteButton(gUI, m.x, m.y, Math.max(13, hitR * 0.72), 'delwire', w.id, 'この電線を削除');
        }
      }
    }
    if (view.selectedBundle) {
      const bp = lay.bundles.get(view.selectedBundle);
      if (bp) {
        const r = Math.max(12, hitR * 0.62);
        deleteButton(gUI, bp.x + r * 1.9, bp.y - r * 1.9, r, 'delbundle', view.selectedBundle, 'この接続点をはずす');
      }
    }

    /* ---- 「接続する」ボタン（選んだ線端のそば） ---- */
    const selKeys = Array.from(view.selectedEnds).filter(k => lay.ends.has(k));
    const selBundlePos = view.selectedBundle ? lay.bundles.get(view.selectedBundle) : null;
    const nPick = (view.pickedCores || []).length;
    const nTotal = selKeys.length + nPick;
    const pickT = view.pickTerm ? Engine.terminalRef(problem, view.pickTerm) : null;
    if (pickT || nTotal >= (selBundlePos ? 1 : 2)) {
      const pts = [];
      if (pickT) {
        pts.push({ x: pickT.x, y: pickT.y });
      } else {
        selKeys.forEach(k => pts.push(lay.ends.get(k)));
        if (selBundlePos) pts.push(selBundlePos);
        if (!pts.length && view.pickBox) {
          const d = Engine.deviceOf(problem, view.pickBox);
          if (d) pts.push({ x: d.x, y: d.y - d.r * 0.4 });
        }
      }
      if (!pts.length) pts.push({ x: 0, y: 0 });
      const cx = pts.reduce((s2, p) => s2 + p.x, 0) / pts.length;
      const cy = pts.reduce((s2, p) => s2 + p.y, 0) / pts.length;
      const label = pickT ? 'ここに接続する'
        : selBundlePos ? `この接続点に追加（${nTotal}本）`
        : `接続する（${nTotal}本）`;
      const bfs = fs(12.5);
      const w = label.length * bfs * 0.95 + bfs * 2;
      const bh = bfs * 2.2;
      const by = cy - Math.max(46, bh * 1.7);
      const g = el('g', { class: 'connect-btn', style: 'cursor:pointer' }, gUI);
      g.dataset.connect = '1';
      el('rect', {
        x: cx - w / 2, y: by - bh / 2, width: w, height: bh, rx: bh / 2,
        fill: '#0a6bd4', stroke: '#ffffff', 'stroke-width': 2
      }, g);
      el('path', {
        d: `M ${cx - bh / 4} ${by + bh / 2} L ${cx} ${by + bh * 0.85} L ${cx + bh / 4} ${by + bh / 2} Z`,
        fill: '#0a6bd4', stroke: 'none'
      }, g);
      text(g, cx, by + 1, label, { size: bfs, weight: 700, fill: '#ffffff' })
        .setAttribute('pointer-events', 'none');
    }

    /* ---- 指摘のハイライト ---- */
    if (view.focus && view.focus.type === 'terminal') {
      const t = Engine.terminalRef(problem, view.focus.id);
      if (t) {
        const ring = el('circle', {
          cx: t.x, cy: t.y, r: 16, fill: 'none',
          stroke: '#e0362f', 'stroke-width': 4, opacity: .95
        }, gOver);
        el('animate', { attributeName: 'r', values: '14;30;14', dur: '1.1s', repeatCount: 'indefinite' }, ring);
        el('animate', { attributeName: 'opacity', values: '.95;.15;.95', dur: '1.1s', repeatCount: 'indefinite' }, ring);
      }
    }

    /* ---- 引きかけの線 ---- */
    if (view.pending) {
      const epPoint = (ep) => {
        if (!ep) return null;
        if (ep.k === 'jb') { const d = Engine.deviceOf(problem, ep.id); return d ? { x: d.x, y: d.y } : null; }
        const t = Engine.terminalRef(problem, ep.id);
        return t ? { x: t.x, y: t.y } : null;
      };
      const from = view.pending.k === 'jb'
        ? epPoint(view.pending)
        : view.pending.k === 'b'
          ? (lay.bundles.get(view.pending.id) || null)
          : view.pending.k === 'cable'
            ? (view.pending.from ? epPoint(view.pending.from) : (lastSlots.get(view.pending.key) || null))
            : epPoint(view.pending);
      if (from) {
        const c = COLORS[view.color] || COLORS.black;
        const cur = view.cursor || from;
        const d = `M ${from.x} ${from.y} L ${cur.x} ${cur.y}`;
        const gp = el('g', { id: 'preview-wire' }, gOver);
        gp.dataset.fx = from.x; gp.dataset.fy = from.y;
        el('path', {
          d, class: 'preview-edge', fill: 'none',
          stroke: c.edge || 'rgba(255,255,255,.65)', 'stroke-width': 8,
          'stroke-linecap': 'round', opacity: .9
        }, gp);
        el('path', {
          d, class: 'preview-main', fill: 'none',
          stroke: c.stroke, 'stroke-width': 4.5,
          'stroke-dasharray': '10 8', 'stroke-linecap': 'round'
        }, gp);
      }
    }
  }

  /* ---- 重なりの調整（スマホのように作業エリアが狭いときに効く。重なっていなければ何も動かさない） ---- */
  const bbOf = (el) => { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const overlapArea = (a, b) => {
    const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
    const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
    return x1 > x0 && y1 > y0 ? (x1 - x0) * (y1 - y0) : 0;
  };
  const laidOut = (el) => { try { const b = el.getBBox(); return !!(b && (b.width || b.height)); } catch (e) { return false; } };

  /* 札（ケーブル置き場の名前）が、文字・器具・端子・ほかの札と重なったら、近くの空いている所へずらす。
     引き出し線・当たり判定・✕ボタン・ポップアップの位置（lastSlots）も一緒に動かす */
  function declutterBadges(svg, vb) {
    const badges = Array.from(svg.querySelectorAll('g.slot-badge'));
    if (!badges.length || !laidOut(badges[0])) return;
    const obst = [];
    svg.querySelectorAll('text').forEach(t => {
      if (t.closest('.slot-badge') || !(t.textContent || '').trim()) return;
      obst.push(bbOf(t));
    });
    svg.querySelectorAll('rect, circle, ellipse').forEach(r => { if (r.getAttribute('stroke') === '#2b3640') obst.push(bbOf(r)); });
    svg.querySelectorAll('circle.term-dot').forEach(c => obst.push(bbOf(c)));
    // ボックスは縁にかかるのはよいが、深く入り込まないように（内側に縮めた四角を障害物にする）
    svg.querySelectorAll('rect.jb-body').forEach(r => {
      if (r.getAttribute('fill') === 'transparent') return;
      const b = bbOf(r), m = Math.min(b.w, b.h) * 0.22;
      obst.push({ x: b.x + m, y: b.y + m, w: b.w - 2 * m, h: b.h - 2 * m });
    });
    const placed = [];
    const areaOf = (g) => {   // 札の見える部分（四角と、下の長さの文字）
      const parts = [g.querySelectorAll('rect')[1]].concat(Array.from(g.querySelectorAll('text'))).filter(Boolean).map(bbOf);
      const x0 = Math.min.apply(null, parts.map(b => b.x)), y0 = Math.min.apply(null, parts.map(b => b.y));
      const x1 = Math.max.apply(null, parts.map(b => b.x + b.w)), y1 = Math.max.apply(null, parts.map(b => b.y + b.h));
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    };
    const cost = (b) => {
      let c = obst.concat(placed).reduce((n, o) => n + overlapArea(b, o), 0);
      if (b.x < vb[0] || b.y < vb[1] || b.x + b.w > vb[0] + vb[2] || b.y + b.h > vb[1] + vb[3]) c += 1e6;
      return c;
    };
    badges.forEach(g => {
      const cur = areaOf(g);
      const c0 = cost(cur);
      if (c0 <= 4) { placed.push(cur); return; }
      let best = { c: c0, dx: 0, dy: 0 };
      const sx = cur.w * 0.6, sy = cur.h * 0.75;
      [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -2], [0, 2], [-2, 0], [2, 0]].forEach(k => {
        const dx = k[0] * sx, dy = k[1] * sy;
        const c = cost({ x: cur.x + dx, y: cur.y + dy, w: cur.w, h: cur.h });
        if (c < best.c - 1) best = { c, dx, dy };
      });
      if (best.dx || best.dy) {
        const key = g.dataset.slot;
        // transform ではなく座標そのものを動かす（getBBox で後から正しい位置を測れるように）
        g.querySelectorAll('rect, text, circle').forEach(el => {
          const kx = el.tagName === 'circle' ? 'cx' : 'x', ky = el.tagName === 'circle' ? 'cy' : 'y';
          el.setAttribute(kx, +el.getAttribute(kx) + best.dx);
          el.setAttribute(ky, +el.getAttribute(ky) + best.dy);
        });
        const lead = svg.querySelector(`g.cable-slot:not(.slot-badge)[data-slot="${key}"] line[stroke-dasharray="4 4"]`);
        if (lead) {
          lead.setAttribute('x2', +lead.getAttribute('x2') + best.dx);
          lead.setAttribute('y2', +lead.getAttribute('y2') + best.dy);
        }
        const del = svg.querySelector(`[data-delslot="${key}"]`);
        if (del) del.setAttribute('transform', `translate(${best.dx} ${best.dy})`);
        const ls = lastSlots.get(key);
        if (ls) { ls.x += best.dx; ls.y += best.dy; }
      }
      placed.push({ x: cur.x + best.dx, y: cur.y + best.dy, w: cur.w, h: cur.h });
    });
  }

  /* 器具名・端子名などが作業エリアの左右の端からはみ出すときは、内側へ寄せる */
  function keepTextsInside(svg, vb) {
    const texts = Array.from(svg.querySelectorAll('text')).filter(t => !t.closest('.slot-badge') && !t.closest('.connect-btn'));
    if (!texts.length || !laidOut(texts[0])) return;
    texts.forEach(t => {
      if (t.closest('[transform]')) return;   // 回した図形の中の文字はさわらない
      const b = bbOf(t);
      let dx = 0;
      if (b.x < vb[0] + 2) dx = vb[0] + 2 - b.x;
      else if (b.x + b.w > vb[0] + vb[2] - 2) dx = vb[0] + vb[2] - 2 - (b.x + b.w);
      if (dx) t.setAttribute('x', +t.getAttribute('x') + dx);
    });
  }

  /* 端子名が、札・器具名・ほかの端子名と重なったら、端子のまわりの空いている側へ動かす。
     スマホのように作業エリアが狭いと、文字は画面上の大きさを保つので相対的に大きくなり重なりやすい。
     重なっていない名前は動かさない（タブレット以上の広さでは何も変わらない） */
  function declutterTermLabels(svg, hitR) {
    let labels;
    try {
      labels = Array.from(svg.querySelectorAll('text.term-label'));
      if (!labels.length) return;
      const pb = labels[0].getBBox();
      if (!pb || (!pb.width && !pb.height)) return;   // まだ画面に出ていない（非表示のタブなど）
    } catch (e) { return; }
    const box = (el) => { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const inter = (a, b) => {
      const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
      const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
      return x1 > x0 && y1 > y0 ? (x1 - x0) * (y1 - y0) : 0;
    };
    const obst = [];
    svg.querySelectorAll('text').forEach(t => {
      if (t.classList.contains('term-label') || !(t.textContent || '').trim()) return;
      obst.push(box(t));
    });
    svg.querySelectorAll('.slot-badge').forEach(g => { const r = g.querySelectorAll('rect')[1]; if (r) obst.push(box(r)); });
    svg.querySelectorAll('circle.term-dot').forEach(c => obst.push(box(c)));
    svg.querySelectorAll('rect, circle, ellipse').forEach(r => {
      if (r.getAttribute('stroke') === '#2b3640') obst.push(box(r));   // 器具の本体
    });
    const placed = [];
    const cost = (b) => obst.concat(placed).reduce((n, o) => n + inter(b, o), 0);
    labels.forEach(lbl => {
      const cur = box(lbl);
      const c0 = cost(cur);
      if (c0 <= 4) { placed.push(cur); return; }
      const x = +lbl.dataset.tx, y = +lbl.dataset.ty;
      let best = { c: c0, b: cur, pos: null };
      [[1, 0], [-1, 0], [0, -1], [0, 1]].forEach(dv => {
        const lx = x + dv[0] * (hitR + 9), ly = y + dv[1] * (hitR + 8);
        const anchor = dv[0] > 0 ? 'start' : dv[0] < 0 ? 'end' : 'middle';
        const bx = anchor === 'start' ? lx : anchor === 'end' ? lx - cur.w : lx - cur.w / 2;
        const b = { x: bx, y: ly - cur.h / 2, w: cur.w, h: cur.h };
        const c = cost(b);
        if (c < best.c - 1) best = { c, b, pos: { lx, ly, anchor } };
      });
      if (best.pos) {
        lbl.setAttribute('x', best.pos.lx); lbl.setAttribute('y', best.pos.ly);
        lbl.setAttribute('text-anchor', best.pos.anchor);
      }
      placed.push(best.b);
    });
  }

  /* 引きかけの線だけを更新する（毎回全描画しないため） */
  function updatePreview(svg, cursor) {
    const gp = svg.querySelector('#preview-wire');
    if (!gp) return false;
    const d = `M ${gp.dataset.fx} ${gp.dataset.fy} L ${cursor.x} ${cursor.y}`;
    gp.querySelectorAll('path').forEach(p => p.setAttribute('d', d));
    return true;
  }

  /* ---------------- 器具の絵 ---------------- */
  function drawDevice(g, problem, d, state, view, sim, fs) {
    fs = fs || (n => n);
    const lit = sim && sim.lit ? sim.lit[d.id] : false;

    switch (d.type) {
      case 'source': {
        // 電源そのものにスイッチが付いている（ここを押すと電気が流れる）
        const pw = state.power !== false;
        const bx0 = d.x - 80, bx1 = d.x + 42, by0 = d.y - 58, by1 = d.y + 58;
        const cx = (bx0 + bx1) / 2, bh = by1 - by0;
        el('rect', {
          x: bx0, y: by0, width: bx1 - bx0, height: bh, rx: 12,
          fill: '#eef3f9', stroke: pw ? '#12875a' : '#4a5762', 'stroke-width': pw ? 3.4 : 2.4
        }, g);
        // 電源 ／ 単相100V ／ スイッチ を等間隔に
        const row = bh / 4;
        text(g, cx, by0 + row, d.label, { size: fs(14), weight: 800 });
        text(g, cx, by0 + row * 2, d.note, { size: fs(10.5), fill: MUTED });

        const swY = by0 + row * 3, sw0 = cx - 48;
        const pg = el('g', { style: 'cursor:pointer' }, g);
        pg.dataset.power = '1';
        el('rect', {
          x: sw0, y: swY - 17, width: 96, height: 34, rx: 8,
          fill: pw ? '#dff6e8' : '#f1f3f6',
          stroke: pw ? '#12875a' : '#98a2ad', 'stroke-width': 2.4
        }, pg);
        el('rect', {
          x: pw ? sw0 + 50 : sw0 + 4, y: swY - 12, width: 42, height: 24, rx: 5,
          fill: pw ? '#12875a' : '#c3cbd4'
        }, pg);
        text(pg, pw ? sw0 + 71 : sw0 + 25, swY + 1, pw ? '入' : '切',
          { size: fs(12.5), weight: 800, fill: pw ? '#ffffff' : '#5c6773' })
          .setAttribute('pointer-events', 'none');
        text(pg, pw ? sw0 + 25 : sw0 + 71, swY + 1, pw ? 'ON' : 'OFF',
          { size: fs(9.5), weight: 800, fill: pw ? '#12875a' : '#98a2ad' })
          .setAttribute('pointer-events', 'none');
        const ttlP = el('title', {}, pg);
        ttlP.textContent = '電源スイッチ：クリックで入／切（通電の確認に使います）';
        break;
      }

      case 'ceiling': {
        if (d.round) {
          /* 丸形の引掛シーリング */
          if (lit) el('circle', { cx: d.x, cy: d.y, r: 52, fill: '#ffd45e', opacity: .55, filter: 'url(#glow)' }, g);
          el('circle', { cx: d.x, cy: d.y, r: 42, fill: lit ? '#fff4d0' : '#ffffff', stroke: '#2b3640', 'stroke-width': 2.6 }, g);
          el('circle', { cx: d.x, cy: d.y, r: 30, fill: 'none', stroke: '#b4bec8', 'stroke-width': 1.6 }, g);
          text(g, d.x, d.y - 1, '( )', { size: 20, weight: 600 });
          text(g, d.x, termsUp(d) ? d.y + 58 : d.y - 58, d.label, { size: fs(11), weight: 700, fill: '#55616e' });
          markBadge(g, d.x + 66, d.y - 18, d.mark);
          break;
        }
        if (lit) el('rect', { x: d.x - 80, y: d.y - 34, width: 160, height: 68, rx: 12, fill: '#ffd45e', opacity: .55, filter: 'url(#glow)' }, g);
        el('rect', { x: d.x - 75, y: d.y - 27, width: 150, height: 54, rx: 8, fill: lit ? '#fff4d0' : '#ffffff', stroke: '#2b3640', 'stroke-width': 2.6 }, g);
        text(g, d.x, d.y - 2, '( )', { size: 22, weight: 600 });
        // 端子が上に出ている（ケーブルが上から来る）ときは、名前を下に書く
        text(g, d.x, termsUp(d) ? d.y + 44 : d.y - 44, d.label, { size: fs(11), weight: 700, fill: '#55616e' });
        markBadge(g, d.x + 95, d.y, d.mark);
        break;
      }

      case 'lamp': {
        if (lit) el('circle', { cx: d.x, cy: d.y, r: 52, fill: '#ffd45e', opacity: .6, filter: 'url(#glow)' }, g);
        if (d.variant === 'outdoor') {
          // 屋外灯：かさを付けて区別する
          el('path', { d: `M ${d.x - 46} ${d.y - 30} L ${d.x - 22} ${d.y - 48} L ${d.x + 22} ${d.y - 48} L ${d.x + 46} ${d.y - 30} Z`,
            fill: '#e3e8ee', stroke: '#2b3640', 'stroke-width': 2.2 }, g);
        }
        el('circle', { cx: d.x, cy: d.y, r: 40, fill: lit ? '#fff4d0' : '#ffffff', stroke: '#2b3640', 'stroke-width': 2.6 }, g);
        el('circle', { cx: d.x, cy: d.y, r: 22, fill: 'none', stroke: '#8a939c', 'stroke-width': 2 }, g);
        text(g, d.x, d.y + 1, d.variant === 'outdoor' ? '屋外' : 'R', { size: d.variant === 'outdoor' ? 13 : 18, weight: 700 });
        text(g, d.x, termsUp(d) ? d.y + 58 : d.y - 58, d.label, { size: fs(11), weight: 700, fill: '#55616e' });
        markBadge(g, d.x + 62, d.y - 18, d.mark);
        break;
      }

      case 'fluorescent': {
        if (lit) el('rect', { x: d.x - 76, y: d.y - 28, width: 152, height: 56, rx: 14, fill: '#cfe9ff', opacity: .75, filter: 'url(#glow)' }, g);
        el('rect', { x: d.x - 66, y: d.y - 17, width: 46, height: 34, rx: 4, fill: lit ? '#eaf6ff' : '#fff', stroke: '#2b3640', 'stroke-width': 2.4 }, g);
        el('rect', { x: d.x + 20, y: d.y - 17, width: 46, height: 34, rx: 4, fill: lit ? '#eaf6ff' : '#fff', stroke: '#2b3640', 'stroke-width': 2.4 }, g);
        el('circle', { cx: d.x, cy: d.y, r: 22, fill: lit ? '#eaf6ff' : '#ffffff', stroke: '#2b3640', 'stroke-width': 2.6 }, g);
        text(g, d.x, d.y - 50, d.label, { size: fs(11), weight: 700, fill: '#55616e' });
        markBadge(g, d.x + 92, d.y, d.mark);
        break;
      }

      case 'terminal': {
        /* 端子台（配線用遮断器・タイムスイッチなどの代用）。
           contacts を持つ器具（タイムスイッチ等）は入／切できる */
        /* shape は groupShape と同じ rx / ry（中心からの半分の大きさ）で書く */
        const sp = d.shape || {};
        const w = (sp.rx || 75) * 2, h = (sp.ry || (d.terminals.length * 26 + 14)) * 2;
        const on = state.switches[d.id];
        const hasC = (Engine.contactsOf(d) || []).length > 0;
        if (lit) el('rect', { x: d.x - w / 2 - 8, y: d.y - h / 2 - 8, width: w + 16, height: h + 16, rx: 14,
          fill: '#ffd45e', opacity: .32, filter: 'url(#glow)' }, g);
        const body = el('rect', {
          x: d.x - w / 2, y: d.y - h / 2, width: w, height: h, rx: 8,
          fill: '#f3f5f8', stroke: '#2b3640', 'stroke-width': 2.6,
          style: hasC ? 'cursor:pointer' : null
        }, g);
        if (hasC) body.dataset.sw = d.id;
        if (d.stack) {
          /* 同じ端子台に積んだ器具（リモコンリレー3個＝6極の端子台など）は、外枠と名前を1回だけ描く */
          const sib = problem.devices.filter(x => x.type === 'terminal' && x.stack && x.group === d.group);
          if (sib[0] === d) {
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            sib.forEach(s => {
              const s2 = s.shape || {};
              const rx = s2.rx || 75, ry = s2.ry || (s.terminals.length * 26 + 14);
              x0 = Math.min(x0, s.x - rx); x1 = Math.max(x1, s.x + rx);
              y0 = Math.min(y0, s.y - ry); y1 = Math.max(y1, s.y + ry);
            });
            el('rect', { x: x0 - 9, y: y0 - 9, width: x1 - x0 + 18, height: y1 - y0 + 18, rx: 12,
              fill: 'none', stroke: '#2b3640', 'stroke-width': 2.2, 'pointer-events': 'none' }, g);
            text(g, (x0 + x1) / 2, y0 - 9 - fs(12), d.groupName || d.label, { size: fs(11), weight: 700, fill: '#55616e' });
          }
        } else {
          // 名前と補足の間は文字の大きさに合わせてあける（縮小表示では文字が相対的に大きくなる）
          text(g, d.x, d.y - h / 2 - (d.note ? 15 + fs(14) : 14), d.label, { size: fs(11), weight: 700, fill: '#55616e' });
          if (d.note) text(g, d.x, d.y - h / 2 - 15, d.note, { size: fs(10), weight: 700, fill: '#8a939c' });
        }
        const deco = el('g', { 'pointer-events': 'none' }, g);
        // 各極のねじと記号（端子の並びは dx / dy にそのまま従う）
        // 端子が横に並んでいるか（dx がばらけていれば横並び）
        const dxs = d.terminals.map(t => t.dx || 0);
        const horiz = Math.max.apply(null, dxs) - Math.min.apply(null, dxs) > 1;
        d.terminals.forEach(t => {
          const tx = d.x + (t.dx || 0), ty = d.y + (t.dy || 0);
          const ix = Math.max(d.x - w / 2 + 17, Math.min(d.x + w / 2 - 17, tx));
          const iy = Math.max(d.y - h / 2 + 17, Math.min(d.y + h / 2 - 17, ty));
          if (horiz) {
            el('rect', { x: ix - 26, y: d.y - h / 2 + 7, width: 52, height: h - 14, rx: 4,
              fill: '#ffffff', stroke: '#b4bec8', 'stroke-width': 1.6 }, deco);
          } else {
            el('rect', { x: d.x - w / 2 + 7, y: iy - 17, width: w - 14, height: 34, rx: 4,
              fill: '#ffffff', stroke: '#b4bec8', 'stroke-width': 1.6 }, deco);
          }
          el('circle', { cx: ix, cy: iy, r: 7.5,
            fill: '#dfe5ec', stroke: '#7b8794', 'stroke-width': 1.7 }, deco);
          const nx = horiz ? ix : (tx > d.x ? ix - 26 : ix + 26);
          const ny = horiz ? (ty > d.y ? iy - 24 : iy + 24) : iy + 1;
          text(deco, nx, ny, t.tbName || t.id, { size: Math.min(fs(12), 15), weight: 800, fill: '#2b3640' });
        });
        if (hasC) {
          const sl = d.switchLabels || {};
          const ks = on ? (sl.on || '入（接点ON）') : (sl.off || '切（接点OFF）');
          const kS = Math.min(fs(9.5), 12);
          const kw = Math.max(76, ks.length * kS * 0.98 + 14) / 2;
          const ky = d.y - h / 2 + (d.stack ? h / 2 : 22);
          const kx = d.stack ? d.x - w / 2 + kw + 10 : d.x;
          el('rect', { x: kx - kw, y: ky - 13, width: kw * 2, height: 26, rx: 6,
            fill: on ? '#d8f2e4' : '#eef1f5', stroke: on ? '#12875a' : '#b4bec8', 'stroke-width': 2 }, deco);
          text(deco, kx, ky + 1, ks,
            { size: kS, weight: 800, fill: on ? '#12875a' : '#7b8794' });
          const hit = el('rect', { x: kx - kw, y: ky - 13, width: kw * 2, height: 26, rx: 6,
            fill: 'transparent', style: 'cursor:pointer' }, g);
          hit.dataset.sw = d.id;
        }
        if (d.stack) markBadge(deco, d.x - w / 2 - 22, d.y, d.mark, 13);
        else markBadge(deco, d.x + w / 2 + 18, d.y - h / 2 + 22, d.mark, 13);
        break;
      }

      case 'breaker': {
        /* 配線用遮断器（2極1素子）。電源側は施工省略、負荷側の N・L に結線する */
        const pw = state.power !== false;
        el('rect', { x: d.x - 60, y: d.y - 50, width: 120, height: 100, rx: 8, fill: '#f3f5f8', stroke: '#2b3640', 'stroke-width': 2.6 }, g);
        const deco = el('g', { 'pointer-events': 'none' }, g);
        // レバー
        el('rect', { x: d.x - 40, y: d.y - 22, width: 26, height: 44, rx: 5, fill: '#ffffff', stroke: '#7b8794', 'stroke-width': 1.8 }, deco);
        el('rect', { x: d.x - 36, y: pw ? d.y - 18 : d.y + 2, width: 18, height: 16, rx: 3, fill: pw ? '#12875a' : '#9aa5b1' }, deco);
        text(deco, d.x - 27, d.y - 32, pw ? 'ON' : 'OFF', { size: 9.5, weight: 800, fill: pw ? '#12875a' : '#7b8794' });
        // 負荷側の端子のねじと記号
        d.terminals.forEach(t => {
          const ty = d.y + (t.dy || 0);
          el('circle', { cx: d.x + 34, cy: ty, r: 7.5, fill: '#dfe5ec', stroke: '#7b8794', 'stroke-width': 1.7 }, deco);
          text(deco, d.x + 14, ty + 1, t.tbName || t.id, { size: Math.min(fs(12), 15), weight: 800, fill: '#2b3640' });
        });
        text(g, d.x, d.y - 64, d.label, { size: fs(11), weight: 700, fill: '#55616e' });
        if (d.note) text(g, d.x, d.y + 64, d.note, { size: fs(10), weight: 700, fill: '#8a939c' });
        break;
      }

      case 'motor': {
        /* 電動機（三相200V）。施工省略で使う */
        if (lit) el('circle', { cx: d.x, cy: d.y, r: 52, fill: '#ffd45e', opacity: .5, filter: 'url(#glow)' }, g);
        el('circle', { cx: d.x, cy: d.y, r: 40, fill: lit ? '#fff4d0' : '#ffffff', stroke: '#2b3640', 'stroke-width': 2.6 }, g);
        text(g, d.x, d.y + 1, 'M', { size: 20, weight: 700 });
        text(g, d.x, d.y - 56, d.label, { size: fs(11), weight: 700, fill: '#55616e' });
        if (d.note) text(g, d.x, d.y + 58, d.note, { size: fs(10), weight: 700, fill: '#8a939c' });
        break;
      }

      case 'earth': {
        /* 接地極（D種接地）。施工省略 */
        el('line', { x1: d.x, y1: d.y - 26, x2: d.x, y2: d.y, stroke: '#1f9d55', 'stroke-width': 3.4 }, g);
        [40, 26, 13].forEach((wd, i) => el('line', {
          x1: d.x - wd / 2, y1: d.y + i * 11, x2: d.x + wd / 2, y2: d.y + i * 11,
          stroke: '#1f9d55', 'stroke-width': 3.4, 'stroke-linecap': 'round'
        }, g));
        // 端子が上にあるときは、名前を下に書く
        text(g, d.x, termsUp(d) ? d.y + 44 : d.y - 40, d.label, { size: fs(11), weight: 700, fill: '#55616e' });
        break;
      }

      case 'outlet': {
        /* コンセント（常時通電）。左の差込口が長い方＝接地側（W） */
        if (lit) el('rect', { x: d.x - 66, y: d.y - 42, width: 132, height: 84, rx: 14, fill: '#ffd45e', opacity: .38, filter: 'url(#glow)' }, g);
        const exposed = d.variant === 'exposed';
        const hasE = (d.terminals || []).some(t => t.kind === 'earth');
        el('rect', {
          x: d.x - 56, y: d.y - 33, width: 112, height: 66, rx: exposed ? 22 : 9,
          fill: lit ? '#fff8e6' : exposed ? '#f6f3ea' : '#ffffff', stroke: '#2b3640', 'stroke-width': 2.6
        }, g);
        if (exposed) {
          // 露出形：丸みのある箱（カバーの中に差込口）
          el('ellipse', { cx: d.x, cy: d.y, rx: 40, ry: 25, fill: '#ffffff', stroke: '#9aa5b1', 'stroke-width': 1.8 }, g);
        }
        const sy = hasE ? -6 : 0;
        el('rect', { x: d.x - 24, y: d.y - 17 + sy, width: 9, height: hasE ? 28 : 34, rx: 2, fill: '#2b3640' }, g);
        el('rect', { x: d.x + 15, y: d.y - 12 + sy, width: 9, height: hasE ? 20 : 24, rx: 2, fill: '#2b3640' }, g);
        if (hasE) {
          // 接地極の差込口（U字）
          el('path', { d: `M ${d.x - 6} ${d.y + 11} v 5 a 6 6 0 0 0 12 0 v -5`, fill: 'none', stroke: '#1f9d55', 'stroke-width': 3.2, 'stroke-linecap': 'round' }, g);
        }
        // 器具の中の文字は、縮小表示でも器具からはみ出さない大きさまでにする
        text(g, d.x - 19, d.y + 26, 'W', { size: Math.min(fs(9.5), 12), weight: 800, fill: '#0a6bd4' });
        text(g, d.x, d.y - 44, d.label, { size: fs(11), weight: 700, fill: '#55616e' });
        // 補足（「接地極付・200V」など）は名前の上に。器具の中に書くと縮小表示ではみ出す
        if (d.note) text(g, d.x, d.y - 44 - fs(14), d.note, { size: fs(10), weight: 700, fill: '#8a939c' });
        break;
      }

      case 'pilot': {
        /* 確認表示灯（パイロットランプ）。常時点灯なので電源が入っていれば光る */
        if (lit) el('circle', { cx: d.x, cy: d.y, r: 40, fill: '#8fe36b', opacity: .6, filter: 'url(#glow)' }, g);
        el('rect', {
          x: d.x - 52, y: d.y - 28, width: 104, height: 56, rx: 9,
          fill: '#ffffff', stroke: '#2b3640', 'stroke-width': 2.6
        }, g);
        el('circle', {
          cx: d.x, cy: d.y, r: 15,
          fill: lit ? '#79d94f' : '#e3e8ee', stroke: '#7b8794', 'stroke-width': 1.8
        }, g);
        text(g, d.x, d.y - 42, d.label, { size: fs(11), weight: 700, fill: '#55616e' });
        if (d.note) text(g, d.x, d.y + 40, d.note, { size: fs(10), weight: 700, fill: lit ? '#12875a' : '#8a939c' });
        break;
      }

      case 'switch': {
        const on = state.switches[d.id];
        if (d.positions) {
          /* 3路・4路スイッチ：位置ごとに、どの端子どうしがつながるかを線で見せる */
          const body3 = el('rect', { x: d.x - 70, y: d.y - 34, width: 140, height: 68, rx: 9, fill: '#ffffff', stroke: '#2b3640', 'stroke-width': 2.6, style: 'cursor:pointer' }, g);
          body3.dataset.sw = d.id;
          const deco = el('g', { 'pointer-events': 'none' }, g);
          const ip = {};
          d.terminals.forEach(t => { ip[t.id] = { x: d.x + t.dx * 0.62, y: d.y + t.dy * 0.8 }; });
          // 端子から中の接点までの引き出し
          d.terminals.forEach(t => {
            const p = ip[t.id], ex = d.x + Math.sign(t.dx || 1) * 70;
            el('line', { x1: p.x, y1: p.y, x2: ex, y2: d.y + t.dy, stroke: '#9aa5b1', 'stroke-width': 2 }, deco);
          });
          const pos = Engine.positionsOf(d);
          const drawPairs = (pairs, attrs) => (pairs || []).forEach(pr => {
            const p = ip[pr[0]], q = ip[pr[1]];
            if (p && q) el('line', Object.assign({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, 'stroke-linecap': 'round' }, attrs), deco);
          });
          pos.forEach((pairs, i) => {
            if (i !== (on ? 1 : 0)) drawPairs(pairs, { stroke: '#c9d1da', 'stroke-width': 2, 'stroke-dasharray': '3 4' });
          });
          drawPairs(pos[on ? 1 : 0], { stroke: '#12875a', 'stroke-width': 4 });
          d.terminals.forEach(t => {
            const p = ip[t.id];
            el('circle', { cx: p.x, cy: p.y, r: 4.5, fill: '#2b3640' }, deco);
            text(deco, p.x + (t.dx < 0 ? 11 : -11), p.y + (t.dy > 0 ? 9 : t.dy < 0 ? -9 : -10), t.tbName || t.id,
              { size: 10, weight: 800, fill: '#55616e' });
          });
          const kind = d.variant === '4way' ? '4路' : '3路';
          const inS = Math.min(fs(10), 13);   // 本体の中の文字（はみ出さない大きさまで）
          text(deco, d.x, d.y - 24, kind + (d.note ? '・' + d.note : ''), { size: inS, weight: 800, fill: '#55616e' });
          const pl = (d.posLabels || [])[on ? 1 : 0];
          if (pl) text(deco, d.x, d.y + 25, pl, { size: inS, weight: 800, fill: '#12875a' });
          markBadge(deco, d.x - 70, d.y - 34, d.mark, 12);
          break;
        }
        const body = el('rect', { x: d.x - 70, y: d.y - 28, width: 140, height: 56, rx: 9, fill: '#ffffff', stroke: '#2b3640', 'stroke-width': 2.6, style: 'cursor:pointer' }, g);
        body.dataset.sw = d.id;
        const knobBg = el('rect', {
          x: d.x - 30, y: d.y - 17, width: 74, height: 34, rx: 6,
          fill: on ? '#d8f2e4' : '#eef1f5', stroke: on ? '#12875a' : '#b4bec8', 'stroke-width': 2,
          style: 'cursor:pointer'
        }, g);
        knobBg.dataset.sw = d.id;
        /* ここから上の飾りは、タップがスイッチ本体に届くように当たり判定を持たせない
           （持たせると「ON」の文字などが真ん中を覆って、押しても切り替わらなくなる） */
        const deco = el('g', { 'pointer-events': 'none' }, g);
        el('circle', { cx: d.x + (on ? 28 : -14), cy: d.y, r: 12, fill: on ? '#12875a' : '#9aa5b1' }, deco);
        text(deco, d.x + (on ? -8 : 24), d.y + 1, on ? 'ON' : 'OFF', { size: 10, weight: 800, fill: on ? '#12875a' : '#7b8794' });
        markBadge(deco, d.x - 52, d.y, d.mark, 13);
        if (d.variant === 'pilot') {
          const pilotOn = sim && sim.pilots ? sim.pilots[d.id] : false;
          if (pilotOn) el('circle', { cx: d.x + 58, cy: d.y - 16, r: 11, fill: '#8fe36b', opacity: .8, filter: 'url(#glow)' }, deco);
          el('circle', {
            cx: d.x + 58, cy: d.y - 16, r: 6,
            fill: pilotOn ? '#79d94f' : '#e3e8ee', stroke: '#7b8794', 'stroke-width': 1.4
          }, deco);
          text(deco, d.x + 58, d.y + 14, 'H', { size: 10, weight: 800, fill: '#12875a' });
        }
        break;
      }
    }
  }

  /* 端子がすべて器具の上側にあって上向き（ケーブルが上から来る）か。そのときは名前を下に書く */
  function termsUp(d) {
    const ts = d.terminals || [];
    return ts.length > 0 && ts.every(t => (t.dy || 0) < 0 && t.dir === 'up');
  }

  function markBadge(g, x, y, mark, r) {
    if (!mark) return;
    const rr = r || 14;
    el('circle', { cx: x, cy: y, r: rr, fill: '#1d2732' }, g);
    text(g, x, y + .5, mark, { size: rr, weight: 700, fill: '#ffffff' });
  }

  window.Render = {
    slots: () => lastSlots, drawSingleLine, drawWorkspace, updatePreview, layout, COLORS };
})();
