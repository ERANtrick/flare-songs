# 検証用ファイルをリポジトリ外へ準備する。サイト本体の依存は追加しない。
[CmdletBinding()]
param(
  [string]$ValidationDir = (Join-Path $PSScriptRoot '..\..\flare-songs-validation'),
  [switch]$UseExistingPackages
)
$ErrorActionPreference = 'Stop'
$prototypeRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$validationPath = [System.IO.Path]::GetFullPath($ValidationDir)
if ($validationPath.TrimEnd('\', '/') -eq $prototypeRoot.TrimEnd('\', '/') -or
    $validationPath.StartsWith($prototypeRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw '検証用フォルダはリポジトリの外を指定してください。'
}
New-Item -ItemType Directory -Path $validationPath -Force | Out-Null
$version = '1.64.1'
foreach ($name in @('playwright', 'playwright-core')) {
  $packageDir = Join-Path $validationPath ('node_modules\' + $name)
  if (!$UseExistingPackages) {
    # npmで使うものと同じ公式配布物。Windowsの証明書検証を使用する。
    $meta = Invoke-RestMethod -Uri ('https://registry.npmjs.org/' + $name + '/' + $version) -TimeoutSec 60
    $archive = Join-Path $validationPath ($name + '-' + $version + '.tgz')
    Invoke-WebRequest -Uri $meta.dist.tarball -OutFile $archive -TimeoutSec 60
    $hash = [System.Security.Cryptography.SHA512]::HashData([System.IO.File]::ReadAllBytes($archive))
    if (('sha512-' + [Convert]::ToBase64String($hash)) -ne $meta.dist.integrity) {
      throw ('配布ファイルの整合性を確認できませんでした: ' + $name)
    }
    New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
    tar -xzf $archive -C $packageDir --strip-components=1
    if ($LASTEXITCODE -ne 0) { throw ('展開に失敗しました: ' + $name) }
  }
  $package = Get-Content -LiteralPath (Join-Path $packageDir 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($package.version -ne $version) { throw ('必要な検証用バージョンは ' + $name + '@' + $version + ' です。') }
}
$resources = @(
  @('https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css', 'bootstrap.min.css'),
  @('https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js', 'bootstrap.bundle.min.js'),
  @('https://cdn.jsdelivr.net/npm/papaparse@5.3.2/papaparse.min.js', 'papaparse.min.js'),
  @('https://img.youtube.com/vi/zhGqJdOEcS4/maxresdefault.jpg', 'sample-thumbnail.jpg')
)
$source = Get-Content -LiteralPath (Join-Path $prototypeRoot 'script.js') -Raw -Encoding UTF8
$csvMatch = [regex]::Match($source, "const CSV_URL = '([^']+)'")
if (!$csvMatch.Success) { throw 'script.jsから公開CSVの参照先を見つけられませんでした。' }
$resources += ,@($csvMatch.Groups[1].Value, 'songs.csv')
foreach ($resource in $resources) {
  Invoke-WebRequest -Uri $resource[0] -OutFile (Join-Path $validationPath $resource[1]) -TimeoutSec 60
}
Write-Output ('検証用ファイルを準備しました: ' + $validationPath)
Write-Output '別のターミナルで node tools/preview.cjs を起動し、node tests/browser.test.cjs を実行してください。'
