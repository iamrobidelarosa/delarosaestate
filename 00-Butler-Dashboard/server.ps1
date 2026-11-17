<#
.SYNOPSIS
  Household Command Center — Native PowerShell Zero-Dependency HTTP Server
.DESCRIPTION
  Serves 00-Butler-Dashboard files with strict no-cache headers for real-time status reflection.
  Runs out-of-the-box on Windows without requiring Python or Node.js.
#>

param(
    [int]$Port = 8080
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"

try {
    $listener.Prefixes.Add($prefix)
    $listener.Start()
} catch {
    Write-Warning "Port $Port is busy. Trying port $($Port + 1)..."
    $Port = $Port + 1
    $prefix = "http://localhost:$Port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "       ESTATE COMMAND CENTER — HOUSEHOLD TELEMETRY SERVER" -ForegroundColor White
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  Status        : ONLINE" -ForegroundColor Green
Write-Host "  Local URL     : $prefix" -ForegroundColor Yellow
Write-Host "  Serving Dir   : $scriptDir"
Write-Host "  Status Stream : $scriptDir\status.json"
Write-Host "  Caching       : DISABLED (Cache-Control: no-cache, no-store)"
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to terminate the server.`n"

# Launch default browser
Start-Process $prefix

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($urlPath)) {
            $urlPath = "index.html"
        }

        # Resolve clean relative path
        $filePath = Join-Path $scriptDir $urlPath

        # Security check: prevent directory traversal
        $fullPath = [System.IO.Path]::GetFullPath($filePath)
        if (-not $fullPath.StartsWith($scriptDir, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $fullPath -PathType Leaf)) {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            $response.Close()
            continue
        }

        $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
        $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

        # No-cache and CORS headers
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        $response.Headers.Add("Pragma", "no-cache")
        $response.Headers.Add("Expires", "0")
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.ContentType = $contentType

        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()

        $timestamp = (Get-Date).ToString("HH:mm:ss")
        Write-Host "[$timestamp] 200 OK: $urlPath" -ForegroundColor DarkGray
    }
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "`n[✓] Estate Command Center server terminated cleanly." -ForegroundColor Green
}
