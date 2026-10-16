import { Quote, Star } from "lucide-react";
import { Container, SectionHeading } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";

/**
 * Clearly-identified sample testimonials. These are illustrative demo content,
 * not verified customer reviews.
 */
const TESTIMONIALS = [
  {
    name: "Sample reviewer — Ayesha",
    location: "F-7",
    rating: 5,
    quote:
      "Placeholder review for the demo. The burger was hot, the packaging tidy and delivery was faster than promised.",
  },
  {
    name: "Sample reviewer — Bilal",
    location: "G-11",
    rating: 5,
    quote:
      "Placeholder review for the demo. Ordered for a small team lunch — everyone found something they liked.",
  },
  {
    name: "Sample reviewer — Hina",
    location: "Bahria",
    rating: 4,
    quote:
      "Placeholder review for the demo. Loved the karak chai and the molten cake. Will reorder.",
  },
] as const;

export function Testimonials() {
  return (
    <section className="bg-cream-100/60 py-20">
      <Container>
        <SectionHeading
          eyebrow="What people say"
          title="Loved across Islamabad"
          lead="A preview of how reviews will look. The content below is sample data for this demo."
        />
        <div className="mb-8 flex justify-center">
          <Badge variant="outline">Demo content · not real reviews</Badge>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 0.05}>
              <figure className="flex h-full flex-col rounded-2xl border border-charcoal-200/70 bg-white p-6 shadow-[var(--shadow-card)]">
                <Quote className="h-7 w-7 text-gold-400" aria-hidden />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-charcoal-700">
                  {testimonial.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center justify-between border-t border-charcoal-100 pt-4">
                  <div>
                    <p className="text-sm font-semibold text-charcoal-900">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-charcoal-400">
                      {testimonial.location}
                    </p>
                  </div>
                  <div
                    className="flex gap-0.5"
                    role="img"
                    aria-label={`${testimonial.rating} out of 5 stars`}
                  >
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star
                        key={starIndex}
                        className={
                          starIndex < testimonial.rating
                            ? "h-4 w-4 fill-gold-400 text-gold-400"
                            : "h-4 w-4 text-charcoal-200"
                        }
                        aria-hidden
                      />
                    ))}
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
