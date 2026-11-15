// 序幕: シナリオを始める前に見せる、その時代の背景の紹介
// 場面は「語り」（年号の見出しと地の文）か「人物」（顔とセリフ）。背景はタイトルの暗い日本地図で、場面ごとに寄せる場所・光らせる家・進軍の矢印を決める
// 語りは言い切らず「伝わる」「言われる」で（逸話・諸説のあることは断定しない）
export interface OpeningBeat {
  head?: string; // 語りの見出し（年号・国）
  text: string; // 語りの文、または人物のセリフ
  who?: string; // 人物の武将id（顔）。あればセリフとして出す
  name?: string; label?: string; // 人物の名と肩書き
  at?: string | null; // 寄せる城のid（null は日本全体）
  zoom?: number;
  light?: string[]; // 光らせる家（ほかは沈める）
  mark?: string[]; // 光る輪を出す城のid
  arrow?: [string, string][]; // 進軍の矢印（城のidから城のidへ）
  sound?: string; // その場面で鳴らす効果音（ゲームの途中の場面だけ）
  alt?: string; // 逸話: who の武将がゲームにいない・死んでいるときに代わりに出す語り（なければその一枚を飛ばす）
  need?: string; // 逸話: この武将がいるときだけ出す一枚
  bg?: string; // 背景の絵（SCENE_ART のキー。絵が届いていなければ地図のまま）。ゲームの途中の場面だけ
}

