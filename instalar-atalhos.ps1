# Cria o ícone "SIMEAOBuddy" na área de trabalho e faz o servidor ligar sozinho com o Windows.
# Uso:    powershell -ExecutionPolicy Bypass -File instalar-atalhos.ps1
# Remover: powershell -ExecutionPolicy Bypass -File instalar-atalhos.ps1 -Remover
param([switch]$Remover)

$pasta = $PSScriptRoot
$areaDeTrabalho = [Environment]::GetFolderPath('Desktop')
$inicializar = [Environment]::GetFolderPath('Startup')
$atalhoDesktop = Join-Path $areaDeTrabalho 'SIMEAOBuddy.lnk'
$atalhoInicio = Join-Path $inicializar 'SIMEAOBuddy (servidor).lnk'

if ($Remover) {
  Remove-Item $atalhoDesktop, $atalhoInicio -ErrorAction SilentlyContinue
  Write-Output 'Atalhos removidos. O servidor não liga mais sozinho.'
  exit 0
}

# Ícone .ico gerado a partir das cores do app (azul -> roxo com um halter)
$ico = Join-Path $pasta 'public\icone.ico'
Add-Type -AssemblyName System.Drawing
$tam = 256
$bmp = New-Object System.Drawing.Bitmap $tam, $tam
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$caminho = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 64
$caminho.AddArc(0, 0, $r, $r, 180, 90); $caminho.AddArc($tam - $r, 0, $r, $r, 270, 90)
$caminho.AddArc($tam - $r, $tam - $r, $r, $r, 0, 90); $caminho.AddArc(0, $tam - $r, $r, $r, 90, 90)
$caminho.CloseFigure()
$pincel = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 0, 0), (New-Object System.Drawing.Point $tam, $tam), ([System.Drawing.ColorTranslator]::FromHtml('#3B82F6')), ([System.Drawing.ColorTranslator]::FromHtml('#8B5CF6'))
$g.FillPath($pincel, $caminho)
$caneta = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#FAFAFA')), 20
$caneta.StartCap = 'Round'; $caneta.EndCap = 'Round'
$g.DrawLine($caneta, 88, 128, 168, 128)
$g.DrawLine($caneta, 64, 92, 64, 164); $g.DrawLine($caneta, 192, 92, 192, 164)
$g.DrawLine($caneta, 40, 108, 40, 148); $g.DrawLine($caneta, 216, 108, 216, 148)
$g.Dispose()
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$png = $ms.ToArray()
$fs = [System.IO.File]::Create($ico)
$w = New-Object System.IO.BinaryWriter $fs
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]1)          # cabeçalho ICO
$w.Write([Byte]0); $w.Write([Byte]0); $w.Write([Byte]0); $w.Write([Byte]0) # 256x256
$w.Write([UInt16]1); $w.Write([UInt16]32); $w.Write([UInt32]$png.Length); $w.Write([UInt32]22)
$w.Write($png)
$w.Close()

$shell = New-Object -ComObject WScript.Shell
$vbs = Join-Path $pasta 'abrir.vbs'

$a = $shell.CreateShortcut($atalhoDesktop)
$a.TargetPath = "$env:SystemRoot\System32\wscript.exe"
$a.Arguments = "`"$vbs`""
$a.WorkingDirectory = $pasta
$a.IconLocation = $ico
$a.Description = 'Abrir o SIMEAOBuddy'
$a.Save()

$b = $shell.CreateShortcut($atalhoInicio)
$b.TargetPath = "$env:SystemRoot\System32\wscript.exe"
$b.Arguments = "`"$vbs`" /sem-navegador"
$b.WorkingDirectory = $pasta
$b.IconLocation = $ico
$b.Description = 'Liga o servidor do SIMEAOBuddy ao iniciar o Windows'
$b.Save()

Write-Output "Atalho criado: $atalhoDesktop"
Write-Output "Liga sozinho com o Windows: $atalhoInicio"
