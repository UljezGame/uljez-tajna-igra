// PartySelection.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut } from 'lucide-react';

interface PartySelectionProps {
  username: string;
  onCreateParty: () => void;
  onJoinParty: (code: string) => void;
  onLogout: () => void;
  isGuest: boolean;
  loading?: boolean;
}

export const PartySelection = ({
  username,
  onCreateParty,
  onJoinParty,
  onLogout,
  isGuest,
  loading,
}: PartySelectionProps) => {
  const [partyCode, setPartyCode] = useState('');

  const handleJoinParty = () => {
    if (!partyCode.trim()) return;
    onJoinParty(partyCode.trim());
  };

  return (
    <div className="bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4 flex items-center justify-center rounded-3xl">
      <div className="w-full max-w-2xl">
        <Card className="backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl text-gray-800">
              Welcome {isGuest ? `Guest (${username})` : username}!
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onLogout} className="ml-auto">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button
                onClick={onCreateParty}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                disabled={loading}
              >
                Create Party
              </Button>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Enter party code"
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinParty()}
              />
              <Button
                onClick={handleJoinParty}
                className="w-full border border-gray-300 hover:bg-gray-100"
                disabled={loading || !partyCode.trim()}
              >
                Join Party
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