export const OPENINGS: Record<string, OpeningBeat[]> = {
  '1536': [
    { head: '天文五年', text: '応仁の乱から七十年。将軍は京を追われては戻り、管領の細川家は内輪で争い、諸国では守護の家臣たちが主家を凌ぎはじめていた。', at: null },
    { head: '駿河', text: '今川家では当主の氏輝が急死し、家督をめぐって兄弟が争った。花倉の乱である。勝ったのは、寺から還俗した十八歳の義元だった。', at: 'sunpu', zoom: 1.7, light: ['imagawa'] },
    { who: 'taigen_sessai', name: '太原雪斎', label: '義元の師', text: '若殿、いや殿。今川の家は、これからが正念場にござる。甲斐とも相模とも、うまく渡り合わねばなりませぬ。', at: 'sunpu', zoom: 1.7, light: ['imagawa'] },
    { head: '甲斐・相模', text: '甲斐では武田信虎が国人たちを力で抑えて国を一つにし、相模では伊勢宗瑞の子・北条氏綱が武蔵へ兵を進めている。', at: 'odawara', zoom: 1.2, light: ['takeda', 'hojo', 'ogigayatsu'] },
    { who: 'takeda_nobutora', name: '武田信虎', label: '甲斐の守護', text: '甲斐は一つになった。だが、山の国は貧しい。ならば外から奪うまでよ。', at: 'tsutsujigasaki', zoom: 1.6, light: ['takeda'] },
    { who: 'hojo_ujitsuna', name: '北条氏綱', label: '相模の二代目', text: '伊勢の家が北条を名乗るのは、関東を治めるためだ。扇谷上杉の時代は終わらせる。', at: 'odawara', zoom: 1.6, light: ['hojo'] },
    { head: '尾張・美濃', text: '尾張では津島の湊を握る織田信秀が頭角を現し、美濃では守護土岐家の重臣・長井規秀が、主家を凌ぐ力を蓄えつつあった。', at: 'kiyosu', zoom: 1.6, light: ['oda', 'saito'] },
    { who: 'saito_dosan', name: '長井規秀', label: '土岐家の重臣', text: '守護の家柄など、飾りにすぎぬ。美濃を治めるのは、治める力のある者よ。', at: 'inabayama', zoom: 1.7, light: ['saito'] },
    { head: '京', text: '京では、細川晴元が将軍足利義晴を擁して畿内を握る。だがその足元では、三好の若き当主が、父を死に追いやった晴元への恨みを胸に秘めていた。', at: 'kyo', zoom: 1.6, light: ['hosokawa', 'ashikaga'] },
    { head: '西国', text: '西では、周防の大内義隆と、出雲の尼子経久が、石見の銀山と安芸の国人たちをめぐって睨み合う。その狭間に、毛利元就という男がいた。', at: 'koriyama', zoom: 1.1, light: ['ouchi', 'amago', 'mori'] },
    { who: 'amago_tsunehisa', name: '尼子経久', label: '出雲の老雄', text: '城を奪われた牢人から、ここまで来た。大内を倒すまでは、まだ死ねぬ。', at: 'gassantoda', zoom: 1.7, light: ['amago'] },
    { head: '天文五年六月', text: '下剋上の風は止まない。この乱世から、天下を握る者は現れるのか。', at: null },
  ],
  '1552': [
    { head: '天文二十一年', text: '応仁の乱から八十余年。将軍の威光は地に落ち、諸国では力のある者が主を倒して国を奪う。世の人はこれを「下剋上」と呼んだ。', at: null },
    { head: '美濃', text: '京の油売りから身を起こし、ついに美濃一国を手に入れた男がいると伝わる。近年では、父と子の二代がかりの国盗りだったとも言われる。', at: 'inabayama', zoom: 1.6, light: ['saito'], mark: ['inabayama'] },
    { who: 'toki_yorinori', name: '土岐頼芸', label: '美濃の守護', text: 'あの男を重く用いたのが過ちであった……。この美濃は、もはや土岐の国ではない。', at: 'inabayama', zoom: 1.6, light: ['saito'] },
    { who: 'saito_dosan', name: '斎藤道三', label: '美濃の蝮', text: '守護の家柄が何だというのだ。国は、治める力のある者のものよ。', at: 'inabayama', zoom: 1.6, light: ['saito'] },
    { head: '尾張', text: '隣の尾張では、津島の湊を押さえて富んだ織田信秀が「尾張の虎」と呼ばれ、今川・斎藤と戦い続けた。だがこの年の三月、信秀は病に倒れた。', at: 'kiyosu', zoom: 1.6, light: ['oda'], mark: ['kiyosu'] },
    { who: 'oda_nobuhide', name: '織田信秀', label: '在りし日の尾張の虎', text: '三郎よ。尾張は四方が敵ぞ。……その目で、よう見ておけ。', at: 'kiyosu', zoom: 1.6, light: ['oda'] },
    { head: '尾張', text: '家督を継いだのは、十九歳の嫡男・信長。奇妙な身なりで町を駆け回る「うつけ」と噂され、父の葬儀では位牌に抹香を投げつけたと伝わる。', at: 'kiyosu', zoom: 1.6, light: ['oda'] },
    { who: 'hirate_masahide', name: '平手政秀', label: '信長の傅役', text: '若殿……。このままでは織田の家が保ちませぬ。この平手、命に代えてもお諫め申さねば。', at: 'kiyosu', zoom: 1.6, light: ['oda'] },
    { who: 'nohime', name: '濃姫', label: '道三の娘・信長の妻', text: '父上は、殿がまことのうつけならこれで刺せと、この懐剣をくださいました。……さて、どちらに向けることになりましょう。', at: 'kiyosu', zoom: 1.4, light: ['oda', 'saito'] },
    { head: '駿河', text: '東では「海道一の弓取り」今川義元が、師の太原雪斎とともに三河を呑み、尾張をうかがう。三河の松平の幼い嫡子は、人質として駿府にあった。', at: 'sunpu', zoom: 1.2, light: ['imagawa'], arrow: [['sunpu', 'okazaki']] },
    { who: 'taigen_sessai', name: '太原雪斎', label: '今川の軍師', text: '三河はすでに今川の庭にござる。次は尾張。急ぐことはない、熟した柿は落ちるのを待てばよい。', at: 'sunpu', zoom: 1.2, light: ['imagawa'] },
    { head: '周防', text: '西では、京の文化を愛して山口を「西の京」と栄えさせた大内義隆が、前の年に重臣の陶晴賢に背かれ、自害して果てた。', at: 'konomine', zoom: 1.3, light: ['ouchi'], mark: ['konomine'] },
    { who: 'ouchi_yoshitaka', name: '大内義隆', label: '西国の雅な主', text: '歌と書と、唐土の文物を愛でた日々も……ここまでか。', at: 'konomine', zoom: 1.3, light: ['ouchi'] },
    { who: 'sue_harukata', name: '陶晴賢', label: '大内の重臣', text: '文弱の主では、大内の家は守れぬ。家を守るためには、主をも替える。', at: 'konomine', zoom: 1.3, light: ['ouchi'] },
    { head: '天文二十一年四月', text: '主を討ち、国を奪い、家を継ぐ。乱世の只中で、群雄の戦いが始まる。', at: null },
  ],
  '1560': [
    { head: '永禄三年五月', text: '駿河・遠江・三河の三国を治める今川義元が、二万五千ともいわれる大軍を率いて尾張へ向かった。', at: 'okazaki', zoom: 1.4, light: ['imagawa'], arrow: [['sunpu', 'narumi']] },
    { who: 'imagawa_yoshimoto', name: '今川義元', label: '海道一の弓取り', text: '尾張の小倅など、ひと揉みよ。この戦で、尾張を今川のものとする。', at: 'okazaki', zoom: 1.4, light: ['imagawa'] },
    { who: 'tokugawa_ieyasu', name: '松平元康', label: '今川の先鋒', text: '大高の城へ兵糧を入れよとの仰せ。……織田の砦の目の前を、抜けねばならぬ。', at: 'narumi', zoom: 1.7, light: ['imagawa', 'matsudaira'], mark: ['narumi'] },
    { head: '清洲', text: '織田の兵は今川の十分の一にも満たない。城に籠もるか、打って出るか。重臣たちの評定は割れたという。', at: 'kiyosu', zoom: 1.7, light: ['oda'], mark: ['kiyosu'] },
    { who: 'oda_nobunaga', name: '織田信長', label: '尾張の若き当主', text: '人間五十年、下天のうちをくらぶれば、夢幻のごとくなり……。出陣じゃ！', at: 'kiyosu', zoom: 1.7, light: ['oda'] },
    { who: 'yanada_masatsuna', name: '簗田政綱', label: '物見', text: '申し上げます！ 今川の本陣、桶狭間山にて休んでおりまする！', at: 'narumi', zoom: 1.9, light: ['oda', 'imagawa'], arrow: [['kiyosu', 'narumi']] },
    { head: '桶狭間', text: 'にわかに激しい雨が降り、あたりは閉ざされた。雨が上がると同時に、織田の兵は今川の本陣へ突きかかった。', at: 'narumi', zoom: 2, light: ['oda', 'imagawa'], mark: ['narumi'] },
    { who: 'mori_yoshikatsu', name: '毛利新介', label: '信長の馬廻', text: '今川治部大輔どの、毛利新介が討ち取ったり！', at: 'narumi', zoom: 2, light: ['oda', 'imagawa'] },
    { head: '岡崎', text: '大将を失った今川勢は崩れた。松平元康は今川の城を捨てて本国の岡崎に戻り、自らの足で立つ道を歩み始める。', at: 'okazaki', zoom: 1.6, light: ['matsudaira'], mark: ['okazaki'] },
    { head: '永禄三年六月', text: '東海の均衡は崩れた。尾張の若き当主は、ここから天下へ歩み出すのか。そして諸国の群雄は──。', at: null },
  ],
  '1582': [
    { head: '天正十年', text: '三月、織田信長は甲斐の武田を滅ぼした。畿内から東国まで、天下はその手に収まりつつある。', at: 'kannonji', zoom: 1.1, light: ['oda', 'akechi', 'hashiba', 'shibata', 'takigawa'] },
    { who: 'oda_nobunaga', name: '織田信長', label: '天下人', text: '毛利を下せば、西国も定まる。わしも中国へ出向くとしよう。', at: 'kannonji', zoom: 1.1, light: ['oda', 'akechi', 'hashiba', 'shibata', 'takigawa'] },
    { head: '備中', text: '羽柴秀吉は備中高松の城を水攻めにし、毛利の大軍と向かい合っていた。', at: 'bitchu_matsuyama', zoom: 1.4, light: ['hashiba', 'mori'], mark: ['bitchu_matsuyama'] },
    { who: 'kinoshita_tokichiro', name: '羽柴秀吉', label: '中国攻めの大将', text: '上様の御出馬を仰ぎ、毛利を一気に片付けまする。', at: 'bitchu_matsuyama', zoom: 1.4, light: ['hashiba', 'mori'] },
    { head: '六月二日', text: '夜明け前。中国へ向かうはずの明智光秀の軍勢一万三千が、京へ向きを変えた。', at: 'kyo', zoom: 1.7, light: ['akechi'], arrow: [['yagi', 'kyo']] },
    { who: 'akechi_mitsuhide', name: '明智光秀', label: '惟任日向守', text: '敵は、本能寺にあり。', at: 'kyo', zoom: 1.8, light: ['akechi'], mark: ['kyo'] },
    { who: 'oda_nobunaga', name: '織田信長', label: '本能寺', text: '是非に及ばず。', at: 'kyo', zoom: 1.9, light: ['akechi'], mark: ['kyo'] },
    { head: '本能寺', text: '寺は炎に包まれ、信長は自害したと伝わる。二条御所にいた嫡男の信忠も討たれた。', at: 'kyo', zoom: 1.9, light: ['akechi'] },
    { head: '諸国へ', text: '知らせは諸国に走った。備中の秀吉へ、越中魚津の柴田勝家へ、上野の滝川一益へ、そして堺にいた徳川家康へ。', at: null, light: ['hashiba', 'shibata', 'takigawa', 'matsudaira'] },
    { who: 'shibata_katsuie', name: '柴田勝家', label: '北陸の大将', text: '上様の仇、この勝家が討たずして誰が討つ！', at: 'toyama_c', zoom: 1.3, light: ['shibata'] },
    { who: 'tokugawa_ieyasu', name: '徳川家康', label: '織田の盟友', text: '……いまは生きて三河へ帰ることだ。伊賀の山を越える。', at: 'kishiwada', zoom: 1.4, light: ['matsudaira'], arrow: [['kishiwada', 'okazaki']] },
    { head: '天正十年六月', text: '主を失った織田の天下を、誰が継ぐのか。', at: null },
  ],
  '1600': [
    { head: '慶長三年八月', text: '太閤豊臣秀吉が伏見城で没した。跡を継ぐ秀頼はまだ六歳。政は五大老と五奉行に託された。', at: 'kyo', zoom: 1.4, light: ['toyotomi', 'matsudaira', 'mori', 'urakami', 'uesugi', 'maeda'] },
    { head: '五大老の筆頭', text: '筆頭の徳川家康は、禁じられた大名どうしの縁組を進め、天下の政を思うままに動かし始めた。前田利家が没すると、それを抑える者はいなくなった。', at: 'kyo', zoom: 1.4, light: ['matsudaira'] },
    { head: '慶長五年六月', text: '家康は、会津の上杉景勝に謀反の疑いありとして、諸大名を率いて東へ下った。', at: 'kurokawa', zoom: 1.2, light: ['matsudaira', 'uesugi'], arrow: [['kyo', 'edo'], ['edo', 'kurokawa']] },
    { who: 'higuchi_kanetsugu', name: '直江兼続', label: '上杉の執政', text: '会津に謀反の企てなどござらぬ。それでも攻めると申されるなら、いつでもお相手いたそう。', at: 'kurokawa', zoom: 1.4, light: ['uesugi'] },
    { head: '佐和山', text: '家康が去った上方で、佐和山に退いていた石田三成が動いた。越前敦賀の大谷吉継を招き、ともに起とうと打ち明けた。', at: 'sawayama', zoom: 1.7, light: ['ishida', 'otani'], mark: ['sawayama'] },
    { who: 'otani_yoshitsugu', name: '大谷吉継', label: '敦賀の城主', text: '勝ち目は薄い。治部、そなたは人に好かれぬ。……だが、友を見捨ててはおけぬ。この命、預けよう。', at: 'sawayama', zoom: 1.7, light: ['ishida', 'otani'] },
    { head: '七月十七日', text: '三成らは毛利輝元を大坂城に迎えて西軍の総大将とし、家康の罪を数える「内府ちかひの条々」を諸国に送った。', at: 'ishiyama', zoom: 1.5, light: ['toyotomi', 'mori', 'ishida', 'urakami'], mark: ['ishiyama'] },
    { who: 'ishida_mitsunari', name: '石田三成', label: '五奉行', text: '内府は太閤殿下のご遺命に背いた。秀頼様の御為に、これを討つ。', at: 'ishiyama', zoom: 1.5, light: ['toyotomi', 'ishida'] },
    { head: '伏見', text: '家康が留守を託した伏見城には、鳥居元忠がわずかな兵とともに残っていた。西軍の大軍がこれを囲む。', at: 'kyo', zoom: 1.7, light: ['matsudaira'], mark: ['kyo'] },
    { who: 'torii_mototada', name: '鳥居元忠', label: '伏見城の留守居', text: '殿、天下を取られませ。この元忠は、ここで死にまする。', at: 'kyo', zoom: 1.7, light: ['matsudaira'] },
    { head: '下野・小山', text: '知らせは下野にいた家康のもとへ届いた。従ってきた諸将の多くは、三成を憎む豊臣恩顧の大名である。', at: 'utsunomiya', zoom: 1.3, light: ['matsudaira', 'fukushima', 'kuroda', 'ikeda', 'yamauchi'] },
    { who: 'fukushima_masanori', name: '福島正則', label: '尾張清洲の城主', text: '秀頼様に弓引くのではない。三成めを討つのだ。この正則、内府殿にお味方いたす！', at: 'utsunomiya', zoom: 1.3, light: ['matsudaira', 'fukushima'] },
    { who: 'tokugawa_ieyasu', name: '徳川家康', label: '五大老の筆頭', text: '……上杉は捨て置く。西へ戻るぞ。', at: 'edo', zoom: 1.1, light: ['matsudaira'], arrow: [['edo', 'kiyosu']] },
    { head: '慶長五年七月', text: '東の家康、西の三成。諸国の大名は、いずれにつくかを迫られた。', at: null, light: ['matsudaira', 'toyotomi'] },
  ],
};
