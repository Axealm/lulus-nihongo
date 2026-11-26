# Lulus Nihongo

インドネシア語で使える、JFT-Basic(国際交流基金 日本語基礎テスト)対策の Web アプリ(PWA)。
国際交流基金の公式アプリではない。「Lulus Nihongo」はインドネシア語で「日本語に合格」の意味。

- 4 セクション(文字と語彙、会話と表現、聴解、読解)の練習問題と、インドネシア語の解説
- 本番形式の模擬試験(制限時間、聴解は 2 回まで再生、前のセクションに戻れない)
- ログインなし、サーバーなし。学習記録は端末内に保存する
- 一度読み込めばオフラインでも使える

現在の内容(2026-11-25):

- 練習問題 200 問(各セクション 50 問。10 問 × 5 セット)
- 模擬試験 1 回分(50 問・60 分。練習問題とは別の問題)
- 聴解の音声 62 本

選択肢は本番と同じ 3 つ。

## 必要なもの

- Node.js 24 以上
- 音声を作るときだけ: VOICEVOX、ffmpeg

## 使い方

```
npm install        依存パッケージを入れる(最初の 1 回)
npm run dev        開発用サーバーを起動する(http://localhost:5173)
npm test           自動テストを実行する
npm run validate   問題データを検証する
npm run build      検証 → 型チェック → 本番用ビルド(dist/ に出力)
npm run preview    ビルドしたものを手元で確認する(http://localhost:4173)
npm run review     全問題を読みやすく並べた content-review.md を作る(中身の確認用)
```

オフライン動作(Service Worker)は `npm run dev` では働かない。`npm run build` のあと `npm run preview` で確認する。

## フォルダ構成

```
content/            問題データ(コードとは別に管理する)
  questions/        問題本体。練習は <セクション>-<番号>.json、模擬試験は mock-<番号>.json
  translations/id/  インドネシア語の設問訳と解説(questions/ と同じファイル名)
  sets.json         練習セット
  exams.json        模擬試験の構成
  ui/id.json        画面の文言
  meta.json         音声のクレジット
public/audio/       聴解の音声(MP3)
public/icons/       アプリのアイコン
scripts/            問題データの検証、音声の生成
src/domain/         採点、試験中の制限、データ検証(画面に依存しない)
src/storage/        端末内保存
src/ui/             画面
tests/              自動テスト
site/               検索から人を呼ぶための記事(インドネシア語)。書き方は site/README.md
```

## 問題を追加する

1. `content/questions/` のファイルに問題を追加する(新しいファイルを作ってもよい。フォルダ内の JSON はすべて読み込まれる)。
   - ID は `voc-`、`con-`、`lis-`、`rea-` で始める。練習は 0001 から、模擬試験は 1001 からの連番。
   - 選択肢は本番と同じ 3 つにする。
   - 表記は本番に合わせて分かち書き(語のあいだに空白)にする。ふりがなは付けない。
   - 下線を引きたい部分は `__` で囲む(例: `__会社__`)。
2. `content/translations/id/` の同じ名前のファイルに、同じ ID で `instruction`(設問の訳)と `explanation`(解説)を追加する。
3. `content/sets.json` の練習セットや、`content/exams.json` の模擬試験に ID を追加する。
4. 聴解の問題は `audio` と `transcript` を書き、下の手順で音声を作る。
5. `npm run validate` で確認する。不備があれば、どの問題の何が問題かが表示される。

### 聴解の音声を作る

`transcript` は 1 行ごとに `おんな：…` または `おとこ：…` の形で書く。数字はひらがなで書くと読み間違いが起きにくい。

1. VOICEVOX を起動する。
2. `npm run audio -- --dry-run` で読み方を確認する。かな書きの「は」は読み間違いが起きやすい。助詞の「は」が「ハ」と読まれている行や、語頭の「は」が「ワ」と読まれている行があれば、文を直す(例: 「かたは」→「おきゃくさまは」、「ははが」→「母が」、「はいる」→「入る」)。
3. `npm run audio` を実行する(まだ音声がない問題だけ作る。作り直すときは `npm run audio -- --force`)。
4. VOICEVOX を終了する。

文字起こしを直した問題は、その音声ファイルを消してから `npm run audio` を実行する。

使用している声は、四国めたん(女性)と玄野武宏(男性)。声を変えたら `content/meta.json` のクレジットも直す。

## 言語を追加する

1. `content/ui/<言語コード>.json` に画面の文言を置く(キーは `id.json` と同じ)。
2. `content/translations/<言語コード>/` に、全問題分の設問訳と解説を置く。
3. 言語を選ぶ画面はまだない。`src/storage/storage.ts` の `DEFAULT_SETTINGS` が既定の言語を決めている。

