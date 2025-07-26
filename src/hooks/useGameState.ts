import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type GameState = 'nickname' | 'party-selection' | 'category-selection' | 'game-active';

export interface Player {
  id: string;
  name: string;
  role: 'player' | 'impostor';
  word?: string;
  isAdmin?: boolean;
}

export interface GameCategories {
  [key: string]: string[];
}

const categories: GameCategories = {
  'Muzičari': ['Teodora Džehverović', 'Voyage', 'Breskvica', 'Sara Jo', 'Coby', 'Mili', 'Senidah', 'Relja Popović', 'Tijana Bogićević', 'Zera', 'Nucci', 'Rasta', 'Jala Brat', 'Buba Corelli','Edita', 'Aleksandra Prijović', 'Nikolija','Saban','Dino Merlin','Jelena Rozga','Lepa Brena','Ceca','Jelena Karleusa'],
  'Automobili': ['BMW', 'Mercedes', 'Audi', 'Tesla', 'Ferrari', 'Lamborghini', 'Porsche', 'Volkswagen'],
  'Fudbaleri': ['Lionel Messi', 'Cristiano Ronaldo', 'Kylian Mbappé', 'Erling Haaland', 'Neymar Jr.', 'Robert Lewandowski', 'Kevin De Bruyne', 'Luka Modrić', 'Karim Benzema', 'Vinícius Júnior',
  'Zlatan Ibrahimović', 'Mohamed Salah', 'Sadio Mané', 'Harry Kane', 'Antoine Griezmann', 'Romelu Lukaku', 'Jude Bellingham', 'Pedri', 'Gavi', 'João Félix',
  'Paul Pogba', 'Toni Kroos', 'Thomas Müller', 'Joshua Kimmich', 'Casemiro', 'Bruno Fernandes', 'Riyad Mahrez', 'Phil Foden', 'Bukayo Saka', 'Declan Rice',
  'Marco Verratti', 'Achraf Hakimi', 'Raphaël Varane', 'Virgil van Dijk', 'Trent Alexander-Arnold', 'Andrew Robertson', 'Thibaut Courtois', 'Manuel Neuer', 'Marc-André ter Stegen', 'Jan Oblak'],
  'Gradovi': ['Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Pančevo', 'Čačak', 'Novi Pazar'],
  'Životinje': ['Lav', 'Slon', 'Žirafa', 'Zebra', 'Tigar', 'Medved', 'Vuk', 'Orao'],
  'Hrana': ['Pizza', 'Burger', 'Pasta', 'Sushi', 'Ćevapi', 'Burek', 'Sarma', 'Pljeskavica']
};

function getWordForCategory(category: keyof typeof categories, customWords: string[] = []): string {
  const baseWords = categories[category] || [];
  const allWords = [...baseWords, ...customWords];
  if (allWords.length === 0) {
    return 'Reč'; // fallback reč ako kategorija nije validna ili nema reči
  }
  const randomIndex = Math.floor(Math.random() * allWords.length);
  return allWords[randomIndex];
}

const generatePartyCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const getRandomWord = (category: string, customWords: string[] = []): string => {
  const baseWords = categories[category] || [];
  const allWords = [...baseWords, ...customWords];
  return allWords[Math.floor(Math.random() * allWords.length)];
};

