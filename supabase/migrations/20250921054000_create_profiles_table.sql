-- Create the department enum type
create type public.department as enum (
  'Admin',
  'HR',
  'Sales',
  'Tech',
  'Audit',
  'Procurement',
  'Compliance'
);

-- Create the profiles table
create table
  public.profiles (
    id uuid not null,
    updated_at timestamp with time zone null,
    full_name text null,
    avatar_url text null,
    department public.department null,
    constraint profiles_pkey primary key (id),
    constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade
  ) tablespace pg_default;

-- Function to create a profile for a new user
create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user is created
create trigger on_auth_user_created
after insert on auth.users for each row
execute procedure public.handle_new_user();
