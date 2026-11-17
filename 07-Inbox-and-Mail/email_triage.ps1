<#
.SYNOPSIS
  Hermes Native PowerShell IMAP Email Triage Engine
  Connects to Gmail IMAP via SSL, scans recent emails, categorizes priority vs spam/promotions,
  and generates an executive inbox briefing in Obsidian.
.AUTHOR
  Hermes (@email-manager) | Supervisor: Mooji
#>

param(
    [string]$EmailAddress = "",
    [string]$AppPassword = "",
    [int]$ScanLimit = 35,
    [switch]$PurgeSpam = $false
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Load from .env if parameters omitted
$envFile = Join-Path $scriptDir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim() -replace '\s+', ''
            if ($k -eq "GMAIL_ADDRESS" -and -not $EmailAddress) { $EmailAddress = $v }
            if ($k -eq "GMAIL_APP_PASSWORD" -and -not $AppPassword) { $AppPassword = $v }
        }
    }
}

if (-not $EmailAddress -or -not $AppPassword) {
    Write-Error "Missing email address or app password."
}

# Clean password of spaces
$AppPassword = $AppPassword -replace '\s+', ''

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "       HERMES — EXECUTIVE MAIL SECRETARY & INBOX TRIAGE" -ForegroundColor White
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  Target Account : $EmailAddress" -ForegroundColor Yellow
Write-Host "  IMAP Server    : imap.gmail.com:993 (SSL)"
Write-Host "  Scan Window    : Last $ScanLimit messages"
Write-Host "========================================================================`n"

function Decode-MimeHeader([string]$val) {
    if (-not $val) { return "" }
    $pattern = '=\?([^\?]+)\?([BQbq])\?([^\?]+)\?='
    $result = [regex]::Replace($val, $pattern, {
        param($m)
        $charset = $m.Groups[1].Value
        $encoding = $m.Groups[2].Value.ToUpper()
        $encodedText = $m.Groups[3].Value
        try {
            $enc = [System.Text.Encoding]::GetEncoding($charset)
            if ($encoding -eq "B") {
                $bytes = [Convert]::FromBase64String($encodedText)
                return $enc.GetString($bytes)
            } elseif ($encoding -eq "Q") {
                $qDecoded = $encodedText -replace '_', ' '
                $qDecoded = [regex]::Replace($qDecoded, '=([0-9A-Fa-f]{2})', {
                    param($qm)
                    [char][Convert]::ToByte($qm.Groups[1].Value, 16)
                })
                return $qDecoded
            }
        } catch {
            return $encodedText
        }
        return $encodedText
    })
    return $result
}

# Connect via SSL
$tcpClient = New-Object System.Net.Sockets.TcpClient
$tcpClient.Connect("imap.gmail.com", 993)
$sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream(), $false)
$sslStream.AuthenticateAsClient("imap.gmail.com")

$reader = New-Object System.IO.StreamReader($sslStream, [System.Text.Encoding]::UTF8)
$writer = New-Object System.IO.StreamWriter($sslStream, [System.Text.Encoding]::ASCII)
$writer.AutoFlush = $true

$tagCounter = 1
function Send-ImapCommand([string]$cmd) {
    $tag = "A{0:D4}" -f $script:tagCounter
    $script:tagCounter++
    $line = "$tag $cmd"
    $writer.WriteLine($line)
    
    $responseLines = New-Object System.Collections.Generic.List[string]
    while ($true) {
        $resp = $reader.ReadLine()
        if ($null -eq $resp) { break }
        $responseLines.Add($resp)
        if ($resp.StartsWith("$tag OK") -or $resp.StartsWith("$tag NO") -or $resp.StartsWith("$tag BAD")) {
            break
        }
    }
    return [PSCustomObject]@{
        Tag = $tag
        Lines = $responseLines
        Status = ($responseLines[$responseLines.Count - 1])
    }
}

# 1. Read Greeting
$greeting = $reader.ReadLine()
Write-Host "[✓] IMAP Connected: $greeting" -ForegroundColor Green

# 2. Login
Write-Host "[*] Authenticating with Gmail App Password..." -ForegroundColor Cyan
$loginResp = Send-ImapCommand "LOGIN $EmailAddress $AppPassword"
if (-not ($loginResp.Status -match "OK")) {
    $tcpClient.Close()
    Write-Error "Authentication Failed: $($loginResp.Status)"
}
Write-Host "[✓] Authenticated successfully." -ForegroundColor Green

