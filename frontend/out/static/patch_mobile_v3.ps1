$root = 'C:\Users\Utilizador\Desktop\GPT_REMOTE_BRIDGE_TRABALHO\PROJETO_SERINGA_AI\frontend'
$static = Join-Path $root 'static'
$out = Join-Path $root 'out'
$appPath = Join-Path $static 'app.js'
$app = Get-Content $appPath -Raw
if ($app -notmatch 'function isStandalone\(\)') {
$insert = @"
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  function setupInstallVisibility() {
    const b = document.getElementById('installBanner');
    if (b) b.hidden = isStandalone();
  }

"@
  $app = $app.Replace('  function init() {', $insert + '  function init() {')
}
if ($app -notmatch 'setupInstallVisibility\(\);') { $app = $app.Replace('setupEvents(); setupInstall(); recalculate();','setupEvents(); setupInstall(); setupInstallVisibility(); recalculate();') }
Set-Content $appPath $app -Encoding UTF8
$indexPath = Join-Path $static 'index.html'
$html = Get-Content $indexPath -Raw
$html = $html.Replace('href="styles.css"','href="styles.css?v=3.0"').Replace('src="app.js" defer','src="app.js?v=3.0" defer')
Set-Content $indexPath $html -Encoding UTF8
$swPath = Join-Path $static 'sw.js'
$sw = Get-Content $swPath -Raw
$sw = $sw.Replace('seringa-static-v1','seringa-static-v3')
Set-Content $swPath $sw -Encoding UTF8
robocopy $static $out index.html styles.css app.js manifest.webmanifest sw.js /IS /IT /R:1 /W:1 | Out-Null
node --check $appPath
Write-Output ('JS_CHECK=' + $LASTEXITCODE)
Write-Output ('LIGHT_MODE=' + ((Get-Content (Join-Path $static 'styles.css') -Raw) -match 'color-scheme:light only'))
Write-Output ('CACHE=' + ((Get-Content $indexPath -Raw) -match 'styles.css\?v=3.0') + '/' + ((Get-Content $indexPath -Raw) -match 'app.js\?v=3.0'))
Write-Output ('SWV3=' + ((Get-Content $swPath -Raw) -match 'seringa-static-v3'))
Write-Output ('OUT_SYNC=' + ((Get-Content $indexPath -Raw) -eq (Get-Content (Join-Path $out 'index.html') -Raw)) + '/' + ((Get-Content (Join-Path $static 'styles.css') -Raw) -eq (Get-Content (Join-Path $out 'styles.css') -Raw)) + '/' + ((Get-Content $appPath -Raw) -eq (Get-Content (Join-Path $out 'app.js') -Raw)))
