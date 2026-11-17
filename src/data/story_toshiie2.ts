// 前田利家 ― 残り火 第二部「北へ立つ」（小説『残り火』第四章「家を取る」〜第六章「北へ立つ」）
// 家督のあと（1569）→ 金ヶ崎・姉川（1570）→ 柴田の下（第五章は短い場面に縮める）→ 越前府中の城主（1575〜1576）
// 場面（Beat）の ask は、その場で選ばせる問い（NODES の鍵）。選んだ答えの res を続けて見せ、eff を家・城・縁に効かせる
import type { Beat, Choice } from './story_toshiie';

// 選択の効き目: 前田家（荒子衆・蔵・家中・村の疲れ）、府中の城（治安・残り火・開発の増減の割合）、主君の覚え・功績・金・人の縁、戦の点、府中の三つの道の重み
export interface Eff {
  shu?: number; kura?: number; kachu?: number; mura?: number;
  chian?: number; ember?: number; dev?: number;
  favor?: number; merit?: number; gold?: number; rel?: Record<string, number>;
  pt?: number; road?: 'hard' | 'son' | 'mochi';
}
export interface NChoice extends Choice { res: Beat[]; eff?: Eff; next?: string }
export interface Node { text: string; choices: NChoice[] }

const T = 'maeda_toshiie', OK = 'okumura', MU = 'murai', NA = 'sassa_narimasa', FU = 'fuwa_mitsuharu', KA = 'shibata_katsuie', HI = 'kinoshita_tokichiro';

// ───────── 第四章　家を取る ─────────
export const P2_KAZE: Beat[] = [
  { kind: 'chapter', head: '第四章', text: '家を取る', sub: '残り火　第二部' },
  { kind: 'door', head: '家の外の風', text: '家の外の風', sub: '永禄十二年 荒子' },
  { head: '荒子の屋敷', bg: 'zashiki_arako', text: '家を継いだからといって、世の中が待ってくれるわけではなかった。荒子の朝は早い。まだ空の色が決まりきらぬうちから、人は動く。' },
  { bg: 'zashiki_arako', text: '座敷へ入る。帳面が置いてある。利久の字がまだ残っている。村ごとの上がり。馬の数。使える者、口の軽い者、遅いが確かな者。去年の水。今年の作付。' },
  { bg: 'zashiki_arako', text: '小さな家の、小さなことばかりだ。だがその小さなことの集まりが、そのまま前田の家だった。' },
  { who: T, bg: 'zashiki_arako', text: '（……兄上なら、ここは残すな）' },
  { bg: 'zashiki_arako', text: '清洲からの文は短い。だが内容は昔と違った。美濃の名が出る。京の人足の話が混じる。将軍家筋という言葉が、さらりと入る。' },
  { who: T, bg: 'zashiki_arako', text: '面倒くせえな。……殿の世界は、もうそこまで行ってんのか' },
  { who: OK, bg: 'zashiki_arako', text: '前から行っておいでです' },
  { bg: 'zashiki_arako', text: '奥村永福だった。年嵩の男で、顔色も声もいつも平らだ。利久の代から家を見てきた男らしく、言葉に余分がない。' },
  { who: T, bg: 'zashiki_arako', text: '京だの将軍家だの、荒子の帳面にまで落ちてくるとはな' },
  { who: OK, bg: 'zashiki_arako', text: '落ちて参ります' },
  { who: T, bg: 'zashiki_arako', text: '面倒だ' },
  { who: OK, bg: 'zashiki_arako', text: '面倒にございます' },
  { bg: 'zashiki_arako', text: '利家はそこで少し笑った。奥村はたいていのことを言い換えぬ。そこは嫌いではない。' },
  { who: T, bg: 'zashiki_arako', text: 'お前、昔からそんな顔で全部受けてきたのか' },
  { who: OK, bg: 'zashiki_arako', text: '全部は受けておりませぬ' },
  { who: T, bg: 'zashiki_arako', text: '残りは兄上か' },
  { who: OK, bg: 'zashiki_arako', text: 'はい' },
  { bg: 'zashiki_arako', text: '部屋の外から、土の匂いのする男が入ってきた。村井長頼。奥村が家の帳面の中にいるなら、村井はその帳面の外で動く足の側にいる。' },
  { who: MU, bg: 'zashiki_arako', text: '近頃は名の飛び方が違いますな。昔は、誰が斬った、どこを取った、誰が殿のそばへ行った、で済みました' },
  { who: T, bg: 'zashiki_arako', text: 'そりゃ俺の好きな話だな' },
  { who: MU, bg: 'zashiki_arako', text: '今もお好きでしょう。……今は、それだけでは済みませぬ' },
  { who: OK, bg: 'zashiki_arako', text: '家の帳面へ落ちてくる話の質が変われば、家の持ち方も変わります' },
  { who: T, bg: 'zashiki_arako', text: '前のままじゃ足りねえ。……まずは家だ。京も将軍も、分からねえもんは後でいい。だが、分からねえままでも殿の文は来る' },
  { who: T, bg: 'zashiki_arako', text: '厩を見る。そのあと村だ。水争いがまだ尾を引いてるって話もあったな。今日のうちに切る。明日に回すと、明日はまた別の風が吹く' },
  { bg: 'zashiki_arako', text: '前のように、同じ風が何日も吹いてくれる時代ではない。小さな前田家もまた、それに耐える速さを持たねばならぬ。' },
  { bg: 'zashiki_arako', text: '（ここから「前田家」の切り盛りが加わる。荒子衆・蔵・家中・村の疲れ。月に一度、城下の「家中の進言」で奥村・村井の話を聞いて決める）' },
  { kind: 'time', text: '殿の世界は、広がっていく', sub: '世の中は、信長包囲網へ向かう形に合わせ直される' },
  { bg: 'zashiki_arako', text: '（第二部の始まりにあたり、世の中を「信長包囲網」へ向かう織田家の形に合わせ直す。暦は永禄十二年のまま。利家と前田家はそのまま引き継ぐ）' },
];

export const P2_TOKICHIRO: Beat[] = [
  { kind: 'door', head: '藤吉郎の道', text: '藤吉郎の道', sub: '永禄十二年 岐阜' },
  { head: '城の庭', bg: 'kiyosu_niwa', text: '木下藤吉郎は、前からよく動く男だった。小さい。よく喋る。よく笑う。だが近頃は違う。自分だけ先へ抜けるのでなく、詰まった流れそのものへ手を入れる男になっていた。' },
  { bg: 'kiyosu_niwa', text: '人が来る。人が詰まる。人が困った顔をする。そのたびに、どこからともなく藤吉郎が現れる。二言三言、口を挟む。すると、止まっていたものが動き出す。' },
  { who: T, bg: 'kiyosu_niwa', text: '……何だ、あいつ' },
  { who: MU, bg: 'kiyosu_niwa', text: '猿にございます' },
  { who: T, bg: 'kiyosu_niwa', text: 'それは知ってる' },
  { who: MU, bg: 'kiyosu_niwa', text: '前より重うございます' },
  { who: T, bg: 'kiyosu_niwa', text: '藤吉郎' },
  { who: HI, bg: 'kiyosu_niwa', text: 'おお、前田様' },
  { who: T, bg: 'kiyosu_niwa', text: 'その呼び方、腹が立つな' },
  { who: HI, bg: 'kiyosu_niwa', text: 'では利家様' },
  { who: T, bg: 'kiyosu_niwa', text: 'もっと腹が立つ' },
  { who: HI, bg: 'kiyosu_niwa', text: '難儀なお方にございます' },
  { who: T, bg: 'kiyosu_niwa', text: 'お前が言うな' },
  { who: HI, bg: 'kiyosu_niwa', text: '又左殿は、最初から持っておいでです。……人が、最初から話を聞く顔にございます' },
  { who: T, bg: 'kiyosu_niwa', text: 'そんな顔あるか' },
  { who: HI, bg: 'kiyosu_niwa', text: 'ございます' },
  { bg: 'kiyosu_niwa', text: '利家はとうとう笑った。藤吉郎も笑う。だが、その笑いの奥に少しだけ違う色が混じっていた。' },
  { head: '前田の屋敷', bg: 'arako_night', text: '夕刻、まつのいる方へ顔を出すと、ねねが来ていた。目のよく動く女だった。こちらが何を言うかより、何を言わずにいるかを見ている。' },
  { who: 'nene', bg: 'arako_night', text: 'うちの人は、利家様と話して戻ると、少し肩が下がっております。普段は、誰と会うても少し身を固くして参りますので' },
  { who: 'matsu_wife', bg: 'arako_night', text: '利家様は、あまり人を分けませぬから' },
  { who: 'nene', bg: 'arako_night', text: '怖い方には柔らかく、偉い方にはへりくだり、油断ならぬ方には余計に笑う。うちの人は、それで生きております' },
  { who: 'matsu_wife', bg: 'arako_night', text: '利家様には無理でございましょう' },
  { who: T, bg: 'arako_night', text: 'やりたくねえよ' },
  { who: 'nene', bg: 'arako_night', text: 'ですので、利家様は珍しいのでございます。うちの人が、考える前に笑うことがある' },
];

