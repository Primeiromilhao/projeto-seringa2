$Source = 'C:\Users\Utilizador\Desktop\GPT_REMOTE_BRIDGE_TRABALHO\PROJETO_SERINGA_AI'
$Targets = @('F:\AI\Projetos\PROJETO_SERINGA_AI','G:\O meu disco\PROJETO_SERINGA_AI')
$Log = Join-Path $Source 'scripts\sync.log'
$ExcludeDirs = @('.git','.pytest_cache','node_modules','.next','__pycache__')
$ExcludeFiles = @('.env')
function Sync-One($Target) {
  New-Item -ItemType Directory -Force $Target | Out-Null
  $args = @($Source,$Target,'/E','/R:1','/W:1','/XJ','/FFT','/COPY:DAT','/DCOPY:DAT','/NP','/NDL','/NFL')
  foreach($d in $ExcludeDirs){$args += '/XD';$args += (Join-Path $Source $d)}
  foreach($f in $ExcludeFiles){$args += '/XF';$args += (Join-Path $Source $f)}
  & robocopy @args | Out-Null
  $code=$LASTEXITCODE
  Add-Content $Log "$(Get-Date -Format s) target=$Target code=$code"
}
Sync-One $Targets[0]; Sync-One $Targets[1]
$watcher = New-Object IO.FileSystemWatcher $Source
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$action = { Start-Sleep -Milliseconds 800; foreach($t in $using:Targets){& robocopy $using:Source $t /E /R:1 /W:1 /XJ /FFT /COPY:DAT /DCOPY:DAT /NP /NDL /NFL /XD (Join-Path $using:Source '.git') (Join-Path $using:Source '.pytest_cache') (Join-Path $using:Source 'node_modules') (Join-Path $using:Source '.next') (Join-Path $using:Source '__pycache__') /XF (Join-Path $using:Source '.env') | Out-Null}}
Register-ObjectEvent $watcher Changed -Action $action | Out-Null
Register-ObjectEvent $watcher Created -Action $action | Out-Null
Register-ObjectEvent $watcher Renamed -Action $action | Out-Null
Register-ObjectEvent $watcher Deleted -Action $action | Out-Null
while($true){Start-Sleep -Seconds 10}