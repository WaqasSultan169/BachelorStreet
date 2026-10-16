"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/server/validation/auth";
import { registerAction } from "@/server/actions/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { PasswordStrength } from "@/components/auth/password-strength";
import { GoogleIcon } from "@/components/icons/google";

export function RegisterForm({
  callbackUrl,
  googleEnabled = false,
}: {
  callbackUrl: string;
  googleEnabled?: boolean;
}) {
  const [formError, setFormError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", phone: "" },
  });

  const password = useWatch({ control, name: "password" });

  const onSubmit = (values: RegisterInput) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await registerAction(values);
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          setError(key as keyof RegisterInput, { message });
        }
      }
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setSuccess(
        result.message ??
          "Account created. Check your email to verify your address before signing in.",
      );
    });
  };

  if (success) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {success}
        </p>
        <Button href={`/login?callbackUrl=${encodeURIComponent("/account")}`} className="w-full">
          Go to sign in
        </Button>
        <Button href="/verify-email" variant="outline" className="w-full">
          Resend verification email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full border-2 border-charcoal-200 bg-white py-5 text-base hover:border-flame-500 hover:bg-flame-50"
            loading={googlePending}
            onClick={() => {
              setGooglePending(true);
              void signIn("google", { callbackUrl });
            }}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <div className="relative text-center">
            <span className="relative z-10 bg-white px-3 text-xs uppercase tracking-wider text-charcoal-400">
              or create an account with email
            </span>
            <span className="absolute left-0 top-1/2 h-px w-full bg-charcoal-200" />
          </div>
        </>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Your name"
              invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            <FieldError id="name-error" message={errors.name?.message} />
          </div>

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
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="03xx xxxxxxx"
              invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              {...register("phone")}
            />
            <FieldError id="phone-error" message={errors.phone?.message} />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <PasswordStrength password={password ?? ""} />
            <FieldError id="password-error" message={errors.password?.message} />
          </div>
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
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-charcoal-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-tomato-600 hover:text-tomato-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
