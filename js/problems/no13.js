/* ---------- 公表問題 No.13 ----------
   自動点滅器（端子台代用）で屋外灯（施工省略）、接地極付コンセント＋接地線（緑）
   A＝リングスリーブ、B＝差込形コネクタ。屋外灯へは端子台から VVR1.6-2C（丸形）で直行する。 */
(function () {
  'use strict';

  const no13 = {
    id: 'no13',
    title: '公表問題 No.13',
    subtitle: '自動点滅器（端子台代用）で屋外灯（施工省略）＋接地極付コンセント＋接地線（緑）',
    source: '候補問題No.13｜配線図＝令和8年度の公表PDF／材料・寸法・施工条件＝令和6〜8年度の実出題5回分（R6上期7/20、R6下期12/14、R7上期7/19、R7下期12/13、R8上期7/18）の問題PDFで一致／解答＝同5回分の解答PDFの文字部分が一致、複線図（ボックスBの組み合わせ）は令和8年度上期7/18の解答PDFで確認',

    conditions: [
      '配線及び器具の配置は、配線図（図1）のとおりに行う。<b>自動点滅器は端子台で代用</b>する。',
      '自動点滅器代用の端子台は<b>図2に従って</b>使用する（<b>1・2 間＝CdS回路</b>、<b>1・3 間＝接点</b>）。',
      '電源からの<b>接地側電線</b>には、すべて<b>白色</b>を使用する。',
      '電源から<b>点滅器・コンセント・自動点滅器</b>までの<b>非接地側電線</b>には、すべて<b>黒色</b>を使用する。',
      '<b>接地線には緑色</b>を使用する。',
      '次の器具の端子には<b>白色</b>を結線する：コンセントの接地側極端子（W表示）／ランプレセプタクルの受金ねじ部の端子／<b>自動点滅器（端子台）の記号 2 の端子</b>。',
      'VVF用ジョイントボックス部分を<b>経由する電線は、その部分ですべて接続</b>する（VVF用ジョイントボックス及びスイッチボックスは支給されないので、取り付けは省略）。',
      '接続は <b>A部分＝リングスリーブ</b>、<b>B部分＝差込形コネクタ</b>で行う。',
      '<b>埋込連用取付枠は、コンセント部分</b>に使用する（点滅器「イ」には使わない）。',
      '一点鎖線で囲んだ<b>屋外灯「ロ」と接地極 ED は施工省略</b>。電線の先端までを配線する。',
      '電線接続箇所のテープ巻きや絶縁キャップによる絶縁処理は省略する。作品は保護板（板紙）に取り付けない。'
    ],

    tips: [
      '<b>自動点滅器の端子台は 1・2・3 の3極</b>。1＝電源の非接地側（黒）、2＝接地側（白）、3＝接点の出口（黒→屋外灯）。中では 1–2 間に<b>CdS回路</b>（常に通電）、1–3 間に<b>接点</b>（暗くなると閉じる）がある。',
      '<b>端子台の 2 には白が2本</b>入る（ジョイントボックスBからの白と、屋外灯へ行く VVR の白）。屋外灯の白は<b>ボックスからではなく端子台の 2 から</b>取る。',
      '<b>屋外灯「ロ」はジョイントボックスを通らない</b>。端子台の 2・3 から <b>VVR1.6-2C（丸形）</b>で直接つなぐ。VVR は中に<b>介在物</b>があるので、シースのはぎ取り方が VVF と違う。',
      '<b>点滅器「イ」の帰り線は VVF1.6-3C の赤</b>。Aで点滅器の白と、Bでランプレセプタクルの黒とつなぐ。',
      '<b>接地線は緑だけ</b>。接地極付コンセントの接地極端子（⏚）から接地極 ED へ E1.6（緑）を1本。電圧のかかる端子に緑を入れてはいけない。',
      '<b>電源は VVF2.0-2C（シース青色）</b>。A部分の刻印は、2.0mmが混ざる黒3本・白2本が「<b>小</b>」、1.6mm×2本の帰り線だけが「<b>○</b>」。',
      'B部分は<b>差込形コネクタ 2本用・3本用・4本用を各1個</b>、ちょうど使い切る（白4本／黒3本／帰り線2本）。',
      '通電試験：コンセントは<b>常時通電</b>、点滅器「イ」でランプレセプタクルが点く。自動点滅器は<b>「暗い」にすると屋外灯が点く</b>。',
      '<b>ケーブルは長いまま支給される</b>ので、区間ごとに<b>自分で切り分けて</b>から使います。切る長さは<b>図の寸法＋接続・結線する端ごとに50mm</b>（ジョイントボックスの中で接続するぶん／器具に結線するぶん）。電源側と施工省略側（屋外灯・接地極 ED）は<b>切りっぱなし</b>なので足しません。VVF1.6-2C（約1400mm）からは 250mm×3本＋300mm（自動点滅器まで）を取ります。'
    ],

    /* ========== 単線図（左パネル） ========== */
    single: {
      viewBox: '0 35 470 390',
      lines: [
        { x1: 110, y1: 100, x2: 110, y2: 200 },   // 電源 → A（Aの真上）
        { x1: 110, y1: 200, x2: 235, y2: 200 },   // A ↔ B
        { x1: 235, y1: 200, x2: 380, y2: 200 },   // B → 自動点滅器
        { x1: 110, y1: 200, x2: 110, y2: 315 },   // A → 点滅器イ
        { x1: 235, y1: 200, x2: 235, y2: 112 },   // B → ランプレセプタクル
        { x1: 235, y1: 200, x2: 235, y2: 320 },   // B → 接地極付コンセント
        { x1: 254, y1: 330, x2: 272, y2: 330 },   // コンセント → ED（E1.6）
        { x1: 272, y1: 330, x2: 272, y2: 371 },
        { x1: 380, y1: 200, x2: 380, y2: 313 }    // 自動点滅器 → 屋外灯（VVR）
      ],
      symbols: [
        { type: 'text', x: 92, y: 58, text: '電源', size: 15, weight: 700 },
        { type: 'text', x: 84, y: 80, text: '1φ2W 100V', size: 10, fill: 'muted' },
        { type: 'jb', x: 110, y: 200, r: 26, label: 'A' },
        { type: 'jb', x: 235, y: 200, r: 26, label: 'B' },
        { type: 'lamp', x: 235, y: 85, mark: 'イ' },
        { type: 'switch-dots', x: 110, y: 315, marks: ['イ'], gap: 0 },
        { type: 'switch-dots', x: 380, y: 200, marks: ['ロ'], gap: 0, sub: ['A(3A)'] },   // 図1の「ロ／A(3A)」。添字はまとめて sub に渡す（別の text にすると ロ と重なる）
        { type: 'outlet', x: 235, y: 320, mark: 'E' },
        { type: 'text', x: 298, y: 330, text: 'E1.6', size: 10, fill: 'muted' },   // text は中央寄せ。線の角（272,330）にかからないよう右へ
        { type: 'omit-box', x: 248, y: 350, w: 96, h: 66, text: '施工省略' },
        { type: 'earth', x: 272, y: 385, label: 'ED' },
        { type: 'omit-box', x: 350, y: 262, w: 116, h: 136, text: '施工省略' },
        { type: 'lamp', x: 380, y: 340, outdoor: true, mark: 'ロ', label: '屋外灯' },
        { type: 'text', x: 380, y: 340, text: '⊗', size: 30, weight: 400 }   // 屋外灯の記号は ○ の中に ⊗（text は中央寄せなので ○ の中心と同じ x）
      ]
    },

    /* ========== 作業エリア ========== */
    workspace: { viewBox: '0 0 1240 800' },

    devices: [
      {
        /* 電源は A の真上（VVF2.0-2C 150mm） */
        id: 'src', type: 'source', group: 'src',
        x: 395, y: 115, label: '電源', note: '単相100V',
        shape: { rx: 138, ry: 58 },
        terminals: [
          { id: 'L', name: '非接地側 L（黒）', short: 'L 非接地側', kind: 'source-l', dx: 58, dy: -26, dir: 'right', labelDir: 'up' },
          { id: 'N', name: '接地側 N（白）', short: 'N 接地側', kind: 'source-n', dx: 58, dy: 26, dir: 'right', labelDir: 'down' }
        ]
      },
      { id: 'jbA', type: 'jointbox', group: 'jbA', connect: 'sleeve', x: 395, y: 380, r: 100, label: 'VVF用ジョイントボックス A' },
      { id: 'jbB', type: 'jointbox', group: 'jbB', connect: 'connector', x: 712, y: 380, r: 100, label: 'VVF用ジョイントボックス B' },
      {
        /* B の真上。受金側の名札は左へ出す（下へ出すと B から来るケーブルにかかる） */
        id: 'lamp', type: 'lamp', group: 'lamp',
        x: 712, y: 110, label: 'ランプレセプタクル', mark: 'イ', loadName: 'ランプレセプタクル イ',
        terminals: [
          { id: 'W', name: '受金ねじ部の端子（接地側・白）', short: '接地側（受金）', kind: 'load-n', dx: -62, dy: 40, dir: 'down', labelDir: 'left' },
          { id: 'X', name: '中心接触片の端子（非接地側）', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      },
      {
        /* A の真下。取付枠は使わない（施工条件5：取付枠はコンセント部分） */
        id: 'swI', type: 'switch', group: 'swI', poleSwap: true,
        x: 395, y: 690, label: '埋込連用タンブラスイッチ', mark: 'イ',
        terminals: [
          { id: 'L', name: '負荷側端子（帰り線）', short: '負荷側', kind: 'sw-load', dx: -86, dy: 0, dir: 'left' },
          { id: 'C', name: '電源側端子（黒）', short: '電源側', kind: 'sw-com', dx: 86, dy: 0, dir: 'right' }
        ]
      },
      {
        /* B の真下。上から来る VVF が名前の文字にかからないよう、区間の端を少し上で止める（shape.ry）。
           接地極端子は右上に置き、右下へ出る E1.6（緑）と重ならないようにする */
        id: 'oe', type: 'outlet', group: 'oe',
        x: 712, y: 630, shape: { rx: 72, ry: 80 },
        label: '埋込連用接地極付コンセント', note: 'E',
        terminals: [
          { id: 'W', name: '接地側極端子（W表示）', short: '接地側W', kind: 'outlet-n', dx: -72, dy: -20, dir: 'left', labelDir: 'left' },
          { id: 'L', name: '非接地側極端子', short: '非接地側', kind: 'outlet-l', dx: -72, dy: 20, dir: 'left', labelDir: 'left' },
          { id: 'E', name: '接地極端子（⏚・緑）', short: '接地極', kind: 'earth', dx: 72, dy: -18, dir: 'right' }
        ]
      },
      {
        /* コンセントの右下（E1.6 緑 100mm）。端子は接地棒の軸に置き、左から来る緑を受ける */
        id: 'ed', type: 'earth', group: 'ed', omitted: true,
        x: 895, y: 690, shape: { rx: 34, ry: 40 }, label: '接地極 ED',
        omitBox: { x: 836, y: 628, w: 120, h: 132, text: '施工省略' },
        terminals: [
          { id: 'E', name: '接地極（D種接地）', short: 'ED', kind: 'earth', dx: 0, dy: -20, dir: 'left', labelDir: 'right' }
        ]
      },
      {
        /* 自動点滅器（端子台3極で代用）。1–2 間が CdS 回路、1–3 間が接点（暗いと閉じる）。B の右。
           端子は下に 1・2・3。下へ出る VVR が 2 と 3 のあいだから出るよう、端子（間隔64）の並びを 16 だけ左に寄せる */
        id: 'as', type: 'terminal', group: 'as',
        x: 1020, y: 380, shape: { rx: 106, ry: 56 },
        label: '端子台（自動点滅器代用）', mark: 'ロ', note: '暗くなると 1–3 が閉じる',
        contacts: [['1', '3']],
        switchLabels: { on: '暗い（1–3 閉）', off: '明るい（1–3 開）' },
        terminals: [
          { id: '1', tbName: '1', name: '1（電源の非接地側・黒）', short: '1', kind: 'tb-l', dx: -80, dy: 56, dir: 'down', max: 1 },
          { id: '2', tbName: '2', name: '2（接地側・白 2本）', short: '2', kind: 'tb-n', dx: -16, dy: 56, dir: 'down', max: 2 },
          { id: '3', tbName: '3', name: '3（接点の出口 → 屋外灯）', short: '3', kind: 'sw-load', dx: 48, dy: 56, dir: 'down', max: 1 }
        ]
      },
      {
        /* 屋外灯（施工省略）。自動点滅器の下（VVR1.6-2C 200mm）。
           x は「VVR が端子台の 2 と 3 のあいだから出る」位置（端子台の中心から +14）になるよう計算で決めた。
           上から来る VVR が名前の文字にかからないよう、区間の端を少し上で止める（shape.ry） */
        id: 'ol', type: 'lamp', variant: 'outdoor', group: 'ol', omitted: true,
        x: 1092, y: 640, shape: { rx: 72, ry: 96 },
        label: '屋外灯', mark: 'ロ', loadName: '屋外灯 ロ（施工省略）',
        omitBox: { x: 972, y: 540, w: 224, h: 220, text: '施工省略' },
        terminals: [
          { id: 'W', name: '接地側', short: '接地側', kind: 'load-n', dx: -62, dy: 40, dir: 'down' },
          { id: 'X', name: '非接地側', short: '非接地側', kind: 'load-x', dx: 62, dy: 40, dir: 'down' }
        ]
      }
    ],

    frames: [
      { x: 606, y: 570, w: 212, h: 124, label: '埋込連用取付枠', labelDx: -40 }
    ],

    pairs: [
      { sw: 'swI', load: 'lamp', mark: 'イ' },
      { sw: 'as', load: 'ol', mark: 'ロ' }
    ],

    /* 100V 以外の回路（接地線） */
    nets: [
      { id: 'earth', name: '接地線（緑）',
        groups: [['oe.E'], ['ed.E']],
        bad: '接地線（緑）がつながっていません',
        hint: '接地極付コンセントの接地極端子（⏚）と接地極 ED を、<b>緑色</b>の電線でつなぎます。' }
    ],

    runs: [
      { id: 'src-A', span: 150, cut: 200, a: 'src', b: 'jbA', slots: 1, need: 'vvf20-2c', note: 'VVF2.0-2C（電源・シース青）', at: [[315, 232]] },
      { id: 'A-sw', span: 150, cut: 250, a: 'jbA', b: 'swI', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[315, 578]] },
      { id: 'A-B', span: 150, cut: 250, a: 'jbA', b: 'jbB', slots: 1, need: 'vvf16-3c', note: 'VVF1.6-3C（黒・白・赤）', at: [[553, 330]] },
      { id: 'B-lamp', span: 150, cut: 250, a: 'jbB', b: 'lamp', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[792, 232]] },
      { id: 'B-oe', span: 150, cut: 250, a: 'jbB', b: 'oe', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C', at: [[792, 532]] },
      { id: 'B-as', span: 200, cut: 300, a: 'jbB', b: 'as', slots: 1, need: 'vvf16-2c', note: 'VVF1.6-2C（200mm）', at: [[866, 330]] },
      { id: 'as-ol', span: 200, cut: 250, a: 'as', b: 'ol', slots: 1, need: 'vvr16-2c', note: 'VVR1.6-2C（丸形・屋外灯へ）', at: [[1140, 490]] },
      { id: 'oe-ed', span: 100, cut: 150, a: 'oe', b: 'ed', slots: 1, need: 'iv16-green', note: 'IV1.6 緑（接地線 E1.6）', at: [[790, 730]] }
    ],

    /* 支給される材料 */
    supply: {
      cables: {
        'vvf20-2c':   { len: 250, count: 1 },
        'vvf16-2c':   { len: 1400, count: 1 },
        'vvf16-3c':   { len: 350, count: 1 },
        'vvr16-2c':   { len: 250, count: 1 },
        'iv16-green': { len: 150, count: 1 }
      },
      connectors: { 2: 1, 3: 1, 4: 1 },
      sleeves: { '小': 5, '中': 0, '大': 0 }
    },

    /* ========== 模範解答 ========== */
    answer: {
      wires: [
        { a: 'src.L', b: 'jbA', color: 'black', role: '電源 非接地側（L）' },
        { a: 'src.N', b: 'jbA', color: 'white', role: '電源 接地側（N）' },

        { a: 'jbA', b: 'swI.C', color: 'black', role: '非接地側 → 点滅器イ 電源側端子' },
        { a: 'jbA', b: 'swI.L', color: 'white', role: 'イの帰り線（2心の相方＝白）' },

        { a: 'jbA', b: 'jbB', color: 'black', role: '非接地側（3心の黒）' },
        { a: 'jbA', b: 'jbB', color: 'white', role: '接地側（3心の白）' },
        { a: 'jbA', b: 'jbB', color: 'red', role: 'イの帰り線（3心の赤）' },

        { a: 'jbB', b: 'lamp.W', color: 'white', role: '接地側 → 受金ねじ部' },
        { a: 'jbB', b: 'lamp.X', color: 'black', role: 'イの帰り線 → 中心端子' },

        { a: 'jbB', b: 'oe.W', color: 'white', role: '接地側 → コンセント W端子' },
        { a: 'jbB', b: 'oe.L', color: 'black', role: '非接地側 → コンセント（常時通電）' },
        { a: 'oe.E', b: 'ed.E', color: 'green', role: '接地線（緑）→ 接地極 ED' },

        { a: 'jbB', b: 'as.1', color: 'black', role: '非接地側 → 自動点滅器 1' },
        { a: 'jbB', b: 'as.2', color: 'white', role: '接地側 → 自動点滅器 2（CdS回路）' },
        { a: 'as.2', b: 'ol.W', color: 'white', role: '接地側 → 屋外灯（端子台の 2 から取る・VVR）' },
        { a: 'as.3', b: 'ol.X', color: 'black', role: '接点の出口 3 → 屋外灯（VVR）' }
      ],
      bundles: [
        { jb: 'jbA', wires: ['src.L|jbA', 'jbA|swI.C', 'jbA|jbB:black'], label: '非接地側（黒）3本' },
        { jb: 'jbA', wires: ['src.N|jbA', 'jbA|jbB:white'], label: '接地側（白）2本' },
        { jb: 'jbA', wires: ['jbA|swI.L', 'jbA|jbB:red'], label: 'イの帰り 2本' },

        { jb: 'jbB', wires: ['jbA|jbB:white', 'jbB|lamp.W', 'jbB|oe.W', 'jbB|as.2'], label: '接地側（白）4本' },
        { jb: 'jbB', wires: ['jbA|jbB:black', 'jbB|oe.L', 'jbB|as.1'], label: '非接地側（黒）3本' },
        { jb: 'jbB', wires: ['jbA|jbB:red', 'jbB|lamp.X'], label: 'イの帰り 2本' }
      ],
      explain: [
        '<b>①接地側（白）を配る</b>：ランプレセプタクルの受金ねじ部、コンセントのW端子、自動点滅器（端子台）の <b>2</b> へ。屋外灯の接地側は<b>端子台の 2 から</b> VVR の白で取る（2 に白2本）。',
        '<b>②非接地側（黒）を配る</b>：点滅器イの電源側、コンセント、自動点滅器の <b>1</b> へ。電源→A→Bと送り、Aで点滅器へ、Bでコンセントと端子台 1 へ分ける。',
        '<b>③自動点滅器</b>：1–2 間の CdS 回路には常に電圧がかかり、<b>暗くなると 1–3 間の接点が閉じる</b>。3 から VVR の黒で屋外灯へ。屋外灯へは<b>ジョイントボックスを通らず直接</b>つなぐ。',
        '<b>④点滅器イの帰り線</b>：点滅器イの負荷側（白）→ Aで3心の<b>赤</b>とつなぐ → Bでランプレセプタクルの中心端子へ行く黒とつなぐ。',
        '<b>⑤接地線（緑）</b>：接地極付コンセントの接地極端子（⏚）から接地極 ED へ E1.6（緑）を1本。<b>緑は接地線だけ</b>に使う。',
        '<b>A部分＝リングスリーブ「小」3か所</b>：黒3本（2.0×1＋1.6×2）＝刻印<b>小</b>、白2本（2.0×1＋1.6×1）＝刻印<b>小</b>、帰り線2本（1.6×2）＝刻印<b>○</b>。5個支給のうち2個は予備。',
        '<b>B部分＝差込形コネクタ3か所</b>：白4本＝<b>4本用</b>、黒3本＝<b>3本用</b>、帰り線2本＝<b>2本用</b>。ちょうど使い切る。',
        '<b>目で見て通電試験</b>：コンセントは常時通電。点滅器イを入れるとランプレセプタクルが、自動点滅器を「暗い」にすると屋外灯が点けば正解。'
      ]
    }
  };

  window.PROBLEMS.push(no13);
})();
