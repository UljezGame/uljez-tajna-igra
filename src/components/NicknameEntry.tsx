
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';

interface NicknameEntryProps {
  onSubmit: (nickname: string) => void;
}

export const NicknameEntry = ({ onSubmit }: NicknameEntryProps) => {
  const [nickname, setNickname] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onSubmit(nickname.trim());
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Dobrodošli!</h2>
        <p className="text-gray-600">Unesite vaš nadimak da biste počeli</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="nickname" className="text-sm font-medium text-gray-700">
            Nadimak
          </Label>
          <Input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Unesite vaš nadimak..."
            className="mt-1 rounded-xl border-2 border-gray-200 focus:border-purple-500 transition-colors"
            maxLength={20}
          />
        </div>

        <Button
          type="submit"
          disabled={!nickname.trim()}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Nastavi
        </Button>
      </form>
    </div>
  );
};
