# 旧174件の移行対応表

F06原本コピーで70単体＋104ブラウザを再現した後、目的を167ケースへ移しました。削除はソース一致7件の個別実行だけで、検証目的は以下の既存契約へ統合しました。skipはありません。F02 36ケースとF07基盤7ケースは追加枠です。

7件のソース一致は、将来の正当な改修で逆パッチを更新し続ける代わりに、保存形式・乱数・遅延生成・CSV／通信・テーマ／DOMの動作で保護します。過去ソース／固定パッチは実行依存に含めません。

F08-U08～U10は旧実装との比較から、動画ID＋時刻、固定snapshotの受理・診断・集合、診断コード／行番号の明示期待値へ置換しました。空名パラメータはgetPlaybackPoint単体では0秒、CSVでは警告、配信内ソートではCSV順fallbackという既存の区別を維持します。

ブラウザ104件は入力・操作・assertionを維持し、Playwright Testのケースとして登録しました。旧名の「現行／実CSV」は保存snapshotを指します。実通信はtests/liveに分離しています。BASEの状態引継ぎ、CSVループ展開22ケース、F06の500ms待機、F08の31件目不正時刻、F05の固定乱数、テーマのhead実行順も残しています。

| 旧ID | 元の検証目的 | 移行先ID | 移行先ファイル | 判定・理由 |
| --- | --- | --- | --- | --- |
| RS-U01 | カテゴリ4択・将来カテゴリ・公開状態・曲名・再生リンクの条件 | RS-U01 | [random-song.test.cjs](../tests/unit/random-song.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| RS-U02 | YouTube URLの基本検証と不正スキーム・偽装ホストの除外 | RS-U02 | [random-song.test.cjs](../tests/unit/random-song.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| RS-U03 | 完全一致でグループ化し、表記ゆれ・空白・大小文字を統合しない | RS-U03 | [random-song.test.cjs](../tests/unit/random-song.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| RS-U04 | 歌唱回数1対9でも曲名単位で均等、曲内の歌唱履歴も均等（100,000回） | RS-U04 | [random-song.test.cjs](../tests/unit/random-song.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| RS-U05 | 直近10曲を除外し、少数候補では最古から制限解除、直前の重複を回避 | RS-U05 | [random-song.test.cjs](../tests/unit/random-song.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| RS-U06 | カテゴリを跨ぐ履歴・10件上限・同一セッションでの再読込 | RS-U06 | [random-song.test.cjs](../tests/unit/random-song.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| RS-U07 | 保存制限・容量不足・壊れたJSONでも抽選と既存形式のお気に入りを維持 | RS-U07 | [random-song.test.cjs](../tests/unit/random-song.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U01 | 現行公開CSV：全記録を変更せず受理し、13列・公開2,733件を維持 | CSV-U01 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U02 | 9必須ヘッダーを個別に欠落させると構造エラー。任意4列の欠落は許容 | CSV-U02 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U03 | 5.3.2のmeta.fieldsから重複ヘッダーを検出（空見出し・前後空白も含む） | CSV-U03 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U04 | 閉じていない引用符・不正な引用符は全体エラー、正常な引用符内の改行は許容 | CSV-U04 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U05 | 列数の不足・超過は該当行のみ除外し、レコード番号と正常行の順序を維持 | CSV-U05 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U06 | 末尾空行は不正行に含めない | CSV-U06 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U07 | 引用符異常と列数異常で5.3.2のrow基準が違っても診断番号をそろえる | CSV-U07 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U08 | 公開行の6必須値の欠損・空白は当該行のみ除外 | CSV-U08 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U09 | 存在しない日付と形式不正を除外し、閏日・既存の年月日表記は保持 | CSV-U09 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U10 | 公開行のYouTube URLを検査し、偽装ホスト・不正スキーム・不正IDを行単位で除外 | CSV-U10 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U11 | 単独MV・カバー動画の頭出し秒数は必須にしない | CSV-U11 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U12 | 未知カテゴリ・画像欠落・重複頭出しは警告のみ、値・記録・順序は変えない | CSV-U12 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U13 | 不正な画像URL・時刻は警告のみ、公開列の未知値は公開へ自動変換しない | CSV-U13 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U14 | metaの中断・切詰め・結果構造欠損は全体エラー | CSV-U14 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U15 | F05の許可差分以外は抽選方式・お気に入り・曲名遅延生成の既存関数を変更していない | RS-U04, RS-U07, F05-B13, LAZY-B02, LAZY-B03, LAZY-B05 | [random-song.test.cjs](../tests/unit/random-song.test.cjs)、[song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs)、[progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | ソース一致を廃止し、列挙した動作・保存・描画契約へ統合 |
| CSV-U16 | F/Gの動画ID不一致は該当行・両IDを警告し、記録とURLを維持 | CSV-U16 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U17 | F/Gの表記や共有パラメータが異なっても同じ動画IDなら不一致にしない | CSV-U17 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U18 | 公開対象が元から0件なら、ヘッダーだけ・非公開行ありともエラーにしない | CSV-U18 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U19 | 全公開行が除外された場合は非公開の正常行が残っていても全体エラー | CSV-U19 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U20 | 公開行の一部だけが除外された場合は成功を維持 | CSV-U20 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U21 | 空・空白のクエリ名は警告のみ、通常URLと一般的な共有パラメータは許容 | CSV-U21 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U22 | F02保存CSVの既知「絶対零度」?=0だけを警告し、2,763件を受理 | CSV-U22 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| CSV-U23 | CSV検証・状態管理はテーマ改善の起点mainから変更していない | CSV-U01, CSV-U02, CSV-U03, CSV-B10, CSV-B11, CSV-B12 | [csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs)、[csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | ソース一致を廃止し、列挙した動作・保存・描画契約へ統合 |
| F08-U01 | t/start/#tの数値・複合時刻・指定なしを秒数へ解析 | F08-U01 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F08-U02 | 既存のt > start > #tの優先順と不正値の解釈を維持 | F08-U02 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F08-U03 | 逆順データを時刻の昇順へ、曲名や架空の開始秒数列は基準にしない | F08-U03 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F08-U04 | 同じ時刻は異なるURL表記でもCSV順、時刻なしは0秒 | F08-U04 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F08-U05 | 不正時刻を1件でも含む配信は配信内の全件を元順に保つ | F08-U05 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F08-U06 | 空名パラメータや不正URLも保守的に配信単位でCSV順へフォールバック | F08-U06 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F08-U07 | 空配列・1件・正常な共有パラメータ付きMVでも動作し、元配列を変更しない | F08-U07 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F08-U08 | getPlaybackPointの結果を起点mainと比較（各表記・不正値・時刻優先順） | F08-U08 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 過去実装を参照せず仕様上の明示期待値へ置換 |
| F08-U09 | 実CSV全2,763件・過去保存CSVのF01診断結果を完全に維持 | F08-U09 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 過去実装を参照せず仕様上の明示期待値へ置換 |
| F08-U10 | 不正時刻・時刻重複・空名などの診断コード／行番号は共通化前と同一 | F08-U10 | [session-order.test.cjs](../tests/unit/session-order.test.cjs) | 過去実装を参照せず仕様上の明示期待値へ置換 |
| F08-U11 | F05の許可差分以外は配信内の時刻順・段階表示・CSV診断のコードを変更していない | F08-U03, F08-U05, F08-B08, LAZY-B01, LAZY-B02, CSV-U01, CSV-B10 | [session-order.test.cjs](../tests/unit/session-order.test.cjs)、[session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs)、[progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs)、[csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs)、[csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | ソース一致を廃止し、列挙した動作・保存・描画契約へ統合 |
| THEME-U01 | 保存なしは端末のライト／ダークを初期採用し、自動では保存しない | THEME-U01 | [theme.test.cjs](../tests/unit/theme.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| THEME-U02 | 保存済みlight/darkは反対の端末設定より優先 | THEME-U02 | [theme.test.cjs](../tests/unit/theme.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| THEME-U03 | 不正な保存値は未設定として扱い、元の値を勝手に書き換えない | THEME-U03 | [theme.test.cjs](../tests/unit/theme.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| THEME-U04 | クリック直後の表示・保存と日英文言は切替先を示す | THEME-U04 | [theme.test.cjs](../tests/unit/theme.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| THEME-U05 | localStorageの読取・保存・アクセス自体が失敗しても表示と切替を継続 | THEME-U05 | [theme.test.cjs](../tests/unit/theme.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| THEME-U06 | 専用キーだけを保存し、お気に入りと抽選履歴を保持 | THEME-U06 | [theme.test.cjs](../tests/unit/theme.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| THEME-U07 | 早期処理はCSS・外部スクリプトより前、ネイティブbuttonに不要な状態属性なし | THEME-U07 | [theme.test.cjs](../tests/unit/theme.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| THEME-U08 | F05の許可差分を除きテーマ改善時のJavaScript・HTML・CSSを維持 | THEME-U01, THEME-U04, THEME-U06, THEME-U07, THEME-B08, THEME-B10, CSV-B10, BASE-B03 | [theme.test.cjs](../tests/unit/theme.test.cjs)、[theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs)、[csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs)、[browser.test.cjs](../tests/browser/browser.test.cjs) | ソース一致を廃止し、列挙した動作・保存・描画契約へ統合 |
| F05-U01 | 固定乱数0でFisher-Yatesの期待順と乱数呼出し回数を検証 | F05-U01 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F05-U02 | 結果が元と同じ順になる正常な乱数も受理し、重複・欠落なし | F05-U02 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F05-U03 | 曲名の重複を1グループとし非公開を除き、元データを変更しない | F05-U03 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F05-U04 | 繰り返し取得でも同じMapを返し、再シャッフルしない | F05-U04 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F05-U05 | 部分集合は全曲の順位に従い、解除すると元の順に復帰できる | F05-U05 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F05-U06 | 選び直しによる無効化後は新しい乱数列で順序を生成 | F05-U06 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F05-U07 | CSVデータ配列が置き換わると新しい曲名集合へ追従 | F05-U07 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F05-U08 | 0件・1曲でも正しく扱い、乱数を消費しない | F05-U08 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F05-U09 | 特殊な曲名もMapで安全に扱い、曲名の表記を変えない | F05-U09 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F05-U10 | F05以外のJavaScript・HTML・CSSは最新mainと完全一致 | F05-U01, F05-U04, F05-B02, F05-B10, F05-B13, F08-B08, CSV-U01, BASE-B03 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs)、[song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs)、[session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs)、[csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs)、[browser.test.cjs](../tests/browser/browser.test.cjs) | ソース一致を廃止し、列挙した動作・保存・描画契約へ統合 |
| F06-U01 | 配信記録数・表示済み件数を日英で区別 | F06-U01 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F06-U02 | 曲名グループ数と歌唱履歴件数を日英で区別 | F06-U02 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F06-U03 | 0件の結果を表示し、loading/errorのクリアと区別 | F06-U03 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F06-U04 | 短時間の連続更新は500msの通知1件にまとめる | F06-U04 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F06-U05 | 自動追加の視覚件数更新だけでは読み上げを繰り返さない | F06-U05 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F06-U06 | 手動追加は日英で意味のある更新を速やかに通知 | F06-U06 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F06-U07 | 古いviewRevisionの通知は実行しない | F06-U07 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F06-U08 | error/loading中やクリア後は予約通知を出さない | F06-U08 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F06-U09 | 視覚表示と独立したatomic status、初期aria-pressedを持つ | F06-U09 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs) | 入力・操作・assertionを維持。実行対象とfixtureの解決だけ共通化 |
| F06-U10 | F05順位生成・履歴順の決定、F08、CSV検証と通信、保存・抽選は起点mainと同じ | F05-U01, F05-B02, F08-B08, CSV-U01, CSV-B10, RS-U04, RS-U07, BASE-B03, LAZY-B02 | [song-group-random.test.cjs](../tests/unit/song-group-random.test.cjs)、[song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs)、[session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs)、[csv-validation.test.cjs](../tests/unit/csv-validation.test.cjs)、[csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs)、[random-song.test.cjs](../tests/unit/random-song.test.cjs)、[browser.test.cjs](../tests/browser/browser.test.cjs)、[progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | ソース一致を廃止し、列挙した動作・保存・描画契約へ統合 |
| F06-U11 | 固定F06差分の外側はJavaScript・HTML・CSS全体で変更なし | F06-U09, F06-B01, F06-B02, F06-B11, F06-B20, F06-B22, F05-B13, F08-B08, CSV-B10, BASE-B03 | [ui-feedback.test.cjs](../tests/unit/ui-feedback.test.cjs)、[ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs)、[song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs)、[session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs)、[csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs)、[browser.test.cjs](../tests/browser/browser.test.cjs) | ソース一致を廃止し、列挙した動作・保存・描画契約へ統合 |
| CSV-B01 | 現行CSV：ready・初期20件・全公開データ・診断APIのコピー | CSV-B01 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B02 | 必須列欠落：全体エラーと再試行 | CSV-B02 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B03 | 重複ヘッダー：全体エラーと再試行 | CSV-B03 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B04 | 引用符異常：全体エラーと再試行 | CSV-B04 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B05 | 列数不一致：不正行だけ除外し、正常データと日本語／英語の件数通知を維持 | CSV-B05 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B06 | 公開情報欠落・不正日付・偽装URLが混在しても正常行を表示・抽選する | CSV-B06 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B07 | 警告のみのデータを削除・書換えしない、一般画面に診断詳細を出さない | CSV-B07 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B08 | 単独MV・カバーは頭出し時刻なしで再生候補になる | CSV-B08 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B09 | NETWORK_ERROR：検索・リセット・モード・言語変更後もerrorを維持 | CSV-B09 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B10 | HTTP_ERROR：検索・リセット・モード・言語変更後もerrorを維持 | CSV-B10 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B11 | loading中の操作で0件表示にせず、標準30秒の待機上限を設定 | CSV-B11 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B12 | 実XHRタイムアウト・遅延応答を無視・再試行で復帰 | CSV-B12 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B13 | 連続再読込で旧要求を中断し、旧成功・失敗コールバックが新結果を上書きしない | CSV-B13 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B14 | 予約済み描画と読込失敗の競合でエラーを上書きしない | CSV-B14 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B15 | PapaParse missingも一覧と抽選を同じエラー状態にする | CSV-B15 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B16 | PapaParse throwsも一覧と抽選を同じエラー状態にする | CSV-B16 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B17 | 全公開行の除外はerror、再試行後も履歴・お気に入りは保存互換 | CSV-B17 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B18 | F/G動画ID不一致の警告は行を除外せず、URL・再生候補を維持 | CSV-B18 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B19 | 元から公開0件はreadyを維持し、通常の0件表示と抽選候補ゼロになる | CSV-B19 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B20 | 非公開行だけ正常でも全公開行が列数異常ならerror、部分的除外ならready | CSV-B20 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B21 | 保存CSV「絶対零度」?=0は1件だけ警告し、既存2,763件を維持 | CSV-B21 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| CSV-B22 | 秒数なしのMVと一般共有パラメータを誤警告しない | CSV-B22 | [csv-loading.test.cjs](../tests/browser/csv-loading.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F08-B01 | 逆順CSVを初期20件と追加表示の両方で時刻順にする・1280px/375px | F08-B01 | [session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F08-B02 | t/start/#t・複合時刻・指定なし・同時刻の表示順 | F08-B02 | [session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F08-B03 | 不正時刻がある配信だけCSV順に戻し、他の配信は時刻順・警告を維持 | F08-B03 | [session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F08-B04 | 空名パラメータでも該当配信のCSV順とF01の警告を維持 | F08-B04 | [session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F08-B05 | 複数配信の新しい順・古い順は従来どおり、配信内だけ昇順 | F08-B05 | [session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F08-B06 | 配信枠ランダムの処理は維持し、配信内は昇順 | F08-B06 | [session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F08-B07 | 曲名一覧・歌唱履歴の日付順は頭出し時刻順へ変えない | F08-B07 | [session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F08-B08 | 実CSVの公開2,733件・205配信と全リンク集合／配信内の期待順を維持 | F08-B08 | [session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F08-B09 | 未表示の31件目が不正時刻でも、初期20件から配信全体のCSV順を保つ | F08-B09 | [session-order-browser.test.cjs](../tests/browser/session-order-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B01 | 固定乱数0で曲名グループが期待順になり、同名履歴を分割しない | F05-B01 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B02 | ランダムでも全グループの歌唱履歴が新しい順、閉じるとカードを解放 | F05-B02 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B03 | 検索の絞り込み・該当なし・解除でも順位と乱数呼出し回数を維持 | F05-B03 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B04 | カテゴリ・配信絞り込みと解除でも元のランダム順位を維持 | F05-B04 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B05 | お気に入り絞り込み・storage同期と解除でも順位を維持し保存形式は従来どおり | F05-B05 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B06 | 日英切替・テーマ切替後も元のランダム順位と乱数回数を維持 | F05-B06 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B07 | 絞り込み中にランダムを選んでも全曲名の順序を作り、解除後に復元 | F05-B07 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B08 | 別の並び順からランダムへ再選択すると新しい順、元と同順も正常 | F05-B08 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B09 | 新しい順・古い順のグループ代表日と歌唱履歴は起点mainと同じ | F05-B09 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B10 | 配信枠一覧のランダムを維持し、検索結果の曲名グループだけ順位を保持 | F05-B10 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B11 | この曲の歌唱履歴を見るは従来どおり全履歴を新しい順で開き、再ランダムも動作 | F05-B11 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B12 | 連続した検索・並び順の変更でも最後の条件だけを描画 | F05-B12 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B13 | 現行CSVの2,733記録・681曲名・205配信と全履歴を保持し、遅延生成・解放を維持 | F05-B13 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F05-B14 | CSV再取得でデータ集合が変わっても順位を再作成し古い曲名を残さない | F05-B14 | [song-group-random-browser.test.cjs](../tests/browser/song-group-random-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B01 | 保存なしの初期テーマは端末のライト／ダークに従い、保存しない | THEME-B01 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B02 | 端末と保存設定が異なる両方向で、保存設定を優先 | THEME-B02 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B03 | マウスで両方向の即時切替・専用キー保存、一覧を再描画しない | THEME-B03 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B04 | 再読み込みと同じブラウザの新しいタブでも両モードを復元 | THEME-B04 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B05 | 不正保存値7種は未設定扱い、次の明示操作で正常値を保存 | THEME-B05 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B06 | storageの読取・書込・getter例外でも表示・切替・言語変更が動作 | THEME-B06 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B07 | 日英切替とテーマ切替を繰り返しても文言・保存回数は正しい | THEME-B07 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B08 | Tab・Enter・Spaceで切替、両モード・両言語で明瞭なフォーカス | THEME-B08 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B09 | 375pxのタップで1回だけ切替・保存 | THEME-B09 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B10 | 375/1280px・日英・ライト/ダーク8通りで配置・視認性・横幅を維持 | THEME-B10 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B11 | 本体JSの読込待ちでもheadでテーマを適用し、保存値・端末設定を反映 | THEME-B11 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| THEME-B12 | CSV通信エラー中もテーマ切替可能、F04のerror状態を維持 | THEME-B12 | [theme-browser.test.cjs](../tests/browser/theme-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B01 | 初期表示・検索と抽選の独立・抽選後の情報表示 | BASE-B01 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B02 | YouTube頭出しURL・別タブへの遷移（遷移先はテスト応答） | BASE-B02 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B03 | 既存お気に入りの維持・抽選結果と一覧の双方向同期 | BASE-B03 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B04 | 完全一致の全公開歌唱履歴・他フィルタ解除・新しい順・開閉とスクロール | BASE-B04 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B05 | カテゴリ変更で結果を閉じる・言語切替で選択条件と抽選結果を保持・イベント重複なし | BASE-B05 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B06 | 4分類の選択肢・抽選対象・変更時の結果消去と共通履歴・日英切替 | BASE-B06 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B07 | 抽選→閉じる→再抽選・結果内の再抽選・検索リセット・履歴表示からの閉じる | BASE-B07 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B08 | 新機能のボタンは選択言語のみ・PC／375pxのボタンサイズと両テーマ | BASE-B08 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B09 | 6画面幅と992pxの境界・日英×両テーマ×通常／長い文字列のレスポンシブ表示 | BASE-B09 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B10 | 高速な連続操作・直近10曲回避・再抽選時にフォーカスとスクロールを維持 | BASE-B10 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B11 | データ文字列のHTMLを実行しない・375pxの長い文字列・ライト／ダーク | BASE-B11 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B12 | 同一タブの再読込で抽選履歴を保持 | BASE-B12 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B13 | 候補ゼロ・CSV通信失敗の補助メッセージ | BASE-B13 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B14 | 実データで4分類の対象記録を照合し、各分類から連続抽選 | BASE-B14 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| BASE-B15 | 実際の公開CSVで抽選・履歴表示・PC／375pxと両テーマのスクリーンショット | BASE-B15 | [browser.test.cjs](../tests/browser/browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| LAZY-B01 | 実CSVの初期表示は20カード以下・保存領域の読み込みは1回・PC/375px | LAZY-B01 | [progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| LAZY-B02 | 実スクロールで追加表示し、配信枠を分割しても見出し・曲順を維持 | LAZY-B02 | [progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| LAZY-B03 | 実CSVの全2,733件へ到達し、欠落・順序混在・余分な重複がない | LAZY-B03 | [progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| LAZY-B04 | 未表示の古い歌唱も検索・4分類の抽選・完全一致の全履歴の対象 | LAZY-B04 | [progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| LAZY-B05 | 曲名一覧は開く時だけ生成し、閉じると破棄・再開時のお気に入りも正しい | LAZY-B05 | [progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| LAZY-B06 | 抽選では一覧の星を走査・更新せず、同一形式の保存とstorageイベントに対応 | LAZY-B06 | [progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| LAZY-B07 | 追加描画予約と検索・並べ替えの競合をキャンセルし、連続変更は最後の条件のみ | LAZY-B07 | [progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| LAZY-B08 | IntersectionObserverがない環境も手動追加で全件を表示できる | LAZY-B08 | [progressive-rendering.test.cjs](../tests/browser/progressive-rendering.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B01 | お気に入り絞り込みのaria-pressedは初期・ON/OFF・言語・リセット・再読込と一致 | F06-B01 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B02 | キーボード解除は次のカードへ引継ぎ（EnterとSpace） | F06-B02 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B03 | 次がない最後のカードの解除は前のカードへ引継ぎ | F06-B03 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B04 | 最後の1件を解除すると上部のお気に入り絞り込みへ戻る | F06-B04 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B05 | マウスで解除した場合は別の星や上部ボタンへ移動しない | F06-B05 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B06 | 別タブ相当のstorage更新ではフォーカスを移動しない | F06-B06 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B07 | 解除後の非同期描画より新しい検索操作を優先しフォーカスを奪わない | F06-B07 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B08 | 解除後にTabで別操作へ進んだ場合とpointerdown後は古いフォーカス引継ぎを中止 | F06-B08 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B09 | 曲名一覧の解除は必要なグループだけを再展開して次の星へ引継ぎ | F06-B09 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B10 | 曲名グループの最後の1件を解除しても次のグループへ引継ぎ | F06-B10 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B11 | 追加表示後の解除も20件単位を維持して次のカードへ引継ぎ | F06-B11 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B12 | 通常の星ON/OFFとおまかせ側の操作では元のボタンのフォーカスを保持 | F06-B12 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B13 | 検索・カテゴリ・配信・お気に入り・表示モードの件数がデータと一致 | F06-B13 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B14 | 曲名グループ数と全履歴数はカード未生成でも正しい | F06-B14 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B15 | 自動追加は画面件数だけ更新し、手動追加でのみ追加を通知 | F06-B15 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B16 | 検索入力が連続しても読み上げ通知は確定後の1回に集約 | F06-B16 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B17 | 状態通知だけではスクロールやフォーカスを変更しない | F06-B17 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B18 | 結果なし・日英・リセットでも件数と既存該当なし表示が整合 | F06-B18 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B19 | 通信失敗・再試行・再読込中は件数を消し、errorを0件に変えない | F06-B19 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B20 | 古い検索・追加表示予約を新しいフィルタと通信エラーが上書き | F06-B20 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B21 | 対象文字と操作状態をライト・ダークで実測し基準を満たす | F06-B21 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B22 | Tab・Enter・Spaceによるフィルタ・星・追加表示とフォーカス枠 | F06-B22 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B23 | 1280・768・375px×日英×両テーマで文字切れ・重なり・横スクロールなし | F06-B23 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |
| F06-B24 | 実CSV全2,763記録・公開2,733・681曲名・205配信と遅延生成を維持 | F06-B24 | [ui-feedback-browser.test.cjs](../tests/browser/ui-feedback-browser.test.cjs) | 操作・合成データ・assertionを維持。Playwright Test登録、動的origin、共通通信guardへ移行 |

## 追加枠

- F02-{width}-{lang}-{theme}：9幅×日英×両テーマ36ケース。旧verify-f02.cjsのmeasure/assertFitsと配信・検索・カテゴリ・並替え・リセット・星・抽選操作を回収。旧before/candidate CSS差替えは廃止し、checkoutの実CSSだけを検証します。
- F07-U01～U06：動的server／project path、非公開パス／method、未知通信、CDN版とasset、snapshot bytes／hash、174IDの目的追跡。
- F07-B01：/flare-songs/配下でのリソース解決・テーマ・681曲名の表示。
- LIVE-1280／375：実通信の別コマンド。固定210件に含めません。

## 今後の変更

旧174IDは追跡用として保持します。仕様変更で期待値や統合先を変える場合は、JSONとこの対応表を同じPRで更新し、目的がどのtestへ移ったか明記してください。test countを合わせるための空テスト・skipは追加しません。
