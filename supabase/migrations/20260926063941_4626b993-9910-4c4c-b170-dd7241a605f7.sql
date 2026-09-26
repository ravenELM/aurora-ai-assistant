CREATE TABLE public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  request_type text NOT NULL CHECK (request_type IN ('access','rectification','erasure','restriction','portability','objection','other')),
  details text,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.data_requests TO authenticated;
GRANT ALL ON public.data_requests TO service_role;
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own requests" ON public.data_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own requests" ON public.data_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND length(coalesce(details,'')) <= 2000);