/* ===========================================================
   photo.js — 器具写真の撮影ページ
   3D 部品づくりの参考写真を、器具ごと・向きごとに撮って端末（IndexedDB）に保存し、
   設定があれば GitHub の非公開リポジトリ（kigu-photos）へ 1 枚ずつ送る。Mac はそこから取り込む。
   ・写真は元のまま保存する。保管できない形式（HEIC など）と 20MB 超だけ、高画質の JPEG に直す
   ・一覧用に長辺 480px の縮小版を別に持つ
   ・送信は 1 枚ずつ順番に（GitHub の同じブランチへ同時に書くと衝突するため）
   =========================================================== */
(function () {
  'use strict';

  /* ---------------- 器具と撮影カット ---------------- */
  const GROUPS = [
    { name: '照明', items: [
      ['lamp', 'ランプレセプタクル'], ['ceiling', '引掛シーリング（角形）'], ['ceiling-round', '引掛シーリングローゼット（丸形）'],
      ['fluorescent', '蛍光灯（実物）']] },
    { name: '点滅器', items: [
      ['switch', 'タンブラスイッチ（片切）'], ['switch-3way', '3路スイッチ'], ['switch-4way', '4路スイッチ'],
      ['switch-pilot', '位置表示灯内蔵スイッチ'], ['pilot', '確認表示灯（パイロットランプ）']] },
    { name: 'コンセント', items: [
      ['outlet', '埋込連用コンセント'], ['outlet-2', '埋込コンセント（2口）'], ['outlet-e', '接地極付コンセント'],
      ['outlet-eet', '接地極付接地端子付コンセント（EET）'], ['outlet-exposed', '露出形コンセント'], ['outlet-20a', '20A250V 接地極付コンセント']] },
    { name: '取付枠・端子台・遮断器', items: [
      ['frame', '埋込連用取付枠'], ['tb-3', '端子台（3極）'], ['tb-5', '端子台（5極・6極）'], ['breaker', '配線用遮断器']] },
    { name: 'ボックス・管', items: [
      ['jointbox', 'ジョイントボックス（アウトレットボックス）'], ['conduit-e19', 'ねじなし電線管 E19・コネクタ'],
      ['conduit-pf16', 'PF管 16・コネクタ'], ['bushing', 'ゴムブッシング・絶縁ブッシング']] },
    { name: '接続材料・電線', items: [
      ['sleeve', 'リングスリーブ（小・中）'], ['connector', '差込形コネクタ'], ['cable', 'ケーブル（VVF・VVR・IV）']] },
    { name: 'そのほか', items: [['other', 'その他（名前を書く）']] }
  ];
  const DEVICE = {};
  GROUPS.forEach(g => g.items.forEach(([k, n]) => { DEVICE[k] = n; }));

  const SHOTS = [
    ['01-front', '正面', '真正面から。器具が画面いっぱいになるように'],
    ['02-back', '背面', '裏返して真正面から（端子・差込口の側）'],
    ['03-left', '左側面', '真横から'],
    ['04-right', '右側面', '真横から'],
    ['05-top', '上面', '真上から見下ろす'],
    ['06-bottom', '下面', '置いている面。立てるか持ち上げて'],
    ['07-oblique-front', '斜め前', '左上 45° から'],
    ['08-oblique-back', '斜め後ろ', '右上 45° から（背面の側）'],
    ['09-terminal', '接写：端子', '刻印（W・接地側）が読めるまで寄る'],
    ['10-screw', '接写：ねじ・合わせ目', 'ねじ頭、部品の合わせ目、爪'],
    ['11-mark', '接写：ゲージ・刻印', 'ストリップゲージ、定格の刻印'],
    ['12-measure', '寸法', 'ノギスか定規を当て、目盛りが読めるように'],
    ['99-extra', '追加の写真', '気になる所を何枚でも']
  ];
  const SHOT = {};
  SHOTS.forEach(([k, n]) => { SHOT[k] = n; });
  const MAIN_SHOTS = SHOTS.filter(s => s[0] !== '99-extra').length;
  const DEFAULT_REPO = 'ehoannet-dev/kigu-photos';

  /* ---------------- 端末の保存先（IndexedDB） ---------------- */
  let dbPromise = null;
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('no-idb')); return; }
      const r = indexedDB.open('kigu-photo', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos', { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbPromise;
  }
  const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function dbPut(p) { const d = await openDb(); return reqP(d.transaction('photos', 'readwrite').objectStore('photos').put(p)); }
  async function dbDelete(id) { const d = await openDb(); return reqP(d.transaction('photos', 'readwrite').objectStore('photos').delete(id)); }
  async function dbGetAll() { const d = await openDb(); return reqP(d.transaction('photos').objectStore('photos').getAll()); }

  /* ---------------- 状態 ---------------- */
  const $ = (id) => document.getElementById(id);
  let photos = [];                 // 端末に保存した写真（新しい順）
  let storeOk = false;
  let device = 'lamp';
  const busy = {};                 // shotKey -> 保存中の枚数
  let target = null;               // いま撮ろうとしているカット
  let viewer = null;               // { shot, index, confirm }
  let syncing = false;
  let syncNote = '';
  const thumbUrls = new Map();
  let fullUrl = null;
  try { const d = localStorage.getItem('kigu-photo:device'); if (d && DEVICE[d]) device = d; } catch (e) { /* 使えなくてもよい */ }

  const ofDevice = (k) => photos.filter(p => p.device === k);
  const ofShot = (k, s) => photos.filter(p => p.device === k && p.shot === s);
  const otherName = () => ($('other-name').value || '').trim();
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const mb = (n) => (n >= 1073741824 ? (n / 1073741824).toFixed(1) + ' GB' : (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB');

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.tm);
    toast.tm = setTimeout(() => { t.hidden = true; }, 3400);
  }
  function banner(msg) { const b = $('banner'); b.textContent = msg || ''; b.hidden = !msg; }
  function setPill(id, text, cls) { const p = $(id); p.className = 'pill' + (cls ? ' ' + cls : ''); p.innerHTML = (cls ? '<span class="dot"></span>' : '') + text; }

  function thumbSrc(p) {
    if (!thumbUrls.has(p.id)) thumbUrls.set(p.id, URL.createObjectURL(p.thumb || p.blob));
    return thumbUrls.get(p.id);
  }
  async function reload() {
    photos = (await dbGetAll()).sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  }

  /* ---------------- GitHub の設定 ---------------- */
  function ghSettings() {
    try { return JSON.parse(localStorage.getItem('kigu-photo:gh') || 'null') || {}; } catch (e) { return {}; }
  }
  function saveGh(o) { try { localStorage.setItem('kigu-photo:gh', JSON.stringify(o)); } catch (e) { toast('この端末では設定を保存できません'); } }
  const ghHeaders = (token) => ({
    Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'
  });
  function describeGhError(e) {
    const s = e && e.status;
    if (s === 401) return '合言葉（トークン）が正しくないか、期限が切れています';
    if (s === 403) return '合言葉に、このリポジトリへの書き込み（Contents：Read and write）が付いていません';
    if (s === 404) return 'リポジトリが見つかりません（名前と、合言葉で選んだリポジトリを確認）';
    if (s === 409 || s === 422) return 'GitHub 側で衝突しました。もう一度送ってみてください';
    return 'GitHub からエラー（' + (s ? 'HTTP ' + s + '：' : '') + ((e && e.message) || '不明') + '）';
  }
  async function checkGh(gh) {
    const r = await fetch('https://api.github.com/repos/' + gh.repo, { headers: ghHeaders(gh.token) });
    if (!r.ok) { const e = new Error((await r.json().catch(() => ({}))).message || ''); e.status = r.status; throw e; }
    return r.json();
  }

  /* ---------------- 写真の準備（必要なときだけ JPEG に直す） ---------------- */
  const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX = 20 * 1024 * 1024;

  async function decode(file) {
    if ('createImageBitmap' in window) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* 下の方法を試す */ }
    }
    const url = URL.createObjectURL(file);
    try {
      const im = new Image();
      im.decoding = 'async';
      im.src = url;
      await im.decode();
      return im;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 2000); }
  }
  function toJpeg(src, maxSide, quality) {
    const w0 = src.width || src.naturalWidth, h0 = src.height || src.naturalHeight;
    const k = Math.min(1, maxSide / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(src, 0, 0, w, h);
    return new Promise((res, rej) => c.toBlob(b => (b ? res({ blob: b, w, h }) : rej(new Error('encode'))), 'image/jpeg', quality));
  }
  async function prepare(file) {
    const pic = await decode(file);
    const w = pic.width || pic.naturalWidth, h = pic.height || pic.naturalHeight;
    let main = file, mw = w, mh = h, converted = false;
    if (OK_TYPES.indexOf(file.type) < 0 || file.size > MAX) {
      let r = await toJpeg(pic, 6000, 0.92);
      if (r.blob.size > MAX) r = await toJpeg(pic, 4096, 0.88);
      main = r.blob; mw = r.w; mh = r.h; converted = true;
    }
    const th = await toJpeg(pic, 480, 0.8);
    if (pic.close) pic.close();
    return { main, thumb: th.blob, w: mw, h: mh, converted };
  }

  /* ---------------- 端末に保存 ---------------- */
  async function sendFiles(shotKey, files) {
    if (!storeOk || !files.length) return;
    const dev = device;
    const devName = dev === 'other' ? (otherName() || 'その他') : DEVICE[dev];
    busy[shotKey] = (busy[shotKey] || 0) + files.length;
    renderShots();
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* 任意 */ }
    let ok = 0;
    for (const f of files) {
      try {
        const p = await prepare(f);
        const rec = {
          id: newId(), device: dev, deviceName: devName, shot: shotKey, shotName: SHOT[shotKey],
          blob: p.main, thumb: p.thumb, type: p.main.type || 'image/jpeg', sizeBytes: p.main.size,
          width: p.w, height: p.h, converted: p.converted, fileName: f.name || '',
          takenAt: new Date(f.lastModified || Date.now()).toISOString(), savedAt: new Date().toISOString(),
          status: 'local', remotePath: '', error: ''
        };
        await dbPut(rec);
        ok++;
      } catch (e) {
        toast(e && e.message === 'encode' ? 'この写真は読み込めませんでした' : '保存できませんでした（' + ((e && e.message) || '不明') + '）');
      } finally {
        busy[shotKey]--;
        if (busy[shotKey] <= 0) delete busy[shotKey];
      }
    }
    await reload();
    renderAll();
    if (ok) toast(SHOT[shotKey] + ' を ' + ok + ' 枚保存しました');
    refreshUsage();
    syncAll(false);
  }

  /* ---------------- GitHub へ送る ---------------- */
  const toBase64 = (blob) => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] || '');
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
  function remotePathFor(p) {
    const d = new Date(p.savedAt), pad = (n) => String(n).padStart(2, '0');
    const stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    const ext = p.type === 'image/png' ? 'png' : p.type === 'image/webp' ? 'webp' : 'jpg';
    const folder = p.device === 'other' ? 'other/' + String(p.deviceName || 'その他').replace(/[\/\\:*?"<>|]/g, '_') : p.device;
    return folder + '/' + p.shot + '_' + stamp + '_' + p.id.slice(-4) + '.' + ext;
  }
  function buildRequest(p, gh) {
    const path = remotePathFor(p);
    return {
      path,
      url: 'https://api.github.com/repos/' + gh.repo + '/contents/' + path.split('/').map(encodeURIComponent).join('/'),
      message: '写真：' + p.deviceName + '／' + p.shotName + (p.converted ? '（JPEG に変換）' : '')
    };
  }
  async function uploadOne(p, gh) {
    const req = buildRequest(p, gh);
    const body = { message: req.message, content: await toBase64(p.blob), branch: 'main' };
    const r = await fetch(req.url, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders(gh.token)), body: JSON.stringify(body) });
    if (r.status === 201 || r.status === 200) return req.path;
    const j = await r.json().catch(() => ({}));
    const e = new Error(j.message || ''); e.status = r.status; throw e;
  }
  async function syncAll(manual) {
    const gh = ghSettings();
    if (!gh.token || !gh.repo) { if (manual) toast('先に「Mac へ送る設定」をしてください'); return; }
    if (syncing) return;
    const todo = photos.filter(p => p.status !== 'sent').sort((a, b) => (a.savedAt > b.savedAt ? 1 : -1));
    if (!todo.length) { if (manual) toast('送っていない写真はありません'); return; }
    if (!navigator.onLine) { syncNote = 'オフラインです。つながったら続きを送ります'; renderState(); if (manual) toast(syncNote); return; }
    syncing = true; syncNote = ''; renderState();
    let sent = 0, stop = '';
    try {
      for (const p of todo) {
        if (!navigator.onLine) { stop = 'オフラインになりました。つながったら続きを送ります'; break; }
        p.status = 'sending'; await dbPut(p); renderShots();
        try {
          const path = await uploadOne(p, gh);
          p.status = 'sent'; p.remotePath = path; p.sentAt = new Date().toISOString(); p.error = '';
          await dbPut(p); sent++;
        } catch (e) {
          if (!e || !e.status) {   // ネットの問題：未送信のまま止める
            p.status = 'local'; p.error = ''; await dbPut(p);
            stop = 'ネットにつながらないので、あとで続きを送ります'; break;
          }
          p.status = 'error'; p.error = describeGhError(e); await dbPut(p);
          if (e.status === 401 || e.status === 403 || e.status === 404) { stop = p.error; break; }
        }
        renderShots(); renderState();
      }
    } finally {
      syncing = false;
      await reload();
      syncNote = stop;
      renderAll();
      if (sent) toast(sent + ' 枚を Mac へ送りました');
      else if (stop && manual) toast(stop);
    }
  }

  async function refreshUsage() {
    try {
      if (!navigator.storage || !navigator.storage.estimate) return;
      const e = await navigator.storage.estimate();
      const pill = $('st-usage');
      pill.hidden = false;
      pill.textContent = '端末の空き ' + mb(Math.max(0, (e.quota || 0) - (e.usage || 0)));
    } catch (e) { /* 表示できなくても撮影は続けられる */ }
  }

  /* ---------------- 表示 ---------------- */
  function renderDevices() {
    const sel = $('dev');
    sel.innerHTML = '';
    GROUPS.forEach(g => {
      const og = document.createElement('optgroup'); og.label = g.name;
      g.items.forEach(([k, n]) => {
        const o = document.createElement('option'); o.value = k;
        const done = new Set(ofDevice(k).filter(p => p.shot !== '99-extra').map(p => p.shot)).size;
        o.textContent = ofDevice(k).length ? n + '（' + done + '/' + MAIN_SHOTS + '）' : n;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    sel.value = device;
    $('other-row').hidden = device !== 'other';
  }

  function renderShots() {
    const name = device === 'other' ? (otherName() || 'その他') : DEVICE[device];
    $('cur-title').textContent = name + ' を撮る';
    const list = ofDevice(device);
    const done = new Set(list.filter(p => p.shot !== '99-extra').map(p => p.shot)).size;
    $('cur-meter').innerHTML = '<b>' + done + '</b> / ' + MAIN_SHOTS + ' カット　写真 ' + list.length + ' 枚';
    const box = $('shots');
    box.innerHTML = '';
    SHOTS.forEach(([k, n, hint]) => {
      const ps = ofShot(device, k);
      const t = document.createElement('article'); t.className = 'tile' + (ps.length ? ' has' : '');
      const img = document.createElement('button');
      img.type = 'button'; img.className = 'tile-img'; img.dataset.view = k;
      img.setAttribute('aria-label', n + (ps.length ? '（' + ps.length + '枚。タップで大きく見る）' : '（まだありません）'));
      if (ps.length) {
        const im = document.createElement('img'); im.loading = 'lazy'; im.alt = n; im.src = thumbSrc(ps[0]);
        img.appendChild(im);
        const c = document.createElement('span'); c.className = 'count'; c.textContent = ps.length + ' 枚'; img.appendChild(c);
        const unsent = ps.filter(p => p.status !== 'sent').length;
        const s = document.createElement('span');
        s.className = 'sent' + (unsent ? ' no' : '');
        s.textContent = unsent ? '未送信 ' + unsent : 'Mac へ送信済';
        img.appendChild(s);
      } else {
        const ph = document.createElement('span'); ph.className = 'ph'; ph.textContent = 'まだ撮っていません'; img.appendChild(ph);
        img.disabled = true;
      }
      if (busy[k]) { const bz = document.createElement('span'); bz.className = 'busy'; bz.textContent = '保存中… ' + busy[k] + ' 枚'; img.appendChild(bz); }
      t.appendChild(img);
      const body = document.createElement('div'); body.className = 'tile-body';
      const b = document.createElement('b'); b.textContent = n;
      const s2 = document.createElement('small'); s2.textContent = hint;
      body.appendChild(b); body.appendChild(s2); t.appendChild(body);
      const act = document.createElement('div'); act.className = 'tile-act';
      const cam = document.createElement('button'); cam.type = 'button'; cam.className = 'btn primary'; cam.textContent = 'カメラで撮る'; cam.dataset.camera = k; cam.disabled = !storeOk;
      const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'btn'; pick.textContent = '撮った写真から'; pick.dataset.pick = k; pick.disabled = !storeOk;
      act.appendChild(cam); act.appendChild(pick); t.appendChild(act);
      box.appendChild(t);
    });
  }

  function renderState() {
    const unsent = photos.filter(p => p.status !== 'sent').length;
    setPill('st-count', '端末に ' + photos.length + ' 枚' + (unsent ? '（未送信 ' + unsent + '）' : ''));
    const gh = ghSettings();
    if (!gh.token) setPill('st-gh', 'Mac へ送る設定：まだ', 'ng');
    else if (syncing) setPill('st-gh', 'Mac へ送信中…', 'warn');
    else if (syncNote) setPill('st-gh', syncNote, 'warn');
    else setPill('st-gh', 'Mac へ送る設定：済み', 'ok');
    const bs = $('btn-sync');
    bs.disabled = syncing || !gh.token || !unsent;
    bs.textContent = syncing ? '送信中…' : unsent ? '未送信の ' + unsent + ' 枚を送る' : '全部送ってあります';
    $('btn-purge').disabled = !photos.some(p => p.status === 'sent');
  }

  function renderGh() {
    const gh = ghSettings();
    $('gh-repo').value = gh.repo || DEFAULT_REPO;
    $('gh-token').value = gh.token || '';
    $('gh-token').placeholder = gh.token ? '（保存ずみ）' : 'github_pat_… をここに貼る';
    $('gh-clear').hidden = !gh.token;
  }

  function renderAll() { renderDevices(); renderShots(); renderState(); if (viewer) renderViewer(); }

  /* ---------------- 大きく見る ---------------- */
  function openViewer(shotKey) {
    if (!ofShot(device, shotKey).length) return;
    viewer = { shot: shotKey, index: 0, confirm: false };
    $('viewer').hidden = false;
    renderViewer();
    $('v-close').focus();
  }
  function closeViewer() {
    viewer = null; $('viewer').hidden = true;
    if (fullUrl) { URL.revokeObjectURL(fullUrl); fullUrl = null; }
  }
  function renderViewer() {
    const list = ofShot(device, viewer.shot);
    if (!list.length) { closeViewer(); return; }
    if (viewer.index >= list.length) viewer.index = list.length - 1;
    const p = list[viewer.index];
    $('v-title').textContent = (p.deviceName || DEVICE[p.device] || '') + '｜' + (SHOT[p.shot] || p.shot) + '（' + (viewer.index + 1) + '/' + list.length + '）';
    const when = p.savedAt ? new Date(p.savedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const st = p.status === 'sent' ? 'Mac へ送信済み（' + p.remotePath + '）'
      : p.status === 'sending' ? '送信中…'
      : p.status === 'error' ? '送れませんでした：' + p.error
      : 'まだ Mac へ送っていません';
    $('v-meta').textContent = [p.width && p.height ? p.width + '×' + p.height : '', p.sizeBytes ? mb(p.sizeBytes) : '', when, st].filter(Boolean).join('　');
    if (fullUrl) URL.revokeObjectURL(fullUrl);
    fullUrl = URL.createObjectURL(p.blob);
    const im = $('v-img'); im.src = fullUrl; im.alt = $('v-title').textContent;
    const dl = $('v-dl'); dl.href = fullUrl; dl.download = remotePathFor(p).split('/').pop();
    const canShare = !!(navigator.canShare && navigator.share);
    $('v-share').hidden = !canShare;
    const strip = $('v-strip'); strip.innerHTML = '';
    list.forEach((q, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.i = i;
      b.setAttribute('aria-current', String(i === viewer.index));
      b.setAttribute('aria-label', (i + 1) + ' 枚目');
      const t = document.createElement('img'); t.alt = ''; t.src = thumbSrc(q);
      b.appendChild(t); strip.appendChild(b);
    });
    $('v-del').hidden = viewer.confirm; $('v-del-ok').hidden = !viewer.confirm; $('v-del-no').hidden = !viewer.confirm;
    $('v-del-note').hidden = !viewer.confirm;
    $('v-del-note').textContent = p.status === 'sent' ? 'Mac に送った分は残ります。この端末からだけ消えます。' : 'まだ Mac へ送っていません。消すと戻せません。';
  }
  async function deleteCurrent() {
    const list = ofShot(device, viewer.shot);
    const p = list[viewer.index];
    viewer.confirm = false;
    if (!p) return;
    try {
      await dbDelete(p.id);
      const u = thumbUrls.get(p.id); if (u) { URL.revokeObjectURL(u); thumbUrls.delete(p.id); }
      await reload(); renderAll(); toast('消しました'); refreshUsage();
    } catch (e) { toast('消せませんでした。もう一度お試しください'); renderViewer(); }
  }
  async function shareCurrent() {
    const p = ofShot(device, viewer.shot)[viewer.index];
    if (!p) return;
    try {
      const file = new File([p.blob], remotePathFor(p).split('/').pop(), { type: p.type });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) { toast('この端末では写真を共有できません'); return; }
      await navigator.share({ files: [file], title: p.deviceName + '／' + p.shotName });
    } catch (e) { if (!e || e.name !== 'AbortError') toast('共有できませんでした'); }
  }
  async function purgeSent() {
    const sent = photos.filter(p => p.status === 'sent');
    for (const p of sent) { await dbDelete(p.id); const u = thumbUrls.get(p.id); if (u) { URL.revokeObjectURL(u); thumbUrls.delete(p.id); } }
    await reload(); renderAll(); refreshUsage();
    toast('送信済みの ' + sent.length + ' 枚を端末から消しました（Mac には残っています）');
  }

  /* ---------------- 操作 ---------------- */
  document.addEventListener('click', (e) => {
    const cam = e.target.closest('[data-camera]');
    if (cam) { target = cam.dataset.camera; $('in-camera').value = ''; $('in-camera').click(); return; }
    const pick = e.target.closest('[data-pick]');
    if (pick) { target = pick.dataset.pick; $('in-pick').value = ''; $('in-pick').click(); return; }
    const v = e.target.closest('[data-view]');
    if (v) { openViewer(v.dataset.view); return; }
    const s = e.target.closest('#v-strip [data-i]');
    if (s && viewer) { viewer.index = Number(s.dataset.i); viewer.confirm = false; renderViewer(); }
  });
  $('in-camera').addEventListener('change', (e) => { const f = Array.from(e.target.files || []); if (target && f.length) sendFiles(target, f); });
  $('in-pick').addEventListener('change', (e) => { const f = Array.from(e.target.files || []); if (target && f.length) sendFiles(target, f); });
  $('other-name').addEventListener('input', () => renderShots());
  $('dev').addEventListener('change', (e) => {
    device = e.target.value;
    try { localStorage.setItem('kigu-photo:device', device); } catch (err) { /* 使えなくてもよい */ }
    renderAll();
    if (device === 'other') $('other-name').focus();
  });
  $('v-close').addEventListener('click', closeViewer);
  $('v-del').addEventListener('click', () => { viewer.confirm = true; renderViewer(); });
  $('v-del-no').addEventListener('click', () => { viewer.confirm = false; renderViewer(); });
  $('v-del-ok').addEventListener('click', deleteCurrent);
  $('v-share').addEventListener('click', shareCurrent);
  document.addEventListener('keydown', (e) => {
    if (!viewer) return;
    if (e.key === 'Escape') closeViewer();
    const n = ofShot(device, viewer.shot).length;
    if (e.key === 'ArrowRight' && viewer.index < n - 1) { viewer.index++; viewer.confirm = false; renderViewer(); }
    if (e.key === 'ArrowLeft' && viewer.index > 0) { viewer.index--; viewer.confirm = false; renderViewer(); }
  });
  $('btn-sync').addEventListener('click', () => syncAll(true));
  let purgeArmed = null;
  $('btn-purge').addEventListener('click', () => {
    const b = $('btn-purge');
    if (!purgeArmed) { b.textContent = 'もう一度押すと消します'; purgeArmed = setTimeout(() => { purgeArmed = null; b.textContent = '送信済みの写真を端末から消す'; }, 5000); return; }
    clearTimeout(purgeArmed); purgeArmed = null; b.textContent = '送信済みの写真を端末から消す';
    purgeSent();
  });
  $('gh-save').addEventListener('click', async () => {
    const repo = ($('gh-repo').value || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, '') || DEFAULT_REPO;
    const token = ($('gh-token').value || '').trim();
    if (!token) { toast('合言葉（トークン）を貼り付けてください'); return; }
    $('gh-state').textContent = '確かめています…';
    try {
      const info = await checkGh({ repo, token });
      saveGh({ repo: info.full_name || repo, token });
      $('gh-state').textContent = '接続できました：' + (info.full_name || repo) + (info.private ? '（非公開）' : '（公開）') + '。撮った写真は自動で送られます。';
      renderGh(); renderState(); syncAll(false);
    } catch (e) {
      $('gh-state').textContent = describeGhError(e);
    }
  });
  $('gh-clear').addEventListener('click', () => {
    try { localStorage.removeItem('kigu-photo:gh'); } catch (e) { /* noop */ }
    $('gh-state').textContent = 'この端末から合言葉を消しました。写真は端末に残っています。';
    renderGh(); renderState();
  });
  window.addEventListener('online', () => { syncNote = ''; renderState(); syncAll(false); });
  window.addEventListener('offline', () => { syncNote = 'オフラインです。つながったら続きを送ります'; renderState(); });

  /* ---------------- 開始 ---------------- */
  renderGh();
  renderAll();
  (async () => {
    try {
      await openDb();
      storeOk = true;
      setPill('st-store', 'この端末に保存できます', 'ok');
      await reload();
    } catch (e) {
      setPill('st-store', 'この端末では保存できません', 'ng');
      banner('このブラウザでは写真を保存できません（プライベートモードや、保存をブロックする設定）。通常のウィンドウで開き直してください。');
    }
    renderAll();
    refreshUsage();
    syncAll(false);
  })();

  /* 自動テスト用（画面の操作はこれを使わない） */
  window.__photo = { sendFiles, dbGetAll, syncAll, buildRequest, remotePathFor, reload, get device() { return device; } };
})();
