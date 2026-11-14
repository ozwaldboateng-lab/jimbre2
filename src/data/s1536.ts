// 天文五年（1536）六月、花倉の乱の直後。今川義元が家督を継ぎ、甲斐では武田信虎、相模では北条氏綱が健在。
// 尾張は織田信秀、美濃は守護の土岐頼芸と長井規秀（のちの斎藤道三）、西国は大内義隆と尼子経久が張り合う。
// 1560年の名簿との差分で書く。城の持ち主・武将の所在はおおまかな史実に寄せる（確かさの劣るものは近い城・近い家に）。
import type { ClanDef, GeneralDef } from './roster';
import { GENERALS } from './roster';
import type { Scenario } from './scenarios';

const G = (id: string, name: string, clan: string, bra: number, int: number, lea: number, cha: number, loc: string, born: number): [GeneralDef, number] => [[id, name, clan, bra, int, lea, cha, loc], born];

// 1560年の家から、この年に城を持つ家へ移る武将（家ごと）
const CLAN_MOVE: Record<string, [string, string]> = {
  miyoshi: ['hosokawa', 'koshimizu'], // 三好は細川晴元の被官
  ryuzoji: ['shoni', 'muranaka'], // 龍造寺は少弐の被官
  nagano: ['yamanouchi', 'minowa'], // 長野は山内上杉の重臣
  bessho: ['akamatsu', 'miki'], kodera: ['akamatsu', 'gochaku'], // 播磨は赤松の下に
  motoyama: ['motoyama', 'motoyama'],
};
const moves: Record<string, [string, string]> = { murakami_yoshikiyo: ['murakami', 'kaizu'] };
for (const [id, , clan] of GENERALS) { const m = CLAN_MOVE[clan]; if (m && m[0] !== clan) moves[id] = m; }

const clans: ClanDef[] = [
  { id: 'saito', name: '土岐', color: '#3e7aa8', prestige: 45 }, // 美濃の守護・土岐家（長井規秀が実権を握りつつある）
  { id: 'ouchi', name: '大内', color: '#8a3a8a', prestige: 80 },
  { id: 'hosokawa', name: '細川', color: '#3e6a5a', prestige: 60 },
  { id: 'ogigayatsu', name: '扇谷上杉', color: '#6a8ac0', prestige: 50 },
  { id: 'yamanouchi', name: '山内上杉', color: '#4a6aa0', prestige: 55 },
  { id: 'koga_kubo', name: '古河公方', color: '#b0a070', prestige: 60 },
  { id: 'chiba', name: '千葉', color: '#8a6a4a', prestige: 40 },
  { id: 'shoni', name: '少弐', color: '#7a5a8a', prestige: 40 },
  { id: 'suwa', name: '諏訪', color: '#6a8a5a', prestige: 40 },
  { id: 'ogasawara', name: '小笠原', color: '#8a7a3a', prestige: 45 },
  { id: 'murakami', name: '村上', color: '#5a6a8a', prestige: 40 },
  { id: 'kiso', name: '木曽', color: '#7a8a5a', prestige: 30 },
];

