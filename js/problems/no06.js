/* ---------- 公表問題 No.6 ----------
   3路スイッチ2個で引掛シーリング2灯（1灯は施工省略）を2か所から点滅＋露出形コンセント（常時通電）。
   配線図どおり 左＝A（差込形コネクタ）・右＝B（リングスリーブ）・Bのさらに右＝電源。 */
(function () {
  'use strict';

  const no6 = {
    id: 'no6',
    title: '公表問題 No.6',
    subtitle: '3路スイッチ2個で2か所点滅（引掛シーリング2灯・1灯は施工省略）＋露出形コンセント',
    source: '候補問題No.6｜配線図＝令和8年度の公表PDF／材料・寸法・施工条件・解答＝令和6〜8年度の実出題8回分（R6下期12/14・12/15、R7上期7/19・7/20、R7下期12/13・12/14、R8上期7/18・7/19）で一致',

    conditions: [
      '配線及び器具の配置は、配線図のとおりに行う。',
      '<b>3路スイッチ</b>の記号「<b>0</b>」の端子には<b>電源側又は負荷側</b>の電線を結線し、記号「<b>1</b>」と「<b>3</b>」の端子には<b>スイッチ相互間</b>の電線を結線する。',
      '電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '電源から<b>3路スイッチ S</b> 及び<b>露出形コンセント</b>までの<b>非接地側電線</b>には、すべて<b>黒色</b>を使用する。',
      '次の器具の端子には<b>白色</b>を結線する：<b>露出形コンセントの接地側極端子（W表示）</b>／<b>引掛シーリングローゼットの接地側極端子（「接地側」表示）</b>。',
      'ジョイントボックス部分を<b>経由する電線は、その部分ですべて接続</b>する（ボックスは省略）。',
      '接続は <b>A部分＝差込形コネクタ</b>、<b>B部分＝リングスリーブ</b>で行う。',
      '<b>露出形コンセントへの結線</b>は、<b>ケーブルを挿入した部分に近い端子</b>に行う。',
      '一点鎖線で囲んだ<b>引掛シーリング「イ」（Aの左）は施工省略</b>。ボックスから出た電線の先端までを配線する。'
    ],

    tips: [
      '<b>3路スイッチ2個で、同じ照明を2か所から点滅</b>させる（階段の上と下など）。どちらのスイッチを切り替えても、点いていれば消え、消えていれば点く。',
      '<b>3路スイッチの端子は「0」「1」「3」</b>。「0」は共通端子で、<b>S の3路スイッチ（Bの下）は電源の黒</b>、<b>もう1個（Aの下）は引掛シーリングへ行く負荷側の線</b>を入れる。「1」「3」には<b>スイッチ相互間の2本</b>を入れる。',
      '<b>S の3路スイッチの「0」は必ず黒</b>（電源から3路スイッチSまでの非接地側は黒）。S の「1」「3」の線と、Aの下の3路スイッチの3本は<b>色別を問わない</b>。',
      '<b>相互間の2本は「1–1・3–3」でも「1–3・3–1」でも正解</b>（入れ替えても2か所点滅の動きは同じ）。',
      '<b>相互間の2本は B と A の両方で接続</b>する（Bはリングスリーブ、Aは差込形コネクタ）。A-B間の3心は<b>白＝接地側</b>、黒・赤＝相互間。白を相互間に使うと色別の欠陥。',
      '<b>A と B で接続方法が違う</b>：A＝差込形コネクタ（3本用×2・2本用×2）、B＝リングスリーブ「小」×4。Bは2.0mmが混ざる黒3本・白3本が刻印<b>小</b>、1.6mm×2の相互間2か所が刻印<b>○</b>。',
      '<b>露出形コンセントは常時通電</b>（スイッチを通らない）。W表示の極に白、もう一方に黒。<b>ケーブルを差し込んだ側に近い端子</b>へ結線する。',
      '<b>施工省略の引掛シーリングもケーブルは引く</b>。Aで実物の引掛シーリングと<b>並列</b>（白どうし・負荷側どうしをまとめる）にするので、2灯が同時に点滅する。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋接続・結線する端ごとに50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側と施工省略側は<b>切りっぱなし</b>なので足しません。'
    ],

    /* ========== 単線図（左パネル） ========== */
    single: {
      viewBox: '0 40 470 330',
      lines: [
        { x1: 190, y1: 210, x2: 320, y2: 210 },   // A ↔ B
        { x1: 320, y1: 210, x2: 390, y2: 210 },   // B → 電源
        { x1: 320, y1: 210, x2: 320, y2: 122 },   // B → 露出形コンセント
        { x1: 320, y1: 210, x2: 320, y2: 291 },   // B → 3路スイッチ S
        { x1: 190, y1: 210, x2: 190, y2: 95 },    // A → 引掛シーリング
        { x1: 190, y1: 210, x2: 190, y2: 291 },   // A → 3路スイッチ
        { x1: 190, y1: 210, x2: 80, y2: 210 },    // A → 施工省略（左へ）
        { x1: 80, y1: 210, x2: 80, y2: 170 }      //   → 上へ（L字）
      ],
      symbols: [
        { type: 'text', x: 400, y: 200, text: '電源', size: 15, weight: 700 },
        { type: 'text', x: 400, y: 222, text: '1φ2W 100V', size: 10, fill: 'muted' },
        { type: 'jb', x: 190, y: 210, r: 26, label: 'A' },
        { type: 'jb', x: 320, y: 210, r: 26, label: 'B' },
        { type: 'ceiling', x: 190, y: 75, mark: 'イ' },
        { type: 'outlet', x: 320, y: 100, from: 'down' },   // 線は下（B）から来る
        { type: 'text', x: 352, y: 96, text: '露出形', size: 11, weight: 700, fill: 'muted' },
        { type: 'switch-dots', x: 190, y: 300, marks: ['イ'], gap: 0, sub: ['3'] },
        { type: 'switch-dots', x: 320, y: 300, marks: ['イ'], gap: 0, sub: ['3'], s: [true] },
        { type: 'omit-box', x: 22, y: 104, w: 138, h: 120, text: '施工省略' },
        { type: 'ceiling', x: 80, y: 150, mark: 'イ' }
      ]
    },

    /* ========== 作業エリア ========== */
    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        /* 配線図どおり、電源は B の右（端子は左向き） */
        id: 'src', type: 'source', group: 'src',
        x: 1140, y: 400, label: '電源', note: '単相100V',
        shape: { rx: 138, ry: 58 },
        terminals: [
          { id: 'L', name: '非接地側 L（黒）', short: 'L 非接地側', kind: 'source-l', dx: -98, dy: -26, dir: 'left', labelDir: 'up' },
          { id: 'N', name: '接地側 N（白）', short: 'N 接地側', kind: 'source-n', dx: -98, dy: 26, dir: 'left', labelDir: 'down' }
        ]
      },
      {
        id: 'jbA', type: 'jointbox', group: 'jbA', connect: 'connector',
        x: 470, y: 400, r: 100, label: 'ジョイントボックス A', methodLabel: '差込形コネクタ'
      },
      {
        id: 'jbB', type: 'jointbox', group: 'jbB', connect: 'sleeve',
        x: 820, y: 400, r: 100, label: 'ジョイントボックス B', methodLabel: 'リングスリーブ'
      },
      {
        id: 'out', type: 'outlet', group: 'out', variant: 'exposed',
        x: 820, y: 150, label: '露出形コンセント（カバーなし）',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'outlet-n', dx: -72, dy: 12, dir: 'left', max: 1 },
          { id: 'L', name: '非接地側極端子', short: '非接地側', kind: 'outlet-l', dx: 72, dy: 12, dir: 'right', max: 1 }
        ]
      },
      {
        id: 'ceil', type: 'ceiling', group: 'ceil',
        x: 470, y: 150, label: '引掛シーリング（角形）', mark: 'イ', loadName: '引掛シーリング イ',
        terminals: [
          { id: 'W', name: '接地側極端子（「接地側」表示）', short: '接地側W', kind: 'load-n', dx: -54, dy: 30, dir: 'down' },
          { id: 'X', name: '非接地側極端子', short: '非接地側', kind: 'load-x', dx: 54, dy: 30, dir: 'down' }
        ]
      },
      {
        /* 施工省略。shape は区間のケーブルを枠の手前で止めるため（端子ラベル・記号にかぶらないように） */
        id: 'ceilO', type: 'ceiling', group: 'ceilO', omitted: true,
        x: 150, y: 300, label: '引掛シーリング', mark: 'イ',
        groupName: '引掛シーリング イ（施工省略）', loadName: '引掛シーリング イ（施工省略）',
        shape: { rx: 150, ry: 80 },
        omitBox: { x: 40, y: 230, w: 280, h: 160, text: '施工省略' },
        terminals: [
          { id: 'W', name: '接地側（白）', short: '接地側', kind: 'load-n', dx: -54, dy: 30, dir: 'down' },
          { id: 'X', name: '非接地側（負荷側）', short: '非接地側', kind: 'load-x', dx: 54, dy: 30, dir: 'down' }
        ]
      },
      {
        id: 's3S', type: 'switch', variant: '3way', group: 's3S', groupName: '3路スイッチ イ（S・Bの下）',
        x: 820, y: 650, label: '3路スイッチ（電源側）', mark: 'イ', note: 'S',
        positions: [[['0', '1']], [['0', '3']]], posLabels: ['0–1', '0–3'],
        terminals: [
          { id: '0', name: '0 共通端子（電源の黒）', short: '0', kind: 'sw-com', dx: -86, dy: 0, dir: 'left', max: 1 },
          { id: '1', name: '1（スイッチ相互間）', short: '1', kind: 'sw-trav', side: 'a', dx: 86, dy: -18, dir: 'right', max: 1 },
          { id: '3', name: '3（スイッチ相互間）', short: '3', kind: 'sw-trav', side: 'a', dx: 86, dy: 18, dir: 'right', max: 1 }
        ]
      },
      {
        id: 's3L', type: 'switch', variant: '3way', group: 's3L', groupName: '3路スイッチ イ（Aの下）',
        x: 470, y: 650, label: '3路スイッチ（負荷側）', mark: 'イ',
        positions: [[['0', '1']], [['0', '3']]], posLabels: ['0–1', '0–3'],
        terminals: [
          { id: '0', name: '0 共通端子（負荷＝引掛シーリングへ）', short: '0', kind: 'sw-load', dx: -86, dy: 0, dir: 'left', max: 1 },
          { id: '1', name: '1（スイッチ相互間）', short: '1', kind: 'sw-trav', side: 'a', dx: 86, dy: -18, dir: 'right', max: 1 },
          { id: '3', name: '3（スイッチ相互間）', short: '3', kind: 'sw-trav', side: 'a', dx: 86, dy: 18, dir: 'right', max: 1 }
        ]
      }
    ],

    frames: [
      { x: 360, y: 598, w: 220, h: 104, label: '埋込連用取付枠' },
      { x: 710, y: 598, w: 220, h: 104, label: '埋込連用取付枠' }
    ],

    /* 負荷側の3路（Aの下）→ 電源側の3路（S）を経由 → 引掛シーリング2灯 */
    pairs: [
      { sw: 's3L', via: ['s3S'], load: 'ceil', mark: 'イ' },
      { sw: 's3L', via: ['s3S'], load: 'ceilO', mark: 'イ' }
    ],

    runs: [
      { id: 'src-B', span: 150, cut: 200, a: 'src', b: 'jbB', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（電源・シース青）', at: [[962, 452]] },
      { id: 'B-out', span: 150, cut: 250, a: 'jbB', b: 'out', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[890, 262]] },
      { id: 'B-s3S', span: 150, cut: 250, a: 'jbB', b: 's3S', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[892, 568]] },
      { id: 'A-B', span: 150, cut: 250, a: 'jbA', b: 'jbB', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[645, 446]] },
      { id: 'A-ceil', span: 150, cut: 250, a: 'jbA', b: 'ceil', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[540, 262]] },
      { id: 'A-s3L', span: 150, cut: 250, a: 'jbA', b: 's3L', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[542, 568]] },
      { id: 'A-ceilO', span: 100, cut: 150, a: 'jbA', b: 'ceilO', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（施工省略へ）', at: [[324, 414]] }
    ],

    /* 支給される材料（2C：250＋250＋150＝650 ≦ 850、3C：250×3＝750 ≦ 1050、2.0：200 ≦ 250） */
    supply: {
      cables: {
        'vvf20-2c': { len: 250, count: 1 },
        'vvf16-2c': { len: 850, count: 1 },
        'vvf16-3c': { len: 1050, count: 1 }
      },
      connectors: { 2: 2, 3: 2, 4: 0 },
      sleeves: { '小': 6, '中': 0, '大': 0 }
    },

    /* ========== 模範解答 ========== */
    answer: {
      wires: [
        { a: 'src.L', b: 'jbB', color: 'black', role: '電源 非接地側（L・2.0mm）' },
        { a: 'src.N', b: 'jbB', color: 'white', role: '電源 接地側（N・2.0mm）' },

        { a: 'jbB', b: 'out.L', color: 'black', role: '非接地側 → 露出形コンセント（常時通電）' },
        { a: 'jbB', b: 'out.W', color: 'white', role: '接地側 → 露出形コンセント W極' },

        { a: 'jbB', b: 's3S.0', color: 'black', role: '非接地側 → 3路スイッチS の「0」（黒は必須）' },
        { a: 'jbB', b: 's3S.3', color: 'white', role: 'スイッチ相互間（S の「3」・色は問わない）' },
        { a: 'jbB', b: 's3S.1', color: 'red', role: 'スイッチ相互間（S の「1」・色は問わない）' },

        { a: 'jbA', b: 'jbB', color: 'white', role: '接地側（A-B間3心の白）' },
        { a: 'jbA', b: 'jbB', color: 'black', role: 'スイッチ相互間（A-B間3心の黒）' },
        { a: 'jbA', b: 'jbB', color: 'red', role: 'スイッチ相互間（A-B間3心の赤）' },

        { a: 'jbA', b: 'ceil.W', color: 'white', role: '接地側 → 引掛シーリング 接地側' },
        { a: 'jbA', b: 'ceil.X', color: 'black', role: '負荷側 → 引掛シーリング' },

        { a: 'jbA', b: 'ceilO.W', color: 'white', role: '接地側 → 施工省略の引掛シーリング' },
        { a: 'jbA', b: 'ceilO.X', color: 'black', role: '負荷側 → 施工省略の引掛シーリング' },

        { a: 'jbA', b: 's3L.0', color: 'black', role: '負荷側 → Aの下の3路スイッチ「0」（色は問わない）' },
        { a: 'jbA', b: 's3L.3', color: 'white', role: 'スイッチ相互間（「3」・色は問わない）' },
        { a: 'jbA', b: 's3L.1', color: 'red', role: 'スイッチ相互間（「1」・色は問わない）' }
      ],
      bundles: [
        { jb: 'jbB', wires: ['src.L|jbB', 'jbB|out.L', 'jbB|s3S.0'], label: '① 非接地側（黒）3本＝スリーブ小・刻印「小」' },
        { jb: 'jbB', wires: ['src.N|jbB', 'jbB|out.W', 'jbA|jbB:white'], label: '② 接地側（白）3本＝スリーブ小・刻印「小」' },
        { jb: 'jbB', wires: ['jbA|jbB:black', 'jbB|s3S.3'], label: '③ 相互間 2本＝スリーブ小・刻印「○」' },
        { jb: 'jbB', wires: ['jbA|jbB:red', 'jbB|s3S.1'], label: '④ 相互間 2本＝スリーブ小・刻印「○」' },

        { jb: 'jbA', wires: ['jbA|jbB:white', 'jbA|ceil.W', 'jbA|ceilO.W'], label: '⑤ 接地側（白）3本＝差込形コネクタ3本用' },
        { jb: 'jbA', wires: ['jbA|s3L.0', 'jbA|ceil.X', 'jbA|ceilO.X'], label: '⑥ 負荷側 3本＝差込形コネクタ3本用' },
        { jb: 'jbA', wires: ['jbA|jbB:black', 'jbA|s3L.3'], label: '⑦ 相互間 2本＝差込形コネクタ2本用' },
        { jb: 'jbA', wires: ['jbA|jbB:red', 'jbA|s3L.1'], label: '⑧ 相互間 2本＝差込形コネクタ2本用' }
      ],
      explain: [
        '<b>①接地側（白）を配る</b>：電源の白 → B で露出形コンセントの W極と A-B間3心の白へ → A で引掛シーリングの接地側と施工省略の引掛シーリングへ。スイッチは通さない。',
        '<b>②非接地側（黒）を配る</b>：電源の黒 → B で<b>露出形コンセント</b>（常時通電）と<b>3路スイッチS の「0」</b>へ。S の「0」は必ず黒。',
        '<b>③スイッチ相互間の2本</b>：S の「1」「3」→ B で A-B間3心の黒・赤とつなぐ → A で Aの下の3路スイッチの「1」「3」へ。色別は問わず、<b>1と3を入れ替えても正解</b>。',
        '<b>④負荷側</b>：Aの下の3路スイッチの「0」→ A で引掛シーリングの黒と施工省略の黒をまとめる（2灯を<b>並列</b>にするので同時に点滅する）。',
        '<b>B部分＝リングスリーブ「小」4個</b>：黒3本（2.0×1＋1.6×2）＝刻印<b>小</b>、白3本（2.0×1＋1.6×2）＝刻印<b>小</b>、相互間2本（1.6×2）×2か所＝刻印<b>○</b>。支給6個のうち2個は予備。',
        '<b>A部分＝差込形コネクタ4個</b>：白3本・負荷側3本＝<b>3本用</b>、相互間2本×2か所＝<b>2本用</b>。支給数ちょうどで使い切る。',
        '<b>目で見て通電試験</b>：露出形コンセントは常時通電。どちらの3路スイッチを切り替えても、引掛シーリング2灯が<b>同時に</b>点いたり消えたりすれば正解。'
      ]
    }
  };

  window.PROBLEMS.push(no6);
})();
