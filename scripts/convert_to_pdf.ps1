param (
    [string]$pptxPath,
    [string]$pdfPath
)

$pptxAbs = [System.IO.Path]::GetFullPath($pptxPath)
$pdfAbs = [System.IO.Path]::GetFullPath($pdfPath)

Write-Host "Converting $pptxAbs to $pdfAbs..."

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    # Open presentation (ReadOnly, Untitled, WithWindow)
    # WithWindow must be False/msoFalse for headless, or True if required
    $pres = $ppt.Presentations.Open($pptxAbs, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    
    # 32 = ppSaveAsPDF
    $pres.SaveAs($pdfAbs, 32)
    $pres.Close()
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
    Write-Host "Success: $pdfAbs created!"
} catch {
    Write-Error $_
    if ($ppt) {
        try { $ppt.Quit() } catch {}
    }
    exit 1
}
