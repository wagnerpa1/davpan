# PostgreSQL Enum Type Casting Fix - Dokumentation

**Datum:** 2026-03-30  
**Version:** P0.4  
**Migration:** `20260330_p0_fix_enum_type_casting.sql`

---

## 🔴 Problem

### Fehler
```
ERROR: operator does not exist: text <> tour_status
ERROR: operator does not exist: text <> participant_status
```

### Ursache
In PostgreSQL Funktionen wurden **TEXT-Variablen** mit **Enum-Typen** verglichen:

```sql
-- ❌ FALSCH
DECLARE
  v_target_status TEXT;  -- TEXT statt Enum
BEGIN
  IF v_current_status != v_target_status THEN  -- Text != Enum → ERROR
```

PostgreSQL kennt keinen `<>` (oder `!=`) Operator zwischen `TEXT` und `tour_status` Enum.

---

## ✅ Lösung

### 1. **Explizite Type Casts**

**Vorher:**
```sql
v_target_status := 'Ausgebucht';  -- TEXT Literal
```

**Nachher:**
```sql
v_target_status := 'Ausgebucht'::public.tour_status;  -- Explicit Cast zu Enum
```

### 2. **Status-Vergleiche mit Casts**

**Vorher:**
```sql
IF v_current_status != v_target_status THEN
```

**Nachher:**
```sql
IF v_current_status IS DISTINCT FROM v_target_status THEN
```

### 3. **Enum-Werte in WHERE-Klauseln**

**Vorher:**
```sql
WHERE status = 'confirmed'  -- Implizite TEXT-Konvertierung
```

**Nachher:**
```sql
WHERE status = 'confirmed'::public.participant_status  -- Explicit Cast
```

---

## 📝 Betroffene Funktionen

### 1. `sync_tour_status_explicit()`

**Changes:**
```sql
-- Variable Type
DECLARE
  v_target_status public.tour_status;  -- ✓ Statt TEXT

-- Status-Vergleiche
IF v_current_status IS DISTINCT FROM v_target_status THEN  -- ✓ Statt !=
  UPDATE public.tours
  SET status = v_target_status
```

**Casts in Bedingungen:**
```sql
WHERE status = 'confirmed'::public.participant_status;  -- ✓ Explicit Cast
```

### 2. `register_tour_atomic()`

**Changes:**
```sql
-- Status-Prüfung
IF v_tour_status NOT IN ('Anmeldung offen'::public.tour_status, 
                          'Ausgebucht'::public.tour_status) THEN

-- Neue Anmeldung
INSERT INTO public.tour_participants (
  status
) VALUES (
  'pending'::public.participant_status  -- ✓ Explicit Cast
)
```

### 3. `promote_from_waitlist()`

**Changes:**
```sql
-- Wartelisten-Beförderung
IF NEW.status = 'confirmed'::public.participant_status AND 
   OLD.status IS DISTINCT FROM NEW.status THEN  -- ✓ Besseres NULL-Handling
  
  UPDATE public.tour_participants
  SET status = 'confirmed'::public.participant_status
  WHERE status = 'pending'::public.participant_status
```

---

## 🎯 Best Practices - Enum Handling in PostgreSQL

### ✅ Richtig

```sql
-- 1. Variable mit Enum-Typ deklarieren
DECLARE v_status public.tour_status;

-- 2. Explicit Casts bei Vergleichen
WHERE status = 'confirmed'::public.participant_status

-- 3. IS DISTINCT FROM für NULL-Sicherheit
IF old_value IS DISTINCT FROM new_value THEN

-- 4. Array-Vergleiche mit Casts
IF status NOT IN ('Planung'::tour_status, 'Ausgebucht'::tour_status) THEN
```

### ❌ Falsch

```sql
-- 1. TEXT statt Enum
DECLARE v_status TEXT;

-- 2. Implizite Konvertierung
WHERE status = 'confirmed'  -- Funktioniert manchmal, aber nicht zuverlässig

-- 3. Suboptimale NULL-Handling
IF old_value != new_value THEN  -- != ignoriert NULL

-- 4. String-Vergleiche bei Enums
IF status = 'Ausgebucht' THEN
```

