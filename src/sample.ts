import { PRESETS } from './sections/coverRender'
import { countChars, db, defaultCover, newCharacter, newWork, uid } from './db'

/** 使い方を試すためのサンプル作品（削除して構いません） */
export async function createSampleWork() {
  const mio = newCharacter(0, {
    name: '汐見 ミオ',
    kana: 'しおみ みお',
    role: '主人公',
    age: '17',
    birthday: '潮暦 214年 3月 2日',
    gender: '女性',
    height: '156cm・小柄だが腕っぷしは強い',
    origin: '港町アオミ',
    occupation: '郵便船〈かもめ号〉見習い',
    appearance: '日に焼けた肌、短い黒髪。父の形見の真鍮のコンパスを首から下げている。',
    personality: 'まっすぐで負けず嫌い。考えるより先に体が動く。',
    speech: '一人称は「あたし」。「届けるって決めたら届ける」',
    likes: '朝焼け、塩むすび',
    dislikes: '霧笛の音',
    skills: '手旗信号、ロープワーク',
    motive: '沈んだ街に住んでいた父の行方を知りたい。',
    secret: '父からの最後の手紙を、まだ開けられずにいる。',
    history: [
      { id: uid(), year: '潮暦 228', month: '4', text: 'アオミ港の学舎に入学' },
      { id: uid(), year: '潮暦 230', month: '9', text: '父が「沈んだ街」への便で行方不明になる' },
      { id: uid(), year: '潮暦 231', month: '3', text: '学舎を中退し、かもめ号の見習いになる' },
    ],
    x: 600,
    y: 420,
  })
  const kai = newCharacter(1, {
    name: '灯野 カイ',
    kana: 'ひの かい',
    role: '師匠',
    age: '34',
    occupation: '郵便船〈かもめ号〉船長',
    personality: '寡黙で皮肉屋。仕事には誰より誠実。',
    speech: '「手紙は、待っている人のものだ」',
    motive: '十年前に届けられなかった一通の手紙を、今も探している。',
    x: 900,
    y: 250,
  })
  const toru = newCharacter(2, {
    name: '七瀬 透',
    kana: 'ななせ とおる',
    role: '文通相手',
    age: '18',
    occupation: '沈んだ街の時計職人の息子',
    personality: '穏やかで観察眼が鋭い。',
    motive: '止まった街の時計をもう一度動かしたい。',
    x: 300,
    y: 250,
  })
  const reiko = newCharacter(3, {
    name: '黒崎 澪子',
    kana: 'くろさき れいこ',
    role: '敵',
    age: '41',
    occupation: 'アオミ港湾局長',
    personality: '理知的で冷静。街を守るためなら嘘もつく。',
    secret: '街が沈んだ本当の理由を知っている。',
    x: 760,
    y: 700,
  })
  const yoshi = newCharacter(4, {
    name: 'ヨシ',
    role: '見守る人',
    age: '78',
    occupation: '岬の灯台守',
    x: 300,
    y: 640,
  })
  const rel = (from: string, to: string, label: string, dir: 'one' | 'both' | 'none', color: string) => ({ id: uid(), from, to, label, dir, color })

  const ch1Id = uid()
  const ch2Id = uid()
  const cover = PRESETS.cinema.apply(defaultCover())
  cover.copy = { ...cover.copy, text: '宛先は、海の底の街。' }

  const w = newWork({
    title: '夜明けの郵便船',
    subtitle: 'サンプル作品',
    penName: 'Solo Study',
    genre: '海洋ファンタジー',
    status: '執筆中',
    logline: '海に沈んだ街へ手紙を届ける郵便船の見習い・ミオが、差出人のない一通をきっかけに、街が沈んだ本当の理由に近づいていく。',
    synopsis:
      '港町アオミには、海に沈んだ街へ手紙を運ぶ郵便船がある。見習いのミオは、行方不明の父を探すため船に乗った。\n\nある朝、宛名だけが書かれた差出人不明の手紙が届く。宛先は、十年前に沈んだ時計塔。船長のカイは配達を拒むが、ミオはひとりで海へ出る。\n\n沈んだ街で出会ったのは、止まった時計を守り続ける少年・透だった。',
    theme: '「届かなかった言葉」は、どこへ行くのか。',
    memo: 'これはサンプルです。自由に書き換えたり、作品ごと削除したりして試してください。',
    structure: {
      template: 'kishoutenketsu',
      beats: [
        { id: uid(), label: '起', text: 'アオミ港の日常。ミオは見習いとして雑用ばかり。差出人のない手紙が届く。' },
        { id: uid(), label: '承', text: 'カイの反対を押し切り、ミオは沈んだ街へ。透と出会い、文通が始まる。' },
        { id: uid(), label: '転', text: '手紙の筆跡が父のものだとわかる。港湾局長・澪子が配達を妨害しはじめる。' },
        { id: uid(), label: '結', text: '夜明けの干潮に、時計塔の鐘が鳴る。ミオは父の最後の手紙をようやく開く。' },
      ],
    },
    characters: [mio, kai, toru, reiko, yoshi],
    relations: [
      rel(mio.id, kai.id, '師匠・憧れ', 'one', '#3D4A5C'),
      rel(kai.id, mio.id, '放っておけない', 'one', '#4E6352'),
      rel(mio.id, toru.id, '文通相手', 'both', '#7A5E6E'),
      rel(reiko.id, kai.id, '元同僚・因縁', 'both', '#7A4E4E'),
      rel(reiko.id, toru.id, '監視', 'one', '#7A4E4E'),
      rel(yoshi.id, mio.id, '見守る', 'one', '#7A6A4E'),
    ],
    music: [
      { id: uid(), title: 'ミオのテーマ（曲名を入れてください）', artist: '', url: '', fileId: null, scene: '朝焼けの海、まっすぐ走り出す感じ', characterIds: [mio.id], chapterIds: [ch1Id], beatIds: [] },
      { id: uid(), title: '沈んだ街（曲名を入れてください）', artist: '', url: '', fileId: null, scene: '水の底の静けさ、止まった時計', characterIds: [toru.id], chapterIds: [ch2Id], beatIds: [] },
    ],
    cover,
  })

  const ch1 =
    '霧笛が三度鳴って、アオミの港は朝になる。\n\nミオは桟橋の端で、濡れたロープを肩に担いでいた。〈かもめ号〉の甲板では、船長のカイがいつものように黙って海図を広げている。\n\n「見習い。今日の便は」\n「沈んだ街行き、四十二通。……と、宛名だけのが一通」\n\nカイの手が止まった。'
  const ch2 = '差出人の欄は、白いままだった。\n\n宛先には、細い字でこう書かれている。\n――時計塔、最上階。'
  w.charCount = countChars(ch1) + countChars(ch2)

  await db.transaction('rw', db.works, db.chapters, async () => {
    await db.works.add(w)
    await db.chapters.bulkAdd([
      { id: ch1Id, workId: w.id, title: '第一章　霧の朝', order: 1, body: ch1, memo: '', updatedAt: Date.now() },
      { id: ch2Id, workId: w.id, title: '第二章　差出人のない手紙', order: 2, body: ch2, memo: '', updatedAt: Date.now() },
    ])
  })
  return w.id
}
