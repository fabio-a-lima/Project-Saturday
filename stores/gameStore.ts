import { Alert } from 'react-native';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Match, Player, PlayerFundamentals, PlayerPairing, Team, TeamSize } from '../types';
import { calculatePlayerStats } from '../utils/helpers';
import { loadMatchHistory, saveMatchHistory, loadTeamDisplayNames, saveTeamDisplayNames } from '../utils/storage';

import { usePlayersStore } from './playersStore';


// --- Helper Functions ---
import { RATING_DEFAULT } from '../constants/Config';

const getDefaultFundamentals = (): PlayerFundamentals => ({
  serve: RATING_DEFAULT,
  passing: RATING_DEFAULT,
  setting: RATING_DEFAULT,
  attacking: RATING_DEFAULT,
  blocking: RATING_DEFAULT,
});

const calculateTeamFundamentals = (players: Player[]): PlayerFundamentals => {
  const teamFundamentals: PlayerFundamentals = { serve: 1, passing: 1, setting: 1, attacking: 1, blocking: 1 };
  players.forEach(player => {
    const pFunds = player.fundamentals ?? getDefaultFundamentals();
    for (const key in pFunds) {
      teamFundamentals[key as keyof PlayerFundamentals] += pFunds[key as keyof PlayerFundamentals];
    }
  });
  return teamFundamentals;
};

