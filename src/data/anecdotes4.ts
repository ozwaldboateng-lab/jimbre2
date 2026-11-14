// 逸話（1530〜40年代。天文五年のシナリオ向け）。今までの逸話と同じく、見せて主役の能力が少し伸びるだけ
// 人物がいないシナリオ（1552年より後など）では起きない
import type { Anecdote } from './anecdotes';

export const ANECDOTES_D: Anecdote[] = [
  {
    id: 'uminokuchi', title: '海ノ口城の初陣', bg: 'yukimichi', who: ['takeda_shingen', 'takeda_nobutora'], from: 1536, to: 1537, active: true,
    beats: [
      { head: '信濃・海ノ口', text: '雪の信濃。{takeda_nobutora}は八千の兵で海ノ口城を囲んだが、城は固く、ひと月攻めても落ちなかった。年の瀬も迫り、甲斐へ引き揚げることになった。' },
      { who: 'takeda_shingen', label: '武田の嫡男', text: '父上、殿（しんがり）はこの晴信にお任せくだされ。' },
      { who: 'takeda_nobutora', label: '甲斐の守護', text: '殿だと？　……敵は城に籠もったまま、追っても来まい。好きにせよ。' },
      { text: '本隊が去ったあと、晴信はわずか三百の兵を率いて、夜のうちに雪道を引き返した。' },
      { text: '甲斐勢が帰ったと気を緩めた城兵は、正月の酒に酔っていた。晴信の兵は門を破り、城主の平賀源心を討ち取ったと伝わる。' },
      { who: 'takeda_nobutora', label: '甲斐の守護', text: '空き城を拾うたくらいで、得意になるな。なぜ城を守らず、捨てて帰ってきた。', alt: '{takeda_nobutora}は、嫡男の手柄を褒めなかった。' },
      { who: 'g_kashin', name: '家中の侍', label: '武田家の家臣', text: '……若殿の手並み、ただごとではない。父君も、内心では。' },
      { text: '十六歳の初陣。父は認めなかったが、家臣たちは若き嫡男の器量を胸に刻んだ。' },
    ],
    gain: [['takeda_shingen', 'int', 2], ['takeda_shingen', 'lea', 1]], log: '{takeda_shingen}が初陣で海ノ口城を落としたという。',
  },
  {
    id: 'kabutonoo', title: '勝って兜の緒を締めよ', bg: 'zashiki_night', who: ['hojo_ujitsuna', 'hojo_ujiyasu'], from: 1537, to: 1541,
    beats: [
      { head: '小田原', text: '病の床についた{hojo_ujitsuna}は、跡を継ぐ{hojo_ujiyasu}を枕元に呼び、五か条の書き置きを手渡した。' },
      { who: 'hojo_ujitsuna', label: '北条の二代目', text: '一つ。大将たる者は、義を守れ。義を違えて国を取っても、後の世に恥を残す。' },
      { who: 'hojo_ujitsuna', label: '北条の二代目', text: '一つ。侍から百姓に至るまで、皆いとおしく思え。人を捨てる大将に、人はついて来ぬ。' },
      { who: 'hojo_ujitsuna', label: '北条の二代目', text: '一つ。分限を守れ。身の丈に合わぬ贅沢は、家を傾ける。' },
      { who: 'hojo_ujitsuna', label: '北条の二代目', text: '……そして、これを忘れるな。勝って、兜の緒を締めよ。' },
      { who: 'hojo_ujiyasu', label: '北条の嫡男', text: '勝って、兜の緒を……。肝に銘じまする。' },
      { text: '伊勢の家が北条を名乗って二代。この置文は、のちのちまで北条家の教えとして伝えられた。' },
    ],
    gain: [['hojo_ujiyasu', 'lea', 2], ['hojo_ujiyasu', 'cha', 1]], log: '{hojo_ujitsuna}が{hojo_ujiyasu}に五か条の置文を遺したという。',
  },
  {
    id: 'tsunehisa_kimae', title: '欲しいと言えば与える', bg: 'zashiki_day', who: ['amago_tsunehisa'], from: 1536, to: 1541,
    beats: [
      { head: '月山富田城', text: '出雲の{amago_tsunehisa}には、奇妙な癖があった。人が自分の持ち物を褒めると、その場で与えてしまうのである。' },
      { who: 'g_kashin', name: '若侍', label: '尼子家の家臣', text: '見事な庭の松にござりますな。これほどの枝ぶりは、都にもありますまい。' },
      { who: 'amago_tsunehisa', label: '出雲の老雄', text: 'そうか、気に入ったか。ならば持って行け。' },
      { text: '家臣は困り果てた。根の張った大松である。しかし経久は本気で、人を集めて掘り起こさせようとした。' },
      { who: 'g_rojin', name: '老臣', label: '尼子家の老臣', text: '殿、それではおちおち物も褒められませぬ。家臣は皆、殿の前では口をつぐんでおりまする。' },
      { who: 'amago_tsunehisa', label: '出雲の老雄', text: 'はは。物は人のところへ行ってこそ、生きる。わしは冬でも、木綿の小袖一枚で足りる。' },
      { text: '城を追われた牢人の身から十一か国の太守と呼ばれるまでになった男は、物惜しみをしなかった。家臣たちは、そのような主のために命を惜しまなかったという。' },
    ],
    gain: [['amago_tsunehisa', 'cha', 2]], log: '{amago_tsunehisa}が家臣の褒めた物を何でも与えたという。',
  },
  {
    id: 'soteki_kotoba', title: '武者は犬とも言え', bg: 'jinmaku', who: ['asakura_soteki'], from: 1536, to: 1555,
    beats: [
      { head: '越前・陣所', text: '朝倉家の軍を半世紀にわたって率いた老将{asakura_soteki}は、若い侍たちを前に、戦の心得を語って聞かせた。' },
      { who: 'g_kashin', name: '若侍', label: '朝倉家の家臣', text: '宗滴さま。武士の名を上げるには、何を第一に心がければよろしいのでしょう。' },
      { who: 'asakura_soteki', label: '朝倉の老将', text: '武者は、犬とも言え、畜生とも言え。勝つことが本にて候。' },
      { who: 'g_kashin', name: '若侍', label: '朝倉家の家臣', text: '……犬、畜生、にございますか。' },
      { who: 'asakura_soteki', label: '朝倉の老将', text: 'そうじゃ。いくら潔く死んでも、負ければ家も国も守れぬ。笑われようと、勝て。勝ってこそ、主も民も守れるのじゃ。' },
      { who: 'asakura_soteki', label: '朝倉の老将', text: 'それにの、大将たる者、合戦の前の晩は、必ず勝てると思うて寝よ。負けを思うて寝る大将の兵は、朝には逃げておる。' },
      { text: 'のちに宗滴の言葉は書き留められ、「朝倉宗滴話記」として伝わった。' },
    ],
    gain: [['asakura_soteki', 'lea', 1], ['asakura_soteki', 'int', 1]], log: '{asakura_soteki}が「武者は犬とも言え」と説いたという。',
  },
  {
    id: 'kippoushi', title: '吉法師の元服', bg: 'zashiki_day', who: ['oda_nobunaga', 'oda_nobuhide'], from: 1546, to: 1547,
    beats: [
      { head: '尾張・古渡城', text: '{oda_nobuhide}の嫡男・吉法師は十三歳になった。古渡の城で元服の儀が行われ、「三郎信長」と名乗ることになった。' },
      { who: 'oda_nobuhide', label: '尾張の虎', text: '吉法師、今日からは三郎信長じゃ。那古野の城は、そなたのものとせよ。' },
      { who: 'hirate_masahide', label: '守り役', text: '若殿、おめでとうござりまする。……どうか、その、御髪（おぐし）くらいは整えてくださりませ。', alt: '守り役の平手政秀は、晴れの日の若殿の身なりに冷や汗をかいた。' },
      { who: 'oda_nobunaga', label: '元服した若殿', text: '爺、髪など、戦には要らぬ。それより父上、初陣はいつでござる。' },
      { who: 'oda_nobuhide', label: '尾張の虎', text: 'はは、気の早いやつよ。……来年、三河の吉良大浜へ出す。今川の者どもに、そなたの顔を見せてやれ。' },
      { text: '翌年、信長は初陣で三河の吉良大浜を焼き払い、無事に帰ったと伝わる。父は、この嫡男の型破りを、案外楽しんでいたのかもしれない。' },
    ],
    gain: [['oda_nobunaga', 'lea', 1], ['oda_nobunaga', 'bra', 1]], log: '吉法師が元服して三郎{oda_nobunaga}と名乗ったという。',
  },
  {
    id: 'iroha_uta', title: 'いろは歌', bg: 'hondo', who: ['shimazu_tadayoshi'], from: 1537, to: 1550,
    beats: [
      { head: '薩摩・加世田', text: '{shimazu_tadayoshi}（日新斎）は、一族の争いを鎮めて子の貴久を当主に立てると、家臣や領民の心の拠り所を作ろうと考えた。' },
      { who: 'shimazu_tadayoshi', label: '島津の隠居', text: '難しい教えは、覚えられねば役に立たぬ。いろは四十七文字で始まる歌にすれば、子どもでも口ずさめよう。' },
      { text: 'こうして生まれた四十七首の歌は、のちに「日新公いろは歌」と呼ばれ、薩摩の侍の子が幼いころから唱える教えとなった。' },
      { who: 'shimazu_tadayoshi', label: '島津の隠居', text: '「いにしへの　道を聞きても　唱へても　わが行ひに　せずばかひなし」……聞くだけ、唱えるだけでは、意味がないのじゃ。' },
      { who: 'shimazu_takahisa', label: '島津の当主', text: '父上の歌、家中の者に必ず覚えさせまする。', alt: '子の貴久は、父の歌を家中に広めた。' },
      { text: '薩摩の強兵は、この教えの上に育ったといわれる。' },
    ],
    gain: [['shimazu_tadayoshi', 'cha', 1], ['shimazu_takahisa', 'cha', 1]], log: '{shimazu_tadayoshi}が「いろは歌」を作ったという。',
  },
];
