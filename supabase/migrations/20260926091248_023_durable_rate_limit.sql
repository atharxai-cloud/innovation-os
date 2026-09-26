-- Innovation OS
-- Migration 023: Durable distributed rate limiting

create table if not exists public.rate_limit_buckets (
  scope text not null,
  key_hash text not null,
  request_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  resets_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash)
);

alter table public.rate_limit_buckets enable row level security;

revoke all on table public.rate_limit_buckets from public, anon, authenticated;
grant all on table public.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_allowed boolean := false;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit parameters';
  end if;

  insert into public.rate_limit_buckets (
    scope, key_hash, request_count, window_started_at, resets_at, updated_at
  ) values (
    p_scope, p_key_hash, 1, v_now,
    v_now + make_interval(secs => p_window_seconds), v_now
  )
  on conflict (scope, key_hash)
  do update set
    request_count = case
      when public.rate_limit_buckets.resets_at <= v_now then 1
      else public.rate_limit_buckets.request_count + 1
    end,
    window_started_at = case
      when public.rate_limit_buckets.resets_at <= v_now then v_now
      else public.rate_limit_buckets.window_started_at
    end,
    resets_at = case
      when public.rate_limit_buckets.resets_at <= v_now
        then v_now + make_interval(secs => p_window_seconds)
      else public.rate_limit_buckets.resets_at
    end,
    updated_at = v_now
  where
    public.rate_limit_buckets.resets_at <= v_now
    or public.rate_limit_buckets.request_count < p_limit
  returning true into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.consume_rate_limit(text,text,integer,integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,text,integer,integer)
  to service_role;
