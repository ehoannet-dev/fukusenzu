/* 開発用：タップ操作だけで「ケーブルを切る → 置く → 心線を端子へ → ボックスで接続 → 渡り線 → 採点」を通す
   使い方（開発サーバーで開いたページのコンソール）：
     const s = document.createElement('script'); s.src = 'tools/e2e-browser.js'; document.head.appendChild(s);
     await __e2e('no6')          // → { score, passed, issues, log }
     await __e2eAll(['no1', 'no2'])
   画面のボタン・札・端子に click を送るだけで、アプリの内部関数は呼ばない（利用者と同じ操作）。 */
(function () {
  'use strict';
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const click = (el) => el && el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

  async function e2e(id, opts) {
    const o = opts || {};
    const P = window.PROBLEMS.find(p => p.id === id);
    const log = [];
    const fail = (m) => { log.push('✗ ' + m); };
    const sel = $('#problem-select');
    sel.value = id; sel.dispatchEvent(new Event('change'));
    await wait(80);
    // まっさらにする（2回押し）
    if ($('#btn-reset')) { click($('#btn-reset')); await wait(20); click($('#btn-reset')); await wait(40); }

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
        if (!chip.classList.contains('is-picked')) { click(chip); await wait(10); }
        click($('#btn-cut')); await wait(10);
        const rb = $$('#core-picker [data-cp="cutrun"]').find(b => b.dataset.key.split('#')[0] === run.id);
        if (!rb) { fail(`切る区間に ${run.id} が出ない`); click($('#core-picker [data-cp="close"]')); continue; }
        click(rb); await wait(10);
        const lb = $$('#core-picker [data-cp="cutlen"]').find(b => +b.dataset.len === run.cut);
        if (!lb) { fail(`${run.id} の長さの選択肢に ${run.cut} が無い`); click($('#core-picker [data-cp="close"]')); continue; }
        click(lb); await wait(10);
        const badge = $(`#workspace g.slot-badge[data-slot="${run.id}#${i}"]`);
        if (!badge) { fail(`札 ${run.id}#${i} が無い`); continue; }
        click(badge); await wait(10);
        const pb = $$('#core-picker [data-cp="pick"]');
        if (pb.length !== 1) { fail(`${run.id}#${i}：置けるケーブルが ${pb.length} 本`); }
        if (pb[0]) { click(pb[0]); await wait(10); }
      }
    }
    // 札を閉じる
    const close = $('#core-picker [data-cp="close"]'); if (close) click(close);

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
      click(badge); await wait(10);
      const cb = $(`#core-picker [data-cp="color"][data-color="${w.color}"]`);
      if (!cb) { fail(`${w.slot} に ${w.color} の心線ボタンが無い`); return false; }
      click(cb); await wait(10);
      return true;
    };
    const tapTerm = async (tid) => {
      const g = $(`#workspace g[data-term="${tid}"]`);
      if (!g) { fail(`端子 ${tid} が無い`); return false; }
      click(g.querySelector('circle.term-dot') || g); await wait(10);
      return true;
    };
    const tapConnect = async (what) => {
      const b = $('#workspace [data-connect]');
      if (!b) { fail(`「接続する」ボタンが出ない（${what}）`); return false; }
      click(b.querySelector('rect') || b); await wait(15);
      return true;
    };

    /* ---- ③ 心線を器具の端子へ ---- */
    for (const w of aw) {
      if (w.jumper || !w.slot) continue;
      for (const ep of [w.a, w.b]) {
        if (String(ep).indexOf('.') < 0) continue;
        if (!(await pickCore(w))) continue;
        if (!(await tapTerm(ep))) continue;
        await tapConnect(w.key + ' → ' + ep);
      }
    }
    /* ---- ④ ボックスの中で接続 ---- */
    for (const b of P.answer.bundles) {
      for (const k of b.wires) {
        const w = aw.find(x => x.key === k);
        if (!w) { fail(`接続点の ${k} が解答の電線に無い`); continue; }
        await pickCore(w);
      }
      await tapConnect('接続点 ' + b.wires.join(' + '));
    }
    /* ---- ⑤ 渡り線（ケーブルを使わない区間） ---- */
    for (const w of aw) {
      if (!w.jumper) continue;
      await tapTerm(w.a); await tapTerm(w.b);
    }

    /* ---- ⑥ 採点 ---- */
    click($('#btn-check')); await wait(30);
    const score = +$('#score-value').textContent;
    const passed = /合格！/.test($('#score-label').textContent);
    const issues = $$('#issues li').map(li => li.className.replace('is-focusable', '').trim() + ':' + li.textContent.trim().slice(0, 90));

    /* ---- ⑦ 通電：すべてのスイッチの組み合わせで、点く器具が正しいか（見た目の glow で判定しない。engine の結果＝採点に含まれる） ---- */
    return { id, score, passed, issues: issues.filter(s => !/^lv-ok/.test(s)).slice(0, 12), log };
  }

  async function e2eAll(ids) {
    const out = {};
    for (const id of ids) out[id] = await e2e(id);
    return out;
  }

  window.__e2e = e2e;
  window.__e2eAll = e2eAll;
})();
