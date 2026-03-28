import { format } from "date-fns";
import { Calendar, ChevronRight, FileText, Mountain, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { createClient } from "@/utils/supabase/server";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface TourCategoryOption {
  id: string;
  category: string | null;
}

interface ReportImage {
  image_url: string;
  order_index: number | null;
}

export default async function BerichtePage({ searchParams }: Props) {
  const supabase = await createClient();
  const params = await searchParams;

  const categoryFilter = params.category as string;
  const yearFilter = params.year as string;
  const groupFilter = params.group as string;
  const sortFilter = (params.sort as string) || "newest";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: catData } = await supabase
    .from("tour_categorys")
    .select("id, category")
    .order("category");
  const categories = ((catData || []) as TourCategoryOption[]).filter(
    (c): c is { id: string; category: string } => Boolean(c.category),
  );

  // Fetch data base
  let query = supabase.from("tour_reports").select(`
      *,
      profiles:created_by(full_name),
      tours!inner(
        id,
        title, 
        start_date, 
        target_area,
        group,
        category,
        tour_categorys!tours_category_fkey(category)
      ),
      report_images(image_url, order_index)
    `);

  // Sorting
  if (sortFilter === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (sortFilter === "title_asc") {
    query = query.order("title", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (categoryFilter) {
    query = query.eq("tours.category", categoryFilter);
  }

  if (groupFilter) {
    query = query.eq("tours.group", groupFilter);
  }

  const { data: reports } = await query;

  // JS Filter for year (since tours.start_date is an inner join but we filter by its year)
  const filteredReports = yearFilter
    ? reports?.filter(
        (r) =>
          new Date(r.tours.start_date).getFullYear().toString() === yearFilter,
      )
    : reports;

  // Prepare metadata for filters
  const { data: groupsData } = await supabase
    .from("tour_groups")
    .select("id, group_name");
  const groups = (groupsData || []) as { id: string; group_name: string }[];

  const years = Array.from(
    new Set(
      reports?.map((r) => new Date(r.tours.start_date).getFullYear()) || [],
    ),
  ).sort((a, b) => b - a);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-10 lg:mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Tourenberichte
        </h1>
        <p className="mt-2 text-slate-500">
          Unsere Bergabenteuer in Wort und Bild.
        </p>
      </div>

      <ReportFilters categories={categories} groups={groups} years={years} />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredReports && filteredReports.length > 0 ? (
          filteredReports.map((report) => {
            const previewImage = (report.report_images as ReportImage[])?.sort(
              (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
            )?.[0]?.image_url;
            return (
              <Link
                key={report.id}
                href={`/berichte/${report.id}`}
                className="group flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-jdav-green hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt={report.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-200">
                      <Mountain className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-900 shadow-sm border border-slate-100">
                    {report.tours.tour_categorys?.category || "Tour"}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1.5 text-jdav-green">
                      <FileText className="h-3 w-3" /> Bericht
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-slate-300" />
                      {report.tours.start_date
                        ? format(new Date(report.tours.start_date), "dd.MM.yy")
                        : "–"}
                    </span>
                  </div>

                  <h2 className="mb-3 text-lg font-bold text-slate-900 group-hover:text-jdav-green transition-colors leading-snug">
                    {report.title}
                  </h2>

                  <p className="mb-6 line-clamp-2 text-sm text-slate-500">
                    {report.report_text.replace(/[#*`_]/g, "")}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-jdav-green/10 flex items-center justify-center text-jdav-green">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {report.profiles?.full_name || "Unbekannt"}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-jdav-green" />
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Mountain className="mx-auto mb-4 h-12 w-12 text-slate-200" />
            <h3 className="text-xl font-bold text-slate-900 leading-tight">
              Keine Berichte
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Passe deine Filter an oder versuche es später erneut.
            </p>
            <Link
              href="/berichte"
              className="mt-8 inline-block rounded-xl bg-jdav-green px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-jdav-green-dark"
            >
              Filter zurücksetzen
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
