-- Assign 'owner' role to sagarshettyy11@gmail.com
do $$
declare
  target_user_id uuid;
begin
  -- Get user ID from auth.users schema
  select id into target_user_id from auth.users where email = 'sagarshettyy11@gmail.com';
  
  if target_user_id is not null then
    -- Ensure profile exists in public.profiles
    insert into public.profiles (id, email)
    values (target_user_id, 'sagarshettyy11@gmail.com')
    on conflict (id) do nothing;

    -- Insert owner role in public.user_roles
    insert into public.user_roles (user_id, role)
    values (target_user_id, 'owner')
    on conflict (user_id, role, restaurant_id) do nothing;
    
    raise notice 'Successfully assigned owner role to sagarshettyy11@gmail.com';
  else
    raise warning 'User sagarshettyy11@gmail.com not found in auth.users. Please sign up first!';
  end if;
end $$;