// 金ヶ崎: 越前への道で三河衆とぶつかり、浅井の離反で「退き口」。前田の列を崩さずに戻れるか（三つの選択の点で決まる）
export const P2_KANEGASAKI: Beat[] = [
  { kind: 'time', text: '月日は流れ――', sub: '元亀元年 四月' },
  { kind: 'door', head: '金ヶ崎', text: '金ヶ崎', sub: '元亀元年 越前' },
  { head: '越前への道', bg: 'kita_michi', text: '越前へ入る道は、まだ前向きな顔をしていた。春の土は柔らかい。前田の家から出してきた兵も馬も、まだ家の匂いを残したまま、しかしもう戦の列になっていた。' },
  { bg: 'kita_michi', text: '三河の兵は、尾張の兵と歩き方が少し違った。声が低く、列が崩れにくい。道が狭くなったところで、荒子衆と三河衆の先がぶつかった。' },
  { who: T, bg: 'kita_michi', text: 'そっちが寄れ' },
  { who: 'tokugawa_ieyasu', bg: 'kita_michi', text: '下がれ' },
  { bg: 'kita_michi', text: '若い家康だった。顔は若いが、目だけが年を取っている。一息ぶん、互いに相手の押し方を量るような間があった。' },
  { who: 'tokugawa_ieyasu', bg: 'kita_michi', text: '道を割れ' },
  { who: T, bg: 'kita_michi', text: '話が早え' },
  { bg: 'kita_michi', text: 'その日の昼過ぎまでは、何事もなかった。だから一報が入った時、最初は言葉の形だけが耳に残った。浅井。離反。すぐそばで誰かが「退き口」と言った。その一言が、春の空気を変えた。' },
  { bg: 'kanegasaki', head: '金ヶ崎の退き口', text: 'さっきまで前へ出ればよかった戦が、今は前へ出ること自体が死になりうる。敵の数より、退路の有無が重くなる。' },
  { who: MU, bg: 'kanegasaki', text: '家中は、ざわついております' },
  { who: T, bg: 'kanegasaki', text: 'ざわついてていい。崩れるな' },
  { who: OK, bg: 'kanegasaki', text: '利家様。荷をどうなさいます' },
  { bg: 'kanegasaki', text: '退く時は、どこで引くか、だけではない。何を捨てるかだ。全部を持っては戻れぬ。だが捨て方を誤れば、戻ってから家が死ぬ。', ask: 'kg1' },
];
export const P2_FUDAI: Beat[] = [
  { kind: 'door', head: '荒子の譜代', text: '荒子の譜代', sub: '元亀元年 荒子' },
  { head: '荒子の屋敷', bg: 'zashiki_arako', text: '清洲を離れて荒子へ戻ると、空気の重さが違った。小さい。声が少ない。少ないぶん、腹の内が残る。金ヶ崎から戻った家中は、低い声で動いていた。' },
  { bg: 'zashiki_arako', text: '兵糧の戻り。使えぬ馬。村境の水争いの尾。家中の顔。一つずつ読んでいては間に合わぬ。今すぐ走れる馬、傷みの浅い米、遅いが確かな者を見る。' },
  { who: OK, bg: 'zashiki_arako', text: '何が詰まっているか、と仰せなら' },
  { who: T, bg: 'zashiki_arako', text: '言え' },
  { who: OK, bg: 'zashiki_arako', text: '全部にございます' },
  { who: T, bg: 'zashiki_arako', text: '便利な言い方だな' },
  { who: OK, bg: 'zashiki_arako', text: '便利ではございませぬ' },
  { who: T, bg: 'zashiki_arako', text: '……一つずつ切る。馬、運び、水番。今日のうちに' },
];
export const P2_SHUPPEI: Beat[] = [
  { kind: 'door', head: '出兵', text: '出兵', sub: '元亀元年 六月' },
  { head: '荒子の屋敷', bg: 'zashiki_arako', text: '報せは、家の中へ落ちる時に初めて本当の重さを持つ。清洲からの使者は短かった。兵。馬。兵糧。備えを急げ。浅井を討つ。' },
  { who: T, bg: 'zashiki_arako', text: '奥村。倉を開ける' },
  { bg: 'zashiki_arako', text: '奥村永福は一瞬だけ目を上げた。反対はしない。ただ、その一言の先にどれほどの傷みが出るかを、もう頭の中で測り始めている。' },
  { who: T, bg: 'zashiki_arako', text: '村井。人を見ろ。脚の遅いのは今のうちに外せ。無理に数だけ揃えても荷物になる' },
  { head: '前田の倉', bg: 'zashiki_arako', text: '倉へ行く。土間の匂い。俵の積み方。蔵役の顔には、もう不安が見えている。開ければ減る。減れば、次に困る。' },
  { who: 'kurayaku', bg: 'zashiki_arako', text: '出せるのは、このくらいかと' },
  { who: T, bg: 'zashiki_arako', text: '全部じゃねえ。今出して、なお秋まで持つ線を言え' },
  { bg: 'zashiki_arako', text: '帳面が並ぶ。村ごとの上がり。戻りの薄いところ。去年の傷み。今年の見込み。どこから兵糧と人を出すか。', ask: 'shuppei' },
];
export const P2_ANEGAWA: Beat[] = [
  { kind: 'door', head: '姉川', text: '姉川', sub: '元亀元年 近江' },
  { head: '姉川', bg: 'anegawa', text: '朝の水は、遠くからでも気配を持っていた。姉川へ向かう兵の列は静かだった。金ヶ崎の前とは違う。正面からぶつかると知っていて、なお余計な声を出さぬ静けさだった。' },
  { bg: 'anegawa', text: '信長がいる。家康がいる。浅井と朝倉が向こうにいる。前田のような小さな家一つの働きでどうこうなる場ではない。だが小さいからといって、消えてよい場でもない。' },
  { who: MU, bg: 'anegawa', text: '前の列、少し詰めます' },
  { who: T, bg: 'anegawa', text: '詰めろ。間を空けるな' },
  { who: OK, bg: 'anegawa', text: '馬、二つ替えました' },
  { who: T, bg: 'anegawa', text: 'それでいい' },
  { bg: 'anegawa', text: '最初の圧は、音で来た。人の声。馬のいななき。鉄の触れる音。そのあとで、流れが来る。今度は持ったまま押し返さねばならぬ。利家は槍を取った。その先に、家がついている。', ask: 'ag1' },
];

