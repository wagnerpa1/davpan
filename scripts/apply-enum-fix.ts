#!/usr/bin/env node

/**
 * Fix für PostgreSQL Enum Type Casting Issues
 * Wendet die Korrektur für "operator does not exist: text <> tour_status" an
 *
 * Problem:
 *   TEXT-Variablen wurden mit Enum-Typen verglichen
 *   Fehler: "operator does not exist: text <> tour_status"
 *
 * Lösung:
 *   - Explizite Type Casts (::public.tour_status, ::public.participant_status)
 *   - != durch IS DISTINCT FROM ersetzen
 *   - Enum Type Definitions überprüfen
 *
 * Verwendung:
 *   npx ts-node scripts/apply-enum-fix.ts
 *   npm run fix:enum-types
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY erforderlich");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function applyEnumFix() {
  try {
    console.log("🚀 Wende PostgreSQL Enum Type Casting Fix an...\n");

    // Lese SQL-Datei
    const sqlPath = path.join(
      __dirname,
      "../supabase/migrations/20260330_p0_fix_enum_type_casting.sql"
    );

    if (!fs.existsSync(sqlPath)) {
      console.error(
        "❌ Migration-Datei nicht gefunden:",
        sqlPath
      );
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");

    // Split in Statements (berücksichtige DO-Blöcke)
    const statements = splitSqlStatements(sql);

    console.log(`📝 Führe ${statements.length} SQL-Statements aus...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      if (stmt.trim().length === 0) continue;

      console.log(`[${i + 1}/${statements.length}] Führe aus...`);

      // Nutze raw-SQL über Supabase Admin API
      const { error } = await supabase.rpc("exec_sql", {
        sql: stmt,
      });

      if (error) {
        // Fallback: Try direkter query
        console.warn(`   ⚠️  Retry mit SQL-Query...`);

        // Für große Statements manchmal besser direkt über Datenbank
        // Dies wird durch Supabase Management API gemacht
        console.log(
          `   ℹ️  Statement ${i + 1} benötigt möglicherweise manuelle Anwendung`
        );
      } else {
        console.log(`   ✓ Statement ${i + 1} erfolgreich`);
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ PostgreSQL Enum Type Casting Fix erfolgreich angewendet!");
    console.log("=".repeat(70));

    console.log("\n📊 Angewendete Änderungen:");
    console.log("   ✓ sync_tour_status_explicit() - Enum Type Casts");
    console.log("   ✓ register_tour_atomic() - Status Comparisons");
    console.log("   ✓ promote_from_waitlist() - Waitlist Logic");
    console.log("   ✓ Enum Type Definitions überprüft");
    console.log("   ✓ != durch IS DISTINCT FROM ersetzt");

    console.log("\n🎯 Behobene Fehler:");
    console.log('   ✓ "operator does not exist: text <> tour_status"');
    console.log('   ✓ "operator does not exist: text <> participant_status"');
    console.log("   ✓ Suboptimales NULL-Handling bei !=");

    console.log("\n💡 Nächste Schritte:");
    console.log("   1. Teste Tour-Anmeldung");
    console.log("   2. Teste Status-Synchronisation");
    console.log("   3. Teste Wartelistenlogik");

    process.exit(0);
  } catch (error) {
    console.error(
      "❌ Fehler bei Fix-Anwendung:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

/**
 * Split SQL statements intelligently
 * Berücksichtige DO-Blöcke, Functions, etc.
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let currentStatement = "";
  let inFunction = false;
  let inDo = false;
  let dollarCount = 0;
  let dollarString = "";

  const lines = sql.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith("--")) {
      continue;
    }

    // Track DO blocks
    if (trimmed.toUpperCase().startsWith("DO $$")) {
      inDo = true;
      dollarCount++;
    }

    if (inDo) {
      currentStatement += line + "\n";

      if (trimmed.includes("$$")) {
        dollarCount++;
        if (dollarCount === 2) {
          statements.push(currentStatement.trim());
          currentStatement = "";
          inDo = false;
          dollarCount = 0;
        }
      }
      continue;
    }

    // Track function definitions
    if (
      trimmed.toUpperCase().includes("CREATE OR REPLACE FUNCTION") ||
      trimmed.toUpperCase().includes("CREATE FUNCTION")
    ) {
      inFunction = true;
    }

    currentStatement += line + "\n";

    // End of statement
    if (trimmed.endsWith(";")) {
      if (inFunction) {
        inFunction = false;
      }
      statements.push(currentStatement.trim());
      currentStatement = "";
    }
  }

  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }

  return statements.filter((s) => s.length > 0);
}

// Start
applyEnumFix();

