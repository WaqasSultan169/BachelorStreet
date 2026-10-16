"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ImageOff, Link2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type HeroImageSource = "upload" | "url";

// Mirrors src/server/services/upload.service.ts. The server re-validates; these
// constants only give instant feedback in the browser.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif";
const UPLOAD_ENDPOINT = "/api/admin/hero/upload";

type Props = {
  id: string;
  label: string;
  hint?: string;
  value: string;
  source: HeroImageSource;
  onChange: (next: { value: string; source: HeroImageSource }) => void;
};

function ImagePreview({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src !== "" && failedSrc === src;

  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-charcoal-100 text-charcoal-400", className)}>
        <ImageOff className="h-6 w-6" />
      </div>
    );
  }

  if (failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-charcoal-100 text-charcoal-400",
          className,
        )}
      >
        <ImageOff className="h-6 w-6" />
        <span className="text-[11px] font-medium">Preview unavailable</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URLs may be on hosts not listed in next.config.
    <img
      src={src}
      alt={alt}
      onError={() => setFailedSrc(src)}
      className={cn("object-cover", className)}
    />
  );
}

export function HeroImageField({ id, label, hint, value, source, onChange }: Props) {
  const [mode, setMode] = useState<HeroImageSource>(source);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const describedBy = useId();

  useEffect(
    () => () => {
      xhrRef.current?.abort();
    },
    [],
  );

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl],
  );

  const upload = useCallback(
    (file: File) => {
      setError(null);
      setUploading(true);
      setProgress(0);

      const form = new FormData();
      form.append("file", file);
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", UPLOAD_ENDPOINT);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        xhrRef.current = null;
        setUploading(false);
        let payload: { success?: boolean; data?: { url?: string }; error?: { message?: string } } | null = null;
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          payload = null;
        }
        if (xhr.status >= 200 && xhr.status < 300 && payload?.success && payload.data?.url) {
          setProgress(100);
          onChange({ value: payload.data.url, source: "upload" });
        } else if (xhr.status === 401 || xhr.status === 403) {
          setError("Your session may have expired. Refresh the page and sign in again.");
        } else {
          setError(payload?.error?.message ?? `Upload failed (${xhr.status}). Please try again.`);
        }
      };

      xhr.onerror = () => {
        xhrRef.current = null;
        setUploading(false);
        setError("Upload failed. Check your connection and try again.");
      };

      xhr.onabort = () => {
        xhrRef.current = null;
        setUploading(false);
      };

      xhr.send(form);
    },
    [onChange],
  );

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      setError(null);
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Use a JPG, PNG, WebP or AVIF image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Images must be 6 MB or smaller.");
        return;
      }
      setObjectUrl(URL.createObjectURL(file));
      upload(file);
    },
    [upload],
  );

  function removeImage() {
    xhrRef.current?.abort();
    setObjectUrl(null);
    setUploading(false);
    setProgress(0);
    setError(null);
    onChange({ value: "", source: "url" });
  }

  const preview = objectUrl ?? value;
  const busy = uploading;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={mode === "upload" ? `${id}-file` : `${id}-url`} className="mb-0">
          {label}
        </Label>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            source === "upload" ? "bg-emerald-100 text-emerald-700" : "bg-charcoal-900/5 text-charcoal-600",
          )}
        >
          {source === "upload" ? "Uploaded image" : "External URL"}
        </span>
      </div>

      <div
        role="tablist"
        aria-label={`${label} source`}
        className="inline-flex rounded-xl border border-charcoal-200 bg-white p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "upload"}
          onClick={() => setMode("upload")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "upload" ? "bg-flame-500/15 text-flame-700" : "text-charcoal-500 hover:text-charcoal-800",
          )}
        >
          <UploadCloud className="h-4 w-4" />
          Upload image
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "url"}
          onClick={() => setMode("url")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            mode === "url" ? "bg-flame-500/15 text-flame-700" : "text-charcoal-500 hover:text-charcoal-800",
          )}
        >
          <Link2 className="h-4 w-4" />
          Image URL
        </button>
      </div>

      {mode === "upload" ? (
        <div className="space-y-2">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptFile(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "relative flex items-center gap-3 rounded-2xl border border-dashed p-3 transition-colors",
              dragging ? "border-flame-500 bg-flame-500/5" : "border-charcoal-300 bg-cream-50",
            )}
          >
            <ImagePreview src={preview} alt="" className="h-20 w-32 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-charcoal-800">
                {busy ? "Uploading…" : preview ? "Image ready" : "Choose an image to upload"}
              </p>
              <p className="mt-0.5 text-xs text-charcoal-500">Drag &amp; drop, or browse. JPG, PNG, WebP or AVIF · max 6 MB.</p>
              {busy ? (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-charcoal-200" role="progressbar" aria-valuenow={progress}>
                  <div className="h-full rounded-full bg-flame-500 transition-[width] duration-200" style={{ width: `${progress}%` }} />
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                    {preview ? <RefreshCw className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
                    {preview ? "Replace" : "Browse"}
                  </Button>
                  {preview ? (
                    <Button type="button" size="sm" variant="ghost" onClick={removeImage} className="text-tomato-600 hover:bg-tomato-100/60">
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
            <input
              ref={inputRef}
              id={`${id}-file`}
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              onChange={(event) => {
                acceptFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Input
              id={`${id}-url`}
              value={value}
              placeholder="https://… or /images/hero/banner.jpg"
              onChange={(event) => onChange({ value: event.target.value, source: "url" })}
              aria-describedby={hint ? describedBy : undefined}
            />
          </div>
          <div className="flex items-center gap-3">
            <ImagePreview src={value} alt="" className="h-20 w-32 shrink-0 rounded-xl" />
            <p className="text-xs text-charcoal-500">
              Paste a public image URL, or a path to a file in <code className="rounded bg-charcoal-100 px-1">/public</code> (for example{" "}
              <code className="rounded bg-charcoal-100 px-1">/images/hero/signature-burgers.jpg</code>).
            </p>
          </div>
        </div>
      )}

      {hint ? (
        <p id={describedBy} className="text-xs text-charcoal-500">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm font-medium text-tomato-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
