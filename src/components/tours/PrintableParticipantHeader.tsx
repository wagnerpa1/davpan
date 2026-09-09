import Image from "next/image";

interface PrintableParticipantHeaderProps {
  appName: string;
  tourTitle: string;
  tourDate: string;
  guides: string[];
  meetingTime: string;
  meetingPoint: string;
  confirmedCount: number;
  maxParticipants: number;
  tourId: string;
  logoPath: string;
  logoAlt: string;
}

export function PrintableParticipantHeader({
  appName,
  tourTitle,
  tourDate,
  guides,
  meetingTime,
  meetingPoint,
  confirmedCount,
  maxParticipants,
  tourId,
  logoPath,
  logoAlt,
}: PrintableParticipantHeaderProps) {
  return (
    <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Teilnehmerliste – {appName}
          </h1>
          <div className="grid grid-cols-2 gap-x-12 gap-y-1 text-sm text-slate-800">
            <p>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                Tour
              </span>{" "}
              {tourTitle}
            </p>
            <p>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                Datum
              </span>{" "}
              {tourDate}
            </p>
            <p>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                Leitung
              </span>{" "}
              {guides.join(", ")}
            </p>
            <p>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                Treffpunkt
              </span>{" "}
              {meetingTime} Uhr, {meetingPoint}
            </p>
            <p>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                Status
              </span>{" "}
              {confirmedCount} / {maxParticipants || "∞"} Teilnehmer
            </p>
            <p>
              <span className="font-bold text-slate-500 uppercase text-[10px] block">
                Tour-ID
              </span>{" "}
              {tourId}
            </p>
          </div>
        </div>
        <Image
          src={logoPath}
          alt={logoAlt}
          width={240}
          height={64}
          className="h-auto w-60"
        />
      </div>
    </div>
  );
}
