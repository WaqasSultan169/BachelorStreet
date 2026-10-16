import { ArrowRight, Clock, MapPin, Phone, Sparkles } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { Facebook, Instagram } from "@/components/icons/social";
import { APP } from "@/lib/constants";

const BRANCHES = [
  {
    name: "Bachelor Street — F-7",
    address: "Main Boulevard, F-7 Markaz, Islamabad",
    phone: "+92 51 000 0000",
  },
  {
    name: "Bachelor Street — Bahria",
    address: "Civic Center, Bahria Town Phase 4, Rawalpindi",
    phone: "+92 51 000 0001",
  },
] as const;

export function StorySection() {
  return (
    <section className="py-20">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="tomato" className="mb-4">
              Our story
            </Badge>
            <h2 className="font-display text-3xl font-semibold text-charcoal-900 sm:text-4xl">
              A neighbourhood kitchen with big-city flavour
            </h2>
            <p className="mt-4 text-base leading-relaxed text-charcoal-600">
              {APP.name} started with a simple idea: cook honest food to order,
              price it fairly, and get it to people hot. From chargrilled burgers
              to karak chai, every plate is made when you order it.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { icon: Sparkles, label: "Made fresh", value: "To order" },
                { icon: Clock, label: "Open daily", value: "11:00–23:00" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-charcoal-200/70 bg-white p-4"
                >
                  <stat.icon className="h-5 w-5 text-tomato-600" />
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-charcoal-400">
                    {stat.label}
                  </p>
                  <p className="font-display text-lg font-semibold text-charcoal-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button href="/about" variant="outline">
                Read our story
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                <a
                  href={APP.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Bachelor's Street on Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-charcoal-200 text-charcoal-700 transition-colors hover:border-tomato-600 hover:text-tomato-600"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href={APP.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Bachelor's Street on Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-charcoal-200 text-charcoal-700 transition-colors hover:border-tomato-600 hover:text-tomato-600"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div>
            <SectionHeading
              align="left"
              eyebrow="Visit a branch"
              title="Two kitchens, one standard"
              className="mb-6"
            />
            <div className="space-y-4">
              {BRANCHES.map((branch, index) => (
                <Reveal key={branch.name} delay={index * 0.05}>
                  <div className="rounded-2xl border border-charcoal-200/70 bg-white p-5 shadow-[var(--shadow-card)]">
                    <h3 className="font-display text-lg font-semibold text-charcoal-900">
                      {branch.name}
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-charcoal-600">
                      <li className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-tomato-600" />
                        <span>{branch.address}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0 text-tomato-600" />
                        <span>{branch.phone}</span>
                      </li>
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mt-4 text-xs text-charcoal-400">
              Sample branch details shown for demonstration.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
