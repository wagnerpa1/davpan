# 🚀 PostgreSQL Enum Type Casting Fix - Quick Install Guide

## ⏱️ 5-Minuten Installation

### Schritt 1: Voraussetzungen (30 Sekunden)
```bash
# Prüfe Node.js
node --version  # 18+ erforderlich

# Prüfe Supabase CLI
supabase --version

# Prüfe .env.local
cat .env.local
# Sollte enthalten:
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Schritt 2: Migration Anwenden (1 Minute)

**Wähle EINE dieser Methoden:**

#### 🎯 **Methode A: TypeScript (Empfohlen)**
```bash
npm run fix:enum-types
```

#### 🪟 **Methode B: PowerShell (Windows)**
```powershell
npm run fix:enum-types:ps1
```

#### 🐧 **Methode C: Bash (Linux/macOS)**
```bash
npm run fix:enum-types:bash
```

#### 📱 **Methode D: Supabase CLI**
```bash
supabase migration up --skip-seed
```

### Schritt 3: Verifizieren (30 Sekunden)

**Im Supabase Dashboard → SQL Editor:**

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'sync_tour_status_explicit',
  'register_tour_atomic',
  'promote_from_waitlist'
)
ORDER BY routine_name;
```

✅ **Erwartet:** 3 Zeilen  
✅ **Alle grün?** Fertig!

### Schritt 4: Test (2 Minuten)

```bash
# Starte dev server
npm run dev

# Teste in Browser:
# 1. Tour-Anmeldung → Sollte funktionieren
# 2. Status-Änderung → Sollte aktualisieren
# 3. Wartelisten → Sollte automatisch befördern
```

---

## 🆘 Falls etwas schiefgeht

### "Script funktioniert nicht"
```bash
# Überprüfe .env.local
ls -la .env.local

# Prüfe Node.js Version
node --version  # Muss 18+ sein

# Prüfe Supabase CLI
supabase --version

# Führe manuell aus
npx ts-node scripts/apply-enum-fix.ts
```

### "SUPABASE_URL nicht gefunden"
```bash
# Erstelle .env.local
cat > .env.local << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
EOF

# Dann erneut:
npm run fix:enum-types
```

### "Supabase CLI nicht gefunden"
```bash
npm install -g @supabase/cli
supabase --version  # Prüfe

# Dann erneut:
npm run fix:enum-types
```

### "Funktionen existieren nicht nach Ausführung"
```bash
# Prüfe Fehlermeldung:
npm run fix:enum-types 2>&1 | tee migration.log

# Manuelle Methode:
# → Siehe scripts/MANUAL_APPLICATION.md
```

---

## 📋 Checkliste

- [ ] Node.js 18+ installiert
- [ ] Supabase CLI installiert
- [ ] `.env.local` vorhanden
- [ ] Migration ausgeführt
- [ ] Verifizierungs-Query erfolgreich
- [ ] Tests bestanden
- [ ] Ready for Production

---

## 📚 Weitere Ressourcen

| Wenn du ... | Dann gehe zu ... |
|-----------|-----------------|
| Alles verstehen möchtest | [`ENUM_FIX_DOCUMENTATION.md`](./scripts/ENUM_FIX_DOCUMENTATION.md) |
| Schnelle Übersicht brauchst | [`ENUM_FIX_QUICK_REFERENCE.md`](./scripts/ENUM_FIX_QUICK_REFERENCE.md) |
| Kompletten Überblick brauchst | [`ENUM_FIX_OVERVIEW.md`](./ENUM_FIX_OVERVIEW.md) |
| Manuell anwenden willst | [`MANUAL_APPLICATION.md`](./scripts/MANUAL_APPLICATION.md) |
| Alle Dateien sehen möchtest | [`ENUM_FIX_INDEX.md`](./ENUM_FIX_INDEX.md) |

---

## ✨ Das war's!

**Geschätzte Zeit:** 5 Minuten  
**Schwierigkeit:** ⭐ Einfach  
**Status:** ✅ Production-Ready

---

**Probleme? Siehe oben oder konsultiere die Dokumentation! 🚀**

