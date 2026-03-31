# Deployment Ready Snapshot

Stand: 2026-03-31
Status: Ready for deployment

## Implementierungsstand
- Phase 1-5 der Business-Roadmap sind umgesetzt.
- TypeScript, Lint und Build sind im Zielzustand.
- Kernfluesse fuer Registrierung, Warteliste, Berichte, Export und Konto-Loeschung sind aktiv.

## Produktentscheidungen (final)
- Bildrechte-Checkbox im Berichtsformular ist entfernt.
- Datenschutz-Hinweis im Berichtsformular bleibt sichtbar.
- Materialwart sieht auch den Bereich "Allgemein" in der Navigation.
- Exportumfang ist akzeptiert, da Zugriff auf Guide/Admin beschraenkt ist.

## Offline/PWA Status
- Runtime-Caching ist begrenzt (Touren: 20, Berichte: 5).
- Seiten- und Bildcache wurden reduziert, um Speicherverbrauch zu senken.
- Service Worker unterstuetzt Cache-Bereinigung via `CLEAR_AUTH_CACHES` Nachricht.

## Security/Betrieb
- RLS/Auth/Server-Checks sind gehaertet.
- Supabase Leaked Password Protection ist im Free Plan nicht verfuegbar.
- Kompensierende Kontrollen sind aktiv (Monitoring, Auth-Checks, Auditability).

## Bewusst verschoben
- Datumsgenaue Materialverfuegbarkeit bleibt ein Spaeter-Thema.

## Release-Check
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. Smoke-Test fuer:
   - Touranmeldung inkl. Warteliste
   - Berichterstellung inkl. Datenschutz-Hinweis
   - Admin-Export
   - Konto-Loeschung mit Maskierung