const assignRoles = (players: Player[], category: string): Player[] => {
  const impostorIndex = Math.floor(Math.random() * players.length);
  const word = getRandomWord(category);
  
  return players.map((player, index) => ({
    ...player,
    role: index === impostorIndex ? 'impostor' : 'player',
    word: index === impostorIndex ? undefined : word
  }));
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>('nickname');
  const [playerName, setPlayerNameState] = useState<string>('');
  const [partyCode, setPartyCode] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const { toast } = useToast();

  // Initialize auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // For authenticated users, get username from profile
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', session.user.id)
              .single();
            
            if (profile?.username) {
              setPlayerNameState(profile.username);
              setGameState('party-selection');
            }
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const currentPlayerRole = players.find(p => p.name === playerName);

  // Real-time subscription for players
  // Real-time subscription for players (INSERT, UPDATE, DELETE)
useEffect(() => {
  if (!partyCode) return;

  const channel = supabase
    .channel(`party-players-${partyCode}`)
    .on(
      'postgres_changes',
      {
        event: '*', // slušamo sve događaje
        schema: 'public',
        table: 'igraci'
        // ❌ bez filtera ovde, jer DELETE ne šalje "new"
      },
      (payload) => {
        const kod = (payload.new as any)?.partija_kod || (payload.old as any)?.partija_kod;
        if (kod !== partyCode) return;

        console.log('Players changed:', payload);
        setTimeout(() => loadPlayers(), 100); // malo kašnjenje zbog sinhronizacije baze
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [partyCode]);

// Real-time subscription for party updates (npr. kada se odabere kategorija)
useEffect(() => {
  if (!partyCode) return;

  const channel = supabase
    .channel(`party-updates-${partyCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'partije',
        filter: `kod=eq.${partyCode}`
      },
      (payload) => {
        console.log('Party updated:', payload);

        if (payload.new.kategorija && payload.new.kategorija !== selectedCategory) {
          setSelectedCategory(payload.new.kategorija);
          // I dalje samo ažuriramo kategoriju, ne pokrećemo igru ovde
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [partyCode, selectedCategory]);

  const loadPlayers = async () => {
    if (!partyCode) return;

    try {
      const { data: playersData, error } = await supabase
        .from('igraci')
        .select('id, nadimak, partija_kod, je_admin, role, word')
        .eq('partija_kod', partyCode)
        .order('kreirano_at', { ascending: true });

      if (error) {
        console.error('Error loading players:', error);
        return;
      }

      const { data: partyData } = await supabase
        .from('partije')
        .select('*')
        .eq('kod', partyCode)
        .single();

      if (partyData && playersData) {
        setSelectedCategory(partyData.kategorija || '');
        
        const playersWithRoles = playersData.map(player => ({
          id: player.id,
          name: player.nadimak,
          role: (player.role as 'player' | 'impostor') || 'player',
          word: player.word || undefined,
          isAdmin: player.je_admin || false
        }));
        
        setPlayers(playersWithRoles);
        
        // Check if current player is host
        const currentPlayer = playersData.find(p => p.nadimak === playerName);
        setIsHost(currentPlayer?.je_admin || false);
        
        // Ako je igra već aktivna, samo setuj stanje
        if (partyData.kategorija && partyData.kategorija.trim() !== '') {
          setGameState('game-active');
        }
      }
    } catch (error) {
      console.error('Error in loadPlayers:', error);
    }
  };

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    if (name.startsWith('guest')) {
      setIsGuest(true);
    }
    setGameState('party-selection');
  }, []);

  const logout = useCallback(async () => {
    if (!isGuest) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setIsGuest(false);
    setPlayerNameState('');
    setPartyCode('');
    setPlayers([]);
    setIsHost(false);
    setGameState('nickname');
  }, [isGuest]);

  const createParty = useCallback(async () => {
    const code = generatePartyCode();
    
    try {
      // Create party in database
      const { error: partyError } = await supabase
        .from('partije')
        .insert({
          kod: code,
          admin: playerName,
          kategorija: ''
        });

      if (partyError) {
        toast({
          title: "Greška",
          description: "Nije moguće kreirati partiju",
          variant: "destructive"
        });
        return;
      }

      // Add player as admin
      const { error: playerError } = await supabase
        .from('igraci')
        .insert({
          nadimak: playerName,
          partija_kod: code,
          je_admin: true
        });

      if (playerError) {
        toast({
          title: "Greška",
          description: "Nije moguće pridružiti igrača",
          variant: "destructive"
        });
        return;
      }

      setPartyCode(code);
      setIsHost(true);
      setGameState('category-selection');
      
      toast({
        title: "Partija kreirana!",
        description: `Kod partije: ${code}`
      });

    } catch (error) {
      console.error('Error creating party:', error);
      toast({
        title: "Greška",
        description: "Neočekivana greška",
        variant: "destructive"
      });
    }
  }, [playerName, toast]);

  const joinParty = useCallback(async (code: string) => {
    try {
      // Provera da li postoji partija
      const { data: partyData, error: partyError } = await supabase
        .from('partije')
        .select('*')
        .eq('kod', code.toUpperCase())
        .single();
  
      if (partyError || !partyData) {
        toast({
          title: "Greška",
          description: "Partija sa tim kodom ne postoji",
          variant: "destructive"
        });
        return;
      }
  
      // Provera da li igrač već postoji u partiji
      const { data: existingPlayer } = await supabase
        .from('igraci')
        .select('*')
        .eq('partija_kod', code.toUpperCase())
        .eq('nadimak', playerName)
        .single();
  
      if (existingPlayer) {
        setPartyCode(code.toUpperCase());
        setIsHost(existingPlayer.je_admin || false);
        await loadPlayers(); // await da sačekamo da se igrači učitaju
  
        // Samo postavi stanje na category-selection, igra se startuje SAMO kad admin klikne start
        setGameState('category-selection');
        return;
      }
  
      // Dodaj novog igrača u partiju
      const { error: playerError } = await supabase
        .from('igraci')
        .insert({
          nadimak: playerName,
          partija_kod: code.toUpperCase(),
          je_admin: false
        });
  
      if (playerError) {
        toast({
          title: "Greška",
          description: "Nije moguće pridružiti se partiji",
          variant: "destructive"
        });
        return;
      }
  
      setPartyCode(code.toUpperCase());
      setIsHost(false);
      setGameState('category-selection'); // Ne startuj igru automatski
      
      toast({
        title: "Uspešno!",
        description: "Pridružili ste se partiji"
      });
  
    } catch (error) {
      console.error('Error joining party:', error);
      toast({
        title: "Greška",
        description: "Neočekivana greška",
        variant: "destructive"
      });
    }
  }, [playerName, toast]);

  const selectCategory = useCallback(async (category: string) => {
    if (!isHost || !partyCode) return;
    
    try {
      const { error } = await supabase
        .from('partije')
        .update({ kategorija: category })
        .eq('kod', partyCode);

      if (error) {
        toast({
          title: "Greška",
          description: "Nije moguće postaviti kategoriju",
          variant: "destructive"
        });
        return;
      }

      setSelectedCategory(category);
    } catch (error) {
      console.error('Error selecting category:', error);
    }
  }, [isHost, partyCode, toast]);

  const setCustomWords = useCallback(async (words: string[]) => {
    if (!isHost || !partyCode) return;
    
    try {
      const { error } = await supabase
        .from('partije')
        .update({ custom_words: words })
        .eq('kod', partyCode);

      if (error) {
        toast({
          title: "Greška",
          description: "Nije moguće sačuvati custom reči",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Uspešno!",
        description: `Dodano ${words.length} custom reči`
      });
    } catch (error) {
      console.error('Error setting custom words:', error);
    }
  }, [isHost, partyCode, toast]);

  const startGame = useCallback(async () => {
    if (!selectedCategory || players.length < 2 || !isHost || !partyCode) return;
  
    try {
      // 1. Ažuriraj kategoriju u partiji - time signaliziramo da igra počinje
      const { error: partyError } = await supabase
        .from('partije')
        .update({ kategorija: selectedCategory })
        .eq('kod', partyCode);
  
      if (partyError) {
        toast({
          title: "Greška",
          description: "Nije moguće pokrenuti igru",
          variant: "destructive"
        });
        return;
      }
  
      // 2. Učitaj sve igrače u toj partiji
      const { data: playersData, error: playersError } = await supabase
        .from('igraci')
        .select('id, nadimak, partija_kod')
        .eq('partija_kod', partyCode);
  
      if (playersError || !playersData) {
        toast({
          title: "Greška",
          description: "Nije moguće učitati igrače",
          variant: "destructive"
        });
        return;
      }
  
      // 3. Provjeri da li je neko plantovao uljeza
      const { data: plantedImpostors } = await supabase
        .from('plant_actions')
        .select('plant_value')
        .eq('partija_kod', partyCode)
        .eq('plant_type', 'impostor')
        .order('created_at', { ascending: false })
        .limit(1);

      let impostorId = '';
      if (plantedImpostors && plantedImpostors.length > 0) {
        // Nađi igrača po imenu
        const targetPlayer = playersData.find(p => p.nadimak === plantedImpostors[0].plant_value);
        impostorId = targetPlayer ? targetPlayer.id : '';
      }
      
      // Ako nema plantovanog uljeza, izaberi nasumično
      if (!impostorId) {
        const randomIndex = Math.floor(Math.random() * playersData.length);
        impostorId = playersData[randomIndex].id;
      }
  
      // 4. Učitaj custom words iz baze
      const { data: partyData } = await supabase
        .from('partije')
        .select('custom_words')
        .eq('kod', partyCode)
        .single();

      const customWords = partyData?.custom_words || [];

      // 5. Provjeri da li je neko plantovao reč
      const { data: plantedWords } = await supabase
        .from('plant_actions')
        .select('plant_value')
        .eq('partija_kod', partyCode)
        .eq('plant_type', 'word')
        .order('created_at', { ascending: false })
        .limit(1);

      let word = getWordForCategory(selectedCategory, customWords);
      if (plantedWords && plantedWords.length > 0) {
        word = plantedWords[0].plant_value;
      }
  
      // 6. Pripremi update payload za svakog igrača
      const updates = playersData.map(player => {
        if (player.id === impostorId) {
          return {
            id: player.id,
            role: 'impostor',
            word: null
          };
        } else {
          return {
            id: player.id,
            role: 'player',
            word: word
          };
        }
      });
  
      // 7. Updejtuj igrače u bazi (batch update)
      for (const player of updates) {
        const { id, role, word } = player;
        const { error } = await supabase
          .from('igraci')
          .update({ role, word })
          .eq('id', id);
      
        if (error) {
          console.error(`Greška pri ažuriranju igrača ${id}:`, error);
        }
      }
      
      // 8. Obriši korišćene plant actions za ovu partiju
      await supabase
        .from('plant_actions')
        .delete()
        .eq('partija_kod', partyCode);

      toast({
        title: "Igra pokrenuta!",
        description: "Uloge i reči su dodeljene"
      });
  
      // Real-time će obavestiti klijente i oni će reloadovati stanje
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        title: "Greška",
        description: "Neočekivana greška",
        variant: "destructive"
      });
    }
  }, [selectedCategory, players, isHost, partyCode, toast]);

  const nextRound = useCallback(async () => {
    if (!isHost || !selectedCategory || players.length < 2) return;
  
    // Učitaj custom words iz baze
    const { data: partyData } = await supabase
      .from('partije')
      .select('custom_words')
      .eq('kod', partyCode)
      .single();

    const customWords = partyData?.custom_words || [];
    
    const impostorIndex = Math.floor(Math.random() * players.length);
    const word = getWordForCategory(selectedCategory, customWords);
  
    try {
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const role = (i === impostorIndex) ? 'impostor' : 'player';
        const wordToSet = (i === impostorIndex) ? null : word;
  
        const { error } = await supabase
          .from('igraci')
          .update({ role, word: wordToSet })
          .eq('id', player.id);
  
        if (error) {
          console.error('Greška pri ažuriranju igrača:', error);
          return;
        }
      }
    } catch (err) {
      console.error('Greška u nextRound:', err);
      return;
    }
  
    // loadPlayers će se automatski pozvati na drugim klijentima preko realtime subscription
  }, [isHost, selectedCategory, players, partyCode]);
  

  const leaveParty = useCallback(async () => {
    if (!partyCode || !playerName) return;
  
    try {
      // 1. Proveri da li je igrač admin
      const { data: currentPlayer } = await supabase
        .from('igraci')
        .select('*')
        .eq('partija_kod', partyCode)
        .eq('nadimak', playerName)
        .single();
  
      if (!currentPlayer) {
        // Igrač nije pronađen, samo resetuj lokalno stanje
        setGameState('nickname');
        setPartyCode('');
        setSelectedCategory('');
        setPlayers([]);
        setIsHost(false);
        return;
      }
  
      // 2. Ako je admin i ima još igrača u partiji, dodeli admina nekom drugom
      if (currentPlayer.je_admin) {
        // Uzmi ostale igrače u partiji osim ovog koji izlazi
        const { data: otherPlayers } = await supabase
          .from('igraci')
          .select('*')
          .eq('partija_kod', partyCode)
          .neq('nadimak', playerName);
  
        if (otherPlayers && otherPlayers.length > 0) {
          // Dodeli admina prvom igraču iz liste
          const newAdminId = otherPlayers[0].id;
  
          const { error: updateError } = await supabase
            .from('igraci')
            .update({ je_admin: true })
            .eq('id', newAdminId);
  
          if (updateError) {
            console.error('Greška pri dodeljivanju novog admina:', updateError);
            // Možeš ovde da obavestiš korisnika, ako želiš
          }
        } else {
          // Ako nema drugih igrača, izbriši i partiju
          await supabase
            .from('partije')
            .delete()
            .eq('kod', partyCode);
        }
      }
  
      // 3. Obriši igrača koji izlazi
      await supabase
        .from('igraci')
        .delete()
        .eq('partija_kod', partyCode)
        .eq('nadimak', playerName);
  
    } catch (error) {
      console.error('Greška pri napuštanju partije:', error);
    }
  
    // 4. Resetuj lokalno stanje
    setGameState('nickname');
    setPartyCode('');
    setSelectedCategory('');
    setPlayers([]);
    setIsHost(false);
  
  }, [partyCode, playerName]);
  

  // Load players when party code changes
  useEffect(() => {
    if (partyCode) {
      loadPlayers();
    }
  }, [partyCode]);

  return {
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
    categories: Object.keys(categories),
    setPlayerName,
    createParty,
    joinParty,
    selectCategory,
    startGame,
    nextRound,
    leaveParty,
    setCustomWords,
    logout
  };
};