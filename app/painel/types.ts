export type Establishment = {
  id: string; name: string; slug: string | null; phone: string | null; address: string | null;
  latitude: number | null; longitude: number | null; logo_url: string | null; brand_color: string | null;
  menu_description: string | null; menu_enabled: boolean; extra_couriers: number;
  cashback_percent: number; cashback_min_order: number;
};
export type Plan = {
  includedCouriers: number; extraCouriers: number; courierLimit: number; activeCouriers: number;
  extraCourierPrice: number; menuEnabled: boolean; menuPrice: number; basePrice: number; monthly: number;
};
export type Courier = {
  id: string; name: string; phone: string | null; active: boolean; created_at: string;
  has_link: boolean; active_orders: number; last_seen: string | null;
};
export type Order = {
  id: string; number: number | null; customer_name: string; customer_phone: string | null; destination: string;
  destination_latitude: number | null; destination_longitude: number | null; notes: string | null;
  status: "preparing" | "on_route" | "arrived" | "delivered" | "cancelled"; customer_ready: boolean; tracking_token: string;
  created_at: string; updated_at: string; delivered_at: string | null; cancelled_at: string | null;
  courier_id: string | null; courier_name: string | null; total_amount: number | null; cashback_used: number; cashback_earned: number;
  latitude: number | null; longitude: number | null; location_at: string | null;
};
export type Today = { delivered: number; active: number; revenue: number; cashback: number; avg_minutes: number | null };
export type Overview = {
  user: { id: string; name: string; email: string };
  establishment: Establishment; plan: Plan; couriers: Courier[]; orders: Order[]; today: Today;
};
