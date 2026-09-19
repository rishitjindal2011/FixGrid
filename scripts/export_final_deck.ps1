$pptxPath = "c:\Users\Rishit Jindal\Downloads\FixGrid-main\FixGrid_Hackathon_Pitch_Deck.pptx"
$pdfPath = "c:\Users\Rishit Jindal\Downloads\FixGrid-main\FixGrid_Hackathon_Pitch_Deck.pdf"
$outDir = "c:\Users\Rishit Jindal\Downloads\FixGrid-main\final_slide_renders"

$pptxAbs = [System.IO.Path]::GetFullPath($pptxPath)
$pdfAbs = [System.IO.Path]::GetFullPath($pdfPath)
$outAbs = [System.IO.Path]::GetFullPath($outDir)

if (!(Test-Path $outAbs)) {
    New-Item -ItemType Directory -Path $outAbs -Force | Out-Null
}

Write-Host "Opening $pptxAbs in PowerPoint COM ..."
$ppt = New-Object -ComObject PowerPoint.Application
$pres = $ppt.Presentations.Open($pptxAbs, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)

Write-Host "Exporting to PDF: $pdfAbs"
$pres.SaveAs($pdfAbs, 32) # 32 = ppSaveAsPDF

Write-Host "Exporting $($pres.Slides.Count) slides to PNG (1920x1080) in $outAbs ..."
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
Write-Host "Deck exported to PDF and PNGs successfully!"
