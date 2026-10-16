"use client";

import { evaluatePasswordStrength } from "@/lib/password-policy";

const BAR_COLORS = [
  "bg-tomato-500",
  "bg-tomato-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
] as const;

const LABEL_COLORS = [
  "text-tomato-600",
  "text-tomato-600",
  "text-amber-600",
  "text-emerald-600",
  "text-emerald-700",
] as const;

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = evaluatePasswordStrength(password);

  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-full ${
              index <= score ? BAR_COLORS[score] : "bg-charcoal-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${LABEL_COLORS[score]}`}>
        Password strength: {label}
      </p>
    </div>
  );
}
