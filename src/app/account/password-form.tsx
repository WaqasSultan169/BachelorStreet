"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema } from "@/server/validation";
import type { ChangePasswordInput } from "@/server/validation";
import { changePasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { PasswordStrength } from "@/components/auth/password-strength";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [formError, setFormError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const newPassword = useWatch({ control, name: "newPassword" });

  const onSubmit = (values: ChangePasswordInput) => {
    setFormError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await changePasswordAction(values);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      reset({ currentPassword: "", newPassword: "" });
      setMessage(result.message ?? "Password updated.");
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {!hasPassword ? (
        <p className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-charcoal-600">
          Your account signs in with Google. You can set a password by using
          &ldquo;Forgot password&rdquo; with this email address.
        </p>
      ) : null}

      <div>
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(errors.currentPassword)}
          aria-describedby={errors.currentPassword ? "current-password-error" : undefined}
          {...register("currentPassword")}
        />
        <FieldError
          id="current-password-error"
          message={errors.currentPassword?.message}
        />
      </div>

      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 12 characters"
          invalid={Boolean(errors.newPassword)}
          aria-describedby={errors.newPassword ? "new-password-error" : undefined}
          {...register("newPassword")}
        />
        <PasswordStrength password={newPassword ?? ""} />
        <FieldError id="new-password-error" message={errors.newPassword?.message} />
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-xl bg-tomato-100 px-4 py-3 text-sm font-medium text-tomato-700"
        >
          {formError}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm font-medium text-emerald-700">{message}</p>
      ) : null}

      <Button type="submit" loading={pending} disabled={!hasPassword}>
        Update password
      </Button>
    </form>
  );
}
