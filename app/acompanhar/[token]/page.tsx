import type { Metadata } from "next";
import Tracking from "./Tracking";
import "../../app.css";

export const metadata: Metadata = {
  title: { absolute: "Acompanhe sua entrega · Pitou" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  return <Tracking token={(await params).token} />;
}
