"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";

export default function MenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the browser console for local debugging; production logging
    // happens server-side in the DB/service layer.
    console.error(error);
  }, [error]);

  return (
    <div className="pb-24 pt-16">
      <Container>
        <ErrorState
          title="We couldn't load the menu"
          description="The kitchen data is unavailable right now. Please try again in a moment."
          action={
            <Button onClick={reset}>Reload the menu</Button>
          }
        />
      </Container>
    </div>
  );
}