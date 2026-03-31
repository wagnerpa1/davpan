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
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  deleteReportImage,
  updateImageOrder,
  uploadImageToStorageOnly, // Added
  uploadReportImage,
  upsertReport,
} from "@/app/actions/reports";
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
  isUploading?: boolean; // Added for optimistic UI
}

interface UploadResult {
  id: string;
  url: string;
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

    const newText = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
    setText(newText);

    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      const cursorPos =
        start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const nonConsentingParticipants = participants.filter(
    (p) =>
      (p.profiles && p.profiles.image_consent === false) ||
      (p.child_profiles && p.child_profiles.image_consent === false),
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > 20) {
      alert("Maximal 20 Bilder erlaubt.");
      return;
    }

    setUploadingCount((prev) => prev + files.length);

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    };

    // 1. ADD OPTIMISTIC PLACEHOLDERS
    const tempImages: ReportImageItem[] = files.map((file, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      image_url: URL.createObjectURL(file), // Local preview
      order_index: images.length + idx,
      isUploading: true,
    }));

    setImages((prev) => [...prev, ...tempImages]);

    // 2. UPLOAD TO STORAGE
    const uploadPromises = files.map(async (file, idx) => {
      const tempId = tempImages[idx].id;
      try {
        const compressedFile = await imageCompression(file, options);

        let result: UploadResult;
        if (reportId) {
          // If in edit mode, upload and link immediately as before
          result = await uploadReportImage(
            reportId,
            compressedFile,
            images.length + idx,
            file.name,
          );
        } else {
          // If in creation mode, upload only to storage
          const res = await uploadImageToStorageOnly(
            tourId,
            compressedFile,
            file.name,
          );
          result = { id: `staged-${idx}-${Date.now()}`, url: res.url };
        }

        // Update the optimistic image with the real URL
        setImages((prev) =>
          prev.map((img) =>
            img.id === tempId
              ? {
                  ...img,
                  id: result.id || img.id,
                  image_url: result.url,
                  isUploading: false,
                }
              : img,
          ),
        );
      } catch (err) {
        console.error("Upload error:", err);
        setImages((prev) => prev.filter((img) => img.id !== tempId));
      } finally {
        setUploadingCount((prev) => Math.max(0, prev - 1));
      }
    });

    await Promise.all(uploadPromises);
  };

  const removeImage = async (imgId: string, url: string) => {
    if (!confirm("Bild wirklich löschen?")) return;

    // If it's a real ID (from DB)
    if (!imgId.includes(".")) {
      await deleteReportImage(imgId, url);
    }
    setImages((prev) => prev.filter((img) => img.id !== imgId));
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const newImages = [...images];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;

    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    // Update internal order_index mapping if needed or just rely on array order for next save
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const imagesToSync = images.map((img, idx) => ({
        url: img.image_url,
        order_index: idx,
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
        // Sync image order if it's an edit
        if (reportId) {
          const orderPayload = images
            .map((img, idx) => ({
              id: img.id,
              order_index: idx,
            }))
            .filter(
              (img) => !img.id.includes("temp") && !img.id.includes("staged"),
            );

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
      {/* Privacy Warning */}
      {nonConsentingParticipants.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900 leading-tight">
                Datenschutz-Hinweis
              </h4>
              <p className="mt-1 text-sm text-red-700">
                Folgende Teilnehmer haben **keine** Foto-Einwilligung gegeben.
                Bitte achtet darauf, dass sie auf den Bildern nicht erkennbar
                sind:
              </p>
              <ul className="mt-2 text-sm font-bold text-red-900 list-disc list-inside">
                {nonConsentingParticipants.map((p) => (
                  <li key={p.id}>
                    {p.profiles?.full_name || p.child_profiles?.full_name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">Titel des Berichts</Label>
          <Input
            id="title"
            placeholder={`z.B. Traumtour auf den ${tourTitle}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-xl border-slate-200 focus:border-jdav-green focus:ring-jdav-green"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="text">Berichtstext (Unterstützt Markdown)</Label>
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => setIsPreview(false)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all",
                  !isPreview
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <Edit3 className="h-3 w-3" /> Editor
              </button>
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all",
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
              {/* Markdown Toolbar */}
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
              <Textarea
                id="text"
                ref={textareaRef}
                placeholder="Erzähle von euren Erlebnissen..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                rows={12}
                className="rounded-t-none rounded-b-xl border-slate-200 focus:border-jdav-green focus:ring-jdav-green font-mono text-sm"
              />
            </div>
          ) : (
            <div className="min-h-[300px] rounded-xl border border-slate-200 bg-slate-50 p-4 prose prose-slate prose-jdav max-w-none">
              <ReactMarkdown>
                {text || "_Noch kein Text eingegeben..._"}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Bilder (max. 20)</Label>
            <span className="text-xs text-slate-500">{images.length} / 20</span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
              >
                <Image
                  src={img.image_url}
                  alt={`Vorschau ${idx + 1}`}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex h-1/2 flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-2 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, "up")}
                        disabled={idx === 0}
                        className="rounded-md bg-white/20 p-1 hover:bg-white/40 disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, "down")}
                        disabled={idx === images.length - 1}
                        className="rounded-md bg-white/20 p-1 hover:bg-white/40 disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(img.id, img.image_url)}
                      className="rounded-md bg-red-500/80 p-1 hover:bg-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="absolute left-2 top-2 flex gap-1">
                  <div className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    #{idx + 1}
                  </div>
                  {idx === 0 && (
                    <div className="rounded-md bg-jdav-green px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                      <Camera className="h-2 w-2" /> Banner
                    </div>
                  )}
                </div>

                {/* Uploading Overlay */}
                {img.isUploading && (
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center backdrop-blur-[1px]">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ))}

            {images.length < 20 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCount > 0}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-500 transition-all hover:border-jdav-green hover:text-jdav-green"
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
            onChange={handleImageUpload}
            multiple
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
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
          {initialData?.id ? "Bericht speichern" : "Bericht veröffentlichen"}
        </Button>
      </div>
    </form>
  );
}
