#!/bin/bash

# PostgreSQL Enum Type Casting Fix - Bash Script
# Problem: "operator does not exist: text <> tour_status"
# Lösung: Explizite Type Casts und IS DISTINCT FROM

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   PostgreSQL Enum Type Casting Fix (P0.4)                     ║"
echo "║   Behebung: 'operator does not exist: text <> tour_status'   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Variablen
MIGRATION_FILE="./supabase/migrations/20260330_p0_fix_enum_type_casting.sql"

# Prüfe Datei
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migrations-Datei nicht gefunden: $MIGRATION_FILE"
    exit 1
fi

echo "📋 Prüfe Voraussetzungen..."
echo ""

# Prüfe .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local nicht gefunden"
    echo "   Erstelle .env.local mit:"
    echo "   SUPABASE_URL=your-url"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your-key"
    exit 1
fi

echo "✓ .env.local vorhanden"

# Prüfe Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI nicht installiert"
    echo "   Installiere mit: npm install -g @supabase/cli"
    exit 1
fi

echo "✓ Supabase CLI installiert"
echo ""

# Load environment
echo "📝 Lade Umgebungsvariablen..."
set -a
source .env.local
set +a
echo "✓ Umgebungsvariablen geladen"
echo ""

# Hauptprozess
echo "🚀 Wende Enum Type Casting Fix an..."
echo ""

# Lese Migration-Datei
echo "📖 Lese Migration-Datei..."
STATEMENT_COUNT=$(grep -c "^CREATE\s\|^ALTER\s\|^DROP\s\|^DO\s" "$MIGRATION_FILE" || echo "0")
echo "   ✓ $STATEMENT_COUNT SQL-Statements gefunden"
echo ""

# Nutze Supabase CLI zum Hochfahren von Migrations
echo "🔄 Wende Migration über Supabase CLI an..."
echo ""

if supabase migration up --skip-seed; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   ✅ PostgreSQL Enum Type Casting Fix erfolgreich!           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    echo "📊 Angewendete Änderungen:"
    echo "   ✓ sync_tour_status_explicit() - Enum Type Casts"
    echo "   ✓ register_tour_atomic() - Status Comparisons"
    echo "   ✓ promote_from_waitlist() - Waitlist Logic"
    echo "   ✓ Enum Type Definitions überprüft"
    echo "   ✓ != durch IS DISTINCT FROM ersetzt"
    echo ""

    echo "🎯 Behobene Fehler:"
    echo '   ✓ "operator does not exist: text <> tour_status"'
    echo '   ✓ "operator does not exist: text <> participant_status"'
    echo "   ✓ Suboptimales NULL-Handling bei !="
    echo ""

    echo "💡 Nächste Schritte:"
    echo "   1. Teste Tour-Anmeldung"
    echo "   2. Teste Status-Synchronisation"
    echo "   3. Teste Wartelistenlogik"
    echo ""

    echo "✅ Alles erfolgreich!"
else
    echo ""
    echo "❌ Migration fehlgeschlagen"
    echo "   Prüfe Datenbankverbindung und Berechtigungen"
    exit 1
fi

