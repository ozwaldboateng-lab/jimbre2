// 前田利家 ― 残り火 第三部「裂け目」（小説『残り火』第七章「裂け目」・第八章「継ぐ土」）
// 七尾落城（1577）→ 秀吉の来援と離陣 → 手取川 → 親父殿の下 → 謙信の死 → 能登を継ぐ（1581）→ 七尾の主 → 魚津 → 本能寺（1582）→ 空白 → 選ぶ前 → 賤ヶ岳（1583）
import type { Beat } from './story_toshiie';
import { NODES, type Node } from './story_toshiie2';

const T = 'maeda_toshiie', OK = 'okumura', MU = 'murai', NA = 'sassa_narimasa', KA = 'shibata_katsuie', HI = 'kinoshita_tokichiro', MA = 'matsu_wife', CHO = 'cho_tsuratatsu', TH = 'toshihisa_old';

// ───────── 第七章　裂け目 ─────────
export const P3_NANAO: Beat[] = [
  { kind: 'chapter', head: '第七章', text: '裂け目', sub: '残り火　第三部' },
  { kind: 'door', head: '七尾落つ', text: '七尾落つ', sub: '天正五年 九月' },
  { head: '府中の屋敷', bg: 'zashiki_arako', text: '悪い報せというものは、届いた時より、届いたあとの方が重い。報せそのものは、短かった。七尾城、落つ。それだけである。' },
  { bg: 'zashiki_arako', text: '七尾。能登。北の海。道。舟。人。兵糧。そのどれもが、ただ一つの城の名の後ろに連なっている。利家には、その一報で北の地図が少し傾いたように思えた。' },
  { who: T, bg: 'zashiki_arako', text: '……早かったな' },
  { who: MU, bg: 'zashiki_arako', text: '持ちませなんだか' },
  { who: T, bg: 'zashiki_arako', text: '持たせられなかった、だろうな' },
  { head: '北ノ庄の評定', bg: 'kitanosho', text: '勝家は上座にいた。怒っている、という顔ではなかった。ただ、いつもよりさらに大きく見えた。悪い報せが来た時、この人はまず自分の中へ全部を落とす。落として、それを座敷の中で持つ。' },
  { who: KA, bg: 'kitanosho', text: '来たか、前田。七尾は落ちた。……分かっておるな' },
  { who: T, bg: 'kitanosho', text: 'は' },
  { who: KA, bg: 'kitanosho', text: '北は軽うない。能登一国の話ではない。北が崩れる' },
  { who: NA, bg: 'kitanosho', text: '兵も、道も、先に細ります' },
  { who: KA, bg: 'kitanosho', text: '前田。お前は越前で持たせる理を覚えたな' },
  { who: T, bg: 'kitanosho', text: '覚えたつもりにございます' },
  { who: KA, bg: 'kitanosho', text: 'なら、今度はもっと大きいものを見よ' },
  { who: MU, bg: 'kitanosho', text: '……七尾ってのは、落ちたあとで、皆の顔が変わる城にございます' },
];
export const P3_KITARU: Beat[] = [
  { kind: 'door', head: '来たる者', text: '来たる者', sub: '天正五年 加賀' },
  { head: '北陸の陣', bg: 'hokuriku_jin', text: '来る者がある、という報せは、それだけで少し人の息を変える。羽柴秀吉、来援。その名を聞いた時、利家はまず胸の奥がわずかに緩むのを感じた。' },
  { bg: 'hokuriku_jin', text: '秀吉の才を利家は知っている。だが、それだけではない。豪がいる。ねねがいる。その家はもう、ただの同僚の家ではない。' },
  { who: MU, bg: 'hokuriku_jin', text: '利家様。お顔が少し軽うございます' },
  { who: T, bg: 'hokuriku_jin', text: '軽くはねえ' },
  { who: HI, bg: 'hokuriku_jin', text: '又左' },
  { who: T, bg: 'hokuriku_jin', text: '藤吉郎' },
  { who: HI, bg: 'hokuriku_jin', text: 'ひどい顔だな' },
  { who: T, bg: 'hokuriku_jin', text: 'お前もだ' },
  { who: HI, bg: 'hokuriku_jin', text: 'おれは元からだ。……七尾の報、聞いた' },
  { who: T, bg: 'hokuriku_jin', text: '遅れたで済めば楽だがな' },
  { who: HI, bg: 'hokuriku_jin', text: '楽じゃないから来たんだろ' },
  { who: MA, bg: 'arako_night', text: '豪も、ねね様も、お変わりないそうでございます。……少し、安心いたしました' },
  { who: T, bg: 'arako_night', text: '近い顔が来ると、なおさら難しいな。近いってのは、面倒だ' },
  { who: MA, bg: 'arako_night', text: '近くなければ、安心もいたしませぬ' },
];
export const P3_KACHISUJI: Beat[] = [
  { kind: 'door', head: '北の勝ち筋', text: '北の勝ち筋', sub: '天正五年 加賀' },
  { head: '北陸の陣', bg: 'hokuriku_jin', text: '勝ち方には、土地の癖が出る。前へ出る。早く出る。相手より先に槍を届かせる。それで足りる場が、尾張にはあった。だが北国の晴れは、晴れているのにどこか湿って見える。道を踏めば、足の裏へ嫌な重さが返ってくる。' },
  { who: NA, bg: 'hokuriku_jin', text: '又左。見てきたか。どうだ' },
  { who: T, bg: 'hokuriku_jin', text: '面倒だ。勝ち筋がそのまま通らねえ面倒だ' },
  { who: NA, bg: 'hokuriku_jin', text: '通らぬなら、通すまでだ' },
  { who: T, bg: 'hokuriku_jin', text: '通すまでに、こっちが鈍る' },
  { who: KA, bg: 'kitanosho', text: '北は南の戦ではない。鉄砲は効くところはある。だが、それ頼みでは鈍るな。……前田。お前はどう見る', ask: 'p3_kachisuji' },
];
export const P3_HANARERU: Beat[] = [
  { kind: 'door', head: '離れる者', text: '離れる者', sub: '天正五年 加賀' },
  { head: '北陸の陣', bg: 'hokuriku_jin', text: '来る者がある、という報せは人の息を少し変える。ならば、去る者があるという報せはどうか。それは届いた時より、届いたあとの方が痛い。羽柴秀吉、離陣。文は短い。だが、その短さがかえって嫌だった。' },
  { who: T, bg: 'hokuriku_jin', text: '何だと' },
  { who: MU, bg: 'hokuriku_jin', text: '誤りではございませぬか' },
  { head: '北ノ庄の評定', bg: 'kitanosho', text: '勝家の座敷の空気は、怒りより先に冷えていた。' },
  { who: NA, bg: 'kitanosho', text: 'ふざけておりますな。七尾は落ち、北は重く、これから寄せる時に、何を考えておるのか' },
  { who: KA, bg: 'kitanosho', text: '……前田。お前はどう思う', ask: 'p3_hanareru' },
];
export const P3_TEDORI: Beat[] = [
  { kind: 'door', head: '手取川', text: '手取川', sub: '天正五年 加賀' },
  { head: '手取川', bg: 'tedorigawa', text: '七尾に、間に合わなかった。その事実は、戦が始まる前からすでに利家の胸へ重く乗っていた。しかも、秀吉はもういない。前には勝家がいる。だがあの背が前にあるだけで、誰も勝手には崩れきらぬ。' },
  { who: KA, bg: 'tedorigawa', text: '前田！　右を見よ。川に寄せられるな' },
  { who: T, bg: 'tedorigawa', text: 'は！' },
  { bg: 'tedorigawa', text: '鉄砲の音がした。乾いた鋭い裂け方ではなく、湿りに少し食われる。上杉方の動きが速い。こちらが整え直す間に、向こうはもう次の圧をかけてくる。', ask: 'p3_tg1' },
];
export const P3_WARERU: Beat[] = [
  { kind: 'door', head: '割れる声', text: '割れる声', sub: '天正五年 冬' },
  { head: '北陸の陣', bg: 'hokuriku_jin', text: '戦のあとの静けさは、勝った時と負けた時でまるで違う。負けたあとの静けさには、言葉にならぬものだけが残る。泥の冷たさ、身体の重さ、言いそびれた怒り。そして、秀吉がいなかった。' },
  { who: MU, bg: 'hokuriku_jin', text: '利家様。お休みになっておりませぬな。……秀吉殿のことを、お考えで' },
  { who: T, bg: 'hokuriku_jin', text: '分からねえ。分からねえが、嫌だ' },
  { bg: 'hokuriku_jin', text: '陣のそこかしこで、低い声が割れていた。羽柴は北を捨てた。羽柴は勝家様を軽う見た。前田の家中にも、その声を口にする者がいる。', ask: 'p3_wareru' },
];
export const P3_OYAJI: Beat[] = [
  { kind: 'door', head: '親父殿の下', text: '親父殿の下', sub: '天正五年 冬' },
  { head: '北ノ庄の評定', bg: 'kitanosho', text: '去った者の不在がいちばん深く分かるのは、残った者の重さを見た時だった。兵は疲れている。馬も腹が落ちている。だが、散ってはいない。この苦しいあとでなお、場の骨を一本通している者がいる。' },
  { who: KA, bg: 'kitanosho', text: '来たか' },
  { who: T, bg: 'kitanosho', text: 'は。……北はまだ終わっておりませぬな' },
  { who: KA, bg: 'kitanosho', text: '終わらぬ。おらぬ者の話で場を持たせるな' },
  { who: OK, bg: 'kitanosho', text: '倉は細ります' },
  { who: KA, bg: 'kitanosho', text: '細る' },
  { who: MU, bg: 'kitanosho', text: '道も傷みます' },
  { who: KA, bg: 'kitanosho', text: '傷む。……兵も疲れておる。それでも持つ' },
  { who: NA, bg: 'hokuriku_jin', text: '又左。勝家様は重いな。……重いから寄れる' },
  { who: T, bg: 'hokuriku_jin', text: 'そうだな。羽柴がどうであれ、俺はここだ' },
  { who: NA, bg: 'hokuriku_jin', text: '俺もだ' },
  { who: MA, bg: 'arako_night', text: '今日は、落ち着いておられます。……利家様は、寄る柱が見えると少し静かになります' },
  { who: T, bg: 'arako_night', text: '親父殿、ってやつだな' },
];
export const P3_ARAGAU: Beat[] = [
  { kind: 'door', head: '抗う', text: '抗う', sub: '天正六年 春' },
  { head: '北ノ庄の評定', bg: 'kitanosho', text: '大きすぎる敵が消えた時、人はすぐには喜べない。上杉謙信、死す。文は短い。あれほど大きかった男が、そんな短い言葉で消えてよいはずがない。' },
  { who: KA, bg: 'kitanosho', text: '壁は消えた。だが、道が開いたとは限らぬ' },
  { who: OK, bg: 'kitanosho', text: '上杉は割れましょう。景勝か景虎か。ですが、割れればすぐこちらが楽になるとも限りませぬ' },
  { who: T, bg: 'kitanosho', text: '大きい敵が死んだ。たしかにそれは本当だ。だが……今度は、こっちの中がよう見える' },
  { who: MA, bg: 'arako_night', text: '少しは、お気が楽になりましたか' },
  { who: T, bg: 'arako_night', text: 'ならねえな。……豪は、元気だろうな' },
  { who: MA, bg: 'arako_night', text: 'きっと' },
  { bg: 'arako_night', text: 'その「きっと」の中に、ねねの姿もあるのだろう。大敵は去った。それでも抗いは終わらぬ。北はまだ終わらない。' },
  { bg: 'arako_night', text: '（物語の次の場面は天正九年（1581年）、能登。それまでは府中の城主として、柴田の下で働く。「月日を送る」で跳ぶこともできる）' },
];