// ───────── 第五章　伸びる家（短い場面に縮める） ─────────
export const P2_NOBIRU: Beat[] = [
  { kind: 'chapter', head: '第五章', text: '伸びる家', sub: '残り火　第二部' },
  { kind: 'door', head: '柴田の下', text: '柴田の下', sub: '元亀二年' },
  { head: '前田の屋敷', bg: 'zashiki_arako', text: '姉川のあと、勝った家ほど次の用が落ちてきた。柴田勝家の名は、文に混じる時から重かった。信長の文は鋭い。秀吉の方から来る話は、ぬるりとしている。勝家の筋から来る文は違った。重い。一つ一つが太い。' },
  { who: T, bg: 'zashiki_arako', text: '分かりやすい。いいだろ。こういうのは' },
  { who: OK, bg: 'zashiki_arako', text: '勝家様は重い。利家様も重い。細工より持たせる方でございます' },
  { who: KA, bg: 'hiroma', text: '前田。持てるか' },
  { who: T, bg: 'hiroma', text: '持たせます' },
  { who: NA, bg: 'hiroma', text: '又左。妙に顔が楽だな。あの方の下は、お前には合う' },
  { who: T, bg: 'hiroma', text: 'お前にもな' },
  { who: NA, bg: 'hiroma', text: '俺は元からだ' },
  { kind: 'door', head: '北の入口', text: '北の入口', sub: '元亀二年' },
  { bg: 'kita_michi', text: '北の地名が、少しずつ帳面に入ってくるようになった。越前。加賀。門徒。人が足りぬ。馬が足りぬ。北まで家が持たぬ、と奥村は言った。' },
  { who: OK, bg: 'zashiki_arako', text: '何が足りぬ、と仰せなら' },
  { who: T, bg: 'zashiki_arako', text: '全部、か' },
  { who: OK, bg: 'zashiki_arako', text: '全部にございます' },
];
export const P2_CHIGAU: Beat[] = [
  { kind: 'door', head: '違う先', text: '違う先', sub: '元亀三年' },
  { head: '城の庭', bg: 'kiyosu_niwa', text: '木下藤吉郎は、相変わらず小さかった。それなのに、今の藤吉郎は昔よりはるかに大きく見えた。重いのである。あいつを待つ者がいる。あいつの口を待つ者がいる。' },
  { who: T, bg: 'kiyosu_niwa', text: '藤吉郎。お前、前より遠くなったな' },
  { who: HI, bg: 'kiyosu_niwa', text: '遠う見えますか。それはまあ、利家様が前より大きくなられたからにございましょう' },
  { who: T, bg: 'kiyosu_niwa', text: 'そういう逃げ方をするな。……お前は、何を見て走ってる' },
  { who: HI, bg: 'kiyosu_niwa', text: '人にございます。誰がいま要るか。誰を先に怒らせてはならぬか。誰が止まると、あとが詰まるか' },
  { who: T, bg: 'kiyosu_niwa', text: '面倒くせえな' },
  { who: HI, bg: 'kiyosu_niwa', text: 'ええ、面倒にございます。……利家様は、何を見ておいでです' },
  { who: T, bg: 'kiyosu_niwa', text: '家だ' },
  { who: HI, bg: 'kiyosu_niwa', text: 'ようございましたな。それを持てるお方で' },
];
export const P2_TENJO: Beat[] = [
  { kind: 'door', head: '天井の下', text: '天井の下', sub: '元亀三年 十月' },
  { head: '殿中', bg: 'denchu', text: '信長の世界は、いまがいちばん高いのではないか。利家は近頃、ときどきそう思う。広い。深い。どこまでも届く。尾張の頃のように、誰が一番先に目立つかを競う庭ではもうない。' },
  { bg: 'denchu', text: '勝家も、秀吉も、家康も、光秀も、一つの殿の下にいる。しかも、それがまだ動いている。出来上がって止まっているのではない。' },
  { who: T, bg: 'denchu', text: '広いな' },
  { who: MU, bg: 'denchu', text: '広うございます' },
  { who: T, bg: 'denchu', text: '前より、もっとな' },
  { bg: 'denchu', text: 'ただ、その「今」がいつまで同じ形で続くのかは、少し分からなくなっていた。甲斐の武田が西へ動く。将軍が文を回す。浅井・朝倉・本願寺。殿の天井の下で、四方の火が一つに寄ろうとしていた。' },
  { bg: 'denchu', text: '（物語の次の場面は天正三年（1575年）秋、越前府中。それまでは柴田の下で、主命と陣で働く。「月日を送る」で跳ぶこともできる）' },
];

