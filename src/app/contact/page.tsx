import type { Metadata } from "next";
import { ArrowRight, Clock, MapPin, Utensils } from "lucide-react";
import { Facebook, Instagram } from "@/components/icons/social";
import { Container, SectionHeading } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { APP } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact | Bachelor's Street",
  description:
    "Contact Bachelor's Street - location, social channels and online ordering.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="pb-24 pt-12">
      <Container>
        <SectionHeading
          align="left"
          eyebrow="Contact"
          title="We'd love to hear from you"
          lead="For reservations, large orders or feedback, reach us through any of the channels below."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-charcoal-200/70 bg-white p-6 shadow-[var(--shadow-card)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-tomato-100 text-tomato-600">
              <MapPin className="h-6 w-6" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-charcoal-900">
              Location
            </h2>
            <p className="mt-2 text-sm text-charcoal-500">
              {APP.city}, {APP.country}. Delivery available across our zones —
              check availability at checkout.
            </p>
          </div>

          <div className="rounded-2xl border border-charcoal-200/70 bg-white p-6 shadow-[var(--shadow-card)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-400/20 text-gold-600">
              <Clock className="h-6 w-6" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-charcoal-900">
              Opening hours
            </h2>
            <p className="mt-2 text-sm text-charcoal-500">
              Opening hours are set by each branch and shown on the branch
              selector at checkout. We never publish unverified business hours.
            </p>
          </div>

          <div className="rounded-2xl border border-charcoal-200/70 bg-white p-6 shadow-[var(--shadow-card)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-charcoal-900/5 text-charcoal-700">
              <Utensils className="h-6 w-6" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-charcoal-900">
              Ordering
            </h2>
            <p className="mt-2 text-sm text-charcoal-500">
              Order online for delivery or pickup. Our team confirms every order
              before it hits the kitchen.
            </p>
            <Button href="/menu" size="sm" className="mt-4">
              Order now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <a href={APP.instagram} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <Instagram className="h-4 w-4" />
              Instagram
            </Button>
          </a>
          <a href={APP.facebook} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <Facebook className="h-4 w-4" />
              Facebook
            </Button>
          </a>
        </div>
      </Container>
    </div>
  );
}