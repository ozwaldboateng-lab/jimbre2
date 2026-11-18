// 前田利家 ― 残り火 第五部「残り火」（小説『残り火』第十章「こぼれるもの」・第十一章「残り火」・終章「残ったもの」）
// 満ちる（1586）→ 利益 → 風の置き場 → 太閤の世 → 九州へ → 整う → ずれる → 骨が減る → 風が止む → こぼれる（1591）
// → 残り火 → 託される → 海の向こう（名護屋）→ 薄い家 → 秀頼 → 家康 → 裂け目（1599）→ 厚くする → 遺言 → 最期 → 終章
import type { Beat } from './story_toshiie';
import { NODES, type Node } from './story_toshiie2';

const T = 'maeda_toshiie', OK = 'okumura', MU = 'murai', HI = 'kinoshita_tokichiro', MA = 'matsu_wife', CHO = 'cho_tsuratatsu', TH = 'toshihisa_old', TM = 'maeda_toshimasu', TN = 'maeda_toshinaga', MI = 'ishida_mitsunari', KI = 'kato_kiyomasa', IE = 'tokugawa_ieyasu';

// ───────── 第十章　こぼれるもの ─────────
export const P5_MICHIRU: Beat[] = [
  { kind: 'chapter', head: '第十章', text: 'こぼれるもの', sub: '残り火　第五部' },
  { kind: 'door', head: '満ちる', text: '満ちる', sub: '天正十四年 金沢' },
  { head: '金沢の朝', bg: 'kanazawa_asa', text: '朝の金沢は、もう戦の朝ではなかった。城内には馬の気配があり、庭の向こうでは若い者の声もする。倉は開き、人足は荷を運ぶ。いまの金沢には、動いている家の朝があった。' },
  { who: T, bg: 'kanazawa_asa', text: '朝からよう動くな。前は、こんな動きじゃなかった' },
  { who: MU, bg: 'kanazawa_asa', text: '前は、動く前に戦が参りました' },
  { who: T, bg: 'kanazawa_asa', text: '広えな。広えだけじゃねえ。回ってやがる' },
  { who: OK, bg: 'kanazawa_asa', text: '能登からの入りが少し遅れております' },
  { who: CHO, bg: 'kanazawa_asa', text: '雨でございましょう。崩れたわけではありませぬ' },
  { who: T, bg: 'kanazawa_asa', text: '崩れてねえなら、いくらでも待てる' },
  { who: TH, bg: 'kanazawa_asa', text: '昔のお前なら、そこで怒鳴っていた' },
  { who: T, bg: 'kanazawa_asa', text: '昔の俺なら、待つものがなかった。……利長はどうだ' },
  { who: TH, bg: 'kanazawa_asa', text: '収まっている。お前よりはな' },
  { who: T, bg: 'kanazawa_asa', text: '俺みてえなのが二代続いたら、家がもたねえ' },
  { who: MA, bg: 'kanazawa_asa', text: '家らしい朝でございますね。……前は、利家様が前田の家でございました。今は、皆で持っております' },
];
export const P5_TOSHIMASU: Beat[] = [
  { kind: 'door', head: '利益', text: '利益', sub: '天正十四年 金沢' },
  { head: '金沢の庭', bg: 'kanazawa_niwa', text: '利益という男は、黙っていても目についた。声が大きいからではない。庭に立っていても、馬のそばにいても、何か一人だけ空気の流れが違う。若い者はまず目で追う。' },
  { who: TM, bg: 'kanazawa_niwa', text: 'もう一度。……上手えな。上手えが、きれいすぎる。崩れた時に、何をするかが見えすぎる。見えすぎると死ぬ' },
  { who: CHO, bg: 'kanazawa_niwa', text: '戦場で映える槍だ。見ている者の気を上げまする' },
  { who: T, bg: 'kanazawa_niwa', text: '下げもする。……味方もだ。皆、ああいうのを見ると、自分までできる気になる。だが、いると助かる' },
  { who: MA, bg: 'arako_night', text: '利家様も、昔はそうでございました。家より先にご自分の気が前へ出る方でございました' },
  { who: T, bg: 'arako_night', text: '俺はあそこまで勝手じゃねえ。……だが、嫌いにはなれねえな', ask: 'p5_toshimasu' },
];
export const P5_KAZE: Beat[] = [
  { kind: 'door', head: '風の置き場', text: '風の置き場', sub: '天正十五年 金沢' },
  { head: '金沢の庭', bg: 'kanazawa_niwa', text: '夕刻、利長が守山から金沢へ寄った。必要な時に顔を出し、余計な長居はしない。' },
  { who: T, bg: 'kanazawa_niwa', text: '守山はどうだ' },
  { who: TN, bg: 'kanazawa_niwa', text: '持っております' },
  { who: T, bg: 'kanazawa_niwa', text: '面白えことはあるか' },
  { who: TN, bg: 'kanazawa_niwa', text: '面白い、は少のうございます' },
  { who: TM, bg: 'kanazawa_niwa', text: '堅え顔してるな、殿様' },
  { who: TN, bg: 'kanazawa_niwa', text: 'あなたほど軽くはできません' },
  { who: TM, bg: 'kanazawa_niwa', text: 'それでいい。俺まできちんとしたら、前田の家が死ぬ' },
  { who: TH, bg: 'kanazawa_niwa', text: '……難儀な家だな。今さらだ', ask: 'p5_kaze' },
];
export const P5_TAIKO: Beat[] = [
  { kind: 'door', head: '太閤の世', text: '太閤の世', sub: '天正十五年 大坂' },
  { head: '大坂城の大広間', bg: 'osaka_hiroma', text: '秀吉の世には、光があった。ただ明るいというだけではない。人の顔色まで変え、衣の色まで派手に見せる。人が多い。多い者たちが皆、どこか「見られている者」の顔をして歩いている。' },
  { who: TH, bg: 'osaka_hiroma', text: '派手だな。……嫌いか' },
  { who: T, bg: 'osaka_hiroma', text: '嫌いじゃねえ。好きでもない。だが、見事だ' },
  { who: TM, bg: 'osaka_hiroma', text: '又左殿。息が詰まるな。皆、きれいすぎる。槍を持たせる前に、置き場を考えてそうなのが多い' },
  { who: T, bg: 'osaka_hiroma', text: '口を慎め。……お前はどこへ置いても浮くな' },
  { who: TM, bg: 'osaka_hiroma', text: '浮くんじゃねえ。皆が沈みすぎてる' },
  { who: HI, bg: 'osaka_hiroma', text: '又左。前田もよう持つな' },
  { who: T, bg: 'osaka_hiroma', text: '持たせてるからな' },
  { who: HI, bg: 'osaka_hiroma', text: 'そこや。そこに立てばええ。……ここまで形になると、人まで形にしたくなる' },
  { who: T, bg: 'osaka_hiroma', text: '（だから困る）' },
];
export const P5_KYUSHU: Beat[] = [
  { kind: 'door', head: '九州へ', text: '九州へ', sub: '天正十五年' },
  { head: '九州の陣', bg: 'kyushu', text: '北陸の家が、気づけば天下の軍になっていた。昔なら、一つの戦へ出るたびに、まず先に土を考えた。いまは馬も、人も、荷も、無駄なく流れている。' },
  { who: T, bg: 'kyushu', text: '遠えな。昔なら、こんな遠くまで当たり前みてえに出る家じゃなかった' },
  { who: OK, bg: 'kyushu', text: '昔なら、出る前に潰れておりました' },
  { who: TM, bg: 'kyushu', text: '北陸の次は南か。面白え' },
  { who: T, bg: 'kyushu', text: 'お前は何でも面白えな' },
  { who: TM, bg: 'kyushu', text: '面白くなきゃ戦なんぞやってられねえ' },
  { who: T, bg: 'kyushu', text: '利長みてえなのだけなら、家はきれいに持つ。だが死ぬ。……両方要るってことだな', ask: 'p5_kyushu' },
];
export const P5_ZURERU: Beat[] = [
  { kind: 'door', head: '整う', text: '整う', sub: '天正十六年 金沢' },
  { head: '金沢の朝', bg: 'kanazawa_asa', text: '家というものは、崩れる時より、整い始めた時の方が怖いのかもしれぬ。昔は、どこか一つ収まればどこか二つ崩れた。今は崩れねえ。' },
  { who: T, bg: 'kanazawa_asa', text: '整ってきたな。気味が悪いくらいだ' },
  { who: TH, bg: 'kanazawa_asa', text: '整うのは、お前がずっと望んだことだろう' },
  { who: T, bg: 'kanazawa_asa', text: '望んださ。……だが、きれいすぎる。皆、だんだん置かれたところにきちんと収まってきやがる' },
  { kind: 'door', head: 'ずれる', text: 'ずれる', sub: '天正十七年 金沢' },
  { head: '金沢の庭', bg: 'kanazawa_niwa', text: 'ずれというものは、大きい音を立てて来るとは限らない。利益は何かを壊すのではなく、ただ「そこにいる」だけで、少しずつ家の呼吸と合わなくなっていった。' },
  { who: OK, bg: 'kanazawa_niwa', text: '越中の道筋、ここは、いまのまま崩さぬ方がよろしゅうございます。下手に触れば、かえって道が痩せましょう。このまま一年持たせてからの方が無難にございます' },
  { who: TM, bg: 'kanazawa_niwa', text: '一年も待つのか。持たせるのは分かる。崩さねえのも分かる。だが、崩さねえまま鈍ることもあるだろ' },
  { who: OK, bg: 'kanazawa_niwa', text: '鈍る前に崩れるよりはよろしいかと' },
  { who: TM, bg: 'kanazawa_niwa', text: '帳面で持つ家なら、それでいいさ' },
  { who: OK, bg: 'kanazawa_niwa', text: '帳面で持つのではありませぬ。人と置き場です', ask: 'p5_zureru' },
];
export const P5_HONE: Beat[] = [
  { kind: 'door', head: '骨が減る', text: '骨が減る', sub: '天正十八年' },
  { head: '金沢の朝', bg: 'kanazawa_asa', text: '利久が死んだ、という報せは、騒がしく来なかった。声を低くし、顔を固くし、それでもいつもの手つきで取り次がれる。' },
  { who: T, bg: 'kanazawa_asa', text: '……そうか。手配を、頼む' },
  { bg: 'kanazawa_asa', text: '庭はいつも通りだった。それは、今の前田の家の中に残っていた「利家以前」の前田が、一つ消えたということだった。' },
  { who: T, bg: 'kanazawa_asa', text: '骨が減ったな' },
  { who: TN, bg: 'kanazawa_asa', text: '叔父上が……' },
  { who: T, bg: 'kanazawa_asa', text: '叔父上は、どう見えていた' },
  { who: TN, bg: 'kanazawa_asa', text: '古い方にございました。……ですが、古いだけではございませぬでした' },
  { who: T, bg: 'kanazawa_asa', text: 'そうだ。そこが重かった。……お前は、元の前田を知らねえ。俺が家を継ぐ前のことも、利久が背負ってた時間も' },
  { who: TN, bg: 'kanazawa_asa', text: '存じませぬ' },
  { who: T, bg: 'kanazawa_asa', text: 'それでいい。知らねえから、お前は次を持てる' },
];
export const P5_KAZEYAMU: Beat[] = [
  { kind: 'door', head: '風が止む', text: '風が止む', sub: '天正十八年 金沢' },
  { head: '金沢の庭', bg: 'kanazawa_niwa', text: '別れというものは、立ち去る前から始まっている。利益はまだ家の中にいる。馬にも乗る。槍を持てば相変わらず目立つ。だが、何も変わっていないように見える時ほど、人は本当はもう向こうへ半分出ている。' },
  { who: TM, bg: 'kanazawa_niwa', text: 'お、殿様。またきれいにやってるそうじゃねえか' },
  { who: TN, bg: 'kanazawa_niwa', text: 'きれいで悪いことはございませぬ' },
  { who: TM, bg: 'kanazawa_niwa', text: 'よくはある。だが、よすぎると息が詰まる' },
  { who: TN, bg: 'kanazawa_niwa', text: '息が詰まるのは、あなたが息の合わせ方を覚える気がないからでございます' },
  { who: TM, bg: 'kanazawa_niwa', text: '覚えたら俺じゃねえ。……俺は家じゃねえよ' },
  { who: T, bg: 'kanazawa_niwa', text: '利長は下がれ' },
  { who: TM, bg: 'kanazawa_niwa', text: 'よくできた殿様だ。茶化しちゃいねえ。本当に、よくできてる' },
  { who: T, bg: 'kanazawa_niwa', text: 'お前も少しは似ろ' },
  { who: TM, bg: 'kanazawa_niwa', text: '無理だ。やったら死ぬ。利長みてえに息を揃えたら、俺の中の何かは死ぬ', ask: 'p5_kazeyamu' },
];
export const P5_KOBORERU: Beat[] = [
  { kind: 'door', head: 'こぼれる', text: 'こぼれる', sub: '天正十八年 冬' },
  { head: '金沢の朝', bg: 'kanazawa_asa', text: '満ちた器からこぼれるものほど、静かに痛い。利益がいない。それだけのことだった。利長は収まり、奥村は回し、長連龍はつなぐ。家は崩れていない。' },
  { who: T, bg: 'kanazawa_asa', text: '風が止んだな' },
  { who: TN, bg: 'kanazawa_asa', text: '利益殿のことにございますが。……わたくしは、利益殿を嫌っておったわけではございませぬ。わたくしは、家を持たせることしか考えられませぬ' },
  { who: T, bg: 'kanazawa_asa', text: 'それでいい。お前は悪くねえ。お前が正しい' },
  { who: TN, bg: 'kanazawa_asa', text: '正しい、だけでは' },
  { who: T, bg: 'kanazawa_asa', text: '足りねえ時もあるな。……あいつは、悪くねえんだよな' },
  { who: MA, bg: 'arako_night', text: '又左様。お冷えになります' },
  { who: T, bg: 'arako_night', text: '年寄り扱いするな' },
];