// ───────── 第六章　北へ立つ（府中三人衆） ─────────
export const P2_FUCHU: Beat[] = [
  { kind: 'chapter', head: '第六章', text: '北へ立つ', sub: '残り火　第二部' },
  { kind: 'door', head: '府中へ', text: '府中へ', sub: '天正三年 越前' },
  { head: '越前への道', bg: 'kita_michi', text: '越前へ入った時、利家はまず空の低さを感じた。まだ雪ではない。だが、雪になる前の空気がもう地の上へ沈んでいる。' },
  { who: MU, bg: 'kita_michi', text: '静かにございますな' },
  { who: T, bg: 'kita_michi', text: '静かな土地ほど面倒だ' },
  { bg: 'kita_michi', text: '朝倉が滅んだ。一揆も踏まれた。織田が取った。そう言ってしまえばそれまでである。だが土地は、城一つ落ちたくらいでは顔を変えない。取った。だが、まだ手に入ってはいない。' },
  { head: '越前府中', bg: 'fuchu', text: '府中の方へ着くと、人と物の流れが少し太くなった。その中心に、柴田勝家がいた。あの男は座っているだけで場の骨になる。' },
  { who: KA, bg: 'fuchu', text: '前田。持ち場は分かっておろうな' },
  { who: T, bg: 'fuchu', text: '承知しております' },
  { who: KA, bg: 'fuchu', text: '火を残すな。侮らせるな。従わせろ' },
  { bg: 'fuchu', text: '府中三人衆。佐々成政、不破光治、そして前田利家。並べて呼べば一つに見える。' },
  { who: NA, bg: 'fuchu', text: '又左。静かだな' },
  { who: T, bg: 'fuchu', text: 'お前もそう思うか' },
  { who: NA, bg: 'fuchu', text: '黙っている土地は面倒だ' },
  { who: T, bg: 'fuchu', text: '同じことを考えてた' },
  { who: FU, bg: 'fuchu', text: 'まずは、道と倉を見ませぬと。春を越せぬ支配は役に立ちませぬ' },
  { who: NA, bg: 'fuchu', text: 'お前は相変わらず勘定から入るな。春の前に舐められて終わる方が先だ' },
  { bg: 'fuchu', text: '（府中の城主となった。城下で「府中を治める」ができる。治安・残り火・村の開発を見ながら、春まで府中を持たせる。残り火が燃え上がり、城兵が足りなければ城を奪われる）' },
];
export const P2_MISESHIME: Beat[] = [
  { kind: 'door', head: '見せしめ', text: '見せしめ', sub: '天正三年 府中' },
  { head: '府中の評定', bg: 'hyojo', text: '最初の火は、小さいうちに踏み消さねばならぬ。火種の報せは、夜のうちに二つ、三つと重なって来た。門徒と通じた疑いのある者。朝倉残党へ米を流したらしい村役。夜更けに村外れの納屋へ出入りした家の者。' },
  { bg: 'hyojo', text: 'どれも確かとまでは言い切れぬ。だが、確かになるのを待っていては遅い。新しい支配の最初の刃をどこへ入れるか。' },
  { who: NA, bg: 'hyojo', text: '一つで済ませる' },
  { who: FU, bg: 'hyojo', text: '一つで足りるのであれば' },
  { who: NA, bg: 'hyojo', text: '足りさせる。……又左、どう見る' },
  { who: NA, bg: 'hyojo', text: '村ごと締めてもよい。だが、まず見せるのが先だ', ask: 'miseshime' },
];
export const P2_NIGERU: Beat[] = [
  { kind: 'door', head: '逃げる村', text: '逃げる村', sub: '天正三年 冬の初め' },
  { head: '府中', bg: 'kieta_mura', text: '見せしめの刃は、たしかに通った。少なくとも、表ではそう見えた。村は静かになった。だが、落ち着くのと戻るのとは違う。' },
  { who: OK, bg: 'kieta_mura', text: '戻りが鈍うございます' },
  { who: MU, bg: 'kieta_mura', text: '人が減っております。……死んではおりませぬ。おりませぬが、消えております' },
  { who: T, bg: 'kieta_mura', text: '逃げたか' },
  { who: OK, bg: 'kieta_mura', text: '逃げたのでございましょう。あるいは隠したのでございましょう' },
  { who: NA, bg: 'hyojo', text: '見せたあとで逃げるのは、従っていない証だ。締め直す。見せしめが足りぬなら、もう一段入れる' },
  { who: FU, bg: 'hyojo', text: '逃げた者の数にもよります。百姓が十逃げるのと、百逃げるのとでは、締め直しの重さが違います' },
  { who: NA, bg: 'hyojo', text: '数の話ではない' },
  { who: FU, bg: 'hyojo', text: '数の話でもございます' },
  { who: NA, bg: 'hyojo', text: '又左。現地を見るまでもない。ここで甘く見せれば、もう終わる', ask: 'nigeru' },
];
export const P2_FUYU: Beat[] = [
  { kind: 'door', head: '冬の前', text: '冬の前', sub: '天正三年 十二月' },
  { head: '府中', bg: 'fuyu_echizen', text: '雪はまだ来ていない。それなのに越前では、雪の前からもう冬が始まっているように見えた。人の声が少なくなり、戸の開け閉めの音さえ小さくなる。' },
  { who: T, bg: 'fuyu_echizen', text: '何が足りねえ' },
  { who: OK, bg: 'fuyu_echizen', text: '全部にございます。村が痩せたぶん、全部が少しずつ足りませぬ' },
  { who: MU, bg: 'fuyu_echizen', text: '見てまいりました。冬を越せぬ村が出ます' },
  { who: NA, bg: 'hyojo', text: '村の泣き言に構うな。冬前だからこそ、ここで緩めるな。火を抱えた村が苦しむのは自業自得だ' },
  { who: FU, bg: 'hyojo', text: '全部は持ちませぬ。全部切れば、春がなくなります。今年取るか、来年戻すか。その線を引き直さねばなりませぬ' },
  { who: NA, bg: 'hyojo', text: 'お前はいつも勘定だな' },
  { who: FU, bg: 'hyojo', text: '国は勘定でもございます' },
  { who: NA, bg: 'hyojo', text: '又左。お前はどっちだ' },
  { who: T, bg: 'hyojo', text: '村を見た。薪が足りねえ。飼葉も薄い。人足も抜けてる。あのまま締めりゃ、春に田へ出る手が残らねえ', ask: 'fuyu' },
];
export const P2_SANNIN: Beat[] = [
  { kind: 'door', head: '黙る土', text: '黙る土', sub: '天正四年 春の前' },
  { head: '越前の村', bg: 'kieta_mura', text: '冬は越えた。だからといって、土地がすぐこちらへ寄ってくるわけではない。越前の村々は、少し息をついたあとで、ますます深く黙った。' },
  { who: T, bg: 'kieta_mura', text: '冬を越せるか' },
  { who: 'muraosa', bg: 'kieta_mura', text: '……何とか' },
  { who: T, bg: 'kieta_mura', text: '何とか、か' },
  { who: 'muraosa', bg: 'kieta_mura', text: '何とかにございます' },
  { who: T, bg: 'kieta_mura', text: '門徒はまだいるな' },
  { who: 'muraosa', bg: 'kieta_mura', text: '何も申せませぬ' },
  { who: T, bg: 'kieta_mura', text: '申さねえんじゃなく、申せねえんだろ' },
  { kind: 'door', head: '三人の理', text: '三人の理', sub: '天正四年 府中' },
  { head: '府中の評定', bg: 'hyojo', text: '同じ土地を見ていても、見ているものが同じとは限らない。府中三人衆。並べて呼べば一つに見える。だが、はっきり形になったのは、この頃からだった。' },
  { who: NA, bg: 'hyojo', text: '村ごと締める。逃げた者を戻させ、隠した火を吐かせる。黙っているなら、黙っていられぬようにする' },
  { who: FU, bg: 'hyojo', text: '村ごとでは、春の戻りが鈍ります。春に取れる村は残し、切るべき家だけを切る。その線で足りるなら、それが一番安うございます' },
  { who: NA, bg: 'hyojo', text: 'お前はいつも損得だな' },
  { who: FU, bg: 'hyojo', text: '国は損得でもございます' },
  { who: NA, bg: 'hyojo', text: '又左。お前はどうだ' },
  { who: T, bg: 'hyojo', text: '締めるだけじゃ足りねえ。火は断つ。だが村を丸ごと死なせりゃ、春がねえ' },
  { who: NA, bg: 'hyojo', text: '生かせば従うのか' },
  { who: T, bg: 'hyojo', text: '従わねえかもしれねえ。だが死なせりゃ、もっと従わねえ' },
  { who: FU, bg: 'hyojo', text: '成政殿は秩序を見ておられる。私は勘定を見ております。利家殿は――持ちを見ておられる', ask: 'sannin' },
];
export const P2_NOKORIBI: Beat[] = [
  { kind: 'door', head: '残り火', text: '残り火', sub: '天正四年 府中' },
  { head: '府中', bg: 'fuyu_echizen', text: '火は、消えたように見える時がいちばん厄介だ。燃え上がっている火なら分かる。煙も上がる。人も騒ぐ。だが、消えたように見える火は、土の下で道を作る。' },
  { who: OK, bg: 'zashiki_arako', text: '米が流れております。蔵の減り方と、道の踏まれ方にございます。帳面も少し合いませぬ' },
  { who: T, bg: 'zashiki_arako', text: '朝倉か' },
  { who: OK, bg: 'zashiki_arako', text: 'その匂いもございます。……門徒は、消えておりませぬ' },
  { who: MU, bg: 'kieta_mura', text: '村がつながっております。一つの村ではございませぬ。道筋で三つ、四つ' },
  { who: NA, bg: 'hyojo', text: 'なら、まとめて締める' },
  { who: T, bg: 'hyojo', text: '待て' },
  { who: NA, bg: 'hyojo', text: 'また見るのか。見て、何が変わる' },
  { who: T, bg: 'hyojo', text: '変わる。火の形がだ' },
  { who: MU, bg: 'kieta_mura', text: '利家様。ここ、焼けば楽でございます。……思いますが、それで終わる顔でもございませぬ' },
  { who: OK, bg: 'hyojo', text: '外の圧が増してまいりました。北でございます。上杉が' },
  { who: T, bg: 'hyojo', text: '余計に焼けねえな', ask: 'nokoribi' },
];
export const P2_MOTASERU: Beat[] = [
  { kind: 'door', head: '持たせる', text: '持たせる', sub: '天正四年 初夏' },
  { head: '府中の評定', bg: 'hyojo', text: '国は、城を落としただけでは手に入らない。利家はこの頃、ようやくその当たり前を骨で知り始めていた。' },
];
// 府中を持たせた（第二部の締め）
export const P2_RYO: Beat[] = [
  { bg: 'fuchu', text: '越前はまだ終わっていない。門徒の火も、朝倉の影も、謙信の圧も残っている。だが、この土地で覚えたのは、前へ出ることとは別の持ち方だった。' },
  { who: T, bg: 'fuchu', text: '前へ出るだけじゃ足りねえな' },
  { bg: 'fuchu', text: '自分は甘くなったのではない。斬るべきものと、残すべきものを分ける男になり始めたのだ。家を持つ。その先に、土地を持たせる。その重さが、越前でようやく利家の骨の一部になり始めていた。' },
  { kind: 'chapter', head: '第二部　了', text: '北へ立つ', sub: '残り火' },
  { bg: 'fuchu', text: '（第二部「北へ立つ」はここまで。第三部「裂け目」（七尾・手取川・能登・本能寺・賤ヶ岳）は作成中。ここからは府中の城主として、引き続き働ける）' },
];
// 持たせられなかった（もう一度）
export const P2_RETRY: Beat[] = [
  { who: KA, bg: 'fuchu', text: '前田。府中の火は、まだ消えておらぬな' },
  { who: T, bg: 'fuchu', text: '……は' },
  { who: KA, bg: 'fuchu', text: '持たせよ。次の秋までだ。それまでに府中が持たぬなら、お前の持ち場は他の者に預ける' },
  { bg: 'fuchu', text: '（府中の治安と残り火を立て直す。治安が五十を超え、残り火が三十を下回れば、勝家の前に出られる。期限は天正四年の秋）' },
];

