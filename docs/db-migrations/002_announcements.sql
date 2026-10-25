-- =====================================================================
-- 002_announcements.sql — announcements and greetings (the HR department's 22/10 update, sql/21–24) on our normalized
-- Postgres schema. Two new tables only: no existing table or row is changed or removed. No RLS and nothing Supabase-specific
-- (the server checks the session and the permission matrix). One transaction; IF NOT EXISTS, so a second run changes nothing.
-- Run with docs/db-migrations/run_on_railway.sh (backup + check first, then this file, then verify_002.sql).
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.ariba_announcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL DEFAULT 'announcement' CHECK (kind IN ('announcement', 'greeting')),
  occasion      text,                                            -- birthday | anniversary | graduation | ... (greetings)
  title         text NOT NULL,
  body          text NOT NULL DEFAULT '',
  audience      text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'employer', 'employees')),
  employer      text,                                            -- the employer's name when audience = 'employer'
  employee_ids  text[] NOT NULL DEFAULT '{}',
  pinned        boolean NOT NULL DEFAULT false,
  expires_on    date,
  source        text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  auto_key      text UNIQUE,                                     -- stops the same automatic greeting (person / occasion / year) twice
  sent_count    integer NOT NULL DEFAULT 0,
  hidden        boolean NOT NULL DEFAULT false,                  -- "delete" = hide (kept for the archive)
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ariba_announcements_created_idx ON public.ariba_announcements (created_at DESC) WHERE NOT hidden;

CREATE TABLE IF NOT EXISTS public.ariba_emp_occasions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL REFERENCES public.employee_directory (employee_id) ON UPDATE CASCADE ON DELETE CASCADE,
  occasion    text NOT NULL,                                     -- graduation | wedding | newborn | promotion | recovery | other ...
  occ_date    date NOT NULL,
  yearly      boolean NOT NULL DEFAULT false,
  note        text,
  hidden      boolean NOT NULL DEFAULT false,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ariba_emp_occasions_emp_idx ON public.ariba_emp_occasions (employee_id);

COMMIT;
