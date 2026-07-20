param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\dist")
)

$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestPath = Join-Path $repositoryRoot "manifest.json"
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json

if (-not $manifest.version) {
    throw "manifest.json does not contain a version."
}

$releaseFiles = @(
    "content.js",
    "icon-16.png",
    "icon-32.png",
    "icon-48.png",
    "icon.png",
    "LICENSE",
    "manifest.json",
    "options.html",
    "popup.html",
    "settings-config.js",
    "settings.css",
    "settings.js"
)

foreach ($relativePath in $releaseFiles) {
    $sourcePath = Join-Path $repositoryRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Required extension file is missing: $relativePath"
    }
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory, $repositoryRoot)
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

$archiveName = "video-pip-shortcut-v$($manifest.version).zip"
$archivePath = Join-Path $outputPath $archiveName
$stagingPath = Join-Path ([System.IO.Path]::GetTempPath()) "video-pip-shortcut-$([guid]::NewGuid())"

try {
    New-Item -ItemType Directory -Path $stagingPath | Out-Null

    foreach ($relativePath in $releaseFiles) {
        Copy-Item -LiteralPath (Join-Path $repositoryRoot $relativePath) -Destination (Join-Path $stagingPath $relativePath)
    }

    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath
    }

    Compress-Archive -Path (Join-Path $stagingPath "*") -DestinationPath $archivePath -CompressionLevel Optimal
}
finally {
    if (Test-Path -LiteralPath $stagingPath) {
        Remove-Item -LiteralPath $stagingPath -Recurse -Force
    }
}

$hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output "Created $archivePath"
Write-Output "SHA256 $hash"
