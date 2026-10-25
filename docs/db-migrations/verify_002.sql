-- Checks after 002_announcements.sql: both tables exist with their columns, auto_key is unique, the occasions table is tied to the
-- employee. Prints one row per check; the run script stops if any row says FAIL.
SELECT 'table ariba_announcements' AS check, CASE WHEN to_regclass('public.ariba_announcements') IS NOT NULL THEN 'ok' ELSE 'FAIL' END AS result
UNION ALL SELECT 'table ariba_emp_occasions', CASE WHEN to_regclass('public.ariba_emp_occasions') IS NOT NULL THEN 'ok' ELSE 'FAIL' END
UNION ALL SELECT 'ariba_announcements has 16 columns', CASE WHEN (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ariba_announcements') = 16 THEN 'ok' ELSE 'FAIL' END
UNION ALL SELECT 'ariba_emp_occasions has 9 columns', CASE WHEN (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ariba_emp_occasions') = 9 THEN 'ok' ELSE 'FAIL' END
UNION ALL SELECT 'auto_key is unique', CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'ariba_announcements' AND indexdef ILIKE '%UNIQUE%auto_key%') THEN 'ok' ELSE 'FAIL' END
UNION ALL SELECT 'occasions FK to employee_directory', CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.ariba_emp_occasions'::regclass AND contype = 'f') THEN 'ok' ELSE 'FAIL' END;
