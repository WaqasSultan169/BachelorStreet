import type { Metadata } from "next";
import { Container, SectionHeading } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Bachelor's Street collects, uses and protects your personal information.",
};

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. Who we are",
    body: [
      "Bachelor's Street operates this website and is responsible for the personal information you share with us when you browse, create an account or place an order.",
    ],
  },
  {
    title: "2. What we collect",
    body: [
      "Account details such as your name, email address and phone number.",
      "Order details such as the items you order, customization notes, delivery or pickup preference, and the delivery address and optional map pin you provide.",
      "Technical data such as your IP address and basic device information used to keep the service secure and reliable.",
    ],
  },
  {
    title: "3. How we use it",
    body: [
      "To prepare, fulfil and deliver your orders and to keep you updated on their status.",
      "To verify your delivery address falls within a serviceable zone.",
      "To create and secure your account, send verification and password-reset emails, and prevent fraud and abuse.",
      "To improve our menu, service and website.",
    ],
  },
  {
    title: "4. Legal basis and consent",
    body: [
      "We process your information to perform our contract with you (fulfilling orders), to meet legal obligations, for our legitimate interests in running and securing the service, and where you have given consent.",
    ],
  },
  {
    title: "5. Sharing",
    body: [
      "We share information only with service providers who help us operate — for example, hosting, email delivery and payment providers — and only to the extent needed. We do not sell your personal information.",
    ],
  },
  {
    title: "6. Retention",
    body: [
      "We keep order records for as long as needed for accounting, tax and legal purposes. Account data is kept while your account is active and for a reasonable period afterwards.",
    ],
  },
  {
    title: "7. Your choices",
    body: [
      "You can access and update your account information from your account page. You may request a copy of your data or ask us to delete your account by contacting us.",
    ],
  },
  {
    title: "8. Security",
    body: [
      "We protect your data with hashed passwords, encrypted connections and access controls. No system is perfectly secure, but we work to keep your information safe.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "For any privacy question or request, email privacy@bachelorstreet.example.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <Container className="py-10 sm:py-14">
      <SectionHeading
        eyebrow="Legal"
        title="Privacy Policy"
        lead="How we handle the information you share with us."
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
