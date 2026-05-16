import { NextResponse } from "next/server";
import { generateTourIcs } from "@/utils/ics";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tour, error } = await supabase
    .from("tours")
    .select(
      "title, description, start_date, end_date, meeting_point, meeting_time",
    )
    .eq("id", id)
    .single();

  if (error || !tour) {
    return new NextResponse("Tour not found", { status: 404 });
  }

  try {
    const icsContent = generateTourIcs({
      title: tour.title,
      description: tour.description,
      startDate: tour.start_date,
      endDate: tour.end_date,
      meetingPoint: tour.meeting_point,
      meetingTime: tour.meeting_time,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/touren/${id}`,
    });

    const filename = `tour-${tour.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Failed to generate ICS", err);
    return new NextResponse("Failed to generate ICS file", { status: 500 });
  }
}
