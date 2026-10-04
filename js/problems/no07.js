/* ---------- 公表問題 No.7 ----------
   3路スイッチ2個＋4路スイッチ1個で、ランプレセプタクル2灯（1灯は施工省略）を3か所から点滅。
   A＝VVF用ジョイントボックス（リングスリーブ）、B＝アウトレットボックス（差込形コネクタ）。 */
(function () {
  'use strict';

  const no7 = {
    id: 'no7',
    title: '公表問題 No.7',
    subtitle: '3路スイッチ2個＋4路スイッチ1個で、ランプレセプタクル2灯（1灯は施工省略）を3か所から点滅',
    source: '候補問題No.7｜配線図＝令和8年度の公表PDF／材料・寸法・施工条件・解答＝令和6〜8年度の実出題10回分（R6上期7/20・7/21、R6下期12/14・12/15、R7上期7/19・7/20、R7下期12/13・12/14、R8上期7/18・7/19）で一致',

    conditions: [
      '配線及び器具の配置は、配線図のとおりに行う。',
      '3路スイッチ及び4路スイッチは、<b>3箇所のスイッチをそれぞれ操作する</b>ことによりランプレセプタクルを点滅できるようにする。',
      '3路スイッチの<b>記号「0」の端子には電源側又は負荷側の電線</b>を結線し、<b>記号「1」と「3」の端子には4路スイッチとの間の電線</b>を結線する。',
      '<b>ジョイントボックス（アウトレットボックス）</b>は、<b>打抜き済みの穴だけをすべて使用</b>する。',
      '電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '電源から<b>3路スイッチ S</b> までの<b>非接地側電線</b>には、<b>黒色</b>を使用する。',
      'ランプレセプタクルの<b>受金ねじ部の端子</b>には<b>白色</b>の電線を結線する。',
      'VVF用ジョイントボックス A 部分及びジョイントボックス B 部分を<b>経由する電線は、その部分ですべて接続</b>する。接続は <b>A部分＝リングスリーブ</b>、<b>B部分＝差込形コネクタ</b>で行う。',
      '<b>埋込連用取付枠は、4路スイッチ部分</b>に使用する（3路スイッチ2個には使わない）。',
      '一点鎖線で囲んだ<b>ランプレセプタクルは施工省略</b>。ボックスから出た電線の先端までを配線する。VVF用ジョイントボックス及びスイッチボックスは支給されないので、その取付けは省略する。'
    ],

    tips: [
      '<b>4路スイッチの端子は 1・2・3・4</b>。中では「1–2・3–4」⇔「1–4・3–2」と切り替わり、<b>1と3、2と4 はどちらの状態でもつながらない</b>。だから<b>同じ3路スイッチから来た2本は「1と3」（または「2と4」）</b>に入れる。1と2のように分けると、点かない組み合わせができる。',
      '<b>3路スイッチの「0」は共通端子</b>。電源側の3路 S の0には<b>電源の黒</b>、負荷側の3路の0には<b>ランプへの帰り線</b>。「1」「3」は4路との間の線で、入れ替えても正解。',
      '色の決まりは3つだけ：<b>接地側はすべて白</b>、<b>電源から3路 S の0までは黒</b>、<b>受金ねじ部は白</b>。スイッチどうしの間の線（3心の白・赤なども）と帰り線の色は問わない。',
      '<b>ランプ2灯は並列</b>。B部分で「接地側の白3本」と「帰り線3本」をそれぞれ<b>3本用</b>コネクタでまとめる。スイッチ間の線4か所は<b>2本用</b>。',
      '<b>B → 4路は VVF1.6-2C が2本</b>。1本目を「3路 S 側（4路の1・3）」、2本目を「負荷側3路側（4路の2・4）」と役割を分けると迷わない。実物では、この2本を<b>アウトレットボックスの下の同じ穴</b>に通す（5つの穴すべてにゴムブッシング）。',
      'A部分のリングスリーブは「小」4個。<b>2.0mmが混ざる黒・白の2か所は刻印「小」</b>、1.6mm×2本のスイッチ間の線2か所は<b>刻印「○」</b>。',
      '通電試験は<b>どのスイッチを1回操作しても、点灯と消灯が入れ替わる</b>ことを確かめる。3個のスイッチで8通り、ひとつでも反応しない操作があれば結線ミス。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋接続・結線する端ごとに50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側と施工省略側は<b>切りっぱなし</b>なので足しません。'
    ],

    /* ========== 単線図（左パネル） ========== */
    single: {
      viewBox: '0 30 470 320',
      lines: [
        { x1: 120, y1: 72, x2: 120, y2: 190 },    // 電源 → A（Aの上 150mm）
        { x1: 120, y1: 190, x2: 270, y2: 190 },   // A ↔ B
        { x1: 120, y1: 190, x2: 120, y2: 300 },   // A → 3路 S
        { x1: 270, y1: 190, x2: 270, y2: 118 },   // B → ランプレセプタクル
        { x1: 270, y1: 190, x2: 270, y2: 300 },   // B → 4路（2C×2）
        { x1: 270, y1: 183, x2: 384, y2: 183 },   // B → 右 → 上（施工省略のランプレセプタクル）
        { x1: 384, y1: 183, x2: 384, y2: 128 },
        { x1: 270, y1: 197, x2: 396, y2: 197 },   // B → 右 → 下（3路）
        { x1: 396, y1: 197, x2: 396, y2: 300 }
      ],
      symbols: [
        { type: 'text', x: 134, y: 70, text: '電源', size: 15, weight: 700 },
        { type: 'text', x: 134, y: 90, text: '1φ2W 100V', size: 10, fill: 'muted' },
        { type: 'jb', x: 120, y: 190, r: 24, label: 'A' },
        { type: 'jb', x: 270, y: 190, r: 24, label: 'B', box: 'outlet' },
        { type: 'lamp', x: 270, y: 90, mark: 'イ' },
        { type: 'omit-box', x: 334, y: 44, w: 126, h: 98, text: '施工省略' },
        { type: 'lamp', x: 384, y: 100, mark: 'イ' },
        { type: 'text', x: 280, y: 258, text: '1.6-2C×2', size: 10, fill: 'muted' },
        { type: 'switch-dots', x: 120, y: 312, marks: ['イ'], gap: 0, sub: ['3'], s: [true] },
        { type: 'switch-dots', x: 270, y: 312, marks: ['イ'], gap: 0, sub: ['4'] },
        { type: 'switch-dots', x: 396, y: 312, marks: ['イ'], gap: 0, sub: ['3'] }
      ]
    },

    /* ========== 作業エリア ==========
       上段：電源（左上）・ランプレセプタクル（Bの上）・施工省略のランプレセプタクル（右上）
       中段：A（電源の真下）・B
       下段：3路 S（Aの下）・4路（Bの下、取付枠）・負荷側3路（右下） */
    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        id: 'src', type: 'source', group: 'src',
        x: 330, y: 110, label: '電源', note: '単相100V',
        shape: { rx: 138, ry: 58 },
        terminals: [
          { id: 'L', name: '非接地側 L（黒）', short: 'L 非接地側', kind: 'source-l', dx: 58, dy: -26, dir: 'right', labelDir: 'up' },
          { id: 'N', name: '接地側 N（白）', short: 'N 接地側', kind: 'source-n', dx: 58, dy: 26, dir: 'right', labelDir: 'down' }
        ]
      },
      {
        id: 'jbA', type: 'jointbox', group: 'jbA', connect: 'sleeve',
        x: 330, y: 380, r: 100, label: 'VVF用ジョイントボックス A'
      },
      {
        id: 'jbB', type: 'jointbox', group: 'jbB', connect: 'connector', box: 'outlet',
        x: 700, y: 380, r: 100, label: 'アウトレットボックス B'
      },
      {
        id: 'lamp', type: 'lamp', group: 'lamp',
        x: 700, y: 105, label: 'ランプレセプタクル', mark: 'イ', loadName: 'ランプレセプタクル イ',
        terminals: [
          { id: 'W', name: '受金ねじ部端子（接地側）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '中心端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        id: 'lampO', type: 'lamp', group: 'lampO', omitted: true,
        x: 1070, y: 145, label: 'ランプレセプタクル', mark: 'イ',
        groupName: 'ランプレセプタクル イ（施工省略）', loadName: 'ランプレセプタクル イ（施工省略）',
        omitBox: { x: 930, y: 50, w: 270, h: 215, text: '施工省略' },
        terminals: [
          { id: 'W', name: '受金ねじ部端子（接地側）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '中心端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        /* 電源側の3路スイッチ（S）。0 に電源の黒 */
        id: 's3S', type: 'switch', variant: '3way', group: 'sS',
        x: 330, y: 660, label: '3路スイッチ（電源側）', mark: 'イ', note: 'S',
        positions: [[['0', '1']], [['0', '3']]], posLabels: ['0–1', '0–3'],
        terminals: [
          { id: '0', name: '「0」端子（共通・電源の黒）', short: '0', kind: 'sw-com', max: 1, dx: -86, dy: 0, dir: 'left' },
          { id: '1', name: '「1」端子（4路との間）', short: '1', kind: 'sw-trav', side: 'a', max: 1, dx: 86, dy: -18, dir: 'right' },
          { id: '3', name: '「3」端子（4路との間）', short: '3', kind: 'sw-trav', side: 'a', max: 1, dx: 86, dy: 18, dir: 'right' }
        ]
      },
      {
        /* 4路スイッチ（取付枠つき）。1・3 と 2・4 はどちらの位置でもつながらない */
        id: 's4', type: 'switch', variant: '4way', group: 'f4', groupName: '4路スイッチ（取付枠）',
        x: 700, y: 660, label: '4路スイッチ', mark: 'イ',
        positions: [[['1', '2'], ['3', '4']], [['1', '4'], ['3', '2']]], posLabels: ['1–2・3–4', '1–4・3–2'],
        terminals: [
          { id: '1', name: '「1」端子', short: '1', kind: 'sw-trav', side: 'a', max: 1, dx: -86, dy: -18, dir: 'left' },
          { id: '3', name: '「3」端子', short: '3', kind: 'sw-trav', side: 'a', max: 1, dx: -86, dy: 18, dir: 'left' },
          { id: '2', name: '「2」端子', short: '2', kind: 'sw-trav', side: 'b', max: 1, dx: 86, dy: -18, dir: 'right' },
          { id: '4', name: '「4」端子', short: '4', kind: 'sw-trav', side: 'b', max: 1, dx: 86, dy: 18, dir: 'right' }
        ]
      },
      {
        /* 負荷側の3路スイッチ。0 からランプへの帰り線 */
        id: 's3L', type: 'switch', variant: '3way', group: 'sL',
        x: 1060, y: 660, label: '3路スイッチ（負荷側）', mark: 'イ',
        positions: [[['0', '1']], [['0', '3']]], posLabels: ['0–1', '0–3'],
        terminals: [
          { id: '0', name: '「0」端子（共通・帰り線）', short: '0', kind: 'sw-load', max: 1, dx: -86, dy: 0, dir: 'left' },
          { id: '1', name: '「1」端子（4路との間）', short: '1', kind: 'sw-trav', side: 'a', max: 1, dx: 86, dy: -18, dir: 'right' },
          { id: '3', name: '「3」端子（4路との間）', short: '3', kind: 'sw-trav', side: 'a', max: 1, dx: 86, dy: 18, dir: 'right' }
        ]
      }
    ],

    frames: [
      { x: 600, y: 604, w: 200, h: 112, label: '埋込連用取付枠' }
    ],

    /* 負荷側の3路（sw-load を持つ）→ 電源側の3路・4路を経由 → ランプ2灯 */
    pairs: [
      { sw: 's3L', via: ['s3S', 's4'], load: 'lamp', mark: 'イ' },
      { sw: 's3L', via: ['s3S', 's4'], load: 'lampO', mark: 'イ' }
    ],

    runs: [
      { id: 'src-A', span: 150, cut: 200, a: 'src', b: 'jbA', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（電源・シース青）', at: [[412, 228]] },
      { id: 'A-S', span: 150, cut: 250, a: 'jbA', b: 'sS', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[412, 556]] },
      { id: 'A-B', span: 150, cut: 250, a: 'jbA', b: 'jbB', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[515, 425]] },
      { id: 'B-lamp', span: 150, cut: 250, a: 'jbB', b: 'lamp', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[612, 222]] },
      { id: 'B-lampO', span: 250, cut: 300, a: 'jbB', b: 'lampO', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（施工省略へ）', at: [[890, 340]] },
      { id: 'B-f4', span: 150, cut: 250, a: 'jbB', b: 'f4', slots: 2, need: 'vvf16-2c', note: 'VVF1.6-2C ×2本', at: [[782, 556], [618, 556]] },
      { id: 'B-sL', span: 250, cut: 350, a: 'jbB', b: 'sL', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[940, 490]] }
    ],

    /* 支給される材料 */
    supply: {
      cables: {
        'vvf20-2c': { len: 250, count: 1 },
        'vvf16-2c': { len: 1400, count: 1 },
        'vvf16-3c': { len: 1150, count: 1 }
      },
      connectors: { 2: 4, 3: 2, 4: 0 },
      sleeves: { '小': 6, '中': 0, '大': 0 }
    },

    /* ========== 模範解答 ========== */
    answer: {
      wires: [
        { a: 'src.L', b: 'jbA', color: 'black', role: '電源 非接地側（L）' },
        { a: 'src.N', b: 'jbA', color: 'white', role: '電源 接地側（N）' },

        { a: 'jbA', b: 's3S.0', color: 'black', role: '非接地側 → 3路 S の「0」（黒の指定）' },
        { a: 'jbA', b: 's3S.1', color: 'red', role: '3路 S の「1」→ 4路へ（色は問わない）' },
        { a: 'jbA', b: 's3S.3', color: 'white', role: '3路 S の「3」→ 4路へ（色は問わない）' },

        { a: 'jbA', b: 'jbB', color: 'white', role: '接地側（3心の白）' },
        { a: 'jbA', b: 'jbB', color: 'red', role: '3路 S の「1」の線（3心の赤）' },
        { a: 'jbA', b: 'jbB', color: 'black', role: '3路 S の「3」の線（3心の黒）' },

        { a: 'jbB', b: 'lamp.W', color: 'white', role: '接地側 → 受金ねじ部' },
        { a: 'jbB', b: 'lamp.X', color: 'black', role: '帰り線 → 中心端子' },
        { a: 'jbB', b: 'lampO.W', color: 'white', role: '接地側 → 施工省略のランプレセプタクル' },
        { a: 'jbB', b: 'lampO.X', color: 'black', role: '帰り線 → 施工省略のランプレセプタクル' },

        { a: 'jbB', b: 's4.1', color: 'black', role: '4路の「1」（1本目の2心・3路 S 側）' },
        { a: 'jbB', b: 's4.3', color: 'white', role: '4路の「3」（1本目の2心・3路 S 側）' },
        { a: 'jbB', b: 's4.2', color: 'black', role: '4路の「2」（2本目の2心・負荷側3路側）' },
        { a: 'jbB', b: 's4.4', color: 'white', role: '4路の「4」（2本目の2心・負荷側3路側）' },

        { a: 'jbB', b: 's3L.0', color: 'black', role: '負荷側3路の「0」＝帰り線' },
        { a: 'jbB', b: 's3L.1', color: 'white', role: '負荷側3路の「1」← 4路（色は問わない）' },
        { a: 'jbB', b: 's3L.3', color: 'red', role: '負荷側3路の「3」← 4路（色は問わない）' }
      ],
      bundles: [
        { jb: 'jbA', wires: ['src.L|jbA', 'jbA|s3S.0'], label: '非接地側（黒）2本＝スリーブ 小' },
        { jb: 'jbA', wires: ['src.N|jbA', 'jbA|jbB:white'], label: '接地側（白）2本＝スリーブ 小' },
        { jb: 'jbA', wires: ['jbA|s3S.1', 'jbA|jbB:red'], label: '3路 S「1」の線 2本＝スリーブ ○' },
        { jb: 'jbA', wires: ['jbA|s3S.3', 'jbA|jbB:black'], label: '3路 S「3」の線 2本＝スリーブ ○' },

        { jb: 'jbB', wires: ['jbA|jbB:white', 'jbB|lamp.W', 'jbB|lampO.W'], label: '接地側（白）3本＝3本用' },
        { jb: 'jbB', wires: ['jbB|s3L.0', 'jbB|lamp.X', 'jbB|lampO.X'], label: '帰り線 3本＝3本用' },
        { jb: 'jbB', wires: ['jbA|jbB:red', 'jbB|s4.1'], label: '3路 S「1」→ 4路「1」＝2本用' },
        { jb: 'jbB', wires: ['jbA|jbB:black', 'jbB|s4.3'], label: '3路 S「3」→ 4路「3」＝2本用' },
        { jb: 'jbB', wires: ['jbB|s4.2', 'jbB|s3L.1'], label: '4路「2」→ 負荷側3路「1」＝2本用' },
        { jb: 'jbB', wires: ['jbB|s4.4', 'jbB|s3L.3'], label: '4路「4」→ 負荷側3路「3」＝2本用' }
      ],
      explain: [
        '<b>①接地側（白）をランプ2灯へ</b>：電源の白 → A → B（3心の白）→ ランプレセプタクル2灯の<b>受金ねじ部</b>へ。スイッチは通さない。Bで白3本をまとめる。',
        '<b>②非接地側（黒）を3路 S の「0」へ</b>：電源の黒 → A → 3路 S の<b>「0」</b>。この線は<b>黒の指定</b>がある。',
        '<b>③3路 S の「1」「3」→ 4路の「1」「3」</b>：Aで3心どうし、Bで4路への1本目の2心とつなぐ。<b>同じ3路から来た2本は4路の「1と3」</b>に入れる（1と3はつながらない端子どうし）。',
        '<b>④4路の「2」「4」→ 負荷側3路の「1」「3」</b>：4路への2本目の2心と、負荷側3路への3心をBでつなぐ。3路の1・3、4路の組（1・3側と2・4側）は入れ替えても正解。',
        '<b>⑤帰り線</b>：負荷側3路の<b>「0」</b> → B → ランプレセプタクル2灯の<b>中心端子</b>へ。Bで帰り線3本をまとめる（2灯は並列）。',
        '<b>A部分＝リングスリーブ「小」×4</b>：黒2本（2.0×1＋1.6×1）＝刻印<b>小</b>、白2本（2.0×1＋1.6×1）＝刻印<b>小</b>、3路 S の「1」「3」の線2本（1.6×2）×2か所＝刻印<b>○</b>。',
        '<b>B部分＝差込形コネクタ6か所</b>：白3本と帰り線3本は<b>3本用×2</b>、スイッチどうしの間の線2本×4か所は<b>2本用×4</b>。支給された数をちょうど使い切る。',
        '<b>目で見て通電試験</b>：3個のスイッチのうち<b>どれを操作しても</b>、ランプレセプタクル2灯の点灯・消灯が入れ替われば正解（8通りすべて）。'
      ]
    }
  };

  window.PROBLEMS.push(no7);
})();
