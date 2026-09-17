Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\User\.gemini\antigravity-ide\brain\fa5a436c-c6c7-4752-b6fd-7fe6fb0c6e62\.user_uploaded\media_1789636568514.jpg"
$baseDir = "c:\Users\User\Documents\GitHub\POS"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output "Source image loaded: $($srcImg.Width)x$($srcImg.Height)"

# Clean the tiny AI sparkle in bottom-right corner if present
# Bottom right is at X: 90% - 98%, Y: 90% - 98%
$gClean = [System.Drawing.Graphics]::FromImage($srcImg)
$bgColor = $srcImg.GetPixel([int]($srcImg.Width * 0.85), [int]($srcImg.Height * 0.95))
$bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
# Cover bottom-right 10%
$cleanW = [int]($srcImg.Width * 0.12)
$cleanH = [int]($srcImg.Height * 0.12)
$cleanX = $srcImg.Width - $cleanW
$cleanY = $srcImg.Height - $cleanH
$gClean.FillRectangle($bgBrush, $cleanX, $cleanY, $cleanW, $cleanH)
$gClean.Dispose()
$bgBrush.Dispose()

function Resize-Image {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$targetWidth,
        [int]$targetHeight,
        [string]$outputPath,
        [double]$scaleInner = 1.0,
        [System.Drawing.Color]$padColor = [System.Drawing.Color]::FromArgb(13, 13, 13)
    )

    $destBmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBmp)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $brush = New-Object System.Drawing.SolidBrush($padColor)
    $graphics.FillRectangle($brush, 0, 0, $targetWidth, $targetHeight)
    $brush.Dispose()

    if ($scaleInner -eq 1.0) {
        $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
    } else {
        $drawW = [int]($targetWidth * $scaleInner)
        $drawH = [int]($targetHeight * $scaleInner)
        $drawX = [int](($targetWidth - $drawW) / 2)
        $drawY = [int](($targetHeight - $drawH) / 2)
        $graphics.DrawImage($source, $drawX, $drawY, $drawW, $drawH)
    }

    $graphics.Dispose()
    
    $parent = [System.IO.Path]::GetDirectoryName($outputPath)
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    
    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Output "Generated: $outputPath ($($targetWidth)x$($targetHeight))"
}

# 1. Web & PWA Icons
Resize-Image -source $srcImg -targetWidth 32 -targetHeight 32 -outputPath "$baseDir\public\favicon.png"
Resize-Image -source $srcImg -targetWidth 64 -targetHeight 64 -outputPath "$baseDir\public\favicon-64.png"
Resize-Image -source $srcImg -targetWidth 180 -targetHeight 180 -outputPath "$baseDir\public\apple-touch-icon.png"
Resize-Image -source $srcImg -targetWidth 192 -targetHeight 192 -outputPath "$baseDir\public\icon-192.png"
Resize-Image -source $srcImg -targetWidth 512 -targetHeight 512 -outputPath "$baseDir\public\icon-512.png"
Resize-Image -source $srcImg -targetWidth 512 -targetHeight 512 -outputPath "$baseDir\public\logo-app.png"

# 2. Android Icons
$mipmaps = @(
    @{ Name = "mipmap-mdpi"; Size = 48; ForeSize = 108 },
    @{ Name = "mipmap-hdpi"; Size = 72; ForeSize = 162 },
    @{ Name = "mipmap-xhdpi"; Size = 96; ForeSize = 216 },
    @{ Name = "mipmap-xxhdpi"; Size = 144; ForeSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192; ForeSize = 432 }
)

$androidRes = "$baseDir\android\app\src\main\res"

foreach ($m in $mipmaps) {
    $folder = Join-Path $androidRes $m.Name
    # Full launcher icon
    Resize-Image -source $srcImg -targetWidth $m.Size -targetHeight $m.Size -outputPath (Join-Path $folder "ic_launcher.png")
    # Round launcher icon
    Resize-Image -source $srcImg -targetWidth $m.Size -targetHeight $m.Size -outputPath (Join-Path $folder "ic_launcher_round.png")
    # Foreground adaptive icon (scaled to 72% so safe area is preserved inside squircle/circle masks)
    Resize-Image -source $srcImg -targetWidth $m.ForeSize -targetHeight $m.ForeSize -outputPath (Join-Path $folder "ic_launcher_foreground.png") -scaleInner 0.72
}

# 3. Splash Screen (Center logo on dark background)
$splashPaths = @(
    "$androidRes\drawable\splash.png",
    "$androidRes\drawable-port-mdpi\splash.png",
    "$androidRes\drawable-port-hdpi\splash.png",
    "$androidRes\drawable-port-xhdpi\splash.png",
    "$androidRes\drawable-port-xxhdpi\splash.png",
    "$androidRes\drawable-port-xxxhdpi\splash.png"
)

foreach ($sp in $splashPaths) {
    Resize-Image -source $srcImg -targetWidth 480 -targetHeight 480 -outputPath $sp
}

$srcImg.Dispose()
Write-Output "All icons successfully created!"
