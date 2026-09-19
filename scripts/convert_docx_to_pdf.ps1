param (
    [string]$docxPath,
    [string]$pdfPath
)

$docxAbs = [System.IO.Path]::GetFullPath($docxPath)
$pdfAbs = [System.IO.Path]::GetFullPath($pdfPath)

Write-Host "Converting $docxAbs to $pdfAbs..."

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open($docxAbs, $false, $true)
    # 17 = wdExportFormatPDF
    $doc.ExportAsFixedFormat($pdfAbs, 17)
    $doc.Close($false)
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [System.GC]::Collect()
    Write-Host "Success: $pdfAbs created!"
} catch {
    Write-Error $_
    if ($word) {
        try { $word.Quit() } catch {}
    }
    exit 1
}
