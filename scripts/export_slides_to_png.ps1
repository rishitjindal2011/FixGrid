param (
    [string]$pptxPath = "C:\Users\Rishit Jindal\Downloads\Fix-Grid.pptx",
    [string]$outDir = "c:\Users\Rishit Jindal\Downloads\FixGrid-main\template_slides"
)

$pptxAbs = [System.IO.Path]::GetFullPath($pptxPath)
$outAbs = [System.IO.Path]::GetFullPath($outDir)

if (!(Test-Path $outAbs)) {
    New-Item -ItemType Directory -Path $outAbs -Force | Out-Null
}

Write-Host "Opening $pptxAbs ..."
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open($pptxAbs, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)

Write-Host "Total slides: $($pres.Slides.Count)"
for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $slide = $pres.Slides.Item($i)
    $imgPath = [System.IO.Path]::Combine($outAbs, "slide_$i.png")
    $slide.Export($imgPath, "PNG", 1920, 1080)
    Write-Host "Exported slide $i -> $imgPath"
}

$pres.Close()
$ppt.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
[System.GC]::Collect()
Write-Host "All slides exported successfully!"
