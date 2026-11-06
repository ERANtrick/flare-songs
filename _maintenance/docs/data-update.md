# CSV・依存・fixtureの更新

日常のGoogleスプレッドシート更新では固定fixtureを変更しません。`npm test`は保存データのコード回帰、`npm run test:live`は今の公開データと外部サービスの確認です。

## 固定fixture

`fixtures/snapshots/manifest.json`がバイト数・SHA-256・固有の2763／2733／681／205件を記録します。正常snapshotは警告0、過去snapshotはデータ行2763「絶対零度」の空名パラメータ`?=0`の警告1件です。UTF-8・BOM・改行を含めて元のバイト列を保存します。`.gitattributes`の`-text`を外さないでください。

新しい固定データが必要になった場合：

1. liveコマンドの今回runから取得時刻・元URL・レスポンスhash・解析結果を確認する。liveは固定フォルダへ書き込まない。
2. 目的に合う小さな合成CSVで足りるか検討する。引用符・列数異常などは明示的な合成データを使う。
3. snapshotが必要なら既存を上書きせず新しい名前で追加し、データ差分と採用理由を確認する。
4. manifestに元URL・取得時刻・バイト数・SHA-256・そのsnapshot固有の期待値を記録し、対応testが使う名前を明示する。
5. 旧異常CSVを警告0件へ「修正」しない。期待値を変える場合は、データ更新と仕様変更のどちらかを説明する。
6. `npm test`、`npm run test:pages`を実行し、fixtureが公開生成物へ混入しないことを確認する。

## live

レスポンス本文を`artifacts/<今回run>/live-<width>.csv`へ保存し、その同じ本文を独立にPapaParseで数え、UI／診断と照合します。固定件数を持ち込みません。実際のGoogleリダイレクト、CDN、画像も確認します。取得失敗時に保存CSVへfallbackしません。2画面幅の間でデータが更新された場合も幅ごとのhashと件数を記録し、同一データだったと断定しません。

失敗時は`live-<width>-failure.json`、Playwrightレポート、traceを確認し、通信・データ・サイト実装のどこで失敗したか区別します。liveの失敗を通常の固定回帰の失敗／成功へ混ぜません。

## 依存

ライブラリ更新はテスト移行や機能変更と分けます。package.jsonの正確な版とlockを同時に更新し、CDN完全URL・ローカル配布物の対応も確認します。`npm ci`で再現し、固定回帰とliveを実施してください。

GitHub Pages依存の更新はGemfile／lock、生成物比較、公式[Pages依存一覧](https://pages.github.com/versions/)を確認します。Jekyll 3の既定excludeが維持されること、プラグインやMarkdown由来の公開物が変わらないことを検証します。
