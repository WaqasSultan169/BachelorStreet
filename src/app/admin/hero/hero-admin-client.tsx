"use client";

import { useState, useTransition } from "react";
import { ArrowUpDown, CheckCircle2, ImageOff, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { pushToast } from "@/store/slices/toastSlice";
import { useAppDispatch } from "@/store/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeroImageField, type HeroImageSource } from "@/components/admin/hero-image-field";
import {
  createHeroSlideAction,
  deleteHeroSlideAction,
  updateHeroSlideAction,
} from "@/server/actions/heroSlide";
import { cn } from "@/lib/utils";
import type { HeroSlideDto } from "@/server/services/heroSlide.service";

export type HeroAdminSlide = HeroSlideDto;

type FormState = {
  title: string;
  subtitle: string;
  desktopImage: string;
  desktopImageSource: HeroImageSource;
  mobileImage: string;
  mobileImageSource: HeroImageSource;
  ctaLabel: string;
  ctaUrl: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  subtitle: "",
  desktopImage: "",
  desktopImageSource: "upload",
  mobileImage: "",
  mobileImageSource: "upload",
  ctaLabel: "",
  ctaUrl: "",
  sortOrder: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

function toLocalInput(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function validate(form: FormState): string | null {
  if (form.title.trim().length < 2) return "Give the slide a title (at least 2 characters).";
  if (!form.desktopImage.trim()) return "Add a desktop image — upload one or paste a URL.";
  if (form.ctaLabel.trim() && !form.ctaUrl.trim()) return "Add a destination for the CTA button, or clear the label.";
  if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) {
    return "The end time must be after the start time.";
  }
  return null;
}

function Thumbnail({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-xl bg-charcoal-100 text-charcoal-400">
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URLs may be on hosts not listed in next.config.
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-20 w-32 shrink-0 rounded-xl object-cover ring-1 ring-charcoal-200"
    />
  );
}

export function HeroAdminClient({ initialSlides }: { initialSlides: HeroAdminSlide[] }) {
  const dispatch = useAppDispatch();
  const [slides] = useState(initialSlides);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editing = editingId !== null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function startCreate() {
    resetForm();
    document.getElementById("hero-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editSlide(slide: HeroAdminSlide) {
    setEditingId(slide.id);
    setFormError(null);
    setForm({
      title: slide.title,
      subtitle: slide.subtitle ?? "",
      desktopImage: slide.desktopImage,
      desktopImageSource: slide.imageSource ?? "url",
      mobileImage: slide.mobileImage ?? "",
      mobileImageSource: slide.mobileImageSource ?? "url",
      ctaLabel: slide.ctaLabel ?? "",
      ctaUrl: slide.ctaUrl ?? "",
      sortOrder: slide.sortOrder,
      isActive: slide.isActive,
      startsAt: toLocalInput(slide.startsAt),
      endsAt: toLocalInput(slide.endsAt),
    });
    document.getElementById("hero-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function values() {
    return {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      desktopImage: form.desktopImage.trim(),
      imageSource: form.desktopImageSource,
      mobileImage: form.mobileImage.trim(),
      mobileImageSource: form.mobileImage ? form.mobileImageSource : undefined,
      ctaLabel: form.ctaLabel.trim(),
      ctaUrl: form.ctaUrl.trim(),
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : "",
    };
  }

  function save() {
    const problem = validate(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const payload = values();
      const result = editingId
        ? await updateHeroSlideAction({ id: editingId, ...payload })
        : await createHeroSlideAction(payload);
      dispatch(
        pushToast({
          title: result.ok ? "Slide saved" : "Save failed",
          description: result.ok ? "Homepage content updated." : result.error,
          variant: result.ok ? "success" : "error",
        }),
      );
      if (result.ok) window.location.reload();
      else setFormError(result.error);
    });
  }

  function remove(slide: HeroAdminSlide) {
    if (!window.confirm(`Delete "${slide.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteHeroSlideAction(slide.id);
      dispatch(
        pushToast({
          title: result.ok ? "Slide deleted" : "Delete failed",
          description: result.ok ? undefined : result.error,
          variant: result.ok ? "success" : "error",
        }),
      );
      if (result.ok) window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-charcoal-900 sm:text-3xl">Hero slider</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Homepage campaign posters. Active slides rotate automatically on the storefront.
          </p>
        </div>
        <Button type="button" onClick={startCreate}>
          <Plus className="h-4 w-4" />
          New slide
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* Create / edit form */}
        <form
          id="hero-form"
          className="h-max space-y-4 rounded-2xl border border-charcoal-200/70 bg-white p-5 shadow-sm lg:sticky lg:top-24"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-charcoal-900">
              {editing ? "Edit slide" : "New slide"}
            </h2>
            {editing ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal-500 hover:text-charcoal-800"
              >
                <X className="h-3.5 w-3.5" />
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="hero-title">Title</Label>
              <Input
                id="hero-title"
                value={form.title}
                maxLength={120}
                placeholder="Signature burgers, flame-grilled"
                onChange={(event) => update("title", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="hero-subtitle">Subtitle</Label>
              <Input
                id="hero-subtitle"
                value={form.subtitle}
                maxLength={240}
                placeholder="One short line that sells the slide"
                onChange={(event) => update("subtitle", event.target.value)}
              />
            </div>

            <HeroImageField
              id="hero-desktop"
              key={`desktop-${editingId ?? "new"}`}
              label="Desktop image"
              value={form.desktopImage}
              source={form.desktopImageSource}
              onChange={({ value, source }) => {
                update("desktopImage", value);
                update("desktopImageSource", source);
              }}
            />

            <details className="rounded-xl border border-charcoal-200 bg-cream-50 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-charcoal-700">
                Mobile image (optional)
              </summary>
              <div className="pt-3">
                <HeroImageField
                  id="hero-mobile"
                  key={`mobile-${editingId ?? "new"}`}
                  label="Mobile image"
                  hint="Shown on small screens instead of the desktop image. Leave empty to reuse the desktop image."
                  value={form.mobileImage}
                  source={form.mobileImageSource}
                  onChange={({ value, source }) => {
                    update("mobileImage", value);
                    update("mobileImageSource", source);
                  }}
                />
              </div>
            </details>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hero-cta-label">CTA label</Label>
                <Input
                  id="hero-cta-label"
                  value={form.ctaLabel}
                  maxLength={40}
                  placeholder="Order now"
                  onChange={(event) => update("ctaLabel", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="hero-cta-url">CTA destination</Label>
                <Input
                  id="hero-cta-url"
                  value={form.ctaUrl}
                  placeholder="/menu"
                  onChange={(event) => update("ctaUrl", event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hero-sort">
                  <span className="inline-flex items-center gap-1">
                    <ArrowUpDown className="h-3.5 w-3.5" /> Sort order
                  </span>
                </Label>
                <Input
                  id="hero-sort"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.sortOrder}
                  onChange={(event) => update("sortOrder", Number(event.target.value))}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm font-medium text-charcoal-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-charcoal-300 text-flame-600 focus:ring-flame-500"
                    checked={form.isActive}
                    onChange={(event) => update("isActive", event.target.checked)}
                  />
                  Active on the homepage
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hero-starts">Starts at</Label>
                <Input
                  id="hero-starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => update("startsAt", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="hero-ends">Ends at</Label>
                <Input
                  id="hero-ends"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => update("endsAt", event.target.value)}
                />
              </div>
            </div>
          </div>

          {formError ? (
            <p role="alert" className="rounded-xl bg-tomato-100/70 px-3 py-2 text-sm font-medium text-tomato-700">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" loading={pending} disabled={pending}>
              {editing ? "Save changes" : "Create slide"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} disabled={pending}>
              Reset
            </Button>
          </div>
        </form>

        {/* Slide list */}
        <div className="space-y-3">
          {slides.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-charcoal-300 p-10 text-center">
              <Sparkles className="h-6 w-6 text-flame-500" />
              <p className="text-sm font-medium text-charcoal-700">No slides yet</p>
              <p className="max-w-sm text-sm text-charcoal-500">
                The storefront shows its branded fallback hero until you publish a slide.
              </p>
              <Button type="button" size="sm" variant="outline" onClick={startCreate} className="mt-1">
                <Plus className="h-4 w-4" />
                Create the first slide
              </Button>
            </div>
          ) : (
            slides.map((slide) => (
              <article
                key={slide.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center",
                  editingId === slide.id ? "border-flame-400 ring-1 ring-flame-300" : "border-charcoal-200/70",
                )}
              >
                <Thumbnail src={slide.desktopImage} alt={slide.title} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-display text-base font-bold text-charcoal-900">{slide.title}</h3>
                    {slide.isActive ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                    {slide.isDemo ? <Badge variant="gold">Demo</Badge> : null}
                  </div>
                  {slide.subtitle ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-charcoal-500">{slide.subtitle}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-500">
                    <span>{slide.imageSource === "upload" ? "Uploaded image" : "External URL"}</span>
                    <span aria-hidden>·</span>
                    <span>Sort {slide.sortOrder}</span>
                    {slide.ctaLabel && slide.ctaUrl ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>
                          CTA: {slide.ctaLabel} → <code className="rounded bg-charcoal-100 px-1">{slide.ctaUrl}</code>
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 self-start sm:self-center">
                  <Button type="button" variant="outline" size="sm" onClick={() => editSlide(slide)} disabled={pending}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(slide)}
                    disabled={pending}
                    className="text-tomato-600 hover:bg-tomato-100/60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
