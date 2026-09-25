import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCredits() {
  return useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_credits");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row as { plan: string; balance: number; allowance: number; resets_at: string } | null;
    },
  });
}

