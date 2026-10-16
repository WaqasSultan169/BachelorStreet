import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern orders and use of the Bachelor's Street website.",
};

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. About these terms",
    body: [
      "These terms govern your use of the Bachelor's Street website and any order you place through it. By placing an order you confirm that you are able to enter into a binding contract and that the information you provide is accurate.",
    ],
  },
  {
    title: "2. Menu, prices and availability",
    body: [
      "Menu items, prices, options and availability may change without notice. The price shown on the checkout page is a live estimate; the final price is the one re-verified by our server at the moment your order is accepted.",
      "If an item becomes unavailable after you order, we will contact you to offer a substitute or remove the item and adjust your total.",
    ],
  },
  {
    title: "3. Delivery and pickup",
    body: [
      "Delivery is only available within our published delivery zones. Coverage is verified using your map pin or, without a pin, an exact match for the entered area and city in an active delivery zone; we may decline or cancel an order that falls outside a zone or where we cannot verify the address.",
      "Delivery and pickup times are estimates and may vary with weather, traffic and demand.",
    ],
  },
  {
    title: "4. Payment",
    body: [
      "Cash on Delivery is available for eligible orders. Any online or card payment option is shown as coming soon and must not be treated as a completed payment until it goes live and a payment provider confirms it.",
    ],
  },
  {
    title: "5. Cancellations and refunds",
    body: [
      "You may request to cancel an order before we begin preparing it. Once preparation has started, orders generally cannot be cancelled. If we cancel your order or cannot fulfil it, you will not be charged for it.",
    ],
  },
  {
    title: "6. Allergies and dietary needs",
    body: [
      "Our kitchen handles common allergens. If you have a serious allergy, please contact the branch directly before ordering. Notes left at checkout are passed to the kitchen but cannot guarantee an allergen-free environment.",
    ],
  },
  {
    title: "7. Acceptable use",
    body: [
      "Do not misuse the website, attempt to disrupt it, place fraudulent orders, or scrape its content. We may suspend or refuse service where we reasonably believe misuse has occurred.",
    ],
  },
  {
    title: "8. Liability",
    body: [
      "To the extent permitted by law, our liability for any order is limited to the value of that order. Nothing in these terms excludes liability that cannot lawfully be excluded.",
    ],
  },
  {
    title: "9. Changes",
    body: [
      "We may update these terms from time to time. The version in effect when you place an order is the one that applies to that order.",
    ],
  },
  {
    title: "10. Contact",
    body: [
      "Questions about these terms? Email us at support@bachelorstreet.example and we'll be glad to help.",
    ],
  },
];

export default function TermsPage() {
  return (
    <Container className="py-10 sm:py-14">
      <SectionHeading
        eyebrow="Legal"
        title="Terms of Service"
        lead="Please read these terms before placing an order with us."
        align="left"
        className="mb-8"
      />
      <div className="mx-auto max-w-3xl space-y-6">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-lg font-semibold text-charcoal-900">
              {section.title}
            </h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-2 text-sm leading-relaxed text-charcoal-600"
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}
        <p className="text-xs text-charcoal-400">
          Last updated: this is a template for demonstration and should be
          reviewed by a qualified professional before launch.
        </p>
      </div>
    </Container>
  );
}
