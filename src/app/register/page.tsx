import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isGoogleAuthEnabled } from "@/lib/env";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RegisterForm } from "@/app/register/register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Bachelor's Street account to order and track deliveries.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === "string" && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : "/";

  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <section className="relative h-[calc(100dvh-5rem)] overflow-hidden">
      <div className="grid h-full lg:grid-cols-2">
        <div className="relative hidden h-full lg:block">
          <Image
            src="/images/food/pizza-supreme.jpg"
            alt="Bachelor's Street pizza"
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink-950/80 via-ink-950/15 to-transparent" />
          <Image
            src="/brand/bachelor_logo.png"
            alt=""
            width={132}
            height={132}
            className="absolute left-8 top-8 z-10 h-29 w-29 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)]"
            priority
          />
          <div className="absolute bottom-8 left-8 right-8 text-cream-50">
            <p className="inline-flex rounded-full bg-flame-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-(--shadow-glow)">
              New customer
            </p>
            <h1 className="mt-3 font-display text-4xl font-black leading-[0.95] drop-shadow-lg">
              Join and order in
              <span className="block text-flame-400">just a minute.</span>
            </h1>
          </div>
        </div>

        <div className="flex min-h-0 items-center justify-center overflow-y-auto px-4 py-3">
          <Container className="w-full max-w-3xl">
            <div className="mb-4 flex justify-center lg:hidden">
              <Image
                src="/brand/bachelor_logo.png"
                alt="Bachelor's Street logo"
                width={72}
                height={72}
                className="h-18 w-16 object-contain"
                priority
              />
            </div>
            <Card className="w-full border-charcoal-200/70 bg-white/98 p-0 shadow-(--shadow-lift)">
              <CardHeader className="px-5 py-4">
                <CardTitle className="text-2xl">Create account</CardTitle>
                <CardDescription>It only takes a moment to start ordering.</CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <RegisterForm
                  callbackUrl={callbackUrl}
                  googleEnabled={isGoogleAuthEnabled()}
                />
              </CardContent>
            </Card>
          </Container>
        </div>
      </div>
    </section>
  );
}
