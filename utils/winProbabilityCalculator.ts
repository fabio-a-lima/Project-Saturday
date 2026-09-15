// utils/winProbabilityCalculator.ts

import { Team, Player, Match } from '../types';
import { RATING_MAX } from '../constants/Config';
import { calculatePlayerStats } from './helpers';

interface TeamStats {
  averageLevel: number;
  averageWinRate: number;
  totalFundamentals: number;
  playerCount: number;
}

/**
 * Calculate comprehensive team statistics
 */
export const calculateTeamStats = (team: Team, matchHistory: Match[]): TeamStats => {
  const players = team.players;
  
  // Calculate average level (weight)
  const averageLevel = players.reduce((sum, player) => sum + player.weight, 0) / players.length;
  
  // Calculate average win rate
  const totalWinRate = players.reduce((sum, player) => {
    const stats = calculatePlayerStats(player.id, matchHistory);
    return sum + (stats.winRate ?? 50); // Default to 50% if no history
  }, 0);
  const averageWinRate = totalWinRate / players.length;
  
  // Calculate total fundamentals score
  const totalFundamentals = team.fundamentals ? 
    Object.values(team.fundamentals).reduce((sum, val) => sum + val, 0) : 
    team.total; // Fallback to team.total if fundamentals not available
  
  return {
    averageLevel,
    averageWinRate,
    totalFundamentals,
    playerCount: players.length
  };
};

/**
 * Calculate win probability between two teams using multiple factors
 */
export const calculateWinProbability = (
  team1: Team, 
  team2: Team, 
  matchHistory: Match[],
  balanceMode: 'level' | 'winrate' | 'fundamentals'
): { team1WinProb: number; team2WinProb: number } => {
  
  if (!team1.players.length || !team2.players.length) {
    return { team1WinProb: 50, team2WinProb: 50 };
  }

  const stats1 = calculateTeamStats(team1, matchHistory);
  const stats2 = calculateTeamStats(team2, matchHistory);

  // Weight factors based on balance mode
  let levelWeight = 0.3;
  let winRateWeight = 0.3;
  let fundamentalsWeight = 0.4;

  switch (balanceMode) {
    case 'level':
      levelWeight = 0.6;
      winRateWeight = 0.2;
      fundamentalsWeight = 0.2;
      break;
    case 'winrate':
      levelWeight = 0.2;
      winRateWeight = 0.6;
      fundamentalsWeight = 0.2;
      break;
    case 'fundamentals':
      levelWeight = 0.2;
      winRateWeight = 0.2;
      fundamentalsWeight = 0.6;
      break;
  }

  // Calculate advantage scores (-1 to 1, where positive favors team1)
  const levelAdvantage = calculateAdvantage(stats1.averageLevel, stats2.averageLevel, 10); // Max expected difference of 10 levels
  const winRateAdvantage = calculateAdvantage(stats1.averageWinRate, stats2.averageWinRate, 100); // Max difference of 100%
  const maxPlayerCount = Math.max(stats1.playerCount, stats2.playerCount);
  const fundamentalsAdvantage = calculateAdvantage(stats1.totalFundamentals, stats2.totalFundamentals, maxPlayerCount * (RATING_MAX * 5)); // Max expected difference

  // Combine advantages with weights
  const totalAdvantage = 
    (levelAdvantage * levelWeight) +
    (winRateAdvantage * winRateWeight) +
    (fundamentalsAdvantage * fundamentalsWeight);

  // Convert advantage to probability using sigmoid function
  // This ensures probabilities stay between reasonable bounds (roughly 15% to 85%)
  const team1WinProb = Math.max(15, Math.min(85, 50 + (totalAdvantage * 35)));
  const team2WinProb = 100 - team1WinProb;

  return {
    team1WinProb: Math.round(team1WinProb * 10) / 10, // Round to 1 decimal
    team2WinProb: Math.round(team2WinProb * 10) / 10
  };
};

/**
 * Calculate advantage between two values, normalized to -1 to 1 range
 */
const calculateAdvantage = (value1: number, value2: number, maxExpectedDifference: number): number => {
  const difference = value1 - value2;
  const normalizedDifference = difference / maxExpectedDifference;
  
  // Apply sigmoid-like function to prevent extreme advantages
  return Math.tanh(normalizedDifference);
};

/**
 * Get a descriptive text for win probability
 */
export const getWinProbabilityDescription = (probability: number): string => {
  if (probability >= 70) return 'Forte favorito';
  if (probability >= 60) return 'Favorito';
  if (probability >= 55) return 'Leve favorito';
  if (probability >= 45) return 'Equilibrado';
  if (probability >= 40) return 'Leve desvantagem';
  if (probability >= 30) return 'Desvantagem';
  return 'Grande desvantagem';
};