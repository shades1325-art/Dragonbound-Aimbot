param([switch]$NoUI)
$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$appDir = Join-Path $taskRoot 'app'
$nodePath = Join-Path $taskRoot 'runtime\node.exe'
$requestId = [guid]::NewGuid().ToString()
$statusPath = Join-Path $appDir 'runtime-supervisor-status.json'
$errorPath = Join-Path $appDir 'oneclick-error.json'
function Read-LaunchState {
    try {
        $failure = Get-Content -LiteralPath $errorPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($failure.requestId -eq $requestId) { return @{state='error';message=$failure.message} }
    } catch {}
    try { return Get-Content -LiteralPath $statusPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch { return @{state='starting'} }
}
function Start-Loader {
    if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Missing runtime/node.exe. Run scripts/prepare-runtime.ps1 first.' }
    $launcherPath = Join-Path $appDir 'one-click.mjs'
    Start-Process -FilePath $nodePath -ArgumentList @('"' + $launcherPath + '"','--request',$requestId) -WorkingDirectory $appDir -WindowStyle Hidden | Out-Null
}
if ($NoUI) {
    Start-Loader
    $deadline = (Get-Date).AddSeconds(30)
    do {
        $current = Read-LaunchState
        if ($current.state -eq 'error') { throw $current.message }
        if ($current.state -eq 'running' -and $current.appliedRequestId -eq $requestId) { $current | ConvertTo-Json -Compress; exit 0 }
        Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $deadline)
    throw ('Loader waiting: ' + $current.state + ' ' + $current.lastError)
}
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$form = New-Object System.Windows.Forms.Form
$form.Text = 'DragonBound - One Click'
$form.Size = New-Object System.Drawing.Size(510,255)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(20,20)
$label.Size = New-Object System.Drawing.Size(460,130)
$label.Font = New-Object System.Drawing.Font('Segoe UI',11)
$label.Text = 'Looking for DragonBound in Chrome...'
$form.Controls.Add($label)
$close = New-Object System.Windows.Forms.Button
$close.Text = 'Close window'
$close.Location = New-Object System.Drawing.Point(330,165)
$close.Size = New-Object System.Drawing.Size(145,32)
$close.Add_Click({$form.Close()})
$form.Controls.Add($close)
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400
$script:doneAt = $null
$timer.Add_Tick({
    $current = Read-LaunchState
    if ($current.state -eq 'error') {
        $label.Text = "Could not connect to Chrome.`r`nEnable remote debugging at chrome://inspect/#remote-debugging, then run the launcher again.`r`n" + $current.message
        $timer.Stop()
    } elseif ($current.state -eq 'running' -and $current.appliedRequestId -eq $requestId) {
        $label.Text = "AUTO AIM LOADED`r`nAduka / Boomer / ICE / Turtle / Nak / Raon / Grub.`r`nWind, angle, power and trajectory assistance.`r`nAutomatically restores after reloading this Chrome tab."
        if ($null -eq $script:doneAt) { $script:doneAt = (Get-Date).AddSeconds(3) }
        if ((Get-Date) -gt $script:doneAt) { $form.Close() }
    } elseif ($current.state -eq 'waiting-for-game-tab') {
        $label.Text = "Waiting for a DragonBound game tab.`r`nOpen https://dragonbound.net in Chrome with remote debugging enabled.`r`nIf several game tabs are open, keep only the intended one."
    } elseif ($current.state -eq 'retrying') {
        $label.Text = "Retrying the connection...`r`n" + $current.lastError
    } else {
        $label.Text = "Loading modules...`r`nIf Chrome asks to allow debugging, click Allow.`r`nStatus: " + $current.state
    }
})
$form.Add_Shown({try {Start-Loader; $timer.Start()} catch {$label.Text = $_.Exception.Message}})
$form.Add_FormClosed({$timer.Stop();$timer.Dispose()})
[System.Windows.Forms.Application]::Run($form)
