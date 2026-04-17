-- 009: Let specific admin emails insert/update series rows via the browser client.
-- Email list is checked against the JWT directly so we don't need a service role key
-- or a roundtrip through our own API.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (auth.jwt() ->> 'email') = any(
      array[
        'coolshale@gmail.com',
        'justiniloulian@gmail.com'
      ]
    ),
    false
  );
$$;

drop policy if exists "Admins can update series" on public.series;
drop policy if exists "Admins can insert series" on public.series;

create policy "Admins can update series"
  on public.series for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can insert series"
  on public.series for insert
  with check (public.is_admin());

create policy "Admins can delete series"
  on public.series for delete
  using (public.is_admin());
