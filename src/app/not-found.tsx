import { Compass } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tomato-100 text-tomato-600">
        <Compass className="h-8 w-8" />
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-tomato-600">
        404
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-charcoal-900">
        Oops! This page isn&apos;t on the menu.
      </h1>
      <p className="mt-3 max-w-md text-charcoal-500">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you
        back to something delicious.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/">Back to Home</Button>
        <Button href="/menu" variant="outline">
          Explore Menu
        </Button>
      </div>
    </Container>
  );
}