// 期限までに持たせられなかった
export const P2_SAI_NG: Beat[] = [
  { kind: 'door', head: '持たせる', text: '持たせる', sub: '天正四年 秋' },
  { who: KA, bg: 'fuchu', text: '前田。府中は、わしが締め直す' },
  { who: T, bg: 'fuchu', text: '……は' },
  { who: KA, bg: 'fuchu', text: '火を残すなと言うた。だが、お前の見たものが間違うておったとは言わぬ。……次は、持たせよ' },
  { bg: 'fuchu', text: '勝家の兵が村に入った。煙が上がった。利家はそれを、城の上から黙って見ていた。国は、城を落としただけでは手に入らない。そして、持たせられなかった土地は、他人の手で焼かれる。' },
  { kind: 'chapter', head: '第二部　了', text: '北へ立つ', sub: '残り火' },
  { bg: 'fuchu', text: '（第二部「北へ立つ」はここまで。第三部「裂け目」は作成中。ここからは府中の城主として、引き続き働ける）' },
];

// ───────── 選ばせる問い ─────────
export const NODES: Record<string, Node> = {
  // 金ヶ崎（三つの選択の点で、崩れずに戻れたかが決まる）
  kg1: { text: '荷をどう捨てる', choices: [
    { id: 'all', label: '重いものは全部捨てる', note: '身軽になって早く退く', eff: { pt: 1, kura: -150 }, next: 'kg2',
      res: [{ who: OK, bg: 'kanegasaki', text: '承知。……戻ってから、倉が寂しうございましょうな' }, { who: T, bg: 'kanegasaki', text: '生きて戻りゃ、倉はまた埋まる' }] },
    { id: 'pick', label: '重いのは切る。兵糧は全部捨てるな', note: '小説の利家。戻ってからの家を考える', eff: { pt: 2, kura: -60 }, next: 'kg2',
      res: [{ who: T, bg: 'kanegasaki', text: '重いのは切る。ただし、兵糧を全部捨てるな。戻ってから何も残らねえ。馬は脚の弱いのから外せ。人を乗せるより荷を持たせろ。人は歩かせる' }, { who: OK, bg: 'kanegasaki', text: '……承知' }] },
    { id: 'keep', label: '何も捨てない', note: '家の財を守る。足は遅くなる', eff: { pt: 0 }, next: 'kg2',
      res: [{ who: MU, bg: 'kanegasaki', text: '利家様、それでは列が伸びます！' }, { who: T, bg: 'kanegasaki', text: '……分かってる。急がせろ' }] },
  ] },
  kg2: { text: '人の順をどうする', choices: [
    { id: 'mid', label: '崩れそうなのを真ん中へ。前と後ろに持つ奴を置く', note: '声の届くところにまとめる', eff: { pt: 2 }, next: 'kg3',
      res: [{ who: T, bg: 'kanegasaki', text: '崩れそうなのを真ん中へ寄せろ。前にも後ろにも、持つ奴を置く。声の届くところにまとめろ' }, { who: MU, bg: 'kanegasaki', text: '承知' }, { bg: 'kanegasaki', text: 'ここで利家は、ふと成政のことを思った。黒というのは、こういう時の色だ。前へ出る華ではなく、崩れぬ流れの色である。' }] },
    { id: 'self', label: '自分がしんがりに立つ', note: '槍の又左として後ろを守る。家の列は奥村と村井に任せる', eff: { pt: 1, merit: 8 }, next: 'kg3',
      res: [{ who: T, bg: 'kanegasaki', text: '後ろは俺が持つ。列はお前らが回せ' }, { who: OK, bg: 'kanegasaki', text: '……当主が後ろで死なれては、列が回っても家が回りませぬ' }, { who: T, bg: 'kanegasaki', text: '死なねえよ' }] },
    { id: 'fast', label: '速い者から先に退かせる', note: '一人でも多く早く抜ける', eff: { pt: 0, kachu: -6 }, next: 'kg3',
      res: [{ bg: 'kanegasaki', text: '速い者が先へ抜ける。遅い者が後ろへ残る。列は伸び、声が届かなくなる。' }] },
  ] },
  kg3: { text: '列が乱れた。若い者が馬を乱し、誰かが荷を落とした', choices: [
    { id: 'naka', label: '崩れかけた列の真ん中へ馬を入れる', note: '「止まれ！」散るな、という声', eff: { pt: 2, kachu: 4 }, next: '@kanegasaki',
      res: [{ bg: 'kanegasaki', text: '利家は馬を出していた。前へではない。横へ。崩れかけた列の真ん中へ。' }, { who: T, bg: 'kanegasaki', text: '止まれ！　荷は捨てるな、捨てる順で捨てろ！　前に出るな、列を崩すな！' }, { bg: 'kanegasaki', text: '赤母衣が、ここでは初めて別の意味を持った気がした。人に見せる華ではなく、ここにいればまだ流れが切れぬと思わせるための色。' }] },
    { id: 'shikaru', label: '乱した者を叱りつける', note: '見せしめで列を締める', eff: { pt: 1, kachu: -4 }, next: '@kanegasaki',
      res: [{ who: T, bg: 'kanegasaki', text: '貴様！　列を乱すなら置いていくぞ！' }, { bg: 'kanegasaki', text: '若い者の顔が凍る。列は静かになった。だが、静かになっただけだった。' }] },
    { id: 'kamawazu', label: '構わず退く', note: '止まれば全部が死ぬ', eff: { pt: 0, shu: -40 }, next: '@kanegasaki',
      res: [{ bg: 'kanegasaki', text: '止まれば全部が死ぬ。利家は前を向いた。後ろで何人かが列から落ちた気配があった。' }] },
  ] },
  // 出兵（姉川の前）: どこから兵糧と人を出すか
  shuppei: { text: 'どこから出す', choices: [
    { id: 'wake', label: '一村に寄せず、傷みの浅い村から少しずつ', note: '小説の利家。遅いが村が持つ', eff: { kura: -120, mura: 4, kachu: -3, road: 'mochi' },
      res: [{ who: T, bg: 'zashiki_arako', text: 'ここは残す。こっちは取る。今傷んでも、戻しが利く。戻しが利かねえところを削ると、後で死ぬ' }, { who: OK, bg: 'zashiki_arako', text: '一村に負担を寄せぬおつもりですな' }, { who: T, bg: 'zashiki_arako', text: '当たり前だ。一つに寄せりゃ、その時は早い。だが次で動かなくなる' }, { who: MU, bg: 'zashiki_arako', text: '……家中の顔がようございませぬ。削るのが早すぎる、との顔にございます' }, { who: T, bg: 'zashiki_arako', text: '嫌な顔してても動く奴は要る。分かった顔して何もしねえ奴はいらねえ' }] },
    { id: 'yoseru', label: '上がりの多い村から一度に取る', note: '早い。だがその村は痩せる', eff: { kura: -60, shu: 40, mura: 16, road: 'hard' },
      res: [{ who: 'kurayaku', bg: 'zashiki_arako', text: '……では、あの村から' }, { bg: 'zashiki_arako', text: '支度は早く済んだ。だが、その村の年寄りが門の外でずっと頭を下げていた。' }, { who: OK, bg: 'zashiki_arako', text: '次で、あの村は動きませぬ' }] },
    { id: 'kura', label: '家の蔵と自分の金でまかなう', note: '村は触らない。家の蓄えが減る', eff: { kura: -260, gold: -150, kachu: 4, road: 'son' },
      res: [{ who: OK, bg: 'zashiki_arako', text: '倉が、ほとんど空になります' }, { who: T, bg: 'zashiki_arako', text: '村が空になるよりいい' }, { who: OK, bg: 'zashiki_arako', text: '……左様にございます' }] },
  ] },
  // 姉川（二つの選択の点）
  ag1: { text: 'ぶつかり合いの最初の波で、前田の列が揺れた', choices: [
    { id: 'mejirushi', label: '崩れそうなところへ、自分が目印になって入る', note: '深追いしない。崩れそうな箇所へだけ立つ', eff: { pt: 2 }, next: 'ag2',
      res: [{ who: T, bg: 'anegawa', text: '持て！' }, { bg: 'anegawa', text: '赤母衣が戦の中で立つ。あれは飾りではない。ここに利家がいると見えること自体が、いまは力になる。深追いしない。崩れそうな箇所へだけ立つ。押し返す。声を通す。' }] },
    { id: 'tsukkomu', label: '槍を振るって敵の中へ斬り込む', note: '槍の又左。名は上がる', eff: { pt: 1, merit: 10 }, next: 'ag2',
      res: [{ bg: 'anegawa', text: '一つ、二つ。鋭く速い。若い頃と同じ槍が、敵の列を割る。だが振り返ると、前田の列が遠かった。' }] },
    { id: 'mamoru', label: '列を下げて固める', note: '崩れないが、押し返せない', eff: { pt: 1 }, next: 'ag2',
      res: [{ bg: 'anegawa', text: '前田の列は崩れなかった。だが、押し返す流れの中で、少しだけ後ろにいた。' }] },
  ] },
  ag2: { text: '戦の中ほど。向こうの圧が強い。若い兵の脚が止まりかける', choices: [
    { id: 'koe', label: '前へ出て顔を見せ、「前田の列だ、崩すな！」', note: '小説の利家', eff: { pt: 2, kachu: 6 }, next: '@anegawa',
      res: [{ who: T, bg: 'anegawa', text: '前田の列だ、崩すな！' }, { bg: 'anegawa', text: 'その声は、自分でも驚くほどよく通った。自分一人の勢いではない。前田の家そのものを背負った声になっている。兵が持ち直す。前へ出る。押し返す。' }] },
    { id: 'kawaru', label: '止まった者を後ろの者と入れ替える', note: '村井に任せて列を回す', eff: { pt: 1, kachu: 2 }, next: '@anegawa',
      res: [{ who: MU, bg: 'anegawa', text: '後ろ、前へ！　前は下がれ！' }, { bg: 'anegawa', text: '列は回った。崩れはしなかった。' }] },
    { id: 'hiku', label: '一度引いて立て直す', note: '損は少ないが、押し返す流れに遅れる', eff: { pt: 0 }, next: '@anegawa',
      res: [{ bg: 'anegawa', text: '前田の列は下がった。損は少なかった。だが押し返す流れが来た時、前田はそこにいなかった。' }] },
  ] },
  // 府中: 見せしめ
  miseshime: { text: '最初の刃をどこへ入れる', choices: [
    { id: 'hitotsu', label: '米を流した村役一人を切る', note: '「一つで済ませる」。三人の考えがそろう', eff: { chian: 15, ember: -10, dev: -0.03, road: 'mochi', rel: { sassa_narimasa: 4, fuwa_mitsuharu: 4 } },
      res: [{ who: T, bg: 'kieta_mura', text: '切るしかねえだろうな。村ごとじゃなく、村役で足りるなら、それでいい' }, { bg: 'kieta_mura', text: '村は静かだった。戸は閉ざされ、子供の泣き声さえ途中で止められたように聞こえない。' }, { who: NA, bg: 'kieta_mura', text: '火を隠せば、こうなる。誰が主か、忘れるな' }, { who: FU, bg: 'hyojo', text: '表では足りました。ですが、村の戻りまで見ねば終わりとは申せませぬ' }] },
    { id: 'muragoto', label: '疑いのある村ごと締め上げる', note: '成政の道。早く静まるが、村が痩せる', eff: { chian: 25, ember: -20, dev: -0.12, road: 'hard', rel: { sassa_narimasa: 8, fuwa_mitsuharu: -4 } },
      res: [{ who: NA, bg: 'kieta_mura', text: 'それでいい。半端な刃は、かえって火を呼ぶ' }, { bg: 'kieta_mura', text: '村ごと締めた。村は黙った。黙ったまま、田に出る人の数が目に見えて減った。' }, { who: FU, bg: 'hyojo', text: '……春の戻りは、だいぶ鈍りましょうな' }] },
    { id: 'saguru', label: 'まだ切らない。確かになるまで探る', note: '不破の慎重さ。村は痩せないが、火も残る', eff: { chian: 4, ember: 6, road: 'son', rel: { sassa_narimasa: -8, fuwa_mitsuharu: 2 }, favor: -4 },
      res: [{ who: NA, bg: 'hyojo', text: '待てば待つほど、侮られる' }, { who: T, bg: 'hyojo', text: '侮らせはしねえ。だが、間違えて切るのも御免だ' }, { who: NA, bg: 'hyojo', text: '……勝家様には、俺から言っておく。火を残すな、と言われたはずだぞ' }] },
  ] },
  nigeru: { text: '人が消えた村をどうする', choices: [
    { id: 'miru', label: '自分で村を見に行く', note: '「見てからだ」。小説の利家', eff: { ember: -6, chian: 2, road: 'mochi' },
      res: [{ who: T, bg: 'kieta_mura', text: '見るさ。村が死にかけてるかもしれねえ' }, { who: NA, bg: 'hyojo', text: '見て甘くなるなよ' }, { who: T, bg: 'hyojo', text: '甘くはならねえ' }, { head: '越前の村', bg: 'kieta_mura', text: '村は、静かすぎた。年寄りと子供だけが残り、働き手の中ほどが抜けている。' }, { who: 'muraosa', bg: 'kieta_mura', text: '冬が近うございます。食うものが足りませぬ。人足も馬も取られ、見せしめで村は怯え、若い者は……' }, { who: T, bg: 'kieta_mura', text: '若い者は何だ' }, { who: 'muraosa', bg: 'kieta_mura', text: '…………' }] },
    { id: 'shimenaosu', label: '締め直す。逃げた者の家を罰する', note: '成政の道', eff: { chian: 10, ember: -4, dev: -0.08, road: 'hard', rel: { sassa_narimasa: 4 } },
      res: [{ who: NA, bg: 'hyojo', text: 'それでいい' }, { bg: 'kieta_mura', text: '逃げた者の家に札が立った。残った者は、さらに口を閉ざした。' }] },
    { id: 'yurusu', label: '戻れば咎めないと触れを出す', note: '不破の道。戻りは早いが、侮られる', eff: { chian: -4, ember: 4, dev: 0.04, road: 'son', rel: { sassa_narimasa: -6, fuwa_mitsuharu: 4 } },
      res: [{ who: FU, bg: 'hyojo', text: '戻る者が戻れば、春に田へ出る手が残ります' }, { who: NA, bg: 'hyojo', text: '逃げれば許される、と覚えさせるだけだ' }, { bg: 'kieta_mura', text: '何人かは戻った。戻った者の目は、こちらを見なかった。' }] },
  ] },
  fuyu: { text: '冬越しをどうする', choices: [
    { id: 'nokosu', label: '責のある者は切る。だが薪と飼葉と、春に田へ出る手は残す', note: '「冬を越させる」。小説の利家', eff: { chian: 4, ember: -8, dev: 0.04, kura: -80, road: 'mochi', rel: { fuwa_mitsuharu: 4 } },
      res: [{ who: T, bg: 'hyojo', text: '火は断つ。だが村ごと死なせりゃ意味がねえ。今年だけ楽になる切り方はしねえ。火は断つ。だが村は春へ残す' }, { who: NA, bg: 'hyojo', text: '又左、お前は甘くなったか' }, { who: T, bg: 'hyojo', text: '甘くしてるんじゃねえ。持たせるんだ' }, { who: OK, bg: 'hyojo', text: 'ようやく線が立ちましたな' }, { who: T, bg: 'hyojo', text: '気に入らねえ言い方だな' }, { who: OK, bg: 'hyojo', text: 'しかし、その通りにございます' }] },
    { id: 'shimeru', label: '年貢は緩めない。ここで緩めれば見せしめの意味が薄れる', note: '成政の道', eff: { chian: 6, ember: -4, dev: -0.12, gold: 120, road: 'hard', rel: { sassa_narimasa: 6, fuwa_mitsuharu: -4 } },
      res: [{ who: NA, bg: 'hyojo', text: 'それでいい。火を抱えた村が苦しむのは、自業自得だ' }, { bg: 'fuyu_echizen', text: '雪が来た。煙の上がらぬ家が、少しずつ増えていった。' }] },
    { id: 'kura', label: '前田の蔵を開けて施す', note: '府中の村を救うが、荒子が痩せる', eff: { chian: 6, ember: -10, dev: 0.06, kura: -250, kachu: -4, road: 'son', rel: { fuwa_mitsuharu: 6 } },
      res: [{ who: OK, bg: 'zashiki_arako', text: '荒子の倉を、越前の村へ' }, { who: T, bg: 'zashiki_arako', text: 'ここが死にゃ、荒子もいずれ死ぬ' }, { who: OK, bg: 'zashiki_arako', text: '……家中には、私から申します' }] },
  ] },
  sannin: { text: '利家は、何を見るか', choices: [
    { id: 'mochi', label: '持ちを見る。切るべき家だけ切り、村は春へ残す', note: '利家の理', eff: { ember: -8, chian: 4, road: 'mochi', rel: { fuwa_mitsuharu: 4 } },
      res: [{ who: T, bg: 'hyojo', text: '死んだ村は戻らねえ。門徒も朝倉の影も、死んだ土の下で終わるわけじゃねえ' }, { who: NA, bg: 'hyojo', text: 'お前は、前より余計なものを見るようになったな' }, { who: T, bg: 'hyojo', text: '家を持っちまったからな' }, { who: NA, bg: 'hyojo', text: '家か' }, { who: T, bg: 'hyojo', text: '家だ' }] },
    { id: 'chitsujo', label: '秩序を見る。成政とともに村ごと締める', note: '成政の理', eff: { chian: 14, ember: -14, dev: -0.1, road: 'hard', rel: { sassa_narimasa: 8, fuwa_mitsuharu: -4 } },
      res: [{ who: NA, bg: 'hyojo', text: '誰が主か、その筋を細らせたら、北は全部が崩れる' }, { who: T, bg: 'hyojo', text: '……分かる' }, { who: FU, bg: 'hyojo', text: '……では、春の戻りは諦めましょう' }] },
    { id: 'kanjo', label: '勘定を見る。不破とともに、損の少ない線を引く', note: '不破の理', eff: { chian: -2, ember: 2, dev: 0.08, gold: 100, road: 'son', rel: { fuwa_mitsuharu: 8, sassa_narimasa: -4 } },
      res: [{ who: FU, bg: 'hyojo', text: '国は損得でもございます。損の少ない線が、いちばん長く持ちます' }, { who: NA, bg: 'hyojo', text: '火を損得で量るな' }] },
  ] },
  nokoribi: { text: '米の流れる道筋の村を、どうする', choices: [
    { id: 'wakeru', label: '家ごとに分ける。火の筋を持つ家は切り、村の納屋と厩は残す', note: '「焼かねえ。抱えねえ」。小説の利家', eff: { ember: -22, chian: 8, dev: -0.02, road: 'mochi', rel: { fuwa_mitsuharu: 4 } },
      res: [{ who: NA, bg: 'hyojo', text: '焼く。村ごと抱えているなら、村ごと切る。残せばまた繰り返すだけだ' }, { who: T, bg: 'hyojo', text: '焼かねえ' }, { who: NA, bg: 'hyojo', text: '火を抱えたままか' }, { who: T, bg: 'hyojo', text: '抱えねえ。切る。責を負う奴は切る。流した家も切る。夜道を使った筋も抑える。だが村は残す' }, { who: NA, bg: 'hyojo', text: '何故だ' }, { who: T, bg: 'hyojo', text: '春が死ぬ。村を灰にすりゃ、今日の火は消える。だが来年の田も、道も、馬も一緒に消える' }, { who: FU, bg: 'hyojo', text: '……利家殿の線でよろしいかと。勘定にございます' }, { who: NA, bg: 'hyojo', text: 'お前は、そこまで行ったか' }] },
    { id: 'yaku', label: '道筋の村を焼く', note: '成政の道。火種は断つが、土地も人も失う', eff: { ember: -60, chian: 10, dev: -0.3, favor: 4, road: 'hard', rel: { sassa_narimasa: 10, fuwa_mitsuharu: -8 } },
      res: [{ who: NA, bg: 'hyojo', text: 'それでいい' }, { bg: 'fuyu_echizen', text: '三つの村が燃えた。煙は三日のあいだ低い空を這った。火種は消えた。春に田へ出る者も、消えた。' }, { who: MU, bg: 'kieta_mura', text: '……楽には、なりましたな' }, { who: T, bg: 'kieta_mura', text: '言うな' }] },
    { id: 'kau', label: '米を買い戻し、道筋の村役を取り込む', note: '不破の道。銭で火の道を細らせる', eff: { ember: -12, chian: 2, gold: -200, road: 'son', rel: { fuwa_mitsuharu: 8, sassa_narimasa: -6 } },
      res: [{ who: FU, bg: 'hyojo', text: '銭で済むなら、銭がいちばん安うございます' }, { who: NA, bg: 'hyojo', text: '銭で買った村は、銭で売るぞ' }] },
  ] },
};

