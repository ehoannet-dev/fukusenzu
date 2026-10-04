/* 開発用：作業エリアの文字・札・器具・端子の重なりを調べる（ブラウザで読み込んで使う）
   使い方（開発サーバーで開いたページのコンソール）：
     const s = document.createElement('script'); s.src = 'tools/overlap-browser.js'; document.head.appendChild(s);
     await __runAll(['no1', 'no2'])   // 問題ごとに「空の状態」と「正解を表示した状態」を調べる */
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

  window.__ov = check;
  window.__runAll = runAll;
})();
