"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-20">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error interrupted this page. You can try again, or head back home."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" href="/">
              Go home
            </Button>
          </div>
        }
      />
    </Container>
  );
}