import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { VerifyEmailForm } from "@/app/verify-email/verify-email-form";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address to activate your Bachelor's Street account.",
};

export default async function VerifyEmailPage({
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
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            Confirming your email keeps your account secure and lets us send order updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyEmailForm token={token} />
        </CardContent>
      </Card>
    </Container>
  );
}
