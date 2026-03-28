import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeleteNewsButton } from "@/components/admin/DeleteNewsButton";
import { getCurrentUserProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

interface NewsPost {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
}

export const metadata: Metadata = {
  title: "Admin - Vereinsnews | JDAV Pfarrkirchen",
};

export default async function AdminNewsPage() {
  const [authContext, supabase] = await Promise.all([
    getCurrentUserProfile(),
    createClient(),
  ]);

  if (authContext.role !== "admin") {
    redirect("/");
  }

  const { data: newsPosts } = await supabase
    .from("news_posts")
    .select("id, title, content, image_url, published_at")
    .order("published_at", { ascending: false });

  return (
    <div className="container mx-auto max-w-4xl space-y-10 px-4 py-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Vereinsnews verwalten
        </h1>
        <p className="mt-1 text-slate-600">
          Admins koennen Vereinsnews posten. Beim Veroeffentlichen wird eine
          Benachrichtigung an alle passenden Opt-ins erstellt.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Neue News</h2>
        <form action="/api/admin/news" method="POST" className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="news-title"
              className="block text-sm font-medium text-slate-700"
            >
              Titel
            </label>
            <input
              id="news-title"
              name="title"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="news-content"
              className="block text-sm font-medium text-slate-700"
            >
              Inhalt
            </label>
            <textarea
              id="news-content"
              name="content"
              required
              rows={5}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="news-image-url"
              className="block text-sm font-medium text-slate-700"
            >
              Bild-URL (optional)
            </label>
            <input
              id="news-image-url"
              name="image_url"
              type="url"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-jdav-green px-4 py-2 font-medium text-white transition-colors hover:bg-jdav-green-dark"
          >
            News veroeffentlichen
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Systemnachricht senden
        </h2>
        <form
          action="/api/admin/system-notifications"
          method="POST"
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="system-title"
              className="block text-sm font-medium text-slate-700"
            >
              Titel
            </label>
            <input
              id="system-title"
              name="title"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="system-message"
              className="block text-sm font-medium text-slate-700"
            >
              Nachricht
            </label>
            <textarea
              id="system-message"
              name="message"
              required
              rows={4}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-jdav-green focus:outline-none focus:ring-1 focus:ring-jdav-green"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-slate-800 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700"
          >
            Systemnachricht senden
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Bisherige News</h2>

        {(newsPosts as NewsPost[] | null)?.length ? (
          (newsPosts as NewsPost[]).map((news) => (
            <article
              key={news.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-jdav-green">
                    <Newspaper className="h-3 w-3" /> Vereinsnews
                  </p>
                  <h3 className="text-lg font-bold text-slate-900">
                    {news.title}
                  </h3>
                </div>
                <DeleteNewsButton id={news.id} />
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                {news.content}
              </p>
              {news.image_url ? (
                <a
                  href={news.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs font-semibold text-jdav-green hover:underline"
                >
                  Bild oeffnen
                </a>
              ) : null}
              <p className="mt-3 text-xs text-slate-500">
                {new Date(news.published_at).toLocaleString("de-DE")}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Noch keine Vereinsnews vorhanden.
          </div>
        )}
      </div>
    </div>
  );
}
