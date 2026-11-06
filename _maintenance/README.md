# flare-songs 保守・回帰テスト

本体checkoutの公開ファイルを直接検証します。旧worktree・siteコピー・環境変数による対象の差替えはありません。製品にビルドやnpm依存を追加するものではありません。

## Windows PowerShellで初回実行

必要：Git、Node.js **22系**（移行確認：22.17.0／npm 10.9.2）、PowerShell、インターネット接続。checkoutの場所は自由です。

```powershell
Set-Location 'C:\path\to\flare-songs' # 自分のcheckout先に置き換える
Set-Location _maintenance
npm ci
npx playwright install chromium
npm test
if ($LASTEXITCODE -ne 0) { throw '回帰テスト失敗。artifactsの今回runを確認してください' }
```

`npm ci`はlockからPlaywright Test **1.64.1**、Bootstrap **5.3.2**、PapaParse **5.3.2**を導入します。初回移行では旧キットの版を維持しました。ライブラリの更新は別の変更として扱います。ブラウザはPlaywright管理Chromium、worker **1**、自動再試行 **0**。Chromeのインストール場所は指定しません。

組織のプロキシ／独自CAがあるPCでは、管理者が指定するCAを`NODE_EXTRA_CA_CERTS`へ設定してください。TLS検証を無効化する手順は使いません。通常のPCでは不要です。権限・接続エラーはテスト成功ではありません。

## 実行コマンド

| コマンド（_maintenanceで実行） | 内容 |
| --- | --- |
| `npm test` | hash／依存／台帳検査→単体→固定ブラウザ。CSV・画像は固定応答、ライブラリは公開vendor実ファイルのHTTP取得・hash照合。CDN通信は失敗。Ruby不要 |
| `npm run test:unit` | Node標準test。サーバー基盤検査も含む |
| `npm run test:browser` | 固定ブラウザ、F02の36条件、project subpathの確認 |
| `npm run test:live` | **明示的な実通信**。現在のCSV・画像と同一originのvendor実ファイルを確認。通常PRの合格条件には含めない |
| `npm run test:pages` | github-pages 232／Jekyll 3.10.0で実ビルドし、公開物を比較。Ruby／Bundler依存の導入が別途必要 |
| `npm run verify` | snapshotのバイト列・SHA-256・導入版・174件台帳の整合 |

各実行で`artifacts/<UTC日時>-<mode>-<乱数>/`を新規作成します。`run.json`に対象checkoutのSHA、dirty状態、公開ソースhash、fixture hash、lock hash、Node／OS、開始・終了、各stageの成功／失敗／未実行を記録します。NodeのTAP・JUnit、PlaywrightのJSON・JUnitを確認してください。ブラウザ失敗時のtraceはPlaywright標準の`retain-on-failure`で保存します。**前回のJSONを今回の成功とみなしません。** `running`のままなら強制終了等で未完了です。

固定回帰は、初回移行の旧174件の目的を167ケースへ整理し、F02の36ケース、F07の基盤単体6ケースとproject subpath 1ケースを加えています。1ケース内に複数のassertionや幅・テーマ条件があります。全件と変更理由は[移行台帳](docs/test-map.md)、機械可読版は[JSON](docs/migration-map.json)を参照してください。

F10では旧210件の目的を維持し、単体5件・ブラウザ3件を追加した**218件（74＋144）**を実行します。[vendor・ライセンス・テストの変更](docs/vendor-assets.md)を参照してください。

BASE-B01～B12は旧資産の一連の操作を同一contextで検証します。操作を独立テストへ分割したり、並列化したりする際は状態の引継ぎを明示して再設計してください。各testの登録・成否はPlaywright Testが管理します。

BASE-B09は自然な折り返しを許容し、文字・アイコンの収まりと非重複、操作可能な高さを確認します。お気に入り切替の3状態と、判定自体の見切れ／重なり／高さ不足の検出も含みます。[判定条件と修正理由](docs/responsive-checks.md)を参照してください。

## 構成と新しい改修

```text
tests/unit/           Node test、VMから現物script.jsを検証
tests/browser/        固定回帰（Playwright Test）
tests/live/           実通信のみ
helpers/              対象解決、動的server、通信guard、独立した期待値
fixtures/snapshots/   変更しない2種類のCSVとhash manifest
fixtures/synthetic/   合成画像（小さなCSVは各シナリオに定義）
docs/                 移行台帳、データ更新、手動確認
tools/                実行・結果・Pages出力の検査
artifacts/            今回のログ・画面・trace・live応答（Git対象外）
```

