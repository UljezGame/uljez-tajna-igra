import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useTokens = () => {
  const [tokens, setTokens] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadTokens = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_tokens');
      if (error) throw error;
      setTokens(data || 0);
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };

  const usePlantToken = async (partyCode: string, plantType: 'word' | 'impostor', plantValue?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('use_plant_token', {
        party_code: partyCode,
        plant_type: plantType,
        plant_value: plantValue
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; remaining_tokens?: number };
      
      if (result.success) {
        setTokens(result.remaining_tokens || 0);
        toast({
          title: "Plant uspešan!",
          description: result.message
        });
      } else {
        toast({
          title: "Greška",
          description: result.message,
          variant: "destructive"
        });
      }

      return result.success;
    } catch (error) {
      console.error('Error using plant token:', error);
      toast({
        title: "Greška",
        description: "Neočekivana greška",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  return {
    tokens,
    loading,
    usePlantToken,
    refreshTokens: loadTokens
  };
};