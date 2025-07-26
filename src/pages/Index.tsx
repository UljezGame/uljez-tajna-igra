import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Users, GamepadIcon } from 'lucide-react';

import { Auth } from '@/pages/Auth';
import { PartySelection } from '@/components/PartySelection';
import { CategorySelection } from '@/components/CategorySelection';
import { GameRoom } from '@/components/GameRoom';
import { FriendsPanel } from '@/components/FriendsPanel';
import { TokenBalance } from '@/components/TokenBalance';
import { useGameState } from '@/hooks/useGameState';
import { Toaster } from '@/components/ui/toaster';

const Index = () => {
  const [partyCodeInput, setPartyCodeInput] = useState('');

  const {
    gameState,
    playerName,
    partyCode,
    selectedCategory,
    players,
    currentPlayerRole,
    isHost,
    user,
    session,
    isGuest,
    setPlayerName,
    createParty,
    joinParty,
    selectCategory,
    startGame,
    nextRound,
    leaveParty,
    setCustomWords,
    logout
  } = useGameState();

  const handleJoinParty = () => {
    if (!partyCodeInput.trim()) return;
    joinParty(partyCodeInput.trim());
  };

  const renderCurrentView = () => {
    switch (gameState) {
      case 'nickname':
        return <Auth onAuthSuccess={setPlayerName} />;

      case 'party-selection':
        return (
          <Tabs defaultValue="game" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="game" className="flex items-center gap-2">
                <GamepadIcon className="h-4 w-4" />
                Game
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-2" disabled={isGuest}>
                <Users className="h-4 w-4" />
                Friends
              </TabsTrigger>
            </TabsList>

            <TabsContent value="game" className="space-y-6">
              <PartySelection
                username={playerName}
                onCreateParty={createParty}
                onJoinParty={joinParty}
                onLogout={logout}
                isGuest={isGuest}
                loading={false}
              />
            </TabsContent>

            <TabsContent value="friends" className="mt-4">
              {!isGuest && (
                <FriendsPanel onJoinParty={joinParty} isGuest={isGuest} />
              )}
            </TabsContent>
          </Tabs>
        );

      case 'category-selection':
        return (
          <CategorySelection
            onSelectCategory={selectCategory}
            onStartGame={startGame}
            onLeaveParty={leaveParty}
            onSetCustomWords={setCustomWords}
            partyCode={partyCode}
            players={players}
            isHost={isHost}
          />
        );
        case 'game-active':
          return (
            <GameRoom
              partyCode={partyCode}
              username={playerName}
              onLeaveParty={leaveParty}
              isGuest={isGuest}
              isHost={isHost}
              onNextRound={nextRound}
            />
          );
        

      default:
        return <Auth onAuthSuccess={setPlayerName} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4 flex items-center justify-center relative">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
            🎭 Uljez 🎭
          </h1>
          <p className="text-white/90 text-lg font-medium">
            {playerName ? `Dobrodošao, ${playerName}!` : ''}
          </p>
        </div>

        {/* Main Content */}
        <Card className="p-6 bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl">
          {renderCurrentView()}
        </Card>

        {/* Token Balance */}
        {user && !isGuest && <TokenBalance />}

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/80 text-sm">
            Zabavite se sa prijateljima! 🎉
          </p>
        </div>
      </div>

      {/* Signature */}
      <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/70">
        © {new Date().getFullYear()} Made by <span className="font-semibold">D.Z.</span>
      </div>

      <Toaster />
    </div>
  );
};

export default Index;
