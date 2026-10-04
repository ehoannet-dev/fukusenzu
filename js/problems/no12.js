/* ---------- 公表問題 No.12 ----------
   PF管（PF16）とアウトレットボックス、片切スイッチ2個で2灯。
   A＝VVF用ジョイントボックス（差込形コネクタ）、B＝アウトレットボックス（リングスリーブ）。 */
(function () {
  'use strict';

  const no12 = {
    id: 'no12',
    title: '公表問題 No.12',
    subtitle: 'PF管（PF16）＋アウトレットボックス／片切スイッチ2個で2灯＋連用コンセント',
    source: '候補問題No.12｜配線図＝令和8年度の公表PDF／材料・寸法・施工条件・解答＝令和6〜8年度の実出題10回分（R6上期7/20・7/21、R6下期12/14・12/15、R7上期7/19・7/20、R7下期12/13・12/14、R8上期7/18・7/19）で一致',

    conditions: [
      '配線及び器具の配置は、配線図のとおりに行う。',
      '<b>ジョイントボックス（アウトレットボックス）</b>は、<b>打抜き済みの穴だけをすべて使用</b>する（19mmの穴4か所）。',
      '電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '電源から<b>点滅器及びコンセント</b>までの<b>非接地側電線</b>には、すべて<b>黒色</b>を使用する。',
      '次の器具の端子には<b>白色</b>を結線する：コンセントの接地側極端子（W表示）／ランプレセプタクルの<b>受金ねじ部の端子</b>／引掛シーリングローゼットの接地側極端子（「接地側」表示）。',
      'VVF用ジョイントボックス A 部分及びジョイントボックス B 部分を<b>経由する電線は、その部分ですべて接続</b>する。接続は <b>A部分＝差込形コネクタ</b>、<b>B部分＝リングスリーブ</b>で行う。',
      '<b>電線管用ボックスコネクタは、ジョイントボックス（B）側</b>に取り付ける。',
      '<b>埋込連用取付枠</b>は、<b>タンブラスイッチ（ロ）及びコンセント</b>の部分に使用する（スイッチ「イ」には使わない）。',
      'VVF用ジョイントボックス（A）とスイッチボックスは支給されないので、<b>取り付けは省略</b>する。'
    ],

    tips: [
      '<b>No.1〜No.3 と A・B が逆</b>。この問題は <b>A部分＝差込形コネクタ（VVF用ジョイントボックス）／B部分＝リングスリーブ（アウトレットボックス）</b>。',
      '<b>電源は B に入る</b>（B の真上）。A には電源の黒（非接地側）は行かない。A–B 間の3心は <b>白＝接地側、黒・赤＝帰り線2本</b>。',
      '<b>PF管の中は VVF ではなく IV1.6 の単線（黒・白・赤）</b>。黒＝スイッチロの電源側、赤＝ロの帰り線、白＝コンセントの W端子へ。',
      '<b>PF16用ボックスコネクタはアウトレットボックス側</b>に付ける（ロックナットはボックスの内側）。残り3つの穴には<b>ゴムブッシング（19）</b>を入れる。PF管は非金属なのでボンドは要らない。',
      '<b>取付枠はスイッチロとコンセントの2個だけ</b>。IV黒をスイッチロの電源側に入れ、<b>わたり線（黒）</b>でコンセントの非接地側へ送る（逆向きでも正解）。わたり線は IV黒（約500mm）の余りで作る。',
      'スイッチイは単独のスイッチ。B からの VVF1.6-2C は 黒＝電源側、<b>白＝帰り線</b>。スイッチの端子は白を指定された端子ではないので、白を帰り線に使ってよい。',
      'B部分は<b>電源の2.0mmが混ざる</b>。白3本・黒3本（2.0×1＋1.6×2）は「小・刻印<b>小</b>」、帰り線2本（1.6×2）×2か所は「小・刻印<b>○</b>」。',
      'A部分は<b>差込形コネクタ 3本用×1（白）・2本用×2（帰り線イ・ロ）</b>でちょうど使い切る。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋接続・結線する端ごとに50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側は<b>切りっぱなし</b>なので足しません。PF管に通す IV も同じで、図の200mmに両端50mmずつ足して300mm。'
    ],

    /* ========== 単線図（左パネル） ========== */
    single: {
      viewBox: '0 20 470 330',
      lines: [
        { x1: 250, y1: 60, x2: 250, y2: 200 },    // 電源 → B（上から）
        { x1: 130, y1: 200, x2: 250, y2: 200 },   // A ↔ B
        { x1: 130, y1: 200, x2: 130, y2: 95 },    // A → ランプレセプタクル
        { x1: 130, y1: 200, x2: 130, y2: 305 },   // A → 引掛シーリング
        { x1: 250, y1: 200, x2: 250, y2: 290 },   // B → スイッチイ
        { x1: 250, y1: 200, x2: 400, y2: 200 }    // B → スイッチロ・コンセント（PF16）
      ],
      symbols: [
        { type: 'text', x: 236, y: 44, text: '電源', size: 15, weight: 700 },
        { type: 'text', x: 276, y: 45, text: '1φ2W 100V', size: 10, fill: 'muted' },
        { type: 'jb', x: 130, y: 200, r: 24, label: 'A' },
        { type: 'jb', x: 250, y: 200, r: 24, label: 'B', box: 'outlet' },
        { type: 'lamp', x: 130, y: 95, mark: 'ロ' },
        { type: 'ceiling', x: 130, y: 305, mark: 'イ' },
        { type: 'switch-dots', x: 250, y: 290, marks: ['イ'], gap: 0 },
        { type: 'conduit', x: 330, y: 186, text: 'PF16' },
        { type: 'text', x: 300, y: 224, text: 'IV1.6×3', size: 10, fill: 'muted' },
        { type: 'switch-dots', x: 400, y: 200, marks: ['ロ'], gap: 0 },
        { type: 'outlet', x: 400, y: 226 }
      ]
    },

    /* ========== 作業エリア ========== */
    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        id: 'src', type: 'source', group: 'src',
        x: 740, y: 115, label: '電源', note: '単相100V',
        shape: { rx: 138, ry: 58 },
        terminals: [
          { id: 'L', name: '非接地側 L（黒）', short: 'L 非接地側', kind: 'source-l', dx: 58, dy: -26, dir: 'right', labelDir: 'up' },
          { id: 'N', name: '接地側 N（白）', short: 'N 接地側', kind: 'source-n', dx: 58, dy: 26, dir: 'right', labelDir: 'down' }
        ]
      },
      {
        id: 'jbA', type: 'jointbox', group: 'jbA', connect: 'connector',
        x: 400, y: 400, r: 100, label: 'VVF用ジョイントボックス A'
      },
      {
        id: 'jbB', type: 'jointbox', group: 'jbB', connect: 'sleeve', box: 'outlet',
        x: 740, y: 400, r: 100, label: 'アウトレットボックス B'
      },
      {
        id: 'lamp', type: 'lamp', group: 'lamp',
        x: 400, y: 110, label: 'ランプレセプタクル', mark: 'ロ', loadName: 'ランプレセプタクル ロ',
        terminals: [
          { id: 'W', name: '受金ねじ部の端子（接地側・白）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '中心接触片の端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        id: 'ceil', type: 'ceiling', group: 'ceil',
        x: 400, y: 690, label: '引掛シーリング（角形）', mark: 'イ', loadName: '引掛シーリング イ',
        terminals: [
          { id: 'W', name: '接地側極端子（「接地側」表示・白）', short: '接地側', kind: 'load-n', dx: -54, dy: 30, dir: 'down' },
          { id: 'X', name: '非接地側極端子', short: '非接地側', kind: 'load-x', dx: 54, dy: 30, dir: 'down' }
        ]
      },
      {
        id: 'swI', type: 'switch', group: 'swI', poleSwap: true,
        x: 740, y: 690, label: '埋込連用タンブラスイッチ（単独）', mark: 'イ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'swRo', type: 'switch', group: 'frame', groupName: '連用箇所（スイッチロ＋コンセント）', poleSwap: true,
        x: 1030, y: 350, label: '埋込連用タンブラスイッチ', mark: 'ロ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: -12, dir: 'left', labelDir: 'up' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'oc', type: 'outlet', group: 'frame',
        x: 1030, y: 450, label: '埋込連用コンセント',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'outlet-n', dx: -72, dy: 16, dir: 'left', labelDir: 'down' },
          { id: 'L', name: '非接地側極端子', short: '非接地側', kind: 'outlet-l', dx: 72, dy: 0, dir: 'right' }
        ]
      }
    ],

    frames: [
      { x: 930, y: 296, w: 200, h: 212, label: '埋込連用取付枠' }
    ],

    /* 点滅器 → 負荷 の対応 */
    pairs: [
      { sw: 'swI', load: 'ceil', mark: 'イ' },
      { sw: 'swRo', load: 'lamp', mark: 'ロ' }
    ],

    runs: [
      { id: 'src-B', span: 150, cut: 200, a: 'src', b: 'jbB', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（電源・シース青）', at: [[660, 240]] },
      { id: 'A-B', span: 150, cut: 250, a: 'jbA', b: 'jbB', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[570, 332]] },
      { id: 'A-lamp', span: 150, cut: 250, a: 'jbA', b: 'lamp', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[300, 240]] },
      { id: 'A-ceil', span: 150, cut: 250, a: 'jbA', b: 'ceil', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[300, 575]] },
      { id: 'B-swI', span: 150, cut: 250, a: 'jbB', b: 'swI', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[660, 575]] },
      /* PF16 の中に IV1.6 を3本。上から 赤（→スイッチロ負荷側）・黒（→スイッチロ電源側）・白（→コンセントW） */
      { id: 'B-frame', span: 200, cut: 300, a: 'jbB', b: 'frame', slots: 3,
        need: ['iv16-red', 'iv16-black', 'iv16-white'],
        note: 'IV1.6 赤・黒・白（PF16 の中）', at: [[900, 282], [900, 216], [900, 540]],
        conduit: { kind: 'PF16', name: '合成樹脂製可とう電線管（PF16）', len: 70, metal: false,
          fitting: 'PF16用ボックスコネクタ', fittingAt: 'jbB', bushing: false, bond: false } },
      { id: 'frame-frame', a: 'frame', b: 'frame', slots: 0, free: true, note: 'わたり線（黒）' }
    ],

    /* 支給される材料 */
    supply: {
      cables: {
        'vvf20-2c':   { len: 250, count: 1 },
        'vvf16-2c':   { len: 1000, count: 1 },
        'vvf16-3c':   { len: 350, count: 1 },
        'iv16-black': { len: 500, count: 1 },
        'iv16-white': { len: 400, count: 1 },
        'iv16-red':   { len: 400, count: 1 }
      },
      connectors: { 2: 2, 3: 1, 4: 0 },
      sleeves: { '小': 6, '中': 0, '大': 0 }
    },

    /* ========== 模範解答 ========== */
    answer: {
      wires: [
        { a: 'src.N', b: 'jbB', color: 'white', role: '電源 接地側（N）' },
        { a: 'src.L', b: 'jbB', color: 'black', role: '電源 非接地側（L）' },

        { a: 'jbA', b: 'jbB', color: 'white', role: '接地側（3心の白）' },
        { a: 'jbA', b: 'jbB', color: 'red', role: 'ロの帰り線（3心の赤）' },
        { a: 'jbA', b: 'jbB', color: 'black', role: 'イの帰り線（3心の黒）' },

        { a: 'jbA', b: 'lamp.W', color: 'white', role: '接地側 → 受金ねじ部' },
        { a: 'jbA', b: 'lamp.X', color: 'black', role: 'ロの帰り線 → 中心接触片' },
        { a: 'jbA', b: 'ceil.W', color: 'white', role: '接地側 → 引掛シーリング 接地側' },
        { a: 'jbA', b: 'ceil.X', color: 'black', role: 'イの帰り線 → 引掛シーリング' },

        { a: 'jbB', b: 'swI.C', color: 'black', role: '非接地側 → スイッチイ 電源側' },
        { a: 'jbB', b: 'swI.L', color: 'white', role: 'イの帰り線（2心の相方＝白）' },

        { a: 'jbB', b: 'swRo.C', color: 'black', role: '非接地側 → スイッチロ 電源側（IV黒・PF16内）' },
        { a: 'jbB', b: 'swRo.L', color: 'red', role: 'ロの帰り線（IV赤・PF16内）' },
        { a: 'jbB', b: 'oc.W', color: 'white', role: '接地側 → コンセント W端子（IV白・PF16内）' },
        { a: 'swRo.C', b: 'oc.L', color: 'black', role: 'わたり線（黒）→ コンセント' }
      ],
      bundles: [
        { jb: 'jbB', wires: ['src.N|jbB', 'jbA|jbB:white', 'jbB|oc.W'], label: '接地側（白）3本＝スリーブ小・刻印小' },
        { jb: 'jbB', wires: ['src.L|jbB', 'jbB|swI.C', 'jbB|swRo.C'], label: '非接地側（黒）3本＝スリーブ小・刻印小' },
        { jb: 'jbB', wires: ['jbB|swRo.L', 'jbA|jbB:red'], label: 'ロの帰り 2本＝スリーブ小・刻印○' },
        { jb: 'jbB', wires: ['jbB|swI.L', 'jbA|jbB:black'], label: 'イの帰り 2本＝スリーブ小・刻印○' },

        { jb: 'jbA', wires: ['jbA|jbB:white', 'jbA|lamp.W', 'jbA|ceil.W'], label: '接地側（白）3本＝3本用' },
        { jb: 'jbA', wires: ['jbA|jbB:red', 'jbA|lamp.X'], label: 'ロの帰り 2本＝2本用' },
        { jb: 'jbA', wires: ['jbA|jbB:black', 'jbA|ceil.X'], label: 'イの帰り 2本＝2本用' }
      ],
      explain: [
        '<b>①接地側（白）を配る</b>：電源の白 → B → 3心の白 → A で ランプレセプタクルの受金ねじ部・引掛シーリングの接地側へ。B からは <b>IV白</b>（PF16の中）でコンセントの W端子へ。',
        '<b>②非接地側（黒）を配る</b>：電源の黒は B で「スイッチイ行きの2心の黒」と「スイッチロ行きの <b>IV黒</b>」に分ける。コンセントへはスイッチロの電源側から<b>わたり線（黒）</b>で送る。<b>A には非接地側は行かない</b>。',
        '<b>③スイッチイの帰り線</b>：スイッチイの負荷側（2心の白）→ B で 3心の黒とつなぐ → A で 引掛シーリングの非接地側へ行く黒とつなぐ。',
        '<b>④スイッチロの帰り線</b>：スイッチロの負荷側（<b>IV赤</b>）→ B で 3心の赤とつなぐ → A で ランプレセプタクルの中心接触片へ行く黒とつなぐ。3心の赤・黒の割り当て（イ／ロ）は入れ替えても正解。',
        '<b>⑤PF16とアウトレットボックス</b>：PF16用ボックスコネクタを<b>ボックス側</b>に付け、IV 黒・白・赤の3本を通す。4つの穴はすべて使い、PF16以外の3穴（電源・A・スイッチイ）には<b>ゴムブッシング（19）</b>を入れる。',
        '<b>B部分＝リングスリーブ「小」×4</b>：白3本（2.0×1＋1.6×2）＝刻印<b>小</b>、黒3本（2.0×1＋1.6×2）＝刻印<b>小</b>、イの帰り2本（1.6×2）＝刻印<b>○</b>、ロの帰り2本（1.6×2）＝刻印<b>○</b>。',
        '<b>A部分＝差込形コネクタ3か所</b>：白3本＝<b>3本用</b>、イの帰り2本・ロの帰り2本＝<b>2本用</b>×2。支給品をちょうど使い切る。',
        '<b>目で見て通電試験</b>：スイッチイで引掛シーリング、スイッチロでランプレセプタクルが点く。コンセントはスイッチに関係なく常時通電。'
      ]
    }
  };

  window.PROBLEMS.push(no12);
})();
