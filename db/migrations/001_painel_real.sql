-- Pitou: contas de estabelecimento, cashback, cardápio digital e histórico.
-- Migração aditiva: só cria tabelas, colunas e índices. Nenhum dado existente é alterado ou apagado.
-- Pode ser executada mais de uma vez com segurança.

BEGIN;

-- Estabelecimento: perfil, plano e configurações.
ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS brand_color text,
  ADD COLUMN IF NOT EXISTS menu_description text,
  ADD COLUMN IF NOT EXISTS menu_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extra_couriers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_min_order numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS establishments_slug_key ON establishments (slug) WHERE slug IS NOT NULL;
DO $$ BEGIN
  ALTER TABLE establishments ADD CONSTRAINT establishments_extra_couriers_check CHECK (extra_couriers BETWEEN 0 AND 500);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE establishments ADD CONSTRAINT establishments_cashback_check CHECK (cashback_percent BETWEEN 0 AND 50 AND cashback_min_order >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Usuários do painel (dono do estabelecimento).
CREATE TABLE IF NOT EXISTS establishment_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS establishment_users_email_key ON establishment_users (lower(email));

-- Sessões: o cookie guarda um token aleatório; o banco guarda só o SHA-256.
CREATE TABLE IF NOT EXISTS user_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES establishment_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions (user_id);

-- Tentativas de login malsucedidas (limite contra força bruta).
CREATE TABLE IF NOT EXISTS login_failures (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_failures_email_idx ON login_failures (lower(email), created_at);

-- Entregadores: telefone de contato.
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS phone text;

-- Clientes de cada estabelecimento, identificados pelo telefone (só dígitos).
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  cashback_balance numeric(10,2) NOT NULL DEFAULT 0 CHECK (cashback_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (establishment_id, phone)
);

-- Pedidos: número sequencial, valor, cliente e cashback.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS number integer,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS cashback_used numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_earned numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS orders_establishment_number_key ON orders (establishment_id, number) WHERE number IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_courier_active_idx ON orders (courier_id) WHERE status IN ('preparing','on_route','arrived');

-- Extrato de cashback: crédito na entrega, débito no uso e estorno no cancelamento.
CREATE TABLE IF NOT EXISTS cashback_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  establishment_id uuid NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  kind text NOT NULL CHECK (kind IN ('earn','redeem','refund')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cashback_entries_order_kind_key ON cashback_entries (order_id, kind) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cashback_entries_customer_idx ON cashback_entries (customer_id, created_at DESC);

-- Cardápio digital.
CREATE TABLE IF NOT EXISTS menu_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  photo_url text,
  available boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_products_establishment_idx ON menu_products (establishment_id, category, position);

COMMIT;
