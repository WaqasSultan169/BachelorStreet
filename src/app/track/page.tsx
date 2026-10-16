import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { TrackForm } from "@/app/track/track-form";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Enter your Bachelor's Street tracking code to follow your order live.",
};

export default function TrackOrderPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-flame-600">
          Live order status
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-charcoal-900 sm:text-5xl">
          Track your order
        </h1>
        <p className="mt-4 text-base text-charcoal-500">
          Enter the tracking code from your confirmation to see every step, from
          kitchen to your door.
        </p>

        <TrackForm />

        <p className="mt-6 text-sm text-charcoal-500">
          Signed in?{" "}
          <Link
            href="/account/orders"
            className="font-semibold text-tomato-600 hover:text-tomato-500"
          >
            View your orders
          </Link>
        </p>
      </div>
    </Container>
  );
}
