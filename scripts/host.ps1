param(
    [ValidateRange(1024, 65535)][int]$Port = 8000,
    [string]$PublicUrl
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot

$taskListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $taskListener.Start() } catch { throw "Port $Port is already in use. Stop that server or choose another port with -Port." }
finally { $taskListener.Stop() }

if (-not (Test-Path -LiteralPath 'backend/.env')) {
    throw 'Configure backend/.env before hosting. See backend/.env.example.'
}
if (-not (Test-Path -LiteralPath '.env')) {
    throw 'Configure the frontend Supabase values in .env before hosting.'
}
$taskNgrok = (Get-Command ngrok -ErrorAction Stop).Source
& $taskNgrok config check
if ($LASTEXITCODE -ne 0) {
    throw 'Configure ngrok first: ngrok config add-authtoken YOUR_TOKEN'
}
$taskPython = Join-Path $taskRoot 'backend/.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) {
    $taskPython = (Get-Command python -ErrorAction Stop).Source
}
$taskLogDir = Join-Path $taskRoot '.hosting'
New-Item -ItemType Directory -Path $taskLogDir -Force | Out-Null

# The build uses relative API URLs so remote devices call this same server.
$taskPreviousApi = $env:VITE_API_URL
try {
    $env:VITE_API_URL = '/'
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
} finally {
    $env:VITE_API_URL = $taskPreviousApi
}

$taskPreviousAppEnv = $env:APP_ENV
$taskServer = $null
try {
    $env:APP_ENV = 'production'
    $taskServer = Start-Process -FilePath $taskPython -WorkingDirectory (Join-Path $taskRoot 'backend') `
        -ArgumentList @('-m', 'uvicorn', 'app.host:app', '--host', '127.0.0.1', '--port', "$Port") `
        -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $taskLogDir 'server.log') `
        -RedirectStandardError (Join-Path $taskLogDir 'server-error.log')
    $taskReady = $false
    for ($taskAttempt = 0; $taskAttempt -lt 30; $taskAttempt++) {
        $taskServer.Refresh()
        if ($taskServer.HasExited) { throw 'Server exited. Check .hosting/server-error.log.' }
        try {
            $taskHealth = Invoke-RestMethod "http://127.0.0.1:$Port/api/health" -TimeoutSec 2
            if ($taskHealth.status -eq 'online') { $taskReady = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $taskReady) { throw 'Server did not become healthy. Check .hosting/server-error.log.' }
    Write-Host "Website and API ready at http://127.0.0.1:$Port"
    Write-Host 'Share the HTTPS Forwarding URL printed below. Keep this terminal and laptop running.'
    $taskNgrokArgs = @('http', "http://127.0.0.1:$Port")
    if ($PublicUrl) { $taskNgrokArgs += @('--url', $PublicUrl) }
    & $taskNgrok @taskNgrokArgs
    if ($LASTEXITCODE -ne 0) { throw 'ngrok failed to connect. See the error above.' }
} finally {
    $env:APP_ENV = $taskPreviousAppEnv
    if ($taskServer -and -not $taskServer.HasExited) { Stop-Process -Id $taskServer.Id }
}
