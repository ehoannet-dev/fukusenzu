/* ===========================================================
   pwa.js — ホーム画面に追加できるアプリにする
   ・sw.js を登録（オフラインでも開ける）
   ・Android／PC の Chrome：「ホーム画面に追加」ボタンで、ブラウザの追加ダイアログを出す
   ・iPad／iPhone の Safari：ボタンを押すと手順（共有 → ホーム画面に追加）を案内する
   =========================================================== */
(function () {
  'use strict';
  const toast = (msg) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.tm);
    toast.tm = setTimeout(() => { t.hidden = true; }, 4000);
  };

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* file:// などでは使えない */ }); });
    let had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (had) toast('アプリを新しい版に更新しました');
      had = true;
    });
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const btn = document.getElementById('btn-install');
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (btn && !standalone) btn.hidden = false;
  });
  window.addEventListener('appinstalled', () => { if (btn) btn.hidden = true; toast('ホーム画面に追加しました'); });
  if (btn) {
    if (isApple && !standalone) btn.hidden = false;
    btn.addEventListener('click', async () => {
      if (deferred) {
        deferred.prompt();
        const r = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }));
        deferred = null;
        if (r.outcome === 'accepted') btn.hidden = true;
        return;
      }
      toast(isApple
        ? 'Safari の下の「共有」ボタン → 「ホーム画面に追加」で入れられます'
        : 'ブラウザのメニュー（⋮）→「ホーム画面に追加」または「アプリをインストール」で入れられます');
    });
  }
  window.PWA = { standalone, isApple };
})();
