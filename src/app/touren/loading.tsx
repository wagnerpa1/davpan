function LoadingCard() {
  return <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />;
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-site px-4 py-8">
      <div className="mb-10 flex flex-col gap-4 lg:mb-12">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-100" />
        <div className="flex gap-2">
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
      <div className="mb-6 h-12 animate-pulse rounded-xl bg-slate-100" />
      <div className="space-y-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    </div>
  );
}
