/* 開発用：タップ操作だけで「ケーブルを切る → 置く → 心線を端子へ → ボックスで接続 → 渡り線 → 採点」を通す
   使い方（開発サーバーで開いたページのコンソール）：
     const s = document.createElement('script'); s.src = 'tools/e2e-browser.js'; document.head.appendChild(s);
     await __e2e('no6')          // → { score, passed, issues, log }
     await __e2eAll(['no1', 'no2'])
     await __e2eAll(['no1'], { real: true })   // 画面に見えている場所をたたく（ほかの部品に隠れていたら ✗ 隠れていて押せない）
     await __e2e('no13', { stopAfter: 'place' })   // 途中で止める（'place' | 'terminals' | 'bundles'、termLimit: n）
   画面のボタン・札・端子に click を送るだけで、アプリの内部関数は呼ばない（利用者と同じ操作）。 */
(function () {
  'use strict';
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  let clickRaw = (el) => el && el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  let click = clickRaw;
  /* real:true のときは、本物の指と同じく「画面に見えている場所」をたたく：要素を画面に出し（横スクロールの枠の中も）、
     中心の点にいちばん上にある要素へ click を送る。ほかの部品が上に重なっていれば、そちらに当たって失敗する（2026-10-10） */
  const KEY = '[data-term],[data-slot],[data-connect],[data-cp],[data-roll],[data-piece],button,a';
  const sig = (e) => { const k = e && e.closest(KEY); return k ? k.outerHTML.slice(0, 160) + '|' + (k.dataset ? JSON.stringify(k.dataset) : '') : null; };
  async function tapReal(el, log) {
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    await wait(40);
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    const k0 = el.closest(KEY);
    const ok = top && (top === el || el.contains(top) || (k0 && top.closest(KEY) === k0) || sig(top) === sig(el));
    if (!ok) log.push('✗ 隠れていて押せない：' + (k0 ? k0.outerHTML.slice(0, 90) : el.tagName) + ' ← 上にあるもの：' + (top ? (top.outerHTML || top.tagName).slice(0, 90) : 'なし'));
    const opt = { bubbles: true, cancelable: true, clientX: x, clientY: y };
    const tgt = top || el;
    tgt.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ pointerType: 'touch' }, opt)));
    window.dispatchEvent(new PointerEvent('pointerup', Object.assign({ pointerType: 'touch' }, opt)));
    tgt.dispatchEvent(new MouseEvent('click', opt));
  }

  async function e2e(id, opts) {
    const o = opts || {};
    const log = [];
    click = o.real ? (el) => tapReal(el, log) : clickRaw;
    const P = window.PROBLEMS.find(p => p.id === id);
    const fail = (m) => { log.push('✗ ' + m); };
    const sel = $('#problem-select');
    sel.value = id; sel.dispatchEvent(new Event('change'));
    await wait(80);
    // まっさらにする（2回押し）。スマホの幅では見出しの「1からやり直す」は隠れているので、見えているものを押す
    const resetBtn = ['#btn-reset', '#btn-reset3', '#btn-reset2'].map(s => $(s)).find(b => b && b.offsetParent !== null) || $('#btn-reset');
    if (resetBtn) { await click(resetBtn); await wait(20); await click(resetBtn); await wait(40); }

    const dev = (did) => P.devices.find(d => d.id === did);
    const groupOf = (ep) => { const d = dev(String(ep).split('.')[0]); return d ? d.group : null; };
    const runFor = (ga, gb) => P.runs.find(r => (r.a === ga && r.b === gb) || (r.a === gb && r.b === ga));
    const needs = (run) => { const a = [].concat(run.need || []); return Array.from({ length: run.slots || 0 }, (_, i) => a.length > 1 ? a[i] : a[0]); };

    /* ---- ① 切る → ② 置く（区間の置き場ごとに1本ずつ） ---- */
    for (const run of P.runs) {
      if (!run.slots) continue;
      const nd = needs(run);
      for (let i = 0; i < run.slots; i++) {
        const type = nd[i];
        const chip = $(`#materials [data-roll="${type}"]`);
        if (!chip) { fail(`支給ケーブル ${type} が無い`); continue; }
        if (!chip.classList.contains('is-picked')) { await click(chip); await wait(10); }
        await click($('#btn-cut')); await wait(10);
        const rb = $$('#core-picker [data-cp="cutrun"]').find(b => b.dataset.key.split('#')[0] === run.id);
        if (!rb) { fail(`切る区間に ${run.id} が出ない`); await click($('#core-picker [data-cp="close"]')); continue; }
        await click(rb); await wait(10);
        const lb = $$('#core-picker [data-cp="cutlen"]').find(b => +b.dataset.len === run.cut);
        if (!lb) { fail(`${run.id} の長さの選択肢に ${run.cut} が無い`); await click($('#core-picker [data-cp="close"]')); continue; }
        await click(lb); await wait(10);
        const badge = $(`#workspace g.slot-badge[data-slot="${run.id}#${i}"]`);
        if (!badge) { fail(`札 ${run.id}#${i} が無い`); continue; }
        await click(badge); await wait(10);
        const pb = $$('#core-picker [data-cp="pick"]');
        if (pb.length !== 1) { fail(`${run.id}#${i}：置けるケーブルが ${pb.length} 本`); }
        if (pb[0]) { await click(pb[0]); await wait(10); }
      }
    }
    // 札を閉じる
    const close = $('#core-picker [data-cp="close"]'); if (close) await click(close);
    // 途中で止める（画面の確認・スクリーンショット用）：stopAfter 'place' | 'terminals' | 'bundles'、termLimit＝端子への接続を n 本で止める
    if (o.stopAfter === 'place') return { id, partial: 'place', log };

    /* ---- 模範解答の電線に、置き場（slot）と心線の色を割り当てる ---- */
    const aw = P.answer.wires.map(w => Object.assign({}, w));
    const cnt = {};
    aw.forEach(w => { const k = w.a + '|' + w.b; cnt[k] = (cnt[k] || 0) + 1; });
    const used = {};
    aw.forEach(w => {
      const k = w.a + '|' + w.b;
      w.key = cnt[k] > 1 ? k + ':' + w.color : k;
      const run = runFor(groupOf(w.a), groupOf(w.b));
      w.run = run;
      if (!run || !run.slots) { w.jumper = true; return; }
      const nd = needs(run);
      for (let i = 0; i < run.slots; i++) {
        const t = window.CABLE_TYPES[nd[i]];
        const sk = run.id + '#' + i;
        used[sk] = used[sk] || {};
        if (t && t.cores.indexOf(w.color) >= 0 && !used[sk][w.color]) { used[sk][w.color] = true; w.slot = sk; break; }
      }
      if (!w.slot) fail(`${w.key} の心線を割り当てられない`);
    });

    const pickCore = async (w) => {
      const badge = $(`#workspace g.slot-badge[data-slot="${w.slot}"]`);
      await click(badge); await wait(10);
      const cb = $(`#core-picker [data-cp="color"][data-color="${w.color}"]`);
      if (!cb) { fail(`${w.slot} に ${w.color} の心線ボタンが無い`); return false; }
      await click(cb); await wait(10);
      return true;
    };
    const tapTerm = async (tid) => {
      const g = $(`#workspace g[data-term="${tid}"]`);
      if (!g) { fail(`端子 ${tid} が無い`); return false; }
      await click(g.querySelector('circle.term-dot') || g); await wait(10);
      return true;
    };
    const tapConnect = async (what) => {
      const b = $('#workspace [data-connect]');
      if (!b) { fail(`「接続する」ボタンが出ない（${what}）`); return false; }
      await click(b.querySelector('rect') || b); await wait(15);
      return true;
    };

    /* ---- ③ 心線を器具の端子へ ---- */
    let nTerm = 0;
    for (const w of aw) {
      if (w.jumper || !w.slot) continue;
      for (const ep of [w.a, w.b]) {
        if (String(ep).indexOf('.') < 0) continue;
        if (o.termLimit != null && nTerm >= o.termLimit) return { id, partial: 'terminals', log };
        if (!(await pickCore(w))) continue;
        if (!(await tapTerm(ep))) continue;
        await tapConnect(w.key + ' → ' + ep);
        nTerm++;
      }
    }
    if (o.stopAfter === 'terminals') return { id, partial: 'terminals', log };
    /* ---- ④ ボックスの中で接続 ---- */
    for (const b of P.answer.bundles) {
      for (const k of b.wires) {
        const w = aw.find(x => x.key === k);
        if (!w) { fail(`接続点の ${k} が解答の電線に無い`); continue; }
        await pickCore(w);
      }
      await tapConnect('接続点 ' + b.wires.join(' + '));
    }
    if (o.stopAfter === 'bundles') return { id, partial: 'bundles', log };
    /* ---- ⑤ 渡り線（ケーブルを使わない区間） ---- */
    for (const w of aw) {
      if (!w.jumper) continue;
      await tapTerm(w.a); await tapTerm(w.b);
    }

    /* ---- ⑥ 採点 ---- */
    await click($('#btn-check')); await wait(30);
    const score = +$('#score-value').textContent;
    const passed = /合格！/.test($('#score-label').textContent);
    const issues = $$('#issues li').map(li => li.className.replace('is-focusable', '').trim() + ':' + li.textContent.trim().slice(0, 90));

    /* ---- ⑦ 通電：すべてのスイッチの組み合わせで、点く器具が正しいか（見た目の glow で判定しない。engine の結果＝採点に含まれる） ---- */
    return { id, score, passed, issues: issues.filter(s => !/^lv-ok/.test(s)).slice(0, 12), log };
  }

  async function e2eAll(ids, opts) {
    const out = {};
    for (const id of ids) out[id] = await e2e(id, opts);
    click = clickRaw;
    return out;
  }

  window.__e2e = e2e;
  window.__e2eAll = e2eAll;
})();
