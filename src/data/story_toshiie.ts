// 武将で遊ぶ「前田利家 ― 残り火」第一部の筋書き。場面の語り・セリフは小説『残り火』（第一章〜第三章）から縮めて使う
// who は話し手（武将の id か、この物語だけの人物 STORY_CAST の id）。bg は場面の絵（SCENE_ART の名か、届いた物語の絵）
export interface Beat { who?: string; text: string; bg?: string; head?: string }
export interface Choice { id: string; label: string; note?: string }

// この物語だけの人物（顔の絵が届いたら PORTRAITS に同じ id で入れる）
export const STORY_CAST: Record<string, string> = {
  matsu: 'まつ', inuchiyo: '犬千代', toshiharu: '前田利春', toshihisa: '前田利久', juami: '拾阿弥', fukushima: '福島', sakakibara: '榊原',
  matabe: '又兵衛', wakazamurai: '若侍くずれ', koshin: '前田家の古参', kerai: '前田家の家臣', monban: '門番', kosan: '勝家配下の古参', tsukai: '使い',
  sanro: '三郎',
};
// 場面の絵（注文の絵が届くまでは今ある絵で代わりに）
export const STORY_BG: Record<string, string> = {
  arako: 'mura', arako_night: 'zashiki_night', sakaya: 'ichi', kiyosu_tsuji: 'ichi', kiyosu_niwa: 'ishigaki', denchu: 'zashiki_day', moribe: 'senjo',
  okehazama: 'amemichi', ta_yoru: 'tsukiyo', atsuta: 'minato', fukushima: 'mura', jinmaku: 'jinmaku', hiroma: 'zashiki_day',
};

