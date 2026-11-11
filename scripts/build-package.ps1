param()
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$appDirectory = Join-Path $repoRoot 'app'
$runtimeDirectory = Join-Path $repoRoot 'runtime'
$runtimeNode = Join-Path $runtimeDirectory 'node.exe'
foreach ($requiredPath in @($runtimeNode,(Join-Path $runtimeDirectory 'NODE-LICENSE.txt'),(Join-Path $appDirectory 'node_modules\ws\package.json'))) {
    if (-not (Test-Path -LiteralPath $requiredPath)) { throw 'Run scripts/prepare-runtime.ps1 before building.' }
}
& $runtimeNode (Join-Path $PSScriptRoot 'check.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Source checks failed.' }
$distDirectory = Join-Path $repoRoot 'dist'
New-Item -ItemType Directory -Path $distDirectory -Force | Out-Null
$archivePath = Join-Path $distDirectory 'DragonBound-OneClick.zip'
$tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
$stagingDirectory = Join-Path $tempParent ('DragonBound-Package-' + [guid]::NewGuid().ToString('N'))
$payloadDirectory = Join-Path $stagingDirectory 'DragonBound-OneClick'
try {
    foreach ($directoryName in @('app','app\node_modules','runtime')) { New-Item -ItemType Directory -Path (Join-Path $payloadDirectory $directoryName) -Force | Out-Null }
    Get-ChildItem -LiteralPath $appDirectory -File | Where-Object { $_.Extension -in @('.js','.mjs') -or $_.Name -in @('package.json','package-lock.json') } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $payloadDirectory 'app') }
    Copy-Item -LiteralPath (Join-Path $appDirectory 'node_modules\ws') -Destination (Join-Path $payloadDirectory 'app\node_modules\ws') -Recurse
    foreach ($fileName in @('node.exe','NODE-LICENSE.txt')) { Copy-Item -LiteralPath (Join-Path $runtimeDirectory $fileName) -Destination (Join-Path $payloadDirectory 'runtime') }
    foreach ($fileName in @('Launch.ps1','Inject.vbs','README.md','CHANGELOG.md','THIRD_PARTY_NOTICES.md')) { Copy-Item -LiteralPath (Join-Path $repoRoot $fileName) -Destination $payloadDirectory }
    foreach ($directoryName in @('docs','licenses','scripts','tests')) { Copy-Item -LiteralPath (Join-Path $repoRoot $directoryName) -Destination (Join-Path $payloadDirectory $directoryName) -Recurse }
    foreach ($configName in @('inspect-game-args','bridge-endpoint')) {
        $templatePath = Join-Path $appDirectory ($configName + '.example.json')
        Copy-Item -LiteralPath $templatePath -Destination (Join-Path $payloadDirectory ('app\' + $configName + '.example.json'))
        Copy-Item -LiteralPath $templatePath -Destination (Join-Path $payloadDirectory ('app\' + $configName + '.json'))
    }
    Compress-Archive -LiteralPath $payloadDirectory -DestinationPath $archivePath -CompressionLevel Optimal -Force
    Get-Item -LiteralPath $archivePath | Select-Object FullName,Length
} finally {
    $resolvedStage = [IO.Path]::GetFullPath($stagingDirectory)
    if (-not $resolvedStage.StartsWith($tempParent,[StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolvedStage) -notmatch '^DragonBound-Package-[a-f0-9]{32}$') { throw 'Unexpected staging directory; cleanup stopped.' }
    if (Test-Path -LiteralPath $resolvedStage) { Remove-Item -LiteralPath $resolvedStage -Recurse -Force }
}
