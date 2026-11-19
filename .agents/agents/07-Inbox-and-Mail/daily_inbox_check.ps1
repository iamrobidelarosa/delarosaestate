<#
.SYNOPSIS
  Hermes Daily Automated Inbox Sweep & Hygiene Routine
  Executes morning sweep, logs priority correspondence, and purges promotional spam to Trash.
.AUTHOR
  Hermes (@email-manager) | Supervisor: Mooji
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$triageScript = Join-Path $scriptDir "email_triage.ps1"

Write-Host "[Hermes] Commencing Daily Scheduled Inbox Sweep..." -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File $triageScript -PurgeSpam -ScanLimit 50

Write-Host "[Hermes] Daily sweep completed successfully." -ForegroundColor Green
