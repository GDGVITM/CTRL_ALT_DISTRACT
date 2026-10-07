param(
    [ValidateSet('all', 'frontend', 'backend', 'ngrok')]
    [string]$Service = 'all'
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskLogDir = Join-Path $taskRoot '.hosting'
$Host.UI.RawUI.WindowTitle = "Ctrl Alt Distract - $Service logs"

function Write-HostingLine([string]$Name, [string]$Line) {
    if (-not $Line.Trim()) { return }
    if ($Name -like 'ngrok*') {
        $taskLabel = 'NGROK'
        $taskColor = 'Yellow'
        try {
            $taskRecord = $Line | ConvertFrom-Json
            $Line = "$($taskRecord.t) $($taskRecord.lvl) $($taskRecord.msg)"
            if ($taskRecord.url) { $Line += " $($taskRecord.url)" }
        } catch {}
        if ($Line -match '(?i)your authtoken:') { $Line = 'Your authtoken: [redacted]' }
    } elseif ($Name -eq 'server.log' -and $Line -match '"(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS) (\S+)') {
        if ($Matches[1] -match '^/api(?:/|\?|$)') {
            $taskLabel = 'BACKEND'
            $taskColor = 'Green'
        } else {
            $taskLabel = 'FRONTEND'
            $taskColor = 'Cyan'
        }
    } else {
        $taskLabel = 'BACKEND'
        $taskColor = 'Green'
    }
    if ($Service -ne 'all' -and $taskLabel.ToLowerInvariant() -ne $Service) { return }
    Write-Host "[$taskLabel] $Line" -ForegroundColor $taskColor
}

Write-Host 'CTRL ALT DISTRACT - Live server logs' -ForegroundColor White
Write-Host 'FRONTEND: pages/assets | BACKEND: API/startup/errors | NGROK: public tunnel'
Write-Host 'Browser JavaScript console errors are visible in browser DevTools (F12).'
Write-Host 'Ctrl+C stops this log viewer; the running server stays online.'
Write-Host ''

$taskOffsets = @{}
$taskFiles = @('server.log', 'server-error.log', 'ngrok.log', 'ngrok-error.log')
foreach ($taskName in $taskFiles) {
    $taskPath = Join-Path $taskLogDir $taskName
    if (Test-Path -LiteralPath $taskPath) {
        $taskStream = [System.IO.File]::Open($taskPath, 'Open', 'Read', 'ReadWrite')
        try {
            $taskReader = [System.IO.StreamReader]::new($taskStream)
            $taskLines = @()
            while (($taskLine = $taskReader.ReadLine()) -ne $null) {
                $taskLines += $taskLine
                if ($taskLines.Count -gt 15) { $taskLines = $taskLines[-15..-1] }
            }
            $taskOffsets[$taskName] = $taskStream.Position
            foreach ($taskLine in $taskLines) { Write-HostingLine $taskName $taskLine }
        } finally { $taskStream.Dispose() }
    } else { $taskOffsets[$taskName] = 0L }
}

while ($true) {
    foreach ($taskName in $taskFiles) {
        $taskPath = Join-Path $taskLogDir $taskName
        if (-not (Test-Path -LiteralPath $taskPath)) { continue }
        $taskStream = [System.IO.File]::Open($taskPath, 'Open', 'Read', 'ReadWrite')
        try {
            if ($taskStream.Length -lt $taskOffsets[$taskName]) { $taskOffsets[$taskName] = 0L }
            [void]$taskStream.Seek($taskOffsets[$taskName], 'Begin')
            $taskReader = [System.IO.StreamReader]::new($taskStream)
            while (($taskLine = $taskReader.ReadLine()) -ne $null) { Write-HostingLine $taskName $taskLine }
            $taskOffsets[$taskName] = $taskStream.Position
        } finally { $taskStream.Dispose() }
    }
    Start-Sleep -Milliseconds 500
}