// ───────── 第十一章　残り火 ─────────
export const P5_NOKORIBI: Beat[] = [
  { kind: 'chapter', head: '第十一章', text: '残り火', sub: '残り火　第五部' },
  { kind: 'door', head: '残り火', text: '残り火', sub: '天正十九年 金沢' },
  { head: '金沢の朝', bg: 'kanazawa_asa', text: '利益が去ってから、前田の家の空気は少し澄みすぎた。濁りが取れた、余計な波が引いた、ようやく家らしくなった。だが利家には、その静けさが少しきれいすぎるように思えた。' },
  { who: MA, bg: 'kanazawa_asa', text: '静かでございますね。……前は、静かでも風がございました' },
  { who: MA, bg: 'kanazawa_asa', text: 'このごろ、お顔が前より静かでございます。前は、どこかで常に外を見ておられました' },
  { who: T, bg: 'kanazawa_asa', text: 'そうかもしれねえな' },
  { who: TN, bg: 'kanazawa_asa', text: '父上。太閤殿下は、父上を深くお頼みになっておられます。世がここまで固まってきますと、信の置ける家を手元に置きとうなるのでございましょう' },
  { who: T, bg: 'kanazawa_asa', text: 'だが、頼まれるってのは面倒だ' },
];
export const P5_TAKUSARERU: Beat[] = [
  { kind: 'door', head: '託される', text: '託される', sub: '天正十九年 大坂' },
  { head: '大坂城の大広間', bg: 'osaka_hiroma', text: '秀吉は、人を使うのがうまい男だった。誰が前へ出ると光るか。誰を少し引いたところへ置くと働くか。昔は、どちらもまだ「前へ出る男」だった。' },
  { who: HI, bg: 'osaka_hiroma', text: '又左。相変わらずでかいな' },
  { who: T, bg: 'osaka_hiroma', text: '減らず口だけは変わらんな' },
  { who: HI, bg: 'osaka_hiroma', text: '前田はよう持たせておる。……お前ほどの男が、何を楽したがる' },
  { who: T, bg: 'osaka_hiroma', text: '楽はしてねえ。俺は、そんなに面白え男じゃねえぞ' },
  { who: HI, bg: 'osaka_hiroma', text: 'それでええんや。わしのそばに、おってくれ' },
  { who: TN, bg: 'osaka_hiroma', text: '父上。……それは、信にございます' },
  { who: T, bg: 'osaka_hiroma', text: 'だが、信ってのは面倒だ。昔みてえに、勢いのあるやつを前へ出して済む世じゃねえ' },
];
export const P5_UMI: Beat[] = [
  { kind: 'door', head: '海の向こう', text: '海の向こう', sub: '文禄元年 名護屋' },
  { head: '名護屋の陣', bg: 'nagoya', text: '秀吉の目は、もう海の向こうを見ていた。天下をほとんどその手に収め、国内の大きな割れ目をおおむね塞ぎ終えたあとで、なお止まらない。朝鮮。その先の明。' },
  { who: T, bg: 'nagoya', text: '……本気か' },
  { who: OK, bg: 'nagoya', text: '天下をまとめた、その勢いのままにございます' },
  { who: T, bg: 'nagoya', text: '勢いだけで海は越えられねえ。見たことのねえ戦ほど、帰ってこねえものが多い' },
  { bg: 'nagoya', text: '名護屋。海を望む丘に無数の陣屋。湾に浮かぶ船団。太閤は、止まらねえな。' },
  { who: HI, bg: 'nagoya', text: '又左。どう思う', ask: 'p5_umi' },
];
export const P5_USUI: Beat[] = [
  { kind: 'door', head: '薄い家', text: '薄い家', sub: '文禄二年' },
  { head: '大坂城の大広間', bg: 'osaka_hiroma', text: '秀吉のそばにいるほど、利家には、豊臣という家のまだ固まりきらぬ輪郭が見えた。織田には、尾張から続く家の重みがあった。豊臣には、まだその時間が足りない。' },
  { who: T, bg: 'osaka_hiroma', text: 'まだ、底が浅いな' },
  { who: TN, bg: 'osaka_hiroma', text: '家としての重みは、まだこれからにございます' },
  { who: MA, bg: 'osaka_hiroma', text: 'お疲れが深うございます。……今のお疲れは、戦の疲れではございませぬ' },
  { who: T, bg: 'osaka_hiroma', text: '大きすぎるんだよ、あの男は。好き嫌いじゃねえ。そういうところまで来ちまったんだ' },
  { kind: 'door', head: '秀頼', text: '秀頼', sub: '慶長元年' },
  { bg: 'osaka_hiroma', text: '秀頼は、まだ幼かった。目の動きにも、声の細さにも、まだ大人の家を背負う者の影はない。子が悪いのではない。家というものは、人が願った順に形になるわけではない。' },
  { who: 'toyotomi_hideyori', bg: 'osaka_hiroma', text: '前田どの' },
  { who: HI, bg: 'osaka_hiroma', text: '又左。……どうご覧になる' },
  { who: T, bg: 'osaka_hiroma', text: 'ようお育ちです' },
  { who: HI, bg: 'osaka_hiroma', text: '……又左。秀頼を、頼む', ask: 'p5_hideyori' },
];
export const P5_IEYASU: Beat[] = [
  { kind: 'door', head: '家康', text: '家康', sub: '慶長二年 伏見' },
  { head: '伏見の屋敷', bg: 'fushimi', text: '家康は、静かな男だった。金ヶ崎へ向かう道で見た家康は、押すか引くかを一息で量り、その一息を顔へ出さなかった。前へ出て空気を変える男はいる。秀吉がそうだ。家康は違う。' },
  { who: T, bg: 'fushimi', text: '……来るな' },
  { who: TN, bg: 'fushimi', text: '父上は、いずれ徳川殿が大きくなると' },
  { who: T, bg: 'fushimi', text: '徳川は、家として強い。ただ、まだ世がそれを全部は引き受けてねえだけだ' },
  { who: TN, bg: 'fushimi', text: '徳川殿を警むべきにございますか' },
  { who: T, bg: 'fushimi', text: 'ただ警めば済む相手なら、まだ楽だ' },
  { kind: 'time', text: '慶長三年八月', sub: '太閤、薨ず' },
  { bg: 'fushimi', text: '秀吉が死んだ。利家が恐れていた空きは、思っていたより早く顔を出した。秀頼は幼い。だから皆が支えると言う。だが、支え方は一つではない。' },
];
export const P5_SAKEME: Beat[] = [
  { kind: 'door', head: '裂け目', text: '裂け目', sub: '慶長四年 伏見' },
  { head: '伏見の屋敷', bg: 'fushimi', text: '石田三成が来たのは、そんな頃だった。顔はいつも通り整っている。だが、目の奥に休みがない。' },
  { who: MI, bg: 'fushimi', text: '徳川殿が、また家を結んでおられます。壁書を踏むとなれば、ただでは済みませぬ' },
  { who: T, bg: 'fushimi', text: '三成。お前は嫌われてるな' },
  { who: MI, bg: 'fushimi', text: '承知しております' },
  { who: KI, bg: 'fushimi', text: '前田様。三成のことにございます。兵を出したのはこっちです。名護屋で、海の向こうで' },
  { who: T, bg: 'fushimi', text: '三成一人が戦を始めたわけじゃねえ。三成が好かれる男だとも思わねえ。だが、嫌われ役を引き受ける場所に立ってたのも本当だ' },
  { who: KI, bg: 'fushimi', text: 'では、飲み込めと' },
  { who: T, bg: 'fushimi', text: '飲み込めとは言わねえ。だが、秀頼様の家の中でやるな' },
  { who: TN, bg: 'fushimi', text: '父上。お身体に障ります' },
  { who: T, bg: 'fushimi', text: '障ってもやる。ここで放せば、そのまま裂ける', ask: 'p5_sakeme' },
];
export const P5_ATSUKU: Beat[] = [
  { kind: 'door', head: '厚くする', text: '厚くする', sub: '慶長四年 春' },
  { head: '伏見の屋敷', bg: 'fushimi', text: '残る命で何をするかと問われれば、利家にはもう答えがあった。増やすことではない。広げることでもない。勝つことでもない。切れ目を塞ぐことだ。' },
  { who: T, bg: 'fushimi', text: '利長。人をどう見ている' },
  { who: TN, bg: 'fushimi', text: '役目にございますか' },
  { who: T, bg: 'fushimi', text: 'それだけじゃねえ。役目は見りゃ分かる。だが、働く者を集めるだけなら、どこの家でもやる' },
  { who: TN, bg: 'fushimi', text: '古くからの者を重くしすぎれば、新しく入った者が疎まれましょう。……なら、どうなさいます' },
  { who: T, bg: 'fushimi', text: 'そこが面倒なんだよ', ask: 'p5_atsuku' },
];
export const P5_YUIGON: Beat[] = [
  { kind: 'door', head: '遺言', text: '遺言', sub: '慶長四年 閏三月' },
  { head: '病床の座敷', bg: 'byosho', text: '死が近づくと、人は軽くなるのだと若い頃は思っていた。だが実際には逆だった。死が近づくほど、人は自分一人ではなくなる。それでも頭の中は、むしろ前より澄んでいた。' },
  { who: T, bg: 'byosho', text: '利長。座れ。お前に残す言葉がある' },
  { who: TN, bg: 'byosho', text: 'はい' },
  { who: T, bg: 'byosho', text: 'まず一つ。上方を離れるな。前田の家は、もう北陸だけで済む家じゃねえ' },
  { who: T, bg: 'byosho', text: '秀頼様をお守りしろ。ただ守るってのは、ただそばにおることじゃねえ。豊臣がまだ固まりきらぬなら、そのまま崩れぬよう支えろ' },
  { who: T, bg: 'byosho', text: '次だ。家臣を大事にしろ。新しい者を使うなとは言わねえ。だが古い者の顔を潰すな。痩せた家は、いざという時に持たねえ' },
];
export const P5_SAIGO: Beat[] = [
  { kind: 'door', head: '最期', text: '最期', sub: '慶長四年' },
  { head: '病床の座敷', bg: 'byosho', text: '利家の最期がどのようであったかについては、後にいくつもの言い伝えが残った。静かであったともいう。なお武辺の気を失わなかったともいう。確かなのは、利家が最後まで「残す」側の男であったことだった。' },
  { who: MA, bg: 'byosho', text: '又左様。お休みくださいませ' },
  { who: T, bg: 'byosho', text: '寝てばかりじゃ、死んじまう' },
  { who: MA, bg: 'byosho', text: 'お休みにならずとも、いずれはそうなります' },
  { who: T, bg: 'byosho', text: 'お前、本当に昔から容赦がねえな' },
  { who: MA, bg: 'byosho', text: '長う連れ添いましたので' },
  { who: T, bg: 'byosho', text: 'まつ。俺は、だいぶ面倒な男だったろ' },
  { who: MA, bg: 'byosho', text: 'はい' },
  { who: T, bg: 'byosho', text: '即答か' },
  { who: MA, bg: 'byosho', text: 'でも、分かりやすい方でございました。前へ出たい時は前へ出たいお顔をなさる' },
  { who: T, bg: 'byosho', text: 'じゃあ、今の顔はどうだ' },
  { who: MA, bg: 'byosho', text: '静こうございます' },
  { who: T, bg: 'byosho', text: '理に合わぬ戦は、してこなかった。人を斬った。だが、わけもなくやったことはねえ。……まつ。若い頃の俺は、ひどかっただろう' },
  { who: MA, bg: 'byosho', text: 'ええ。……でも、わたくしは、その若い利家様も知っております。若い利家様がおられたから、今の利家様がおられます' },
  { who: T, bg: 'byosho', text: 'そうか。……そうかもしれねえな' },
  { who: T, bg: 'byosho', text: '明朝、古くからの者を集めよ' },
];
// 終章の結び（描き分けの前後に置く）
export const P5_SHUSHO_HEAD: Beat[] = [
  { kind: 'chapter', head: '終章', text: '残ったもの', sub: '残り火' },
  { head: '金沢の雪明かり', bg: 'yukiakari', text: '利家が死んでも、前田の家は消えなかった。徳川の世になっても潰れず、細らず、北陸に大きい家として立ち続けた。だが、残ったのは家の名だけではない。' },
];
export const P5_SHUSHO_TAIL: Beat[] = [
  { bg: 'yukiakari', text: '家が残る。町が残る。光が残る。北陸の冬のあと、雪の明るさが町に返るように、利家の生もまた、長いのちに何かを残した。' },
  { bg: 'yukiakari', text: '金沢の光は、その名残だったのかもしれない。' },
  { kind: 'chapter', head: '前田利家 ― 残り火', text: '了', sub: '原作　小説『残り火』' },
];

