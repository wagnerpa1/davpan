"use client";

import imageCompression from "browser-image-compression";
import {
  Bold,
  Camera,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Heading1,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  Loader2,
  MoveLeft,
  Save,
  Trash2,
  Type,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type React from "react";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  deleteReportImage,
  updateImageOrder,
  uploadImageToStorageOnly,
  uploadReportImage,
  upsertReport,
} from "@/app/actions/reports.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ReportFormProps {
  tourId: string;
  tourTitle: string;
  initialData?: {
    id: string;
    title: string;
    report_text: string;
    images: { id: string; image_url: string; order_index: number }[];
  };
  participants: ReportParticipant[];
}

interface ReportParticipant {
  id: string;
  profiles?: {
    full_name?: string | null;
    image_consent?: boolean | null;
  } | null;
  child_profiles?: {
    full_name?: string | null;
    image_consent?: boolean | null;
  } | null;
}

interface ReportImageItem {
  id: string;
  image_url: string;
  order_index: number;
  isUploading?: boolean;
}

interface UploadResult {
  id: string;
  url: string;
}

interface PrivacyWarningProps {
  participants: ReportParticipant[];
}

interface ReportTextEditorProps {
  insertMarkdown: (prefix: string, suffix?: string) => void;
  isPreview: boolean;
  setIsPreview: (isPreview: boolean) => void;
  setText: (text: string) => void;
  text: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

interface ReportImageGalleryProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  images: ReportImageItem[];
  moveImage: (index: number, direction: "up" | "down") => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeImage: (imageId: string, url: string) => Promise<void>;
  uploadingCount: number;
}

interface ReportFormActionsProps {
  hasExistingReport: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  uploadingCount: number;
}