const generals: [GeneralDef, number][] = [
  // 尾張・三河・美濃
  G('oda_nobuhide', '織田信秀', 'oda', 74, 78, 80, 80, 'kiyosu', 1511),
  G('oda_nobuyasu_k', '織田信康', 'oda', 64, 56, 62, 56, 'inuyama', 1503),
  G('hirate_masahide', '平手政秀', 'oda', 40, 72, 55, 70, 'kiyosu', 1492),
  G('oda_nobumitsu', '織田信光', 'oda', 72, 58, 68, 56, 'kiyosu', 1516),
  G('yamaguchi_noritsugu', '山口教継', 'oda', 62, 66, 60, 48, 'narumi', 1505),
  G('matsudaira_nobusada', '松平信定', 'matsudaira', 60, 64, 58, 40, 'okazaki', 1490),
  G('abe_sadayoshi', '阿部定吉', 'matsudaira', 56, 62, 58, 64, 'okazaki', 1505),
  G('okubo_tadatoshi', '大久保忠俊', 'matsudaira', 68, 56, 62, 60, 'okazaki', 1499),
  G('matsudaira_hirotada', '松平広忠', 'matsudaira', 40, 50, 46, 52, 'okazaki', 1526),
  G('toki_yorinori', '土岐頼芸', 'saito', 36, 52, 40, 54, 'inabayama', 1502),
  G('saito_dosan', '斎藤道三', 'saito', 74, 92, 82, 52, 'inabayama', 1494),
  G('akechi_mitsuyasu', '明智光安', 'saito', 60, 62, 62, 60, 'inabayama', 1500),
  // 駿遠・甲信
  G('imagawa_yoshimoto', '今川義元', 'imagawa', 64, 84, 76, 80, 'sunpu', 1519),
  G('taigen_sessai', '太原雪斎', 'imagawa', 40, 95, 74, 80, 'sunpu', 1496),
  G('asahina_yasuyoshi', '朝比奈泰能', 'imagawa', 70, 66, 72, 66, 'kakegawa', 1497),
  G('okabe_chikatsuna', '岡部親綱', 'imagawa', 66, 60, 66, 58, 'sunpu', 1495),
  G('matsui_munenobu', '松井宗信', 'imagawa', 74, 55, 68, 62, 'hikuma', 1515),
  G('takeda_nobutora', '武田信虎', 'takeda', 84, 62, 82, 46, 'tsutsujigasaki', 1494),
  G('itagaki_nobukata', '板垣信方', 'takeda', 72, 72, 78, 66, 'tsutsujigasaki', 1489),
  G('amari_torayasu', '甘利虎泰', 'takeda', 78, 56, 72, 52, 'tsutsujigasaki', 1498),
  G('oyamada_nobuari', '小山田信有', 'takeda', 66, 58, 64, 56, 'iwadono', 1488),
  G('suwa_yorishige', '諏訪頼重', 'suwa', 60, 56, 60, 62, 'takato', 1516),
  G('takato_yoritsugu', '高遠頼継', 'suwa', 64, 52, 58, 40, 'takato', 1510),
  G('ogasawara_nagatoki', '小笠原長時', 'ogasawara', 74, 52, 66, 48, 'fukashi', 1514),
  G('yashiro_masakuni', '屋代政国', 'murakami', 56, 58, 58, 50, 'kaizu', 1510),
  G('muroga_mitsumasa', '室賀満正', 'murakami', 60, 48, 56, 46, 'kaizu', 1520),
  G('kiso_yoshiyasu', '木曽義康', 'kiso', 60, 58, 62, 58, 'kisofukushima', 1514),
  G('yamamura_yoshitoshi', '山村良利', 'kiso', 58, 60, 60, 54, 'kisofukushima', 1500),
  // 関東
  G('hojo_ujitsuna', '北条氏綱', 'hojo', 70, 86, 82, 84, 'odawara', 1487),
  G('daidoji_morimasa', '大道寺盛昌', 'hojo', 62, 66, 64, 58, 'tamanawa', 1495),
  G('uesugi_tomooki', '上杉朝興', 'ogigayatsu', 62, 58, 64, 56, 'kawagoe', 1488),
  G('nanbada_norishige', '難波田憲重', 'ogigayatsu', 64, 58, 62, 52, 'matsuyama_m', 1500),
  G('uesugi_norimasa', '上杉憲政', 'yamanouchi', 40, 46, 44, 52, 'minowa', 1520),
  G('ashikaga_haruuji', '足利晴氏', 'koga_kubo', 40, 50, 46, 60, 'koga', 1508),
  G('yanada_takasuke', '簗田高助', 'koga_kubo', 54, 64, 58, 58, 'sekiyado', 1493),
  G('chiba_masatane', '千葉昌胤', 'chiba', 50, 56, 54, 58, 'motosakura', 1495),
  G('hara_tanekiyo', '原胤清', 'chiba', 64, 58, 62, 52, 'motosakura', 1500),
  G('satake_yoshiatsu', '佐竹義篤', 'satake', 58, 60, 62, 58, 'ota', 1507),
  G('utsunomiya_hisatsuna', '宇都宮尚綱', 'utsunomiya', 66, 52, 62, 54, 'utsunomiya', 1513),
  G('yuki_masakatsu', '結城政勝', 'yuki', 58, 66, 60, 58, 'yuki', 1503),
  G('oda_masaharu', '小田政治', 'oda_h', 58, 62, 60, 58, 'odajo', 1492),
  // 北陸・奥羽
  G('nagao_tamekage', '長尾為景', 'uesugi', 84, 66, 82, 52, 'kasugayama', 1489),
  G('nagao_harukage', '長尾晴景', 'uesugi', 40, 52, 40, 50, 'kasugayama', 1509),
  G('asakura_takakage', '朝倉孝景', 'asakura', 60, 72, 66, 72, 'ichijodani', 1493),
  G('asakura_soteki', '朝倉宗滴', 'asakura', 80, 86, 90, 80, 'ichijodani', 1477),
  G('takeda_motomitsu', '武田元光', 'wakasa_takeda', 52, 60, 56, 58, 'nochiseyama', 1494),
  G('hatakeyama_yoshifusa', '畠山義総', 'hatakeyama_n', 50, 78, 58, 76, 'nanao', 1491),
  G('date_tanemune', '伊達稙宗', 'date', 66, 76, 72, 66, 'yonezawa', 1488),
  G('ashina_morikiyo', '蘆名盛舜', 'ashina', 58, 60, 62, 58, 'kurokawa', 1490),
  G('miki_naoyori', '三木直頼', 'anegakoji', 60, 64, 62, 60, 'sakurabora', 1503),
  // 近江・畿内
  G('rokkaku_sadayori', '六角定頼', 'rokkaku', 66, 86, 80, 80, 'kannonji', 1495),
  G('azai_sukemasa', '浅井亮政', 'azai', 72, 66, 72, 62, 'odani', 1491),
  G('ashikaga_yoshiharu', '足利義晴', 'ashikaga', 40, 58, 46, 62, 'kyo', 1511),
  G('hosokawa_harumoto', '細川晴元', 'hosokawa', 48, 64, 56, 50, 'akutagawa', 1514),
  G('miyoshi_masanaga', '三好政長', 'hosokawa', 66, 62, 62, 46, 'koshimizu', 1508),
  G('hatano_tanemichi', '波多野稙通', 'hosokawa', 64, 62, 64, 56, 'yagi', 1495),
  G('hatakeyama_tanenaga', '畠山稙長', 'hatakeyama_k', 54, 58, 56, 58, 'takaya', 1504),
  G('kizawa_nagamasa', '木沢長政', 'hatakeyama_k', 74, 70, 72, 40, 'shigisan', 1493),
  G('yusa_naganori', '遊佐長教', 'hatakeyama_k', 62, 72, 64, 50, 'takaya', 1491),
  G('kitabatake_harutomo', '北畠晴具', 'kitabatake', 62, 70, 64, 66, 'kiriyama', 1503),
  G('honganji_shonyo', '本願寺証如', 'honganji', 30, 70, 45, 86, 'ishiyama', 1516),
  // 中国・四国
  G('akamatsu_harumasa', '赤松晴政', 'akamatsu', 50, 55, 56, 50, 'oshio', 1513),
  G('bessho_naruharu', '別所就治', 'akamatsu', 64, 58, 62, 54, 'miki', 1500),
  G('kodera_norimoto', '小寺則職', 'akamatsu', 54, 62, 58, 56, 'gochaku', 1495),
  G('urakami_masamune', '浦上政宗', 'urakami', 62, 60, 62, 50, 'tenjinyama', 1515),
  G('amago_tsunehisa', '尼子経久', 'amago', 70, 94, 86, 88, 'gassantoda', 1458),
  G('amago_kunihisa', '尼子国久', 'amago', 78, 55, 76, 54, 'gassantoda', 1492),
  G('amago_masahisa', '尼子誠久', 'amago', 72, 50, 66, 50, 'gassantoda', 1510),
  G('kamei_hidetsuna', '亀井秀綱', 'amago', 54, 72, 58, 60, 'gassantoda', 1480),
  G('ouchi_yoshitaka', '大内義隆', 'ouchi', 48, 70, 58, 72, 'konomine', 1507),
  G('sue_okifusa', '陶興房', 'ouchi', 78, 78, 84, 70, 'konomine', 1475),
  G('sue_harukata', '陶晴賢', 'ouchi', 84, 70, 82, 60, 'konomine', 1521),
  G('hironaka_takakane', '弘中隆兼', 'ouchi', 70, 66, 70, 62, 'konomine', 1510),
  G('naito_okimori', '内藤興盛', 'ouchi', 60, 66, 64, 62, 'katsuyama', 1495),
  G('era_fusahide', '江良房栄', 'ouchi', 66, 68, 66, 54, 'masuda', 1515),
  G('shiji_hiroyoshi', '志道広良', 'mori', 30, 84, 50, 70, 'koriyama', 1467),
  G('kono_michinao', '河野通直', 'kono', 50, 56, 54, 56, 'yuzuki', 1500),
  G('chosokabe_kunichika', '長宗我部国親', 'chosokabe', 70, 72, 74, 72, 'oko', 1504),
  // 九州
  G('otomo_yoshiaki', '大友義鑑', 'otomo', 62, 70, 66, 60, 'funai', 1502),
  G('shoni_sukemoto', '少弐資元', 'shoni', 52, 56, 54, 52, 'muranaka', 1497),
  G('ryuzoji_iekane', '龍造寺家兼', 'shoni', 70, 84, 78, 74, 'muranaka', 1454),
  G('sagara_yoshishige', '相良義滋', 'sagara', 60, 72, 64, 62, 'hitoyoshi', 1489),
  G('sagara_haruhiro', '相良晴広', 'sagara', 55, 66, 58, 60, 'hitoyoshi', 1513),
  // 小さな家の当主（1560年の当主はまだ幼い）
  G('isshiki_yoshiyuki', '一色義幸', 'ichishiki', 50, 56, 54, 56, 'takebeyama', 1505),
  G('motoyama_shigemune', '本山茂宗', 'motoyama', 66, 64, 66, 56, 'motoyama', 1487),
  G('ota_sukeyori', '太田資頼', 'ota', 60, 62, 62, 58, 'iwatsuki', 1477),
  G('soma_akitane', '相馬顕胤', 'soma', 64, 58, 62, 60, 'odaka', 1508),
  G('nanbu_yasunobu', '南部安信', 'nanbu', 62, 58, 62, 58, 'sannohe', 1497),
  G('kasai_harutane', '葛西晴胤', 'kasai', 56, 56, 58, 56, 'teraike', 1509),
];

