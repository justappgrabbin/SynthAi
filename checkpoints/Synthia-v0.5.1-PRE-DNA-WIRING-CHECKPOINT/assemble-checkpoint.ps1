$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Name = "Synthia-v0.5.1-PRE-DNA-WIRING-CHECKPOINT.zip"
$Output = if ($args.Count -gt 0) { $args[0] } else { Join-Path $Root $Name }
$Parts = Get-ChildItem (Join-Path $Root "parts") -Filter "part-*.bin" | Sort-Object Name
$Destination = [System.IO.File]::Create($Output)
try {
  foreach ($Part in $Parts) {
    $Source = [System.IO.File]::OpenRead($Part.FullName)
    try { $Source.CopyTo($Destination) } finally { $Source.Dispose() }
  }
} finally { $Destination.Dispose() }
$Actual = (Get-FileHash -Algorithm SHA256 $Output).Hash.ToLowerInvariant()
$Expected = "1cd97f41a70006b98fb7a95db927a7e026d42331822c67f07bd99c7b2f67df82"
if ($Actual -ne $Expected) { throw "Checksum mismatch: expected $Expected, got $Actual" }
Write-Output "Verified: $Output"
