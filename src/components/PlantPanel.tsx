import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sprout, Target, Type } from 'lucide-react';
import { useTokens } from '@/hooks/useTokens';

interface PlantPanelProps {
  partyCode: string;
  players: Array<{ name: string; isAdmin?: boolean }>;
  isHost: boolean;
}

export const PlantPanel = ({ partyCode, players, isHost }: PlantPanelProps) => {
  const [plantType, setPlantType] = useState<'word' | 'impostor' | ''>('');
  const [customWord, setCustomWord] = useState('');
  const [targetPlayer, setTargetPlayer] = useState('');
  const { tokens, usePlantToken, loading } = useTokens();

  const handlePlant = async () => {
    if (!plantType) return;

    let plantValue = '';
    if (plantType === 'word') {
      if (!customWord.trim()) {
        return;
      }
      plantValue = customWord.trim();
    } else if (plantType === 'impostor') {
      if (!targetPlayer) {
        return;
      }
      plantValue = targetPlayer;
    }

    const success = await usePlantToken(partyCode, plantType, plantValue);
    if (success) {
      setPlantType('');
      setCustomWord('');
      setTargetPlayer('');
    }
  };

  const canPlant = tokens > 0 && plantType && 
    (plantType === 'word' ? customWord.trim() : targetPlayer);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="w-5 h-5 text-green-600" />
          Plant Feature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          Tokeni dostupni: <span className="font-semibold text-green-600">{tokens}</span>
        </div>

        <Select value={plantType} onValueChange={(value: 'word' | 'impostor') => setPlantType(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Izaberi tip plant-a" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="word">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Plant reč
              </div>
            </SelectItem>
            <SelectItem value="impostor">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Plant uljeza
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {plantType === 'word' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Unesi custom reč:</label>
            <Input
              value={customWord}
              onChange={(e) => setCustomWord(e.target.value)}
              placeholder="Unesi reč za igru..."
              maxLength={30}
            />
            <p className="text-xs text-gray-500">
              Ova reč će biti korišćena u sledećoj rundi umesto random reči
            </p>
          </div>
        )}

        {plantType === 'impostor' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Izaberi ko će biti uljez:</label>
            <Select value={targetPlayer} onValueChange={setTargetPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Izaberi igrača" />
              </SelectTrigger>
              <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.name} value={player.name}>
                  {player.name}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Ovaj igrač će biti uljez u sledećoj rundi
            </p>
          </div>
        )}

        <Button
          onClick={handlePlant}
          disabled={!canPlant || loading || tokens === 0}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <Sprout className="w-4 h-4 mr-2" />
          {loading ? 'Plant u toku...' : `Plant (1 token)`}
        </Button>

        {tokens === 0 && (
          <p className="text-sm text-orange-600 text-center">
            Nemaš dovoljno tokena. Dobijaš 4 nova tokena svaki dan!
          </p>
        )}
      </CardContent>
    </Card>
  );
};