
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_business_name TEXT := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'business_name', '')), '');
  v_location TEXT := COALESCE(NEW.raw_user_meta_data->>'business_location', '');
  v_business_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  IF v_business_name IS NOT NULL THEN
    INSERT INTO public.businesses (name, owner_id, location, status)
    VALUES (v_business_name, NEW.id, v_location, 'pending')
    RETURNING id INTO v_business_id;

    INSERT INTO public.business_members (business_id, user_id, role)
    VALUES (v_business_id, NEW.id, 'business_owner')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'business_owner')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.notifications (business_id, user_id, title, body)
    VALUES (v_business_id, NEW.id, 'Registration received',
            'Your business registration is pending administrator approval.');
  END IF;

  RETURN NEW;
END; $$;
