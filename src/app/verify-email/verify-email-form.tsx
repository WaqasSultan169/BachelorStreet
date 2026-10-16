"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { verifyEmailAction, resendVerificationAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

type Status = "idle" | "verifying" | "verified" | "error";

export function VerifyEmailForm({ token }: { token?: string }) {
  const [status, setStatus] = useState<Status>(token ? "verifying" : "idle");
  const [message, setMessage] = useState<string | undefined>(
    token ? undefined : "Open the link from your email to verify your address.",
  );
  const started = useRef(false);

  const [email, setEmail] = useState("");
  const [resendError, setResendError] = useState<string>();
  const [resendMessage, setResendMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verifyEmailAction({ token })
      .then((result) => {
        if (result.ok) {
          setStatus("verified");
          setMessage(result.message ?? "Email verified.");
        } else {
          setStatus("error");
          setMessage(result.error ?? "We couldn't verify that link.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  const onResend = () => {
    setResendError(undefined);
    setResendMessage(undefined);
    startTransition(async () => {
      const result = await resendVerificationAction({ email });
      if (result.error) {
        setResendError(result.error);
        return;
      }
      setResendMessage(result.message);
    });
  };

  return (
    <div className="space-y-6">
      <div aria-live="polite">
        {status === "verifying" ? (
          <p className="text-sm text-charcoal-500">Verifying your email…</p>
        ) : null}
        {status === "verified" ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </p>
            <Button href="/login" className="w-full">
              Continue to sign in
            </Button>
          </div>
        ) : null}
        {status === "error" ? (
          <p
            role="alert"
            className="rounded-xl bg-tomato-100 px-4 py-3 text-sm font-medium text-tomato-700"
          >
            {message}
          </p>
        ) : null}
        {status === "idle" && message ? (
          <p className="text-sm text-charcoal-500">{message}</p>
        ) : null}
      </div>

      {status !== "verified" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onResend();
          }}
          className="space-y-3 border-t border-charcoal-100 pt-6"
        >
          <p className="text-sm text-charcoal-500">
            Didn&apos;t get the email, or the link expired? We can send a new one.
          </p>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              invalid={Boolean(resendError)}
              onChange={(event) => setEmail(event.target.value)}
            />
            <FieldError id="resend-error" message={resendError} />
          </div>
          {resendMessage ? (
            <p className="text-sm font-medium text-emerald-700">{resendMessage}</p>
          ) : null}
          <Button type="submit" variant="outline" className="w-full" loading={pending}>
            Resend verification email
          </Button>
        </form>
      ) : null}

      <p className="text-center text-sm text-charcoal-500">
        <Link href="/login" className="font-semibold text-tomato-600 hover:text-tomato-700">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