// ───────── 第八章　継ぐ土 ─────────
export const P3_NOTO: Beat[] = [
  { kind: 'chapter', head: '第八章', text: '継ぐ土', sub: '残り火　第三部' },
  { kind: 'door', head: '能登を継ぐ', text: '能登を継ぐ', sub: '天正九年' },
  { head: '府中の屋敷', bg: 'zashiki_arako', text: '国を与えられる、というのは、めでたいことのはずだった。一国持ち。能登一円。七尾を拠点とする。だが利家の胸の底へ落ちてきたのは、喜びではなく重さだった。あの能登を、今度は持てという。' },
  { who: T, bg: 'zashiki_arako', text: '今度は持て、か' },
  { who: OK, bg: 'zashiki_arako', text: 'それが第一声にございますか' },
  { who: T, bg: 'zashiki_arako', text: 'じゃあ何て言やあいい' },
  { who: OK, bg: 'zashiki_arako', text: 'ありがたき幸せ、とでも' },
  { who: T, bg: 'zashiki_arako', text: 'お前が言えば似合わねえな' },
  { who: OK, bg: 'zashiki_arako', text: '利家様が言うても、あまり似合いませぬ' },
  { head: '七尾城', bg: 'nanao', text: '七尾城は大きかった。石も、櫓も、門も。だが、それが前田の城に「なる」のではない。落ちた城が、まだ立っている。人だけが入れ替わる。' },
  { who: T, bg: 'nanao', text: '大きいな。だが、石が大きいんじゃねえ。……背中だ。あの城の後ろに、能登がまるごと乗ってる' },
  { who: CHO, bg: 'nanao', text: '海はようございますが、海だけでは国は持ちませぬ。海は物を集めます。人も集めます。ですが、道を押さえねば、集まったものは散ります' },
  { who: T, bg: 'nanao', text: '長殿。この国は面倒だな' },
  { who: CHO, bg: 'nanao', text: '面倒でございます。ですが、面倒でなければ能登ではございませぬ' },
  { bg: 'nanao', text: '長連龍。七尾落城で一族を失い、織田について能登へ戻った男。この男の中には、能登を「前田の国」になる前から知っている目がある。' },
  { bg: 'nanao', text: '（七尾城の主（能登の国主）となった。府中の治めは他の者に引き継ぐ。七尾の城下で「国を治める」ができる）' },
];
export const P3_KAERU: Beat[] = [
  { kind: 'door', head: '帰る者', text: '帰る者', sub: '天正九年 七尾' },
  { head: '七尾の港', bg: 'nanao_minato', text: '国を持つ、というのは、人が増えることではなかった。むしろ最初に利家が知ったのは、いまの前田の家のままでは、この国は持てぬということだった。倉のこと。港のこと。寺社のこと。誰をどこへ置くか。' },
  { who: T, bg: 'nanao_minato', text: '何だってこんなに口が多いんだ' },
  { who: OK, bg: 'nanao_minato', text: '能登にございますから' },
  { who: T, bg: 'nanao_minato', text: '便利な言葉だな' },
  { who: OK, bg: 'nanao_minato', text: '便利でなく、本当のことにございます' },
  { who: T, bg: 'nanao_minato', text: '人が足りねえな。だが、人数を増やしゃ済む話でもねえ。……戻してえ奴がいる' },
  { who: OK, bg: 'nanao_minato', text: '利久殿にございますか。まずは、静かな骨が要る時にございます', ask: 'p3_kaeru' },
];
export const P3_NANAONOSHU: Beat[] = [
  { kind: 'door', head: '七尾の主', text: '七尾の主', sub: '天正十年 春' },
  { head: '七尾城', bg: 'nanao', text: '城というものは、持った瞬間から意味が変わる。利家にとって七尾は、落ちた城だった。間に合わなかった城だった。その同じ七尾へ、いまは自分が主として立っている。' },
  { who: T, bg: 'nanao', text: '広いな' },
  { bg: 'nanao', text: 'その「広い」は、城の広さではなかった。七尾の背後に乗っている能登そのものの広さだった。' },
  { who: MU, bg: 'nanao', text: 'お早うございます' },
  { who: T, bg: 'nanao', text: '七尾は嫌な城だな。立派すぎる。立派だから、落ちた時のことまでよく見える' },
  { who: MU, bg: 'nanao', text: '落ちた城だからこそ、持つのが重いのでございましょう' },
  { who: 'noto_kokujin', bg: 'nanao_minato', text: '前田様。七尾はようございますが、七尾だけでは国が痩せます。海へ入る物は目につきます。ですが、国はそれだけでは持ちませぬ' },
  { who: CHO, bg: 'nanao_minato', text: '前田様。お前は俺を見てるな、と仰せで。……見ます。新しい主にございます。能登が持つかどうか、にございます' },
  { who: T, bg: 'nanao_minato', text: 'なら、見てろ' },
  { who: T, bg: 'nanao', text: '七尾は、城じゃねえな。口だ。海も、道も、人も、みんなここへ寄ってくる', ask: 'p3_nanaonoshu' },
];
export const P3_UOZU: Beat[] = [
  { kind: 'door', head: '魚津', text: '魚津', sub: '天正十年 越中' },
  { head: '魚津の陣', bg: 'uozu', text: '国を持ったからといって、戦が遠くなるわけではなかった。むしろ、前より近くなった。七尾を離れる朝、城はまだ朝靄の中に半分沈んでいた。' },
  { who: NA, bg: 'uozu', text: '名残惜しそうだな、犬千代。……だが、背中が増えた顔はしてる' },
  { who: T, bg: 'uozu', text: '国持ちってのは楽じゃねえな' },
  { who: KA, bg: 'uozu', text: '前田。能登はどうだ' },
  { who: T, bg: 'uozu', text: 'まだ持ち始めたばかりにございます' },
  { who: KA, bg: 'uozu', text: 'ならば、そのまま背負え' },
  { bg: 'uozu', text: '海から来る湿った風。重い空。長く攻めを続ける者だけが持つ、乾いた苛立ち。馬が一頭、ぬかるみに脚を取られて倒れた。', ask: 'p3_uozu' },
];
export const P3_TENJO: Beat[] = [
  { kind: 'door', head: '天井落つ', text: '天井落つ', sub: '天正十年 六月' },
  { head: '魚津の陣', bg: 'uozu', text: 'あまりに大きいものが落ちる時、人はすぐには悲鳴も出せない。魚津の陣は、張りつめていた。誰もが消耗している。だが緩んではいない。' },
  { who: T, bg: 'uozu', text: '右を少し寄せろ。兵糧は' },
  { who: OK, bg: 'uozu', text: '足りませぬが、切れてはおりませぬ' },
  { who: T, bg: 'uozu', text: '切らすな' },
  { head: '本能寺の報', bg: 'honnoji_ho', text: 'その夜、一人の使者が陣へ駆け込んできた。顔に血の気がない。' },
  { who: 'tsukai', bg: 'honnoji_ho', text: '上様……上様、御討死' },
  { who: T, bg: 'honnoji_ho', text: '……何を言ってる' },
  { who: 'tsukai', bg: 'honnoji_ho', text: '京、本能寺にて。明智光秀にございます' },
  { bg: 'honnoji_ho', text: '利家はしばらく動かなかった。天井が落ちた。あの、どこまでも高く、どこまでも届く天井が。' },
  { who: KA, bg: 'honnoji_ho', text: '来たか、前田。聞いたな。……壁は消えた。だが、天井も落ちた' },
  { who: NA, bg: 'honnoji_ho', text: '犬千代。どうなりますかな' },
  { who: T, bg: 'honnoji_ho', text: '分からねえ。何もかも、分からねえ' },
  { who: T, bg: 'honnoji_ho', text: '（……豪は、向こうにいる）' },
  { kind: 'time', text: '天正十年　本能寺の変', sub: '世の中は、史実の形に合わせ直される' },
  { bg: 'kitanosho', text: '（世の中を「天正十年 本能寺の変」の形に合わせ直す。利家は柴田勝家の与力（柴田家）として、七尾にいる。暦はそのまま、利家と前田家はそのまま引き継ぐ）' },
];
export const P3_KUHAKU: Beat[] = [
  { kind: 'door', head: '空白の中で', text: '空白の中で', sub: '天正十年 夏' },
  { head: '北ノ庄の評定', bg: 'kitanosho', text: '天井が落ちたあと、最初に来るのは混乱ではない。むしろ、妙に静かな空白だった。兵はまだいる。城もある。なのに、昨日までこの場を張っていた意味だけが、どこかへ抜けていく。' },
  { who: KA, bg: 'kitanosho', text: '上様の仇は、討たねばならぬ' },
  { who: NA, bg: 'kitanosho', text: 'ならば、北にこだわっておる場合ではありますまい' },
  { who: T, bg: 'kitanosho', text: '分からねえが、一つだけ分かる。……俺たちは、決まる場にいねえ' },
  { who: T, bg: 'kitanosho', text: '京で何がどう動くか。誰が光秀を討つか。誰が上様のあとを決めるか。俺たちは北にいる' },
  { who: NA, bg: 'kitanosho', text: '秀吉は走るだろう' },
  { who: T, bg: 'kitanosho', text: 'あいつは走る。走れる。こっちは魚津と七尾と能登を背負ってる' },
  { bg: 'kitanosho', text: '羽柴秀吉、山崎にて明智を討つ。報せが届いた時、北の誰もが、それが何を意味するかを分かっていた。' },
  { who: MA, bg: 'arako_night', text: '何か、決まり始めておりますか。……動けぬ方のお顔にございます' },
  { who: T, bg: 'arako_night', text: '豪は向こうにいる。ねね殿もいる' },
];
export const P3_ERABU: Beat[] = [
  { kind: 'door', head: '選ぶ前', text: '選ぶ前', sub: '天正十年 冬' },
  { head: '七尾城', bg: 'nanao', text: '決めねばならぬことほど、すぐには決められぬ。勝家か。秀吉か。そう言葉にしてしまえば、ずいぶん薄くなる。親父殿。北で踏みとどまり、手取川でも魚津でも、去らずに立っていた柱。旧い友。豪を預けた相手。' },
  { who: CHO, bg: 'nanao_minato', text: '港は、嘘もまことも早うございます' },
  { who: T, bg: 'nanao_minato', text: 'ありがたくねえな' },
  { who: CHO, bg: 'nanao_minato', text: 'ですが、知らぬよりは' },
  { bg: 'nanao', text: '使いが来る。文が来る。秀吉からも。勝家からも。どちらの文も、利家を「当然こちら」と書いていた。', ask: 'p3_erabu' },
];
export const P3_SHIZU: Beat[] = [
  { kind: 'door', head: '賤ヶ岳', text: '賤ヶ岳', sub: '天正十一年 四月' },
  { head: '賤ヶ岳', bg: 'shizugatake', text: '決めねばならぬ時というのは、たいてい、もっとましな顔をして来てはくれない。春の気配はある。だが、まだ寒い。山は低く黙り、地面には冬の名残がうっすら残っている。' },
  { who: NA, bg: 'shizugatake', text: '犬千代。……決めたか' },
  { who: T, bg: 'shizugatake', text: '成政。お前は、勝家様の下で死ねるか' },
  { who: NA, bg: 'shizugatake', text: '死ねる。……お前は' },
  { who: T, bg: 'shizugatake', text: '俺は……' },
  { who: NA, bg: 'shizugatake', text: '羨ましがるな。犬千代は犬千代で、背中が多い' },
  { who: KA, bg: 'shizugatake', text: '前田。七尾はどうだ' },
  { who: T, bg: 'shizugatake', text: '持っております' },
  { who: KA, bg: 'shizugatake', text: '前田。お前は、国を持った。……ならば、国持ちらしく立て' },
  { who: MA, bg: 'shizugatake', text: '勝家様に、お会いになりましたね。……どちらも、切れませぬか' },
  { who: T, bg: 'shizugatake', text: '切れねえな' },
  { who: MA, bg: 'shizugatake', text: '豪は、向こうにおります。ねね様もおられます。……それでも、前田の家はこちらにございます' },
  { who: T, bg: 'shizugatake', text: '俺に、勝家様を切れと言うか' },
  { who: MA, bg: 'shizugatake', text: '申しませぬ。秀吉につけとも申しませぬ。……利家様が、前田の家の行く先をお決めになるのでございます' },
  { who: T, bg: 'shizugatake', text: '嫌だな。できれば逃げたい。勝家様の下で、このまま立っていたい。……だが' },
  { who: T, bg: 'shizugatake', text: '清須で、何もできなかった。今度まで、人に決められてたまるか' },
  { who: T, bg: 'shizugatake', text: '面倒だな。……だが、今度は俺が決める', ask: 'p3_shizu' },
];
// 賤ヶ岳: 陣を退く（史実・第三部の締め）
export const P3_RYO: Beat[] = [
  { bg: 'shizugatake', text: '前田の陣が、退いた。戦の只中で、柴田の左手が一つ、ぽっかりと空いた。' },
  { kind: 'door', head: '賤ヶ岳のあと', text: '賤ヶ岳のあと', sub: '天正十一年' },
  { head: '七尾城', bg: 'nanao', text: '勝った、という言葉は、たいてい少し軽い。賤ヶ岳のあと、周囲は前田の家が助かったように言った。よく踏みとどまった。うまく動いた。家を残した。どれも間違いではない。' },
  { bg: 'nanao', text: 'だが、そういう理屈が並ぶほど、利家の胸の底には別の重さが沈んでいった。勝った、ではない。切った、のである。親父殿を。' },
  { who: HI, bg: 'nanao', text: '又左。……賤ヶ岳は終いじゃない。始まりだ' },
  { who: T, bg: 'nanao', text: '本当にな。だが、楽になるとは思ってねえ' },
  { who: HI, bg: 'nanao', text: '豪は元気だぞ' },
  { who: T, bg: 'nanao', text: '……そうか' },
  { kind: 'chapter', head: '第三部　了', text: '裂け目', sub: '残り火' },
  { bg: 'nanao', text: '（第三部「裂け目」はここまで。前田家は羽柴に従う家となった。第四部「根を張る」（加賀・末森・さらさら越え）は作成中。ここからは羽柴家の下の能登の国主として、引き続き働ける）' },
];
// 賤ヶ岳: 勝家とともに（もう一つの残り火）
export const P3_TOMO: Beat[] = [
  { bg: 'shizugatake', text: '利家は、退かなかった。前田の陣は、柴田の左手に立ち続けた。' },
  { who: NA, bg: 'shizugatake', text: '……犬千代。馬鹿だな' },
  { who: T, bg: 'shizugatake', text: 'お前に言われたくねえ' },
  { bg: 'shizugatake', text: '羽柴の大軍が押し寄せた。前田の列は崩れなかった。崩れなかったまま、削られていった。槍の又左の最後の槍は、昔のように、まっすぐ前へ出た。' },
  { who: KA, bg: 'kitanosho', text: '……前田。お前は、来たか' },
  { kind: 'chapter', head: 'もう一つの残り火', text: '共に', sub: '残り火' },
  { bg: 'kitanosho', text: '前田利家は、賤ヶ岳で柴田勝家とともに散った。前田の家は北陸に残らなかった。だが、去らずに立っていた男がもう一人いたことを、北の土はしばらく覚えていた。' },
  { bg: 'kitanosho', text: '（もう一つの終わり。物語はここで閉じる。賤ヶ岳で「退く」を選べば、物語の本筋へ続く）' },
];

