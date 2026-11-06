# F10 ローカル配布物と検証契約

Bootstrap CSS／bundle JS 5.3.2、PapaParse 5.3.2は`assets/vendor/`の未改変npm配布物を読みます。外部CDN fallbackはありません。Nodeやnpmが必要なのは保守・検証時だけです。

`fixtures/vendor-manifest.json`は配布元、正確な版、npm integrity、ファイルbyte数、SHA-256、ライセンス文書を記録します。`npm ci`後の配布物と公開ファイルを直接比較します。RFS／Normalizeのnpm tarballは権利表示の確認用に取得したもので、package.json／lockへの追加や新しい実行時依存ではありません。

## ライセンスとmap

- Bootstrap・PapaParse・同梱Popper 2.11.8の公式LICENSE全文を`licenses/`へ配置。既存ヘッダーを削除しません。
- Bootstrap CSS mapのRFS Sassはrfs@10.0.0とbyte一致。RebootにはNormalize.cssのMIT派生という上流コメントがあります。両者の著作権とMIT全文も保存します。
- Normalizeのnoticeは上流8.0.1からの文書です。独立したNormalize実行ファイルを読み込まず、Rebootがその版と同一であるとも主張しません。
- 元のBootstrap2ファイルは相対sourceMappingURLを持つため、mapも未改変で公開します。CSS73／JS82のsourcesContentはすべて内包され、JS内55のPopper sourceが固定2.11.8と一致します。ソースツリーやnode_modulesディレクトリの公開は不要です。
- PapaParseにはsourceMappingURLがありません。既存Bootstrap Icons v1.11.3とLICENSEは変更しません。
- vendor／新LICENSEにはGitの改行変換を適用しません。将来の更新でもbyte/hashをレビューしてください。

## 既存210件の維持と追加

従来のCDN応答差替えを廃止し、通常ブラウザテストは同一originの実ファイルをHTTP取得します。共通guardが完全なvendorパス、HTTP200、byte数、SHA-256、必要な3資産の取得を検査します。予期しない失敗や破損は成功になりません。jsDelivrは既知の旧版URLも含め拒否します。

- F07-U03：未知CDN版の拒否を、CDN全面拒否・不明なlocal vendorパス拒否へ拡張。偽装CSV等の拒否は維持。
- F07-U04：CDN URLとnpmファイルの対応から、公開vendorの完全パス・byte/hashと固定npmの一致へ変更。未知assetへのfallbackは禁止のまま。
- CSV-B15／B16：ローカルPapaParseのabort／例外注入で同じ一覧・抽選errorを確認。異常注入はそのcontextの当該1ファイルだけを`expectedVendorFaults`で明示します。他の資産失敗まで許容しません。
- 新規F10-U01～U05：配布物・読み込み順とasync/defer・map由来・HTTP失敗／同サイズ破損・ライセンス公開を検証。
- 新規F10-B01～B03：PC/スマートフォン×日英×両テーマ、実HTTP200/hash、accordion開閉、project subpath、全map／LICENSE、ローカルPapa404時のerrorを確認。

旧210件を削除せず、単体5件・ブラウザ3件を追加し、固定回帰は218件（単体74＋ブラウザ144）です。skip・retry・待機上限は変更しません。

`expectedVendorFaults`は異常系だけの宣言です。通常テストへ追加して失敗を回避してはいけません。共通guard自体の障害検出は故障注入を別の検証記録として残します。

## 公開物と将来の更新

公開一覧に5vendor（うちmap2）と5LICENSEを追加します。Jekyll既定excludeと_maintenance除外を維持し、実ビルドの参照・candidate出力を比較します。mapのembedded sourceは配布物の一部であり、保守用node_modules等の公開とは区別します。

ライブラリの更新時は、バージョン・LICENSE・同梱依存・map内容・manifest・公開一覧・テストを同じレビューで確認してください。自動ダウンロードで既存vendorやfixtureを上書きする運用は行いません。
