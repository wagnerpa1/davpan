# Fallback: Manuelle Anwendung im Supabase Dashboard

Falls die automatischen Skripte nicht funktionieren, hier die manuelle Methode.

---

## 📍 Schritt-für-Schritt Anleitung

### 1. Supabase Dashboard öffnen
```
https://app.supabase.com → Projekt auswählen → SQL Editor
```

### 2. Neue Query erstellen
- Klick: **"New query"** oder **"+"**
- Gib der Query einen Namen: `Enum Type Casting Fix`

### 3. SQL einfügen
Kopiere den kompletten Inhalt aus:
```
supabase/migrations/20260330_p0_fix_enum_type_casting.sql
```

Füge ihn in den SQL Editor ein.

### 4. Ausführen
- Klick: **"Run"** oder **Ctrl+Enter**
- Warte auf Bestätigung (grüner Haken)

### 5. Verifizieren
Nach erfolgreicher Ausführung, führe diese Verifizierungs-Query aus:

```sql
-- Verifiziere, dass Funktionen existieren
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'sync_tour_status_explicit',
  'register_tour_atomic',
  'promote_from_waitlist'
)
ORDER BY routine_name;
```

**Erwartetes Ergebnis:** 3 Zeilen mit `FUNCTION` Typ

---

## 🔍 Detaillierte SQL-Statements

Falls du einzelne Statements ausführen möchtest:

### Statement 1: sync_tour_status_explicit()
```sql
CREATE OR REPLACE FUNCTION public.sync_tour_status_explicit(
  p_tour_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_tour_id UUID;
  v_max_participants INT;
  v_confirmed_count INT;
  v_target_status public.tour_status;
  v_current_status public.tour_status;
BEGIN
  -- ... (siehe Migration-Datei)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Statement 2: register_tour_atomic()
```sql
CREATE OR REPLACE FUNCTION public.register_tour_atomic(
  p_tour_id UUID,
  p_user_id UUID,
  p_child_profile_id UUID DEFAULT NULL
)
RETURNS TABLE(...) AS $$
  -- ... (siehe Migration-Datei)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Statement 3: promote_from_waitlist()
```sql
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS TRIGGER AS $$
  -- ... (siehe Migration-Datei)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ✅ Checkliste nach manueller Anwendung

- [ ] Alle 3 Funktionen existieren (Verifizierungs-Query)
- [ ] Keine Fehler im SQL Editor
- [ ] Enum-Typen existieren (`tour_status`, `participant_status`)
- [ ] Triggers sind aktualisiert

---

## 🆘 Fehlerbehandlung

### Error: "Function already exists"
```
ERROR: function "sync_tour_status_explicit"(uuid) already exists
```
**Lösung:** Nutze `CREATE OR REPLACE FUNCTION` (ist bereits in der Migration)

### Error: "Type does not exist"
```
ERROR: type "tour_status" does not exist
```
**Lösung:** Stelle sicher, dass Enum-Typen existieren:
```sql
SELECT typname FROM pg_type 
WHERE typname IN ('tour_status', 'participant_status');
```

Wenn leer, führe aus:
```sql
CREATE TYPE public.tour_status AS ENUM (
  'Planung',
  'Anmeldung offen',
  'Ausgebucht',
  'Abgeschlossen'
);

CREATE TYPE public.participant_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled'
);
```

### Error: "Permission denied"
**Lösung:** Prüfe Service Role Key hat Admin-Rechte

---

## 🔍 Debug-Queries

Falls etwas nicht funktioniert, nutze diese Queries zum Debug:

```sql
-- 1. Alle benutzerdefinierten Funktionen
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 2. Alle Enum-Typen
SELECT typname, enum_range(NULL::tour_status) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('tour_status', 'participant_status');

-- 3. Alle Triggers
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND trigger_name LIKE 'trigger_%';

-- 4. Test der sync_tour_status_explicit Funktion
SELECT public.sync_tour_status_explicit('your-tour-uuid'::uuid);
-- Erwartet: leeres Ergebnis (VOID)
```

---

## 📋 Komplette Migration-Datei Referenz

Die vollständige Migration findest du hier:
```
supabase/migrations/20260330_p0_fix_enum_type_casting.sql
```

Größe: ~350 Zeilen  
Komplexität: Mittelhoch (PL/pgSQL Funktionen)

---

## ⏱️ Geschätzte Dauer

- **Kopieren:** 2 Minuten
- **Ausführen:** 30 Sekunden
- **Verifizieren:** 1 Minute
- **Total:** ~4 Minuten

---

## 💾 Nach erfolgreicher Anwendung

1. **Update package.json** (falls noch nicht geschehen):
   ```json
   {
     "scripts": {
       "fix:enum-types": "npx ts-node scripts/apply-enum-fix.ts"
     }
   }
   ```

2. **Dokumentiere die Änderung:**
   - Commit Message: `fix: apply enum type casting fixes (P0.4)`
   - Reference: `ENUM_FIX_OVERVIEW.md`

3. **Teste die Funktionalität:**
   - Starte Dev-Server: `npm run dev`
   - Teste Tour-Anmeldung
   - Teste Status-Synchronisation
   - Teste Wartelistenlogik

---

## 🔗 Verwandte Ressourcen

- `ENUM_FIX_OVERVIEW.md` - Großer Überblick
- `scripts/ENUM_FIX_DOCUMENTATION.md` - Technische Details
- `scripts/ENUM_FIX_QUICK_REFERENCE.md` - Schnelle Referenz
- `AGENTS.md` - Projekt-Übersicht
- `database.md` - Datenbank-Struktur

---

**Status:** Fallback-Dokumentation  
**Zielgruppe:** Entwickler ohne Zugriff auf Skripte  
**Schwierigkeit:** Anfänger-freundlich

