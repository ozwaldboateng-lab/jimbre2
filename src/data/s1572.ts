// 元亀三年（1572）十月、第二次の信長包囲網。武田信玄が甲府を発って西上の途につき、浅井・朝倉・本願寺・三好・松永が織田を囲む。
// 将軍足利義昭は信長と表向き手を結びながら、ひそかに諸大名へ御内書を送っている。義昭を盟主、信玄を総大将とする「信長を討つ連合」で始まる。
// 1560年の名簿との差分で書く（この年にはもう亡い者は dead、所属と所在が変わった者は moves）。新しい武将は足さない（顔の絵はみな揃っている）。
import type { ClanDef } from './roster';
import type { Scenario } from './scenarios';

const M = (clan: string, loc: string): [string, string] => [clan, loc];

const clans: ClanDef[] = [
  { id: 'matsudaira', name: '徳川', color: '#d7a227', prestige: 50 },
  { id: 'uesugi', name: '上杉', color: '#2c5a9e', prestige: 75 },
  { id: 'matsunaga', name: '松永', color: '#6a4a3a', prestige: 45 },
  { id: 'tsutsui', name: '筒井', color: '#6a7a9a', prestige: 35 },
];

export const S1572: Scenario = {
  id: '1572', year: 1572, month: 10, title: '元亀三年 信長包囲網',
  lede: '元亀三年十月。上洛から四年、織田信長は将軍足利義昭を擁して畿内を押さえたが、四方を敵に囲まれていた。北近江の浅井長政と越前の朝倉義景、石山の本願寺、三好と松永久秀。そしてこの月、甲斐の武田信玄が二万五千の兵を率いて西へ動き出した。将軍義昭は、ひそかに諸国へ「信長を討て」と御内書を送っている。',
  clans,
  war: 12,
  prestige: { oda: 75, takeda: 85, ashikaga: 80, asai: 50, asakura: 60, honganji: 75, miyoshi: 50, hojo: 70, mori: 70, otomo: 65 },
  owners: {
    // 東海: 徳川は三河・遠江。駿河は武田（今川は滅んだ）。奥三河の山家三方衆は武田に
    kiyosu: 'oda', inuyama: 'oda', narumi: 'oda', kariya: 'oda', okazaki: 'matsudaira', yoshida: 'matsudaira', hikuma: 'matsudaira', kakegawa: 'matsudaira',
    sunpu: 'takeda', dabu: 'takeda',
    // 美濃・飛騨（斎藤は滅び、美濃は織田）
    inabayama: 'oda', ogaki: 'oda', iwamura: 'oda', gujo: 'oda', takahara: null,
    // 上野: 箕輪は武田、厩橋は上杉
    minowa: 'takeda', umayabashi: 'uesugi', iiyama: 'uesugi',
    // 北陸: 加賀・越中の一向一揆
    kanazawa: 'honganji', toyama_c: 'honganji', matsukura: 'shiina',
    // 近江: 浅井は小谷に追い詰められ、南近江は織田
    odani: 'azai', sawayama: 'oda', kannonji: 'oda', hino: 'oda',
    // 畿内
    kyo: 'ashikaga', yagi: 'ashikaga', kuroi: null, akutagawa: 'oda', koshimizu: 'oda', ishiyama: 'honganji',
    iimoriyama: 'miyoshi', kishiwada: 'miyoshi', shigisan: 'matsunaga', tsutsui: 'tsutsui', takaya: 'hatakeyama_k', hiro: 'hatakeyama_k',
    // 伊勢・志摩: 北畠は信長の子を養子に迎えた。北伊勢と志摩は織田
    kameyama: 'oda', okawachi: 'oda', tashiro: 'oda', hijiyama: null,
    // 中国: 尼子は再興に敗れ、出雲は毛利
    gassantoda: 'mori', yamabuki: 'mori', odaka_h: 'mori', takata: 'urakami',
    // 四国: 土佐の東半分は長宗我部、伊予南部の地蔵ヶ嶽は国衆
    asakura_t: 'chosokabe', motoyama: 'chosokabe', aki_t: 'chosokabe', amagiri: null,
    // 関東: 北条は武蔵・下総の多くを押さえ、小田城は佐竹が奪った
    iwatsuki: 'hojo', oshi: 'hojo', sekiyado: null, odajo: 'satake', mito: 'satake', karasawa: null, karasuyama: null,
    // 奥羽: 津軽は大浦為信が自立しつつある
    ishikawa: null,
    // 九州: 飫肥は伊東
    obi: 'ito', uto: null,
  },
  dead: [
    // 織田・徳川
    'mori_yoshinari', 'oda_nobukiyo', 'torii_tadayoshi',
    // 今川（駿河は武田、今川氏真は北条を頼る）
    'iio_tsuratatsu', 'ohara_shigezane', 'ihara_tadatane', 'sekiguchi_chikanaga', 'udono_nagateru', 'ii_naochika', 'sena_ujitoshi', 'ono_masatsugu',
    // 斎藤・遠山
    'saito_yoshitatsu', 'nagai_michitoshi', 'hibino_kiyozane', 'nagai_moriyasu', 'kishi_nobuchika', 'sato_tadayoshi', 'toyama_kageto', 'toyama_naokado',
    // 武田
    'takeda_nobushige', 'yamamoto_kansuke', 'obu_toramasa', 'hara_toratane', 'takeda_yoshinobu', 'amari_masatada', 'obata_toramori', 'tada_mitsuyori', 'morozumi_torasada',
    // 上杉
    'usami_sadamitsu', 'nagao_masakage', 'takanashi_masayori', 'nakajo_fujisuke', 'irobe_katsunaga',
    // 北条と関東の諸家
    'hojo_ujiyasu', 'toyama_tsunakage', 'hojo_tsunataka', 'tominaga_naokatsu', 'tame_motetada', 'hojo_ujitaka', 'masaki_tokishige', 'masaki_nobushige', 'satake_yoshiaki',
    'nagano_narimasa', 'nagano_narimori', 'ota_ujisuke',
    // 奥羽
    'nakano_munetoki', 'makino_hisanaka', 'ishikawa_takanobu', 'sato_yoshinobu', 'iwaki_shigetaka', 'tosabayashi_zento',
    // 北陸・近江・畿内
    'magara_naotaka', 'asakura_kagenori', 'takeda_yoshizumi', 'endo_naotsune', 'goto_katatoyo', 'ashikaga_yoshiteru', 'wada_koremasa',
    'miyoshi_nagayoshi', 'miyoshi_yoshioki', 'miyoshi_jikkyu', 'ataka_fuyuyasu', 'sogo_kazumasa', 'naito_munekatsu', 'ikeda_nagamasa', 'yukawa_naomitsu',
    // 中国・四国
    'bessho_yasuharu', 'akamatsu_masahide', 'mimura_iechika', 'amago_haruhisa', 'uyama_hisakane', 'honjo_tsunemitsu',
    'mori_motonari', 'mori_takamoto', 'katsura_motozumi', 'akagawa_motoyasu', 'kodama_naritada', 'kono_michinobu', 'kurushima_michiyasu', 'saionji_sanemitsu',
    'yoshida_takayori', 'motoyama_shigetoki', 'aki_kunitora', 'doi_sozan',
    // 九州
    'tachibana_akitoshi', 'usuki_akisumi', 'yoshihiro_akimasa', 'arima_harezumi', 'ito_yoshimasu',
    'shimazu_takahisa', 'shimazu_tadayoshi', 'shimazu_tadachika', 'shimazu_tadamasa', 'shimazu_naohisa', 'kawakami_hisatoki', 'kimotsuki_kanetsugu', 'kimotsuki_yoshikane',
    // 在野
    'kedoin_yoshishige', 'tsukahara_bokuden', 'kato_danzo',
  ],
  moves: {
    // ── 織田（美濃・近江・伊勢を併せた） ──
    inaba_yoshimichi: M('oda', 'inabayama'), ando_morinari: M('oda', 'ogaki'), ujiie_naotomo: M('oda', 'ogaki'), takenaka_shigeharu: M('oda', 'sawayama'),
    fuwa_mitsuharu: M('oda', 'inabayama'), saito_toshimitsu: M('oda', 'ogaki'), hori_hidemasa: M('oda', 'inabayama'), oshima_mitsuyoshi: M('oda', 'inabayama'),
    ikoma_chikamasa: M('oda', 'inabayama'), toyama_kageyuki: M('oda', 'iwamura'), isono_kazumasa: M('oda', 'sawayama'), miyabe_keijun: M('oda', 'sawayama'),
    gamo_katahide: M('oda', 'hino'), gamo_sadahide: M('oda', 'hino'), gamo_ujisato: M('oda', 'hino'), shindo_katamori: M('oda', 'kannonji'),
    kinoshita_tokichiro: M('oda', 'sawayama'), kinoshita_hidenaga: M('oda', 'sawayama'), akechi_mitsuhide: M('oda', 'kannonji'),
    hachisuka_masakatsu: M('oda', 'sawayama'), maeno_nagayasu: M('oda', 'sawayama'), yamauchi_kazutoyo: M('oda', 'sawayama'), asano_nagamasa: M('oda', 'sawayama'),
    horio_yoshiharu: M('oda', 'sawayama'), nakamura_kazuuji: M('oda', 'sawayama'), mashita_nagamori: M('oda', 'sawayama'), sengoku_hidehisa: M('oda', 'sawayama'),
    maeda_toshimasu: M('oda', 'kiyosu'), kuki_yoshitaka: M('oda', 'tashiro'), takigawa_kazumasu: M('oda', 'kameyama'), kozukuri_tomomasa: M('oda', 'okawachi'),
    oda_nobuo: M('oda', 'okawachi'), araki_murashige: M('oda', 'koshimizu'), nakagawa_kiyohide: M('oda', 'koshimizu'), itami_chikaoki: M('oda', 'koshimizu'),
    takayama_tomoteru: M('oda', 'akutagawa'), takayama_ukon: M('oda', 'akutagawa'), sakuma_nobumori: M('oda', 'inabayama'), kanamori_nagachika: M('oda', 'gujo'),
    // ── 徳川 ──
    tokugawa_ieyasu: M('matsudaira', 'hikuma'), sakai_tadatsugu: M('matsudaira', 'yoshida'), ishikawa_ienari: M('matsudaira', 'kakegawa'), okubo_tadayo: M('matsudaira', 'hikuma'),
    torii_mototada: M('matsudaira', 'hikuma'), honda_tadazane: M('matsudaira', 'hikuma'), honda_tadakatsu: M('matsudaira', 'hikuma'), sakakibara_yasumasa: M('matsudaira', 'hikuma'),
    osuga_yasutaka: M('matsudaira', 'kakegawa'), itami_yasunao: M('matsudaira', 'hikuma'), honda_masanobu: M('', 'kanazawa'), ii_naomasa: M('', 'hikuma'),
    // ── 武田（駿河・西上野を併せた） ──
    okabe_motonobu: M('takeda', 'sunpu'), kuzuyama_ujimoto: M('takeda', 'sunpu'), asahina_nobuoki: M('takeda', 'sunpu'), okabe_masatsuna: M('takeda', 'sunpu'),
    amano_kagetsura: M('takeda', 'dabu'), obata_nobuzane: M('takeda', 'minowa'), ideura_morikiyo: M('takeda', 'komoro'), kiso_yoshimasa: M('takeda', 'kisofukushima'),
    // ── 今川の旧主は北条を頼る ──
    imagawa_ujizane: M('', 'odawara'), asahina_yasutomo: M('', 'odawara'),
    // ── 上杉（北条からの養子・景虎） ──
    hojo_saburo: M('uesugi', 'kasugayama'), kitajo_takahiro: M('uesugi', 'umayabashi'),
    // ── 関東 ──
    ota_sukemasa: M('satake', 'ota'), kajiwara_masakage: M('satake', 'ota'), kamiizumi_nobutsuna: M('', 'kyo'),
    // ── 浅井・朝倉と斎藤の旧主 ──
    saito_tatsuoki: M('asakura', 'ichijodani'), hineno_hironari: M('azai', 'odani'),
    // ── 足利（将軍義昭） ──
    hosokawa_fujitaka: M('ashikaga', 'kyo'), mitsubuchi_fujihide: M('ashikaga', 'kyo'), isshiki_fujinaga: M('ashikaga', 'kyo'), ashikaga_yoshiaki: M('ashikaga', 'kyo'),
    // ── 三好（三人衆）と松永・筒井 ──
    matsunaga_hisahide: M('matsunaga', 'shigisan'), matsunaga_hisamichi: M('matsunaga', 'shigisan'), iwanari_tomomichi: M('miyoshi', 'iimoriyama'),
    miyoshi_masayasu: M('miyoshi', 'iimoriyama'), miyoshi_nagayasu: M('miyoshi', 'iimoriyama'), shinohara_nagafusa: M('miyoshi', 'shozui'), miyoshi_yasunaga: M('miyoshi', 'shozui'),
    tsutsui_junkei: M('tsutsui', 'tsutsui'), shima_kiyooki: M('tsutsui', 'tsutsui'),
    // ── 六角は城を失い、甲賀に潜む ──
    rokkaku_yoshikata: M('', 'kannonji'), rokkaku_yoshiharu: M('', 'kannonji'), mikumo_sadamochi: M('', 'kannonji'), hirai_sadatake: M('', 'kannonji'),
    // ── 尼子の残党 ──
    yamanaka_yukimori: M('', 'konosumiyama'), tachihara_hisatsuna: M('', 'konosumiyama'), amago_yoshihisa: M('mori', 'koriyama'),
    // ── 能登の畠山義綱は追われて近江に ──
    hatakeyama_yoshitsuna: M('', 'kannonji'),
    // ── 土佐・九州 ──
    motoyama_sadashige: M('chosokabe', 'motoyama'), takahashi_akitane: M('', 'kawaradake'),
  },
  leaders: {
    oda: 'oda_nobunaga', matsudaira: 'tokugawa_ieyasu', takeda: 'takeda_shingen', uesugi: 'uesugi_kenshin', hojo: 'hojo_ujimasa', ashikaga: 'ashikaga_yoshiaki',
    azai: 'azai_katamasa', asakura: 'asakura_yoshikage', honganji: 'honganji_kennyo', miyoshi: 'miyoshi_nagayasu', matsunaga: 'matsunaga_hisahide', tsutsui: 'tsutsui_junkei',
    satake: 'satake_yoshishige', date: 'date_terumune', mogami: 'mogami_yoshiaki', hatakeyama_n: 'cho_tsugutsura', wakasa_takeda: 'awaya_katsuhisa',
    bessho: 'bessho_nagaharu', mimura: 'mimura_motochika', mori: 'mori_terumoto', kono: 'murakami_takeyoshi', saionji: 'saionji_kinhiro', otomo: 'otomo_sorin',
    shimazu: 'shimazu_yoshihisa', kimotsuki: 'kimotsuki_kanesuke', iwaki: 'iwaki_chikataka', daihoji: 'daihoji_yoshiuji', hatakeyama_k: 'hatakeyama_takamasa',
  },
  names: {
    tokugawa_ieyasu: ['徳川家康'], uesugi_kenshin: ['上杉謙信'], azai_katamasa: ['浅井長政'], kinoshita_tokichiro: ['木下秀吉'], suwa_katsuyori: ['武田勝頼'],
    obu_masakage: ['山県昌景'], kudo_suketaka: ['内藤昌豊'], kasuga_toratsuna: ['高坂昌信'], baba_nobuharu: ['馬場信春'], hojo_saburo: ['上杉景虎'],
    nagao_akikage: ['上杉景勝'], otomo_sorin: ['大友宗麟'], yoshihiro_shigetoshi: ['高橋紹運'], bekki_akitsura: ['戸次鑑連'],
  },
  court: { oda: 2, ashikaga: 8, takeda: 2, uesugi: 2, hojo: 2 },
  guns: {
    oda: 1500, saika: 1000, honganji: 800, takeda: 500, matsudaira: 300, asai: 300, asakura: 400, miyoshi: 500, matsunaga: 300, tsutsui: 200, ashikaga: 100,
    hojo: 500, uesugi: 400, satomi: 100, satake: 200, mori: 600, otomo: 600, shimazu: 500, ryuzoji: 300, chosokabe: 200, urakami: 200, date: 100,
  },
  items: { tsukumo: ['oda', 'oda_nobunaga'], hiragumo: ['matsunaga', 'matsunaga_hisahide'] },
  // 将軍義昭を盟主、武田信玄を総大将とする信長を討つ連合（表向きは、まだ将軍は信長と手を結んでいる）
  coalitions: [
    { leader: 'ashikaga', target: 'oda', chief: 'takeda_shingen', members: ['ashikaga', 'takeda', 'azai', 'asakura', 'honganji', 'miyoshi', 'matsunaga', 'saika'] },
  ],
  treaties: [
    ['oda', 'matsudaira', 60], ['oda', 'uesugi', 12], ['oda', 'tsutsui', 24], ['oda', 'kitabatake', 36], ['oda', 'wakasa_takeda', 24], ['oda', 'hatakeyama_k', 24],
    ['oda', 'mori', 12], ['oda', 'anegakoji', 24], ['matsudaira', 'uesugi', 12], ['takeda', 'hojo', 36], ['mori', 'urakami', 6],
  ],
  amity: [
    ['oda', 'matsudaira', 85], ['oda', 'takeda', 30], ['oda', 'ashikaga', 25], ['oda', 'azai', 5], ['oda', 'asakura', 5], ['oda', 'honganji', 5], ['oda', 'matsunaga', 10],
    ['ashikaga', 'takeda', 70], ['ashikaga', 'asakura', 70], ['azai', 'asakura', 90], ['takeda', 'matsudaira', 10], ['takeda', 'uesugi', 5], ['takeda', 'hojo', 70],
    ['honganji', 'takeda', 75], ['honganji', 'asakura', 60], ['matsunaga', 'tsutsui', 5], ['oda', 'uesugi', 60], ['oda', 'mori', 60],
  ],
  featured: ['oda', 'takeda', 'matsudaira', 'ashikaga', 'azai', 'asakura', 'honganji', 'miyoshi', 'matsunaga', 'uesugi', 'hojo', 'mori', 'chosokabe', 'otomo', 'shimazu', 'date'],
};
