# Run in an elevated PowerShell on the Windows host that runs the ws-cf-tunnel agent.
# Installs cdp-browser-emulator + portable Chrome 153 under C:\cdp-emulator and starts it on 127.0.0.1:3000.
#   -EmulatorZip : path of a zip of the cdp-browser-emulator repo (git archive / GitHub "Download ZIP")
param([Parameter(Mandatory)][string]$EmulatorZip, [int]$Port = 3000)
$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue'
$root = 'C:\cdp-emulator'; New-Item -ItemType Directory -Force $root | Out-Null
Expand-Archive $EmulatorZip -DestinationPath "$root\app" -Force
$app = (Get-ChildItem "$root\app" | Where-Object PSIsContainer | Select-Object -First 1)
if (-not (Test-Path "$($app.FullName)\package.json")) { $app = Get-Item "$root\app" }

$chromeUrl = 'https://storage.googleapis.com/chrome-for-testing-public/153.0.8010.52/win64/chrome-win64.zip'
if (-not (Test-Path "$root\chrome\chrome-win64\chrome.exe")) {
  Invoke-WebRequest -UseBasicParsing $chromeUrl -OutFile "$root\chrome.zip"
  Expand-Archive "$root\chrome.zip" -DestinationPath "$root\chrome" -Force; Remove-Item "$root\chrome.zip"
}

Push-Location $app.FullName
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
npm install --omit=optional --no-audit --no-fund
npm run build
Pop-Location

$token = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
Set-Content "$root\gateway-token.txt" $token
$cmd = @"
@echo off
set HOST=127.0.0.1
set PORT=$Port
set GATEWAY_TOKEN=$token
set CHROMIUM_EXECUTABLE_PATH=$root\chrome\chrome-win64\chrome.exe
set CHROMIUM_VERSION_POLICY=warn
cd /d "$($app.FullName)"
node dist\chrome\cli.js >> "$root\emulator.log" 2>&1
"@
Set-Content "$root\run.cmd" $cmd -Encoding ASCII
icacls "$root\gateway-token.txt" /inheritance:r /grant:r "Administrators:F" "SYSTEM:F" | Out-Null

$action = New-ScheduledTaskAction -Execute "$root\run.cmd"
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName 'cdp-emulator' -Action $action -Trigger $trigger -User 'SYSTEM' -RunLevel Highest -Force | Out-Null
Start-ScheduledTask -TaskName 'cdp-emulator'
Start-Sleep 8
Invoke-WebRequest -UseBasicParsing -Headers @{Authorization = "Bearer $token"} "http://127.0.0.1:$Port/api/state" | Select-Object StatusCode
Write-Host "Gateway token saved in $root\gateway-token.txt"