const N5: Record<string, Node> = {
  p5_toshimasu: { text: '利益をどう置く', choices: [
    { id: 'kaze', label: '好きにさせる。若い者が見て学べばいい', note: '家に風を残す', eff: { kachu: -2, kaze: 2 },
      res: [{ who: T, bg: 'kanazawa_niwa', text: '好きにさせとけ。あいつの槍を見て、勝手に何か覚える奴もいる' }, { who: OK, bg: 'kanazawa_niwa', text: '……若い者の稽古が、少し乱れましょうな' }] },
    { id: 'yaku', label: '役目を与えて、置き場を決める', note: '「吹かせる場所を間違えりゃ家ごと飛ぶ」', eff: { kachu: 2, kaze: 1 },
      res: [{ who: T, bg: 'kanazawa_niwa', text: '利益。お前には若い者の槍を見てもらう。淀んだところへ吹け' }, { who: TM, bg: 'kanazawa_niwa', text: 'それなら得意だ' }] },
    { id: 'shikaru', label: '若い者の前で軽すぎると叱る', note: '家は整うが、風が弱まる', eff: { kachu: 4, kaze: -1 },
      res: [{ who: T, bg: 'kanazawa_niwa', text: '利益。若い者の前で、そういう槍を見せるな' }, { who: TM, bg: 'kanazawa_niwa', text: '……へいへい' }, { bg: 'kanazawa_niwa', text: '利益は笑って引いた。笑ったまま、少しだけ遠くなった。' }] },
  ] },
  p5_kaze: { text: '利長と利益のあいだで、何と言う', choices: [
    { id: 'ryoho', label: '「利長の正しさも、利益の風も、どちらも要る」', note: '小説の利家', eff: { kachu: 2, kaze: 1 },
      res: [{ who: T, bg: 'kanazawa_niwa', text: '利長の正しさも、利益の風も、どちらも要る。……面倒な家だ' }, { who: TH, bg: 'kanazawa_niwa', text: '今さらだ' }] },
    { id: 'toshinaga', label: '「利益、少しは利長に合わせろ」', note: '家の息を揃える', eff: { kachu: 4, kaze: -1 },
      res: [{ who: TM, bg: 'kanazawa_niwa', text: '合わせたら、俺じゃなくなる' }] },
    { id: 'toshimasu', label: '「利長、少しは崩れてみろ」', note: '跡継ぎに風を', eff: { kaze: 2, kachu: -2 },
      res: [{ who: TN, bg: 'kanazawa_niwa', text: '……父上がそう仰せなら' }, { who: TM, bg: 'kanazawa_niwa', text: 'はは。殿様が困ってらあ' }] },
  ] },
  p5_kyushu: { text: '九州の陣で、利益をどこに置く', choices: [
    { id: 'mae', label: '前に出す。風は戦場で吹かせる', note: '名が上がる', eff: { merit: 10, kaze: 1 },
      res: [{ bg: 'kyushu', text: '利益の槍は九州の陣でもよく映えた。見知らぬ将たちが、あれは誰かと尋ねた。' }] },
    { id: 'soba', label: 'そばに置く', note: '家の列を崩さない', eff: { kachu: 2 },
      res: [{ who: TM, bg: 'kyushu', text: '又左殿の横じゃ、退屈だ' }, { who: T, bg: 'kyushu', text: '退屈しとけ' }] },
  ] },
  p5_zureru: { text: '奥村と利益の言い分のどちらを取る', choices: [
    { id: 'okumura', label: '奥村の言う通り、一年持たせる', note: '小説の流れ。家は整うが、利益は遠くなる', eff: { kachu: 3, chian: 4, kaze: -1 },
      res: [{ who: T, bg: 'kanazawa_niwa', text: '奥村の言う通りにする' }, { who: TM, bg: 'kanazawa_niwa', text: '……そうか' }, { bg: 'kanazawa_niwa', text: '利益はそれ以上何も言わなかった。間違っていないまま、少しずつ家の呼吸と合わなくなっていく。' }] },
    { id: 'toshimasu', label: '利益に崩させてみる', note: '道は早く通るが、家中がざわつく', eff: { kaze: 2, kachu: -3, dev: 0.04 },
      res: [{ who: TM, bg: 'kanazawa_niwa', text: 'へえ。又左殿がそう来るか' }, { who: OK, bg: 'kanazawa_niwa', text: '……承知いたしました' }] },
    { id: 'aida', label: '「人と置き場で持つなら、置き場をもう一つ作れ」', note: '利益に新しい役目を', eff: { kaze: 1, kachu: 1 },
      res: [{ who: T, bg: 'kanazawa_niwa', text: '人と置き場で持つなら、こいつの置き場をもう一つ作れ' }, { who: OK, bg: 'kanazawa_niwa', text: '……考えまする' }] },
  ] },
  p5_kazeyamu: { text: '去ろうとする利益に、何と言う', choices: [
    { id: 'tomenai', label: '何も言わない。止める言葉を持たない', note: '小説の利家', eff: { kaze: 1 },
      res: [{ bg: 'kanazawa_niwa', text: '利家は、それを止める言葉を持たなかった。利益は前田の家を出た。風のように、何も壊さずに。' }] },
    { id: 'tomeru', label: '「行くな」と引き留める', note: '利益は残らない。だが、言ったことは残る', eff: { kaze: 2, kachu: -2 },
      res: [{ who: T, bg: 'kanazawa_niwa', text: '……行くな' }, { who: TM, bg: 'kanazawa_niwa', text: '又左殿がそれを言うか。……昔の又左殿なら、俺より先に出てったろうに' }, { bg: 'kanazawa_niwa', text: '利益は笑って、出ていった。' }] },
    { id: 'hanatsu', label: '「好きに生きろ」と送り出す', note: '風を外へ放つ', eff: { kaze: 1, kachu: 1 },
      res: [{ who: T, bg: 'kanazawa_niwa', text: '好きに生きろ。前田の家の外でな' }, { who: TM, bg: 'kanazawa_niwa', text: '言われなくても' }, { bg: 'kanazawa_niwa', text: '利益は振り返らなかった。振り返らないところが、利益だった。' }] },
  ] },
  p5_umi: { text: '海の向こうの戦に、何と言う', choices: [
    { id: 'isameru', label: '「勢いだけで海は越えられねえ」と諫める', note: '太閤の顔が曇る', eff: { rel: { kinoshita_tokichiro: -6 }, chian: 4 },
      res: [{ who: T, bg: 'nagoya', text: '勢いだけで海は越えられねえ。見たことのねえ戦ほど、帰ってこねえものが多い' }, { who: HI, bg: 'nagoya', text: '……お前は、ほんまにそういうことを言うな' }] },
    { id: 'shitagau', label: '黙って従い、名護屋で兵糧と船を回す', note: '北陸は痩せるが、太閤の信は厚くなる', eff: { rel: { kinoshita_tokichiro: 6 }, kura: -200, dev: -0.04 },
      res: [{ who: OK, bg: 'nagoya', text: '承知。……北陸の倉が、少し寂しうなります' }] },
    { id: 'wataru', label: '自ら渡ると申し出る', note: '槍の又左の熱。太閤は止める', eff: { rel: { kinoshita_tokichiro: 4 }, kaze: 1 },
      res: [{ who: HI, bg: 'nagoya', text: 'あかん。又左はここにおれ。……お前まで海の向こうへ行ったら、ここが空く' }] },
  ] },
  p5_hideyori: { text: '秀頼を、どう支える', choices: [
    { id: 'sasaeru', label: '「支える。豊臣がまだ固まりきらぬなら、崩れぬよう支える」', note: '小説の利家', eff: { rel: { kinoshita_tokichiro: 8 } },
      res: [{ who: T, bg: 'osaka_hiroma', text: '支える。秀頼様そのものより、そのまわりがな' }, { who: TN, bg: 'osaka_hiroma', text: '大事にございます' }] },
    { id: 'mae', label: '「前田の家を残すことが先だ」と腹で決める', note: '口には出さない', eff: { kachu: 4 },
      res: [{ bg: 'osaka_hiroma', text: '利家は「はい」とだけ言った。腹の底では、前田の家の行く先を量っていた。' }] },
  ] },
  p5_sakeme: { text: '無断で家を結ぶ家康に、どう向き合う', choices: [
    { id: 'kitsumon', label: '病をおして伏見の家康を詰問する', note: '小説の利家。「厳しいと思うなら、無断で家なんぞ結ぶな」', eff: { rel: { kinoshita_tokichiro: 4 }, kachu: 2 },
      res: [{ who: T, bg: 'fushimi', text: '徳川。お前は、人の割れ目を見るのがうまいな' }, { who: IE, bg: 'fushimi', text: '前田殿のお言葉は、時に厳しゅうございます' }, { who: T, bg: 'fushimi', text: '厳しいと思うなら、無断で家なんぞ結ぶな' }, { who: IE, bg: 'fushimi', text: '……家のことにございますれば、止めきれぬこともございます' }, { who: T, bg: 'fushimi', text: '皆、家だな' }] },
    { id: 'mokunin', label: '黙って見る。争えば家が割れる', note: '前田の家は守れるが、裂け目は広がる', eff: { kachu: 2, rel: { kinoshita_tokichiro: -4 } },
      res: [{ bg: 'fushimi', text: '利家は何も言わなかった。家康も何も言わなかった。裂け目は、音を立てずに少し広がった。' }] },
    { id: 'mitsunari', label: '三成に任せる', note: '嫌われ役に、さらに嫌われ役を', eff: { rel: { kinoshita_tokichiro: -2 } },
      res: [{ who: MI, bg: 'fushimi', text: '……承りました' }, { who: KI, bg: 'fushimi', text: '前田様まで、三成に' }] },
  ] },
  p5_atsuku: { text: '利長に、家の持ち方をどう伝える', choices: [
    { id: 'furui', label: '「古い者を捨てるな。正しいだけじゃ家は痩せる。太らせろ」', note: '小説の利家', eff: { kachu: 6 },
      res: [{ who: T, bg: 'fushimi', text: '古い者を甘やかせって言ってるんじゃねえ。古い者を捨てるな、ってことだ。利久がいた。利益もいた。……お前は正しい。だが、正しいだけじゃ家は少し痩せる。痩せた家は、いざという時に持たねえ。だから太らせろ' }, { who: TN, bg: 'fushimi', text: 'はい' }] },
    { id: 'atarashii', label: '「新しい者を使え。古い者に遠慮するな」', note: '家は速くなるが、古い者が離れる', eff: { kachu: -4, dev: 0.04 },
      res: [{ who: TN, bg: 'fushimi', text: '……はい' }, { who: OK, bg: 'fushimi', text: '（……）' }] },
    { id: 'kaze', label: '「家の中に、少しは風を残せ」', note: '利益の居た場所を', eff: { kaze: 2 },
      res: [{ who: T, bg: 'fushimi', text: '利長。家の中に、少しは風を残せ。きれいすぎる家は、息が詰まる' }, { who: TN, bg: 'fushimi', text: '……利益殿のような、にございますか' }, { who: T, bg: 'fushimi', text: 'あそこまではいらねえ' }] },
  ] },
};
Object.assign(NODES, N5);
