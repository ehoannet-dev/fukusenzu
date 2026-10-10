/* 開発用：作業エリアの文字・札・器具・端子の重なりを調べる（ブラウザで読み込んで使う）
   使い方（開発サーバーで開いたページのコンソール）：
     const s = document.createElement('script'); s.src = 'tools/overlap-browser.js'; document.head.appendChild(s);
     await __runAll(['no1', 'no2'])   // 問題ごとに「空の状態」と「正解を表示した状態」を調べる
     await __uiAll(['no1', 'no2'])    // ↑に加えて、画面の部品（HTML）の重なり・切れ・押しにくさと、作業エリアの画面上の実寸も（2026-10-10）
   PWA の Service Worker が古い版を返すので、差し込む前に caches を全部消す（docs/作り方と注意点.md 21.5） */
(function () {
  'use strict';
  function check() {
    const svg = document.querySelector('#workspace');
    const bb = (el) => { try { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; } catch (e) { return null; } };
    const inter = (a, b, pad) => {
      pad = pad || 0;
      const x0 = Math.max(a.x + pad, b.x + pad), x1 = Math.min(a.x + a.w - pad, b.x + b.w - pad);
      const y0 = Math.max(a.y + pad, b.y + pad), y1 = Math.min(a.y + a.h - pad, b.y + b.h - pad);
      return x1 > x0 && y1 > y0 ? (x1 - x0) * (y1 - y0) : 0;
    };
    const contains = (a, b) => b.x >= a.x - 1 && b.y >= a.y - 1 && b.x + b.w <= a.x + a.w + 1 && b.y + b.h <= a.y + a.h + 1;
    // ボックス（大きい破線の四角）は、中心が中に入ったときだけ重なりとみなす
    const deepIn = (box, o) => {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2, m = 12;
      return cx > box.x + m && cx < box.x + box.w - m && cy > box.y + m && cy < box.y + box.h - m;
    };
    const texts = [], bodies = [], badges = [], dots = [];
    svg.querySelectorAll('text').forEach(t => {
      if (!(t.textContent || '').trim()) return;
      const b = bb(t); if (!b || !b.w) return;
      // 器具の角に付けた丸い記号（イ・ロ など）は、器具との重なりを数えない
      const isMark = t.previousSibling && t.previousSibling.tagName === 'circle' &&
        t.previousSibling.getAttribute('fill') === '#1d2732';
      texts.push(Object.assign(b, { t: t.textContent.trim(), badge: t.closest('.slot-badge'), isMark }));
    });
    svg.querySelectorAll('rect, circle, ellipse').forEach(r => {
      const st = r.getAttribute('stroke'), sw = r.getAttribute('stroke-width');
      if (st === '#2b3640' && (sw === '2.6' || sw === '2.2')) { const b = bb(r); if (b) bodies.push(Object.assign(b, { tag: r.tagName })); }
      if (r.classList.contains('jb-body') && r.getAttribute('fill') !== 'transparent') { const b = bb(r); if (b) bodies.push(Object.assign(b, { tag: 'jb', jb: true })); }
      if (r.classList.contains('term-dot')) { const b = bb(r); if (b) dots.push(Object.assign(b, { id: r.parentNode.dataset.term })); }
    });
    svg.querySelectorAll('g.slot-badge').forEach(g => {
      const r = g.querySelectorAll('rect')[1]; if (!r) return;
      const b = bb(r); if (b) badges.push(Object.assign(b, { g, key: g.dataset.slot }));
    });
    const out = [];
    const nm = (o) => o.t ? '「' + o.t + '」' : o.key ? '[札 ' + o.key + ']' : o.id ? '(端子 ' + o.id + ')' : '<' + o.tag + ' ' + Math.round(o.x) + ',' + Math.round(o.y) + '>';
    const hitBody = (o, b, min) => b.jb ? deepIn(b, o) : inter(o, b, 1) > min;
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (a.badge && a.badge === b.badge) continue;
      if (inter(a, b, 1) > 4 && !contains(a, b) && !contains(b, a)) out.push('文字×文字 ' + nm(a) + ' ' + nm(b));
    }
    texts.forEach(t => bodies.forEach(b => {
      if (t.badge || t.isMark) return;
      if (hitBody(t, b, 4) && !contains(b, t)) out.push('文字×器具 ' + nm(t) + ' ' + nm(b));
    }));
    badges.forEach(bd => {
      texts.forEach(t => { if (t.badge !== bd.g && inter(bd, t, 1) > 4) out.push('札×文字 ' + nm(bd) + ' ' + nm(t)); });
      bodies.forEach(b => { if (hitBody(bd, b, 4)) out.push('札×器具 ' + nm(bd) + ' ' + nm(b)); });
      dots.forEach(d => { if (inter(bd, d, 0) > 0) out.push('札×端子 ' + nm(bd) + ' ' + nm(d)); });
    });
    for (let i = 0; i < badges.length; i++) for (let j = i + 1; j < badges.length; j++) {
      if (inter(badges[i], badges[j], 0) > 0) out.push('札×札 ' + nm(badges[i]) + ' ' + nm(badges[j]));
    }
    texts.forEach(t => dots.forEach(d => { if (!t.badge && inter(t, d, 1) > 2) out.push('文字×端子 ' + nm(t) + ' ' + nm(d)); }));
    const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    texts.concat(badges).forEach(o => {
      if (o.x < vb[0] - 1 || o.y < vb[1] - 1 || o.x + o.w > vb[0] + vb[2] + 1 || o.y + o.h > vb[1] + vb[3] + 1) out.push('はみ出し ' + nm(o));
    });
    return { n: out.length, cssW: svg.clientWidth, list: Array.from(new Set(out)).slice(0, 60) };
  }

  async function runAll(ids) {
    const sel = document.querySelector('#problem-select');
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const res = {};
    for (const id of ids) {
      sel.value = id; sel.dispatchEvent(new Event('change'));
      await wait(120);
      const e = check();
      document.querySelector('#btn-answer').click();
      await wait(150);
      const a = check();
      document.querySelector('#btn-answer').click();
      await wait(80);
      res[id] = { empty: e.n, answer: a.n, cssW: e.cssW,
        list: e.list.map(s => '空:' + s).concat(a.list.filter(s => e.list.indexOf(s) < 0).map(s => '答:' + s)).slice(0, 40) };
    }
    return res;
  }

  /* ---- 画面の部品（HTML）の重なり・切れ・はみ出し・小ささ（スマホ縦・横の確認用。2026-10-10） ----
     await __uiAll(['no1', …]) → 問題ごとに { ui:{n,list}, ws:{作業エリアの実寸}, ov:{空,正解} }
     __ui() だけでも今の画面を調べられる。数える基準：
       重なり … 別々の部品（ボタン・見出し・チップ・パネルの行など）の見えている部分が重なる
       切れ   … 部品の一部が、親のスクロール枠・隠し枠の外に出て見えない（横スクロールの途中で切れて見えるのも数える）
       はみ出し … 画面の左右の外に出る（ページ全体の横スクロールも数える）
       小さい … 押す部品の高さか幅が minTap（既定 32px）未満、文字が minFont（既定 10px）未満 */
  const UI_ATOMS = [
    '.topbar h1', '.topbar .field > span', '#problem-select', '.topbar-actions .btn', '.card-title', '.hint-text',
    '.mb-title', '.btn-cut', '.cable-chip', '.cut-empty', '.mb-actions .btn', '.stage', '.ws-tools .btn', '.statusbar',
    '.score-ring', '.score-label', '.issues li', '.copy-issues', '.jb-head', '.jb-sub', '.end-row', '.jb-actions .btn',
    '.pt-head', '.pt-members li', '.pt-tools .btn', '.bundle-empty', '.steps li', '#btn-hint', '#core-picker .cp-head',
    '#core-picker .cp-core', '#core-picker .cp-del', '#core-picker .cp-foot .btn', '#core-picker .cp-note'
  ].join(',');
  function ui(opts) {
    const o = opts || {};
    const minTap = o.minTap || 32, minFont = o.minFont || 10;
    const W = window.innerWidth;
    const shown = (el) => {
      for (let p = el, c = null; p && p !== document.body; c = p, p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
        if (p.hidden) return false;
        // たたんだ <details> の中身（summary 以外）は見えていない
        if (p.tagName === 'DETAILS' && !p.open && c && c.tagName !== 'SUMMARY') return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    // 親のスクロール枠・隠し枠で切り取られた、見えている部分
    // cut: 横に切れる（隠し枠でもスクロール枠でも）か、縦に隠し枠で切れる。縦スクロールの途中で切れて見えるのはふつうなので数えない
    const visRect = (el) => {
      const r = el.getBoundingClientRect();
      let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom, sx = false, hy0 = r.top, hy1 = r.bottom;
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.display === 'contents') continue;
        const q = p.getBoundingClientRect();
        const scrollX = p.scrollWidth > p.clientWidth + 1;
        if (cs.overflowX !== 'visible') { x0 = Math.max(x0, q.left); x1 = Math.min(x1, q.right); if (scrollX && cs.overflowX !== 'hidden' && cs.overflowX !== 'clip') sx = true; }
        if (cs.overflowY !== 'visible') {
          y0 = Math.max(y0, q.top); y1 = Math.min(y1, q.bottom);
          if (cs.overflowY === 'hidden' || cs.overflowY === 'clip') { hy0 = Math.max(hy0, q.top); hy1 = Math.min(hy1, q.bottom); }
        }
      }
      const seenW = Math.max(0, x1 - x0), seenHH = Math.max(0, hy1 - hy0);
      const cut = (seenW > 0 && seenW < r.width * 0.97) || (seenHH > 0 && seenHH < r.height * 0.97);
      return { x0, y0, x1, y1, r, sx, cut };
    };
    const label = (el) => {
      const t = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18);
      return (el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]) + (t ? '「' + t + '」' : '');
    };
    const atoms = Array.from(document.querySelectorAll(UI_ATOMS)).filter(shown);
    const out = [];
    const recs = atoms.map(el => ({ el, v: visRect(el) }));
    for (let i = 0; i < recs.length; i++) for (let j = i + 1; j < recs.length; j++) {
      const a = recs[i], b = recs[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.v.x1, b.v.x1) - Math.max(a.v.x0, b.v.x0);
      const h = Math.min(a.v.y1, b.v.y1) - Math.max(a.v.y0, b.v.y0);
      if (w > 1.5 && h > 1.5 && w * h > 6) out.push('重なり ' + label(a.el) + ' × ' + label(b.el));
    }
    recs.forEach(({ el, v }) => {
      if (el.classList.contains('stage')) return;
      if (v.cut) out.push('切れ ' + label(el) + (v.sx ? '（横スクロールの途中）' : ''));
      else if (v.x1 - v.x0 <= 0 && v.sx) return;   // 横スクロールの先にまるごと隠れている（スクロールすれば見える）
      else if (v.r.right > W + 1 || v.r.left < -1) out.push('はみ出し ' + label(el));
    });
    if (document.documentElement.scrollWidth > W + 1) out.push('はみ出し ページ全体が横にスクロールする（' + document.documentElement.scrollWidth + 'px）');
    // 問題の選択肢の文字が欄に収まっているか
    const sel = document.querySelector('#problem-select');
    if (sel && shown(sel)) {
      const c = document.createElement('canvas').getContext('2d');
      const cs = getComputedStyle(sel);
      c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const txt = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
      if (c.measureText(txt).width > sel.clientWidth - 34) out.push('切れ #problem-select（問題名が途中まで）');
    }
    const small = [];
    document.querySelectorAll('button, a.btn, select, .cable-chip[role=button], summary').forEach(el => {
      if (!shown(el) || el.closest('svg')) return;
      const r = el.getBoundingClientRect();
      if (r.height < minTap || r.width < minTap) small.push('押しにくい ' + label(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    });
    const tiny = new Set();
    document.querySelectorAll('body *').forEach(el => {
      if (el.closest('svg') || !Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())) return;
      if (!shown(el)) return;
      const f = parseFloat(getComputedStyle(el).fontSize);
      // font-size:0 は文字を隠すための指定（スマホの📷🎁ボタン）なので数えない
      if (f > 0 && f < minFont) tiny.add('文字が小さい ' + label(el) + ' ' + f + 'px');
    });
    const list = Array.from(new Set(out));
    return { n: list.length, list, small: small.length, smallList: small.slice(0, 30), tiny: tiny.size, tinyList: Array.from(tiny).slice(0, 20) };
  }

  /* 作業エリアの、画面上の実寸（文字の大きさ・端子の当たり判定の直径など、px） */
  function wsMetrics() {
    const svg = document.querySelector('#workspace');
    const m = svg.getScreenCTM();
    const s = m ? m.a : 0;
    const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const fsz = Array.from(svg.querySelectorAll('text')).filter(t => (t.textContent || '').trim())
      .map(t => parseFloat(t.getAttribute('font-size') || '0') * s).filter(x => x > 0).sort((a, b) => a - b);
    const hit = svg.querySelector('g.term-hit circle');
    const dot = svg.querySelector('circle.term-dot');
    const st = document.querySelector('.stage').getBoundingClientRect();
    const r1 = (x) => Math.round(x * 10) / 10;
    return {
      stage: Math.round(st.width) + '×' + Math.round(st.height), svg: svg.clientWidth + '×' + svg.clientHeight,
      drawn: Math.round(vb[2] * s) + '×' + Math.round(vb[3] * s),
      fontMin: r1(fsz[0] || 0), fontMed: r1(fsz[Math.floor(fsz.length / 2)] || 0),
      termHit: hit ? r1(2 * hit.getAttribute('r') * s) : 0, termDot: dot ? r1(2 * dot.getAttribute('r') * s) : 0
    };
  }

  async function uiAll(ids, opts) {
    const sel = document.querySelector('#problem-select');
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const res = {};
    for (const id of ids) {
      sel.value = id; sel.dispatchEvent(new Event('change'));
      await wait(150);
      const u = ui(opts), w = wsMetrics(), e = check();
      document.querySelector('#btn-answer').click();
      await wait(150);
      const a = check(), ua = ui(opts);
      document.querySelector('#btn-answer').click();
      await wait(80);
      res[id] = { ui: u.n, uiAns: ua.n, small: u.small, tiny: u.tiny, ws: w, ovEmpty: e.n, ovAns: a.n,
        uiList: u.list.concat(ua.list.filter(s => u.list.indexOf(s) < 0).map(s => '答:' + s)).slice(0, 30),
        ovList: e.list.map(s => '空:' + s).concat(a.list.filter(s => e.list.indexOf(s) < 0).map(s => '答:' + s)).slice(0, 30) };
    }
    return res;
  }

  window.__ov = check;
  window.__runAll = runAll;
  window.__ui = ui;
  window.__ws = wsMetrics;
  window.__uiAll = uiAll;
})();
