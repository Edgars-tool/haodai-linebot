-- HaoDai v2 foundation schema DRAFT
-- DO NOT RUN against production.
-- This file is a design artifact for a future local/staging Supabase project.

-- users
create table if not exists users (
  id uuid primary key,
  line_user_id text not null unique,
  display_name text not null,
  timezone text not null default 'Asia/Taipei',
  daily_summary_time text not null default '21:00',
  created_at timestamptz not null default now()
);

-- event_receipts (LINE webhook idempotency)
create table if not exists event_receipts (
  line_event_id text primary key,
  received_at timestamptz not null,
  processed_at timestamptz,
  status text not null,
  payload_hash text not null
);

-- inbox_items
create table if not exists inbox_items (
  id uuid primary key,
  user_id uuid not null references users(id),
  source_event_id text not null,
  content_type text not null,
  raw_content text not null,
  classified_as text not null default 'unclassified',
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create unique index if not exists inbox_items_source_event_id_uidx
  on inbox_items (source_event_id);

-- tasks
create table if not exists tasks (
  id uuid primary key,
  user_id uuid not null references users(id),
  title text not null,
  due_at timestamptz,
  status text not null,
  source_event_id text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  undo_until timestamptz,
  snooze_until timestamptz
);
create unique index if not exists tasks_source_event_id_uidx on tasks (source_event_id);

-- reminders
create table if not exists reminders (
  id uuid primary key,
  user_id uuid not null references users(id),
  task_id uuid references tasks(id),
  title text not null,
  remind_at timestamptz not null,
  timezone text not null default 'Asia/Taipei',
  status text not null,
  last_delivery_at timestamptz,
  delivery_key text,
  source_event_id text not null,
  created_at timestamptz not null default now(),
  retry_count int not null default 0,
  retry_at timestamptz,
  last_error text
);
create unique index if not exists reminders_source_event_id_uidx on reminders (source_event_id);

-- action_receipts
create table if not exists action_receipts (
  idempotency_key text primary key,
  action_name text not null,
  resource_id text,
  result jsonb not null,
  created_at timestamptz not null default now()
);

-- daily_summary_receipts
create table if not exists daily_summary_receipts (
  user_id uuid not null references users(id),
  date text not null,
  delivered_at timestamptz not null,
  idempotency_key text not null,
  primary key (user_id, date)
);
