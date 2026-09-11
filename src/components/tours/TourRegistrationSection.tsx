"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ListOrdered,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelRegistration } from "@/app/actions/tour-registration";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TourRegistrationModal } from "./TourRegistrationModal";

const registrationDeadlineFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

const tourStartDateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeZone: "Europe/Berlin",
});

interface Material {
  id: string; // material_type_id
  name: string;
  sizes: string[];
}
interface Child {
  id: string;
  full_name: string;
  birthdate: string;
}
interface Registration {
  id: string;
  user_id: string;
  child_profile_id: string | null;
  status: string;
  waitlist_position?: number | null;
}

interface TourRegistrationSectionProps {
  tourId: string;
  tourTitle: string;
  tourStatus: string;
  maxParticipants: number | null;
  minAge: number | null;
  userBirthdate: string | null;
  tourStartDate: string;
  registrationDeadline?: string | null;
  isLoggedIn: boolean;
  childrenProfiles: Child[];
  availableMaterials: Material[];
  userRegistrations: Registration[];
}

// Status badge config
const statusConfig = {
  confirmed: {
    label: "Du bist dabei!",
    icon: CheckCircle2,
    className: "text-green-700 bg-green-50 border-green-200",
  },
  pending: {
    label: "Offen",
    icon: Clock,
    className: "text-amber-700 bg-amber-50 border-amber-200",
  },
  waitlist: {
    label: "Auf der Warteliste",
    icon: ListOrdered,
    className: "text-blue-700 bg-blue-50 border-blue-200",
  },
  cancelled: {
    label: "Anmeldung abgelehnt",
    icon: XCircle,
    className: "text-red-700 bg-red-50 border-red-200",
  },
};

function StatusBadge({
  status,
  waitlistPosition,
  name,
}: {
  status: string;
  waitlistPosition?: number | null;
  name?: string;
}) {
  const cfg = statusConfig[status as keyof typeof statusConfig];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
        cfg.className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>
        {name ? `${name}: ` : ""}
        {cfg.label}
        {status === "waitlist" && waitlistPosition
          ? ` (Position ${waitlistPosition})`
          : ""}
      </span>
    </div>
  );
}

function CancelConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  name,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  name: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Bestätigungsdialog schließen"
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          aria-label="Tourabsage schließen"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="mb-1 text-xl font-black text-slate-900">
          Tour absagen?
        </h3>
        <p className="mb-6 text-sm text-slate-500">
          Bist du sicher, dass du{" "}
          <span className="font-bold text-slate-700">{name}</span> von dieser
          Tour abmelden möchtest? Die Absage kann nicht rückgängig gemacht
          werden.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={onClose}
          >
            Abbrechen
          </Button>
          <Button
            className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
            onClick={onConfirm}
          >
            Ja, absagen
          </Button>
        </div>
      </div>
    </div>
  );
}

function calculateUserAgeTooYoung(
  minAge: number | null,
  userBirthdate?: string | null,
  tourStartDate?: string | null,
): boolean {
  if (!minAge || !userBirthdate || !tourStartDate) {
    return false;
  }
  const birthDate = new Date(userBirthdate);
  const startDate = new Date(tourStartDate);
  let ageAtStart = startDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = startDate.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && startDate.getDate() < birthDate.getDate())
  ) {
    ageAtStart -= 1;
  }
  return ageAtStart < minAge;
}

function getRegistrationStatusText(
  cannotRegister: boolean,
  isClosedByDeadline: boolean,
  tourStatus: string,
): string {
  if (cannotRegister) {
    return isClosedByDeadline
      ? "Anmeldung geschlossen"
      : "Keine Anmeldung möglich";
  }
  return tourStatus === "full" ? "Warteliste aktiv" : "Anmeldung geöffnet";
}

function TourRegistrationLoggedOut() {
  return (
    <div className="rounded-2xl bg-amber-50 p-6 text-center border border-amber-100">
      <p className="mb-4 text-amber-800 font-medium">
        Du musst angemeldet sein, um dich für Touren einzuschreiben.
      </p>
      <Link href="/login">
        <Button
          variant="outline"
          className="border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
        >
          Zum Login
        </Button>
      </Link>
    </div>
  );
}