# 3. Select INBOX
$selectResp = Send-ImapCommand "SELECT INBOX"
Write-Host "[✓] INBOX Selected." -ForegroundColor Green

# 4. Search ALL messages
Write-Host "[*] Scanning inbox message catalogue..." -ForegroundColor Cyan
$searchResp = Send-ImapCommand "SEARCH ALL"
$allIds = @()
foreach ($l in $searchResp.Lines) {
    if ($l -match '^\*\s+SEARCH\s+(.+)$') {
        $ids = $Matches[1].Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
        $allIds += $ids
    }
}

Write-Host "[✓] Total messages in INBOX: $($allIds.Count)" -ForegroundColor Green

if ($allIds.Count -eq 0) {
    Write-Host "[!] Inbox is completely empty." -ForegroundColor Yellow
    Send-ImapCommand "LOGOUT"
    $tcpClient.Close()
    exit 0
}

# Take recent slice
$startIdx = [Math]::Max(0, $allIds.Count - $ScanLimit)
$recentSlice = $allIds[$startIdx..($allIds.Count - 1)]
[Array]::Reverse($recentSlice)

Write-Host "[*] Inspecting headers for the latest $($recentSlice.Count) messages..." -ForegroundColor Cyan

$triageResults = New-Object System.Collections.Generic.List[PSCustomObject]

$financialKeywords = @("statement", "due date", "payment", "bpi", "unionbank", "tonik", "uno", "pag-ibig", "salary", "payroll", "invoice", "receipt", "alert", "otp", "security", "bill", "billing", "loan", "card", "verification code", "verification", "auth code")
$promotionalKeywords = @("unsubscribe", "view in browser", "discount", "sale", "limited time", "special offer", "promo", "deal", "newsletter", "save up to", "exclusive", "marketing", "promotion", "shop now", "free shipping", "clearance", "advertisement", "off your next", "coupon", "best offers")

foreach ($msgId in $recentSlice) {
    $fetchResp = Send-ImapCommand "FETCH $msgId (BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE LIST-UNSUBSCRIBE)])"
    $rawHeaders = ($fetchResp.Lines -join "`n")

    $subject = "(No Subject)"
    $from = "(Unknown Sender)"
    $date = ""
    $hasUnsub = $false

    if ($rawHeaders -match '(?im)^Subject:\s*(.+)$') {
        $subject = Decode-MimeHeader $Matches[1].Trim()
    }
    if ($rawHeaders -match '(?im)^From:\s*(.+)$') {
        $from = Decode-MimeHeader $Matches[1].Trim()
    }
    if ($rawHeaders -match '(?im)^Date:\s*(.+)$') {
        $date = $Matches[1].Trim()
    }
    if ($rawHeaders -match '(?im)^List-Unsubscribe:') {
        $hasUnsub = $true
    }

    $combined = "$subject $from".ToLower()

    $category = "IMPORTANT_PERSONAL"

    # Check Financial / VIP
    foreach ($kw in $financialKeywords) {
        if ($combined -match [regex]::Escape($kw)) {
            $category = "VIP_PRIORITY"
            break
        }
    }

    # Check Promotional / Spam
    if ($category -ne "VIP_PRIORITY") {
        if ($hasUnsub) {
            $category = "PROMOTION_SPAM"
        } else {
            foreach ($kw in $promotionalKeywords) {
                if ($combined -match [regex]::Escape($kw)) {
                    $category = "PROMOTION_SPAM"
                    break
                }
            }
        }
    }

    $triageResults.Add([PSCustomObject]@{
        Id = $msgId
        From = $from
        Subject = $subject
        Date = $date
        Category = $category
        HasUnsubscribe = $hasUnsub
    })
}

# Separate categories
$vipItems = @($triageResults | Where-Object { $_.Category -eq "VIP_PRIORITY" })
$personalItems = @($triageResults | Where-Object { $_.Category -eq "IMPORTANT_PERSONAL" })
$spamItems = @($triageResults | Where-Object { $_.Category -eq "PROMOTION_SPAM" })

Write-Host "`n========================================================================" -ForegroundColor Cyan
Write-Host "       TRIAGE DIAGNOSTIC RESULTS" -ForegroundColor White
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  🔴 VIP & Critical Alerts  : $($vipItems.Count)" -ForegroundColor Green
Write-Host "  📩 Personal Correspondence: $($personalItems.Count)" -ForegroundColor Cyan
Write-Host "  🗑️ Promotional / Spam Drains: $($spamItems.Count)" -ForegroundColor Yellow
Write-Host "========================================================================`n"

