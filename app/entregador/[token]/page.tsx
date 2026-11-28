import type { Metadata } from "next";
import CourierApp from "./CourierApp";
import "../../app.css";

export const metadata: Metadata = {
  title: { absolute: "Minhas entregas · Pitou" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function CourierPage({ params }: { params: Promise<{ token: string }> }) {
  return <CourierApp token={(await params).token} />;
}
