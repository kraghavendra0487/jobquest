-- 001_seed_schools_programs.sql
insert into public.schools (name, code) values
  ('School of Computer Science and Engineering', 'SOCSE'),
  ('School of Business', 'SOB'),
  ('School of Design', 'SOD')
on conflict do nothing;

insert into public.programs (name, school_id, code)
select v.name, s.id, v.code
from (values
  ('B.Tech Computer Science', 'SOCSE', 'BTCS'),
  ('B.Tech AI & ML', 'SOCSE', 'BTAIML'),
  ('M.Tech Computer Science', 'SOCSE', 'MTCS'),
  ('BBA', 'SOB', 'BBA'),
  ('MBA', 'SOB', 'MBA'),
  ('B.Des', 'SOD', 'BDES')
) as v(name, school_code, code)
join public.schools s on lower(s.code) = lower(v.school_code)
on conflict do nothing;