## 誤り報告フォームを有効にする

1. Google フォームで、「問題 ID」「アプリのバージョン」「内容」の 3 項目を持つフォームを作る。
2. フォームの「事前入力した URL を取得」で URL を作り、問題 ID の値を `{id}`、バージョンの値を `{version}` に書き換える。
3. `.env.example` を `.env` にコピーし、`VITE_REPORT_FORM_URL` にその URL を書いてビルドする。

未設定のあいだ、「Laporkan kesalahan(誤りを報告)」ボタンは表示されない。

現在の状態(2026-11-25): フォーム「Lulus Nihongo - Laporkan kesalahan」を作成済みで、URL は `.env.production` に書いてある(本番用ビルドでだけ読み込まれる。`npm run dev` ではボタンは出ない)。フォームはメールアドレスを集めず、ログインなしで回答できる。届いた報告は、オーナーの Google フォームの「回答」タブで見られる。新しい回答が届くと、オーナーの Google アカウントのメールに通知が届く(2026-11-26 に設定)。

## 記事(Panduan)

`https://lulusnihongo.com/panduan/` に、JFT-Basic の解説、JLPT N4 との比較、勉強法、特定技能の条件と流れ、育成就労、日本の給料、日本の生活費の記事がある(7 本。2026-11-25 に 4 本、11-26 に 3 本を公開)。給料と生活費の記事は毎年変わる統計を使っているので、site/README.md の「数字の更新時期」に沿って見直す。アプリのホーム画面の「Panduan」から開ける。

同じ場所に、問題の見本ページ(各セクション 10 問、計 40 問。`/panduan/contoh-soal-jft-basic/`)と、運営者と編集方針のページ(`/panduan/tentang/`)もある。検索から人を呼ぶための対策の一覧は site/README.md の「検索対策(SEO)として入れてあるもの」にある。

記事の本文は `site/articles/` の Markdown で、`npm run build` のときにページ、`sitemap.xml`、`robots.txt` が作られる。書き方と方針(出典を付ける、確認できない数字は書かない、誇張しない)は site/README.md にある。

`npm run dev` では記事は表示されない。`npm run build` のあと `npm run preview` で確認する。

## 学校・企業向けの問い合わせフォーム

紹介画面(Tentang aplikasi)に「Hubungi kami」のリンクが出る。リンク先は Google フォーム「Lulus Nihongo - Kontak untuk LPK, sekolah, dan perusahaan」(2026-11-25 作成)で、URL は `.env.production` の `VITE_CONTACT_FORM_URL` に書いてある。未設定のあいだ、リンクは表示されない。

質問は、団体名(必須)、名前と役職、連絡先(必須)、問い合わせ内容(必須)の 4 つ。ログインなしで回答できる。届いた問い合わせは、オーナーの Google フォームの「回答」タブで見られる。新しい回答が届くと、オーナーの Google アカウントのメールに通知が届く(2026-11-26 に設定)。

## 公開する

`npm run build` でできた `dist/` を、静的ホスティング(Cloudflare Pages など)に置く。サーバー側の処理は不要。

公開先は https://lulusnihongo.com (独自ドメイン。2026-11-26 に購入)。最初の公開先 https://lulus-nihongo.pages.dev (2026-11-25 公開)でも同じ内容が開く。古い URL から新しい URL への転送は設定していない(学習記録は URL ごとに端末に保存されるため、転送すると古い URL で使っていた人の記録が見えなくなる)。更新するときは `npm run deploy` を実行する(ビルドして本番に公開する。Cloudflare にログイン済みの PC で実行すること)。
`public/_headers` にキャッシュの設定がある(Cloudflare Pages と Netlify が読む形式)。

## 得点について

本番の得点(10〜250 点)は換算方法が公開されていない。このアプリは正答率から直線で換算した「目安の得点」を表示する(`src/domain/scoring.ts`)。

## 注意

- インドネシア語の文言と解説は AI による翻訳で、ネイティブの確認を受けていない。
- 問題と解説はすべてこのアプリ用に作ったもので、本番の問題ではない。
- 音声は VOICEVOX で生成している。2 つの声とも商用・非商用で使えるが、クレジット表記が必要(アプリの「Tentang aplikasi」画面に表示している)。アプリを有料にする、または法人に提供するときは、規約を読み直すこと。
- 「JFT-Basic」は国際交流基金の登録商標(登録 6272438、6367895)。アプリ名には使わず、「何の試験の対策か」を説明する文の中でだけ使う。公式のロゴは使わない。アプリ名を変えるときは、`content/ui/id.json`、`index.html`、`vite.config.ts` の 3 か所を直す。
