// 前田利家 ― 残り火 第四部「根を張る」（小説『残り火』第九章）
// 賤ヶ岳のあと（1583）→ 加賀へ → 百万石の骨 → 成政来る（1584）→ 末森籠城 → 豪雨 → さらさら越え → 富山の役（1585）→ 守山城 → 根を張る
import type { Beat } from './story_toshiie';
import { NODES, type Node } from './story_toshiie2';

const T = 'maeda_toshiie', OK = 'okumura', MU = 'murai', NA = 'sassa_narimasa', HI = 'kinoshita_tokichiro', MA = 'matsu_wife', CHO = 'cho_tsuratatsu', TH = 'toshihisa_old', TM = 'maeda_toshimasu', TN = 'maeda_toshinaga', YA = 'okumura_yasu', KD = 'kaga_dogo';

export const P4_ATO: Beat[] = [
  { kind: 'chapter', head: '第九章', text: '根を張る', sub: '残り火　第四部' },
  { kind: 'door', head: '賤ヶ岳のあと', text: '賤ヶ岳のあと', sub: '天正十一年' },
  { head: '七尾城', bg: 'nanao', text: '朝、利家は早くに目が覚めた。眠った気はあまりしなかった。家中は静かだった。勝っても、軽く喜ぶような戦ではなかったことを、皆が分かっている。' },
  { who: T, bg: 'nanao', text: '静かだな' },
  { who: MU, bg: 'nanao', text: '皆、よく分かっておられるのでございましょう' },
  { who: T, bg: 'nanao', text: '……勝家様は' },
  { bg: 'nanao', text: '誰も答えなかった。北ノ庄の城が燃えた、という報せは、もう届いていた。' },
  { who: OK, bg: 'nanao', text: '秀吉公より使いが参っております。呼びにございます' },
  { who: T, bg: 'nanao', text: '早えな。……礼か' },
  { who: OK, bg: 'nanao', text: 'それもございましょう' },
  { who: MU, bg: 'nanao', text: '……利家様が、勝った側の顔をなさっておらぬので' },
  { who: T, bg: 'nanao', text: 'する必要があるか' },
  { who: HI, bg: 'nanao', text: '又左。よく来てくれた。……苦しかったな' },
  { who: T, bg: 'nanao', text: '楽なはずがねえ' },
  { who: HI, bg: 'nanao', text: '又左、これからが面倒だぞ' },
  { who: T, bg: 'nanao', text: '分かってる。だが、楽になるとは思ってねえ' },
  { who: HI, bg: 'nanao', text: 'それでいい' },
];
export const P4_KAGA: Beat[] = [
  { kind: 'door', head: '加賀へ', text: '加賀へ', sub: '天正十一年 金沢' },
  { head: '金沢', bg: 'kanazawa', text: '国は、広ければそれでよいというものではなかった。利家は加賀へ入って、まずそれを思った。加賀二郡。金沢。かつて一向一揆が百年持った国である。' },
  { who: T, bg: 'kanazawa', text: '嫌な国だな。広いだけならまだいい。こっちは、土の下に何か残ってる' },
  { who: TH, bg: 'kanazawa', text: '残っているだろうな。終わった、では済まぬものは土地に残る' },
  { head: '加賀の田', bg: 'kaga_ta', text: '田に出ている者たちは、頭を下げた。下げたが、従っている顔ではない。武辺が一人入ってきて、「今日から自分の国だ」と言っても、土は聞いていない。' },
  { who: T, bg: 'kaga_ta', text: '昔、門徒だったか' },
  { who: KD, bg: 'kaga_ta', text: '昔も今も、土を耕しております' },
  { who: OK, bg: 'kaga_ta', text: '利家様。あまり深くお聞きにならぬ方がよろしゅうございます' },
  { who: MA, bg: 'kanazawa', text: '能登とは違いますね。能登は、風のある国でした。加賀は、風の前に人の息があります' },
  { who: T, bg: 'kanazawa', text: '土が深えな' },
  { who: TH, bg: 'kanazawa', text: '犬千代、能登は流れを見る国だ。加賀は、人の溜まる国だ。どちらも前田の国になる。だが、同じ顔では持てぬだろうな' },
  { bg: 'kanazawa', text: '（加賀・能登の大名となった（金沢城）。治める城は金沢と七尾。どちらの城下でも「国を治める」ができる）' },
];
export const P4_HONE: Beat[] = [
  { kind: 'door', head: '百万石の骨', text: '百万石の骨', sub: '天正十一年 冬' },
  { head: '金沢', bg: 'kanazawa', text: '広い、というだけでは、国は持てない。利家はその頃、日に何度もそう思っていた。' },
  { who: T, bg: 'kanazawa', text: '能登と加賀、どっちも別々に見てたら駄目だな' },
  { who: TH, bg: 'kanazawa', text: 'やっとそこまで来たか' },
  { who: T, bg: 'kanazawa', text: 'お前は本当に嫌な兄だ' },
  { who: TH, bg: 'kanazawa', text: '昔からだ' },
  { who: OK, bg: 'kanazawa', text: '能登はこぼれやすうございます' },
  { who: T, bg: 'kanazawa', text: '加賀は、抱え込んだまま、下で腐る。……骨が要る。広い肉がぶら下がってても、骨が弱けりゃ崩れる' },
  { who: MU, bg: 'kanazawa', text: '城、道、倉、人にございますな' },
  { who: T, bg: 'kanazawa', text: 'それだ' },
  { who: TM, bg: 'kanazawa', text: 'そればっかりだな、又左殿。……で、俺はどこへ吹けばいい' },
  { who: T, bg: 'kanazawa', text: '淀んだところだ' },
  { who: TM, bg: 'kanazawa', text: 'それなら得意だ' },
  { who: OK, bg: 'kanazawa', text: '倉が足りぬ、は、国が足りぬに近うございますな。城と道と倉が一つでございませぬと', ask: 'p4_hone' },
];
export const P4_NARIMASA: Beat[] = [
  { kind: 'door', head: '成政来る', text: '成政来る', sub: '天正十二年 夏' },
  { head: '金沢', bg: 'kanazawa', text: '大きい戦は、遠くで鳴っていても、やがて足元へ来る。小牧・長久手で、秀吉と家康が向き合っている。その名は遠い。だが遠いからといって、北陸がその外に置かれるわけではない。' },
  { bg: 'kanazawa', text: '越中の佐々成政が、羽柴に背いた。家康に付いた。' },
  { who: T, bg: 'kanazawa', text: '来るなら、あそこだな' },
  { who: TH, bg: 'kanazawa', text: '誰がだ' },
  { who: T, bg: 'kanazawa', text: '成政だ' },
  { who: OK, bg: 'kanazawa', text: '末森へは、兵を増しておかれますか。……成政殿は、末森そのものを欲しがるのでなく、前田を裂きに来るのでございましょう' },
  { who: CHO, bg: 'kanazawa', text: '喉でございましょう。首を断つ前に、喉を絞めるのが定石にございます' },
  { who: T, bg: 'kanazawa', text: '城を落とされるってより、繋いだものを切られる感じだ。成政もそれが分かってる。……同じ地図を見てきたからだ', ask: 'p4_narimasa' },
];
export const P4_SUEMORI: Beat[] = [
  { kind: 'door', head: '末森籠城', text: '末森籠城', sub: '天正十二年 九月' },
  { head: '末森城', bg: 'suemori', text: '城は、小さいから落ちるのではない。持たせる者が折れた時に落ちる。末森では、奥村永福がまだ折れていなかった。' },
  { who: OK, bg: 'suemori', text: '利家様が嫌がるところを、よう知っておる。……佐々殿だ' },
  { bg: 'suemori', text: '末森城は大きくない。人の足りなさも、矢の少なさも、持ち場の狭さも、全部がすぐ顔へ出る。' },
  { who: OK, bg: 'suemori', text: '二の丸を捨てる時は捨てる。だが、捨てるのと崩れるのは違う。崩れるな' },
  { bg: 'suemori', text: '成政の軍が来た。旗。そして止まぬ圧。矢が厚くなる。' },
  { who: OK, bg: 'suemori', text: '二の丸を厚くしろ。本丸はまだ動かすな' },
  { bg: 'suemori', text: '永福の妻、安は城中を歩いた。火のそばで粥を絶やさせず、水を運ばせ、怪我人を見て回った。' },
  { who: 'kerai', bg: 'suemori', text: '……落ちますか' },
  { who: YA, bg: 'suemori', text: '落ちるかどうかは、いま決まっておりませぬ' },
  { bg: 'suemori', text: '二の丸が焼けた。本丸へ引いた。だが崩して引いたのではない。' },
  { who: OK, bg: 'suemori', text: '本丸で持つ。……聞け。利家様は来る。だから、お前たちは持て。来るまで持て' },
];
export const P4_GOUU: Beat[] = [
  { kind: 'door', head: '豪雨', text: '豪雨', sub: '天正十二年 九月 金沢' },
  { head: '金沢', bg: 'kanazawa', text: '末森の報は、短かった。二の丸危うし。夜道は悪い。雨も強い。だが、末森を見捨てれば終わる。' },
  { who: T, bg: 'kanazawa', text: '末森か。……永福は' },
  { who: MU, bg: 'kanazawa', text: '持っております。……持たせておられます' },
  { who: CHO, bg: 'kanazawa', text: 'お待ちくだされ。成政の狙いがあまりに見えすぎております。罠の疑いもございます' },
  { who: 'kerai', bg: 'kanazawa', text: '兵をさらに集めてからでも。この雨では、夜道は危ううございます' },
  { bg: 'kanazawa', text: '一つ一つ、全部その通りだった。成政ならやる。', ask: 'p4_gouu1' },
];
export const P4_SARASARA: Beat[] = [
  { kind: 'door', head: 'さらさら越え', text: 'さらさら越え', sub: '天正十二年 冬' },
  { head: '金沢', bg: 'kanazawa', text: '敗れたからといって、すぐに折れる者ばかりではない。' },
  { who: T, bg: 'kanazawa', text: 'まだ立つだろうな' },
  { who: TH, bg: 'kanazawa', text: '立つだろう' },
  { who: T, bg: 'kanazawa', text: '嫌な男だ' },
  { who: TH, bg: 'kanazawa', text: 'お前も人のことは言えぬ' },
  { head: '立山', bg: 'tateyama', text: '越中の向こうでは、成政もまた末森の敗北をそのまま飲み込んではいなかった。' },
  { who: 'narimasa_yuki', bg: 'tateyama', text: '利家が来たか。……豪雨の中を。来ると思った。……行く。浜松だ' },
  { who: 'kerai', bg: 'tateyama', text: '無茶にございます。冬にございます' },
  { who: 'narimasa_yuki', bg: 'tateyama', text: 'だからだ。人が通らぬ時に通るから意味がある' },
  { bg: 'tateyama', text: '雪。崖。息の切れ方。ただ前へ進む足だけが、人を生かす。' },
  { who: 'narimasa_yuki', bg: 'tateyama', text: '……犬千代なら、行くかもしれぬな。……まだ死ぬなよ' },
  { bg: 'tateyama', text: '成政は冬の立山を越えた。浜松で家康は静かに迎え、静かに言った。' },
  { who: 'tokugawa_ieyasu', bg: 'tateyama', text: '遅い。世の動きに、だ。……もう話は変わった' },
  { bg: 'kanazawa', text: '小牧・長久手は、和睦で終わっていた。山を越えた執念も、家康への直訴も、全部が「遅い」の一言で済まされる。' },
  { who: T, bg: 'kanazawa', text: '折れねえな。成政がそこでやめる男なら、ここまで来てねえ' },
];
export const P4_TOYAMA: Beat[] = [
  { kind: 'door', head: '富山の役', text: '富山の役', sub: '天正十三年 越中' },
  { head: '富山の陣', bg: 'toyama_jin', text: '秀吉そのものが動いた。大軍だから重いのではない。大軍なのに速い。伝令の速さ、兵糧の流れ。末森のように、読み合いと胆力と地の理とで、最後まで二人の勝負になる戦ではなかった。' },
  { who: HI, bg: 'toyama_jin', text: '又左。来たか。……越中は閉じる' },
  { bg: 'toyama_jin', text: 'その一言が、利家には強く響いた。利家一人の感覚だったものが、天下の言葉になっている。' },
  { who: HI, bg: 'toyama_jin', text: '前田。お前が先へ立て。道を知っているのは、お前だ' },
  { who: T, bg: 'toyama_jin', text: '分かった' },
  { who: T, bg: 'toyama_jin', text: 'まず、外から殺す。逃げ場を消してから締める。……嫌な戦だな' },
  { who: OK, bg: 'toyama_jin', text: '崩しているというより、決まっていくからにございましょう' },
  { bg: 'toyama_jin', text: '成政は降った。剃髪し、秀吉の前に出た。', ask: 'p4_toyama' },
];
export const P4_MORIYAMA: Beat[] = [
  { kind: 'door', head: '守山城', text: '守山城', sub: '天正十三年 越中' },
  { head: '守山城', bg: 'moriyama', text: '北陸の最後の口はようやく塞がった。越中の三郡が前田の手へ入った。石高の増え方に目を丸くする者もいる。' },
  { who: T, bg: 'moriyama', text: '浮かれるな。越中が入ったからって、米俵が勝手に倉へ積まれるわけじゃねえ。……取った、では済まねえな' },
  { who: OK, bg: 'moriyama', text: 'はい' },
  { who: T, bg: 'moriyama', text: '済ませたら腐る。……守山だな' },
  { who: TM, bg: 'moriyama', text: '利長か' },
  { who: T, bg: 'moriyama', text: '利長だ。……まだ早えと思うか' },
  { who: TM, bg: 'moriyama', text: '早いから置く。遅いと、お前の影の下でしか立てぬ', ask: 'p4_moriyama' },
];
export const P4_NE: Beat[] = [
  { kind: 'door', head: '根を張る', text: '根を張る', sub: '天正十四年' },
  { head: '金沢', bg: 'kanazawa', text: '勝って得た土地が、そのまま自分の国になるわけではない。能登、加賀、越中。言葉に並べれば三つだ。だが三つの国がただ横に並んでいるのではない。海の理がある。土の理がある。口の理がある。' },
  { bg: 'kanazawa', text: '北陸の戦は、一段閉じた。末森で守り、富山で閉じ、守山で置いた。静かだが、軽くはない。' },
  { who: T, bg: 'kanazawa', text: '静かだな' },
  { who: OK, bg: 'kanazawa', text: 'いまは三つにございます' },
  { who: T, bg: 'kanazawa', text: 'まだ軋んでいる。だが、折れてはいない' },
  { who: MA, bg: 'kanazawa', text: '広がった、のでなく……居着き始めた、という感じにございます' },
  { who: T, bg: 'kanazawa', text: '嫌か' },
  { who: MA, bg: 'kanazawa', text: 'いいえ' },
  { who: T, bg: 'kanazawa', text: '楽じゃねえがな' },
];
export const P4_RYO: Beat[] = [
  { kind: 'chapter', head: '第四部　了', text: '根を張る', sub: '残り火' },
  { bg: 'kanazawa', text: '（第四部「根を張る」はここまで。第五部「残り火」（太閤の世・利益・秀頼・家康・遺言）は作成中。ここからは加賀・能登・越中の大名として、引き続き働ける）' },
];

