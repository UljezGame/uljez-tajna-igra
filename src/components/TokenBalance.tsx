import { useTokens } from '@/hooks/useTokens';
import { Badge } from '@/components/ui/badge';
import { Sprout } from 'lucide-react';

export const TokenBalance = () => {
  const { tokens } = useTokens();

  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge variant="outline" className="px-3 py-2 bg-white/90 backdrop-blur-sm border-2 border-green-200 text-green-700 font-semibold">
        <Sprout className="w-4 h-4 mr-2" />
        {tokens} Plant tokeni
      </Badge>
    </div>
  );
};