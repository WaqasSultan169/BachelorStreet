import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a link to reset your Bachelor's Street password.",
};

export default function ForgotPasswordPage() {
  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ForgotPasswordForm />
          <p className="text-center text-sm text-charcoal-500">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-tomato-600 hover:text-tomato-700">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
