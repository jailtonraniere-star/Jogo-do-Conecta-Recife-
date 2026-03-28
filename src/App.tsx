/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  HelpCircle, 
  Users, 
  User, 
  ArrowLeft, 
  RotateCcw, 
  Trophy,
  Timer,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Loader2,
  Bug,
  Dumbbell,
  HeartPulse,
  Baby,
  Briefcase,
  PawPrint,
  Zap,
  Cat,
  LucideIcon
} from 'lucide-react';
import { Player, CardData, GameScreen, GameState } from './types';
import { SERVICES, PLAYER_COLORS } from './constants';
import { useMusic } from './contexts/MusicContext';

const ICON_MAP: Record<string, LucideIcon> = {
  Bug,
  Dumbbell,
  HeartPulse,
  Baby,
  Briefcase,
  PawPrint,
  Zap,
  Cat,
};

const SAVE_KEY = 'conecta_recife_memory_game_save';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('home');
  const [playerCount, setPlayerCount] = useState(1);
  const [playerNames, setPlayerNames] = useState<string[]>(['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4']);
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    cards: [],
    flippedCards: [],
    matchesFound: 0,
    attempts: 0,
    startTime: null,
    endTime: null,
    isProcessing: false,
    mismatchCards: [],
    feedbackText: null,
    combo: 0,
  });
  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);
  const [timer, setTimer] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const { isMuted, toggleMute, isLoading, hasKey, openKeySelector } = useMusic();

  // Check for saved game on mount
  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      setHasSavedGame(true);
    }
  }, []);

  // Save game state
  useEffect(() => {
    if (screen === 'game' && !gameState.endTime) {
      const saveData = {
        gameState,
        timer,
        playerCount,
        playerNames,
        screen
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } else if (screen === 'result' || screen === 'home') {
      // We don't clear on 'home' because we might want to resume
      // But we clear on 'result' because the game is over
      if (screen === 'result') {
        localStorage.removeItem(SAVE_KEY);
        setHasSavedGame(false);
      }
    }
  }, [gameState, timer, screen, playerCount, playerNames]);

  const renderMusicToggle = () => {
    if (!hasKey) {
      return (
        <button 
          onClick={openKeySelector}
          className="fixed top-6 right-6 z-50 px-4 py-2 bg-yellow-400 text-white rounded-full shadow-lg font-bold flex items-center gap-2 hover:scale-105 transition-all"
        >
          <Volume2 size={20} />
          Configurar Som
        </button>
      );
    }

    return (
      <button 
        onClick={toggleMute}
        className="fixed top-6 right-6 z-50 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-100 text-[#003089] hover:scale-110 transition-all active:scale-95 disabled:opacity-50"
        disabled={isLoading}
        title={isMuted ? "Ativar Música" : "Desativar Música"}
      >
        {isLoading ? (
          <Loader2 size={24} className="animate-spin" />
        ) : isMuted ? (
          <VolumeX size={24} />
        ) : (
          <Volume2 size={24} />
        )}
      </button>
    );
  };

  // Initialize Timer
  useEffect(() => {
    if (screen === 'game' && gameState.startTime && !gameState.endTime) {
      timerInterval.current = setInterval(() => {
        setTimer(Math.floor((Date.now() - gameState.startTime!) / 1000));
      }, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [screen, gameState.startTime, gameState.endTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initGame = () => {
    localStorage.removeItem(SAVE_KEY);
    setHasSavedGame(false);
    const players: Player[] = Array.from({ length: playerCount }).map((_, i) => ({
      id: i,
      name: playerNames[i] || `Jogador ${i + 1}`,
      color: PLAYER_COLORS[i],
      score: 0,
    }));

    // Create pairs
    const gameCards: CardData[] = [];
    SERVICES.forEach((service, index) => {
      const card1: CardData = {
        id: index * 2,
        serviceId: service.id,
        name: service.name,
        description: service.description,
        icon: service.icon,
        imageUrl: service.imageUrl,
        isFlipped: false,
        isMatched: false,
      };
      const card2: CardData = {
        id: index * 2 + 1,
        serviceId: service.id,
        name: service.name,
        description: service.description,
        icon: service.icon,
        imageUrl: service.imageUrl,
        isFlipped: false,
        isMatched: false,
      };
      gameCards.push(card1, card2);
    });

    // Shuffle
    const shuffled = [...gameCards].sort(() => Math.random() - 0.5);

    setGameState({
      players,
      currentPlayerIndex: 0,
      cards: shuffled,
      flippedCards: [],
      matchesFound: 0,
      attempts: 0,
      startTime: Date.now(),
      endTime: null,
      isProcessing: false,
      mismatchCards: [],
      feedbackText: null,
      combo: 0,
    });
    setTimer(0);
    setScreen('game');
  };

  const handleCardClick = (cardId: number) => {
    setGameState(prev => {
      if (prev.isProcessing) return prev;
      
      const cardIndex = prev.cards.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return prev;
      
      const card = prev.cards[cardIndex];
      if (card.isFlipped || card.isMatched || prev.flippedCards.length >= 2) return prev;

      const newCards = [...prev.cards];
      newCards[cardIndex] = { ...card, isFlipped: true };
      
      return {
        ...prev,
        cards: newCards,
        flippedCards: [...prev.flippedCards, cardId],
      };
    });
  };

  const checkMatch = useCallback((flippedIds: number[], currentCards: CardData[]) => {
    setGameState(prev => ({ ...prev, isProcessing: true }));

    const card1 = currentCards.find(c => c.id === flippedIds[0])!;
    const card2 = currentCards.find(c => c.id === flippedIds[1])!;

    setTimeout(() => {
      if (card1.serviceId === card2.serviceId) {
        // Match!
        setGameState(prev => {
          const updatedCards = prev.cards.map(c => 
            c.serviceId === card1.serviceId ? { ...c, isMatched: true, isFlipped: true } : c
          );
          
          const newCombo = prev.combo + 1;
          const basePoints = 100;
          const comboBonus = (newCombo - 1) * 50;
          const totalPoints = basePoints + comboBonus;

          const updatedPlayers = [...prev.players];
          updatedPlayers[prev.currentPlayerIndex].score += totalPoints;

          const newMatchesFound = prev.matchesFound + 1;
          const isGameOver = newMatchesFound === SERVICES.length;

          if (isGameOver) {
            setTimeout(() => setScreen('result'), 2000);
          }

          return {
            ...prev,
            cards: updatedCards,
            players: updatedPlayers,
            flippedCards: [],
            matchesFound: newMatchesFound,
            attempts: prev.attempts + 1,
            isProcessing: false,
            mismatchCards: [],
            combo: newCombo,
            feedbackText: { 
              text: newCombo > 1 ? `Combo x${newCombo}! +${totalPoints} 🔥` : `Par Perfeito! +${totalPoints} ✨`, 
              type: 'match' 
            },
            endTime: isGameOver ? Date.now() : null,
          };
        });

        setTimeout(() => {
          setGameState(prev => ({ ...prev, feedbackText: null }));
        }, 1500);

        // Show educational toast
        setToast({ title: card1.name, desc: card1.description });
        setTimeout(() => setToast(null), 4000);

      } else {
        // No match
        setGameState(prev => ({
          ...prev,
          mismatchCards: flippedIds,
          feedbackText: { text: 'Tente Novamente! ❌', type: 'mismatch' },
          combo: 0,
        }));
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        setTimeout(() => {
          setGameState(prev => {
            const resetCards = prev.cards.map(c => 
              flippedIds.includes(c.id) ? { ...c, isFlipped: false } : c
            );

            return {
              ...prev,
              cards: resetCards,
              flippedCards: [],
              mismatchCards: [],
              feedbackText: null,
              currentPlayerIndex: (prev.currentPlayerIndex + 1) % prev.players.length,
              attempts: prev.attempts + 1,
              isProcessing: false,
            };
          });
        }, 1000);
      }
    }, 500);
  }, [gameState.currentPlayerIndex, gameState.players, gameState.matchesFound, gameState.combo]);

  useEffect(() => {
    if (gameState.flippedCards.length === 2 && !gameState.isProcessing) {
      checkMatch(gameState.flippedCards, gameState.cards);
    }
  }, [gameState.flippedCards.length, gameState.isProcessing, checkMatch, gameState.cards]);

  const resumeGame = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Adjust startTime so the timer resumes correctly
        const adjustedGameState = {
          ...data.gameState,
          startTime: Date.now() - (data.timer * 1000)
        };
        setGameState(adjustedGameState);
        setTimer(data.timer);
        setPlayerCount(data.playerCount);
        setPlayerNames(data.playerNames);
        setScreen(data.screen);
      } catch (e) {
        console.error("Failed to resume game", e);
        localStorage.removeItem(SAVE_KEY);
        setHasSavedGame(false);
      }
    }
  };

  const renderHome = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center min-h-[80vh] text-center p-6"
    >
      {renderMusicToggle()}
      <div className="mb-8">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <img 
              src="https://conectarecife.recife.pe.gov.br/wp-content/themes/conecta-recife/assets/img/logo-conecta-recife.png" 
              alt="Conecta Recife Logo" 
              className="h-24 md:h-32 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes('themes')) {
                  target.src = "https://conectarecife.recife.pe.gov.br/wp-content/uploads/2021/05/logo-conecta-recife.png";
                } else {
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }
              }}
            />
            <div className="hidden h-24 md:h-32 items-center justify-center text-[#003089] font-black text-3xl italic tracking-tighter">
              CONECTA<span className="text-[#3efdae]">RECIFE</span>
            </div>
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-[#003089] mb-2 tracking-tight">
          Desafio da Memória
        </h1>
        <p className="text-lg text-slate-500 max-w-md mx-auto leading-relaxed">
          Teste sua memória e conheça os serviços digitais que facilitam a vida do cidadão recifense.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {hasSavedGame && (
          <button onClick={resumeGame} className="btn-primary bg-[#3efdae] hover:bg-[#35e09b] text-[#003089] text-xl py-5 border-none shadow-lg">
            <RotateCcw size={24} />
            Continuar Jogo
          </button>
        )}
        <button onClick={() => setScreen('config')} className="btn-primary text-xl py-5">
          <Play size={24} fill="currentColor" />
          Novo Jogo
        </button>
        <button className="btn-secondary text-lg">
          <HelpCircle size={20} />
          Como funciona
        </button>
      </div>

      <div className="mt-16 flex items-center gap-2 text-slate-400 font-semibold uppercase text-xs tracking-widest">
        <span>Prefeitura do Recife</span>
        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
        <span>Inovação Aberta</span>
      </div>
    </motion.div>
  );

  const renderConfig = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto p-6 pt-12"
    >
      {renderMusicToggle()}
      <div className="mb-8 flex justify-center">
        <div className="relative">
          <img 
            src="https://conectarecife.recife.pe.gov.br/wp-content/themes/conecta-recife/assets/img/logo-conecta-recife.png" 
            alt="Conecta Recife Logo" 
            className="h-16 md:h-20 object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.includes('themes')) {
                target.src = "https://conectarecife.recife.pe.gov.br/wp-content/uploads/2021/05/logo-conecta-recife.png";
              } else {
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }
            }}
          />
          <div className="hidden h-16 md:h-20 items-center justify-center text-[#003089] font-black text-2xl italic tracking-tighter">
            CONECTA<span className="text-[#3efdae]">RECIFE</span>
          </div>
        </div>
      </div>
      <button onClick={() => setScreen('home')} className="flex items-center gap-2 text-[#003089] font-bold mb-8 hover:underline">
        <ArrowLeft size={20} />
        Voltar
      </button>

      <h2 className="text-3xl font-black text-[#003089] mb-8">Configuração da Partida</h2>

      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 space-y-10">
        <div>
          <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Número de Jogadores
          </label>
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                onClick={() => setPlayerCount(num)}
                className={`py-4 rounded-2xl font-bold text-xl transition-all ${
                  playerCount === num 
                  ? 'bg-[#003089] text-white shadow-lg scale-105' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">
            Nomes dos Jogadores
          </label>
          {Array.from({ length: playerCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: PLAYER_COLORS[i] }}
              >
                <User size={24} />
              </div>
              <input
                type="text"
                value={playerNames[i]}
                onChange={(e) => {
                  const newNames = [...playerNames];
                  newNames[i] = e.target.value;
                  setPlayerNames(newNames);
                }}
                placeholder={`Jogador ${i + 1}`}
                className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-[#003089] focus:ring-0 transition-all font-bold text-lg"
              />
            </div>
          ))}
        </div>

        <button onClick={initGame} className="btn-primary w-full py-5 text-xl mt-4">
          Começar Desafio
        </button>
      </div>
    </motion.div>
  );

  const renderGame = () => (
    <div className="max-w-5xl mx-auto p-4 md:p-6 pb-32">
      {renderMusicToggle()}
      
      {/* Logo Header for Game */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <img 
            src="https://conectarecife.recife.pe.gov.br/wp-content/themes/conecta-recife/assets/img/logo-conecta-recife.png" 
            alt="Conecta Recife Logo" 
            className="h-12 md:h-16 object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.includes('themes')) {
                target.src = "https://conectarecife.recife.pe.gov.br/wp-content/uploads/2021/05/logo-conecta-recife.png";
              } else {
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }
            }}
          />
          <div className="hidden h-12 md:h-16 items-center justify-center text-[#003089] font-black text-xl italic tracking-tighter">
            CONECTA<span className="text-[#3efdae]">RECIFE</span>
          </div>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-[#003089] rounded-2xl">
              <Timer size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tempo</p>
              <p className="text-2xl font-black text-slate-800">{formatTime(timer)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tentativas</p>
            <p className="text-2xl font-black text-slate-800">{gameState.attempts}</p>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 overflow-x-auto no-scrollbar">
          {gameState.players.map((p, i) => (
            <div 
              key={p.id}
              className={`flex-1 min-w-[140px] p-4 rounded-2xl transition-all border-2 ${
                gameState.currentPlayerIndex === i 
                ? 'bg-slate-50 border-[#003089] scale-105 shadow-md' 
                : 'bg-white border-transparent opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                <p className="text-xs font-bold text-slate-500 truncate">{p.name}</p>
              </div>
              <div className="flex items-end justify-between">
                <motion.p 
                  key={p.score}
                  initial={{ scale: 1.5, color: '#00714a' }}
                  animate={{ scale: 1, color: '#1e293b' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="text-2xl font-black text-slate-800"
                >
                  {p.score}
                </motion.p>
                <div className="flex flex-col items-end">
                  {gameState.currentPlayerIndex === i && gameState.combo > 0 && (
                    <motion.span 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-[10px] font-bold text-orange-500 uppercase flex items-center gap-1"
                    >
                      Combo x{gameState.combo} 🔥
                    </motion.span>
                  )}
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Pontos</p>
                </div>
              </div>
              {gameState.currentPlayerIndex === i && (
                <motion.div 
                  layoutId="active-indicator"
                  className="mt-2 h-1 bg-[#003089] rounded-full"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <motion.div 
        animate={{ x: isShaking ? [0, -5, 5, -5, 5, 0] : 0 }}
        transition={{ duration: 0.4 }}
        className="relative grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-6"
      >
        {/* Floating Feedback Overlay */}
        <AnimatePresence>
          {gameState.feedbackText && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1.2, y: -20 }}
              exit={{ opacity: 0, scale: 1.5, y: -50 }}
              className={`absolute inset-0 z-50 flex items-center justify-center pointer-events-none`}
            >
              <div className={`px-8 py-4 rounded-full shadow-2xl font-black text-2xl md:text-4xl italic tracking-tighter border-4 flex items-center gap-3 ${
                gameState.feedbackText.type === 'match' 
                ? 'bg-[#3efdae] text-[#003089] border-white' 
                : 'bg-red-500 text-white border-white'
              }`}>
                {gameState.feedbackText.type === 'match' ? <Trophy size={32} /> : <XCircle size={32} />}
                {gameState.feedbackText.text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {gameState.cards.map((card) => {
          const Icon = ICON_MAP[card.icon] || HelpCircle;
          const isMismatch = gameState.mismatchCards.includes(card.id);
          
          return (
            <div 
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className="aspect-[3/4] md:aspect-square perspective-1000 cursor-pointer group"
            >
              <motion.div 
                initial={false}
                animate={{ 
                  rotateY: card.isFlipped || card.isMatched ? 180 : 0,
                  scale: card.isMatched ? [1, 1.15, 1] : 1,
                  x: isMismatch ? [0, -10, 10, -10, 10, 0] : 0,
                }}
                transition={{ 
                  rotateY: { duration: 0.4, ease: "easeInOut" },
                  scale: { duration: 0.4, times: [0, 0.5, 1] },
                  x: { duration: 0.5 }
                }}
                className={`relative w-full h-full transform-style-3d shadow-xl rounded-2xl md:rounded-3xl ${
                  card.isMatched ? 'ring-4 ring-[#3efdae] ring-opacity-50' : 
                  isMismatch ? 'ring-4 ring-red-400 ring-opacity-50' : ''
                }`}
              >
                {/* Back (Hidden) */}
                <div className="absolute inset-0 backface-hidden bg-[#003089] rounded-2xl md:rounded-3xl flex items-center justify-center overflow-hidden z-10 border-4 border-white/10">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:15px_15px]"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#003089] via-[#0044bb] to-[#003089] opacity-50"></div>
                  <div className="relative flex flex-col items-center gap-2">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform duration-500">
                      <span className="material-symbols-outlined text-white/40 text-5xl md:text-6xl">
                        extension
                      </span>
                    </div>
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] italic">Conecta</p>
                  </div>
                </div>

                {/* Front (Visible) */}
                <div 
                  className="absolute inset-0 backface-hidden bg-white rounded-2xl md:rounded-3xl flex flex-col items-center justify-center p-2 text-center border-4 z-20 overflow-hidden"
                  style={{ 
                    borderColor: card.isMatched ? '#3efdae' : isMismatch ? '#f87171' : '#f1f5f9',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="absolute inset-0 w-full h-full">
                    <img 
                      src={card.imageUrl} 
                      alt={card.name}
                      className={`w-full h-full object-cover transition-all duration-700 ${card.isMatched ? 'scale-110 opacity-30 grayscale' : 'scale-100 opacity-100'}`}
                      referrerPolicy="no-referrer"
                    />
                    {/* Dynamic Gradient Overlay */}
                    <div className={`absolute inset-0 transition-colors duration-500 ${
                      card.isMatched 
                      ? 'bg-gradient-to-t from-[#3efdae]/40 via-white/60 to-transparent' 
                      : 'bg-gradient-to-t from-black/60 via-black/20 to-transparent'
                    }`}></div>
                  </div>
                  
                  {/* Brand Watermark */}
                  <div className="absolute top-2 left-2 opacity-20 pointer-events-none z-10">
                    <p className="text-[8px] font-black text-white uppercase tracking-widest">Conecta Recife</p>
                  </div>

                  <div className="relative z-10 flex flex-col items-center justify-end h-full pb-3 w-full px-2">
                    <motion.div 
                      animate={card.isMatched ? { y: [0, -5, 0] } : {}}
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 shadow-2xl border-2 border-white/50 backdrop-blur-md ${
                        card.isMatched ? 'bg-[#3efdae] text-[#003089]' : 
                        isMismatch ? 'bg-red-500 text-white' : 'bg-white/90 text-[#003089]'
                      }`}
                    >
                      <Icon size={24} />
                    </motion.div>
                    <div className="w-full">
                      <p className={`text-[10px] md:text-xs font-black leading-tight uppercase tracking-tighter px-2 py-1.5 rounded-lg backdrop-blur-md shadow-sm inline-block ${
                        card.isMatched ? 'bg-[#3efdae] text-[#003089]' : 'bg-white/95 text-[#003089]'
                      }`}>
                        {card.name}
                      </p>
                    </div>
                  </div>
                  
                  {/* Match Indicator */}
                  {card.isMatched && (
                    <motion.div 
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.3 }}
                      className="absolute top-2 right-2 z-30"
                    >
                      <div className="bg-[#3efdae] rounded-full p-1 shadow-lg border-2 border-white">
                        <CheckCircle2 size={16} className="text-[#003089]" />
                      </div>
                    </motion.div>
                  )}

                  {/* Mismatch Indicator */}
                  {isMismatch && (
                    <motion.div 
                      initial={{ scale: 0, rotate: 45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                      className="absolute top-2 right-2 z-30"
                    >
                      <div className="bg-red-500 rounded-full p-1 shadow-lg border-2 border-white">
                        <XCircle size={16} className="text-white" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      {/* Educational Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50"
          >
            <div className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-[#3efdae] flex items-start gap-4">
              <div className="p-3 bg-[#3efdae]/20 text-[#00714a] rounded-2xl">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="font-black text-[#003089] text-lg mb-1">{toast.title}</h4>
                <p className="text-slate-600 leading-snug">{toast.desc}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent flex justify-center gap-4">
        <button onClick={() => setScreen('home')} className="btn-secondary px-6 py-3">
          Sair
        </button>
        <button onClick={initGame} className="btn-primary px-6 py-3">
          <RotateCcw size={20} />
          Reiniciar
        </button>
      </div>
    </div>
  );

  const renderResult = () => {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto p-6 pt-12 text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <img 
              src="https://conectarecife.recife.pe.gov.br/wp-content/themes/conecta-recife/assets/img/logo-conecta-recife.png" 
              alt="Conecta Recife Logo" 
              className="h-16 md:h-20 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes('themes')) {
                  target.src = "https://conectarecife.recife.pe.gov.br/wp-content/uploads/2021/05/logo-conecta-recife.png";
                } else {
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }
              }}
            />
            <div className="hidden h-16 md:h-20 items-center justify-center text-[#003089] font-black text-2xl italic tracking-tighter">
              CONECTA<span className="text-[#3efdae]">RECIFE</span>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-white"
          >
            <Trophy size={64} />
          </motion.div>
          <h2 className="text-4xl font-black text-[#003089] mb-2">Fim de Jogo!</h2>
          <p className="text-xl text-slate-500">Confira o ranking final da partida</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 mb-10">
          <div className="space-y-4">
            {sortedPlayers.map((p, i) => (
              <motion.div 
                key={p.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center justify-between p-6 rounded-3xl ${
                  i === 0 ? 'bg-blue-50 border-2 border-[#003089]' : 'bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black text-slate-300 w-8">{i + 1}º</span>
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    <User size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-[#003089] text-lg">{p.name}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase">{p.score} Pontos</p>
                  </div>
                </div>
                {i === 0 && <Trophy className="text-yellow-500" size={28} />}
              </motion.div>
            ))}
          </div>

          <div className="mt-10 pt-10 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tempo Total</p>
              <p className="text-2xl font-black text-[#003089]">{formatTime(timer)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Tentativas</p>
              <p className="text-2xl font-black text-[#003089]">{gameState.attempts}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button onClick={initGame} className="btn-primary py-5 text-xl">
            Jogar Novamente
          </button>
          <button onClick={() => setScreen('home')} className="btn-secondary py-5 text-xl">
            Voltar ao Início
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 select-none overflow-x-hidden">
      {/* Background Decorative Circles */}
      <div className="fixed -top-20 -right-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50 -z-10"></div>
      <div className="fixed -bottom-20 -left-20 w-80 h-80 bg-green-100 rounded-full blur-3xl opacity-50 -z-10"></div>

      <AnimatePresence mode="wait">
        {screen === 'home' && renderHome()}
        {screen === 'config' && renderConfig()}
        {screen === 'game' && renderGame()}
        {screen === 'result' && renderResult()}
      </AnimatePresence>

      {/* Custom Styles for Backface Hidden and Perspective */}
      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 { perspective: 1000px; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .transform-style-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