---

## 🔍 Verifizierung

### Test-Queries nach Migration

```sql
-- 1. Funktionen existieren?
SELECT routine_name 
FROM information_schema.routines
WHERE routine_name IN ('sync_tour_status_explicit', 'register_tour_atomic', 'promote_from_waitlist')
ORDER BY routine_name;

-- Erwartet: 3 Zeilen

-- 2. Enum-Typen existieren?
SELECT typname 
FROM pg_type 
WHERE typname IN ('tour_status', 'participant_status');

-- Erwartet: 2 Zeilen

-- 3. Teste sync_tour_status_explicit
SELECT * FROM sync_tour_status_explicit('550e8400-e29b-41d4-a716-446655440000'::uuid);

-- 4. Teste register_tour_atomic
SELECT * FROM register_tour_atomic(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid
);
```

---

## 📊 Änderungsübersicht

| Kategorie | Vorher | Nachher | Grund |
|-----------|--------|---------|-------|
| Variable Type | `TEXT` | `public.tour_status` | Type-Safety |
| Status-Vergleich | `!=` | `IS DISTINCT FROM` | NULL-Handling |
| String-Casts | Implizit | `'value'::public.enum_type` | Explizitheit |
| WHERE-Klauseln | `'value'` | `'value'::public.enum_type` | Typ-Sicherheit |

---

## 🚀 Anwendung

### Option 1: TypeScript (empfohlen)
```bash
npm run fix:enum-types
```

### Option 2: PowerShell (Windows)
```powershell
.\scripts\fix-enum-types.ps1
```

### Option 3: Bash (Linux/macOS)
```bash
bash scripts/fix-enum-types.sh
```

### Option 4: Supabase CLI (direkt)
```bash
supabase migration up --skip-seed
```

---

## ✨ Weitere Verbesserungen

### 1. NULL-Handling verbessert

**IS DISTINCT FROM** vs **!=:**
```sql
-- OLD.status = NULL, NEW.status = 'confirmed'

-- Mit !=:
NULL != 'confirmed'  -- NULL (unbekannt)

-- Mit IS DISTINCT FROM:
NULL IS DISTINCT FROM 'confirmed'  -- TRUE (unterschiedlich)
```

### 2. Type-Sicherheit

```sql
-- Mit expliziten Casts verhindert PostgreSQL:
-- - Typos in Status-Werten
-- - Falsche Enum-Werte
-- - Implizite String-Konvertierungen
```

---

## 🧪 Test-Szenarien

Nach Anwendung der Migration testen:

```
✓ Teilnehmer anmelden
  → Status sollte 'pending' sein
  → Trigger sollte sync_tour_status_explicit() aufrufen
  
✓ Guide bestätigt Teilnehmer
  → Status sollte 'confirmed' sein
  → Trigger sollte Warteliste befördern
  
✓ Warteliste wird aktiv
  → Neue Anmeldungen gehen auf Warteliste
  → Erste wartet wird automatisch bestätigt
  
✓ Altersvalidierung
  → Kind zu jung → Fehler
  → Child Profile validiert Geburtstag
```

---

## 📚 Referenzen

- [PostgreSQL ENUM Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- [PostgreSQL Type Casting](https://www.postgresql.org/docs/current/sql-syntax.html#SQL-SYNTAX-TYPES)
- [IS DISTINCT FROM Operator](https://www.postgresql.org/docs/current/functions-comparison.html)

---

## 🔗 Related Migrations

- `20260330_p0_tour_status_sync.sql` - Original Tour Status Sync
- `20260330_p0_register_tour_atomic.sql` - Atomic Tour Registration
- `20260330_p2_registration_status_and_counts.sql` - Registration Status Counts

---

**Status:** ✅ Behoben  
**Getestet:** 2026-03-30  
**Production-Ready:** Ja