1. 仕様に対応するsuiteを選び、単体または`test('Fxx-...')`のブラウザシナリオを追加する。
2. 最小の合成データで入力・操作・期待値を記述する。乱数は固定し、偶然異なる順になることだけを判定しない。
3. ブラウザは`helpers/browser.cjs`の`suite()`と`runtime.browser.newContext()`を使用する。全contextの外部URLとpageerrorを検査する。未知の通信をabortして隠すだけでは成功しない。
4. 専用routeが必要でもこのcontextを使う。ライブラリをmockせず公開vendorの実ファイルを取得する。missing／throwsを意図的に注入するケースだけexpectedVendorFaultsを明示し、エラー状態を検証する。製品と異なる版を黙って代用しない。
5. 通常は`helpers/view.cjs`の`mockData`／`settle`を使う。loading/errorや実タイムアウト等、完了条件が異なる試験はその条件を明記する。
6. `npm test`を実行する。公開除外やファイルを追加した場合はPagesも検査する。今後のsnapshot更新は[データ更新手順](docs/data-update.md)に従う。
7. テストの都合で製品関数をexportしたり、待機を長くして失敗を隠したりしない。期待値を変える場合は仕様と理由をPRに記載する。

単一ケースを調べる場合（レポートも新しい専用フォルダにする）：

```powershell
$env:FLARE_RUN_DIR = Join-Path (Get-Location) ('artifacts/debug-' + [guid]::NewGuid())
npx playwright test --grep F06-B02
Remove-Item Env:FLARE_RUN_DIR
```

サーバーは空きportで起動し、health probe後にテストを開始、suite終了で閉じます。project Pagesの`/flare-songs/`も確認します。`FLARE_SITE_ROOT`・`FLARE_VALIDATION_DIR`・`FLARE_BROWSER`等の旧変数は使いません。

## Pagesの公開除外とCI

現在のmain直下のJekyll公開を維持します。rootの`_config.yml`はJekyll 3の既定exclude全7項目を維持し、`_maintenance/`を追加します。`.nojekyll`は追加しません。

Ruby 3.3系（CIでは3.3.10）とBundler 2.5.22を利用できる環境では：

```powershell
bundle install
npm run test:pages
```

WindowsではRubyInstaller＋Devkitが必要な場合があります。通常の`npm test`にRubyは不要です。CIのUbuntuでPages検査を必ず行います。

Pages検査は公開19ファイル（F10のvendor／map／LICENSEを含む）だけの参照ソースと、**実checkout全体**をそれぞれgithub-pagesの既定plugin・theme・safe設定で生成し、出力ファイル集合とhashを比較します。CSS／JS／画像等の静的ファイルは入力とも比較します。ライセンスMarkdown等のJekyll変換後も同じか確認します。生成物にCSV、tests、dependencies、ログ等が混入すれば失敗します。新しい公開ファイルを意図的に増やす際は`fixtures/public-files.json`もレビューして更新してください。

**外部からの着信許可・ファイアウォール設定変更は不要です。** Jekyllは`Site#process`による生成だけで、serve／watch／LiveReloadを起動しません。Rubyのビルドプロセスではbind／listen／connectを拒否し、4つの拒否probeも実行します。GitHub metadata pluginは固定版のofflineモードと固定の公開情報で動かし、DNS照会・GitHub APIアクセスを行いません。これはテストだけの設定で、本体のPages設定や公開内容を変えるものではありません。依存を取得する`bundle install`／`npm ci`と、明示的なliveコマンドには外向き通信が必要です。Nodeの検証serverは`127.0.0.1`の空きportだけで待受します。

`.github/workflows/quality.yml`はPR・main push・手動実行で、Ubuntu 24.04／Chromium／worker1の固定回帰と実Pagesビルド比較を行います。権限はcontents:readのみ、deployなし、個人token・Sheets認証なし。各回の対象・hash・環境・成否・JUnit等の小さなsummaryを保存し、失敗時だけ詳細ログ・trace・画面を追加保存します（7日間）。liveは含めません。

このworkflowだけではブランチ公開のdeployを停止できません。required check・ブランチ保護・Pages設定の変更は別途利用者が判断します。未実行のGitHub Actionsを成功と報告しないでください。
