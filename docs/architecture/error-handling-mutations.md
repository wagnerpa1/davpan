# Fehlerbehandlung & Mutation Model

Um Konsistenzprobleme, Überbuchungen und Race Conditions zu vermeiden, nutzt die Anwendungsarchitektur von `davpan` ein striktes **Action Runner & Domain Error Pattern**.

---

## 🎯 Standardisiertes Rückgabeformat (`ActionState<T>`)

Jede Server Action in `src/app/actions/` gibt konsistent ein Objekt vom Typ `ActionState<T>` zurück (definiert in `src/lib/action-runner.ts`):

```typescript
export interface ActionState<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ConflictErrorCode;
    message: string;
    retryable: boolean;
  };
}
```

---

## 🧱 Serverseitiger Runner (`runAction`)

Der Helper `runAction()` (`src/lib/action-runner.ts`) kapsele die Ausführung von Server Actions:
1. **Authentifizierung & Rechteprüfung**: Überprüft vor der Ausführung, ob der Aufrufer berechtigt ist.
2. **Fehler-Mapping**: Fängt PostgreSQL-Exceptions, Validierungsfehler (Zod) und `DomainError`-Instanzen ab und wandelt sie in einen typisierten `error.code` um.
3. **Logging & Auditing**: Protokolliert kritische Ausnahmen serverseitig.

```typescript
// Beispiel für eine Server Action
export async function registerForTourAction(input: RegisterInput): Promise<ActionState<RegistrationResult>> {
  return runAction(async () => {
    // Input-Validierung
    const validated = registerSchema.parse(input);
    
    // Atomarer RPC Aufruf in Supabase Postgres
    const { data, error } = await supabase.rpc('register_for_tour_atomic', {
      p_tour_id: validated.tourId,
      p_user_id: validated.userId,
      p_idempotency_key: buildIdempotencyKey('tour_reg', validated.tourId, validated.userId),
    });

    if (error) throw mapPostgresError(error);
    return data;
  });
}
```

---

## 🔑 Idempotenz-Schlüssel (`idempotency.ts`)

Um bei mehrfachen Button-Klicks, Netzwerkwiederholungen oder Service-Worker-Replays doppelte Ausführungen zu verhindern, wird für schreibende Operationen ein deterministischer Key generiert:

```typescript
import { buildIdempotencyKey } from '@/lib/idempotency';

const key = buildIdempotencyKey('register', tourId, userId);
```

In PostgreSQL wird dieser Schlüssel in `idempotency_keys_store` geprüft. Bereits verarbeitete Anfragen geben sofort das gespeicherte Ergebnis der ersten Ausführung zurück, ohne die Geschäftslogik erneut auszuführen.

---

## ⚠️ Kanonische Fehlercodes (`ConflictErrorCode`)

Fehler werden in `src/lib/errors.ts` eindeutig klassifiziert:

* `stale_write`: Der Datensatz wurde zwischenzeitlich von einem anderen Benutzer geändert (Version/Timestamp-Konflikt).
* `inventory_exceeded`: Die gewünschte Materialmenge übersteigt den verfügbaren Bestand.
* `capacity_exceeded`: Die maximale Teilnehmerzahl der Tour wurde bereits erreicht.
* `invalid_state`: Ein Statusübergang ist gemäß Domain State Machine nicht erlaubt (z.B. Tourstornierung nach Abschluss).
* `unauthorized`: Fehlende Anmeldung oder unzureichende Rollenrechte.
* `conflict`: Datenbank-Constraint-Verletzung (z.B. Eindeutigkeits-Constraint).
* `unknown_error`: Unerwarteter Systemfehler.

---
*Zurück zur [Wiki-Übersicht](file:///c:/Users/paulw/WebstormProjects/davpan/docs/README.md)*
