param(
    [string] = '',
    [string] = '',
    [string] = '',
    [string] = 'http://timestamp.digicert.com'
)

Continue = 'Stop'

Write-Host '==========================================' -ForegroundColor Cyan
Write-Host '  AI Widget - Signature de Code Windows   ' -ForegroundColor Cyan
Write-Host '==========================================' -ForegroundColor Cyan

# 1. Rechercher signtool.exe
 = @(
    'C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe',
    'C:\Program Files\Windows Kits\10\bin\*\x64\signtool.exe',
    'C:\Program Files (x86)\Microsoft SDKs\Windows\*\bin\signtool.exe'
)

 = 
foreach ( in ) {
     = Get-ChildItem -Path  -ErrorAction SilentlyContinue | Select-Object -Last 1
    if () {
         = .FullName
        break
    }
}

if (-not ) {
    Write-Warning 'signtool.exe non trouvé dans les kits standards. Utilisation du fallback PowerShell.'
} else {
    Write-Host 'SignTool détecté : '  -ForegroundColor Green
}

# 2. Lister les fichiers à signer
 = Join-Path  '..\release'
 = Get-ChildItem -Path  -Include '*.exe', '*.msi' -Recurse

if (.Count -eq 0) {
    Write-Host 'Aucun binaire à signer dans '  -ForegroundColor Yellow
    exit 0
}

Write-Host 'Fichiers cibles :' -ForegroundColor Cyan
foreach ( in ) {
    Write-Host (' - ' + .Name) -ForegroundColor Gray
}

# 3. Signature
foreach ( in ) {
    Write-Host ('Signature de ' + .Name + '...') -ForegroundColor Yellow

    if ( -and (Test-Path )) {
        if () {
             = if () { '/p ' +  } else { '' }
            &  sign /f   /fd SHA256 /tr  /td SHA256 .FullName
        } else {
             = Get-PfxCertificate -FilePath 
            Set-AuthenticodeSignature -FilePath .FullName -Certificate  -TimestampServer  -HashAlgorithm SHA256
        }
    } elseif () {
        if () {
            &  sign /sha1  /fd SHA256 /tr  /td SHA256 .FullName
        } else {
             = Get-Item ('Cert:\CurrentUser\My\' + ) -ErrorAction SilentlyContinue
            if (-not ) {  = Get-Item ('Cert:\LocalMachine\My\' + ) }
            Set-AuthenticodeSignature -FilePath .FullName -Certificate  -TimestampServer  -HashAlgorithm SHA256
        }
    } else {
        Write-Host 'Aucun certificat spécifié. Pour signer, passez -CertPath ou -Thumbprint.' -ForegroundColor Gray
        Write-Host 'Exemple : .\scripts\sign-package.ps1 -CertPath C:\certs\cert.pfx -CertPassword 1234' -ForegroundColor Gray
        break
    }

     = Get-AuthenticodeSignature -FilePath .FullName
    if (.Status -eq 'Valid') {
        Write-Host ('✓ ' + .Name + ' signé avec succès par ' + .SignerCertificate.Subject) -ForegroundColor Green
    } else {
        Write-Host ('Statut : ' + .StatusMessage) -ForegroundColor Yellow
    }
}

Write-Host 'Terminé !' -ForegroundColor Cyan
