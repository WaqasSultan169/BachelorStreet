"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/server/validation";
import { resetPasswordAction } from "@/server/actions/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { PasswordStrength } from "@/components/auth/password-strength";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [formError, setFormError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? "", password: "" },
  });

  const password = useWatch({ control, name: "password" });

  if (!token) {
    return (
      <div className="space-y-4">
        <p
          role="alert"
          className="rounded-xl bg-tomato-100 px-4 py-3 text-sm font-medium text-tomato-700"
        >
          This reset link is missing its token. Request a new link to continue.
        </p>
        <Button href="/forgot-password" className="w-full">
          Request a new link
        </Button>
      </div>
    );
  }

  const onSubmit = (values: ResetPasswordInput) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await resetPasswordAction({
        token: values.token,
        password: values.password,
      });
      if (result.fieldErrors?.password) {
        setFormError(result.fieldErrors.password);
        return;
      }
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setMessage(result.message ?? "Password updated. You can sign in now.");
    });
  };

  if (message) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {message}
        </p>
        <Button href="/login" className="w-full">
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <input type="hidden" {...register("token")} />
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          invalid={Boolean(errors.password || formError)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        <PasswordStrength password={password ?? ""} />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-xl bg-tomato-100 px-4 py-3 text-sm font-medium text-tomato-700"
        >
          {formError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" loading={pending}>
        Set new password
      </Button>
    </form>
  );
}
