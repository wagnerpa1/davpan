import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  return handleAgeOutCron(req);
}

export async function POST(req: NextRequest) {
  return handleAgeOutCron(req);
}

async function handleAgeOutCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Nicht autorisierter Aufruf" },
      { status: 401 },
    );
  }

  const supabase = createAdminClient() ?? (await createClient());

  const { data, error } = await supabase.rpc("process_child_age_out");

  if (error) {
    console.error("Error executing process_child_age_out cron:", error);
    return NextResponse.json(
      {
        error:
          error.message || "Fehler bei der Ausführung des Age-Out Prozesses",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    result: data,
  });
}
