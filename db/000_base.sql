-- Esquema que já existia no Neon antes da migração 001 (reconstruído para desenvolvimento local).
-- Não execute em produção: estas tabelas já existem lá.
CREATE TABLE demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE TABLE establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  vehicle_type text NOT NULL DEFAULT 'moto',
  demo_session_id uuid REFERENCES demo_sessions(id) ON DELETE SET NULL
);
CREATE INDEX idx_couriers_demo_session ON couriers (demo_session_id);
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id),
  courier_id uuid REFERENCES couriers(id),
  customer_name text NOT NULL,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','on_route','arrived','delivered','cancelled')),
  customer_ready boolean NOT NULL DEFAULT false,
  tracking_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  customer_phone text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  customer_ready_at timestamptz,
  destination_latitude double precision,
  destination_longitude double precision,
  courier_access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  demo_session_id uuid REFERENCES demo_sessions(id) ON DELETE SET NULL
);
CREATE INDEX idx_orders_establishment_created ON orders (establishment_id, created_at DESC);
CREATE INDEX idx_orders_courier ON orders (courier_id, status);
CREATE UNIQUE INDEX idx_orders_courier_access_token ON orders (courier_access_token);
CREATE INDEX idx_orders_tracking_status ON orders (tracking_token, status);
CREATE INDEX idx_orders_demo_session ON orders (demo_session_id, created_at DESC);
CREATE TABLE order_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE courier_access_tokens (
  courier_id uuid PRIMARY KEY REFERENCES couriers(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE TABLE delivery_locations (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES couriers(id),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m real CHECK (accuracy_m >= 0),
  is_sharing boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_delivery_locations_recent ON delivery_locations (recorded_at) WHERE is_sharing;
CREATE TABLE delivery_updates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  actor_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_delivery_updates_order_time ON delivery_updates (order_id, created_at DESC);
CREATE TABLE order_locations (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  courier_id uuid REFERENCES couriers(id),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m double precision CHECK (accuracy_m IS NULL OR accuracy_m BETWEEN 0 AND 50000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  location_source text NOT NULL DEFAULT 'gps' CHECK (location_source IN ('gps','simulation'))
);
CREATE INDEX idx_order_locations_updated ON order_locations (updated_at DESC);
INSERT INTO establishments (name) VALUES ('Operação piloto');
