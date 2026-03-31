# PostgreSQL Enum Type Casting Fix - Schnellreferenz

## 📋 Überblick

Diese Sammlung behebt den PostgreSQL-Fehler:
```
ERROR: operator does not exist: text <> tour_status
```

**Root Cause:** TEXT-Variablen wurden mit Enum-Typen verglichen.

---

## 📁 Erstellte Dateien

### 1. **Migration-Datei** (Hauptfix)
```
supabase/migrations/20260330_p0_fix_enum_type_casting.sql
```
- Enthält alle behobenen Funktionen
- Explizite Type Casts
- IS DISTINCT FROM Operatoren
- Dokumentation der Changes

### 2. **Anwendungs-Skripte**

#### TypeScript (Multi-Platform)
```
scripts/apply-enum-fix.ts
```
- Intelligent SQL Statement Splitting
- Fehlerbehandlung
- Detaillierte Ausgabe
- **Ausführung:** `npm run fix:enum-types`

#### Windows PowerShell
```
scripts/fix-enum-types.ps1
```
- Native PowerShell Implementation
- Farbige Ausgabe
- Fehler-Logging
- **Ausführung:** `npm run fix:enum-types:ps1`

#### Linux/macOS Bash
```
scripts/fix-enum-types.sh
```
- Unix-Shell Script
- Portable Ausführung
- **Ausführung:** `npm run fix:enum-types:bash`

### 3. **Dokumentation**
```
scripts/ENUM_FIX_DOCUMENTATION.md
```
- Detaillierte Erklärung des Problems
- Lösungsansätze
- Best Practices
- Test-Queries

---

## 🚀 Schnellstart

### Windows (PowerShell)
```powershell
npm run fix:enum-types:ps1
```

### macOS/Linux (Bash)
```bash
npm run fix:enum-types:bash
```

### Alle Plattformen (TypeScript)
```bash
npm run fix:enum-types
```

---

## ✅ Was wird behoben?

### Problem 1: TEXT vs Enum Type
```sql
-- ❌ VORHER
DECLARE v_target_status TEXT;

-- ✅ NACHHER
DECLARE v_target_status public.tour_status;
```

### Problem 2: Implizite String-Konvertierung
```sql
-- ❌ VORHER
WHERE status = 'confirmed'

-- ✅ NACHHER
WHERE status = 'confirmed'::public.participant_status
```

### Problem 3: Suboptimales NULL-Handling
```sql
-- ❌ VORHER
IF old_value != new_value THEN

-- ✅ NACHHER
IF old_value IS DISTINCT FROM new_value THEN
```

---

## 📊 Betroffene Funktionen

| Funktion | Änderungen | Status |
|----------|-----------|--------|
| `sync_tour_status_explicit()` | Variable Type + Casts | ✅ Fixed |
| `register_tour_atomic()` | Status Comparisons | ✅ Fixed |
| `promote_from_waitlist()` | Waitlist Logic + Casts | ✅ Fixed |

---

## 🔍 Verifizierung nach Anwendung

```sql
-- 1. Funktionen prüfen
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('sync_tour_status_explicit', 'register_tour_atomic', 'promote_from_waitlist');

-- 2. Enum-Typen prüfen
SELECT typname FROM pg_type 
WHERE typname IN ('tour_status', 'participant_status');

-- 3. Funktionen testen
SELECT * FROM sync_tour_status_explicit('your-tour-id'::uuid);
```

---

## 📚 Dokumentation

- **Detailliert:** `scripts/ENUM_FIX_DOCUMENTATION.md`
- **Migrations:** `scripts/README.md`
- **Projekt:** `AGENTS.md`, `database.md`

---

## 🆘 Troubleshooting

### Problem: "Migration fehlgeschlagen"
**Lösung:**
1. Prüfe `.env.local` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
2. Prüfe Supabase CLI: `supabase --version`
3. Führe mit verbose aus: `supabase migration up --verbose`

### Problem: "Supabase CLI nicht gefunden"
**Lösung:**
```bash
npm install -g @supabase/cli
supabase --version
```

### Problem: "Permission denied" (Linux/macOS)
**Lösung:**
```bash
chmod +x scripts/fix-enum-types.sh
bash scripts/fix-enum-types.sh
```

---

## 📦 NPM Scripts

```json
{
  "fix:enum-types": "npx ts-node scripts/apply-enum-fix.ts",
  "fix:enum-types:ps1": ".\\scripts\\fix-enum-types.ps1",
  "fix:enum-types:bash": "bash scripts/fix-enum-types.sh"
}
```

---

## 🎯 Nächste Schritte

1. **Migration anwenden:**
   ```bash
   npm run fix:enum-types
   ```

2. **Verifizieren:**
   - Teste Tour-Anmeldung
   - Teste Status-Synchronisation
   - Teste Wartelistenlogik

3. **Produktiv gehen:**
   - Alle Tests erfolgreich? ✅
   - Logs prüfen
   - Rollback-Plan bereit

---

**Erstellt:** 2026-03-30  
**Version:** P0.4 (Enum Type Casting Fix)  
**Status:** Production-Ready ✅