// ───────── 序幕（第一章「火の庭」。見せるだけ） ─────────
export const PROLOGUE: Beat[] = [
  { head: '残り火　第一章　火の庭', bg: 'arako', text: '尾張という国は、遠目には穏やかな国に見える。だが、景色と人の腹は別である。同じ織田の一門でありながら、清洲だの岩倉だの犬山だのと、それぞれが半ば別の国の主のように振る舞っている。' },
  { bg: 'arako', text: '荒子は、その尾張の南寄りにある。田の中に土塁が盛り上がり、浅い堀がめぐる。城というより、大きな土の屋敷である。その前田家の四男が、犬千代である。' },
  { bg: 'arako', text: '四男というものは、戦国の家では扱いに困る。いてもいなくても、家の形は変わらぬ。だから犬千代に残された道は、家の中で待つことではなく、外で名を作ることだった。' },
  { bg: 'arako', text: '喧嘩は腕だけでは決まらない。先に「こいつには勝てぬ」と思った方が負ける。ならば目立てばいい。派手に歩けばいい。槍を長くすればいい。犬千代の槍は、異様に長かった。' },
  { who: 'matsu', bg: 'arako', text: 'また喧嘩ですか' },
  { who: 'inuchiyo', bg: 'arako', text: '喧嘩じゃねえ' },
  { who: 'matsu', bg: 'arako', text: '……人を殴りにいく顔です。父上がまた困ります' },
  { bg: 'arako', text: 'のちのまつである。この時はまだ、ただの年下の武家の娘にすぎない。だが、不思議と人をまっすぐ見る目をしていた。' },
  { bg: 'kiyosu_tsuji', text: '清洲の辻で、着方のひどくいい加減な若者と向き合った。道を譲るということを知らない歩き方である。' },
  { who: 'inuchiyo', bg: 'kiyosu_tsuji', text: 'どけ' },
  { who: 'sanro', bg: 'kiyosu_tsuji', text: '道は広い' },
  { who: 'inuchiyo', bg: 'kiyosu_tsuji', text: '俺は真ん中を歩く' },
  { bg: 'kiyosu_tsuji', text: '素手で殴り合い、二度、三度と石畳に転がされた。こんなにきれいに負かされたのは初めてだった。「強えな」「名前は」「前田犬千代」「三郎」。それだけで、若者は去っていった。' },
  { who: 'oda_nobunaga', bg: 'kiyosu_niwa', text: '入れ。……来るか' },
  { who: 'inuchiyo', bg: 'kiyosu_niwa', text: '退屈しなさそうだ' },
  { bg: 'kiyosu_niwa', text: '清洲城の庭では、立つ場所は前へ出た者のものだった。家の筋ではなく、今ここでの働きで人が見られる。犬千代には、その空気がやけに肌に合った。' },
  { who: 'ikeda_tsuneoki', bg: 'kiyosu_niwa', text: '三郎、そのでかいのは誰だ' },
  { who: 'sassa_narimasa', bg: 'kiyosu_niwa', text: '長すぎる。……戦は見世物じゃない。勝ち方にも型がある' },
  { who: 'sassa_narimasa', bg: 'kiyosu_niwa', text: 'お前は一人で負ければ済む顔をしてる。俺はそうはいかない' },
  { who: 'kinoshita_tokichiro', bg: 'kiyosu_niwa', text: '長い槍は便利そうですな' },
  { who: 'inuchiyo', bg: 'kiyosu_niwa', text: '戦ったことあるのか。……なら黙ってろ' },
  { head: '萱津', bg: 'jinmaku', text: '尾張の争いの中へ、三郎信長が兵を率いて踏み出す最初期の戦。信長は兵の前で「行くぞ」とだけ言い、馬ではなく、歩いて兵の前へ出た。' },
  { who: 'ikeda_tsuneoki', bg: 'jinmaku', text: 'どうだ、戦は' },
  { who: 'inuchiyo', bg: 'jinmaku', text: '喧嘩より派手だ' },
  { head: '森部', bg: 'moribe', text: '川と田が入り組んだ土地で、朝霧が深い。囲まれた恒興の叫び声に、犬千代は何も考えずに走った。「どけ」。霧の中で、三人の息だけが荒い。' },
  { who: 'ikeda_tsuneoki', bg: 'moribe', text: '助かった。……お前たちが来ると思った' },
  { bg: 'moribe', text: '喧嘩と違って、戦では背中を預けるということがある。それは犬千代にとって、新しい感覚だった。' },
  { who: 'kinoshita_tokichiro', bg: 'hiroma', text: '長い槍の噂が出始めています。数はどうでもいいのです。人は話で負けます' },
  { who: 'sassa_narimasa', bg: 'hiroma', text: '……長い槍も悪くない。褒めてはいない' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: '面白い奴が揃った' },
  { head: '稲生', bg: 'jinmaku', text: '敵は信長の弟、信行。信長方七百、信行方千七百。前夜、成政の兄が討たれた報せが入った。' },
  { who: 'sassa_narimasa', bg: 'jinmaku', text: '兄が死ねば、次は俺だ。明日、負けるわけにはいかん' },
  { bg: 'jinmaku', text: '信長は馬を降り、槍を取って自分の足で前へ歩き出した。「かかれ」。恒興を救った直後、犬千代の右目の下に矢が深く刺さった。' },
  { who: 'inuchiyo', bg: 'jinmaku', text: 'まだ首を取ってねえ' },
  { who: 'oda_nobunaga', bg: 'jinmaku', text: 'まだ抜かんのか。……馬鹿だな。名は' },
  { who: 'inuchiyo', bg: 'jinmaku', text: '犬千代' },
  { who: 'oda_nobunaga', bg: 'jinmaku', text: '覚えた' },
  { head: '拾阿弥', bg: 'denchu', text: '拾阿弥は、ただ嫌味なだけの近習ではなかった。城の実務を回す、使える男。だが夜の裏手で銭袋を受け取り、敵へ刻限を流しているらしい。騒げば信長の恥になる。だから犬千代は黙っていた。' },
  { who: 'juami', bg: 'denchu', text: 'しかし長い槍も結構なものです。遠くから届くものは、身を汚さずに済みますからな' },
  { who: 'inuchiyo', bg: 'denchu', text: 'お前、誰のために働いてる。……夜、誰と会ってた' },
  { who: 'juami', bg: 'denchu', text: '喧嘩屋の分際で、城のことが分かるか。……若い方は、気が早い' },
  { bg: 'denchu', text: '白い刃が一度だけ走る。それで済んだ。殿中の血は、白い畳の上でやけに赤い。' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: '斬ったのか。……なぜだ' },
  { who: 'inuchiyo', bg: 'hiroma', text: '盗人を斬ったまでだ。盗人なら、どこで斬っても同じだ' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: '同じではない。ここは俺の城だ。俺の城の掟で裁く' },
  { bg: 'hiroma', text: '恒興は情で、成政は理で、柴田勝家のもとへ走った。勝家は言った。「よかろう。俺が行く」。' },
  { who: 'shibata_katsuie', bg: 'hiroma', text: '犬千代は惜しい。殿中で刀を抜いた。死罪でも文句は言えぬ。だが、斬るには惜しい' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: '甘いな。……追い出す。二度と近づけるな' },
  { who: 'sassa_narimasa', bg: 'kiyosu_tsuji', text: '次はない' },
  { who: 'inuchiyo', bg: 'kiyosu_tsuji', text: '次はうまくやる' },
  { bg: 'kiyosu_tsuji', text: '城門の外にまつがいた。何か言いかけて、言わない。橋を渡り、一度だけ振り返る。その中に、信長がいる。恒興がいる。成政がいる。' },
  { who: 'inuchiyo', bg: 'kiyosu_tsuji', text: '面白え' },
];