// ───────── 家中の進言（月に一度。奥村・村井の話を聞いて決める） ─────────
export interface Advice { id: string; who: string; head: string; beats: Beat[] }
export const ADVICE: Advice[] = [
  { id: 'mizu', who: MU, head: '村境の水', beats: [
    { who: MU, bg: 'zashiki_arako', text: '村境の水番が、また揉めております。上の村が先に引く、下の村が夜に開ける。去年からの尾にございます' },
    { who: OK, bg: 'zashiki_arako', text: '上の村は年寄りが多く、下の村は若い者が多うございます', ask: 'adv_mizu' }] },
  { id: 'uma', who: OK, head: '使えぬ馬', beats: [
    { who: OK, bg: 'zashiki_arako', text: '厩の馬、二頭は見た目より使えませぬ。飼葉ばかり食うております' },
    { who: MU, bg: 'zashiki_arako', text: 'ですが、手放せば家中が「前田は痩せた」と申しましょう', ask: 'adv_uma' }] },
  { id: 'kuchi', who: MU, head: '口の多い者', beats: [
    { who: MU, bg: 'zashiki_arako', text: '古い家人の一人が、利家様のやり方を陰で申しております。「先代は、もっと村を見た」と' },
    { who: OK, bg: 'zashiki_arako', text: '口は多うございますが、手は早い者にございます', ask: 'adv_kuchi' }] },
  { id: 'fushin', who: OK, head: '京の普請', beats: [
    { who: OK, bg: 'zashiki_arako', text: '清洲より、京の普請に人足を出せとの割り当てにございます' },
    { who: MU, bg: 'zashiki_arako', text: '田植えの時期と重なります。人を出せば、村の手が抜けます', ask: 'adv_fushin' }] },
  { id: 'agari', who: OK, head: '村の上がり', beats: [
    { who: OK, bg: 'zashiki_arako', text: '去年水で痩せた村の上がりを、今年は元に戻すか。帳面の上では、もう戻せる数にございます' },
    { who: MU, bg: 'zashiki_arako', text: '見てまいりました。数は戻っても、年寄りの腰は戻っておりませぬ', ask: 'adv_agari' }] },
  { id: 'okiba', who: MU, head: '人の置き場', beats: [
    { who: MU, bg: 'zashiki_arako', text: '荒子衆の頭を一人、替えたく存じます。前へ出たがる者ではなく、持つ者を' },
    { who: OK, bg: 'zashiki_arako', text: '替えれば、外された者の家が面白くございませぬ', ask: 'adv_okiba' }] },
  { id: 'wakamono', who: MU, head: '村の若者', beats: [
    { who: 'arako_wakamono', bg: 'arako', text: '前田様の荒子衆に、入れてくださりませ。村にいても、田は兄が継ぎます' },
    { who: MU, bg: 'arako', text: '村の若者にございます。腕はまだですが、脚は速い', ask: 'adv_wakamono' }] },
  { id: 'fuyu', who: OK, head: '冬の備え', beats: [
    { who: OK, bg: 'zashiki_arako', text: '冬の前に、倉の米をどれほど売って銭に替えるか。戦の多い年は、銭の方が早く役に立ちます' },
    { who: MU, bg: 'zashiki_arako', text: '米は食えますが、銭は食えませぬ', ask: 'adv_fuyu' }] },
];
const adv = (a: NChoice, b: NChoice, c?: NChoice): Node => ({ text: 'どうする', choices: c ? [a, b, c] : [a, b] });
Object.assign(NODES, {
  adv_mizu: adv(
    { id: 'kiru', label: '今日のうちに自分で出向いて裁く', note: '明日に回すと別の風が吹く', eff: { mura: -6, kachu: 2 }, res: [{ who: T, bg: 'arako', text: '上は朝、下は夕。水番は一人ずつ両方から出せ。文句があるなら俺に言え' }, { who: MU, bg: 'arako', text: '……これで、しばらくは持ちましょう' }] },
    { id: 'ue', label: '年寄りの多い上の村を立てる', note: '古い筋を守る', eff: { mura: -2, kachu: 4 }, res: [{ who: OK, bg: 'zashiki_arako', text: '先代もそうなさいました' }] },
    { id: 'shita', label: '若い者の多い下の村を立てる', note: '田の上がりを取る', eff: { mura: 2, kura: 40 }, res: [{ who: MU, bg: 'zashiki_arako', text: '上の年寄りが、黙っておりませぬぞ' }] }),
  adv_uma: adv(
    { id: 'uru', label: '売って、走れる馬を一頭買う', note: '数より脚', eff: { kura: -30, shu: 20, kachu: -2 }, res: [{ who: T, bg: 'zashiki_arako', text: '数だけの馬はいらねえ' }] },
    { id: 'nokosu', label: '荷運びに回して残す', note: '見た目を保つ', eff: { kura: -20, kachu: 2 }, res: [{ who: OK, bg: 'zashiki_arako', text: '荷を運ぶ馬も、要る時は要ります' }] }),
  adv_kuchi: adv(
    { id: 'yobu', label: '呼んで、正面から話を聞く', note: '口の多い者ほど、腹の内を言わせる', eff: { kachu: 6 }, res: [{ who: T, bg: 'zashiki_arako', text: '言いたいことがあるなら、俺の前で言え。陰で言うより早え' }, { who: MU, bg: 'zashiki_arako', text: '……あの者、帰り道で少し笑っておりました' }] },
    { id: 'hazusu', label: '役を外す', note: '家中が引き締まるが、冷える', eff: { kachu: -4, shu: -10 }, res: [{ who: OK, bg: 'zashiki_arako', text: '承知。……手の早い者が一人、減りました' }] },
    { id: 'hottoku', label: '放っておく', note: '口だけなら害はない', eff: {}, res: [{ who: OK, bg: 'zashiki_arako', text: '左様にございますか' }] }),
  adv_fushin: adv(
    { id: 'dasu', label: '割り当てどおり出す', note: '主君の覚えはよい。村の手が抜ける', eff: { mura: 10, favor: 6 }, res: [{ who: T, bg: 'zashiki_arako', text: '殿の文は来る。来たら出す' }] },
    { id: 'kane', label: '銭で人足を雇って出す', note: '村は守れる。金がかかる', eff: { gold: -120, favor: 4 }, res: [{ who: OK, bg: 'zashiki_arako', text: '銭で済むなら、それがいちばん静かにございます' }] },
    { id: 'herasu', label: '数を減らしてもらうよう願い出る', note: '村は守れる。覚えは下がる', eff: { favor: -6, mura: -4 }, res: [{ who: MU, bg: 'zashiki_arako', text: '……清洲の顔が、少し曇りましょうな' }] }),
  adv_agari: adv(
    { id: 'matsu', label: 'もう一年待つ', note: '村の腰を戻す', eff: { mura: -8, kura: -40 }, res: [{ who: T, bg: 'zashiki_arako', text: '数だけ戻しても、腰が戻らなきゃ来年また痩せる' }] },
    { id: 'modosu', label: '元に戻す', note: '帳面どおりに取る', eff: { mura: 8, kura: 80 }, res: [{ who: OK, bg: 'zashiki_arako', text: '承知。……帳面は、きれいになりました' }] }),
  adv_okiba: adv(
    { id: 'kaeru', label: '替える。持つ奴を回せ', note: '戦で崩れにくくなる', eff: { shu: 20, kachu: -3 }, res: [{ who: T, bg: 'zashiki_arako', text: '前へ出たがる奴じゃなく、持つ奴を回せ' }, { who: MU, bg: 'zashiki_arako', text: '承知' }] },
    { id: 'kaenai', label: '替えない。外された家の顔を立てる', note: '家中を保つ', eff: { kachu: 3 }, res: [{ who: OK, bg: 'zashiki_arako', text: '……それも、家にございます' }] }),
  adv_wakamono: adv(
    { id: 'ireru', label: '入れる', note: '荒子衆が増える。村の手は減る', eff: { shu: 30, mura: 3 }, res: [{ who: T, bg: 'arako', text: '脚が速いなら、まず走れ。槍はそのあとだ' }, { who: 'arako_wakamono', bg: 'arako', text: 'は、はい！' }] },
    { id: 'kaesu', label: '村へ帰す。田を守れ', note: '村が持つ', eff: { mura: -3, kachu: 1 }, res: [{ who: T, bg: 'arako', text: '兄の田を手伝え。村が痩せたら、荒子衆も痩せる' }] }),
  adv_fuyu: adv(
    { id: 'uru', label: '半分売って銭に替える', note: '金が増える。蔵は減る', eff: { kura: -150, gold: 180 }, res: [{ who: OK, bg: 'zashiki_arako', text: '承知。……冬の終わりに、少し寂しうございましょう' }] },
    { id: 'nokosu', label: '売らずに残す', note: '蔵を厚くする', eff: { kura: 20, kachu: 1 }, res: [{ who: MU, bg: 'zashiki_arako', text: '米は食えますからな' }] }),
});

