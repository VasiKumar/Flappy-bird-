export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

export const BIRD_WIDTH = 40;
export const BIRD_HEIGHT = 30;
export const BIRD_X = 80;

export const PIPE_WIDTH = 60;
export const PIPE_GAP = 160;
export const PIPE_SPEED = 2.5;
export const PIPE_SPAWN_INTERVAL = 1800;

export const GRAVITY = 0.4;
export const FLAP_FORCE = -7;

export const GROUND_HEIGHT = 80;

export const DIFFICULTY_SETTINGS = {
  easy: {
    gravity: 0.3,
    flapForce: -6.5,
    pipeSpeed: 2,
    pipeGap: 180,
    pipeSpawnInterval: 2200,
    label: 'Easy',
  },
  normal: {
    gravity: 0.4,
    flapForce: -7,
    pipeSpeed: 2.5,
    pipeGap: 155,
    pipeSpawnInterval: 1800,
    label: 'Normal',
  },
  hard: {
    gravity: 0.5,
    flapForce: -7.5,
    pipeSpeed: 3.2,
    pipeGap: 130,
    pipeSpawnInterval: 1400,
    label: 'Hard',
  },
  insane: {
    gravity: 0.55,
    flapForce: -8,
    pipeSpeed: 4,
    pipeGap: 115,
    pipeSpawnInterval: 1200,
    label: 'Insane',
  },
};

export type Difficulty = keyof typeof DIFFICULTY_SETTINGS;
export type GameState = 'menu' | 'ready' | 'playing' | 'gameover' | 'settings';

export interface Pipe {
  x: number;
  topHeight: number;
  scored: boolean;
  id: number;
}

export interface GameSettings {
  difficulty: Difficulty;
  theme: 'day' | 'night';
  sfxEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number;
  showFPS: boolean;
  vibration: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'normal',
  theme: 'day',
  sfxEnabled: true,
  musicEnabled: true,
  masterVolume: 0.5,
  showFPS: false,
  vibration: true,
};
