-- Store AI company ratings with one decimal place (for example 3.7).
alter table public.companies
  drop constraint if exists companies_rating_check;

alter table public.companies
  alter column rating type numeric(2,1) using
    case
      when rating is null then null
      else round(rating::numeric, 1)
    end;

alter table public.companies
  add constraint companies_rating_check check (rating >= 1.0 and rating <= 5.0);