// 戦の締め（点で分かれる）
export const KANEGASAKI_END = {
  good: [{ bg: 'kanegasaki', text: '前田の列は、完全には整っていない。だが崩れなかった。崩れそうになった時に、持ち直した。そのことが何より重かった。' }, { who: MU, bg: 'kanegasaki', text: '……利家様。持ちました' }, { who: T, bg: 'kanegasaki', text: 'まだだ' }, { bg: 'kanegasaki', text: '槍を振るわぬわけではない。だがそれが主ではない。今は、誰を残し、どう返し、どう家を潰さぬかの方が重い。これが当主の戦なのかと、ようやく骨で分かった。' }] as Beat[],
  bad: [{ bg: 'kanegasaki', text: '退き口は抜けた。だが前田の列は、途中で何度も切れた。荒子に戻った時、数えるまでもなく、顔が足りなかった。' }, { who: OK, bg: 'kanegasaki', text: '……戻れぬ者が、おります' }, { who: T, bg: 'kanegasaki', text: '分かってる' }] as Beat[],
};
export const ANEGAWA_END = {
  good: [{ bg: 'anegawa', text: 'やがて、押し返す流れがこちらへ出た。前田の列も持った。一度も崩れなかったわけではない。だが崩れかけて、持ち直し、役目を果たした。' }, { who: MU, bg: 'anegawa', text: '利家様。持ちました' }, { who: T, bg: 'anegawa', text: 'そうだな' }, { who: OK, bg: 'anegawa', text: '前田の列、崩れませなんだ' }, { who: T, bg: 'anegawa', text: '見りゃ分かる' }, { who: OK, bg: 'anegawa', text: '左様にございます。……これにて、家もまた一つ持ちました' }, { bg: 'anegawa', text: 'ただ勝ったのではない。ただ生き残ったのでもない。前田の家が、利家の下で戦場に立てる家になった。そこまで来て、ようやく「当主」という言葉が、自分の肩へ収まる気がした。' }] as Beat[],
  bad: [{ bg: 'anegawa', text: '織田と徳川は勝った。前田の列も生きて戻った。だが、押し返す流れの中で、前田の名を呼ぶ者はいなかった。' }, { who: OK, bg: 'anegawa', text: '……次がございます' }, { who: T, bg: 'anegawa', text: 'ああ。次だ' }] as Beat[],
};