export const S1536: Scenario = {
  id: '1536', year: 1536, month: 6, title: '天文五年 花倉の乱',
  lede: '天文五年六月。駿河では花倉の乱を制した今川義元が家督を継いだ。甲斐の武田信虎、相模の北条氏綱、越後の長尾為景がなお健在。尾張では織田信秀が台頭し、美濃では長井規秀が守護土岐家の実権を握りつつある。西国では大内義隆と尼子経久が覇を争い、京では細川晴元が将軍足利義晴を擁する。',
  clans,
  prestige: { oda: 40, imagawa: 65, takeda: 60, hojo: 65, uesugi: 60, mori: 35, amago: 75, asakura: 60, rokkaku: 65, azai: 40, date: 60, ashikaga: 60, otomo: 60 },
  owners: {
    // 東海
    kiyosu: 'oda', inuyama: 'oda', narumi: 'oda', kariya: null, yoshida: null,
    // 美濃（土岐）
    inabayama: 'saito', ogaki: 'saito',
    // 甲信: 武田は甲斐一国、信濃は諏訪・小笠原・村上・木曽ほか
    fukashi: 'ogasawara', takato: 'suwa', kaizu: 'murakami', iiyama: 'murakami', komoro: null, kisofukushima: 'kiso', iida: null,
    // 関東: 北条は相模・伊豆と江戸。武蔵の多くは扇谷上杉、上野は山内上杉
    kawagoe: 'ogigayatsu', matsuyama_m: 'ogigayatsu', takiyama: 'ogigayatsu', hachigata: 'yamanouchi',
    minowa: 'yamanouchi', umayabashi: 'yamanouchi', koga: 'koga_kubo', sekiyado: 'koga_kubo', motosakura: 'chiba',
    kururi: null, otaki: null,
    // 越後
    honjo: null,
    // 畿内: 細川晴元が京の周り、木沢長政が河内・大和
    akutagawa: 'hosokawa', koshimizu: 'hosokawa', yagi: 'hosokawa', kishiwada: 'hosokawa', shozui: 'hosokawa', sogo: 'hosokawa', sumoto: 'hosokawa',
    iimoriyama: 'hatakeyama_k', shigisan: 'hatakeyama_k', sawayama: 'rokkaku',
    // 中国: 大内が周防・長門・石見・豊前と安芸の一部。毛利は郡山だけ
    konomine: 'ouchi', katsuyama: 'ouchi', masuda: 'ouchi', kawaradake: 'ouchi', tachibana: 'ouchi',
    niitakayama: null, hinoyama: null, kannabe: null, takata: null,
    miki: 'akamatsu', gochaku: 'akamatsu',
    // 九州: 肥前は少弐
    muranaka: 'shoni',
  },
  generals,
  moves,
  leaders: {
    oda: 'oda_nobuhide', matsudaira: 'matsudaira_nobusada', saito: 'toki_yorinori', imagawa: 'imagawa_yoshimoto', takeda: 'takeda_nobutora',
    suwa: 'suwa_yorishige', ogasawara: 'ogasawara_nagatoki', murakami: 'murakami_yoshikiyo', kiso: 'kiso_yoshiyasu',
    hojo: 'hojo_ujitsuna', ogigayatsu: 'uesugi_tomooki', yamanouchi: 'uesugi_norimasa', koga_kubo: 'ashikaga_haruuji', chiba: 'chiba_masatane',
    satake: 'satake_yoshiatsu', utsunomiya: 'utsunomiya_hisatsuna', yuki: 'yuki_masakatsu', oda_h: 'oda_masaharu',
    uesugi: 'nagao_tamekage', asakura: 'asakura_takakage', wakasa_takeda: 'takeda_motomitsu', hatakeyama_n: 'hatakeyama_yoshifusa',
    date: 'date_tanemune', ashina: 'ashina_morikiyo', anegakoji: 'miki_naoyori',
    rokkaku: 'rokkaku_sadayori', azai: 'azai_sukemasa', ashikaga: 'ashikaga_yoshiharu', hosokawa: 'hosokawa_harumoto',
    hatakeyama_k: 'hatakeyama_tanenaga', kitabatake: 'kitabatake_harutomo', honganji: 'honganji_shonyo',
    akamatsu: 'akamatsu_harumasa', urakami: 'urakami_masamune', amago: 'amago_tsunehisa', ouchi: 'ouchi_yoshitaka', mori: 'mori_motonari',
    kono: 'kono_michinao', chosokabe: 'chosokabe_kunichika', otomo: 'otomo_yoshiaki', shoni: 'shoni_sukemoto', sagara: 'sagara_yoshishige',
    shimazu: 'shimazu_takahisa', ichishiki: 'isshiki_yoshiyuki', motoyama: 'motoyama_shigemune', ota: 'ota_sukeyori', soma: 'soma_akitane',
    nanbu: 'nanbu_yasunobu', kasai: 'kasai_harutane', mogami: 'mogami_yoshimori',
  },
  names: {
    takeda_shingen: ['武田晴信'],
    saito_dosan: ['長井規秀'],
    sue_harukata: ['陶隆房'],
    hojo_ujiyasu: ['北条氏康'],
  },
  ranks: {
    hirate_masahide: 0, oda_nobuyasu_k: 0, taigen_sessai: 0, asahina_yasuyoshi: 0, okabe_chikatsuna: 0, abe_sadayoshi: 0, okubo_tadatoshi: 1,
    saito_dosan: 0, akechi_mitsuyasu: 1, itagaki_nobukata: 0, amari_torayasu: 0, oyamada_nobuari: 0, takato_yoritsugu: 0,
    hojo_genan: 0, daidoji_morimasa: 0, nanbada_norishige: 0, nagano_narimasa: 0, yanada_takasuke: 0, hara_tanekiyo: 0,
    nagao_harukage: 0, asakura_soteki: 0, miyoshi_masanaga: 0, hatano_tanemichi: 0, kizawa_nagamasa: 0, yusa_naganori: 0,
    bessho_naruharu: 0, kodera_norimoto: 0, amago_kunihisa: 0, kamei_hidetsuna: 0, amago_haruhisa: 0,
    sue_okifusa: 0, hironaka_takakane: 1, naito_okimori: 0, shiji_hiroyoshi: 0, ryuzoji_iekane: 0, shimazu_tadayoshi: 0,
  },
  ranksFresh: true,
  guns: {}, // 鉄砲の伝来（1543年）の前
  items: { samonji: ['takeda', 'takeda_nobutora'] }, // 宗三左文字は三好宗三から武田信虎へ（のち今川義元へ）
  treaties: [['hojo', 'imagawa', 12], ['takeda', 'ogigayatsu', 12], ['ouchi', 'otomo', 6]],
  featured: ['oda', 'imagawa', 'takeda', 'hojo', 'uesugi', 'saito', 'asakura', 'rokkaku', 'hosokawa', 'ouchi', 'amago', 'mori', 'otomo', 'shimazu', 'date', 'honganji'],
};
