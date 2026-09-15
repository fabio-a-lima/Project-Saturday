import AsyncStorage from '@react-native-async-storage/async-storage';
import { Match, Player } from '../types';

const PLAYERS_STORAGE_KEY = '@VolleyballDraw:players';
const THEME_STORAGE_KEY = '@VolleyballDraw:theme';
const SELECTED_IDS_STORAGE_KEY = '@VolleyballDraw:selectedIds';
const HISTORY_STORAGE_KEY = '@VolleyballDraw:history';
const TEAM_NAMES_STORAGE_KEY = '@VolleyballDraw:teamNames';

// --- Funções de Jogadores ---
export async function savePlayers(players: Player[]): Promise<void> {
  try {
    console.log("--- SALVANDO JOGADORES ---", players.length, "jogadores"); // DEBUG
    const jsonValue = JSON.stringify(players);
    await AsyncStorage.setItem(PLAYERS_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error("Erro ao salvar jogadores", e);
  }
}

// --- Funções de Nomes dos Times ---
export async function saveTeamDisplayNames(teamNames: [string, string]): Promise<void> {
  try {
    const jsonValue = JSON.stringify(teamNames);
    await AsyncStorage.setItem(TEAM_NAMES_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Erro ao salvar nomes dos times', e);
  }
}

export async function loadTeamDisplayNames(): Promise<[string, string]> {
  try {
    const jsonValue = await AsyncStorage.getItem(TEAM_NAMES_STORAGE_KEY);
    if (jsonValue) {
      const arr = JSON.parse(jsonValue);
      if (Array.isArray(arr) && arr.length === 2) return [String(arr[0]), String(arr[1])];
    }
  } catch (e) {
    console.error('Erro ao carregar nomes dos times', e);
  }
  return ['Time 1', 'Time 2'];
}

const MIGRATION_KEY = '@VolleyballDraw:migratedV2';

export async function loadPlayers(): Promise<Player[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(PLAYERS_STORAGE_KEY);
    let players = jsonValue != null ? JSON.parse(jsonValue) : [];
    
    // Migration check
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (!migrated && players.length > 0) {
      players = players.map((p: any) => {
        if (p.fundamentals) {
          return {
            ...p,
            fundamentals: {
              serve: Math.min(10, p.fundamentals.serve * 2),
              passing: Math.min(10, p.fundamentals.passing * 2),
              setting: Math.min(10, p.fundamentals.setting * 2),
              attacking: Math.min(10, p.fundamentals.attacking * 2),
              blocking: Math.min(10, p.fundamentals.blocking * 2),
            }
          };
        }
        return p;
      });
      // Save migrated players
      await savePlayers(players);
    }
    
    console.log("--- CARREGANDO JOGADORES ---", players.length, "jogadores encontrados"); // DEBUG
    return players;
  } catch (e) {
    console.error("Erro ao carregar jogadores", e);
    return [];
  }
}

// --- Funções do Tema ---
export async function saveTheme(isDark: boolean): Promise<void> {
  try {
    const themeValue = isDark ? 'dark' : 'light';
    console.log("--- SALVANDO TEMA ---", themeValue); // DEBUG
    await AsyncStorage.setItem(THEME_STORAGE_KEY, themeValue);
  } catch (e) {
    console.error("Erro ao salvar o tema", e);
  }
}

export async function loadTheme(): Promise<boolean> {
  try {
    const themeValue = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    console.log("--- CARREGANDO TEMA --- Valor encontrado:", themeValue); // DEBUG
    if (themeValue === null) {
      return true; 
    }
    return themeValue === 'dark';
  } catch (e) {
    console.error("Erro ao carregar o tema", e);
    return true;
  }
}

// --- Funções de Seleção ---
export async function saveSelectedPlayerIds(idSet: Set<string>): Promise<void> {
  try {
    const idArray = Array.from(idSet);
    console.log("--- SALVANDO SELEÇÃO ---", idArray.length, "jogadores selecionados"); // DEBUG
    const jsonValue = JSON.stringify(idArray);
    await AsyncStorage.setItem(SELECTED_IDS_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error("Erro ao salvar os IDs dos jogadores selecionados", e);
  }
}

export async function loadSelectedPlayerIds(): Promise<Set<string>> {
  try {
    const jsonValue = await AsyncStorage.getItem(SELECTED_IDS_STORAGE_KEY);
    const idArray = jsonValue != null ? JSON.parse(jsonValue) : [];
    console.log("--- CARREGANDO SELEÇÃO ---", idArray.length, "jogadores encontrados"); // DEBUG
    return new Set(idArray);
  } catch (e) {
    console.error("Erro ao carregar os IDs dos jogadores selecionados", e);
    return new Set();
  }
}

// --- Funções do Histórico ---
export async function saveMatchHistory(history: Match[]): Promise<void> {
  try {
    const jsonValue = JSON.stringify(history);
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error("Erro ao salvar o histórico de partidas", e);
  }
}

export async function loadMatchHistory(): Promise<Match[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    let matches = jsonValue != null ? JSON.parse(jsonValue) : [];
    
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (!migrated) {
      matches = matches.map((m: any) => {
        return {
          ...m,
          teams: m.teams.map((t: any) => ({
            ...t,
            players: t.players.map((p: any) => {
              if (p.fundamentals) {
                return {
                  ...p,
                  fundamentals: {
                    serve: Math.min(10, p.fundamentals.serve * 2),
                    passing: Math.min(10, p.fundamentals.passing * 2),
                    setting: Math.min(10, p.fundamentals.setting * 2),
                    attacking: Math.min(10, p.fundamentals.attacking * 2),
                    blocking: Math.min(10, p.fundamentals.blocking * 2),
                  }
                };
              }
              return p;
            }),
            fundamentals: t.fundamentals ? {
              serve: Math.min(100, t.fundamentals.serve * 2),
              passing: Math.min(100, t.fundamentals.passing * 2),
              setting: Math.min(100, t.fundamentals.setting * 2),
              attacking: Math.min(100, t.fundamentals.attacking * 2),
              blocking: Math.min(100, t.fundamentals.blocking * 2),
            } : undefined
          }))
        };
      });
      if (matches.length > 0) {
        await saveMatchHistory(matches);
      }
      // Set migrated flag after both migrations are done
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    }
    
    return matches;
  } catch (e) {
    console.error("Erro ao carregar o histórico de partidas", e);
    return [];
  }
}