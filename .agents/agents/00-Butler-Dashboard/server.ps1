param(
    [int]$Port = 8080
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$pythonPath = $null
$pythonPrefix = @()

$pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
if ($pythonCommand -and $pythonCommand.Source -notlike '*\WindowsApps\*') {
    $pythonPath = $pythonCommand.Source
}

if (-not $pythonPath) {
    foreach ($version in @('Python313', 'Python312', 'Python311')) {
        $candidate = Join-Path $env:LocalAppData "Programs\Python\$version\python.exe"
        if (Test-Path $candidate -PathType Leaf) {
            $pythonPath = $candidate
            break
        }
    }
}

if (-not $pythonPath) {
    $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($launcher) {
        $pythonPath = $launcher.Source
        $pythonPrefix = @('-3')
    }
}

if (-not $pythonPath) {
    Write-Error 'Python 3.11 or newer is required. Install Python, then run: python -m pip install -r requirements.txt'
    exit 1
}

$versionOutput = & $pythonPath @pythonPrefix --version 2>&1
if ($versionOutput -notmatch 'Python (\d+)\.(\d+)') {
    Write-Error "Could not determine the Python version from: $versionOutput"
    exit 1
}

$installedVersion = [version]::new([int]$Matches[1], [int]$Matches[2])
if ($installedVersion -lt [version]'3.11') {
    Write-Error "Python 3.11 or newer is required; found $versionOutput"
    exit 1
}

$serverPath = Join-Path $scriptDir 'server.py'
$serverArguments = @()
$serverArguments += $pythonPrefix
$serverArguments += @($serverPath, [string]$Port, '--open')

& $pythonPath @serverArguments
exit $LASTEXITCODE
