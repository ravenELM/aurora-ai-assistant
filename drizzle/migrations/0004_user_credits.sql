CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','plus','pro')),
  balance numeric NOT NULL DEFAULT 5,
  period_start timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own credits" ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.plan_allowance(_plan text) RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _plan WHEN 'plus' THEN 50 WHEN 'pro' THEN 200 ELSE 5 END::numeric $$;

CREATE OR REPLACE FUNCTION public.get_credits() RETURNS TABLE(plan text, balance numeric, allowance numeric, resets_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.user_credits;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  INSERT INTO public.user_credits(user_id) VALUES (auth.uid()) ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM public.user_credits uc WHERE uc.user_id = auth.uid() FOR UPDATE;
  IF (r.period_start AT TIME ZONE 'UTC')::date < (now() AT TIME ZONE 'UTC')::date THEN
    UPDATE public.user_credits uc SET balance = public.plan_allowance(r.plan), period_start = now(), updated_at = now()
      WHERE uc.user_id = auth.uid() RETURNING * INTO r;
  END IF;
  RETURN QUERY SELECT r.plan, r.balance, public.plan_allowance(r.plan),
    (((now() AT TIME ZONE 'UTC')::date + 1)::timestamp AT TIME ZONE 'UTC');
END $$;

CREATE OR REPLACE FUNCTION public.spend_credits(_amount numeric) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _amount <= 0 OR _amount > 20 THEN RAISE EXCEPTION 'bad amount'; END IF;
  PERFORM public.get_credits();
  UPDATE public.user_credits uc SET balance = GREATEST(uc.balance - _amount, 0), updated_at = now()
    WHERE uc.user_id = auth.uid() RETURNING uc.balance INTO b;
  RETURN b;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_credits() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.spend_credits(numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(numeric) TO authenticated;