"use client";

import { useState, useTransition } from "react";
import { saveAdminPromotionAction } from "@/server/actions/admin";

type Promotion = {
  id: string;
  title: string;
  code?: string;
  description?: string;
  imageUrl?: string;
  discountPercent?: number;
  minOrder?: number;
  isBanner: boolean;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
};

export function PromotionsClient({ promotions }: { promotions: Promotion[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const save = (form: FormData, id?: string) => startTransition(async () => {
    const result = await saveAdminPromotionAction({
      id,
      title: String(form.get("title") ?? ""),
      code: String(form.get("code") ?? ""),
      description: String(form.get("description") ?? ""),
      imageUrl: String(form.get("imageUrl") ?? ""),
      discountPercent: form.get("discountPercent") === "" ? undefined : Number(form.get("discountPercent")),
      minOrder: form.get("minOrder") === "" ? undefined : Number(form.get("minOrder")),
      isBanner: form.get("isBanner") === "on",
      isActive: form.get("isActive") === "on",
      startsAt: dateInputToIso(String(form.get("startsAt") ?? "")),
      endsAt: dateInputToIso(String(form.get("endsAt") ?? "")),
    });
    setMessage(result.ok ? "Promotion saved." : result.error);
    if (result.ok) window.location.reload();
  });
  const fields = (promotion?: Promotion) => (
    <>
      <label className="text-xs font-semibold">Title<input name="title" required minLength={2} maxLength={120} defaultValue={promotion?.title} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold">Discount code<input name="code" maxLength={32} defaultValue={promotion?.code} placeholder="SAVE10" className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold">Discount percent<input name="discountPercent" type="number" min="0" max="100" step="0.01" defaultValue={promotion?.discountPercent} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold">Minimum subtotal (PKR)<input name="minOrder" type="number" min="0" defaultValue={promotion?.minOrder} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold">Banner image URL<input name="imageUrl" type="url" maxLength={2048} defaultValue={promotion?.imageUrl} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold">Starts at<input name="startsAt" type="datetime-local" defaultValue={dateToLocalInput(promotion?.startsAt)} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold">Ends at<input name="endsAt" type="datetime-local" defaultValue={dateToLocalInput(promotion?.endsAt)} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold sm:col-span-2">Description<textarea name="description" maxLength={500} defaultValue={promotion?.description} className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal" /></label>
      <label className="text-sm"><input name="isBanner" type="checkbox" defaultChecked={promotion?.isBanner} /> Banner</label>
      <label className="text-sm"><input name="isActive" type="checkbox" defaultChecked={promotion?.isActive} /> Active</label>
    </>
  );
  return (
    <div className="mt-7 space-y-5">
      <form action={(form) => save(form)} className="grid gap-4 rounded-2xl border border-charcoal-200/70 bg-white p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Create promotion</h2>
        {fields()}
        <button disabled={pending} className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Create</button>
      </form>
      {promotions.map((promotion) => (
        <form key={promotion.id} action={(form) => save(form, promotion.id)} className="grid gap-4 rounded-2xl border border-charcoal-200/70 bg-white p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">{promotion.title}</h2>
          {fields(promotion)}
          <button disabled={pending} className="rounded-lg border border-charcoal-300 px-4 py-2 text-sm font-semibold sm:col-span-2">Save changes</button>
        </form>
      ))}
      {message ? <p role="status" className="text-sm text-charcoal-600">{message}</p> : null}
    </div>
  );
}

function dateToLocalInput(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function dateInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
