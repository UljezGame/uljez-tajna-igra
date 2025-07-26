
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Play, Copy, Check, Users, LogOut, Plus } from 'lucide-react';
import { Player } from '@/hooks/useGameState';
import { PlantPanel } from '@/components/PlantPanel';

interface CategorySelectionProps {
  onSelectCategory: (category: string) => void;
  onStartGame: () => void;
  onLeaveParty: () => void;
  onSetCustomWords: (words: string[]) => void;
  partyCode: string;
  players: Player[];
  isHost: boolean;
}

const categories = ['Muzičari', 'Automobili', 'Fudbaleri', 'Gradovi', 'Životinje', 'Hrana'];

export const CategorySelection = ({ onSelectCategory, onStartGame, onLeaveParty, onSetCustomWords, partyCode, players, isHost }: CategorySelectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [customWords, setCustomWords] = useState<string>('');
  const [showCustomWords, setShowCustomWords] = useState(false);

  const handleCategorySelect = (category: string) => {
    if (!isHost) return; // Only host can select category
    setSelectedCategory(category);
    setShowCustomWords(true);
    onSelectCategory(category);
  };

  const handleCustomWordsSubmit = () => {
    if (!customWords.trim()) {
      onSetCustomWords([]);
      return;
    }
    
    const wordsArray = customWords
      .split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);
    
    onSetCustomWords(wordsArray);
  };

  const handleStartGame = () => {
    if (selectedCategory && isHost) {
      onStartGame();
    }
  };

  const copyPartyCode = async () => {
    try {
      await navigator.clipboard.writeText(partyCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.log('Failed to copy code');
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Muzičari': '🎵',
      'Automobili': '🚗',
      'Fudbaleri': '⚽',
      'Gradovi': '🏙️',
      'Životinje': '🐾',
      'Hrana': '🍕'
    };
    return icons[category] || '🎯';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Postavke partije</h2>
        <p className="text-gray-600">Izaberite kategoriju i pozovite prijatelje</p>
      </div>

      {/* Party Code */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Kod partije</h3>
            <p className="text-2xl font-mono font-bold text-blue-600">{partyCode}</p>
          </div>
          <Button
            onClick={copyPartyCode}
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {/* Players */}
      <div>
        <div className="flex items-center mb-3">
          <Users className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="font-semibold text-gray-800">Igrači ({players.length})</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map((player, index) => (
            <Badge
              key={index}
              variant="secondary"
              className={`px-3 py-2 rounded-full ${
                player.isAdmin 
                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {player.name}
              {player.isAdmin && ' 👑'}
            </Badge>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">
          Izaberite kategoriju
          {!isHost && <span className="text-sm text-gray-500 ml-2">(Samo admin može da bira)</span>}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => handleCategorySelect(category)}
              disabled={!isHost}
              variant={selectedCategory === category ? "default" : "outline"}
              className={`p-4 h-auto rounded-xl transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white transform scale-105'
                  : isHost 
                    ? 'hover:bg-gray-50 hover:scale-105' 
                    : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{getCategoryIcon(category)}</div>
                <div className="text-sm font-medium">{category}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Words Section */}
      {showCustomWords && isHost && (
        <Card className="p-4 border-2 border-purple-200 bg-purple-50">
          <div className="mb-3">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <Plus className="w-4 h-4 mr-2 text-purple-600" />
              Dodaj custom reči za kategoriju "{selectedCategory}"
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Svaku reč unesite u novom redu. Sistem će koristiti i osnovne reči i vaše custom reči.
            </p>
          </div>
          <Textarea
            value={customWords}
            onChange={(e) => setCustomWords(e.target.value)}
            placeholder={`Primer za ${selectedCategory}:\nReč 1\nReč 2\nReč 3`}
            className="mb-3"
            rows={4}
          />
          <Button
            onClick={handleCustomWordsSubmit}
            variant="outline"
            className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
          >
            Sačuvaj custom reči
          </Button>
        </Card>
      )}

      {/* Start Game Button */}
      {isHost && selectedCategory && (
        <Button
          onClick={handleStartGame}
          disabled={!selectedCategory || players.length < 2}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <Play className="w-5 h-5 mr-2" />
          Počni igru
        </Button>
      )}
      
      {!isHost && (
        <div className="text-center p-4 bg-gray-50 rounded-xl">
          <p className="text-gray-600">Čekate da admin pokrene igru...</p>
        </div>
      )}

      {players.length < 2 && (
        <p className="text-center text-sm text-gray-500">
          Potrebno je minimum 2 igrača za početak igre
        </p>
      )}

      {/* Plant Panel */}
      <PlantPanel 
        partyCode={partyCode} 
        players={players} 
        isHost={isHost} 
      />

      {/* Exit Party Button */}
      <Button
        onClick={onLeaveParty}
        variant="outline"
        className="w-full border-2 border-gray-300 hover:border-red-300 hover:bg-red-50 text-gray-700 hover:text-red-700 font-semibold py-3 rounded-xl transition-all duration-200"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Napusti partiju
      </Button>
    </div>
  );
};
