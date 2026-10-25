function LoadingCard() {
  return <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />;
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-site px-4 py-8">
      <div className="mb-10 space-y-3 lg:mb-12">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
      <div className="space-y-12">
        <LoadingCard />
        <section className="space-y-4">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-slate-100" />
          <LoadingCard />
          <LoadingCard />
        </section>
      </div>
    </div>
  );
}
