"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAdminStoreSettingsAction } from "@/server/actions/admin";

export function StoreSettingsClient({
  settings,
}: {
  settings: { deliveryRadiusKm: number; deliveryEnabled: boolean };
}) {
  const router = useRouter();
  const [radius, setRadius] = useState(String(settings.deliveryRadiusKm));
  const [enabled, setEnabled] = useState(settings.deliveryEnabled);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form className="mt-6 space-y-5 rounded-2xl border border-charcoal-200/70 bg-white p-5" onSubmit={(event) => {
      event.preventDefault();
      startTransition(async () => {
        const result = await saveAdminStoreSettingsAction({
          deliveryRadiusKm: Number(radius),
          deliveryEnabled: enabled,
        });
        setMessage(result.ok ? "Settings saved." : result.error);
        if (result.ok) router.refresh();
      });
    }}>
      <label className="block text-sm font-semibold text-charcoal-700">
        Delivery radius (kilometres)
        <input type="number" min="0.1" max="50" step="0.1" required value={radius} onChange={(event) => setRadius(event.target.value)} className="mt-1 block w-full rounded-lg border border-charcoal-200 px-3 py-2 font-normal" />
      </label>
      <label className="flex items-center gap-2 text-sm text-charcoal-700">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        Accept new delivery orders
      </label>
      <button disabled={pending} className="rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save settings</button>
      {message ? <p role="status" className="text-sm text-charcoal-600">{message}</p> : null}
    </form>
  );
}