interface TourRegistrationHeaderProps {
  statusText: string;
  maxParticipants?: number | null;
  minAge?: number | null;
  registrationDeadline?: string | null;
  showRegisterButton: boolean;
  tourStatus: string;
  onOpenModal: () => void;
}

function TourRegistrationHeader({
  statusText,
  maxParticipants,
  minAge,
  registrationDeadline,
  showRegisterButton,
  tourStatus,
  onOpenModal,
}: TourRegistrationHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-bold text-slate-900 text-lg">{statusText}</p>
        <p className="text-sm text-slate-500 mt-0.5">
          Teilnehmerlimit: {maxParticipants ?? "Unbegrenzt"}
          {minAge && (
            <span className="ml-3">• Mindestalter: {minAge} Jahre</span>
          )}
        </p>
        {registrationDeadline && (
          <p className="mt-1 text-xs text-slate-400">
            Anmeldeschluss:{" "}
            {registrationDeadlineFormatter.format(
              new Date(registrationDeadline),
            )}
          </p>
        )}
      </div>

      {showRegisterButton && (
        <Button
          size="lg"
          className="bg-jdav-green hover:bg-jdav-green-dark text-white font-bold h-12 px-8 rounded-xl"
          onClick={onOpenModal}
        >
          {tourStatus === "full" ? "Auf Warteliste" : "Anmelden"}
        </Button>
      )}
    </div>
  );
}

interface TourRegistrationAgeWarningAlertProps {
  minAge: number;
  tourStartDate: string;
  onOpenModal: () => void;
}

function TourRegistrationAgeWarningAlert({
  minAge,
  tourStartDate,
  onOpenModal,
}: TourRegistrationAgeWarningAlertProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-orange-600 mt-0.5" />
      <div>
        <p className="font-bold text-orange-800 text-sm">
          Mindestalter nicht erreicht
        </p>
        <p className="text-xs text-orange-700 mt-1">
          Diese Tour erfordert ein Mindestalter von {minAge} Jahren zum
          Tourstart ({tourStartDateFormatter.format(new Date(tourStartDate))}
          ). Du kannst eine Ausnahme anfragen.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
          onClick={onOpenModal}
        >
          Ausnahme anfragen
        </Button>
      </div>
    </div>
  );
}

interface TourRegistrationItemProps {
  status: string;
  waitlistPosition?: number | null;
  name?: string;
  onCancel?: () => void;
  isPending: boolean;
}

function TourRegistrationItem({
  status,
  waitlistPosition,
  name,
  onCancel,
  isPending,
}: TourRegistrationItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <StatusBadge
          status={status}
          waitlistPosition={waitlistPosition}
          name={name}
        />
      </div>
      {status === "confirmed" && onCancel && (
        <Button
          size="sm"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl"
          onClick={onCancel}
          disabled={isPending}
        >
          Absagen
        </Button>
      )}
    </div>
  );
}

interface TourRegistrationListProps {
  selfReg?: Registration;
  childRegs: Registration[];
  childrenProfiles: Child[];
  canRegisterMoreChildren: boolean;
  isPending: boolean;
  onCancel: (id: string, name: string) => void;
  onOpenModal: () => void;
}

function TourRegistrationList({
  selfReg,
  childRegs,
  childrenProfiles,
  canRegisterMoreChildren,
  isPending,
  onCancel,
  onOpenModal,
}: TourRegistrationListProps) {
  return (
    <>
      {selfReg && (
        <TourRegistrationItem
          status={selfReg.status}
          waitlistPosition={selfReg.waitlist_position}
          onCancel={() => onCancel(selfReg.id, "dich selbst")}
          isPending={isPending}
        />
      )}

      {childRegs.map((reg) => {
        const child = childrenProfiles.find(
          (c) => c.id === reg.child_profile_id,
        );
        const childName = child?.full_name || "Kind";
        return (
          <TourRegistrationItem
            key={reg.child_profile_id}
            status={reg.status}
            waitlistPosition={reg.waitlist_position}
            name={childName}
            onCancel={() => onCancel(reg.id, childName)}
            isPending={isPending}
          />
        );
      })}

      {canRegisterMoreChildren && (
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={onOpenModal}
        >
          Weiteres Kind anmelden
        </Button>
      )}
    </>
  );
}