// 末森の後詰めの締め
export const SUEMORI_END = {
  good: [
    { head: '末森の夜明け', bg: 'suemori_asa', text: '雨の向こうに末森が見えた。遠目にも、死んだ城の静けさではないと分かった。永福はまだ持っている。' },
    { who: T, bg: 'suemori_asa', text: '聞け。末森を助けるんじゃねえ。前田を繋ぎに行くんだ' },
    { bg: 'suemori_asa', text: '夜明けとともに、利家は突っ込んだ。「利家だ！」その声が、成政方を走った。「利家が来た」という事実そのものが、戦場の勘定をひっくり返した。' },
    { who: T, bg: 'suemori_asa', text: '押せ！' },
    { bg: 'suemori_asa', text: '末森は保った。間に合った、だった。永福が利家の前へ出た時、鎧は傷み、顔も泥と血で汚れていた。' },
    { who: T, bg: 'suemori_asa', text: '持ったな' },
    { who: OK, bg: 'suemori_asa', text: '利家様がお越しにならねば、落ちておりました' },
    { who: T, bg: 'suemori_asa', text: 'お前が持ったから間に合った。……よくやった' },
    { who: T, bg: 'suemori_asa', text: 'これで、ようやく前田の家は守れる家になったかもしれねえな' },
    { bg: 'suemori_asa', text: 'だが同時に、それは成政との決別でもあった。昔の同僚と、もう戻れぬところまで離れた。家を残すとはたぶん、こういう暗い勝ちを引き受けることなのだろう。' },
  ] as Beat[],
  bad: [
    { head: '末森の夜明け', bg: 'suemori_asa', text: '雨の向こうに末森が見えた。煙が上がっていた。死んだ城の静けさだった。' },
    { who: T, bg: 'suemori_asa', text: '……遅え' },
    { bg: 'suemori_asa', text: '末森は落ちた。永福は本丸を最後まで持ち、手勢を連れて囲みを破って戻った。だが前田の国の喉は、成政の手に絞められた。能登と加賀のあいだが、裂けた。' },
    { who: OK, bg: 'suemori_asa', text: '……申し訳ございませぬ' },
    { who: T, bg: 'suemori_asa', text: 'お前が謝ることじゃねえ。遅れたのは俺だ' },
  ] as Beat[],
};

