import type { Metadata } from "next";
import { ArrowRight, HeartHandshake, Sparkles, Timer } from "lucide-react";
import { Facebook, Instagram } from "@/components/icons/social";
import { Container, SectionHeading } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { APP } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story behind Bachelor's Street — made-to-order food and honest service in Islamabad.",
};

const VALUES = [
  {
    icon: Timer,
    title: "Cooked to order",
    body: "We start when you order. It takes a few extra minutes; it tastes like it should.",
  },
  {
    icon: HeartHandshake,
    title: "Honest portions",
    body: "Fair prices and generous plates. No surprises when the food arrives.",
  },
  {
    icon: Sparkles,
    title: "Small details",
    body: "Sauces made in-house, produce checked daily, and a kitchen that cares.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="pb-24">
      <section className="border-b border-charcoal-900/5 bg-cream-100/60 py-16">
        <Container>
          <SectionHeading
            align="left"
            eyebrow="Our story"
            title="A neighbourhood kitchen with big-city standards"
            lead={`Bachelor's Street began as a simple idea — serve food we'd be proud to eat ourselves. From ${APP.city}, we cook everything to order and get it to you hot.`}
            className="mb-0"
          />
        </Container>
      </section>

      <Container className="py-16">
        <div className="grid gap-10 lg:grid-cols-3">
          {VALUES.map((value, index) => (
            <Reveal key={value.title} delay={index * 0.06}>
              <div className="h-full rounded-2xl border border-charcoal-200/70 bg-white p-6 shadow-[var(--shadow-card)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-tomato-100 text-tomato-600">
                  <value.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-charcoal-900">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-500">
                  {value.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-10 rounded-3xl border border-charcoal-200/70 bg-white p-8 shadow-[var(--shadow-card)] sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-charcoal-900">
              Come hungry, leave happy
            </h2>
            <p className="mt-4 text-charcoal-600">
              Whether it&apos;s a quick lunch, a late dinner, or feeding a full
              table, our menu is built to share. Follow along for specials and
              new drops.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/menu">
                Browse the menu
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/contact" variant="outline">
                Get in touch
              </Button>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <a
              href={APP.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl bg-cream-100/70 px-5 py-4 transition-colors hover:bg-cream-200"
            >
              <Instagram className="h-5 w-5 text-tomato-600" />
              <span className="text-sm font-medium text-charcoal-800">
                Follow us on Instagram
              </span>
            </a>
            <a
              href={APP.facebook}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl bg-cream-100/70 px-5 py-4 transition-colors hover:bg-cream-200"
            >
              <Facebook className="h-5 w-5 text-tomato-600" />
              <span className="text-sm font-medium text-charcoal-800">
                Find us on Facebook
              </span>
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}