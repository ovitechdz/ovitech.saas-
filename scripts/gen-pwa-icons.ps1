param(
  [string]$Source = "public\ovitech-logo.jpeg",
  [string]$OutDir = "public\__grok"
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile($Source)
$outDir = Resolve-Path $OutDir

function New-Tile([int]$size, [string]$name, [float]$containPct) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $b = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0a1220"))
  $g.FillRectangle($b, 0, 0, $size, $size)
  if ($containPct -gt 0) {
    $d = [math]::Floor($size * $containPct)
    $off = [math]::Floor(($size - $d) / 2)
    $g.DrawImage($src, $off, $off, $d, $d)
  } else {
    $g.DrawImage($src, 0, 0, $size, $size)
  }
  $g.Dispose()
  $bmp.Save((Join-Path $outDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("gen " + $name + " " + $size + "x" + $size)
}

New-Tile 180 "icon-180.png" 0
New-Tile 192 "icon-192.png" 0
New-Tile 512 "icon-512.png" 0
New-Tile 512 "icon-512-maskable.png" 0.62
$src.Dispose()