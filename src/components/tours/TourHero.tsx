import { siteConfig } from "@/lib/site-config";

interface TourGuideProfile {
  id?: string;
  full_name?: string | null;
}

interface TourGuide {
  user_id: string | null;
  profiles?: TourGuideProfile | null;
}

interface TourHeroProps {
  title: string;
  targetArea?: string | null;
  guides?: TourGuide[] | null;
  status: string;
  groupLabel?: string | null;
  isFull: boolean;
}

const statusLabel = (status: string) => {
  switch (status) {
    case "planning":
      return "In Planung";
    case "open":
      return "Anmeldung offen";
    case "full":
      return "Ausgebucht";
    case "completed":
      return "Abgeschlossen";
    case "cancelled":
      return "Abgesagt";
    default:
      return status;
  }
};

export function TourHero({
  title,
  targetArea,
  guides,
  status,
  groupLabel,
  isFull,
}: TourHeroProps) {
  return (
    <div className="bg-jdav-green p-8 sm:p-12 text-center text-white relative print:hidden">
      <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="text-lg font-medium opacity-90">
        {targetArea || siteConfig.appName}
      </p>

      {/* Guides */}
      {guides && guides.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-1.5 text-white/90">
            <span className="opacity-70 font-normal">Leitung:</span>
            {guides.map((tg, idx) => (
              <span
                key={
                  tg.user_id ||
                  tg.profiles?.id ||
                  `${tg.profiles?.full_name || "guide"}-${idx}`
                }
                className="bg-white/10 px-2 py-0.5 rounded-lg"
              >
                {tg.profiles?.full_name || "Tourenleitung"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status & Group Badges */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          {statusLabel(status)}
        </div>
        {groupLabel && (
          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            {groupLabel}
          </div>
        )}
        {isFull && (
          <div className="bg-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg animate-pulse">
            Warteliste aktiv
          </div>
        )}
      </div>
    </div>
  );
}
