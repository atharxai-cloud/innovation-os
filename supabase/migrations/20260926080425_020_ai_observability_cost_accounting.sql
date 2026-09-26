-- Innovation OS
-- Migration 020: AI observability and cost accounting

alter table public.ai_runs
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists request_id text,
  add column if not exists endpoint text,
  add column if not exists service_tier text,
  add column if not exists cached_input_tokens bigint,
  add column if not exists reasoning_tokens bigint,
  add column if not exists duration_ms integer check (duration_ms is null or duration_ms >= 0),
  add column if not exists cost_currency text not null default 'USD',
  add column if not exists pricing_version text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists error_message text;

create index if not exists ai_runs_agent_started_idx
  on public.ai_runs(agent_type, started_at desc);

create index if not exists ai_runs_actor_started_idx
  on public.ai_runs(actor_id, started_at desc)
  where actor_id is not null;

create index if not exists ai_runs_status_started_idx
  on public.ai_runs(status, started_at desc);

comment on column public.ai_runs.estimated_cost is
  'Estimated API cost in cost_currency using pricing_version at run time.';

comment on column public.ai_runs.metadata_json is
  'Operational metadata only. Do not store raw prompts, model output, secrets, or sensitive user content.';
