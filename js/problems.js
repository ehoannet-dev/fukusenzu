/* ===========================================================
   問題データ
   -----------------------------------------------------------
   単線図（配線図）と、作業エリアに並べる器具・端子・正解を定義する。

   端子の kind（採点で使う意味づけ）
     source-l : 電源の非接地側（L）
     source-n : 電源の接地側（N）
     load-n   : 負荷の接地側端子（引掛シーリングのW、ランプレセプタクルの受金 など）
     load-x   : 負荷の非接地側端子（スイッチからの帰り線が入る側）
     sw-com   : 点滅器の共通端子（電源の黒が入る側）
     sw-load  : 点滅器の負荷側端子（帰り線が出る側）
     outlet-n : コンセントの接地側（W）
     outlet-l : コンセントの非接地側
     tb-n     : 端子台・遮断器の接地側（N）          … No.3〜
     tb-l     : 端子台・遮断器の非接地側（L）
     earth    : 接地線の端子（緑）
     hot      : 200V の電圧極（極性なし）
     sw-trav  : 3路・4路スイッチの相互間の端子（side a / b）… No.6〜

   問題データは、この後に読み込む js/problems/noNN.js が window.PROBLEMS に1問ずつ足す。
   =========================================================== */

(function () {
  'use strict';

  /* ===========================================================
     支給されるケーブルの種類
       cores : 中に入っている心線（この色しか使えない）
       size  : 心線の太さ[mm]（リングスリーブの選定に使う）
     =========================================================== */
  const CABLES = {
    'vvf16-2c': {
      id: 'vvf16-2c', name: 'VVF1.6-2C', abbr: '1.6-2C', kana: 'VVF 1.6mm 2心',
      full: '600Vビニル絶縁ビニルシースケーブル平形 1.6mm 2心',
      cores: ['black', 'white'], size: 1.6, sheath: '#f0e4c6', edge: '#c3ab72'
    },
    'vvf16-3c': {
      id: 'vvf16-3c', name: 'VVF1.6-3C', abbr: '1.6-3C', kana: 'VVF 1.6mm 3心',
      full: '600Vビニル絶縁ビニルシースケーブル平形 1.6mm 3心',
      cores: ['black', 'white', 'red'], size: 1.6, sheath: '#f0e4c6', edge: '#c3ab72'
    },
    'vvf20-2c': {
      id: 'vvf20-2c', name: 'VVF2.0-2C', abbr: '2.0-2C', kana: 'VVF 2.0mm 2心（青）',
      full: '600Vビニル絶縁ビニルシースケーブル平形（シース青色）2.0mm 2心',
      cores: ['black', 'white'], size: 2.0, sheath: '#cfe0f2', edge: '#7a9cc0'
    },
    'vvf20-3c': {
      id: 'vvf20-3c', name: 'VVF2.0-3C', abbr: '2.0-3C', kana: 'VVF 2.0mm 3心（黒・白・赤）',
      full: '600Vビニル絶縁ビニルシースケーブル平形（シース青色）2.0mm 3心',
      cores: ['black', 'white', 'red'], size: 2.0, sheath: '#cfe0f2', edge: '#7a9cc0'
    },
    'vvf20-3cg': {
      id: 'vvf20-3cg', name: 'VVF2.0-3C（緑入）', abbr: '2.0-3C緑', kana: 'VVF 2.0mm 3心（黒・赤・緑）',
      full: '600Vビニル絶縁ビニルシースケーブル平形 2.0mm 3心（黒・赤・緑）',
      cores: ['black', 'red', 'green'], size: 2.0, sheath: '#f0e4c6', edge: '#c3ab72'
    },
    'iv16-green': {
      id: 'iv16-green', name: 'IV1.6 緑', abbr: 'IV緑', kana: 'IV 1.6mm 緑（接地線）',
      full: '600Vビニル絶縁電線 1.6mm 緑色（接地線）',
      cores: ['green'], size: 1.6, single: true, sheath: '#d7efdc', edge: '#5bab74'
    },
    /* 金属管・PF管に通す IV 単線（1色だけのケーブルとして扱う） */
    'iv16-black': {
      id: 'iv16-black', name: 'IV1.6 黒', abbr: 'IV黒', kana: 'IV 1.6mm 黒',
      full: '600Vビニル絶縁電線 1.6mm 黒', cores: ['black'], size: 1.6, single: true, sheath: '#cfd4da', edge: '#5d6670'
    },
    'iv16-white': {
      id: 'iv16-white', name: 'IV1.6 白', abbr: 'IV白', kana: 'IV 1.6mm 白',
      full: '600Vビニル絶縁電線 1.6mm 白', cores: ['white'], size: 1.6, single: true, sheath: '#f7f7f7', edge: '#a9b4bf'
    },
    'iv16-red': {
      id: 'iv16-red', name: 'IV1.6 赤', abbr: 'IV赤', kana: 'IV 1.6mm 赤',
      full: '600Vビニル絶縁電線 1.6mm 赤', cores: ['red'], size: 1.6, single: true, sheath: '#f4c7c3', edge: '#c0504a'
    },
    /* 丸形ケーブル（シースの中に介在物がある） */
    'vvr20-2c': {
      id: 'vvr20-2c', name: 'VVR2.0-2C', abbr: 'VVR2.0', kana: 'VVR 2.0mm 2心（丸形）',
      full: '600Vビニル絶縁ビニルシースケーブル丸形 2.0mm 2心', cores: ['black', 'white'], size: 2.0, round: true, sheath: '#e3e5e8', edge: '#8b939c'
    },
    'vvr16-2c': {
      id: 'vvr16-2c', name: 'VVR1.6-2C', abbr: 'VVR1.6', kana: 'VVR 1.6mm 2心（丸形）',
      full: '600Vビニル絶縁ビニルシースケーブル丸形 1.6mm 2心', cores: ['black', 'white'], size: 1.6, round: true, sheath: '#e3e5e8', edge: '#8b939c'
    },
    'eeef20-2c': {
      id: 'eeef20-2c', name: 'EM-EEF2.0-2C', abbr: 'EM2.0', kana: 'EM-EEF 2.0mm 2心',
      full: '600Vポリエチレン絶縁耐燃性ポリエチレンシースケーブル平形 2.0mm 2心',
      cores: ['black', 'white'], size: 2.0, sheath: '#d9ead0', edge: '#8fb583'
    }
  };
  window.CABLE_TYPES = CABLES;

  /* ---------- 公表問題 No.1 ---------- */
  const no1 = {
    id: 'no1',
    title: '公表問題 No.1',
    subtitle: '引掛シーリング＋ランプレセプタクル＋蛍光灯（施工省略）＋点滅器3個',
    source: '候補問題No.1｜配線図・材料・寸法・施工条件・解答＝令和7〜8年度の実出題6回分（R7上期7/19・7/20、R7下期12/13・12/14、R8上期7/18・7/19）で一致',

    conditions: [
      '<b>配線及び器具の配置</b>は、配線図のとおりに行う。「ロ」のタンブラスイッチは取付枠の<b>中央</b>に取り付ける。',
      '電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '電源から<b>点滅器</b>までの<b>非接地側電線</b>には、すべて<b>黒色</b>を使用する。',
      'ランプレセプタクルの<b>受金ねじ部端子</b>と引掛シーリングの<b>接地側極端子</b>には<b>白色</b>を結線する。',
      '<b>帰り線（点滅器と器具をつなぐ線）の色別は問わない</b>。使うケーブルの<b>残った心線の色</b>になる。',
      'ジョイントボックス部分を<b>経由する電線は、その部分ですべて接続</b>する（ボックスは省略）。',
      '接続は <b>A部分＝リングスリーブ</b>、<b>B部分＝差込形コネクタ</b>で行う。',
      '蛍光灯「ハ」は<b>施工省略</b>。ボックスから出た電線の先端までを配線する。'
    ],

    tips: [
      '<b>問題によってはL・Nの位置が決まっている</b>ので、配線図をよく見ること。',
      '3個の点滅器の電源側端子は、1本ずつ引かずに<b>渡り線</b>でまとめる（公式解答でも渡り線は<b>黒</b>）。',
      '<b>片切スイッチの2つの端子に極性はない</b>（黒はどちらに入れてもよい）。「0」の共通端子があるのは<b>3路スイッチ</b>だけ。3個とも<b>同じ側にそろえる</b>と渡り線が楽。',
      '電源L側は<b>どの点滅器から入れてもOK</b>。渡り線で残りの2個へ送る。',
      '2心ケーブルは<b>黒・白</b>、3心ケーブルは<b>黒・白・赤</b>。片方を使ったら、<b>残りの色</b>が自動的に決まる。',
      '「イ」は<b>位置表示灯内蔵スイッチ（ホタル）</b>。結線は片切と同じで、<b>スイッチがOFFのときに表示灯が光る</b>（異時点滅）。',
      '通電試験は迷路と同じ。<b>電源L → スイッチ → 器具 → 白線 → 電源N</b> とたどれたら点灯する。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋両端50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側と施工省略側は<b>切りっぱなし</b>なので足しません。'
    ],

    /* ========== 単線図（左パネル） ========== */
    single: {
      viewBox: '0 0 470 480',
      lines: [
        { x1: 55, y1: 250, x2: 175, y2: 250 },   // 電源 → A
        { x1: 175, y1: 250, x2: 330, y2: 250 },  // A ↔ B
        { x1: 175, y1: 250, x2: 175, y2: 116 },  // A → 引掛シーリング
        { x1: 330, y1: 250, x2: 330, y2: 122 },  // B → ランプレセプタクル
        { x1: 175, y1: 250, x2: 175, y2: 330 },  // A → 点滅器
        { x1: 175, y1: 330, x2: 175, y2: 396 },
        { x1: 330, y1: 250, x2: 330, y2: 372 }   // B → 蛍光灯
      ],
      symbols: [
        { type: 'text', x: 22, y: 240, text: '電源', size: 17, weight: 700 },
        { type: 'text', x: 22, y: 262, text: '1φ2W 100V', size: 10, fill: 'muted' },
        { type: 'jb', x: 175, y: 250, r: 30, label: 'A' },
        { type: 'jb', x: 330, y: 250, r: 30, label: 'B' },
        { type: 'ceiling', x: 175, y: 95, mark: 'イ' },
        { type: 'lamp', x: 330, y: 95, mark: 'ロ' },
        { type: 'switch-dots', x: 175, y: 330, marks: ['イ', 'ロ', 'ハ'], hotaru: [true, false, false], gap: 33 },
        { type: 'fluor-omitted', x: 330, y: 390, mark: 'ハ' }
      ]
    },

    /* ========== 作業エリア ========== */
    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        id: 'src', type: 'source', group: 'src',
        x: 95, y: 330, label: '電源', note: '単相100V',
        shape: { rx: 138, ry: 58 },
        terminals: [
          { id: 'L', name: '非接地側 L（黒）', short: 'L 非接地側', kind: 'source-l', dx: 58, dy: -26, dir: 'right', labelDir: 'up' },
          { id: 'N', name: '接地側 N（白）', short: 'N 接地側', kind: 'source-n', dx: 58, dy: 26, dir: 'right', labelDir: 'down' }
        ]
      },
      {
        id: 'jbA', type: 'jointbox', group: 'jbA', connect: 'sleeve',
        x: 455, y: 330, r: 115, label: 'ジョイントボックス A'
      },
      {
        id: 'jbB', type: 'jointbox', group: 'jbB', connect: 'connector',
        x: 910, y: 330, r: 115, label: 'ジョイントボックス B'
      },
      {
        id: 'ceil', type: 'ceiling', group: 'ceil',
        x: 455, y: 105, label: '引掛シーリング（角形）', mark: 'イ', loadName: '引掛シーリング イ',
        terminals: [
          { id: 'W', name: '接地側極端子（「接地側」またはW表示）', short: '接地側W', kind: 'load-n', dx: -50, dy: 30, dir: 'down' },
          { id: 'X', name: '非接地側極端子', short: '非接地側', kind: 'load-x', dx: 50, dy: 30, dir: 'down' }
        ]
      },
      {
        id: 'lamp', type: 'lamp', group: 'lamp',
        x: 910, y: 100, label: 'ランプレセプタクル', mark: 'ロ', loadName: 'ランプレセプタクル ロ',
        terminals: [
          { id: 'W', name: '受金ねじ部端子（接地側）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '中心端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        id: 'fl', type: 'fluorescent', group: 'fl', omitted: true,
        x: 985, y: 620, label: '蛍光灯', mark: 'ハ', loadName: '蛍光灯 ハ（施工省略）',
        omitBox: { x: 830, y: 520, w: 330, h: 200, text: '施工省略' },
        terminals: [
          { id: 'W', name: '接地側', short: '接地側', kind: 'load-n', dx: -46, dy: -40, dir: 'up' },
          { id: 'X', name: '非接地側', short: '非接地側', kind: 'load-x', dx: 46, dy: -40, dir: 'up' }
        ]
      },
      {
        id: 'swI', type: 'switch', group: 'swBox', groupName: '点滅器（3個連用）', variant: 'pilot', poleSwap: true,
        x: 425, y: 552, label: '位置表示灯内蔵スイッチ', mark: 'イ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'swRo', type: 'switch', group: 'swBox', poleSwap: true,
        x: 425, y: 630, label: '片切スイッチ', mark: 'ロ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'swHa', type: 'switch', group: 'swBox', poleSwap: true,
        x: 425, y: 708, label: '片切スイッチ', mark: 'ハ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      }
    ],

    frames: [
      { x: 325, y: 508, w: 200, h: 248, label: '埋込連用取付枠（3個）' }
    ],

    /* 点滅器 → 負荷 の対応 */
    pairs: [
      { sw: 'swI', load: 'ceil', mark: 'イ' },
      { sw: 'swRo', load: 'lamp', mark: 'ロ' },
      { sw: 'swHa', load: 'fl', mark: 'ハ' }
    ],

    /* ケーブルを置く区間
         slots : この区間に通すケーブルの本数（＝置き場の数）
         need  : 正しいケーブルの種類（採点に使う。置くのは利用者）
         free  : ケーブル不要（渡り線）  */
    runs: [
      { id: 'src-A', span: 150, cut: 200, a: 'src', b: 'jbA', slots: 1, need: 'eeef20-2c', note: 'EM-EEF2.0-2C（電源）', at: [[250, 432]] },
      { id: 'A-ceil', span: 150, cut: 250, a: 'jbA', b: 'ceil', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[286, 168]] },
      { id: 'A-sw', span: 150, cut: 250, a: 'jbA', b: 'swBox', slots: 2, need: 'vvf16-2c', note: 'VVF1.6-2C ×2本', at: [[176, 512], [176, 600]] },
      { id: 'A-B', span: 150, cut: 250, a: 'jbA', b: 'jbB', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[682, 252]] },
      { id: 'B-lamp', span: 150, cut: 250, a: 'jbB', b: 'lamp', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[1108, 196]] },
      { id: 'B-fl', span: 150, cut: 200, a: 'jbB', b: 'fl', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（施工省略）', at: [[726, 546]] },
      { id: 'sw-sw', a: 'swBox', b: 'swBox', slots: 0, free: true, note: '渡り線（黒）' }
    ],

    /* 支給される材料 */
    supply: {
      cables: {
        'eeef20-2c': { len: 250, count: 1 },
        'vvf16-2c':  { len: 900, count: 2 },
        'vvf16-3c':  { len: 350, count: 1 }
      },
      connectors: { 2: 2, 3: 1, 4: 0 },
      sleeves: { '小': 8, '中': 0, '大': 0 }
    },

    /* ========== 模範解答 ========== */
    answer: {
      wires: [
        { a: 'src.L', b: 'jbA', color: 'black', role: '電源 非接地側（L）' },
        { a: 'src.N', b: 'jbA', color: 'white', role: '電源 接地側（N）' },

        { a: 'jbA', b: 'ceil.W', color: 'white', role: '接地側 → 引掛シーリング W' },
        { a: 'jbA', b: 'ceil.X', color: 'black', role: 'イの帰り線（2心の相方＝黒）' },

        { a: 'jbA', b: 'swI.C', color: 'black', role: '電源 L → 点滅器 電源側端子' },
        { a: 'swI.C', b: 'swRo.C', color: 'black', role: '渡り線（黒）' },
        { a: 'swRo.C', b: 'swHa.C', color: 'black', role: '渡り線（黒）' },

        { a: 'jbA', b: 'swI.L', color: 'white', role: 'イの帰り線（1本目2心の相方＝白）' },
        { a: 'jbA', b: 'swRo.L', color: 'black', role: 'ロの帰り線（2本目2心の黒）' },
        { a: 'jbA', b: 'swHa.L', color: 'white', role: 'ハの帰り線（2本目2心の白）' },

        { a: 'jbA', b: 'jbB', color: 'white', role: '接地側（3心の白）' },
        { a: 'jbA', b: 'jbB', color: 'black', role: 'ロの帰り線（3心の黒）' },
        { a: 'jbA', b: 'jbB', color: 'red', role: 'ハの帰り線（3心の赤）' },

        { a: 'jbB', b: 'lamp.W', color: 'white', role: '接地側 → 受金ねじ部' },
        { a: 'jbB', b: 'lamp.X', color: 'black', role: 'ロの帰り線 → 中心端子' },

        { a: 'jbB', b: 'fl.W', color: 'white', role: '接地側 → 蛍光灯' },
        { a: 'jbB', b: 'fl.X', color: 'black', role: 'ハの帰り線 → 蛍光灯' }
      ],
      bundles: [
        { jb: 'jbA', wires: ['src.N|jbA', 'jbA|ceil.W', 'jbA|jbB:white'], label: '接地側（白）3本' },
        { jb: 'jbA', wires: ['src.L|jbA', 'jbA|swI.C'], label: '非接地側（黒）2本' },
        { jb: 'jbA', wires: ['jbA|ceil.X', 'jbA|swI.L'], label: 'イの帰り 2本' },
        { jb: 'jbA', wires: ['jbA|swRo.L', 'jbA|jbB:black'], label: 'ロの帰り 2本' },
        { jb: 'jbA', wires: ['jbA|swHa.L', 'jbA|jbB:red'], label: 'ハの帰り 2本' },

        { jb: 'jbB', wires: ['jbA|jbB:white', 'jbB|lamp.W', 'jbB|fl.W'], label: '接地側（白）3本' },
        { jb: 'jbB', wires: ['jbA|jbB:black', 'jbB|lamp.X'], label: 'ロの帰り 2本' },
        { jb: 'jbB', wires: ['jbA|jbB:red', 'jbB|fl.X'], label: 'ハの帰り 2本' }
      ],
      explain: [
        '<b>①電源N側（白線）をランプ類に繋ぐ</b>：引掛シーリングのW／ランプレセプタクルの受金ねじ部／蛍光灯へ、スイッチを通さず<b>直接</b>。ボックス内で白どうしを接続する。',
        '<b>②電源L側（黒線）をスイッチに繋ぐ</b>：点滅器の<b>電源側端子</b>へ。3個の電源側端子は<b>渡り線（黒）</b>で送る（1本ずつ引かない）。どの点滅器から入れてもよい。',
        '<b>③対応するスイッチとランプ類を繋ぐ</b>：イ→引掛シーリング／ロ→ランプレセプタクル／ハ→蛍光灯。これが<b>帰り線（戻り線）</b>で、色別は問わない。',
        '<b>色は「残った心線」で決まる</b>：A→点滅器の1本目は 黒＝共通・<b>白＝イの帰り</b>。2本目は 黒＝ロの帰り・白＝ハの帰り。A-B間の3心は 白＝接地側・黒＝ロの帰り・<b>赤＝ハの帰り</b>。',
        '<b>A部分＝リングスリーブ5か所</b>：白3本（2.0×1＋1.6×2）は「小・刻印<b>小</b>」、黒2本（2.0＋1.6）は「小・刻印<b>小</b>」、帰り線2本×3か所は「小・刻印<b>○</b>」。',
        '<b>B部分＝差込形コネクタ3か所</b>：白3本は<b>3本用</b>、ロの帰り2本とハの帰り2本は<b>2本用</b>。',
        '<b>目で見て通電試験</b>：電源Lから線をたどり、スイッチ→器具→白線→電源Nに戻れれば点灯。イ・ロ・ハがそれぞれ対応していることを確認する。'
      ]
    }
  };

  /* ---------- 公表問題 No.2 ---------- */
  const no2 = {
    id: 'no2',
    title: '公表問題 No.2',
    subtitle: 'ランプレセプタクル2個（1個は施工省略）＋パイロットランプ（常時点灯）＋コンセント2個',
    source: '候補問題No.2｜配線図＝令和6〜8年度の公表PDF（同一）／材料・寸法・施工条件・解答＝令和7〜8年度の実出題5回分で一致',

    conditions: [
      '配線及び器具の配置は、配線図のとおりに行う。',
      '<b>確認表示灯（パイロットランプ）は「常時点灯」</b>とする（点滅器を通さない）。',
      '電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '電源から<b>点滅器・パイロットランプ・コンセント</b>までの<b>非接地側電線</b>には、すべて<b>黒色</b>を使用する。',
      '<b>コンセントの接地側極端子（W表示）</b>と、ランプレセプタクルの<b>受金ねじ部端子</b>には<b>白色</b>を結線する。',
      'ジョイントボックス部分を<b>経由する電線は、その部分ですべて接続</b>する（ボックスは省略）。',
      '接続は <b>A部分＝リングスリーブ</b>、<b>B部分＝差込形コネクタ</b>で行う。',
      '<b>埋込連用取付枠</b>は、<b>タンブラスイッチ及びパイロットランプ</b>の部分に使用する（コンセント側には使わない）。',
      '図で囲んだ<b>ランプレセプタクル「イ」は施工省略</b>。ボックスから出た電線の先端までを配線する。'
    ],

    tips: [
      '<b>1個のスイッチ「イ」で、ランプレセプタクル2個を同時に点滅</b>させる。帰り線は3本まとめて接続する。',
      '<b>パイロットランプは「常時点灯」</b>。コンセントと同じ扱いで、<b>黒（非接地側）と白（接地側）を直接つなぐ</b>。スイッチの負荷側につなぐと「同時点滅」になってしまい欠陥。',
      'スイッチとパイロットランプは同じ取付枠に並ぶので、<b>黒はわたり線</b>で送る（色は黒）。',
      '<b>施工省略でも、ケーブルは必ず引く</b>。器具だけを省略する。この100mmを付け忘れるのがNo.2で一番多いミス。',
      '<b>電源は VVF2.0-2C（シース青色）</b>。A部分のリングスリーブは、この2.0mmが混ざる2か所が<b>刻印「小」</b>、1.6mm×2本の帰り線だけが<b>刻印「○」</b>。',
      'B部分の<b>接地側（白）は4本</b>になる。<b>差込形コネクタ4本用</b>はここに使う（黒側に使わない）。',
      '<b>コンセント2個は送り配線</b>でつなぐ。2口コンセントのW端子から、もう1個のW端子へ白を送る。',
      '通電試験：<b>コンセントとパイロットランプはスイッチを切っても点いたまま</b>、ランプレセプタクル2個はスイッチ「イ」で同時に点く、が正解。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋両端50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側と施工省略側は<b>切りっぱなし</b>なので足しません。'
    ],

    /* ========== 単線図（左パネル） ========== */
    single: {
      viewBox: '0 70 470 310',
      lines: [
        { x1: 50, y1: 215, x2: 128, y2: 215 },    // 電源 → A
        { x1: 128, y1: 215, x2: 268, y2: 215 },   // A ↔ B
        { x1: 128, y1: 215, x2: 128, y2: 140 },   // A → ランプレセプタクル
        { x1: 268, y1: 215, x2: 268, y2: 168 },   // B → PL・スイッチ
        { x1: 268, y1: 215, x2: 368, y2: 215 },   // B → 施工省略のランプレセプタクル
        { x1: 268, y1: 215, x2: 268, y2: 340 },   // B → 2口コンセント
        { x1: 160, y1: 340, x2: 268, y2: 340 }    // 2口コンセント → 連用コンセント
      ],
      symbols: [
        { type: 'text', x: 14, y: 205, text: '電源', size: 16, weight: 700 },
        { type: 'text', x: 14, y: 226, text: '1φ2W 100V', size: 10, fill: 'muted' },
        { type: 'jb', x: 128, y: 215, r: 26, label: 'A' },
        { type: 'jb', x: 268, y: 215, r: 26, label: 'B' },
        { type: 'lamp', x: 128, y: 113, mark: 'イ' },
        { type: 'pilot', x: 268, y: 116, label: '確認表示灯' },
        { type: 'switch-dots', x: 268, y: 155, marks: ['イ'], gap: 0 },
        { type: 'omit-box', x: 336, y: 172, w: 128, h: 92, text: '施工省略' },
        { type: 'lamp', x: 385, y: 215, mark: 'イ' },
        { type: 'outlet', x: 268, y: 340, count: 2 },
        { type: 'outlet', x: 160, y: 340 }
      ]
    },

    /* ========== 作業エリア ========== */
    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        id: 'src', type: 'source', group: 'src',
        x: 95, y: 330, label: '電源', note: '単相100V',
        shape: { rx: 138, ry: 58 },
        terminals: [
          { id: 'L', name: '非接地側 L（黒）', short: 'L 非接地側', kind: 'source-l', dx: 58, dy: -26, dir: 'right', labelDir: 'up' },
          { id: 'N', name: '接地側 N（白）', short: 'N 接地側', kind: 'source-n', dx: 58, dy: 26, dir: 'right', labelDir: 'down' }
        ]
      },
      {
        id: 'jbA', type: 'jointbox', group: 'jbA', connect: 'sleeve',
        x: 420, y: 330, r: 104, label: 'ジョイントボックス A'
      },
      {
        id: 'jbB', type: 'jointbox', group: 'jbB', connect: 'connector',
        x: 812, y: 330, r: 104, label: 'ジョイントボックス B'
      },
      {
        id: 'lamp', type: 'lamp', group: 'lamp',
        x: 420, y: 112, label: 'ランプレセプタクル', mark: 'イ', loadName: 'ランプレセプタクル イ',
        terminals: [
          { id: 'W', name: '受金ねじ部端子（接地側）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '中心端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        id: 'lampO', type: 'lamp', group: 'lampO', omitted: true,
        x: 1110, y: 322, label: 'ランプレセプタクル', mark: 'イ',
        groupName: 'ランプレセプタクル イ（施工省略）', loadName: 'ランプレセプタクル イ（施工省略）',
        omitBox: { x: 990, y: 232, w: 240, h: 240, text: '施工省略' },
        terminals: [
          { id: 'W', name: '受金ねじ部端子（接地側）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 42, dir: 'down' },
          { id: 'X', name: '中心端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 42, dir: 'down' }
        ]
      },
      {
        id: 'pl', type: 'pilot', group: 'plBox', groupName: 'パイロットランプ＋点滅器（連用）',
        x: 812, y: 82, label: '確認表示灯（パイロットランプ）', note: '常時点灯',
        terminals: [
          { id: 'W', name: '接地側端子（白）', short: '接地側', kind: 'outlet-n', dx: -80, dy: 0, dir: 'left' },
          { id: 'L', name: '非接地側端子（黒）', short: '非接地側', kind: 'outlet-l', dx: 80, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'sw', type: 'switch', group: 'plBox', poleSwap: true,
        x: 812, y: 176, label: '埋込連用タンブラスイッチ', mark: 'イ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'o2', type: 'outlet', group: 'o2',
        x: 812, y: 636, label: '埋込コンセント（2口）',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'outlet-n', dx: -72, dy: -20, dir: 'left' },
          { id: 'L', name: '非接地側極端子', short: '非接地側', kind: 'outlet-l', dx: -72, dy: 20, dir: 'left' }
        ]
      },
      {
        id: 'o1', type: 'outlet', group: 'o1',
        x: 360, y: 636, label: '埋込連用コンセント',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'outlet-n', dx: 72, dy: -20, dir: 'right' },
          { id: 'L', name: '非接地側極端子', short: '非接地側', kind: 'outlet-l', dx: 72, dy: 20, dir: 'right' }
        ]
      }
    ],

    frames: [
      { x: 712, y: 36, w: 200, h: 186, label: '埋込連用取付枠', labelDx: -74 }
    ],

    /* 点滅器 → 負荷 の対応（1個のスイッチで2個のランプレセプタクル） */
    pairs: [
      { sw: 'sw', load: 'lamp', mark: 'イ' },
      { sw: 'sw', load: 'lampO', mark: 'イ' }
    ],

    runs: [
      { id: 'src-A', span: 150, cut: 200, a: 'src', b: 'jbA', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（電源・シース青）', at: [[248, 424]] },
      { id: 'A-lamp', span: 150, cut: 250, a: 'jbA', b: 'lamp', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[256, 220]] },
      { id: 'A-B', span: 150, cut: 250, a: 'jbA', b: 'jbB', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[616, 288]] },
      { id: 'B-plsw', span: 150, cut: 250, a: 'jbB', b: 'plBox', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[938, 244]] },
      { id: 'B-lampO', span: 100, cut: 150, a: 'jbB', b: 'lampO', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（施工省略へ）', at: [[955, 392]] },
      { id: 'B-o2', span: 150, cut: 250, a: 'jbB', b: 'o2', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[896, 502]] },
      { id: 'o2-o1', span: 150, cut: 250, a: 'o2', b: 'o1', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（送り配線）', at: [[604, 712]] },
      { id: 'pl-sw', a: 'plBox', b: 'plBox', slots: 0, free: true, note: 'わたり線（黒）' }
    ],

    /* 支給される材料 */
    supply: {
      cables: {
        'vvf20-2c':  { len: 250, count: 1 },
        'vvf16-2c':  { len: 1250, count: 1 },
        'vvf16-3c':  { len: 800, count: 1 }
      },
      connectors: { 2: 0, 3: 2, 4: 1 },
      sleeves: { '小': 5, '中': 0, '大': 0 }
    },

    /* ========== 模範解答 ========== */
    answer: {
      wires: [
        { a: 'src.L', b: 'jbA', color: 'black', role: '電源 非接地側（L）' },
        { a: 'src.N', b: 'jbA', color: 'white', role: '電源 接地側（N）' },

        { a: 'jbA', b: 'lamp.W', color: 'white', role: '接地側 → 受金ねじ部' },
        { a: 'jbA', b: 'lamp.X', color: 'black', role: 'イの帰り線（2心の相方＝黒）' },

        { a: 'jbA', b: 'jbB', color: 'white', role: '接地側（3心の白）' },
        { a: 'jbA', b: 'jbB', color: 'black', role: '非接地側（3心の黒）' },
        { a: 'jbA', b: 'jbB', color: 'red', role: 'イの帰り線（3心の赤）' },

        { a: 'jbB', b: 'pl.W', color: 'white', role: '接地側 → パイロットランプ（常時点灯）' },
        { a: 'jbB', b: 'sw.C', color: 'black', role: '非接地側 → 点滅器 電源側端子' },
        { a: 'jbB', b: 'sw.L', color: 'red', role: 'イの帰り線（3心の赤）' },
        { a: 'sw.C', b: 'pl.L', color: 'black', role: 'わたり線（黒）→ パイロットランプ' },

        { a: 'jbB', b: 'lampO.W', color: 'white', role: '接地側 → 施工省略のランプレセプタクル' },
        { a: 'jbB', b: 'lampO.X', color: 'black', role: 'イの帰り線 → 施工省略のランプレセプタクル' },

        { a: 'jbB', b: 'o2.W', color: 'white', role: '接地側 → コンセント（2口）W端子' },
        { a: 'jbB', b: 'o2.L', color: 'black', role: '非接地側 → コンセント（2口）' },

        { a: 'o2.W', b: 'o1.W', color: 'white', role: '送り配線（接地側・白）' },
        { a: 'o2.L', b: 'o1.L', color: 'black', role: '送り配線（非接地側・黒）' }
      ],
      bundles: [
        { jb: 'jbA', wires: ['src.N|jbA', 'jbA|lamp.W', 'jbA|jbB:white'], label: '接地側（白）3本' },
        { jb: 'jbA', wires: ['src.L|jbA', 'jbA|jbB:black'], label: '非接地側（黒）2本' },
        { jb: 'jbA', wires: ['jbA|lamp.X', 'jbA|jbB:red'], label: 'イの帰り 2本' },

        { jb: 'jbB', wires: ['jbA|jbB:white', 'jbB|pl.W', 'jbB|lampO.W', 'jbB|o2.W'], label: '接地側（白）4本' },
        { jb: 'jbB', wires: ['jbA|jbB:black', 'jbB|sw.C', 'jbB|o2.L'], label: '非接地側（黒）3本' },
        { jb: 'jbB', wires: ['jbA|jbB:red', 'jbB|sw.L', 'jbB|lampO.X'], label: 'イの帰り 3本' }
      ],
      explain: [
        '<b>①接地側（白）をすべての「電気を使うもの」へ</b>：ランプレセプタクル2個の受金ねじ部、コンセント2個のW端子、パイロットランプ。スイッチは通さない。Aで3本、Bで4本の接続になる。',
        '<b>②非接地側（黒）を、点滅器・コンセント・パイロットランプへ</b>：電源の黒を A → B と送り、Bで「点滅器の電源側」「コンセント」へ分ける。パイロットランプへは点滅器から<b>わたり線（黒）</b>で送る。',
        '<b>③パイロットランプは「常時点灯」</b>：黒と白を直接つなぐだけ。スイッチの負荷側（赤）につなぐと「同時点滅」になり欠陥。',
        '<b>④スイッチ「イ」の帰り線は3本</b>：点滅器の負荷側（赤）→ Bで「A行きの赤」と「施工省略のランプレセプタクル行きの黒」とまとめる。Aでは「B からの赤」と「ランプレセプタクル行きの黒」をまとめる。これで<b>1個のスイッチが2個のランプレセプタクルを同時に点滅</b>させる。',
        '<b>⑤コンセントは送り配線</b>：2口コンセントのW端子から、もう1個のコンセントのW端子へ白。非接地側も同じように黒で送る。',
        '<b>A部分＝リングスリーブ3か所</b>：白3本（2.0×1＋1.6×2）は「小・刻印<b>小</b>」、黒2本（2.0×1＋1.6×1）も「小・刻印<b>小</b>」、帰り線2本（1.6×2）だけが「小・刻印<b>○</b>」。<b>電源が2.0mmなので黒2本を「○」にしないこと</b>。',
        '<b>B部分＝差込形コネクタ3か所</b>：白4本は<b>4本用</b>、黒3本と帰り線3本は<b>3本用</b>。',
        '<b>目で見て通電試験</b>：スイッチを切ってもコンセント2個とパイロットランプは通電、スイッチ「イ」を入れるとランプレセプタクル2個が<b>同時に</b>点灯すれば正解。'
      ]
    }
  };

  /* ---------- 公表問題 No.3 ---------- */
  const no3 = {
    id: 'no3',
    title: '公表問題 No.3',
    subtitle: 'タイムスイッチ（端子台代用）＋接地極付コンセント＋接地線（緑）',
    source: '候補問題No.3｜配線図＝令和8年度の公表PDF／材料・寸法・施工条件・解答＝令和7〜8年度の実出題4回分で一致',

    conditions: [
      '配線及び器具の配置は、配線図のとおりに行う。<b>タイムスイッチは端子台で代用</b>する。',
      '電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '電源から<b>点滅器・コンセント・タイムスイッチ</b>までの<b>非接地側電線</b>には、すべて<b>黒色</b>を使用する。',
      '<b>接地線には緑色</b>を使用する。',
      '次の器具の端子には<b>白色</b>を結線する：コンセントの接地側極端子（W表示）／ランプレセプタクルの受金ねじ部／引掛シーリングの接地側極端子／<b>タイムスイッチ（端子台）の S2 端子</b>。',
      'ジョイントボックス部分を<b>経由する電線は、その部分ですべて接続</b>する（ボックスは省略）。',
      '接続は <b>A部分＝リングスリーブ</b>、<b>B部分＝差込形コネクタ</b>で行う。',
      '<b>埋込連用取付枠は、コンセント部分</b>に使用する。',
      '図で囲んだ<b>接地極 ED は施工省略</b>。緑線の先端までを配線する。'
    ],

    tips: [
      '<b>タイムスイッチの端子台は S1・S2・L1 の3極</b>。S1＝非接地側（黒）、S2＝接地側（白）、L1＝接点の出口（黒→引掛シーリング）。',
      '<b>S2 には白が2本</b>入る（ジョイントボックスBからの白と、引掛シーリングの接地側へ行く白）。引掛シーリングの白は<b>ボックスからではなく端子台から</b>取る。',
      'タイムスイッチの中では、S1–S2 間に<b>時計用モーター</b>、S1–L1 間に<b>接点</b>がある。モーターは常に通電し、接点が閉じると引掛シーリングが点く。',
      '<b>引掛シーリング「イ」はジョイントボックスを通らない</b>。端子台から直接つながる。',
      '<b>接地線は緑だけ</b>。コンセントの接地極端子（⏚）から接地極 ED へ1本引く。電圧のかかる端子に緑を入れてはいけない。',
      '<b>電源は VVF2.0-2C（シース青色）</b>。A部分の刻印は、2.0mmが混ざる2か所が「小」、1.6mm×2本の帰り線だけが「○」。',
      'B部分は<b>差込形コネクタ 2本用・3本用・4本用を各1個</b>、ちょうど使い切る（黒3本／白4本／帰り線2本）。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋両端50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側と施工省略側は<b>切りっぱなし</b>なので足しません。'
    ],

    single: {
      viewBox: '0 20 470 330',
      lines: [
        { x1: 52, y1: 150, x2: 120, y2: 150 },    // 電源 → A
        { x1: 120, y1: 150, x2: 282, y2: 150 },   // A ↔ B
        { x1: 120, y1: 150, x2: 120, y2: 258 },   // A → 点滅器ロ
        { x1: 282, y1: 150, x2: 282, y2: 82 },    // B → TS
        { x1: 304, y1: 62, x2: 352, y2: 62 },     // TS → 引掛シーリング
        { x1: 282, y1: 150, x2: 373, y2: 150 },   // B → ランプレセプタクル
        { x1: 282, y1: 150, x2: 282, y2: 296 },   // B → コンセント
        { x1: 282, y1: 296, x2: 380, y2: 296 }    // コンセント → ED（接地線）
      ],
      symbols: [
        { type: 'text', x: 14, y: 140, text: '電源', size: 15, weight: 700 },
        { type: 'text', x: 14, y: 161, text: '1φ2W 100V', size: 10, fill: 'muted' },
        { type: 'jb', x: 120, y: 150, r: 26, label: 'A' },
        { type: 'jb', x: 282, y: 150, r: 26, label: 'B' },
        { type: 'tb', x: 282, y: 62, rows: ['TS'], w: 44, mark: 'イ' },
        { type: 'ceiling', x: 397, y: 62, mark: 'イ' },
        { type: 'lamp', x: 400, y: 150, mark: 'ロ' },
        { type: 'switch-dots', x: 120, y: 268, marks: ['ロ'], gap: 0 },
        { type: 'outlet', x: 282, y: 296, mark: 'E' },
        { type: 'omit-box', x: 352, y: 262, w: 108, h: 74, text: '施工省略' },
        { type: 'earth', x: 398, y: 296, label: 'ED' }
      ]
    },

    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        id: 'src', type: 'source', group: 'src',
        x: 92, y: 340, label: '電源', note: '単相100V',
        shape: { rx: 138, ry: 58 },
        terminals: [
          { id: 'L', name: '非接地側 L（黒）', short: 'L 非接地側', kind: 'source-l', dx: 58, dy: -26, dir: 'right', labelDir: 'up' },
          { id: 'N', name: '接地側 N（白）', short: 'N 接地側', kind: 'source-n', dx: 58, dy: 26, dir: 'right', labelDir: 'down' }
        ]
      },
      { id: 'jbA', type: 'jointbox', group: 'jbA', connect: 'sleeve', x: 400, y: 340, r: 100, label: 'ジョイントボックス A' },
      { id: 'jbB', type: 'jointbox', group: 'jbB', connect: 'connector', x: 790, y: 340, r: 100, label: 'ジョイントボックス B' },
      {
        id: 'ts', type: 'terminal', group: 'ts',
        x: 700, y: 120, shape: { rx: 100, ry: 58 },
        label: '端子台（タイムスイッチ代用）', mark: 'イ', note: '入＝接点が閉じる',
        contacts: [['S1', 'L1']],
        terminals: [
          { id: 'S1', tbName: 'S1', name: 'S1（非接地側・黒）', short: 'S1', kind: 'tb-l', dx: -76, dy: 58, dir: 'down' },
          { id: 'S2', tbName: 'S2', name: 'S2（接地側・白）', short: 'S2', kind: 'tb-n', dx: 0, dy: 58, dir: 'down', max: 2 },
          { id: 'L1', tbName: 'L1', name: 'L1（接点の出口）', short: 'L1', kind: 'sw-load', dx: 76, dy: 58, dir: 'down' }
        ]
      },
      {
        id: 'ceil', type: 'ceiling', group: 'ceil',
        x: 1062, y: 120, label: '引掛シーリング（角形）', mark: 'イ', loadName: '引掛シーリング イ',
        terminals: [
          { id: 'W', name: '接地側極端子（「接地側」表示）', short: '接地側W', kind: 'load-n', dx: -54, dy: 30, dir: 'down' },
          { id: 'X', name: '非接地側極端子', short: '非接地側', kind: 'load-x', dx: 54, dy: 30, dir: 'down' }
        ]
      },
      {
        id: 'lamp', type: 'lamp', group: 'lamp',
        x: 1108, y: 344, label: 'ランプレセプタクル', mark: 'ロ', loadName: 'ランプレセプタクル ロ',
        terminals: [
          { id: 'W', name: '受金ねじ部端子（接地側）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '中心端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        id: 'swRo', type: 'switch', group: 'swRo', poleSwap: true,
        x: 400, y: 650, label: '埋込連用タンブラスイッチ', mark: 'ロ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'oe', type: 'outlet', group: 'oe',
        x: 790, y: 650, label: '埋込連用接地極付コンセント', note: 'E',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'outlet-n', dx: -72, dy: -22, dir: 'left', labelDir: 'left' },
          { id: 'L', name: '非接地側極端子', short: '非接地側', kind: 'outlet-l', dx: -72, dy: 22, dir: 'left', labelDir: 'left' },
          { id: 'E', name: '接地極端子（⏚・緑）', short: '接地極', kind: 'earth', dx: 72, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'ed', type: 'earth', group: 'ed', omitted: true,
        x: 1090, y: 660, label: '接地極 ED',
        omitBox: { x: 972, y: 556, w: 236, h: 190, text: '施工省略' },
        terminals: [
          { id: 'E', name: '接地極（D種接地）', short: '接地極 ED', kind: 'earth', dx: 0, dy: -44, dir: 'up' }
        ]
      }
    ],

    frames: [
      { x: 692, y: 590, w: 196, h: 124, label: '埋込連用取付枠', labelDx: -74 }
    ],

    pairs: [
      { sw: 'ts', load: 'ceil', mark: 'イ' },
      { sw: 'swRo', load: 'lamp', mark: 'ロ' }
    ],

    /* 100V 以外の回路（接地線） */
    nets: [
      { id: 'earth', name: '接地線（緑）',
        groups: [['oe.E'], ['ed.E']],
        bad: '接地線（緑）がつながっていません',
        hint: 'コンセントの接地極端子（⏚）と接地極 ED を、<b>緑色</b>の電線でつなぎます。' }
    ],

    runs: [
      { id: 'src-A', span: 150, cut: 200, a: 'src', b: 'jbA', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（電源・シース青）', at: [[210, 438]] },
      { id: 'A-sw', span: 150, cut: 250, a: 'jbA', b: 'swRo', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[298, 524]] },
      { id: 'A-B', span: 150, cut: 250, a: 'jbA', b: 'jbB', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[595, 296]] },
      { id: 'B-ts', span: 150, cut: 250, a: 'jbB', b: 'ts', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[884, 252]] },
      { id: 'ts-ceil', span: 200, cut: 300, a: 'ts', b: 'ceil', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（200mm）', at: [[906, 124]] },
      { id: 'B-lamp', span: 150, cut: 250, a: 'jbB', b: 'lamp', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[930, 398]] },
      { id: 'B-oe', span: 150, cut: 250, a: 'jbB', b: 'oe', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[890, 506]] },
      { id: 'oe-ed', span: 100, cut: 150, a: 'oe', b: 'ed', slots: 1, need: 'iv16-green', note: 'IV1.6 緑（接地線）', at: [[944, 726]] }
    ],

    supply: {
      cables: {
        'vvf20-2c':   { len: 250, count: 1 },
        'vvf16-2c':   { len: 1650, count: 1 },
        'vvf16-3c':   { len: 350, count: 1 },
        'iv16-green': { len: 150, count: 1 }
      },
      connectors: { 2: 1, 3: 1, 4: 1 },
      sleeves: { '小': 5, '中': 0, '大': 0 }
    },

    answer: {
      wires: [
        { a: 'src.L', b: 'jbA', color: 'black', role: '電源 非接地側（L）' },
        { a: 'src.N', b: 'jbA', color: 'white', role: '電源 接地側（N）' },

        { a: 'jbA', b: 'swRo.C', color: 'black', role: '非接地側 → 点滅器ロ 電源側端子' },
        { a: 'jbA', b: 'swRo.L', color: 'white', role: 'ロの帰り線（2心の相方＝白）' },

        { a: 'jbA', b: 'jbB', color: 'black', role: '非接地側（3心の黒）' },
        { a: 'jbA', b: 'jbB', color: 'white', role: '接地側（3心の白）' },
        { a: 'jbA', b: 'jbB', color: 'red', role: 'ロの帰り線（3心の赤）' },

        { a: 'jbB', b: 'ts.S1', color: 'black', role: '非接地側 → タイムスイッチ S1' },
        { a: 'jbB', b: 'ts.S2', color: 'white', role: '接地側 → タイムスイッチ S2' },
        { a: 'ts.L1', b: 'ceil.X', color: 'black', role: 'タイムスイッチの接点出口 → 引掛シーリング' },
        { a: 'ts.S2', b: 'ceil.W', color: 'white', role: '接地側 → 引掛シーリング（端子台から取る）' },

        { a: 'jbB', b: 'lamp.W', color: 'white', role: '接地側 → 受金ねじ部' },
        { a: 'jbB', b: 'lamp.X', color: 'black', role: 'ロの帰り線 → 中心端子' },

        { a: 'jbB', b: 'oe.W', color: 'white', role: '接地側 → コンセント W端子' },
        { a: 'jbB', b: 'oe.L', color: 'black', role: '非接地側 → コンセント' },

        { a: 'oe.E', b: 'ed.E', color: 'green', role: '接地線（緑）→ 接地極 ED' }
      ],
      bundles: [
        { jb: 'jbA', wires: ['src.L|jbA', 'jbA|jbB:black', 'jbA|swRo.C'], label: '非接地側（黒）3本' },
        { jb: 'jbA', wires: ['src.N|jbA', 'jbA|jbB:white'], label: '接地側（白）2本' },
        { jb: 'jbA', wires: ['jbA|swRo.L', 'jbA|jbB:red'], label: 'ロの帰り 2本' },

        { jb: 'jbB', wires: ['jbA|jbB:black', 'jbB|ts.S1', 'jbB|oe.L'], label: '非接地側（黒）3本' },
        { jb: 'jbB', wires: ['jbA|jbB:white', 'jbB|ts.S2', 'jbB|lamp.W', 'jbB|oe.W'], label: '接地側（白）4本' },
        { jb: 'jbB', wires: ['jbA|jbB:red', 'jbB|lamp.X'], label: 'ロの帰り 2本' }
      ],
      explain: [
        '<b>①接地側（白）を配る</b>：ランプレセプタクルの受金ねじ部、コンセントのW端子、タイムスイッチの S2 へ。引掛シーリングの接地側は<b>端子台の S2 から</b>取る（S2に白2本）。',
        '<b>②非接地側（黒）を配る</b>：点滅器ロの電源側、コンセント、タイムスイッチの S1 へ。電源→A→Bと送って、Bで3本に分かれる。',
        '<b>③タイムスイッチ</b>：S1–S2 間に時計用モーター、S1–L1 間に接点がある。接点が閉じると L1 に黒が出て、引掛シーリングが点灯する。L1 からの黒は<b>ジョイントボックスを通らず直接</b>引掛シーリングへ。',
        '<b>④点滅器ロの帰り線</b>：点滅器ロの負荷側（白）→ Aで3心の赤とつなぐ → Bで ランプレセプタクルの中心端子へ行く黒とつなぐ。色は<b>残った心線の色</b>で決まる。',
        '<b>⑤接地線（緑）</b>：コンセントの接地極端子から接地極 ED へ1本。<b>緑は接地線だけ</b>に使い、電圧のかかる端子には入れない。',
        '<b>A部分＝リングスリーブ3か所</b>：黒3本（2.0×1＋1.6×2）は「小・刻印<b>小</b>」、白2本（2.0×1＋1.6×1）も「小・刻印<b>小</b>」、帰り線2本（1.6×2）だけが「小・刻印<b>○</b>」。',
        '<b>B部分＝差込形コネクタ3か所</b>：黒3本＝<b>3本用</b>、白4本＝<b>4本用</b>、帰り線2本＝<b>2本用</b>。ちょうど使い切る。',
        '<b>目で見て通電試験</b>：タイムスイッチを「入」にすると引掛シーリングが、点滅器ロを入れるとランプレセプタクルが点く。コンセントは常時通電。'
      ]
    }
  };

  /* ---------- 公表問題 No.5 ---------- */
  const no5 = {
    id: 'no5',
    title: '公表問題 No.5',
    subtitle: '100V と 単相200V が同居／5極端子台＋20A250V接地極付コンセント＋接地線（緑）',
    source: '候補問題No.5｜配線図＝令和8年度の公表PDF／材料・寸法・施工条件・解答＝令和7〜8年度の実出題3回分で一致',

    /* 電源は端子台（配線用遮断器の代用）の N・L。200V は rails で表す */
    srcTerms: { l: 'tb.L', n: 'tb.N', rails: ['tb.V1', 'tb.V2'] },

    conditions: [
      '配線及び器具の配置は、配線図のとおりに行う。<b>点滅器「ロ」は取付枠の中央</b>に取り付ける。',
      '<b>配線用遮断器・漏電遮断器・接地端子は端子台で代用</b>する（上から N／L／200V／200V／ET）。',
      '電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '<b>100V回路</b>の電源から点滅器及びコンセントまでの<b>非接地側電線</b>には、すべて<b>黒色</b>を使用する。',
      '<b>接地線には緑色</b>を使用する。',
      '次の器具の端子には<b>白色</b>を結線する：コンセントの接地側極端子（W表示）／ランプレセプタクルの受金ねじ部／<b>配線用遮断器（端子台）の N 端子</b>。',
      'ジョイントボックス部分を経由する電線は、その部分ですべて接続する。<b>4本の接続箇所は差込形コネクタ</b>、<b>その他はリングスリーブ</b>で行う。',
      '図で囲んだ<b>蛍光灯「イ」は施工省略</b>。ボックスから出た電線の先端までを配線する。'
    ],

    tips: [
      '<b>100V回路と単相200V回路が1つの作品に同居</b>する。200V回路は<b>ジョイントボックスを通らず</b>、端子台からコンセントへ直行するので接続点が無い。',
      '<b>単相200Vの2本の電圧線に極性はない</b>（どちらも非接地側）。黒と赤のどちらをどちらの端子に入れてもよい。<b>白は使わない</b>。',
      '<b>接地線は緑だけ</b>。端子台の ET 端子と 20A250Vコンセントの接地極端子（⏚）を結ぶ。電圧のかかる端子に緑を入れてはいけない。',
      '<b>取付枠は3個口</b>：上＝スイッチ「イ」、中央＝スイッチ「ロ」、下＝埋込連用コンセント。非接地側の黒は<b>わたり線2本</b>で スイッチイ→スイッチロ→コンセント と送る。',
      '<b>接続材料が本数で変わる</b>：4本の接続（白4本）だけ<b>差込形コネクタ4本用</b>、残り3か所は<b>リングスリーブ「小」</b>。',
      '刻印は、<b>2.0mm×1＋1.6mm×1＝「小」</b>、<b>1.6mm×2＝「○」</b>。同じ「小」のスリーブでも刻印を間違えると欠陥。',
      '<b>施工省略でもケーブルは引く</b>。蛍光灯「イ」へ行く100mmはボックス内で必ず接続する。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋両端50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側と施工省略側は<b>切りっぱなし</b>なので足しません。'
    ],

    single: {
      viewBox: '0 20 470 340',
      lines: [
        { x1: 142, y1: 150, x2: 250, y2: 150 },   // 端子台 → JB
        { x1: 250, y1: 150, x2: 330, y2: 150 },   // JB → 蛍光灯（施工省略）
        { x1: 250, y1: 150, x2: 160, y2: 232 },   // JB → ランプレセプタクル
        { x1: 250, y1: 150, x2: 250, y2: 252 },   // JB → 取付枠
        { x1: 142, y1: 196, x2: 380, y2: 196 },   // 端子台(200V) → 20A250Vコンセント
        { x1: 380, y1: 196, x2: 380, y2: 268 }
      ],
      symbols: [
        { type: 'omit-box', x: 8, y: 100, w: 74, h: 148, text: '施工省略' },
        { type: 'text', x: 14, y: 146, text: '電源100V', size: 10, fill: 'muted' },
        { type: 'text', x: 14, y: 212, text: '電源200V', size: 10, fill: 'muted' },
        { type: 'tb', x: 118, y: 168, w: 48, rows: ['B', 'BE', 'ET'], label: '端子台' },
        { type: 'jb', x: 250, y: 150, r: 24 },
        { type: 'omit-box', x: 322, y: 116, w: 130, h: 70, text: '施工省略' },
        { type: 'fluor', x: 380, y: 150, mark: 'イ' },
        { type: 'lamp', x: 140, y: 246, mark: 'ロ' },
        { type: 'switch-dots', x: 250, y: 262, marks: ['イ', 'ロ'], gap: 30 },
        { type: 'outlet', x: 250, y: 330 },
        { type: 'outlet', x: 380, y: 290, mark: 'E', sub: '20A250V' }
      ]
    },

    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        /* 電源は施工省略。ここでは通電試験の入／切だけに使う */
        id: 'src', type: 'source', group: 'src',
        x: 108, y: 286, label: '電源', note: '100V / 200V',
        shape: { rx: 96, ry: 58 }, terminals: []
      },
      {
        id: 'tb', type: 'terminal', group: 'tb',
        x: 352, y: 286, shape: { rx: 78, ry: 156 },
        label: '端子台（遮断器・接地端子の代用）',
        terminals: [
          { id: 'N', tbName: 'N', name: 'N（100V 接地側・白）', short: 'N 接地側', kind: 'tb-n', dx: 78, dy: -118, dir: 'right' },
          { id: 'L', tbName: 'L', name: 'L（100V 非接地側・黒）', short: 'L 非接地側', kind: 'tb-l', dx: 78, dy: -59, dir: 'right' },
          { id: 'V1', tbName: '200V', name: '200V（電圧極・極性なし）', short: '200V', kind: 'hot', dx: 78, dy: 0, dir: 'right' },
          { id: 'V2', tbName: '200V', name: '200V（電圧極・極性なし）', short: '200V', kind: 'hot', dx: 78, dy: 59, dir: 'right' },
          { id: 'ET', tbName: 'ET', name: 'ET（接地端子・緑）', short: 'ET 接地', kind: 'earth', dx: 78, dy: 118, dir: 'right' }
        ]
      },
      { id: 'jb', type: 'jointbox', group: 'jb', connect: 'sleeve', connectorAt: [4], x: 706, y: 214, r: 102, label: 'ジョイントボックス' },
      {
        id: 'fl', type: 'fluorescent', group: 'fl', omitted: true,
        x: 1090, y: 150, label: '蛍光灯', mark: 'イ', loadName: '蛍光灯 イ（施工省略）',
        omitBox: { x: 946, y: 44, w: 276, h: 236, text: '施工省略' },
        terminals: [
          { id: 'W', name: '接地側', short: '接地側', kind: 'load-n', dx: -54, dy: 38, dir: 'down' },
          { id: 'X', name: '非接地側', short: '非接地側', kind: 'load-x', dx: 54, dy: 38, dir: 'down' }
        ]
      },
      {
        id: 'lamp', type: 'lamp', group: 'lamp',
        x: 672, y: 528, label: 'ランプレセプタクル', mark: 'ロ', loadName: 'ランプレセプタクル ロ',
        terminals: [
          { id: 'W', name: '受金ねじ部端子（接地側）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '中心端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        id: 'swI', type: 'switch', group: 'frame', groupName: '連用箇所（スイッチ2個＋コンセント）', poleSwap: true,
        x: 1006, y: 428, label: '埋込連用タンブラスイッチ', mark: 'イ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'swRo', type: 'switch', group: 'frame', poleSwap: true,
        x: 1006, y: 528, label: '埋込連用タンブラスイッチ', mark: 'ロ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'oc', type: 'outlet', group: 'frame',
        x: 1006, y: 630, label: '埋込連用コンセント',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'outlet-n', dx: -72, dy: 0, dir: 'left' },
          { id: 'L', name: '非接地側極端子', short: '非接地側', kind: 'outlet-l', dx: 72, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'oe', type: 'outlet', group: 'oe',
        x: 396, y: 654, label: '埋込コンセント 20A250V', note: '接地極付・200V',
        terminals: [
          { id: 'P1', name: '電圧極（極性なし）', short: '電圧極', kind: 'hot', dx: -72, dy: -22, dir: 'left', labelDir: 'left' },
          { id: 'P2', name: '電圧極（極性なし）', short: '電圧極', kind: 'hot', dx: -72, dy: 22, dir: 'left', labelDir: 'left' },
          { id: 'E', name: '接地極端子（⏚・緑）', short: '接地極', kind: 'earth', dx: 72, dy: 0, dir: 'right' }
        ]
      }
    ],

    frames: [
      { x: 908, y: 382, w: 196, h: 296, label: '埋込連用取付枠（3個）', labelDx: -76 }
    ],

    pairs: [
      { sw: 'swI', load: 'fl', mark: 'イ' },
      { sw: 'swRo', load: 'lamp', mark: 'ロ' }
    ],

    nets: [
      { id: 'v200', name: '単相200V の電圧極',
        groups: [['tb.V1', 'tb.V2'], ['oe.P1', 'oe.P2']],
        bad: '単相200V の回路が正しくつながっていません',
        hint: '端子台の 200V 端子2つと、20A250Vコンセントの電圧極2つを1本ずつつなぎます（<b>どちらをどちらに入れてもかまいません</b>）。' },
      { id: 'earth', name: '接地線（緑）',
        groups: [['tb.ET'], ['oe.E']],
        bad: '接地線（緑）がつながっていません',
        hint: '端子台の ET 端子と、コンセントの接地極端子（⏚）を<b>緑色</b>の電線でつなぎます。' }
    ],

    runs: [
      { id: 'tb-jb', span: 250, cut: 350, a: 'tb', b: 'jb', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（シース青）', at: [[600, 146]] },
      { id: 'jb-fl', span: 100, cut: 150, a: 'jb', b: 'fl', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（施工省略へ）', at: [[884, 122]] },
      { id: 'jb-lamp', span: 250, cut: 350, a: 'jb', b: 'lamp', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[628, 398]] },
      { id: 'jb-frame', span: 200, cut: 300, a: 'jb', b: 'frame', slots: 2, need: 'vvf16-2c', note: 'VVF1.6-2C ×2本', at: [[842, 338], [900, 200]] },
      { id: 'tb-oe', span: 250, cut: 350, a: 'tb', b: 'oe', slots: 1, need: 'vvf20-3cg', note: 'VVF2.0-3C（黒・赤・緑）', at: [[288, 508]] },
      { id: 'frame-frame', a: 'frame', b: 'frame', slots: 0, free: true, note: 'わたり線（黒）' }
    ],

    supply: {
      cables: {
        'vvf20-2c':  { len: 350, count: 1 },
        'vvf20-3cg': { len: 350, count: 1 },
        'vvf16-2c':  { len: 1650, count: 1 }
      },
      connectors: { 2: 0, 3: 0, 4: 1 },
      sleeves: { '小': 5, '中': 0, '大': 0 }
    },

    answer: {
      wires: [
        { a: 'tb.L', b: 'jb', color: 'black', role: '100V 非接地側（L）' },
        { a: 'tb.N', b: 'jb', color: 'white', role: '100V 接地側（N）' },

        { a: 'jb', b: 'fl.W', color: 'white', role: '接地側 → 蛍光灯（施工省略）' },
        { a: 'jb', b: 'fl.X', color: 'black', role: 'イの帰り線 → 蛍光灯' },

        { a: 'jb', b: 'lamp.W', color: 'white', role: '接地側 → 受金ねじ部' },
        { a: 'jb', b: 'lamp.X', color: 'black', role: 'ロの帰り線 → 中心端子' },

        { a: 'jb', b: 'swI.C', color: 'black', role: '非接地側 → 点滅器イ 電源側' },
        { a: 'jb', b: 'oc.W', color: 'white', role: '接地側 → 連用コンセント W端子' },
        { a: 'jb', b: 'swI.L', color: 'black', role: 'イの帰り線（2本目の黒）' },
        { a: 'jb', b: 'swRo.L', color: 'white', role: 'ロの帰り線（2本目の白）' },

        { a: 'swI.C', b: 'swRo.C', color: 'black', role: 'わたり線（黒）' },
        { a: 'swRo.C', b: 'oc.L', color: 'black', role: 'わたり線（黒）→ コンセント' },

        { a: 'tb.V1', b: 'oe.P1', color: 'black', role: '単相200V の電圧極（色は問わない）' },
        { a: 'tb.V2', b: 'oe.P2', color: 'red', role: '単相200V の電圧極（色は問わない）' },
        { a: 'tb.ET', b: 'oe.E', color: 'green', role: '接地線（緑）' }
      ],
      bundles: [
        { jb: 'jb', wires: ['tb.N|jb', 'jb|fl.W', 'jb|lamp.W', 'jb|oc.W'], label: '接地側（白）4本＝差込形コネクタ' },
        { jb: 'jb', wires: ['tb.L|jb', 'jb|swI.C'], label: '非接地側（黒）2本＝スリーブ 小' },
        { jb: 'jb', wires: ['jb|fl.X', 'jb|swI.L'], label: 'イの帰り 2本＝スリーブ ○' },
        { jb: 'jb', wires: ['jb|lamp.X', 'jb|swRo.L'], label: 'ロの帰り 2本＝スリーブ ○' }
      ],
      explain: [
        '<b>①100V と 200V を分けて考える</b>：ジョイントボックスを通るのは100V回路だけ。200V回路は端子台から20A250Vコンセントへ<b>直行</b>するので接続点が無い。',
        '<b>②接地側（白）</b>：端子台の N から、蛍光灯・ランプレセプタクルの受金ねじ部・連用コンセントの W へ。ボックスの中で<b>白4本</b>になり、ここだけ<b>差込形コネクタ（4本用）</b>を使う。',
        '<b>③非接地側（黒）</b>：端子台の L から、点滅器「イ」の電源側へ。そこから<b>わたり線（黒）</b>で点滅器「ロ」→ 連用コンセントへ送る。',
        '<b>④帰り線</b>：点滅器「イ」→蛍光灯、点滅器「ロ」→ランプレセプタクル。取付枠へ行く2本目のケーブルの黒・白を帰り線に使う（色は問わない）。',
        '<b>⑤単相200V</b>：端子台の 200V 端子2つと、20A250Vコンセントの電圧極2つを1本ずつ。<b>どちらをどちらに入れてもよい</b>（どちらも非接地側で、白は使わない）。',
        '<b>⑥接地線（緑）</b>：端子台の ET とコンセントの接地極端子（⏚）を緑1本で。漏電したときに電流を大地へ逃がす道になる。',
        '<b>接続材料</b>：白4本だけ<b>差込形コネクタ4本用</b>、残り3か所は<b>リングスリーブ「小」</b>。刻印は 2.0＋1.6＝<b>小</b>、1.6×2＝<b>○</b>。',
        '<b>目で見て通電試験</b>：20A250Vコンセントは常時通電、連用コンセントも常時通電。点滅器「イ」で蛍光灯、「ロ」でランプレセプタクルが点けば正解。'
      ]
    }
  };

  /* ---------- 公表問題 No.4 ---------- */
  const no4 = {
    id: 'no4',
    title: '公表問題 No.4',
    subtitle: '三相200V（電動機）と 単相100V が同居／5極端子台＋電源表示灯',
    source: '候補問題No.4｜配線図＝令和8年度の公表PDF／材料・寸法・施工条件・解答＝令和7〜8年度の実出題2回分で一致',

    srcTerms: { l: 'tb.L', n: 'tb.N', rails: ['tb.R', 'tb.S', 'tb.T'] },

    conditions: [
      '配線及び器具の配置は、配線図のとおりに行う。<b>配線用遮断器・漏電遮断器は端子台で代用</b>する（上から N／L／T／S／R）。',
      '三相電源の<b>S相は接地</b>されているものとし、<b>電源表示灯は S相と T相の間</b>に接続すること。',
      '<b>100V回路</b>の電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '<b>100V回路</b>の電源から点滅器及びコンセントまでの<b>非接地側電線</b>には、すべて<b>黒色</b>を使用する。',
      '<b>200V回路</b>の電源からの配線には、<b>R相に赤色・S相に白色・T相に黒色</b>を使用する。',
      '次の器具の端子には<b>白色</b>を結線する：コンセントの接地側極端子（W表示）／ランプレセプタクルの受金ねじ部／引掛シーリングの接地側極端子／<b>配線用遮断器（端子台）の N 端子</b>。',
      'ジョイントボックス部分を経由する電線は、その部分ですべて接続する。<b>A部分＝差込形コネクタ</b>、<b>B部分＝リングスリーブ</b>。',
      '図で囲んだ<b>電動機 M は施工省略</b>。ボックスから出た電線の先端までを配線する。'
    ],

    tips: [
      '<b>No.1〜No.3 と A・B が逆</b>。この問題は <b>A部分＝差込形コネクタ（三相200V）／B部分＝リングスリーブ（単相100V）</b>。',
      '<b>三相200Vには色の決まりがある</b>：R相＝<b>赤</b>、S相＝<b>白</b>、T相＝<b>黒</b>。100V回路の「白＝接地側」とは意味が違うので混同しない。',
      '<b>電源表示灯（ランプレセプタクル）は S相と T相の間</b>。受金ねじ部＝白（S相）、中心端子＝黒（T相）。スイッチは通らず<b>常時点灯</b>する。',
      'A部分の心線は <b>R相2本・S相3本・T相3本＝合計8本</b>。差込形コネクタは<b>2本用×1・3本用×2</b>でちょうど使い切る。',
      'B部分は<b>リングスリーブ「小」×3</b>。刻印は 白3本（2.0×1＋1.6×2）＝<b>小</b>、黒2本（2.0×1＋1.6×1）＝<b>小</b>、帰り線2本（1.6×2）＝<b>○</b>。',
      '<b>コンセントはスイッチの手前から わたり線（黒）</b>で分岐するので常時通電。スイッチのON/OFFの影響を受けない。',
      '端子台の中で <b>100V側（N・L）と 200V側（T・S・R）はつながっていない</b>。別々の回路として考える。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋両端50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側と施工省略側は<b>切りっぱなし</b>なので足しません。'
    ],

    single: {
      viewBox: '0 40 470 350',
      lines: [
        { x1: 164, y1: 110, x2: 246, y2: 110 },   // B → JB-B
        { x1: 166, y1: 200, x2: 246, y2: 200 },   // BE → JB-A
        { x1: 270, y1: 110, x2: 270, y2: 62 },    // B → 引掛シーリング
        { x1: 270, y1: 62, x2: 348, y2: 62 },
        { x1: 270, y1: 110, x2: 270, y2: 178 },   // B → 取付枠
        { x1: 270, y1: 178, x2: 392, y2: 178 },
        { x1: 392, y1: 178, x2: 392, y2: 160 },
        { x1: 392, y1: 178, x2: 392, y2: 198 },
        { x1: 270, y1: 200, x2: 270, y2: 308 },   // A → 電動機
        { x1: 270, y1: 240, x2: 150, y2: 240 },   // A → 電源表示灯
        { x1: 150, y1: 240, x2: 150, y2: 305 }
      ],
      symbols: [
        { type: 'omit-box', x: 8, y: 76, w: 96, h: 152, text: '施工省略' },
        { type: 'text', x: 18, y: 108, text: '電源', size: 12, weight: 700 },
        { type: 'text', x: 18, y: 126, text: '1φ2W 100V', size: 9, fill: 'muted' },
        { type: 'text', x: 18, y: 196, text: '電源', size: 12, weight: 700 },
        { type: 'text', x: 18, y: 214, text: '3φ200V', size: 9, fill: 'muted' },
        { type: 'tb', x: 142, y: 110, w: 40, rows: ['B'] },
        { type: 'tb', x: 142, y: 200, w: 46, rows: ['BE'] },
        { type: 'jb', x: 270, y: 110, r: 24, label: 'B' },
        { type: 'jb', x: 270, y: 200, r: 24, label: 'A' },
        { type: 'ceiling', x: 396, y: 62, mark: 'イ' },
        { type: 'switch-dots', x: 392, y: 150, marks: ['イ'], gap: 0 },
        { type: 'outlet', x: 392, y: 205 },
        { type: 'lamp', x: 150, y: 332, mark: '' },
        { type: 'text', x: 108, y: 372, text: '電源表示灯', size: 10, fill: 'muted' },
        { type: 'omit-box', x: 218, y: 296, w: 106, h: 80, text: '施工省略' },
        { type: 'motor', x: 270, y: 332, note: '3φ200V' }
      ]
    },

    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        id: 'src', type: 'source', group: 'src',
        x: 108, y: 150, label: '電源', note: '100V / 三相200V',
        shape: { rx: 96, ry: 58 }, terminals: [],
        omitBox: { x: 8, y: 60, w: 202, h: 190, text: '施工省略' }
      },
      {
        id: 'tb', type: 'terminal', group: 'tb',
        x: 322, y: 372, shape: { rx: 76, ry: 156 },
        label: '端子台（遮断器の代用）',
        terminals: [
          { id: 'N', tbName: 'N', name: 'N（100V 接地側・白）', short: 'N 接地側', kind: 'tb-n', dx: 76, dy: -118, dir: 'right' },
          { id: 'L', tbName: 'L', name: 'L（100V 非接地側・黒）', short: 'L 非接地側', kind: 'tb-l', dx: 76, dy: -59, dir: 'right' },
          { id: 'T', tbName: 'T', name: 'T相（黒）', short: 'T相', kind: 'hot', color: 'black', dx: 76, dy: 0, dir: 'right' },
          { id: 'S', tbName: 'S', name: 'S相（白・接地）', short: 'S相', kind: 'hot', color: 'white', dx: 76, dy: 59, dir: 'right' },
          { id: 'R', tbName: 'R', name: 'R相（赤）', short: 'R相', kind: 'hot', color: 'red', dx: 76, dy: 118, dir: 'right' }
        ]
      },
      { id: 'jbB', type: 'jointbox', group: 'jbB', connect: 'sleeve', x: 706, y: 142, r: 94, label: 'ジョイントボックス B' },
      { id: 'jbA', type: 'jointbox', group: 'jbA', connect: 'connector', x: 706, y: 470, r: 94, label: 'ジョイントボックス A' },
      {
        id: 'm', type: 'motor', group: 'm', omitted: true,
        x: 712, y: 712, label: '電動機 M', note: '三相200V',
        omitBox: { x: 574, y: 626, w: 304, h: 156, text: '施工省略' },
        terminals: [
          { id: 'R', name: 'R相（赤）', short: 'R相', kind: 'hot', color: 'red', dx: -62, dy: -44, dir: 'up', labelDir: 'left' },
          { id: 'S', name: 'S相（白）', short: 'S相', kind: 'hot', color: 'white', dx: 0, dy: -44, dir: 'up' },
          { id: 'T', name: 'T相（黒）', short: 'T相', kind: 'hot', color: 'black', dx: 62, dy: -44, dir: 'up', labelDir: 'right' }
        ]
      },
      {
        id: 'pilot', type: 'lamp', group: 'pilot',
        x: 300, y: 700, label: 'ランプレセプタクル（電源表示灯）', loadName: '電源表示灯',
        terminals: [
          { id: 'W', name: '受金ねじ部端子（S相・白）', short: 'S相（受金）', kind: 'hot', color: 'white', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '中心端子（T相・黒）', short: 'T相（中心）', kind: 'hot', color: 'black', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        id: 'ceil', type: 'ceiling', group: 'ceil',
        x: 1024, y: 116, label: '引掛シーリング（角形）', mark: 'イ', loadName: '引掛シーリング イ',
        terminals: [
          { id: 'W', name: '接地側極端子（「接地側」表示）', short: '接地側W', kind: 'load-n', dx: -54, dy: 30, dir: 'down' },
          { id: 'X', name: '非接地側極端子', short: '非接地側', kind: 'load-x', dx: 54, dy: 30, dir: 'down' }
        ]
      },
      {
        id: 'swI', type: 'switch', group: 'frame', groupName: '連用箇所（スイッチ＋コンセント）', poleSwap: true,
        x: 1030, y: 368, label: '埋込連用タンブラスイッチ', mark: 'イ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        id: 'oc', type: 'outlet', group: 'frame',
        x: 1030, y: 480, label: '埋込連用コンセント',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'outlet-n', dx: -72, dy: 0, dir: 'left' },
          { id: 'L', name: '非接地側極端子', short: '非接地側', kind: 'outlet-l', dx: 72, dy: 0, dir: 'right' }
        ]
      }
    ],

    frames: [
      { x: 934, y: 322, w: 196, h: 206, label: '埋込連用取付枠', labelDx: -74 }
    ],

    pairs: [
      { sw: 'swI', load: 'ceil', mark: 'イ' }
    ],

    nets: [
      { id: 'R', name: '三相200V の R相', color: 'red',
        groups: [['tb.R'], ['m.R']],
        bad: 'R相（赤）が正しくつながっていません',
        hint: '端子台の R と 電動機の R を<b>赤色</b>でつなぎます（ジョイントボックス A を経由）。' },
      { id: 'S', name: '三相200V の S相', color: 'white',
        groups: [['tb.S'], ['m.S'], ['pilot.W']],
        bad: 'S相（白）が正しくつながっていません',
        hint: '端子台の S、電動機の S、電源表示灯の受金ねじ部を<b>白色</b>でつなぎます。' },
      { id: 'T', name: '三相200V の T相', color: 'black',
        groups: [['tb.T'], ['m.T'], ['pilot.X']],
        bad: 'T相（黒）が正しくつながっていません',
        hint: '端子台の T、電動機の T、電源表示灯の中心端子を<b>黒色</b>でつなぎます。' }
    ],

    runs: [
      { id: 'tb-B', span: 300, cut: 400, a: 'tb', b: 'jbB', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（100V・シース青）', at: [[534, 176]] },
      { id: 'tb-A', span: 150, cut: 250, a: 'tb', b: 'jbA', slots: 1, need: 'vvf20-3c', note: 'VVF2.0-3C（三相200V）', at: [[520, 470]] },
      { id: 'A-m', span: 150, cut: 200, a: 'jbA', b: 'm', slots: 1, need: 'vvf20-3c', note: 'VVF2.0-3C（三相200V）', at: [[902, 614]] },
      { id: 'A-pilot', span: 250, cut: 350, a: 'jbA', b: 'pilot', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（電源表示灯）', at: [[478, 620]] },
      { id: 'B-ceil', span: 250, cut: 350, a: 'jbB', b: 'ceil', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[836, 66]] },
      { id: 'B-frame', span: 200, cut: 300, a: 'jbB', b: 'frame', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[926, 276]] },
      { id: 'frame-frame', a: 'frame', b: 'frame', slots: 0, free: true, note: 'わたり線（黒）' }
    ],

    supply: {
      cables: {
        'vvf20-2c': { len: 450, count: 1 },
        'vvf20-3c': { len: 550, count: 1 },
        'vvf16-2c': { len: 850, count: 1 },
        'vvf16-3c': { len: 500, count: 1 }
      },
      connectors: { 2: 1, 3: 2, 4: 0 },
      sleeves: { '小': 5, '中': 0, '大': 0 }
    },

    answer: {
      wires: [
        { a: 'tb.N', b: 'jbB', color: 'white', role: '100V 接地側（N）' },
        { a: 'tb.L', b: 'jbB', color: 'black', role: '100V 非接地側（L）' },

        { a: 'jbB', b: 'ceil.W', color: 'white', role: '接地側 → 引掛シーリング' },
        { a: 'jbB', b: 'ceil.X', color: 'black', role: 'イの帰り線 → 引掛シーリング' },

        { a: 'jbB', b: 'swI.C', color: 'black', role: '非接地側 → 点滅器イ 電源側' },
        { a: 'jbB', b: 'swI.L', color: 'red', role: 'イの帰り線（3心の赤）' },
        { a: 'jbB', b: 'oc.W', color: 'white', role: '接地側 → コンセント W端子' },
        { a: 'swI.C', b: 'oc.L', color: 'black', role: 'わたり線（黒）→ コンセント' },

        { a: 'tb.R', b: 'jbA', color: 'red', role: '三相 R相（赤）' },
        { a: 'tb.S', b: 'jbA', color: 'white', role: '三相 S相（白）' },
        { a: 'tb.T', b: 'jbA', color: 'black', role: '三相 T相（黒）' },

        { a: 'jbA', b: 'm.R', color: 'red', role: 'R相 → 電動機' },
        { a: 'jbA', b: 'm.S', color: 'white', role: 'S相 → 電動機' },
        { a: 'jbA', b: 'm.T', color: 'black', role: 'T相 → 電動機' },

        { a: 'jbA', b: 'pilot.W', color: 'white', role: 'S相 → 電源表示灯 受金ねじ部' },
        { a: 'jbA', b: 'pilot.X', color: 'black', role: 'T相 → 電源表示灯 中心端子' }
      ],
      bundles: [
        { jb: 'jbB', wires: ['tb.N|jbB', 'jbB|ceil.W', 'jbB|oc.W'], label: '100V 接地側（白）3本' },
        { jb: 'jbB', wires: ['tb.L|jbB', 'jbB|swI.C'], label: '100V 非接地側（黒）2本' },
        { jb: 'jbB', wires: ['jbB|ceil.X', 'jbB|swI.L'], label: 'イの帰り 2本' },

        { jb: 'jbA', wires: ['tb.R|jbA', 'jbA|m.R'], label: 'R相（赤）2本' },
        { jb: 'jbA', wires: ['tb.S|jbA', 'jbA|m.S', 'jbA|pilot.W'], label: 'S相（白）3本' },
        { jb: 'jbA', wires: ['tb.T|jbA', 'jbA|m.T', 'jbA|pilot.X'], label: 'T相（黒）3本' }
      ],
      explain: [
        '<b>①100V と 三相200V を分けて考える</b>：端子台の中で N・L（100V）と T・S・R（200V）はつながっていない。A部分は200V専用、B部分は100V専用。',
        '<b>②三相200V の色は決まっている</b>：R相＝<b>赤</b>、S相＝<b>白</b>、T相＝<b>黒</b>。端子台から A で分岐し、電動機の同じ相へ。',
        '<b>③電源表示灯は S相と T相の間</b>：A部分の S相（白）から受金ねじ部へ、T相（黒）から中心端子へ。線間200Vが常時かかるので<b>常時点灯</b>する。R相には触れない。',
        '<b>④100V側</b>：端子台の N（白）と L（黒）から B へ。白は引掛シーリングの接地側とコンセントの W端子へ、黒は点滅器イの電源側へ。',
        '<b>⑤コンセントは わたり線（黒）</b>で点滅器の電源側から分岐。スイッチの手前なので<b>常時通電</b>する。',
        '<b>⑥帰り線</b>：点滅器イの負荷側（3心の赤）→ B →引掛シーリングの非接地側へ行く黒とつなぐ。',
        '<b>A部分＝差込形コネクタ</b>：R相2本＝<b>2本用</b>、S相3本＝<b>3本用</b>、T相3本＝<b>3本用</b>。合計8心線でちょうど使い切る。',
        '<b>B部分＝リングスリーブ「小」×3</b>：白3本（2.0×1＋1.6×2）＝刻印<b>小</b>、黒2本（2.0×1＋1.6×1）＝刻印<b>小</b>、帰り線2本（1.6×2）＝刻印<b>○</b>。'
      ]
    }
  };

  window.PROBLEMS = [no1, no2, no3, no4, no5];
})();