// ───────── 第一幕「こぼれた火」の出来事 ─────────
export const EV_RETURN: Beat[] = [
  { head: '残り火　第二章　こぼれた火', bg: 'arako', text: '永禄二年、夏。追放されても、槍だけは返された。仕える先もなく、呼ぶ声もなく、ただ荒子へ戻る男が担いでいると、長すぎる槍はひどく半端に見えた。' },
  { bg: 'arako', text: '行くところがないから戻る。その違いだけで、同じ土塁がまるで別のものに見えた。「ちっ」。' },
  { who: 'monban', bg: 'arako', text: 'お戻りで' },
  { who: 'matsu', bg: 'arako', text: 'お戻りになりましたか' },
  { who: 'maeda_toshiie', bg: 'arako', text: '戻りたくて戻ったわけじゃねえ' },
  { who: 'matsu', bg: 'arako', text: 'そうでしょうね。お顔を見れば。……まだ赤いですね、ここ。でも、痛そうです' },
  { who: 'toshiharu', bg: 'arako_night', text: '戻ったか。追い出されたとも聞く。……そんなところ、で済むことばかりしてきたな。しばらくは、ここにいろ' },
  { who: 'toshihisa', bg: 'arako_night', text: '無事であったか' },
  { who: 'maeda_toshiie', bg: 'arako_night', text: '死んでりゃ戻らねえ' },
  { who: 'matsu', bg: 'arako_night', text: '……利家様は、くたばったりしない人です。そういう人ではないからです' },
  { bg: 'arako_night', text: '（ここから遊ぶ。荒子で旬を過ごし、金と名と噂を自分で稼ぐ。俸禄も主命もない。屋敷の人と話し、酒屋や清洲の辻で噂を拾う）' },
];
export const EV_SAKAYA: Beat[] = [
  { bg: 'sakaya', text: '荒子の城下の小さな酒屋。若侍くずれが二人、朝から飲んでいる。どこぞの家の次男三男で、仕官口を得る前に家が傾いた連中である。' },
  { who: 'wakazamurai', bg: 'sakaya', text: 'おや、清洲帰りだ。……いや、追い返され帰りか' },
  { who: 'wakazamurai', bg: 'sakaya', text: '清洲じゃ名が売れてたんだろう。こっちでまで威張るなよ' },
  { who: 'maeda_toshiie', bg: 'sakaya', text: '威張って見えるか。……じゃあ、どけ。道で見かけたら、これからもどけ' },
];
export const SAKAYA_CHOICES: Choice[] = [
  { id: 'ogoru', label: '「座れ。飲め」と奢って黙らせる', note: '金−6。荒子で喧嘩の噂は立たない' },
  { id: 'kenka', label: '表へ出ろ。喧嘩で黙らせる', note: '名が上がるが、家の中で面倒になる' },
];
export const EV_SAKAYA_OGORU: Beat[] = [
  { who: 'wakazamurai', bg: 'sakaya', text: '奢りか' },
  { who: 'maeda_toshiie', bg: 'sakaya', text: '勘違いするな。黙らせるためだ' },
  { bg: 'sakaya', text: 'その場はそれで収まった。だが懐が軽い。奢ったのは余計だ。「ちっ」。' },
];
export const EV_SAKAYA_KENKA: Beat[] = [
  { bg: 'sakaya', text: '表へ引きずり出し、二人とも土に転がした。見物の町人がざわめく。「長い槍の男は、荒子でも暴れるらしい」。' },
  { who: 'toshihisa', bg: 'arako_night', text: '……町で騒ぎを起こしたそうだな。家の名を、これ以上軽くするな' },
];
export const EV_KOSHIN: Beat[] = [
  { bg: 'arako_night', text: '台所の古参が、帳面を前に顔を曇らせている。' },
  { who: 'koshin', bg: 'arako_night', text: '米が、少し上がりまして。清洲の方がきな臭いせいで。……余計な口は利きたくございませんが、銭の動きは早う見ておかねばなりませぬ' },
  { bg: 'arako_night', text: '米の値が上がる。銭の動きを見ろ。武士が。……妙に腹が立った。（熱田の湊で用心棒の口が見つかるようになった）' },
  { who: 'matsu', bg: 'arako_night', text: '今日は、お酒の匂いが強いです。……たくさん嫌だと言うと、怒りそうです。では、少しだけです' },
];
export const EV_FATHER: Beat[] = [
  { head: '父の死', bg: 'arako_night', text: '永禄二年の秋。父・利春が死んだ。誰も声を荒らげない。家人たちは粛々と動く。' },
  { bg: 'arako_night', text: '父が死ぬと、家は静かに形を変える。死者のための作法が終われば、その場で次の手が打たれる。利久が前へ出た。兄は正しい。正しく家督を継ぐ。' },
  { who: 'maeda_toshiie', bg: 'arako_night', text: 'くそ' },
  { bg: 'arako_night', text: '父を失った悔しさなのか。自分でも分からなかった。待っていても、家は動く。' },
];
export const EV_ANIKE: Beat[] = [
  { head: '兄の家', bg: 'arako', text: '庭の木陰で、若い家臣が二人、槍を持て余していた。' },
  { who: 'kerai', bg: 'arako', text: 'やはり、犬千代様がおられぬとな。……馬鹿を言うな。いまは利久様が当主だ' },
  { who: 'toshihisa', bg: 'arako_night', text: '犬千代。馬が一頭、脚を悪くした。見たか。……どうだ' },
  { who: 'maeda_toshiie', bg: 'arako_night', text: '駄目だろうな' },
  { who: 'toshihisa', bg: 'arako_night', text: 'そうか' },
  { bg: 'arako_night', text: '兄は悪くない。悪い男なら、憎める。' },
  { who: 'kerai', bg: 'arako_night', text: '家中が、少し落ち着きませぬ。皆、まだ迷っておるのです' },
];
export const EV_IRAI: Beat[] = [
  { bg: 'sakaya', text: '酒屋で、見覚えのない男が盃を置いた。荒子の西はずれに小さな地を持つ地侍である。' },
  { who: 'fukushima', bg: 'sakaya', text: '前田殿。腕を見込んで、少し頼みがある。……喧嘩より、少し面倒です' },
  { who: 'fukushima', bg: 'fukushima', text: '田の水で揉めましてな。隣の榊原が、食い詰めた浪人を七、八人抱え込みまして。夜になると畦を崩す。水口を勝手にいじる' },
  { who: 'fukushima', bg: 'fukushima', text: '立っていただきたい。前田利家がこちらにいると分かれば、それだけで退く者もおります。……脅しで済むなら安いものです' },
  { who: 'maeda_toshiie', bg: 'fukushima', text: 'いくら出す' },
  { who: 'fukushima', bg: 'fukushima', text: '三十貫' },
];
export const IRAI_CHOICES: Choice[] = [
  { id: '50', label: '「足りねえ。五十だ」', note: '五十貫。福島は渋るが呑む' },
  { id: '30', label: '「三十でいい」', note: '三十貫。福島の親しさが上がる' },
];
export const EV_NIGHT1: Beat[] = [
  { head: '浪人の槍', bg: 'ta_yoru', text: '夜。月明かりの畦道に、三つの影が水口へ寄ってくる。' },
  { who: 'maeda_toshiie', bg: 'ta_yoru', text: 'おい。……前田利家だ。帰れ' },
  { bg: 'ta_yoru', text: '「一人で何ができる」「試すか」。長槍が一度だけ伸び、影は散った。' },
];
export const EV_HIRU: Beat[] = [
  { bg: 'fukushima', text: '翌日の昼。榊原の浪人どもが、昼間のうちに水口を切ったという報せが来た。' },
  { who: 'maeda_toshiie', bg: 'fukushima', text: '馬鹿が。いまから行く' },
  { who: 'matabe', bg: 'fukushima', text: 'お待ちくだされ。前田殿が怒って真っすぐ来るのを、向こうも読んでおります。田は広う見えて、道は狭い。畦は二人も並べば詰まる' },
  { who: 'matabe', bg: 'fukushima', text: '勝つのと、残すのは違います。殴り勝つだけなら、前田殿一人でよいでしょう。だが田を残し、水を残し、人を残すなら、それでは足りませぬ' },
  { who: 'matabe', bg: 'fukushima', text: 'まず、前田殿は今夜動かぬことです。若い者を二手に分け、狭いところだけ守る。前田殿は、最後です' },
];
export const HIRU_CHOICES: Choice[] = [
  { id: 'matsu', label: '「……分かった」又兵衛の策で、今夜は待つ', note: '待つことを覚える。噂を読む力が上がる' },
  { id: 'iku', label: '待てねえ。いまから真っすぐ行く', note: '武勇で押し切る。勝っても傷が残るかもしれない' },
];
export const EV_NIGHT2_WAIT: Beat[] = [
  { bg: 'ta_yoru', text: '足音の向き。水を踏む癖。やがて相手が来た。五人。狭い畦で詰まったところへ、最後に利家が踏み込む。相手は驚いて乱れた。' },
  { who: 'maeda_toshiie', bg: 'ta_yoru', text: '下がるな！……帰れ' },
  { who: 'matabe', bg: 'ta_yoru', text: 'ようございました。前田殿が待たれたからです。……嫌いなことが役に立つなら、それもまた武でございます' },
  { who: 'matsu', bg: 'arako_night', text: '勝ちましたか。……負けたお顔ではないからです' },
];
export const EV_NIGHT2_RUSH: Beat[] = [
  { bg: 'ta_yoru', text: '真っすぐ乗り込んだ。読まれていた。広い畦で囲まれ、槍を振るうたびに田の苗が踏み荒らされる。' },
  { bg: 'ta_yoru', text: '押し切りはした。だが福島の田は半分が泥になり、若い者が一人、足を折った。' },
  { who: 'matabe', bg: 'fukushima', text: '……勝たれましたな。勝つのと、残すのは違います。それだけは、お忘れなく' },
];
export const EV_RIEKI: Beat[] = [
  { head: '利益', bg: 'arako', text: '兄・利久のもとに、養子が来た。目のよい若者である。' },
  { who: 'kerai', bg: 'arako', text: '利久様の……養子に。利益様にございます' },
  { who: 'maeda_toshimasu', bg: 'arako', text: '……お声が、廊下まで聞こえております' },
  { who: 'maeda_toshiie', bg: 'arako', text: '気に食わねえ。聞かせてるわけじゃねえ' },
  { bg: 'arako_night', text: '利家は、初めてそこで「焦り」に似たものを知った。' },
  { who: 'matsu', bg: 'arako_night', text: '利家様は、嫌なのですね。……でも、家はそのように進むのでしょう' },
  { who: 'maeda_toshiie', bg: 'arako_night', text: '俺は前田の男だ。なのに、家のことが俺抜きで決まってく' },
  { who: 'matsu', bg: 'arako_night', text: 'では、入るしかないのでは。前田の家にも、信長様のところにも' },
  { who: 'maeda_toshiie', bg: 'arako_night', text: '……まだ行かねえ。だが、もう待たねえ' },
];
export const EV_UWASA: Beat[] = [
  { head: '噂', bg: 'sakaya', text: '戦の報せは、武士の家へ届く前に、たいてい町へ落ちる。米が動く。馬が動く。道が騒がしくなる。' },
  { who: 'wakazamurai', bg: 'sakaya', text: '清洲が動くらしい。……はっきりせぬが、いよいよだそうだ' },
];
export const EV_UWASA_SENSE: Beat = { bg: 'sakaya', text: '曖昧で、くだらぬ尾ひれも多い。だが利家は、本当らしい筋だけを拾えるようになっていた。どの噂が兵糧の話と結びついているか。どの名が、実際に動いている者の名か。——清洲の軍は、南へ。鳴海のあたりだ。' };
export const UWASA_CHOICES: Choice[] = [
  { id: 'iku', label: '行く。誰の許しも乞わない', note: '無断参戦（桶狭間）へ' },
  { id: 'matsu', label: 'まだ待つ', note: '桶狭間は過ぎてゆく。次の機会（翌年の森部）を待つ' },
];
export const EV_SHUTTATSU = (matsuClose: boolean): Beat[] => [
  { who: 'matsu', bg: 'arako_night', text: 'お出かけですか。……遠くですか' },
  { who: 'maeda_toshiie', bg: 'arako_night', text: 'すぐ戻るとは言わねえ。だが、無駄に死ぬ気もねえ' },
  { who: 'matsu', bg: 'arako_night', text: matsuClose ? '止めても行かれるのでしょう。……少しだけです。たくさんだと、生意気ですから。——勝ってきてください' : '……お気をつけて' },
  { who: 'toshihisa', bg: 'arako_night', text: 'どこへ行く。……戦か。呼ばれてはおらぬな。家のことも考えろ' },
  { who: 'maeda_toshiie', bg: 'arako_night', text: '考えてる。その上で行く' },
  { who: 'toshihisa', bg: 'arako_night', text: '俺では足りぬと思うか' },
  { who: 'maeda_toshiie', bg: 'arako_night', text: '俺は、俺にできることをしに行く' },
  { who: 'toshihisa', bg: 'arako_night', text: 'そうか' },
];
// ───────── 無断参戦（桶狭間・森部）: 読む・決める・飛び込む ─────────
export interface Step { head: string; text: string; bg: string; choices: (Choice & { score: (k: StoryStats) => number })[] }
export interface StoryStats { bra: number; sense: number; fame: number }
export const OKEHAZAMA: Step[] = [
  { head: '桶狭間　読む', bg: 'okehazama', text: '永禄三年五月。激しい雨。今川の大軍が鳴海のあたりに陣を張る。信長の本隊は善照寺の砦から動いた。どこへ紛れ込むか。',
    choices: [
      { id: 'ato', label: '本隊の後ろに紛れる', note: '安全だが、手柄の場に遠い', score: () => 1 },
      { id: 'saki', label: '先手の脇から入る', note: '戦の只中へ。武勇が要る', score: (k) => (k.bra >= 80 ? 3 : 2) },
      { id: 'tani', label: '雨の谷筋を回り、敵の本陣の横へ出る', note: '噂を読む力が要る', score: (k) => (k.sense >= 50 ? 4 : 0) },
    ] },
  { head: '桶狭間　決める', bg: 'okehazama', text: '雨が上がった。目の前で今川勢が崩れ始める。何を狙うか。',
    choices: [
      { id: 'zohyo', label: '確実に取れる首を取る', note: '首は取れるが、格は低い', score: () => 1 },
      { id: 'samurai', label: '名のありそうな侍を狙う', note: '武勇しだい', score: (k) => (k.bra >= 82 ? 3 : k.bra >= 76 ? 2 : 0) },
    ] },
  { head: '桶狭間　飛び込む', bg: 'okehazama', text: '槍を握り直す。',
    choices: [
      { id: 'nanoru', label: '「前田利家だ！」と名乗って飛び込む', note: '名が知れているほど目に留まる', score: (k) => (k.fame >= 30 ? 2 : 1) },
      { id: 'damaru', label: '黙って突く', note: '確かだが、誰の目にも留まらない', score: () => 1 },
    ] },
];
export const MORIBE: Step[] = [
  { head: '森部　読む', bg: 'moribe', text: '永禄四年五月。美濃の斎藤勢と、森部の川と田のあいだでぶつかる。朝霧が深い。',
    choices: [
      { id: 'kiri', label: '霧に紛れて前へ', note: '武勇が要る', score: (k) => (k.bra >= 78 ? 3 : 2) },
      { id: 'kawa', label: '川沿いの道を読んで回り込む', note: '噂を読む力が要る', score: (k) => (k.sense >= 40 ? 3 : 1) },
    ] },
  { head: '森部　飛び込む', bg: 'moribe', text: '霧の向こうに、名のある武者の影。足立六兵衛、「首取り足立」と呼ばれる男だという。',
    choices: [
      { id: 'adachi', label: '足立六兵衛に挑む', note: '武勇しだい', score: (k) => (k.bra >= 80 ? 4 : 2) },
      { id: 'yoko', label: '脇の雑兵を確実に', note: '首は取れる', score: () => 2 },
    ] },
];
export const EV_SASSA_SENJO: Beat[] = [
  { bg: 'okehazama', text: '遠い怒号。旗のはためき。読む。決める。飛び込む。「前田利家だ！」' },
  { who: 'sassa_narimasa', bg: 'okehazama', text: '犬千代か。……勝手に来たのか' },
  { who: 'maeda_toshiie', bg: 'okehazama', text: '来た' },
  { who: 'sassa_narimasa', bg: 'okehazama', text: '馬鹿だな。……首を持って行け。それだけは、忘れるな' },
];
export const EV_SHUKYU: Beat[] = [
  { head: '残り火　第三章　戻る道', bg: 'okehazama', text: '戦が終わったあとの野は、妙に広い。首は重い。勝手に戦へ出て、勝手に取り、勝手に名を叫んだ首である。' },
  { who: 'kosan', bg: 'okehazama', text: '知らぬ首を持って歩いておるのか。……よい首だな。馬鹿でなければ、こんなことはせん' },
  { who: 'ikeda_tsuneoki', bg: 'jinmaku', text: 'この馬鹿。また勝手に入りやがって。……黙って外に置いとくには、首がよすぎる。死んでたら、ただの馬鹿で終わりだ' },
  { who: 'maeda_toshiie', bg: 'jinmaku', text: '生きてれば？' },
  { who: 'ikeda_tsuneoki', bg: 'jinmaku', text: '面倒な馬鹿で済む' },
  { who: 'shibata_katsuie', bg: 'jinmaku', text: '戻りたいか' },
  { who: 'maeda_toshiie', bg: 'jinmaku', text: '戻るに足ると思ってます。首は持ってきました' },
  { who: 'shibata_katsuie', bg: 'jinmaku', text: 'それで全部埋まるとは思わぬか。……思っていないなら、まだましだ' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: 'また勝手に来たか。……呼べ' },
];
export const EV_NOT_YET: Beat[] = [
  { bg: 'hiroma', text: '首は清洲へ届いた。だが、呼び出しの文は来なかった。' },
  { who: 'ikeda_tsuneoki', bg: 'kiyosu_tsuji', text: '殿は何も言わねえ。……首一つじゃ、まだ足りねえってことだろうよ。腐るなよ、犬千代' },
  { bg: 'arako', text: '荒子へ戻る。勝手に出て、勝手に取った首は、まだ許しにならない。——次の戦を待つ。（翌年、美濃との戦が近いという噂がある）' },
];
export const EV_KISAN: Beat[] = [
  { head: '帰参', bg: 'kiyosu_niwa', text: '呼び出しの文は短かった。詫びよとも、急げとも書いていない。ただ、来い、というだけである。' },
  { who: 'kinoshita_tokichiro', bg: 'kiyosu_niwa', text: 'お戻りで' },
  { who: 'maeda_toshiie', bg: 'kiyosu_niwa', text: 'まだ戻っちゃいねえ' },
  { who: 'kinoshita_tokichiro', bg: 'kiyosu_niwa', text: 'そうでした。では、これからですな' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: 'また勝手をしたな。誰が許した' },
  { who: 'maeda_toshiie', bg: 'hiroma', text: '誰も。待っても、戻れぬと思いました' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: '首一つでか' },
  { who: 'maeda_toshiie', bg: 'hiroma', text: '首一つでも、ないよりはましです' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: 'お前は、そういう言い方を覚えたか。……都合がよければ戻してくれると思ったか' },
];
export const KISAN_CHOICES: Choice[] = [
  { id: 'shojiki', label: '「思いません。放っておけぬところまで行くつもりでした」', note: '小説の答え' },
  { id: 'wabi', label: '「二度と勝手はいたしませぬ」と頭を下げる', note: '嘘になる' },
];
export const EV_KISAN_SHOJIKI: Beat[] = [
  { who: 'maeda_toshiie', bg: 'hiroma', text: '前のままでは、俺は外にいるだけでした。それが嫌でした。だから、戦場で立つしかないと思いました' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: 'お前は、また同じことをするな。……言わぬか' },
  { who: 'maeda_toshiie', bg: 'hiroma', text: '言えません。嘘をついて戻っても、意味がねえ' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: '正直だな。——戻れ。だが今度は、勝手に死ぬな。働け' },
];
export const EV_KISAN_WABI: Beat[] = [
  { who: 'maeda_toshiie', bg: 'hiroma', text: '二度と勝手はいたしませぬ' },
  { who: 'oda_nobunaga', bg: 'hiroma', text: '嘘をつけ。……お前の顔に書いてある。まあよい。戻れ。だが今度は、勝手に死ぬな。働け' },
];
export const EV_KISAN_AFTER: Beat[] = [
  { who: 'ikeda_tsuneoki', bg: 'kiyosu_niwa', text: '生きたな。……お前、昔より少し嫌な男になったな。噛みつく前に見るようになった' },
  { who: 'sassa_narimasa', bg: 'kiyosu_niwa', text: '戻ったか。次は首だけで済むと思うな' },
  { who: 'kinoshita_tokichiro', bg: 'kiyosu_niwa', text: 'ようございましたな。殿は、使えるものをすぐには捨てませぬ' },
  { head: '第一幕　了', bg: 'kiyosu_niwa', text: '清洲へ戻った。槍のぶつかる音、使者の声、馬の鼻息。全部が懐かしい。前より速い。前より重い。——（第二幕「戻る道」は作成中。ここからは織田家の家臣として、主命と陣で働く）' },
];

