// 慶長五年（1600）七月、関ヶ原の前夜。徳川家康が会津の上杉景勝を討つため東へ下った隙に、石田三成が大坂で兵を挙げた。
// 諸大名はみな豊臣の下の独立した大名（家臣ではない）。東軍（徳川を盟主とする連合）と西軍（豊臣秀頼を旗頭、毛利輝元を総大将とする連合）に分かれる。
// 名簿の武将のうち moves に書いた者だけを出す（cast）。城の名はこの年のものに改める。所在はおおまかな史実に寄せる（確かさの劣るものは近い城に）。
import type { ClanDef, GeneralDef } from './roster';
import type { Scenario } from './scenarios';

const G = (id: string, name: string, clan: string, bra: number, int: number, lea: number, cha: number, loc: string, born: number): [GeneralDef, number] => [[id, name, clan, bra, int, lea, cha, loc], born];
const M = (clan: string, loc: string): [string, string] => [clan, loc];

const clans: ClanDef[] = [
  // 名を改めた家・この年の色
  { id: 'matsudaira', name: '徳川', color: '#d7a227', prestige: 90 },
  { id: 'urakami', name: '宇喜多', color: '#4a4a7a', prestige: 60 },
  { id: 'ryuzoji', name: '鍋島', color: '#6a5a3a', prestige: 45 },
  { id: 'ando', name: '秋田', color: '#5a7a8a', prestige: 35 },
  { id: 'uesugi', name: '上杉', color: '#2c5a9e', prestige: 70 },
  { id: 'oda', name: '織田', color: '#c8452c', prestige: 50 },
  { id: 'sanada', name: '真田', color: '#b83a2e', prestige: 45 },
  { id: 'hosokawa', name: '細川', color: '#3e6a5a', prestige: 50 },
  // 豊臣の家と西軍の諸将
  { id: 'toyotomi', name: '豊臣', color: '#e0b23e', prestige: 90 },
  { id: 'ishida', name: '石田', color: '#6a6aa8', prestige: 50 },
  { id: 'otani', name: '大谷', color: '#8a6a9a', prestige: 45 },
  { id: 'konishi', name: '小西', color: '#7a4a6a', prestige: 45 },
  { id: 'kobayakawa', name: '小早川', color: '#a85a3a', prestige: 50 },
  { id: 'mashita', name: '増田', color: '#8a8a6a', prestige: 40 },
  { id: 'natsuka', name: '長束', color: '#7a8a7a', prestige: 35 },
  { id: 'onogi', name: '小野木', color: '#6a5a7a', prestige: 30 },
  { id: 'koide', name: '小出', color: '#9a7a5a', prestige: 35 },
  { id: 'wakisaka', name: '脇坂', color: '#5a7a6a', prestige: 35 },
  { id: 'tachibana', name: '立花', color: '#9a4a4a', prestige: 50 },
  { id: 'kuki', name: '九鬼', color: '#3a5a7a', prestige: 40 },
  { id: 'ikoma', name: '生駒', color: '#7a6a4a', prestige: 35 },
  // 東軍の諸将
  { id: 'fukushima', name: '福島', color: '#b05a3a', prestige: 55 },
  { id: 'ikeda', name: '池田', color: '#5a8a5a', prestige: 55 },
  { id: 'tanaka', name: '田中', color: '#8a7a5a', prestige: 40 },
  { id: 'horio', name: '堀尾', color: '#6a8a7a', prestige: 40 },
  { id: 'yamauchi', name: '山内', color: '#7a7a9a', prestige: 40 },
  { id: 'nakamura', name: '中村', color: '#9a8a5a', prestige: 40 },
  { id: 'asano', name: '浅野', color: '#a86a6a', prestige: 50 },
  { id: 'kyogoku', name: '京極', color: '#5a6a9a', prestige: 45 },
  { id: 'kuroda', name: '黒田', color: '#3a3a3a', prestige: 55 },
  { id: 'kato', name: '加藤', color: '#8a3a3a', prestige: 55 },
  { id: 'kato_y', name: '加藤（嘉明）', color: '#6a4a3a', prestige: 45 },
  { id: 'todo', name: '藤堂', color: '#4a6a8a', prestige: 45 },
  { id: 'hachisuka', name: '蜂須賀', color: '#7a5a8a', prestige: 45 },
  { id: 'maeda', name: '前田', color: '#5a5a8a', prestige: 65 },
  { id: 'hori', name: '堀', color: '#6a8a9a', prestige: 45 },
  { id: 'kanamori', name: '金森', color: '#8a8a5a', prestige: 35 },
  { id: 'tomita', name: '富田', color: '#7a9a8a', prestige: 30 },
  { id: 'tsutsui', name: '筒井', color: '#6a7a9a', prestige: 35 },
  { id: 'tsugaru', name: '津軽', color: '#5a4a6a', prestige: 35 },
  // どちらにもつかない
  { id: 'kinoshita', name: '木下', color: '#a89a6a', prestige: 40 },
];