function getRegistrationSectionViewModel(options: {
  tourStatus: string;
  registrationDeadline?: string | null;
  minAge: number | null;
  userBirthdate?: string | null;
  tourStartDate?: string | null;
  userRegistrations: Registration[];
  childrenProfiles: Child[];
}) {
  const {
    tourStatus,
    registrationDeadline,
    minAge,
    userBirthdate,
    tourStartDate,
    userRegistrations,
    childrenProfiles,
  } = options;

  const isRegistrationClosedByDeadline =
    Boolean(registrationDeadline) &&
    new Date(registrationDeadline as string) < new Date();

  const cannotRegister =
    tourStatus === "planning" ||
    tourStatus === "completed" ||
    tourStatus === "cancelled" ||
    isRegistrationClosedByDeadline;

  const ageTooYoung = calculateUserAgeTooYoung(
    minAge,
    userBirthdate,
    tourStartDate,
  );

  const selfReg = userRegistrations.find((r) => r.child_profile_id === null);
  const childRegs = userRegistrations.filter(
    (r) => r.child_profile_id !== null,
  );

  const statusText = getRegistrationStatusText(
    cannotRegister,
    isRegistrationClosedByDeadline,
    tourStatus,
  );

  const canRegisterSelf = !cannotRegister && !ageTooYoung && !selfReg;
  const canRegisterMoreChildren =
    !cannotRegister &&
    !ageTooYoung &&
    Boolean(selfReg) &&
    childrenProfiles.some(
      (c) => !childRegs.some((r) => r.child_profile_id === c.id),
    );

  const showAgeWarning =
    ageTooYoung && !selfReg && minAge !== null && Boolean(tourStartDate);

  return {
    selfReg,
    childRegs,
    statusText,
    canRegisterSelf,
    canRegisterMoreChildren,
    showAgeWarning,
  };
}

export function TourRegistrationSection({
  tourId,
  tourTitle,
  tourStatus,
  maxParticipants,
  minAge,
  userBirthdate,
  tourStartDate,
  registrationDeadline,
  isLoggedIn,
  childrenProfiles,
  availableMaterials,
  userRegistrations,
}: TourRegistrationSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return <TourRegistrationLoggedOut />;
  }

  const vm = getRegistrationSectionViewModel({
    tourStatus,
    registrationDeadline,
    minAge,
    userBirthdate,
    tourStartDate,
    userRegistrations,
    childrenProfiles,
  });

  const confirmCancel = () => {
    if (!cancelTarget) return;
    startTransition(async () => {
      await cancelRegistration(cancelTarget.id);
      setCancelTarget(null);
    });
  };

  return (
    <>
      <CancelConfirmModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        name={cancelTarget?.name || ""}
      />

      <div className="space-y-4">
        <TourRegistrationHeader
          statusText={vm.statusText}
          maxParticipants={maxParticipants}
          minAge={minAge}
          registrationDeadline={registrationDeadline}
          showRegisterButton={vm.canRegisterSelf}
          tourStatus={tourStatus}
          onOpenModal={() => setIsModalOpen(true)}
        />

        {vm.showAgeWarning && tourStartDate && minAge !== null && (
          <TourRegistrationAgeWarningAlert
            minAge={minAge}
            tourStartDate={tourStartDate}
            onOpenModal={() => setIsModalOpen(true)}
          />
        )}

        <TourRegistrationList
          selfReg={vm.selfReg}
          childRegs={vm.childRegs}
          childrenProfiles={childrenProfiles}
          canRegisterMoreChildren={vm.canRegisterMoreChildren}
          isPending={isPending}
          onCancel={(id, name) => setCancelTarget({ id, name })}
          onOpenModal={() => setIsModalOpen(true)}
        />
      </div>

      <TourRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tourId={tourId}
        tourTitle={tourTitle}
        tourStartDate={tourStartDate}
        minAge={minAge}
        childrenProfiles={childrenProfiles}
        availableMaterials={availableMaterials}
      />
    </>
  );
}
