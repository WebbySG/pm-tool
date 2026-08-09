-- Project files / media (2026-08-09)
--
-- Until now the project Files tab was a FAKE uploader: handleFileUpload called
-- store.addMedia, which only pushed a blob: URL into local Zustand state. Nothing
-- reached Supabase Storage and nothing reached Postgres, so the uploader's files
-- vanished on the next refresh() (project.media is rebuilt from the DB on every
-- pathname change) and no other user — including the admin — ever saw them.
-- Staff reported this as "I uploaded it and it doesn't show".
--
-- This table is the missing persistence layer. Files themselves live in the
-- existing public `pm-attachments` bucket under `projects/<project_id>/...`,
-- matching how task attachments (pm_task_attachments) and chat uploads already
-- work — no new bucket, no new storage policies needed.
--
-- Idempotent. Re-run on any fresh Supabase project.

create table if not exists public.pm_project_media (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.pm_projects(id) on delete cascade,
  name        text not null,
  -- "image" | "video" | "document" — mirrors pm_task_attachments.type, derived
  -- from the MIME type by uploadAttachment()'s inferType().
  type        text not null default 'document',
  url         text not null,
  -- Human-readable size string ("1.4 MB"), same convention as pm_task_attachments.
  size        text,
  uploaded_by uuid,
  uploaded_at timestamptz not null default now()
);

create index if not exists pm_project_media_project_idx
  on public.pm_project_media (project_id, uploaded_at desc);

alter table public.pm_project_media enable row level security;

-- Matches pm_task_attachments' blanket policy: any authenticated user of the
-- workspace can read/write project files. Tighten with pm_is_admin() or a
-- project-membership check if project files ever hold sensitive material.
drop policy if exists pm_allow_all on public.pm_project_media;
create policy pm_allow_all on public.pm_project_media
  for all using (true) with check (true);

notify pgrst, 'reload schema';