const generals: [GeneralDef, number][] = [
  // 徳川
  G('tokugawa_hidetada', '徳川秀忠', 'matsudaira', 52, 70, 60, 66, 'utsunomiya', 1579),
  G('yuki_hideyasu', '結城秀康', 'matsudaira', 78, 62, 74, 68, 'yuki', 1574),
  G('matsudaira_tadayoshi', '松平忠吉', 'matsudaira', 72, 58, 66, 64, 'oshi', 1580),
  G('okubo_tadachika', '大久保忠隣', 'matsudaira', 60, 70, 64, 62, 'odawara', 1553),
  G('naito_ienaga', '内藤家長', 'matsudaira', 70, 50, 62, 56, 'kyo', 1546),
  // 豊臣
  G('toyotomi_hideyori', '豊臣秀頼', 'toyotomi', 30, 56, 30, 72, 'ishiyama', 1593),
  G('ono_harunaga', '大野治長', 'toyotomi', 56, 60, 58, 62, 'ishiyama', 1569),
  G('hayami_morihisa', '速水守久', 'toyotomi', 66, 56, 62, 58, 'ishiyama', 1560),
  G('mori_katsunaga', '毛利勝永', 'toyotomi', 80, 62, 76, 66, 'ishiyama', 1578),
  G('koide_hidemasa', '小出秀政', 'koide', 50, 62, 54, 58, 'kishiwada', 1540),
  G('koide_yoshimasa', '小出吉政', 'koide', 54, 58, 56, 56, 'konosumiyama', 1565),
  // 西軍
  G('ishida_masazumi', '石田正澄', 'ishida', 50, 72, 56, 58, 'sawayama', 1556),
  G('gamo_satoie', '蒲生郷舎', 'ishida', 76, 60, 72, 58, 'odani', 1554),
  G('mai_hyogo', '舞兵庫', 'ishida', 74, 58, 68, 56, 'ogaki', 1560),
  G('otani_yoshiharu', '大谷吉治', 'otani', 66, 54, 60, 58, 'kanegasaki', 1580),
  G('kinoshita_yoritsugu', '木下頼継', 'otani', 64, 56, 58, 56, 'kanegasaki', 1583),
  G('toda_katsushige', '戸田勝成', 'otani', 70, 62, 66, 70, 'ichijodani', 1557),
  G('hiratsuka_tamehiro', '平塚為広', 'otani', 74, 60, 66, 62, 'ono', 1557),
  G('akashi_takenori', '明石全登', 'urakami', 76, 66, 74, 72, 'tenjinyama', 1566),
  G('mori_hidemoto', '毛利秀元', 'mori', 70, 66, 72, 64, 'katsuyama', 1579),
  G('kobayakawa_hidekane', '小早川秀包', 'mori', 70, 62, 68, 66, 'konomine', 1567),
  G('kobayakawa_hideaki', '小早川秀秋', 'kobayakawa', 50, 44, 56, 48, 'tachibana', 1582),
  G('inaba_masanari', '稲葉正成', 'kobayakawa', 66, 66, 64, 56, 'tachibana', 1571),
  G('hiraoka_yorikatsu', '平岡頼勝', 'kobayakawa', 62, 64, 60, 54, 'tachibana', 1560),
  G('chosokabe_morichika', '長宗我部盛親', 'chosokabe', 68, 54, 62, 56, 'oko', 1575),
  G('oda_hidenobu', '織田秀信', 'oda', 60, 58, 60, 66, 'inabayama', 1580),
  G('onogi_shigetsugu', '小野木重次', 'onogi', 64, 56, 62, 54, 'kuroi', 1550),
  G('nabeshima_katsushige', '鍋島勝茂', 'ryuzoji', 70, 66, 68, 62, 'muranaka', 1580),
  G('sagara_yorifusa', '相良頼房', 'sagara', 56, 64, 58, 60, 'hitoyoshi', 1574),
  G('ikoma_kazumasa', '生駒一正', 'ikoma', 62, 58, 62, 58, 'sogo', 1555),
  G('onodera_yoshimichi', '小野寺義道', 'onodera', 62, 48, 58, 46, 'yokote', 1566),
  G('satake_yoshinobu', '佐竹義宣', 'satake', 64, 66, 66, 62, 'mito', 1570),
  // 東軍
  G('tanaka_yoshimasa', '田中吉政', 'tanaka', 70, 72, 70, 66, 'okazaki', 1548),
  G('horio_tadauji', '堀尾忠氏', 'horio', 62, 62, 62, 62, 'hikuma', 1578),
  G('asano_yoshinaga', '浅野幸長', 'asano', 78, 62, 72, 66, 'tsutsujigasaki', 1576),
  G('kyogoku_takatsugu', '京極高次', 'kyogoku', 54, 64, 58, 72, 'kannonji', 1563),
  G('maeda_toshimasa', '前田利政', 'maeda', 66, 56, 60, 62, 'nanao', 1578),
  G('hori_hideharu', '堀秀治', 'hori', 64, 62, 64, 60, 'kasugayama', 1576),
  G('tomita_nobutaka', '富田信高', 'tomita', 70, 58, 62, 62, 'kameyama', 1565),
  G('tsutsui_sadatsugu', '筒井定次', 'tsutsui', 56, 56, 56, 56, 'hijiyama', 1562),
  G('akita_sanesue', '秋田実季', 'ando', 64, 66, 64, 58, 'minato', 1576),
  G('tsugaru_tamenobu', '津軽為信', 'tsugaru', 74, 80, 74, 64, 'ishikawa', 1550),
  G('iwaki_sadataka', '岩城貞隆', 'iwaki', 48, 52, 50, 56, 'odate_i', 1583),
  G('satomi_yoshiyasu', '里見義康', 'satomi', 58, 56, 58, 60, 'okamoto', 1573),
  G('arima_harunobu', '有馬晴信', 'arima', 66, 70, 64, 68, 'hinoe', 1567),
  G('kinoshita_iesada', '木下家定', 'kinoshita', 40, 56, 46, 58, 'gochaku', 1543),
];

