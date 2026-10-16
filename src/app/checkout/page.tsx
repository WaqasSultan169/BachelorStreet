import type { Metadata } from "next";
import { auth } from "@/auth";
import { Container, SectionHeading } from "@/components/ui/container";
import { CheckoutClient } from "@/app/checkout/checkout-client";
import { connectDb } from "@/server/db";
import { getUserModel } from "@/server/db/models";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review your order before confirming with Bachelor's Street.",
};

export default async function CheckoutPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  let contact = {
    name: session?.user?.name ?? "",
    email: "",
  };
  if (session?.user?.id) {
    await connectDb();
    const account = await getUserModel()
      .findById(session.user.id)
      .select("name email emailVerified")
      .lean<{
        name: string;
        email: string;
        emailVerified?: Date | null;
      } | null>();
    if (account) {
      contact = {
        name: account.name,
        email: account.emailVerified ? account.email : "",
      };
    }
  }

  return (
    <Container className="py-10 sm:py-14">
      <SectionHeading
        eyebrow="Checkout"
        title="Almost there"
        lead="Confirm your details and place your order. Prices are re-verified on the server."
        className="mb-8"
      />
      <CheckoutClient contact={contact} signedIn={signedIn} />
    </Container>
  );
}