// ───────── 選ばせる問い ─────────
const N3: Record<string, Node> = {
  p3_kachisuji: { text: '北の勝ち筋をどう見る', choices: [
    { id: 'mochi', label: '前へ出る戦だけじゃねえ。どこで止め、どこで持たせるかまで見る', note: '小説の利家。「土地だけじゃねえ。戦の線もだ」', eff: { rel: { shibata_katsuie: 4 }, pt: 1 },
      res: [{ who: T, bg: 'kitanosho', text: '前へ出る戦だけじゃねえ。どこで止めるか、どこで持たせるか、そこまで見ねえと押される。土地だけじゃねえ。戦の線もだ' }, { who: NA, bg: 'kitanosho', text: '又左、お前ずいぶん面倒なことを言うようになったな' }, { who: T, bg: 'kitanosho', text: '誰のせいだと思ってる' }] },
    { id: 'mae', label: '北でも、先に槍を届かせる', note: '尾張の勝ち方。勢いはつく', eff: { merit: 6 },
      res: [{ who: KA, bg: 'kitanosho', text: '勢いはよい。だが、北の泥は勢いを食うぞ' }] },
    { id: 'teppo', label: '鉄砲で上杉の足を止める', note: '湿りが火を鈍らせる', eff: {},
      res: [{ who: OK, bg: 'kitanosho', text: '効くところはございます。ですが、この湿りでは……' }] },
  ] },
  p3_hanareru: { text: '秀吉が去った。勝家の前で、何と言う', choices: [
    { id: 'iya', label: '「分からねえ。分からねえが、嫌だ」', note: '小説の利家。勝家は「それでよい」と言う', eff: { rel: { shibata_katsuie: 6 } },
      res: [{ who: T, bg: 'kitanosho', text: '分からねえ。……分からねえが、嫌だ' }, { who: KA, bg: 'kitanosho', text: '嫌、か' }, { who: T, bg: 'kitanosho', text: 'は' }, { who: KA, bg: 'kitanosho', text: 'それでよい' }, { who: OK, bg: 'kitanosho', text: '理由はあるのでございましょう。理由なく動く男でもありますまい' }, { who: KA, bg: 'kitanosho', text: '理由があれば済むか。……去ったことは去ったことだ' }] },
    { id: 'kabau', label: '「あいつは北を軽く見る男じゃねえ。理由がある」', note: '秀吉をかばう。勝家の顔が曇る', eff: { rel: { kinoshita_tokichiro: 8, shibata_katsuie: -6 } },
      res: [{ who: T, bg: 'kitanosho', text: 'あいつは北を軽く見る男じゃねえ。何か理由がある' }, { who: NA, bg: 'kitanosho', text: '理由があれば、七尾が戻るのか' }, { who: KA, bg: 'kitanosho', text: '……前田。友をかばうのはよい。だが、ここは北だ' }] },
    { id: 'semeru', label: '「勝家様を軽う見た。許せませぬ」', note: '勝家に寄る。秀吉とは遠くなる', eff: { rel: { shibata_katsuie: 8, kinoshita_tokichiro: -8 } },
      res: [{ who: T, bg: 'kitanosho', text: '勝家様を軽う見た。……許せませぬ' }, { who: KA, bg: 'kitanosho', text: '……そう言うな。羽柴を軽う見れば、自分の眼まで軽くなる' }] },
  ] },
  p3_tg1: { text: '右が薄い。川へ寄せられる', tag: 'tedorigawa', choices: [
    { id: 'mochi', label: '右へ入って列を持たせる', note: '勝ちには届かないが、崩れない', eff: { pt: 2 }, next: 'p3_tg2',
      res: [{ who: NA, bg: 'tedorigawa', text: '又左！　右が薄い！' }, { who: T, bg: 'tedorigawa', text: '分かってる！' }, { who: NA, bg: 'tedorigawa', text: '分かってるなら持たせろ！' }, { bg: 'tedorigawa', text: '利家はその一言に、妙に胸を打たれた。そうだ。いまはこの戦の線そのものを持たせねばならぬ。' }] },
    { id: 'mae', label: '前へ出て押し返す', note: '槍の又左。泥に足を取られる', eff: { pt: 1, merit: 6 }, next: 'p3_tg2',
      res: [{ bg: 'tedorigawa', text: '槍が立つ。利家も前へ出る。だが川と地面が、こちらの踏ん張りそのものをじわじわ削ってくる。' }] },
    { id: 'sagaru', label: '川から離れて下がる', note: '損は少ないが、隣が薄くなる', eff: { pt: 0, rel: { sassa_narimasa: -4 } }, next: 'p3_tg2',
      res: [{ who: NA, bg: 'tedorigawa', text: '又左！　どこへ行く！' }] },
  ] },
  p3_tg2: { text: '押し返されている。日が傾く', tag: 'tedorigawa', choices: [
    { id: 'kuzusuna', label: '「退くな！」最後まで列を持つ', note: '持たせるが、勝たせるところまでは届かない', eff: { pt: 2, kachu: 4 }, next: '@tedorigawa',
      res: [{ who: T, bg: 'tedorigawa', text: '崩すな！　退くな！' }, { bg: 'tedorigawa', text: '持たせるが、勝たせるところまでは届かぬ。そこがいちばん苦い。踏ん張るだけでは届かぬ戦がある。大崩れではない。' }] },
    { id: 'hiku', label: '勝家の退きに合わせて整えて退く', note: '損を抑える', eff: { pt: 1 }, next: '@tedorigawa',
      res: [{ bg: 'tedorigawa', text: '勝家の陣が退き始める。前田の列も、それに合わせて下がった。' }] },
  ] },
  p3_wareru: { text: '家中で、秀吉を悪く言う声が割れている', choices: [
    { id: 'iwasenai', label: '「悪く言うな」と止める', note: '小説の利家。「俺が言わせたくねえ」', eff: { rel: { kinoshita_tokichiro: 4 }, kachu: -2 },
      res: [{ who: T, bg: 'hokuriku_jin', text: '悪く言うな。……言い切れねえ。だが、俺が言わせたくねえ' }, { who: MA, bg: 'arako_night', text: '利家様は、お優しいのではなく、切れぬのでございますね' }, { who: T, bg: 'arako_night', text: 'ひどい言いようだな' }, { who: MA, bg: 'arako_night', text: '本当のことにございます' }] },
    { id: 'iwaseru', label: '言わせておく', note: '家中の熱は冷めない', eff: { kachu: 2 },
      res: [{ bg: 'hokuriku_jin', text: '利家は何も言わなかった。言わせておいた。その沈黙を、家中は「前田様もそうお考えだ」と受け取った。' }] },
    { id: 'ikaru', label: '一緒に怒る', note: '柴田の陣では通りがよい。秀吉とは遠くなる', eff: { rel: { shibata_katsuie: 4, kinoshita_tokichiro: -6 }, kachu: 4 },
      res: [{ who: T, bg: 'hokuriku_jin', text: 'あいつは、北を捨てた' }, { bg: 'hokuriku_jin', text: '言った途端に、胸のどこかが嫌な音を立てた。情の方が先に決めやがったな、と自分で思った。' }] },
  ] },
  p3_kaeru: { text: '誰を先に呼び戻す', choices: [
    { id: 'toshihisa', label: '兄・利久を呼ぶ', note: '小説の利家。静かな骨', eff: { kachu: 8, chian: 6 },
      res: [{ who: TH, bg: 'nanao', text: '久しいな、犬千代' }, { who: T, bg: 'nanao', text: '能登は広い' }, { who: TH, bg: 'nanao', text: '広いだけでは済まぬ顔をしているな。……弟の顔だ。いや、いまは前田の顔か' }, { who: T, bg: 'nanao', text: '戻る気になったか' }, { who: TH, bg: 'nanao', text: '呼ばれたからな。……だが犬千代、お前一人の手じゃこの国は回らん。まずは中を静かにしろ' }] },
    { id: 'toshimasu', label: '利益を呼ぶ', note: '風が強すぎるが、人が寄る', eff: { kachu: 2, shu: 60, chian: -2 },
      res: [{ who: 'maeda_toshimasu', bg: 'nanao', text: '呼ばれたので参った。能登の海は、尾張よりよう荒れますな' }, { who: OK, bg: 'nanao', text: '……先に戻っていただくには、少し風が強すぎましょう' }, { who: T, bg: 'nanao', text: 'うまいこと言うな' }] },
    { id: 'cho', label: '長連龍を前に立て、国人を呼び戻す', note: '能登の者で能登を持つ', eff: { chian: 10, ember: -6, kachu: -4 },
      res: [{ who: CHO, bg: 'nanao_minato', text: '承りました。……能登の者は、能登の者の顔を先に見ます' }, { who: OK, bg: 'nanao', text: '前田の家中が、少し面白くない顔をしております' }] },
  ] },
  p3_nanaonoshu: { text: '城で、国をどう持つ', choices: [
    { id: 'kuchi', label: '海の口・道の口・人の口を押さえる。城で国を持つ', note: '小説の利家', eff: { chian: 8, ember: -8, dev: 0.04 },
      res: [{ who: MU, bg: 'nanao', text: 'では、城を持つのではなく' }, { who: T, bg: 'nanao', text: '城で国を持つ' }, { who: MU, bg: 'nanao', text: 'ようやく、城を城として見なくなられましたな' }, { who: T, bg: 'nanao', text: '嫌な言い方だな' }] },
    { id: 'minato', label: '港を開いて商いを呼ぶ', note: '国が潤う。人の出入りで火種も混じる', eff: { gold: 300, dev: 0.08, ember: 4 },
      res: [{ who: 'noto_kokujin', bg: 'nanao_minato', text: '船が増えますな。……船は、物も噂も運びます' }] },
    { id: 'shiro', label: '城を固め、国人を城へ呼びつける', note: '前田のやり方で押す', eff: { chian: 12, ember: 4, dev: -0.04 },
      res: [{ who: CHO, bg: 'nanao_minato', text: '……承りました' }, { bg: 'nanao_minato', text: '国人たちは来た。来て、頭を下げ、何も言わずに帰った。' }] },
  ] },
  p3_uozu: { text: '倒れた馬をどうする', choices: [
    { id: 'tsukaitsubusu', label: '下げて休ませ、替えを出す。使い潰す気で出すな', note: '小説の利家。後ろも一緒に見る', eff: { kachu: 4, rel: { sassa_narimasa: 4 } },
      res: [{ who: T, bg: 'uozu', text: '下げろ。水をやれ。替えを出す。だが、使い潰す気で出すな' }, { who: NA, bg: 'uozu', text: '犬千代。お前、変わったな。昔なら、もっと先に前を見た' }, { who: T, bg: 'uozu', text: '前は見てる。だが後ろも一緒に見てる。悪いか' }] },
    { id: 'kaero', label: '替えろ。攻めを止めるな', note: '攻めは速いが、家中が擦り減る', eff: { merit: 6, kachu: -4 },
      res: [{ who: T, bg: 'uozu', text: '替えろ。止まるな' }, { bg: 'uozu', text: '攻めは止まらなかった。倒れた馬は、そのままにされた。' }] },
  ] },
  p3_erabu: { text: '秀吉と勝家の文に、どう返す', choices: [
    { id: 'matsu', label: 'どちらにも返事をしない。まずまつと話す', note: '小説の利家。決める前に、家を見る', eff: { kachu: 4 },
      res: [{ who: MA, bg: 'arako_night', text: 'どちらの文も、当然こちら、と書いてございましょう' }, { who: T, bg: 'arako_night', text: '見たのか' }, { who: MA, bg: 'arako_night', text: 'お顔に書いてございます' }] },
    { id: 'katsuie', label: '勝家へ「北は一つ」と返す', note: '親父殿に寄る', eff: { rel: { shibata_katsuie: 8 } },
      res: [{ who: KA, bg: 'kitanosho', text: '……前田。お前の文、確かに受け取った' }] },
    { id: 'hideyoshi', label: '秀吉へ和睦を勧める文を送る', note: '二人のあいだに立とうとする', eff: { rel: { kinoshita_tokichiro: 8, shibata_katsuie: -2 } },
      res: [{ who: HI, bg: 'nanao', text: '（文）又左の申すこと、もっともなり。なれど、天下の事は一人の情にて動かず' }] },
  ] },
  p3_shizu: { text: '前田の家の行く先を決める', choices: [
    { id: 'hiku', label: '陣を退く。前田の家を残す', note: '小説の利家。親父殿を「切る」', eff: {}, next: '@shizu_hiku', res: [] },
    { id: 'tomo', label: '勝家とともに立つ', note: 'もう一つの残り火。物語はここで閉じる', eff: {}, next: '@shizu_tomo', res: [] },
  ] },
};
Object.assign(NODES, N3);