export const S1600: Scenario = {
  id: '1600', year: 1600, month: 7, title: '慶長五年 関ヶ原',
  lede: '慶長五年七月。太閤秀吉の死から二年、五大老の筆頭徳川家康は、会津の上杉景勝を討つと号して諸大名を率い東へ下った。その隙に、佐和山の石田三成が大谷吉継と謀って兵を挙げ、毛利輝元を総大将に大坂城へ迎えた。豊臣秀頼を戴く西軍と、家康に従う東軍。天下分け目の戦いが始まる。',
  clans,
  cast: true,
  noCamp: true,
  war: 12,
  childLords: ['toyotomi_hideyori'], // 八歳の秀頼を豊臣家の当主に
  castleNames: {
    ishiyama: '大坂城', kyo: '伏見城', inabayama: '岐阜城', kurokawa: '若松城', sunpu: '駿府城', hikuma: '浜松城', tsutsujigasaki: '甲府城', fukashi: '松本城',
    komoro: '上田城', kannonji: '大津城', tenjinyama: '岡山城', tachibana: '名島城', kawaradake: '中津城', kumamoto: '熊本城', ichijodani: '北ノ庄城',
    kanegasaki: '敦賀城', kanazawa: '金沢城', muranaka: '佐賀城', myo: '岩出山城', tsutsui: '大和郡山城', koriyama: '広島城', yuzuki: '松前城',
    kurose: '板島城', shozui: '徳島城', sogo: '高松城', oko: '浦戸城', gochaku: '姫路城', kameyama: '安濃津城', hijiyama: '伊賀上野城',
    takebeyama: '田辺城', tashiro: '鳥羽城', hino: '水口城', odani: '長浜城', sakurabora: '高山城', minowa: '高崎城', uchi: '鹿児島城', edo: '江戸城',
  },
  owners: {
    // 東海・美濃
    kiyosu: 'fukushima', inuyama: 'oda', narumi: 'matsudaira', kariya: 'matsudaira', sunpu: 'nakamura', kakegawa: 'yamauchi', hikuma: 'horio',
    yoshida: 'ikeda', okazaki: 'tanaka', dabu: 'tanaka', inabayama: 'oda', ogaki: 'ishida', iwamura: 'oda', gujo: 'oda', sakurabora: 'kanamori', takahara: 'kanamori',
    // 甲信
    tsutsujigasaki: 'asano', iwadono: 'asano', fukashi: 'matsudaira', takato: 'matsudaira', kaizu: 'matsudaira', komoro: 'sanada', kisofukushima: 'matsudaira', iida: 'matsudaira',
    // 越後・北陸
    kasugayama: 'hori', sakado: 'hori', tochio: 'hori', honjo: 'hori', iiyama: 'matsudaira', toyama_c: 'maeda', matsukura: 'maeda', nanao: 'maeda', kanazawa: 'maeda',
    ichijodani: 'otani', kanegasaki: 'otani', ono: 'otani', nochiseyama: 'kyogoku',
    // 関東（徳川の二百五十万石）
    odawara: 'matsudaira', nirayama: 'matsudaira', tamanawa: 'matsudaira', edo: 'matsudaira', kawagoe: 'matsudaira', takiyama: 'matsudaira', hachigata: 'matsudaira',
    matsuyama_m: 'matsudaira', koga: 'matsudaira', motosakura: 'matsudaira', oshi: 'matsudaira', sekiyado: 'matsudaira', kururi: 'matsudaira', sanuki_k: 'matsudaira',
    otaki: 'matsudaira', okamoto: 'satomi', ota: 'satake', mito: 'satake', odajo: 'satake', yuki: 'matsudaira', utsunomiya: 'matsudaira', karasawa: 'matsudaira',
    karasuyama: 'matsudaira', minowa: 'matsudaira', umayabashi: 'matsudaira', kanayama: 'matsudaira', iwatsuki: 'matsudaira',
    // 奥羽
    yonezawa: 'uesugi', yanagawa: 'uesugi', yamagata: 'mogami', kurokawa: 'uesugi', sannohe: 'nanbu', nejo: 'nanbu', ishikawa: 'tsugaru', hiyama: 'ando', minato: 'ando',
    teraike: 'date', myo: 'date', odaka: 'soma', odate_i: 'iwaki', sukagawa: 'uesugi', miharu: 'uesugi', shirakawa: 'uesugi', koshuji: 'nanbu', yokote: 'onodera', oura: 'uesugi',
    // 近江・畿内
    odani: 'ishida', kannonji: 'kyogoku', hino: 'natsuka', sawayama: 'ishida', kyo: 'matsudaira', iimoriyama: 'toyotomi', akutagawa: 'toyotomi', shigisan: 'mashita',
    kishiwada: 'koide', yagi: 'onogi', koshimizu: 'toyotomi', shozui: 'hachisuka', sogo: 'ikoma', sumoto: 'wakisaka', ishiyama: 'toyotomi', takaya: 'toyotomi',
    hiro: null, saika: null, negoro: null, shingu: null, tsutsui: 'mashita', kuroi: 'onogi', kameyama: 'tomita', hijiyama: 'tsutsui', tashiro: 'kuki',
    kiriyama: 'tomita', okawachi: 'tomita', takebeyama: 'hosokawa',
    // 中国
    konosumiyama: 'koide', fuse: null, oshio: 'kinoshita', tatsuno: 'kinoshita', miki: 'kinoshita', gochaku: 'kinoshita', tenjinyama: 'urakami', numa: 'urakami',
    bitchu_matsuyama: 'urakami', takata: 'urakami', gassantoda: 'mori', yamabuki: 'mori', odaka_h: 'mori', koriyama: 'mori', niitakayama: 'mori', hinoyama: 'mori',
    konomine: 'mori', katsuyama: 'mori', kannabe: 'mori', masuda: 'mori',
    // 四国
    yuzuki: 'kato_y', kurose: 'todo', jizogatake: 'todo', amagiri: 'ikoma', oko: 'chosokabe', asakura_t: 'chosokabe', motoyama: 'chosokabe', aki_t: 'chosokabe', nakamura: 'chosokabe',
    // 九州
    funai: 'otomo', tachibana: 'kobayakawa', yanagawa_k: 'tachibana', kumamoto: 'kato', kawaradake: 'kuroda', muranaka: 'ryuzoji', hinoe: 'arima', hirado: 'matsura',
    sanjo: 'arima', hitoyoshi: 'sagara', iwao: 'kato', uto: 'konishi', tonokori: 'shimazu', obi: 'ito', uchi: 'shimazu', izumi_k: 'shimazu', chosa: 'shimazu',
    takayama_o: 'shimazu', kaneishi: null, kameoka: 'matsura',
  },
  generals,
  moves: {
    // ── 徳川 ──
    tokugawa_ieyasu: M('matsudaira', 'edo'), honda_tadakatsu: M('matsudaira', 'otaki'), sakakibara_yasumasa: M('matsudaira', 'karasawa'), ii_naomasa: M('matsudaira', 'minowa'),
    honda_masanobu: M('matsudaira', 'edo'), okubo_tadasuke: M('matsudaira', 'edo'), hiraiwa_chikayoshi: M('matsudaira', 'umayabashi'), torii_mototada: M('matsudaira', 'kyo'),
    sanada_nobuyuki: M('matsudaira', 'umayabashi'), sanada_nobutada: M('matsudaira', 'edo'), watanabe_moritsuna: M('matsudaira', 'edo'), amano_yasukage: M('matsudaira', 'kawagoe'),
    koriki_kiyonaga: M('matsudaira', 'iwatsuki'), naito_masanari: M('matsudaira', 'karasuyama'), ishikawa_ienari: M('matsudaira', 'kururi'), itami_yasunao: M('matsudaira', 'kariya'),
    imagawa_ujizane: M('matsudaira', 'edo'), yagyu_munenori: M('matsudaira', 'edo'), ono_tadaaki: M('matsudaira', 'edo'), ideura_morikiyo: M('matsudaira', 'kaizu'),
    // ── 豊臣・西軍 ──
    katagiri_katsumoto: M('toyotomi', 'ishiyama'),
    mori_terumoto: M('mori', 'koriyama'), kikkawa_hiroie: M('mori', 'gassantoda'), ankokuji_ekei: M('mori', 'koriyama'), fukubara_hirotoshi: M('mori', 'koriyama'),
    suetsugu_motoyasu: M('mori', 'kannabe'), murakami_takeyoshi: M('mori', 'niitakayama'), murakami_motoyoshi: M('mori', 'niitakayama'),
    ukita_hideie: M('urakami', 'tenjinyama'), ukita_tadaie: M('urakami', 'numa'),
    ishida_mitsunari: M('ishida', 'sawayama'), shima_kiyooki: M('ishida', 'sawayama'),
    otani_yoshitsugu: M('otani', 'kanegasaki'), konishi_yukinaga: M('konishi', 'uto'), mashita_nagamori: M('mashita', 'tsutsui'), natsuka_masaie: M('natsuka', 'hino'),
    shimazu_yoshihisa: M('shimazu', 'uchi'), shimazu_yoshihiro: M('shimazu', 'chosa'), shimazu_tadatsune: M('shimazu', 'uchi'), shimazu_toyohisa: M('shimazu', 'tonokori'),
    kabayama_hisataka: M('shimazu', 'izumi_k'), togo_shigekata: M('shimazu', 'uchi'), kawakami_tadatomo: M('shimazu', 'takayama_o'),
    tani_tadasumi: M('chosokabe', 'oko'),
    nagao_akikage: M('uesugi', 'kurokawa'), higuchi_kanetsugu: M('uesugi', 'yonezawa'), honjo_shigenaga: M('uesugi', 'yanagawa'), suibara_chikanori: M('uesugi', 'shirakawa'),
    chisaka_kagechika: M('uesugi', 'kurokawa'), amakasu_kagemochi: M('uesugi', 'sukagawa'), maeda_toshimasu: M('uesugi', 'yonezawa'),
    sanada_masayuki: M('sanada', 'komoro'), sanada_nobushige: M('sanada', 'komoro'),
    oda_nobukane: M('oda', 'iwamura'),
    wakisaka_yasuharu: M('wakisaka', 'sumoto'), tachibana_muneshige: M('tachibana', 'yanagawa_k'), kuki_yoshitaka: M('kuki', 'tashiro'),
    otomo_yoshimune: M('otomo', 'funai'), nabeshima_naoshige: M('ryuzoji', 'muranaka'), ryuzoji_naganobu: M('ryuzoji', 'muranaka'),
    indo_yoriyasu: M('sagara', 'hitoyoshi'), marume_nagayoshi: M('sagara', 'hitoyoshi'), ikoma_chikamasa: M('ikoma', 'sogo'),
    satake_yoshishige: M('satake', 'ota'), wada_akitame: M('satake', 'ota'), kajiwara_masakage: M('satake', 'odajo'),
    // ── 東軍 ──
    fukushima_masanori: M('fukushima', 'kiyosu'), kani_saizo: M('fukushima', 'kiyosu'), ikeda_terumasa: M('ikeda', 'yoshida'), horio_yoshiharu: M('horio', 'hikuma'),
    yamauchi_kazutoyo: M('yamauchi', 'kakegawa'), nakamura_kazuuji: M('nakamura', 'sunpu'), asano_nagamasa: M('asano', 'tsutsujigasaki'),
    hosokawa_tadaoki: M('hosokawa', 'takebeyama'), hosokawa_fujitaka: M('hosokawa', 'takebeyama'), inatomi_sukenao: M('hosokawa', 'takebeyama'),
    kuroda_nagamasa: M('kuroda', 'kawaradake'), kuroda_yoshitaka: M('kuroda', 'kawaradake'), goto_mototsugu: M('kuroda', 'kawaradake'),
    kato_kiyomasa: M('kato', 'kumamoto'), kato_yoshiaki: M('kato_y', 'yuzuki'), ban_naoyuki: M('kato_y', 'yuzuki'), todo_takatora: M('todo', 'kurose'),
    hachisuka_iemasa: M('hachisuka', 'shozui'), maeda_toshinaga: M('maeda', 'kanazawa'), kanamori_nagachika: M('kanamori', 'takahara'),
    date_masamune: M('date', 'myo'), date_shigezane: M('date', 'teraike'), katakura_kagetsuna: M('date', 'myo'), mogami_yoshiaki: M('mogami', 'yamagata'),
    nanbu_nobunao: M('nanbu', 'sannohe'), soma_yoshitane: M('soma', 'odaka'), ito_suketake: M('ito', 'obi'), matsura_shigenobu: M('matsura', 'hirado'),
    // ── 在野 ──
    miyamoto_musashi: M('', 'tenjinyama'), miura_anjin: M('', 'funai'), yayosu: M('', 'funai'), sengoku_hidehisa: M('', 'komoro'),
  },
  leaders: {
    matsudaira: 'tokugawa_ieyasu', toyotomi: 'toyotomi_hideyori', mori: 'mori_terumoto', urakami: 'ukita_hideie', ishida: 'ishida_mitsunari', otani: 'otani_yoshitsugu',
    konishi: 'konishi_yukinaga', kobayakawa: 'kobayakawa_hideaki', mashita: 'mashita_nagamori', natsuka: 'natsuka_masaie', onogi: 'onogi_shigetsugu', koide: 'koide_hidemasa',
    wakisaka: 'wakisaka_yasuharu', tachibana: 'tachibana_muneshige', kuki: 'kuki_yoshitaka', ikoma: 'ikoma_chikamasa', shimazu: 'shimazu_yoshihisa', chosokabe: 'chosokabe_morichika',
    uesugi: 'nagao_akikage', sanada: 'sanada_masayuki', oda: 'oda_hidenobu', otomo: 'otomo_yoshimune', ryuzoji: 'nabeshima_naoshige', sagara: 'sagara_yorifusa',
    onodera: 'onodera_yoshimichi', satake: 'satake_yoshinobu',
    fukushima: 'fukushima_masanori', ikeda: 'ikeda_terumasa', tanaka: 'tanaka_yoshimasa', horio: 'horio_yoshiharu', yamauchi: 'yamauchi_kazutoyo', nakamura: 'nakamura_kazuuji',
    asano: 'asano_nagamasa', kyogoku: 'kyogoku_takatsugu', hosokawa: 'hosokawa_tadaoki', kuroda: 'kuroda_nagamasa', kato: 'kato_kiyomasa', kato_y: 'kato_yoshiaki',
    todo: 'todo_takatora', hachisuka: 'hachisuka_iemasa', maeda: 'maeda_toshinaga', hori: 'hori_hideharu', kanamori: 'kanamori_nagachika', tomita: 'tomita_nobutaka',
    tsutsui: 'tsutsui_sadatsugu', date: 'date_masamune', mogami: 'mogami_yoshiaki', nanbu: 'nanbu_nobunao', tsugaru: 'tsugaru_tamenobu', ando: 'akita_sanesue',
    soma: 'soma_yoshitane', iwaki: 'iwaki_sadataka', satomi: 'satomi_yoshiyasu', ito: 'ito_suketake', arima: 'arima_harunobu', matsura: 'matsura_shigenobu', kinoshita: 'kinoshita_iesada',
  },
  names: {
    tokugawa_ieyasu: ['徳川家康'], nagao_akikage: ['上杉景勝'], higuchi_kanetsugu: ['直江兼続'], kuroda_yoshitaka: ['黒田如水'], hosokawa_fujitaka: ['細川幽斎'],
    shima_kiyooki: ['島左近'], maeda_toshimasu: ['前田慶次'], otomo_yoshimune: ['大友吉統'],
  },
  ranksFresh: true,
  ranks: {
    honda_tadakatsu: 0, ii_naomasa: 0, sakakibara_yasumasa: 0, honda_masanobu: 0, okubo_tadachika: 0, torii_mototada: 0, tokugawa_hidetada: 0, yuki_hideyasu: 0,
    matsudaira_tadayoshi: 1, hiraiwa_chikayoshi: 1, okubo_tadasuke: 1,
    ono_harunaga: 0, katagiri_katsumoto: 0, mori_hidemoto: 0, kikkawa_hiroie: 0, kobayakawa_hidekane: 0, ankokuji_ekei: 1, akashi_takenori: 0, shima_kiyooki: 0,
    ishida_masazumi: 0, higuchi_kanetsugu: 0, honjo_shigenaga: 1, katakura_kagetsuna: 0, date_shigezane: 0, kuroda_yoshitaka: 0, hosokawa_fujitaka: 0,
    shimazu_yoshihiro: 0, shimazu_toyohisa: 1, sanada_nobushige: 1, inaba_masanari: 0, hiraoka_yorikatsu: 0, nabeshima_katsushige: 0,
  },
  court: {
    matsudaira: 6, toyotomi: 4, mori: 4, urakami: 4, uesugi: 4, maeda: 4, kobayakawa: 4, oda: 4, date: 2, shimazu: 2, satake: 2, mogami: 2, ishida: 1, otani: 1,
    konishi: 1, fukushima: 2, ikeda: 2, kuroda: 1, kato: 1, hosokawa: 1, asano: 1, kyogoku: 2, chosokabe: 1, sanada: 1, hori: 1, tachibana: 1, nanbu: 1,
  },
  guns: {
    matsudaira: 4000, toyotomi: 3000, mori: 3000, urakami: 1500, ishida: 1200, uesugi: 1500, maeda: 1500, date: 1500, shimazu: 1500, kobayakawa: 1200,
    fukushima: 800, kuroda: 800, kato: 1000, ikeda: 800, hosokawa: 600, otani: 500, konishi: 600, chosokabe: 600, mogami: 600, satake: 800, tachibana: 500,
    sanada: 300, oda: 400, kyogoku: 400, todo: 500, kato_y: 400, hachisuka: 400, asano: 500, tanaka: 400, horio: 300, yamauchi: 300, nakamura: 300, hori: 600,
    ryuzoji: 600, otomo: 300, mashita: 400, natsuka: 300, kuki: 300, wakisaka: 300, koide: 300, onogi: 200, ikoma: 300, kanamori: 300, tomita: 200, tsutsui: 300,
    kinoshita: 300, nanbu: 300, tsugaru: 200, ando: 200, soma: 200, iwaki: 200, satomi: 200, sagara: 200, ito: 200, arima: 300, matsura: 300, onodera: 200,
  },
  items: { samonji: ['matsudaira', 'tokugawa_ieyasu'] },
  // 東軍: 家康の下に、豊臣恩顧の大名が三成を討つと集う。西軍: 秀頼を旗頭に、毛利輝元が大坂城に入って総大将となる
  coalitions: [
    { leader: 'matsudaira', target: 'ishida', members: ['matsudaira', 'fukushima', 'ikeda', 'tanaka', 'horio', 'yamauchi', 'nakamura', 'asano', 'kyogoku', 'hosokawa', 'kuroda', 'kato', 'kato_y', 'todo', 'hachisuka', 'maeda', 'hori', 'date', 'mogami', 'kanamori', 'tomita', 'tsutsui', 'ito', 'satomi', 'nanbu', 'tsugaru', 'ando'] },
    { leader: 'toyotomi', target: 'matsudaira', chief: 'mori_terumoto', members: ['toyotomi', 'mori', 'urakami', 'ishida', 'otani', 'konishi', 'shimazu', 'chosokabe', 'uesugi', 'sanada', 'oda', 'mashita', 'natsuka', 'onogi', 'koide', 'kobayakawa', 'wakisaka', 'tachibana', 'kuki', 'otomo', 'ryuzoji', 'sagara', 'ikoma', 'onodera'] },
  ],
  // 親密度: 寝返る家（小早川・脇坂・鍋島・相良）は徳川と通じ、三成と豊臣恩顧の武断派は犬猿の仲
  amity: [
    ['kobayakawa', 'matsudaira', 85], ['kobayakawa', 'ishida', 10], ['kobayakawa', 'toyotomi', 20], ['wakisaka', 'matsudaira', 70], ['ryuzoji', 'matsudaira', 70], ['sagara', 'matsudaira', 65],
    ['ishida', 'fukushima', 5], ['ishida', 'kato', 5], ['ishida', 'kuroda', 10], ['ishida', 'hosokawa', 10], ['ishida', 'kato_y', 15], ['ishida', 'ikeda', 20],
    ['ishida', 'otani', 95], ['ishida', 'konishi', 80], ['ishida', 'urakami', 75], ['ishida', 'satake', 80], ['toyotomi', 'urakami', 90], ['toyotomi', 'mori', 60], ['toyotomi', 'ishida', 70],
    ['uesugi', 'date', 10], ['uesugi', 'mogami', 10], ['uesugi', 'hori', 10], ['uesugi', 'matsudaira', 5], ['uesugi', 'satake', 70], ['sanada', 'matsudaira', 15],
    ['maeda', 'matsudaira', 55], ['maeda', 'otani', 20], ['kyogoku', 'matsudaira', 70], ['toyotomi', 'matsudaira', 40], ['satake', 'matsudaira', 25],
    ['fukushima', 'matsudaira', 70], ['kuroda', 'matsudaira', 75], ['ikeda', 'matsudaira', 75], ['date', 'mogami', 45],
  ],
  featured: ['matsudaira', 'ishida', 'toyotomi', 'mori', 'urakami', 'uesugi', 'kobayakawa', 'otani', 'sanada', 'shimazu', 'date', 'maeda', 'fukushima', 'kuroda', 'kato', 'chosokabe', 'satake', 'mogami'],
};