const MAX_REPORT_IMAGES = 20;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function PrivacyWarning({ participants }: PrivacyWarningProps) {
  const nonConsentingParticipants = participants.filter(
    (participant) =>
      (participant.profiles && participant.profiles.image_consent === false) ||
      (participant.child_profiles &&
        participant.child_profiles.image_consent === false),
  );

  if (nonConsentingParticipants.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-red-900 leading-tight">
            Datenschutz-Hinweis
          </h4>
          <p className="mt-1 text-sm text-red-700">
            Folgende Teilnehmer haben **keine** Foto-Einwilligung gegeben. Bitte
            achtet darauf, dass sie auf den Bildern nicht erkennbar sind:
          </p>
          <ul className="mt-2 text-sm font-bold text-red-900 list-disc list-inside">
            {nonConsentingParticipants.map((participant) => (
              <li key={participant.id}>
                {participant.profiles?.full_name ||
                  participant.child_profiles?.full_name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ReportTitleField({
  setTitle,
  title,
  tourTitle,
}: {
  setTitle: (title: string) => void;
  title: string;
  tourTitle: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="title">Titel des Berichts</Label>
      <Input
        id="title"
        placeholder={`z.B. Traumtour auf den ${tourTitle}`}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        className="rounded-xl border-slate-200 focus:border-jdav-green focus:ring-jdav-green"
      />
    </div>
  );
}

function MarkdownToolbar({
  insertMarkdown,
}: {
  insertMarkdown: (prefix: string, suffix?: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 p-1.5">
      <button
        type="button"
        onClick={() => insertMarkdown("**", "**")}
        title="Fett"
        className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-jdav-green transition-colors"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => insertMarkdown("*", "*")}
        title="Kursiv"
        className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-jdav-green transition-colors"
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="h-4 w-px bg-slate-200 mx-1" />
      <button
        type="button"
        onClick={() => insertMarkdown("# ")}
        title="Überschrift"
        className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-jdav-green transition-colors"
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => insertMarkdown("- ")}
        title="Liste"
        className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-jdav-green transition-colors"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => insertMarkdown("[", "](url)")}
        title="Link"
        className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-jdav-green transition-colors"
      >
        <LinkIcon className="h-4 w-4" />
      </button>
      <div className="h-4 w-px bg-slate-200 mx-1" />
      <button
        type="button"
        onClick={() => insertMarkdown("> ")}
        title="Zitat"
        className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-jdav-green transition-colors"
      >
        <Type className="h-4 w-4" />
      </button>
    </div>
  );
}

function ReportTextEditor({
  insertMarkdown,
  isPreview,
  setIsPreview,
  setText,
  text,
  textareaRef,
}: ReportTextEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="text">Berichtstext (Unterstützt Markdown)</Label>
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          <button
            type="button"
            aria-label="Editor anzeigen"
            onClick={() => setIsPreview(false)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-colors",
              !isPreview
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Edit3 className="h-3 w-3" /> Editor
          </button>
          <button
            type="button"
            aria-label="Vorschau anzeigen"
            onClick={() => setIsPreview(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-colors",
              isPreview
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Eye className="h-3 w-3" /> Vorschau
          </button>
        </div>
      </div>

      {!isPreview ? (
        <div className="space-y-0">
          <MarkdownToolbar insertMarkdown={insertMarkdown} />
          <Textarea
            id="text"
            ref={textareaRef}
            placeholder="Erzähle von euren Erlebnissen..."
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
            rows={12}
            className="rounded-t-none rounded-b-xl border-slate-200 focus:border-jdav-green focus:ring-jdav-green font-mono text-sm"
          />
        </div>
      ) : (
        <div className="min-h-75 rounded-xl border border-slate-200 bg-slate-50 p-4 prose prose-slate prose-jdav max-w-none">
          <ReactMarkdown>
            {text || "_Noch kein Text eingegeben..._"}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function ReportImageCard({
  image,
  index,
  imageCount,
  moveImage,
  removeImage,
}: {
  image: ReportImageItem;
  imageCount: number;
  index: number;
  moveImage: (index: number, direction: "up" | "down") => void;
  removeImage: (imageId: string, url: string) => Promise<void>;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      <Image
        src={image.image_url}
        alt={`Vorschau ${index + 1}`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 flex h-1/2 flex-col justify-end bg-linear-to-t from-black/60 to-transparent p-2 text-white opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              type="button"
              aria-label={`Bild nach oben verschieben ${index + 1}`}
              onClick={() => moveImage(index, "up")}
              disabled={index === 0}
              className="rounded-md bg-white/20 p-1 hover:bg-white/40 disabled:opacity-30"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Bild nach unten verschieben ${index + 1}`}
              onClick={() => moveImage(index, "down")}
              disabled={index === imageCount - 1}
              className="rounded-md bg-white/20 p-1 hover:bg-white/40 disabled:opacity-30"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            aria-label={`Bild ${index + 1} entfernen`}
            onClick={() => removeImage(image.id, image.image_url)}
            className="rounded-md bg-red-500/80 p-1 hover:bg-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="absolute left-2 top-2 flex gap-1">
        <div className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          #{index + 1}
        </div>
        {index === 0 && (
          <div className="rounded-md bg-jdav-green px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
            <Camera className="h-2 w-2" /> Banner
          </div>
        )}
      </div>

      {image.isUploading && (
        <div className="absolute inset-0 bg-black/25 flex items-center justify-center backdrop-blur-[1px]">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}

function ReportImageGallery({
  fileInputRef,
  images,
  moveImage,
  onImageUpload,
  removeImage,
  uploadingCount,
}: ReportImageGalleryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Bilder (max. 20)</Label>
        <span className="text-xs text-slate-500">
          {images.length} / {MAX_REPORT_IMAGES}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image, index) => (
          <ReportImageCard
            key={image.id}
            image={image}
            imageCount={images.length}
            index={index}
            moveImage={moveImage}
            removeImage={removeImage}
          />
        ))}

        {images.length < MAX_REPORT_IMAGES && (
          <button
            type="button"
            aria-label="Foto hinzufügen"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingCount > 0}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-jdav-green hover:text-jdav-green"
          >
            {uploadingCount > 0 ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-[10px] font-bold">
                  Upload ({uploadingCount})...
                </span>
              </>
            ) : (
              <>
                <Camera className="h-6 w-6" />
                <span className="text-xs font-bold">Foto hinzufügen</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(event) => void onImageUpload(event)}
        multiple
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}

function ReportFormActions({
  hasExistingReport,
  isSubmitting,
  onCancel,
  uploadingCount,
}: ReportFormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        className="rounded-xl"
      >
        <MoveLeft className="mr-2 h-4 w-4" /> Abbrechen
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting || uploadingCount > 0}
        className="rounded-xl bg-jdav-green hover:bg-jdav-green-dark"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {hasExistingReport ? "Bericht speichern" : "Bericht veröffentlichen"}
      </Button>
    </div>
  );
}

export function ReportForm({
  tourId,
  tourTitle,
  initialData,
  participants,
}: ReportFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [text, setText] = useState(initialData?.report_text || "");
  const [images, setImages] = useState<ReportImageItem[]>(
    initialData?.images || [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const reportId = initialData?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    setText(`${beforeText}${prefix}${selectedText}${suffix}${afterText}`);

    setTimeout(() => {
      textarea.focus();
      const cursorPos =
        start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > MAX_REPORT_IMAGES) {
      alert(`Maximal ${MAX_REPORT_IMAGES} Bilder erlaubt.`);
      return;
    }

    setUploadingCount((previousCount) => previousCount + files.length);

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    };

    const tempImages: ReportImageItem[] = await Promise.all(
      files.map(async (file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        image_url: await readFileAsDataUrl(file),
        order_index: images.length + index,
        isUploading: true,
      })),
    );

    setImages((previousImages) => [...previousImages, ...tempImages]);

    const uploadPromises = files.map(async (file, index) => {
      const tempImage = tempImages[index];

      try {
        const compressedFile = await imageCompression(file, options);

        let result: UploadResult;
        if (reportId) {
          result = await uploadReportImage(
            reportId,
            compressedFile,
            images.length + index,
            file.name,
          );
        } else {
          const uploadResult = await uploadImageToStorageOnly(
            tourId,
            compressedFile,
            file.name,
          );
          result = {
            id: `staged-${index}-${Date.now()}`,
            url: uploadResult.url,
          };
        }

        setImages((previousImages) =>
          previousImages.map((image) =>
            image.id === tempImage.id
              ? {
                  ...image,
                  id: result.id || image.id,
                  image_url: result.url,
                  isUploading: false,
                }
              : image,
          ),
        );
      } catch (err) {
        console.error("Upload error:", err);
        setImages((previousImages) =>
          previousImages.filter((image) => image.id !== tempImage.id),
        );
      } finally {
        setUploadingCount((previousCount) => Math.max(0, previousCount - 1));
      }
    });

    await Promise.all(uploadPromises);
  };

  const removeImage = async (imageId: string, url: string) => {
    if (!confirm("Bild wirklich löschen?")) return;

    if (!imageId.includes(".")) {
      await deleteReportImage(imageId, url);
    }

    setImages((previousImages) =>
      previousImages.filter((image) => image.id !== imageId),
    );
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const newImages = [...images];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;

    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    setImages(newImages);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const imagesToSync = images.map((image, index) => ({
        url: image.image_url,
        order_index: index,
      }));

      const formData = new FormData();
      formData.append("tourId", tourId);
      formData.append("title", title);
      formData.append("text", text);
      formData.append("images", JSON.stringify(imagesToSync));
      if (reportId) formData.append("reportId", reportId);

      const result = await upsertReport(formData);
      if ("error" in result) {
        alert(result.error);
      } else {
        if (reportId) {
          const orderPayload = images.reduce<
            { id: string; order_index: number }[]
          >((payload, image, index) => {
            if (!image.id.includes("temp") && !image.id.includes("staged")) {
              payload.push({
                id: image.id,
                order_index: index,
              });
            }

            return payload;
          }, []);

          if (orderPayload.length > 0) {
            await updateImageOrder(orderPayload);
          }
        }

        router.push(`/berichte/${result.id}`);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      alert("Fehler beim Speichern.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PrivacyWarning participants={participants} />

      <div className="grid gap-6">
        <ReportTitleField
          setTitle={setTitle}
          title={title}
          tourTitle={tourTitle}
        />
        <ReportTextEditor
          insertMarkdown={insertMarkdown}
          isPreview={isPreview}
          setIsPreview={setIsPreview}
          setText={setText}
          text={text}
          textareaRef={textareaRef}
        />
        <ReportImageGallery
          fileInputRef={fileInputRef}
          images={images}
          moveImage={moveImage}
          onImageUpload={handleImageUpload}
          removeImage={removeImage}
          uploadingCount={uploadingCount}
        />
      </div>

      <ReportFormActions
        hasExistingReport={Boolean(initialData?.id)}
        isSubmitting={isSubmitting}
        onCancel={() => router.back()}
        uploadingCount={uploadingCount}
      />
    </form>
  );
}