const N4: Record<string, Node> = {
  p4_hone: { text: '能登と加賀を、一つの骨でどう持つ', choices: [
    { id: 'hone', label: '城と道と倉を一つにつなぐ。前田の顔と長殿の顔を使い分ける', note: '小説の利家', eff: { chian: 8, ember: -8, kachu: 4 },
      res: [{ who: T, bg: 'kanazawa', text: '前田の顔で通るところもある。長殿の顔じゃねえと通らねえところもある。利益は淀んだところへ吹かせる。兄者は骨だ' }, { who: TH, bg: 'kanazawa', text: '骨は黙っているから言っている' }] },
    { id: 'kaga', label: '加賀を先に締める。門徒の残り火を断つ', note: '加賀は早く静まるが、能登がこぼれる', eff: { chian: 14, ember: -14, dev: -0.06 },
      res: [{ who: KD, bg: 'kaga_ta', text: '……承りました' }, { bg: 'kaga_ta', text: '加賀の土は黙った。黙ったまま、少し痩せた。' }] },
    { id: 'kura', label: '倉を建て、道を直す。銭を使って骨を作る', note: '金を使う。国は太るが時がかかる', eff: { gold: -600, dev: 0.08, chian: 4 },
      res: [{ who: OK, bg: 'kanazawa', text: '承知。……倉が建てば、国の足りなさが見えるようになりましょう' }] },
  ] },
  p4_narimasa: { text: '末森へ兵をどれほど増すか', choices: [
    { id: 'tekido', label: '増す。だが、増しすぎるな', note: '小説の利家。奥村永福を入れ、七尾と金沢も空にしない', eff: { pt: 2 },
      res: [{ who: T, bg: 'kanazawa', text: '末森へは兵を増す。だが、増しすぎるな。七尾も金沢も空にはできねえ。……永福を入れる' }, { who: OK, bg: 'kanazawa', text: '承知いたしました' }] },
    { id: 'ooku', label: '大きく増す。末森を固めきる', note: '末森は固くなるが、ほかが薄くなる', eff: { pt: 1, ember: 6 },
      res: [{ who: CHO, bg: 'kanazawa', text: '……七尾の口が、少し寂しうございますな' }] },
    { id: 'sono', label: 'そのままにする。成政が来るとは限らない', note: '情か、油断か', eff: { pt: 0, rel: { sassa_narimasa: 4 } },
      res: [{ who: TH, bg: 'kanazawa', text: '犬千代。……来ぬと思いたいのは分かる' }] },
  ] },
  p4_gouu1: { text: '雨の中、すぐに出るか', tag: 'suemori', choices: [
    { id: 'deru', label: '「末森を見捨てるなら、能登も加賀も見捨てるのと同じだ」すぐ出る', note: '小説の利家。まつが「では、急ぎなさいませ」と言う', eff: { pt: 2, rel: { sassa_narimasa: -4 } }, next: 'p4_gouu2',
      res: [{ who: T, bg: 'kanazawa', text: '聞け。罠かもしれぬ。兵を整えろという理も、夜を待てという理も分かる。だが、末森が落ちたら、それで終わりだ。末森を見捨てるなら、能登も加賀も見捨てるのと同じだ' }, { who: T, bg: 'kanazawa', text: '一人でも行く' }, { who: MA, bg: 'kanazawa', text: 'では、急ぎなさいませ' }, { who: TM, bg: 'kanazawa', text: 'やっと又左殿らしい顔になったな' }, { who: T, bg: 'kanazawa', text: 'うるせえ' }] },
    { id: 'totonoeru', label: '兵をさらに集めてから出る', note: '確かだが、遅れる', eff: { pt: 1 }, next: 'p4_gouu2',
      res: [{ who: CHO, bg: 'kanazawa', text: '賢明にございます' }, { bg: 'kanazawa', text: '兵は集まった。半日が過ぎた。雨はやまなかった。' }] },
    { id: 'yoru', label: '夜を待ち、雨が弱まってから出る', note: '道は安全だが、末森が持つか', eff: { pt: 0 }, next: 'p4_gouu2',
      res: [{ bg: 'kanazawa', text: '雨は弱まらなかった。夜が明けた。利家はようやく馬を出した。' }] },
  ] },
  p4_gouu2: { text: '何を連れて行く', tag: 'suemori', choices: [
    { id: 'okiba', label: '七尾も金沢も空にしない。置き場を決めて、速く行ける者だけで行く', note: '「お前一人で勝つな。家で勝て」', eff: { pt: 2, kachu: 4 }, next: 'p4_gouu3',
      res: [{ who: TH, bg: 'gouu', text: '犬千代。焦るな、とは言わぬ。……だが、お前一人で勝つな。家で勝て' }, { who: T, bg: 'gouu', text: '分かってる' }, { who: TH, bg: 'gouu', text: 'ならいい' }, { head: '豪雨の夜道', bg: 'gouu', text: '蓑を着ても意味があるのか分からぬ雨だった。速い道というより、まだ死にきっていない道だった。' }, { who: TM, bg: 'gouu', text: '又左殿。死ぬ気だな' }, { who: T, bg: 'gouu', text: 'そう見えるか' }, { who: TM, bg: 'gouu', text: '見える。昔みてえだ' }, { who: T, bg: 'gouu', text: '昔ほど軽くねえ' }] },
    { id: 'zengun', label: '全軍で行く', note: '数は多いが、足は遅く、城が空く', eff: { pt: 1, ember: 8 }, next: 'p4_gouu3',
      res: [{ head: '豪雨の夜道', bg: 'gouu', text: '長い列が雨の道に伸びた。速さは出なかった。' }] },
  ] },
  p4_gouu3: { text: '末森が見えた。成政の陣は城を囲んでいる', tag: 'suemori', choices: [
    { id: 'tsukkomu', label: '夜明けとともに、成政の陣へ真っ向から突っ込む', note: '「利家が来た」と戦場に刻む', eff: { pt: 2, merit: 10 }, next: '@suemori',
      res: [] },
    { id: 'yoko', label: '成政の陣の横を突く', note: '確かだが、勢いは出ない', eff: { pt: 1 }, next: '@suemori',
      res: [{ bg: 'suemori_asa', text: '前田の兵は成政の陣の脇へ回り込んだ。' }] },
    { id: 'shiro', label: '城へ入って、永福と合わせて持つ', note: '城は助かるが、成政は崩れない', eff: { pt: 0 }, next: '@suemori',
      res: [{ bg: 'suemori_asa', text: '前田の兵は囲みの薄いところから城へ入った。' }] },
  ] },
  p4_toyama: { text: '降った成政を、秀吉の前でどう扱う', choices: [
    { id: 'kuchizoe', label: '命だけは、と口添えする', note: '昔の友を切れない', eff: { rel: { sassa_narimasa: 10, kinoshita_tokichiro: -2 } },
      res: [{ who: T, bg: 'toyama_jin', text: '……命だけは、取らずにおいてくれ' }, { who: HI, bg: 'toyama_jin', text: '又左がそう言うと思った。……取らぬ。もとより取る気はない' }, { who: NA, bg: 'toyama_jin', text: '……余計なことを' }, { who: T, bg: 'toyama_jin', text: 'お前に言われたくねえ' }] },
    { id: 'damaru', label: '何も言わない', note: '決めるのは秀吉だ', eff: {},
      res: [{ bg: 'toyama_jin', text: '利家は何も言わなかった。秀吉は成政の命を取らなかった。成政は利家の方を一度も見なかった。' }] },
    { id: 'genbatsu', label: '二度と背かぬよう、厳しい処分を求める', note: '前田の国のために', eff: { rel: { sassa_narimasa: -10, kinoshita_tokichiro: 4 } },
      res: [{ who: HI, bg: 'toyama_jin', text: '又左が言うか。……分かった。越中は取り上げる' }, { bg: 'toyama_jin', text: '成政の目が、一度だけ利家を見た。' }] },
  ] },
  p4_moriyama: { text: '守山城に誰を置く', choices: [
    { id: 'toshinaga', label: '利長を置く。「失敗してこい」', note: '小説の利家。家を試す', eff: { kachu: 6, chian: -4 },
      res: [{ who: T, bg: 'moriyama', text: '利長。守れ。だが守るだけじゃ駄目だ。持たせろ' }, { who: TN, bg: 'moriyama', text: '……はい' }, { who: T, bg: 'moriyama', text: '失敗してこい。失敗しねえ奴は、国なんか持てねえ' }, { who: TM, bg: 'moriyama', text: '物騒な話だ' }, { who: T, bg: 'moriyama', text: '物騒な話だ。……だが、置かなきゃ育たねえ' }] },
    { id: 'jibun', label: '自分で持つ', note: '確かだが、家は育たない', eff: { chian: 8, kachu: -2 },
      res: [{ who: TH, bg: 'moriyama', text: '犬千代。……お前の影の下でしか、利長は立てなくなるぞ' }] },
    { id: 'kosan', label: '利長を置き、古参を付ける', note: '奥村か村井を添える', eff: { kachu: 3, chian: 2 },
      res: [{ who: MU, bg: 'moriyama', text: '承りました。……若殿の陰で、口は出しませぬ' }, { who: T, bg: 'moriyama', text: '出せ。出しすぎるな' }] },
  ] },
};
Object.assign(NODES, N4);
