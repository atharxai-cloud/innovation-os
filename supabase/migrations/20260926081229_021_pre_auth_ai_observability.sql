-- Innovation OS
-- Migration 021: Secure pre-auth AI observability

create table if not exists public.ai_pre_auth_runs (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null,
  status text not null check (status in ('PENDING','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  input_hash text not null,
  model_provider text not null,
  model_name text not null,
  request_id text,
  service_tier text,
  tokens_in bigint,
  cached_input_tokens bigint,
  tokens_out bigint,
  reasoning_tokens bigint,
  estimated_cost numeric(14,8),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  cost_currency text not null default 'USD',
  pricing_version text,
  metadata_json jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  claimed_at timestamptz,
  error_code text,
  error_message text
);

create index if not exists ai_pre_auth_runs_started_idx
  on public.ai_pre_auth_runs(started_at desc);

create index if not exists ai_pre_auth_runs_unclaimed_idx
  on public.ai_pre_auth_runs(id)
  where claimed_at is null;

alter table public.ai_pre_auth_runs enable row level security;

revoke all on table public.ai_pre_auth_runs from public, anon, authenticated;
grant all on table public.ai_pre_auth_runs to service_role;

comment on table public.ai_pre_auth_runs is
  'Server-side operational telemetry for anonymous/pre-auth AI requests. Contains no raw prompt or model output.';