const calculateTotalImbalance = (teams: { players: Player[] }[]): number => {
  if (teams.length < 2) return 0;
  const teamFundamentals = teams.map(t => calculateTeamFundamentals(t.players));
  let totalDifference = 0;
  for (let i = 0; i < teamFundamentals.length; i++) {
    for (let j = i + 1; j < teamFundamentals.length; j++) {
      const fundamentalsA = teamFundamentals[i];
      const fundamentalsB = teamFundamentals[j];
      totalDifference += Math.abs(fundamentalsA.serve - fundamentalsB.serve);
      totalDifference += Math.abs(fundamentalsA.passing - fundamentalsB.passing);
      totalDifference += Math.abs(fundamentalsA.setting - fundamentalsB.setting);
      totalDifference += Math.abs(fundamentalsA.attacking - fundamentalsB.attacking);
      totalDifference += Math.abs(fundamentalsA.blocking - fundamentalsB.blocking);
    }
  }
  return totalDifference;
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// --- Zustand Store Definition ---
interface GameState {
  teamSize: TeamSize;
  teams: Team[];
  matchHistory: Match[];
  winnerIndex: number | null;
  balanceMode: 'level' | 'winrate' | 'fundamentals';
  displayedBalanceMode: 'level' | 'winrate' | 'fundamentals';
  showCourtView: boolean;
  leftoverPlayerIds: string[];
  playersWhoJustEnteredIds: Set<string>;
  playerPairings: PlayerPairing[]; // Now an array
  teamDisplayNames: [string, string];

  // Actions
  setTeamSize: (size: TeamSize) => void;
  setWinnerIndex: (index: number | null) => void;
  setBalanceMode: (mode: 'level' | 'winrate' | 'fundamentals') => void;
  setShowCourtView: (show: boolean) => void;
  setTeamDisplayName: (index: 0 | 1, name: string) => void;
  loadTeamDisplayNames: () => Promise<void>;

  addPlayerPairing: () => void;
  updatePlayerPairing: (id: string, updates: Partial<Omit<PlayerPairing, 'id'>>) => void;
  removePlayerPairing: (id: string) => void;
  // --- MODIFICATION START ---
  // Added clearPlayerPairings to the interface to satisfy TypeScript
  clearPlayerPairings: () => void;
  // --- MODIFICATION END ---
  addMatch: (match: Match) => void;

  deleteAllMatches: () => void;
  loadMatchHistory: () => Promise<void>;
  drawTeams: (sessionPlayers: Player[]) => void;
  endMatchAndSubstitute: (scores: [number, number]) => void;
  deleteMatch: (matchId: string) => void;
  deleteMatchesByDate: (dateTitle: string) => void;
}

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    teamSize: 6,
    teams: [],
    matchHistory: [],
    winnerIndex: null,
    balanceMode: 'fundamentals',
    displayedBalanceMode: 'fundamentals',
    showCourtView: true,
    leftoverPlayerIds: [],
    playersWhoJustEnteredIds: new Set(),
    playerPairings: [], // Initialize as an empty array
    teamDisplayNames: ['Time 1', 'Time 2'],

    setTeamSize: (size) => set({ teamSize: size }),
    setWinnerIndex: (index) => set({ winnerIndex: index }),
    setBalanceMode: (mode) => set({ balanceMode: mode }),
    setShowCourtView: (show) => set({ showCourtView: show }),
    
    // Team name actions
    setTeamDisplayName: (index, name) => {
      set((state) => {
        const next: [string, string] = [...state.teamDisplayNames] as [string, string];
        // Allow empty string while editing; UI will fallback when rendering
        next[index] = name;
        // persist
        saveTeamDisplayNames(next);
        return { teamDisplayNames: next };
      });
    },
    loadTeamDisplayNames: async () => {
      const names = await loadTeamDisplayNames();
      set({ teamDisplayNames: names });
    },

    // New actions for managing pairing rules
    addPlayerPairing: () => set(state => ({
        playerPairings: [
            ...state.playerPairings,
            { id: new Date().toISOString() + Math.random(), player1Id: null, player2Id: null, type: 'together' }
        ]
    })),
    updatePlayerPairing: (id, updates) => set(state => ({
        playerPairings: state.playerPairings.map(p => p.id === id ? { ...p, ...updates } : p)
    })),
    removePlayerPairing: (id) => set(state => ({
        playerPairings: state.playerPairings.filter(p => p.id !== id)
    })),
    // --- MODIFICATION START ---
    // Implemented the function to clear the player pairings array
    clearPlayerPairings: () => set({ playerPairings: [] }),
    // --- MODIFICATION END ---

    addMatch: (match) => set((state) => ({ matchHistory: [match, ...state.matchHistory] })),
    deleteAllMatches: () => set({ matchHistory: [] }),

    loadMatchHistory: async () => {
      const history = await loadMatchHistory();
      set({ matchHistory: history });
    },

    deleteMatch: (matchId) => set((state) => ({
      matchHistory: state.matchHistory.filter(m => m.id !== matchId)
    })),

    deleteMatchesByDate: (dateTitle) => set((state) => ({
      matchHistory: state.matchHistory.filter(match => {
        const matchDate = new Date(match.date).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: '2-digit',
        });
        return matchDate !== dateTitle;
      })
    })),

    drawTeams: (sessionPlayers) => {
      const { teamSize, balanceMode, matchHistory, playerPairings } = get();

      // --- MODIFICATION START ---
      // Determine the effective balance mode. If there are pairing rules, we MUST use fundamentals.
      const validPairings = playerPairings.filter(p => p.player1Id && p.player2Id);
      const effectiveBalanceMode = validPairings.length > 0 ? 'fundamentals' : balanceMode;
      // --- MODIFICATION END ---
      
      const activePlayers = sessionPlayers.filter(p => p.active);

      if (activePlayers.length < 2) {
        set({ teams: [], leftoverPlayerIds: sessionPlayers.map(p => p.id) });
        return;
      }
      
      const numPlayersToDraw = Math.floor(activePlayers.length / teamSize) * teamSize;
      const playersForTeams = shuffleArray(activePlayers).slice(0, numPlayersToDraw);
      const drawnPlayerIds = new Set(playersForTeams.map(p => p.id));
      const leftoverPlayers = sessionPlayers.filter(p => !drawnPlayerIds.has(p.id));
      const numTeams = Math.floor(playersForTeams.length / teamSize);

      if (numTeams < 2) {
        set({ teams: [], leftoverPlayerIds: sessionPlayers.map(p => p.id) });
        return;
      }

      let finalTeams: Team[] = [];

      // --- MODIFICATION START ---
      // The logic is now primarily based on the effectiveBalanceMode
      if (effectiveBalanceMode === 'level' || effectiveBalanceMode === 'winrate') {
      // --- MODIFICATION END ---
        let sortedPlayers;
        if (effectiveBalanceMode === 'winrate') {
          sortedPlayers = [...playersForTeams].sort((a, b) => (calculatePlayerStats(b.id, matchHistory).winRate ?? 50) - (calculatePlayerStats(a.id, matchHistory).winRate ?? 50));
        } else {
          sortedPlayers = [...playersForTeams].sort((a, b) => b.weight - a.weight);
        }
        
        const teams: Player[][] = Array.from({ length: numTeams }, () => []);
        for (let i = 0; i < sortedPlayers.length; i++) {
          const teamIndex = i % numTeams;
          const isEvenRow = Math.floor(i / numTeams) % 2 === 0;
          const targetTeam = isEvenRow ? teams[teamIndex] : teams[numTeams - 1 - teamIndex];
          targetTeam.push(sortedPlayers[i]);
        }
        
        finalTeams = teams.map(teamPlayers => {
          const total = teamPlayers.reduce((sum, p) => sum + (effectiveBalanceMode === 'winrate' ? (calculatePlayerStats(p.id, matchHistory).winRate ?? 50) : p.weight), 0);
          return { players: teamPlayers, total, fundamentals: calculateTeamFundamentals(teamPlayers) };
        });
      } else { // This is the 'fundamentals' mode, which now handles all pairing logic
        // 1. Create a random initial combination
        let bestCombination: Player[][] = Array.from({ length: numTeams }, () => []);
        playersForTeams.forEach((player, i) => {
          bestCombination[i % numTeams].push(player);
        });

        // --- MODIFICATION START ---
        // 2. Pre-process the combination to satisfy all pairing rules BEFORE balancing
        if (validPairings.length > 0) {
            const maxCorrectionAttempts = 50; // Avoid infinite loops
            for (let attempt = 0; attempt < maxCorrectionAttempts; attempt++) {
                let violations = 0;
                // Fix 'together' violations
                for (const pairing of validPairings.filter(p => p.type === 'together')) {
                    const teamOfP1 = bestCombination.findIndex(team => team.some(p => p.id === pairing.player1Id));
                    const teamOfP2 = bestCombination.findIndex(team => team.some(p => p.id === pairing.player2Id));
                    if (teamOfP1 !== -1 && teamOfP2 !== -1 && teamOfP1 !== teamOfP2) {
                        violations++;
                        // Move player 2 to player 1's team by swapping with a random player
                        const playerToMove = bestCombination[teamOfP2].find(p => p.id === pairing.player2Id)!;
                        const playerToSwapIndex = Math.floor(Math.random() * bestCombination[teamOfP1].length);
                        const playerToSwap = bestCombination[teamOfP1][playerToSwapIndex];
                        
                        bestCombination[teamOfP1][playerToSwapIndex] = playerToMove;
                        const p2Index = bestCombination[teamOfP2].findIndex(p => p.id === pairing.player2Id);
                        bestCombination[teamOfP2][p2Index] = playerToSwap;
                    }
                }
                // Fix 'apart' violations
                for (const pairing of validPairings.filter(p => p.type === 'apart')) {
                    const teamIndex = bestCombination.findIndex(team => team.some(p => p.id === pairing.player1Id) && team.some(p => p.id === pairing.player2Id));
                    if (teamIndex !== -1) {
                        violations++;
                        // Move player 2 to a different team by swapping with a random player
                        const playerToMove = bestCombination[teamIndex].find(p => p.id === pairing.player2Id)!;
                        let otherTeamIndex = (teamIndex + 1 + Math.floor(Math.random() * (numTeams - 1))) % numTeams;
                        
                        const playerToSwapIndex = Math.floor(Math.random() * bestCombination[otherTeamIndex].length);
                        const playerToSwap = bestCombination[otherTeamIndex][playerToSwapIndex];
                        
                        bestCombination[otherTeamIndex][playerToSwapIndex] = playerToMove;
                        const p2Index = bestCombination[teamIndex].findIndex(p => p.id === pairing.player2Id);
                        bestCombination[teamIndex][p2Index] = playerToSwap;
                    }
                }
                if (violations === 0) break; // Exit if all rules are satisfied
            }
        }
        // --- MODIFICATION END ---

        let bestImbalance = calculateTotalImbalance(bestCombination.map(p => ({ players: p })));

        // 3. Now run the optimization loop on the VALIDATED combination
        const maxIterations = 3000;
        for (let i = 0; i < maxIterations; i++) {
          if (bestImbalance === 0) break;

          const team1Index = Math.floor(Math.random() * numTeams);
          let team2Index = Math.floor(Math.random() * numTeams);
          while (team1Index === team2Index) {
            team2Index = Math.floor(Math.random() * numTeams);
          }

          const player1Index = Math.floor(Math.random() * bestCombination[team1Index].length);
          const player2Index = Math.floor(Math.random() * bestCombination[team2Index].length);

          const tempCombination: Player[][] = bestCombination.map(team => [...team]);
          [tempCombination[team1Index][player1Index], tempCombination[team2Index][player2Index]] = 
          [tempCombination[team2Index][player2Index], tempCombination[team1Index][player1Index]];

          // Check all pairing constraints
          let isValidSwap = true;
          for (const pairing of validPairings) {
              const { player1Id, player2Id, type } = pairing;
              const teamOfP1 = tempCombination.findIndex(team => team.some(p => p.id === player1Id));
              const teamOfP2 = tempCombination.findIndex(team => team.some(p => p.id === player2Id));
              if (teamOfP1 !== -1 && teamOfP2 !== -1) {
                  if ((type === 'together' && teamOfP1 !== teamOfP2) || (type === 'apart' && teamOfP1 === teamOfP2)) {
                      isValidSwap = false;
                      break;
                  }
              }
          }

          if(isValidSwap){
            const newImbalance = calculateTotalImbalance(tempCombination.map(p => ({ players: p })));
            if (newImbalance < bestImbalance) {
                bestImbalance = newImbalance;
                bestCombination = tempCombination;
            }
          }
        }
        
        finalTeams = bestCombination.map(teamPlayers => {
          const fundamentals = calculateTeamFundamentals(teamPlayers);
          const total = Object.values(fundamentals).reduce((sum, val) => sum + val, 0);
          return { players: teamPlayers, total, fundamentals };
        });
      }

      set({
        teams: finalTeams,
        winnerIndex: null,
        displayedBalanceMode: effectiveBalanceMode, // Display the mode that was actually used
        leftoverPlayerIds: leftoverPlayers.map(p => p.id),
      });
    },

    endMatchAndSubstitute: (scores) => {
        const { teams, winnerIndex, leftoverPlayerIds, playersWhoJustEnteredIds, addMatch } = get();
        const { substitutePlayers } = usePlayersStore.getState();
  
        if (winnerIndex === null) return;
  
        addMatch({
          id: new Date().toISOString(),
          date: new Date().toISOString(),
          teams: teams,
          winnerTeamIndex: winnerIndex,
          scores: scores,
          teamNames: get().teamDisplayNames,
        });
  
        const playersToEnterIds = leftoverPlayerIds;
        if (playersToEnterIds.length === 0) {
          set({ teams: [], winnerIndex: null, playersWhoJustEnteredIds: new Set() });
          return;
        }
  
        const losingTeam = teams[winnerIndex === 0 ? 1 : 0];
        const eligibleToLeaveIds = losingTeam.players
          .map(p => p.id)
          .filter(id => !playersWhoJustEnteredIds.has(id));
  
        if (eligibleToLeaveIds.length < playersToEnterIds.length) {
          Alert.alert("Não é possível substituir", "O time perdedor não tem jogadores suficientes que possam sair.");
          set({ teams: [], winnerIndex: null, playersWhoJustEnteredIds: new Set() });
          return;
        }
        
        const playersToLeaveIds = shuffleArray(eligibleToLeaveIds).slice(0, playersToEnterIds.length);
  
        substitutePlayers(playersToLeaveIds, playersToEnterIds);
  
        set({
          leftoverPlayerIds: playersToLeaveIds,
          playersWhoJustEnteredIds: new Set(playersToEnterIds),
          teams: [],
          winnerIndex: null,
        });
    },
  }))
);

useGameStore.subscribe(
  (state) => state.matchHistory,
  (matchHistory) => {
    if (!usePlayersStore.getState().isLoading) {
      saveMatchHistory(matchHistory);
    }
  }
);