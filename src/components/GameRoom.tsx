import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, UserMinus, Crown, Users, RotateCcw, LogOut, Eye, EyeOff } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';

interface Player {
  id: string;
  nadimak: string;
  je_admin: boolean;
  role?: string;
  word?: string;
}

interface GameRoomProps {
  partyCode: string;
  username: string;
  onLeaveParty: () => void;
  isGuest: boolean;
  isHost: boolean;
  onNextRound: () => void;
}

export const GameRoom = ({
  partyCode,
  username,
  onLeaveParty,
  isGuest,
  isHost,
  onNextRound
}: GameRoomProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [showWord, setShowWord] = useState(false);
  const { sendFriendRequest } = useFriends();

  useEffect(() => {
    loadPlayers();

    const channel = supabase
      .channel(`party-players-${partyCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'igraci',
          filter: `partija_kod=eq.${partyCode}`
        },
        () => {
          loadPlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partyCode]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('igraci')
        .select('*')
        .eq('partija_kod', partyCode)
        .order('kreirano_at', { ascending: true });

      if (error) throw error;

      setPlayers(data || []);
      const user = data?.find(p => p.nadimak === username);
      setCurrentUser(user || null);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const handleKickPlayer = async (playerToKick: Player) => {
    if (!currentUser?.je_admin) return;

    try {
      const { error } = await supabase
        .from('igraci')
        .delete()
        .eq('partija_kod', partyCode)
        .eq('nadimak', playerToKick.nadimak);

      if (error) throw error;
      toast.success(`${playerToKick.nadimak} izbačen iz partije`);
    } catch (error) {
      console.error('Error kicking player:', error);
      toast.error('Greška prilikom izbacivanja');
    }
  };

  const handleSendFriendRequest = async (playerUsername: string) => {
    if (isGuest) {
      toast.error('Gost ne može slati zahteve');
      return;
    }
    await sendFriendRequest(playerUsername);
  };

  const toggleWordVisibility = () => setShowWord(!showWord);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🎯 Partija</h2>
        <Badge variant="outline" className="px-3 py-1 rounded-full">
          Kod: {partyCode}
        </Badge>
      </div>

      {/* Role Card */}
      {currentUser?.role && (
        <Card
          className={`p-6 text-center ${
            currentUser.role === 'impostor'
              ? 'bg-gradient-to-br from-red-500 to-pink-500 text-white'
              : 'bg-gradient-to-br from-green-500 to-blue-500 text-white'
          }`}
        >
          <div className="mb-4 text-4xl">
            {currentUser.role === 'impostor' ? '🎭' : '🎯'}
          </div>
          {currentUser.role === 'impostor' ? (
            <>
              <h3 className="text-xl font-bold mb-2">Ti si Uljez! 🕵️</h3>
              <p className="text-white/90">
                Pokušaj da se uklopiš i sakriješ svoju ulogu!
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold mb-4">Tvoja reč je:</h3>
              <Button
                onClick={toggleWordVisibility}
                variant="ghost"
                className="text-white hover:bg-white/20 p-4 rounded-xl w-full"
              >
                <div className="flex items-center justify-center space-x-2">
                  {showWord ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  <span className="text-lg">
                    {showWord ? 'Sakrij reč' : 'Prikaži reč'}
                  </span>
                </div>
              </Button>
              {showWord && (
                <div className="mt-4 p-4 bg-white/20 rounded-xl">
                  <p className="text-2xl font-bold">{currentUser.word}</p>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Players */}
      <div>
        <div className="flex items-center mb-3">
          <Users className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="font-semibold text-gray-800">Igrači ({players.length})</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {players.map((player) => (
            <Card key={player.id} className="p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{player.nadimak}</span>
                  {player.je_admin && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className="flex gap-2">
                  {!isGuest && player.nadimak !== username && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendFriendRequest(player.nadimak)}
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                  )}
                  {currentUser?.je_admin && player.nadimak !== username && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleKickPlayer(player)}
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <Card className="p-4 bg-blue-50 border-2 border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">Kako se igra:</h4>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Svi igrači daju nagoveštaje uživo</li>
          <li>2. Uljez pokušava da pogodi glavnu reč</li>
          <li>3. Igrači pokušavaju da otkriju uljeza</li>
          <li>4. Glasajte uživo!</li>
        </ol>
      </Card>

      {/* Buttons */}
      <div className="flex gap-3">
        {isHost && (
          <Button
            onClick={onNextRound}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 font-semibold py-3 rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Sledeća runda
          </Button>
        )}
        <Button
          onClick={onLeaveParty}
          variant="outline"
          className="flex-1 border-2 border-gray-300 hover:border-red-300 hover:bg-red-50 text-gray-700 hover:text-red-700 font-semibold py-3 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Napusti partiju
        </Button>
      </div>
    </div>
  );
};
