/* ---------- 公表問題 No.9 ----------
   1個の片切スイッチで、別々のボックスの下にある2灯（ランプレセプタクル＝A側、引掛シーリング＝B側）を同時点滅。
   接地極付接地端子付コンセント（EET）から、施工省略の2口コンセントへ渡り・接地極 ED へ接地線（緑）。
   A部分＝差込形コネクタ／B部分＝リングスリーブ（2.0mm と 1.6mm が混在し「中」スリーブを使う）。 */
(function () {
  'use strict';

  const no9 = {
    id: 'no9',
    title: '公表問題 No.9',
    subtitle: '1個のスイッチで2灯同時点滅（帰り線を A→B へ）＋接地極付接地端子付コンセント（EET）＋接地線（緑）',
    source: '候補問題No.9｜配線図＝令和8年度の公表PDF（A・B の記号と VVF1.6-3C の表記は実出題の問題PDFによる）／材料・寸法・施工条件・解答＝令和6年度上期〜令和8年度上期の実出題で一致',

    conditions: [
      '与えられた<b>全ての材料（予備品を除く）</b>を使用して完成させる。<b>配線及び器具の配置</b>は、配線図のとおりに行う。',
      '電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '電源から<b>コンセント及び点滅器</b>までの<b>非接地側電線</b>には、すべて<b>黒色</b>を使用する。',
      '<b>接地線には緑色</b>を使用する。',
      '次の器具の端子には<b>白色</b>を結線する：コンセントの接地側極端子（W表示）／ランプレセプタクルの<b>受金ねじ部の端子</b>／引掛シーリングローゼットの接地側極端子（W表示）。',
      'VVF用ジョイントボックス部分を<b>経由する電線は、その部分ですべて接続</b>する（ジョイントボックス・スイッチボックスは支給されないので取り付けは省略）。',
      '接続は <b>A部分＝差込形コネクタ</b>、<b>B部分＝リングスリーブ</b>で行う。',
      '一点鎖線で囲んだ<b>2口コンセントと接地極 ED は施工省略</b>。電線の先端までを配線する（先端は切りっぱなし）。',
      '電線接続箇所のテープ巻きや絶縁キャップによる絶縁処理は省略する。作品は保護板（板紙）に取り付けない。'
    ],

    tips: [
      '<b>1個のスイッチ「イ」で、別々のボックスの下にある2灯を同時に点滅</b>させる（ランプレセプタクル＝A側、引掛シーリング＝B側）。帰り線は A で<b>3本</b>（スイッチの白・ランプレセプタクルの黒・3心の赤）をまとめ、A-B間の<b>赤</b>で B の引掛シーリングへ送る。',
      '<b>No.1〜No.3 と A・B の接続方法が逆</b>（No.4 と同じ）。この問題は <b>A部分＝差込形コネクタ／B部分＝リングスリーブ</b>。',
      'A-B間の VVF1.6-3C は <b>白＝接地側、黒＝非接地側、赤＝帰り線イ</b> と3心すべてを使い分ける。',
      'スイッチへの2心ケーブルは <b>黒＝電源（非接地側）、白＝帰り線</b>。片切スイッチの2つの端子に極性はない。',
      '<b>B部分は 2.0mm と 1.6mm が混在</b>する。白4本（2.0×2＋1.6×2）と黒3本（2.0×2＋1.6×1）は<b>どちらも中スリーブ・刻印「中」</b>。帰り線2本（1.6×2）だけが<b>小スリーブ・刻印「○」</b>。黒3本を「小」にしないこと。',
      '<b>接地極付接地端子付コンセント（EET）</b>の緑は、<b>⏚表示の接地極用端子</b>へ。前面の「アース」表示の接地端子には結線しない。緑はボックスの接続点には入らない。',
      'EET の各極には差込穴が2つずつある（中でつながっている）。<b>もう一方の穴</b>から、施工省略の2口コンセントへ VVF1.6-2C で<b>渡り</b>を出す（W側の穴に白）。',
      '<b>取付枠はスイッチだけ</b>に使う。EET は取付枠を使わない。',
      '<b>電源は VVF2.0-2C（シース青色）</b>。約600mmの1本から「電源〜B」と「B〜EET」の2区間を切り出す。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋接続・結線する端ごとに50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側と施工省略側は<b>切りっぱなし</b>なので足しません。'
    ],

    /* ========== 単線図（左パネル） ========== */
    single: {
      viewBox: '0 55 470 300',
      lines: [
        { x1: 110, y1: 210, x2: 240, y2: 210 },   // A ↔ B
        { x1: 240, y1: 210, x2: 370, y2: 210 },   // B → EET
        { x1: 240, y1: 210, x2: 240, y2: 118 },   // B → 電源（上）
        { x1: 110, y1: 210, x2: 110, y2: 127 },   // A → ランプレセプタクル
        { x1: 110, y1: 210, x2: 110, y2: 300 },   // A → 点滅器
        { x1: 240, y1: 210, x2: 240, y2: 290 },   // B → 引掛シーリング
        { x1: 370, y1: 210, x2: 370, y2: 132 },   // EET → 2口コンセント（施工省略）
        { x1: 370, y1: 232, x2: 370, y2: 286 }    // EET → 接地極 ED（施工省略）
      ],
      symbols: [
        { type: 'text', x: 225, y: 84, text: '電源', size: 15, weight: 700 },
        { type: 'text', x: 208, y: 104, text: '1φ2W 100V', size: 10, fill: 'muted' },
        { type: 'jb', x: 110, y: 210, r: 24, label: 'A' },
        { type: 'jb', x: 240, y: 210, r: 24, label: 'B' },
        { type: 'text', x: 142, y: 199, text: 'VVF1.6-3C', size: 10, fill: 'muted' },
        { type: 'lamp', x: 110, y: 100, mark: 'イ' },
        { type: 'switch-dots', x: 110, y: 300, marks: ['イ'], gap: 0 },
        { type: 'ceiling', x: 240, y: 310, mark: 'イ', round: true },
        { type: 'outlet', x: 370, y: 210, mark: 'EET' },
        { type: 'omit-box', x: 320, y: 62, w: 136, h: 84, text: '施工省略' },
        { type: 'outlet', x: 370, y: 110, count: 2, from: 'down' },   // 線は下（EET）から来る
        { type: 'text', x: 378, y: 256, text: 'E1.6', size: 11, fill: 'muted' },
        { type: 'omit-box', x: 346, y: 266, w: 110, h: 72, text: '施工省略' },
        { type: 'earth', x: 370, y: 300, label: 'ED' }
      ]
    },

    /* ========== 作業エリア ========== */
    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        /* 配線図どおり、電源は B の上。施工省略の枠はなく、電源側の VVF2.0-2C は切りっぱなし */
        id: 'src', type: 'source', group: 'src',
        x: 600, y: 112, label: '電源', note: '単相100V',
        shape: { rx: 138, ry: 58 },
        terminals: [
          { id: 'L', name: '非接地側 L（黒）', short: 'L 非接地側', kind: 'source-l', dx: 58, dy: -26, dir: 'right', labelDir: 'right' },
          { id: 'N', name: '接地側 N（白）', short: 'N 接地側', kind: 'source-n', dx: 58, dy: 26, dir: 'right', labelDir: 'right' }
        ]
      },
      { id: 'jbA', type: 'jointbox', group: 'jbA', connect: 'connector', x: 300, y: 400, r: 100, label: 'ジョイントボックス A' },
      { id: 'jbB', type: 'jointbox', group: 'jbB', connect: 'sleeve', x: 690, y: 400, r: 100, label: 'ジョイントボックス B' },
      {
        id: 'lamp', type: 'lamp', group: 'lamp',
        x: 300, y: 112, label: 'ランプレセプタクル', mark: 'イ', loadName: 'ランプレセプタクル イ',
        terminals: [
          { id: 'W', name: '受金ねじ部端子（接地側）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '中心端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        id: 'ceil', type: 'ceiling', group: 'ceil', round: true,
        x: 690, y: 690, label: '引掛シーリング（丸形）', mark: 'イ', loadName: '引掛シーリング イ',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'load-n', dx: -54, dy: 30, dir: 'down' },
          { id: 'X', name: '非接地側極端子', short: '非接地側', kind: 'load-x', dx: 54, dy: 30, dir: 'down' }
        ]
      },
      {
        id: 'swI', type: 'switch', group: 'swI', poleSwap: true,
        x: 300, y: 680, label: '埋込連用タンブラスイッチ', mark: 'イ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        /* 各極の差込穴2つは器具の中で同極。1つ目＝Bからの2.0mm、2つ目＝2口コンセントへの渡り（1.6mm） */
        id: 'eet', type: 'outlet', group: 'eet',
        x: 1040, y: 400, label: 'EET（接地極付接地端子付コンセント）',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示・差込穴2つ）', short: '接地側W', kind: 'outlet-n', dx: -72, dy: -20, dir: 'left' },
          { id: 'L', name: '非接地側極端子（差込穴2つ）', short: '非接地側', kind: 'outlet-l', dx: -72, dy: 20, dir: 'left' },
          { id: 'E', name: '接地極用端子（⏚・緑）', short: '接地極⏚', kind: 'earth', dx: 72, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'o2', type: 'outlet', group: 'o2', omitted: true,
        x: 1040, y: 124, label: '2口コンセント',
        omitBox: { x: 862, y: 50, w: 338, h: 160, text: '施工省略' },
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'outlet-n', dx: -72, dy: -20, dir: 'left', max: 1 },
          { id: 'L', name: '非接地側極端子', short: '非接地側', kind: 'outlet-l', dx: -72, dy: 20, dir: 'left', max: 1 }
        ]
      },
      {
        id: 'ed', type: 'earth', group: 'ed', omitted: true,
        x: 1120, y: 668, label: '接地極 ED',
        omitBox: { x: 1010, y: 570, w: 190, h: 184, text: '施工省略' },
        terminals: [
          { id: 'E', name: '接地極（D種接地）', short: 'ED', kind: 'earth', dx: 0, dy: -62, dir: 'up', labelDir: 'left' }
        ]
      }
    ],

    frames: [
      { x: 202, y: 636, w: 196, h: 88, label: '埋込連用取付枠' }
    ],

    /* 1個のスイッチ「イ」で2灯 */
    pairs: [
      { sw: 'swI', load: 'lamp', mark: 'イ' },
      { sw: 'swI', load: 'ceil', mark: 'イ' }
    ],

    nets: [
      { id: 'earth', name: '接地線（緑）',
        groups: [['eet.E'], ['ed.E']],
        bad: '接地線（緑）がつながっていません',
        hint: 'EET の接地極用端子（⏚）と接地極 ED を、<b>緑色</b>の電線でつなぎます（前面の「アース」端子ではありません）。' }
    ],

    runs: [
      { id: 'src-B', span: 150, cut: 200, a: 'src', b: 'jbB', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（電源・シース青）', at: [[574, 262]] },
      { id: 'A-B', span: 150, cut: 250, a: 'jbA', b: 'jbB', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[495, 446]] },
      { id: 'B-eet', span: 150, cut: 250, a: 'jbB', b: 'eet', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（シース青）', at: [[866, 446]] },
      { id: 'A-lamp', span: 150, cut: 250, a: 'jbA', b: 'lamp', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[372, 240]] },
      { id: 'A-sw', span: 150, cut: 250, a: 'jbA', b: 'swI', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[372, 572]] },
      { id: 'B-ceil', span: 150, cut: 250, a: 'jbB', b: 'ceil', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[772, 552]] },
      { id: 'eet-o2', span: 150, cut: 200, a: 'eet', b: 'o2', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（施工省略へ渡り）', at: [[1116, 262]] },
      { id: 'eet-ed', span: 100, cut: 150, a: 'eet', b: 'ed', slots: 1, need: 'iv16-green', note: 'IV1.6 緑（接地線 E1.6）', at: [[1150, 510]] }
    ],

    /* 支給される材料（材料表どおり） */
    supply: {
      cables: {
        'vvf20-2c':   { len: 600, count: 1 },
        'vvf16-2c':   { len: 1250, count: 1 },
        'vvf16-3c':   { len: 350, count: 1 },
        'iv16-green': { len: 150, count: 1 }
      },
      connectors: { 2: 2, 3: 1, 4: 0 },
      sleeves: { '小': 2, '中': 3, '大': 0 }
    },

    /* ========== 模範解答 ========== */
    answer: {
      wires: [
        { a: 'src.L', b: 'jbB', color: 'black', role: '電源 非接地側（L）' },
        { a: 'src.N', b: 'jbB', color: 'white', role: '電源 接地側（N）' },

        { a: 'jbB', b: 'eet.L', color: 'black', role: '非接地側 → EET' },
        { a: 'jbB', b: 'eet.W', color: 'white', role: '接地側 → EET W端子' },

        { a: 'jbA', b: 'jbB', color: 'black', role: '非接地側（3心の黒）→ スイッチへ' },
        { a: 'jbA', b: 'jbB', color: 'white', role: '接地側（3心の白）→ ランプレセプタクルへ' },
        { a: 'jbA', b: 'jbB', color: 'red', role: 'イの帰り線（3心の赤）→ 引掛シーリングへ' },

        { a: 'jbA', b: 'lamp.W', color: 'white', role: '接地側 → 受金ねじ部' },
        { a: 'jbA', b: 'lamp.X', color: 'black', role: 'イの帰り線 → 中心端子' },

        { a: 'jbA', b: 'swI.C', color: 'black', role: '非接地側 → 点滅器 電源側' },
        { a: 'jbA', b: 'swI.L', color: 'white', role: 'イの帰り線（2心の相方＝白）' },

        { a: 'jbB', b: 'ceil.W', color: 'white', role: '接地側 → 引掛シーリング W' },
        { a: 'jbB', b: 'ceil.X', color: 'black', role: 'イの帰り線 → 引掛シーリング' },

        { a: 'eet.W', b: 'o2.W', color: 'white', role: '渡り 接地側（2口コンセントへ・切りっぱなし）' },
        { a: 'eet.L', b: 'o2.L', color: 'black', role: '渡り 非接地側（2口コンセントへ・切りっぱなし）' },

        { a: 'eet.E', b: 'ed.E', color: 'green', role: '接地線（緑）→ 接地極 ED' }
      ],
      bundles: [
        { jb: 'jbA', wires: ['jbA|jbB:white', 'jbA|lamp.W'], label: '接地側（白）2本＝2本用' },
        { jb: 'jbA', wires: ['jbA|jbB:black', 'jbA|swI.C'], label: '非接地側（黒）2本＝2本用' },
        { jb: 'jbA', wires: ['jbA|jbB:red', 'jbA|lamp.X', 'jbA|swI.L'], label: 'イの帰り 3本＝3本用' },

        { jb: 'jbB', wires: ['src.N|jbB', 'jbB|eet.W', 'jbA|jbB:white', 'jbB|ceil.W'], label: '接地側（白）4本＝中・刻印「中」' },
        { jb: 'jbB', wires: ['src.L|jbB', 'jbB|eet.L', 'jbA|jbB:black'], label: '非接地側（黒）3本＝中・刻印「中」' },
        { jb: 'jbB', wires: ['jbA|jbB:red', 'jbB|ceil.X'], label: 'イの帰り 2本＝小・刻印「○」' }
      ],
      explain: [
        '<b>①接地側（白）</b>：電源の白を B で <b>EET の W・A行き3心の白・引掛シーリングの W</b> とまとめる（白4本）。A では3心の白をランプレセプタクルの<b>受金ねじ部</b>へ行く白とつなぐ（白2本）。',
        '<b>②非接地側（黒）</b>：電源の黒を B で <b>EET の黒・A行き3心の黒</b> とまとめる（黒3本）。A では3心の黒を<b>スイッチの電源側</b>へ行く黒とつなぐ（黒2本）。',
        '<b>③帰り線イ（2灯同時点滅）</b>：スイッチの白（負荷側）を、A で<b>ランプレセプタクルの黒・3心の赤</b>と3本まとめる。赤は B で<b>引掛シーリングの黒</b>とつなぐ。これで1個のスイッチが、別々のボックスの下にある2灯を同時に点滅させる。',
        '<b>④EET と 2口コンセント（施工省略）</b>：B からの VVF2.0-2C の白を W 側、黒を反対側の差込穴へ。<b>もう一方の差込穴</b>から VVF1.6-2C で2口コンセントへ渡す（白は W 側。先端は切りっぱなし）。',
        '<b>⑤接地線（緑）</b>：EET の<b>⏚表示の接地極用端子</b>から接地極 ED へ IV1.6 緑を出す（図の寸法100mm。ED 側は切りっぱなし）。前面の「アース」端子は使わない。緑はボックスの接続点に入らない。',
        '<b>A部分＝差込形コネクタ3か所</b>：白2本＝<b>2本用</b>、黒2本＝<b>2本用</b>、帰り線3本＝<b>3本用</b>。ちょうど使い切る。',
        '<b>B部分＝リングスリーブ3か所</b>：白4本（2.0×2＋1.6×2）＝<b>中・刻印「中」</b>、黒3本（2.0×2＋1.6×1）＝<b>中・刻印「中」</b>、帰り線2本（1.6×2）＝<b>小・刻印「○」</b>。予備は小1・中1が残る。',
        '<b>目で見て通電試験</b>：EET（と2口コンセントへの渡り）は常時通電。スイッチ「イ」を入れると、ランプレセプタクルと引掛シーリングが<b>同時に</b>点灯すれば正解。'
      ]
    }
  };

  window.PROBLEMS.push(no9);
})();