// ───────── まつとの話（屋敷で訪ねるたびに一つずつ） ─────────
export const MATSU_TALKS: Beat[][] = [
  [{ who: 'matsu', text: '灯を、替えようかと' }, { who: 'maeda_toshiie', text: '暗くねえ。……もう寝ろ' }, { who: 'matsu', text: 'はい' }],
  [{ who: 'maeda_toshiie', text: '……何してる' }, { who: 'matsu', text: 'ほころびを。難しいです。でも、やらぬよりは' }, { who: 'maeda_toshiie', text: 'その糸、曲がってるぞ' }, { who: 'matsu', text: '知っています。いまやっています' }, { who: 'maeda_toshiie', text: '生意気だな' }, { who: 'matsu', text: '前からです' }],
  [{ who: 'maeda_toshiie', text: '暇そうだな' }, { who: 'matsu', text: '利家様ほどでは' }, { who: 'maeda_toshiie', text: '俺は暇じゃねえ' }, { who: 'matsu', text: 'そうですか。……暇な人のお顔です' }],
  [{ who: 'matsu', text: '兄上様は、お忙しそうです。ずっと人が出入りしています。……利家様は、お手伝いなさらないのですか' }, { who: 'maeda_toshiie', text: '俺が出ると、面倒になる' }, { who: 'matsu', text: '難しいですね' }],
  [{ who: 'matsu', text: 'お早うございます' }, { who: 'maeda_toshiie', text: '早えな' }, { who: 'matsu', text: '利家様ほどでは。……便利ですので。怒られにくいです' }, { who: 'maeda_toshiie', text: '怒ってねえだろ' }, { who: 'matsu', text: '少しは。全部怒っている時は、お顔で分かります' }],
  [{ who: 'matsu', text: '利家様は、当主にならないのですか' }, { who: 'maeda_toshiie', text: '俺は、いまは違う' }, { who: 'matsu', text: 'でも、前田家の方です。……大人は難しいですね' }, { who: 'maeda_toshiie', text: 'お前もすぐそうなる' }, { who: 'matsu', text: '嫌です。難しそうですから' }],
  [{ who: 'matsu', text: '（湯の椀を手に）あ……湯、冷めてしまいました' }, { who: 'maeda_toshiie', text: '慌てるな。また沸かせばいい' }, { who: 'matsu', text: '……利家様は、こういう時だけ優しいです' }],
];
export const TOSHIHISA_TALKS: Beat[][] = [
  [{ who: 'toshihisa', text: '文は今日のうちに返す。急げば、粗くなる' }, { who: 'maeda_toshiie', text: '……兄上の言う通りでいい' }],
  [{ who: 'toshihisa', text: '米蔵の鍵は、俺が持つ。お前は、身を慎め' }, { who: 'maeda_toshiie', text: '分かってる' }],
  [{ who: 'maeda_toshiie', text: '兄上。……家は、兄上が持たせてる' }, { who: 'toshihisa', text: '急に何だ。……お前は、そういう時ほど下手だな' }],
];
export const KIYOSU_MEET: Beat[][] = [
  [{ who: 'ikeda_tsuneoki', text: 'おう、犬千代。生きてたか。……殿の前じゃお前の名は禁句だ。だが庭じゃ、皆まだ覚えてる' }],
  [{ who: 'kinoshita_tokichiro', text: '前田様。清洲は近ごろ、米の動きが妙でございます。……いずれ、大きな戦が来ましょうな' }],
  [{ who: 'sassa_narimasa', text: '……ここで何をしている。次はないと言ったはずだ。（だが、それ以上は言わずに去った）' }],
  [{ who: 'ikeda_tsuneoki', text: '腐るなよ。お前みてえな馬鹿は、戦の時に要るんだ' }],
];
