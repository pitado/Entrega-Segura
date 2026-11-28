-- Pitou: assinatura mensal pelo Mercado Pago, período de teste e contas de cortesia.
-- Migração aditiva: só cria colunas, tabela e índices. Nenhum dado existente é alterado ou apagado.
-- Pode ser executada mais de uma vez com segurança.

BEGIN;

ALTER TABLE establishments
  -- Fim do teste grátis. Vazio = calculado a partir de created_at e PITOU_TRIAL_DAYS.
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  -- Conta de cortesia: acesso liberado sem pagamento (equipe Pitou, parceiros, testes).
  ADD COLUMN IF NOT EXISTS billing_exempt boolean NOT NULL DEFAULT false,
  -- Assinatura (preapproval) do Mercado Pago.
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS subscription_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS subscription_payer_email text,
  -- Até quando a mensalidade já paga cobre o uso (próxima cobrança do Mercado Pago).
  ADD COLUMN IF NOT EXISTS paid_until timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_updated_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS establishments_mp_preapproval_key ON establishments (mp_preapproval_id) WHERE mp_preapproval_id IS NOT NULL;

-- Registro dos avisos (webhooks) do Mercado Pago, para auditoria.
CREATE TABLE IF NOT EXISTS billing_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  establishment_id uuid REFERENCES establishments(id) ON DELETE SET NULL,
  topic text NOT NULL,
  resource_id text,
  status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_events_establishment_idx ON billing_events (establishment_id, created_at DESC);

COMMIT;
