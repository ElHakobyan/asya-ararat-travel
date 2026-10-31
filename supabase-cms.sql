-- Run AFTER supabase-setup.sql. Safe to rerun; never deletes existing tours.
begin;
create table if not exists public.site_tours (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 translations jsonb not null default '{}'::jsonb check (jsonb_typeof(translations) = 'object'),
 image_url text not null default '' check (length(image_url) <= 2000),
 price numeric(12,2) check (price >= 0),
 currency text not null default 'USD' check (currency in ('USD','EUR','AMD')),
 sort_order integer not null default 0 check (sort_order >= 0),
 status text not null default 'draft' check (status in ('draft','published','hidden'))
);
alter table public.site_tours enable row level security;
drop policy if exists "public published tours" on public.site_tours;
create policy "public published tours" on public.site_tours for select to anon,authenticated using(status='published');
drop policy if exists "admins manage tours" on public.site_tours;
create policy "admins manage tours" on public.site_tours for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.site_tours to anon,authenticated;
grant insert,update,delete on public.site_tours to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('tour-images','tour-images',true,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
drop policy if exists "admin upload tour images" on storage.objects;
create policy "admin upload tour images" on storage.objects for insert to authenticated
 with check(bucket_id='tour-images' and public.is_admin());
commit;

-- Preserve the four original sample themes as editable drafts, once only.
insert into public.site_tours(id,translations,image_url,sort_order,status) values ('00000000-0000-4000-8000-000000000001','{"ru":{"title":"Откройте Токио","description":"Огни города, гастрономия и незабываемые впечатления.","dates":"","program":""},"en":{"title":"Tokyo Discovery","description":"Neon-lit streets, food and unforgettable city experiences.","dates":"","program":""},"hy":{"title":"Բացահայտեք Տոկիոն","description":"Լուսավոր փողոցներ, խոհանոց և անմոռանալի քաղաքային փորձառություններ։","dates":"","program":""}}'::jsonb,'tour-1.jpg',0,'draft') on conflict(id) do nothing;
insert into public.site_tours(id,translations,image_url,sort_order,status) values ('00000000-0000-4000-8000-000000000002','{"ru":{"title":"Киото и сакура","description":"Старинные улицы, храмы и сезон цветения сакуры.","dates":"","program":""},"en":{"title":"Kyoto & Sakura","description":"Discover historic streets, temples and blossom season.","dates":"","program":""},"hy":{"title":"Կիոտո և սակուրա","description":"Պատմական փողոցներ, տաճարներ և ծաղկման շրջան։","dates":"","program":""}}'::jsonb,'tour-2.jpg',1,'draft') on conflict(id) do nothing;
insert into public.site_tours(id,translations,image_url,sort_order,status) values ('00000000-0000-4000-8000-000000000003','{"ru":{"title":"Фудзи и природа","description":"Горы, озёра и великолепные пейзажи Японии.","dates":"","program":""},"en":{"title":"Mount Fuji & Nature","description":"Explore landscapes, lakes and the beauty of Japan.","dates":"","program":""},"hy":{"title":"Ֆուձի և բնություն","description":"Լեռներ, լճեր և Ճապոնիայի բնության գեղեցկությունը։","dates":"","program":""}}'::jsonb,'tour-3.jpg',2,'draft') on conflict(id) do nothing;
insert into public.site_tours(id,translations,image_url,sort_order,status) values ('00000000-0000-4000-8000-000000000004','{"ru":{"title":"Традиционная Япония","description":"Погрузитесь в традиции, архитектуру и культуру Японии.","dates":"","program":""},"en":{"title":"Traditional Japan","description":"Step into the traditions, architecture and culture of Japan.","dates":"","program":""},"hy":{"title":"Ավանդական Ճապոնիա","description":"Ճանաչեք Ճապոնիայի ավանդույթները, ճարտարապետությունն ու մշակույթը։","dates":"","program":""}}'::jsonb,'tour-4.jpg',3,'draft') on conflict(id) do nothing;
