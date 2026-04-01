# Deployment Ready Snapshot

Stand: 2026-03-31
Status: Ready for deployment

## Implementierungsstand
- Phase 1-5 der Business-Roadmap sind umgesetzt.
- TypeScript, Lint und Build sind im Zielzustand.
- Kernflüsse für Registrierung, Warteliste, Berichte, Export und Konto-Löschung sind aktiv.

## Produktentscheidungen (final)
- Bildrechte-Checkbox im Berichtsformular ist entfernt.
- Datenschutz-Hinweis im Berichtsformular bleibt sichtbar.
- Materialwart sieht auch den Bereich "Allgemein" in der Navigation.
- Exportumfang ist akzeptiert, da Zugriff auf Guide/Admin beschränkt ist.

## Offline/PWA Status
- Runtime-Caching ist begrenzt (Touren: 20, Berichte: 5).
- Seiten- und Bildcache wurden reduziert, um Speicherverbrauch zu senken.
- Service Worker unterstützt Cache-Bereinigung via `CLEAR_AUTH_CACHES` Nachricht.

## Security/Betrieb
- RLS/Auth/Server-Checks sind gehärtet.
- Supabase Leaked Password Protection ist im Free Plan nicht verfügbar.
- Kompensierende Kontrollen sind aktiv (Monitoring, Auth-Checks, Auditability).

## Bewusst verschoben
- Datumsgenaue Materialverfügbarkeit bleibt ein Später-Thema.

## Release-Check
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. Smoke-Test für:
   - Touranmeldung inkl. Warteliste
   - Berichterstellung inkl. Datenschutz-Hinweis
   - Admin-Export
   - Konto-Löschung mit Maskierung
