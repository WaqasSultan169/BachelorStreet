"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/server/validation";
import { forgotPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: ForgotPasswordInput) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setMessage(
        result.message ??
          "If an account exists for that email, we've sent a reset link.",
      );
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
        <Button href="/login" variant="outline" className="w-full">
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        <FieldError id="email-error" message={errors.email?.message} />
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
        Send reset link
      </Button>
    </form>
  );
}
