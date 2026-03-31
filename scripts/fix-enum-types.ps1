# PostgreSQL Enum Type Casting Fix - PowerShell Script
# Problem: "operator does not exist: text <> tour_status"
# Lösung: Explizite Type Casts und IS DISTINCT FROM

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PostgreSQL Enum Type Casting Fix (P0.4)                     ║" -ForegroundColor Cyan
Write-Host "║   Behebung: 'operator does not exist: text <> tour_status'   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Variablen
$migrationFile = ".\supabase\migrations\20260330_p0_fix_enum_type_casting.sql"
$env:PAGER = ""  # Deaktiviere Pager

# Prüfe Datei
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migrations-Datei nicht gefunden: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Prüfe Voraussetzungen..." -ForegroundColor Yellow
Write-Host ""

# Prüfe .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local nicht gefunden" -ForegroundColor Red
    Write-Host "   Erstelle .env.local mit:" -ForegroundColor Yellow
    Write-Host "   SUPABASE_URL=your-url" -ForegroundColor Gray
    Write-Host "   SUPABASE_SERVICE_ROLE_KEY=your-key" -ForegroundColor Gray
    exit 1
}

Write-Host "✓ .env.local vorhanden" -ForegroundColor Green

# Prüfe Supabase CLI
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI nicht installiert" -ForegroundColor Red
    Write-Host "   Installiere mit: npm install -g @supabase/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Supabase CLI installiert" -ForegroundColor Green
Write-Host ""

# Load environment
Write-Host "📝 Lade Umgebungsvariablen..." -ForegroundColor Yellow
Get-Content .env.local | ForEach-Object {
    if ($_ -match "^([^=]+)=(.*)$") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}
Write-Host "✓ Umgebungsvariablen geladen" -ForegroundColor Green
Write-Host ""

# Hauptprozess
Write-Host "🚀 Wende Enum Type Casting Fix an..." -ForegroundColor Green
Write-Host ""

try {
    # Lese Migration-Datei
    Write-Host "📖 Lese Migration-Datei..." -ForegroundColor Yellow
    $sqlContent = Get-Content $migrationFile -Raw

    # Zähle Statements (vereinfacht)
    $statementCount = ($sqlContent | Select-String -Pattern "^CREATE\s|^ALTER\s|^DROP\s|^DO\s" | Measure-Object).Count

    Write-Host "   ✓ $statementCount SQL-Statements gefunden" -ForegroundColor Green
    Write-Host ""

    # Nutze Supabase CLI zum Hochfahren von Migrations
    Write-Host "🔄 Wende Migration über Supabase CLI an..." -ForegroundColor Yellow
    Write-Host ""

    $process = Start-Process -FilePath "supabase" -ArgumentList "migration", "up", "--skip-seed" `
        -NoNewWindow -PassThru -RedirectStandardOutput "migration_output.txt" -RedirectStandardError "migration_error.txt"

    $exitCode = $process.ExitCode

    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║   ✅ PostgreSQL Enum Type Casting Fix erfolgreich!           ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""

        Write-Host "📊 Angewendete Änderungen:" -ForegroundColor Green
        Write-Host "   ✓ sync_tour_status_explicit() - Enum Type Casts" -ForegroundColor Green
        Write-Host "   ✓ register_tour_atomic() - Status Comparisons" -ForegroundColor Green
        Write-Host "   ✓ promote_from_waitlist() - Waitlist Logic" -ForegroundColor Green
        Write-Host "   ✓ Enum Type Definitions überprüft" -ForegroundColor Green
        Write-Host "   ✓ != durch IS DISTINCT FROM ersetzt" -ForegroundColor Green
        Write-Host ""

        Write-Host "🎯 Behobene Fehler:" -ForegroundColor Green
        Write-Host '   ✓ "operator does not exist: text <> tour_status"' -ForegroundColor Green
        Write-Host '   ✓ "operator does not exist: text <> participant_status"' -ForegroundColor Green
        Write-Host "   ✓ Suboptimales NULL-Handling bei !=" -ForegroundColor Green
        Write-Host ""

        Write-Host "💡 Nächste Schritte:" -ForegroundColor Yellow
        Write-Host "   1. Teste Tour-Anmeldung" -ForegroundColor Gray
        Write-Host "   2. Teste Status-Synchronisation" -ForegroundColor Gray
        Write-Host "   3. Teste Wartelistenlogik" -ForegroundColor Gray
        Write-Host ""

        Write-Host "✅ Alles erfolgreich!" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "❌ Migration fehlgeschlagen" -ForegroundColor Red
        Write-Host ""

        # Zeige Fehler
        if (Test-Path "migration_error.txt") {
            $errorContent = Get-Content "migration_error.txt"
            Write-Host "Fehlermeldung:" -ForegroundColor Yellow
            Write-Host $errorContent -ForegroundColor Red
        }

        exit 1
    }
}
catch {
    Write-Host "❌ Fehler beim Ausführen der Migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    # Aufräumen
    if (Test-Path "migration_output.txt") {
        Remove-Item "migration_output.txt"
    }
    if (Test-Path "migration_error.txt") {
        Remove-Item "migration_error.txt"
    }
}

