INSERT INTO public.user_roles (user_id, role)
SELECT id, 'system_admin'::app_role FROM auth.users WHERE lower(email) = 'info.lungelo95@gmail.com'
ON CONFLICT DO NOTHING;

DELETE FROM public.user_roles
WHERE role = 'system_admin'::app_role
  AND user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'lungelomahaye95@gmail.com');