"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationPreferencesAction } from "@/server/actions/account";

export function NotificationPreferences({
  emailConsent,
  phoneConsent,
  hasPhone,
}: {
  emailConsent: boolean;
  phoneConsent: boolean;
  hasPhone: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(emailConsent);
  const [phone, setPhone] = useState(phoneConsent);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form className="space-y-3" onSubmit={(event) => {
      event.preventDefault();
      startTransition(async () => {
        const result = await updateNotificationPreferencesAction({ email, phone });
        setMessage(result.error ?? result.message ?? "");
        if (result.ok) router.refresh();
      });
    }}>
      <label className="flex items-start gap-2 text-sm text-charcoal-700">
        <input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} />
        Email me about delivery assignments and updates.
      </label>
      <label className="flex items-start gap-2 text-sm text-charcoal-700">
        <input type="checkbox" checked={phone} disabled={!hasPhone} onChange={(event) => setPhone(event.target.checked)} />
        Send assignment notifications to my phone by SMS/WhatsApp when configured.
      </label>
      {!hasPhone ? <p className="text-xs text-charcoal-500">Add a phone number to your profile before enabling phone notifications.</p> : null}
      {message ? <p role="status" className="text-xs text-charcoal-600">{message}</p> : null}
      <button disabled={pending} className="rounded-lg border border-charcoal-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">Save notification preferences</button>
    </form>
  );
}