# Purge Spam if commanded
$purgedCount = 0
if ($PurgeSpam -and $spamItems.Count -gt 0) {
    Write-Host "[*] Purging $($spamItems.Count) promotional/spam messages to Trash..." -ForegroundColor Yellow
    foreach ($item in $spamItems) {
        $mid = $item.Id
        # Move to Gmail Trash
        Send-ImapCommand "COPY $mid `"[Gmail]/Trash`"" | Out-Null
        Send-ImapCommand "STORE $mid +FLAGS (\Deleted)" | Out-Null
        $purgedCount++
    }
    Send-ImapCommand "EXPUNGE" | Out-Null
    Write-Host "[✓] Purged $purgedCount items to Trash." -ForegroundColor Green
}

# Logout cleanly
Send-ImapCommand "LOGOUT" | Out-Null
$tcpClient.Close()

# Generate Markdown Digest
$today = Get-Date -Format "yyyy-MM-dd"
$digestPath = Join-Path $scriptDir "daily-inbox-digest-$today.md"

$md = @()
$md += "---"
$md += "title: Executive Inbox Digest — $today"
$md += "category: Communications"
$md += "triage_officer: Hermes (@email-manager)"
$md += "account: $EmailAddress"
$md += "date: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
$md += "tags: [inbox, triage, email, daily-digest]"
$md += "---"
$md += ""
$md += "# Executive Inbox Digest — $(Get-Date -Format 'MMMM dd, yyyy')"
$md += "**Triage Officer:** Hermes (`@email-manager`), Executive Mail Secretary  "
$md += "**Monitored Account:** ``$EmailAddress``  "
$md += "**Total Scanned:** $($triageResults.Count) | **VIP & Critical:** $($vipItems.Count) | **Personal/Direct:** $($personalItems.Count) | **Promotions/Spam:** $($spamItems.Count)  "
$md += "**Cross-References:** [[07-Inbox-and-Mail/inbox-management-protocol]], [[AGENTS]], [[00-Butler-Dashboard/status.json]]"
$md += ""
$md += "---"
$md += ""
$md += "## 🔴 VIP & Critical Priority Communications"

if ($vipItems.Count -eq 0) {
    $md += "*No urgent financial or security alerts detected in the current scan window.*"
} else {
    foreach ($item in $vipItems) {
        $md += "* **🎯 [FINANCE/LEGAL/SECURITY]**"
        $md += "  * **From:** ``$($item.From)``"
        $md += "  * **Subject:** $($item.Subject)"
        $md += "  * **Date:** $($item.Date)"
    }
}

$md += ""
$md += "---"
$md += ""
$md += "## 📩 Personal & Direct Correspondence"

if ($personalItems.Count -eq 0) {
    $md += "*No direct personal messages in the current scan window.*"
} else {
    foreach ($item in $personalItems) {
        $md += "* **From:** ``$($item.From)``"
        $md += "  * **Subject:** $($item.Subject)"
        $md += "  * **Date:** $($item.Date)"
    }
}

$md += ""
$md += "---"
$md += ""
$md += "## 🗑️ Filtered Promotions & Spam Clutter ($($spamItems.Count) Detected)"

if ($PurgeSpam) {
    $md += "> [!NOTE]"
    $md += "> **Action Taken:** The $purgedCount promotional items below have been automatically relocated to the Trash folder."
} else {
    $md += "> [!WARNING]"
    $md += "> **Status:** Flagged for purge. Run with `-PurgeSpam` to immediately move these to Trash."
}

$md += ""
if ($spamItems.Count -eq 0) {
    $md += "*Your inbox is currently free of promotional clutter.*"
} else {
    foreach ($item in $spamItems) {
        $md += "* [🗑️ Junk] **From:** ``$($item.From)`` — **Subject:** $($item.Subject)"
    }
}

$md | Out-File -FilePath $digestPath -Encoding utf8
Write-Host "[✓] Digest authored at: $digestPath" -ForegroundColor Green

# Output summary object
[PSCustomObject]@{
    Account = $EmailAddress
    TotalScanned = $triageResults.Count
    VipCount = $vipItems.Count
    PersonalCount = $personalItems.Count
    SpamCount = $spamItems.Count
    DigestPath = $digestPath
} | Format-List
