import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { getOrderTrackingByTrackingId } from "@/server/services/order.service";
import { OrderTrackingClient } from "@/app/order/[trackingId]/order-tracking-client";
import { validate } from "@/server/validation/common";
import { trackingIdParamsSchema } from "@/server/validation/realtime";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your order",
  description: "Your order confirmation and live status.",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ trackingId: string }> };

export default async function OrderTrackingPage({ params }: PageProps) {
  const { trackingId } = validate(
    trackingIdParamsSchema,
    await params,
    "trackingId",
  );
  const order = await getOrderTrackingByTrackingId(trackingId);
  if (!order) notFound();

  return (
    <Container className="py-10 sm:py-14">
      <OrderTrackingClient initialOrder={order} />
    </Container>
  );
}
