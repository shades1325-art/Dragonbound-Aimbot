param([string]$NodePath,[string]$LicensePath)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Runtime preparation requires Windows.' }
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$appDirectory = Join-Path $repoRoot 'app'
$runtimeDirectory = Join-Path $repoRoot 'runtime'
if ($NodePath) { $resolvedNode = (Resolve-Path -LiteralPath $NodePath).Path }
else { $resolvedNode = (Get-Command node.exe -ErrorAction Stop).Source }
$versionText = & $resolvedNode --version
if ($LASTEXITCODE -ne 0 -or $versionText -notmatch '^v(\d+)\.') { throw 'Could not determine the Node.js version.' }
if ([int]$Matches[1] -lt 24) { throw 'Node.js 24 or later is required.' }
$npmPath = Join-Path (Split-Path -Parent $resolvedNode) 'npm.cmd'
if (-not (Test-Path -LiteralPath $npmPath)) { $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source }
& $npmPath --prefix $appDirectory ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
$runtimeNode = Join-Path $runtimeDirectory 'node.exe'
if ([IO.Path]::GetFullPath($resolvedNode) -ne [IO.Path]::GetFullPath($runtimeNode)) { Copy-Item -LiteralPath $resolvedNode -Destination $runtimeNode -Force }
$runtimeLicense = Join-Path $runtimeDirectory 'NODE-LICENSE.txt'
if ($LicensePath) { Copy-Item -LiteralPath (Resolve-Path -LiteralPath $LicensePath).Path -Destination $runtimeLicense -Force }
else {
    $installedLicense = @('LICENSE','LICENSE.txt','NODE-LICENSE.txt') | ForEach-Object { Join-Path (Split-Path -Parent $resolvedNode) $_ } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($installedLicense) { Copy-Item -LiteralPath $installedLicense -Destination $runtimeLicense -Force }
    else { Invoke-WebRequest -UseBasicParsing -Uri ('https://raw.githubusercontent.com/nodejs/node/' + $versionText + '/LICENSE') -OutFile $runtimeLicense }
}
if ((Get-Item -LiteralPath $runtimeLicense).Length -eq 0) { throw 'The Node.js license file is empty.' }
foreach ($configName in @('inspect-game-args','bridge-endpoint')) {
    $localConfig = Join-Path $appDirectory ($configName + '.json')
    if (-not (Test-Path -LiteralPath $localConfig)) { Copy-Item -LiteralPath (Join-Path $appDirectory ($configName + '.example.json')) -Destination $localConfig }
}
Write-Output ('Runtime ready: ' + $versionText + '. Double-click Inject.vbs after enabling Chrome remote debugging.')
