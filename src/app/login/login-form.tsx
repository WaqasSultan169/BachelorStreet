"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { loginSchema, type LoginInput } from "@/server/validation/auth";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIcon } from "@/components/icons/google";
import { Label, FieldError } from "@/components/ui/label";

export function LoginForm({
  callbackUrl,
  initialError,
  googleEnabled = false,
}: {
  callbackUrl: string;
  initialError?: string;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | undefined>(initialError);
  const [pending, startTransition] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginInput) => {
    setFormError(undefined);
    startTransition(async () => {
      const result = await loginAction(values);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
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

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-charcoal-500 hover:text-tomato-600"
          >
            Forgot password?
          </Link>
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
          Sign in
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="relative text-center">
            <span className="relative z-10 bg-white px-3 text-xs uppercase tracking-wider text-charcoal-400">
              or
            </span>
            <span className="absolute left-0 top-1/2 h-px w-full bg-charcoal-200" />
          </div>

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
        </>
      ) : null}

      <p className="text-center text-sm text-charcoal-500">
        New here?{" "}
        <Link
          href="/register"
          className="font-semibold text-tomato-600 hover:text-tomato-700"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}