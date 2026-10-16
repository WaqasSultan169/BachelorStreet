import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Bachelor's Street account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Pick a strong passphrase you don&apos;t use anywhere else.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ResetPasswordForm token={token} />
          <p className="text-center text-sm text-charcoal-500">
            <Link href="/login" className="font-semibold text-tomato-600 hover:text-tomato-700">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
