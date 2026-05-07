import { useRef, useCallback, useEffect, useState } from 'react';
import {
  GAME_WIDTH, GAME_HEIGHT, BIRD_X, BIRD_WIDTH, BIRD_HEIGHT,
  PIPE_WIDTH, GROUND_HEIGHT, DIFFICULTY_SETTINGS,
  type Pipe, type GameState, type GameSettings
} from './constants';
import {
  playFlap, playScore, playHit, playDie, playSwoosh,
  startMusic, stopMusic, setMasterVolume, setSfxEnabled, setMusicEnabled,
  initAudio
} from '../sounds/SoundEngine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GameData {
  birdY: number;
  birdVelocity: number;
  birdRotation: number;
  pipes: Pipe[];
  score: number;
  bestScore: number;
  groundX: number;
  gameState: GameState;
  lastPipeSpawn: number;
  pipeIdCounter: number;
  frameCount: number;
  fps: number;
  lastFpsTime: number;
  fpsFrameCount: number;
  flashAlpha: number;
  particles: Particle[];
}

export function useGameLoop(settings: GameSettings) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameDataRef = useRef<GameData>({
    birdY: GAME_HEIGHT / 2 - 50,
    birdVelocity: 0,
    birdRotation: 0,
    pipes: [],
    score: 0,
    bestScore: parseInt(localStorage.getItem('flappyBestScore') || '0'),
    groundX: 0,
    gameState: 'menu',
    lastPipeSpawn: 0,
    pipeIdCounter: 0,
    frameCount: 0,
    fps: 60,
    lastFpsTime: Date.now(),
    fpsFrameCount: 0,
    flashAlpha: 0,
    particles: [],
  });
  const animFrameRef = useRef<number>(0);
  const settingsRef = useRef<GameSettings>(settings);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(
    parseInt(localStorage.getItem('flappyBestScore') || '0')
  );
  const [gameState, setGameState] = useState<GameState>('menu');

  useEffect(() => {
    settingsRef.current = settings;
    setMasterVolume(settings.masterVolume);
    setSfxEnabled(settings.sfxEnabled);
    setMusicEnabled(settings.musicEnabled);
  }, [settings]);

  const loadImages = useCallback(() => {
    // Using canvas-drawn graphics for single-file compatibility
    // No external images needed - all graphics are rendered procedurally
  }, []);

  const getDifficultySettings = useCallback(() => {
    return DIFFICULTY_SETTINGS[settingsRef.current.difficulty];
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (settingsRef.current.vibration && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const resetGame = useCallback(() => {
    const gd = gameDataRef.current;
    gd.birdY = GAME_HEIGHT / 2 - 50;
    gd.birdVelocity = 0;
    gd.birdRotation = 0;
    gd.pipes = [];
    gd.score = 0;
    gd.lastPipeSpawn = Date.now();
    gd.pipeIdCounter = 0;
    gd.flashAlpha = 0;
    gd.particles = [];
    setScore(0);
  }, []);

  const flap = useCallback(() => {
    initAudio();
    const gd = gameDataRef.current;
    const diff = getDifficultySettings();

    if (gd.gameState === 'menu') {
      gd.gameState = 'ready';
      setGameState('ready');
      playSwoosh();
      return;
    }

    if (gd.gameState === 'ready') {
      gd.gameState = 'playing';
      setGameState('playing');
      gd.lastPipeSpawn = Date.now();
      gd.birdVelocity = diff.flapForce;
      playFlap();
      if (settingsRef.current.musicEnabled) {
        startMusic();
      }
      vibrate(10);
      return;
    }

    if (gd.gameState === 'playing') {
      gd.birdVelocity = diff.flapForce;
      playFlap();
      vibrate(10);
      return;
    }

    if (gd.gameState === 'gameover') {
      resetGame();
      gd.gameState = 'ready';
      setGameState('ready');
      playSwoosh();
      return;
    }
  }, [getDifficultySettings, resetGame, vibrate]);

  const goToMenu = useCallback(() => {
    const gd = gameDataRef.current;
    resetGame();
    gd.gameState = 'menu';
    setGameState('menu');
    stopMusic();
    playSwoosh();
  }, [resetGame]);

  const checkCollision = useCallback((gd: GameData): boolean => {
    const birdTop = gd.birdY;
    const birdBottom = gd.birdY + BIRD_HEIGHT;
    const birdLeft = BIRD_X;
    const birdRight = BIRD_X + BIRD_WIDTH;

    // Ground collision
    if (birdBottom >= GAME_HEIGHT - GROUND_HEIGHT) return true;
    // Ceiling collision
    if (birdTop <= 0) return true;

    const diff = getDifficultySettings();

    // Pipe collision with slightly forgiving hitbox
    const margin = 4;
    for (const pipe of gd.pipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;

      if (birdRight - margin > pipeLeft && birdLeft + margin < pipeRight) {
        if (birdTop + margin < pipe.topHeight || birdBottom - margin > pipe.topHeight + diff.pipeGap) {
          return true;
        }
      }
    }

    return false;
  }, [getDifficultySettings]);

  const update = useCallback(() => {
    const gd = gameDataRef.current;
    const diff = getDifficultySettings();

    // FPS counter
    gd.fpsFrameCount++;
    const now = Date.now();
    if (now - gd.lastFpsTime >= 1000) {
      gd.fps = gd.fpsFrameCount;
      gd.fpsFrameCount = 0;
      gd.lastFpsTime = now;
    }

    // Ground scroll
    if (gd.gameState !== 'gameover') {
      gd.groundX -= diff.pipeSpeed;
      if (gd.groundX <= -24) gd.groundX = 0;
    }

    if (gd.gameState === 'menu') {
      // Bob bird up and down on menu
      gd.frameCount++;
      gd.birdY = GAME_HEIGHT / 2 - 50 + Math.sin(gd.frameCount * 0.05) * 15;
      gd.birdRotation = 0;
      return;
    }

    if (gd.gameState === 'ready') {
      gd.frameCount++;
      gd.birdY = GAME_HEIGHT / 2 - 50 + Math.sin(gd.frameCount * 0.05) * 15;
      gd.birdRotation = 0;
      return;
    }

    if (gd.gameState === 'playing') {
      // Bird physics
      gd.birdVelocity += diff.gravity;
      gd.birdY += gd.birdVelocity;

      // Bird rotation
      if (gd.birdVelocity < 0) {
        gd.birdRotation = Math.max(-30, gd.birdVelocity * 3);
      } else {
        gd.birdRotation = Math.min(90, gd.birdVelocity * 4);
      }

      // Spawn pipes
      if (now - gd.lastPipeSpawn > diff.pipeSpawnInterval) {
        const minTop = 60;
        const maxTop = GAME_HEIGHT - GROUND_HEIGHT - diff.pipeGap - 60;
        const topHeight = Math.random() * (maxTop - minTop) + minTop;
        gd.pipes.push({
          x: GAME_WIDTH + 10,
          topHeight,
          scored: false,
          id: gd.pipeIdCounter++,
        });
        gd.lastPipeSpawn = now;
      }

      // Move pipes
      gd.pipes.forEach(pipe => {
        pipe.x -= diff.pipeSpeed;

        // Score
        if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.scored = true;
          gd.score++;
          setScore(gd.score);
          playScore();
          vibrate(20);
        }
      });

      // Remove off-screen pipes
      gd.pipes = gd.pipes.filter(p => p.x > -PIPE_WIDTH - 10);

      // Check collision
      if (checkCollision(gd)) {
        gd.gameState = 'gameover';
        setGameState('gameover');
        playHit();
        vibrate([50, 30, 50]);
        gd.flashAlpha = 1;
        stopMusic();

        setTimeout(() => playDie(), 300);

        if (gd.score > gd.bestScore) {
          gd.bestScore = gd.score;
          setBestScore(gd.score);
          localStorage.setItem('flappyBestScore', gd.score.toString());
        }
      }
    }

    if (gd.gameState === 'gameover') {
      // Bird falls after death
      if (gd.birdY < GAME_HEIGHT - GROUND_HEIGHT - BIRD_HEIGHT) {
        gd.birdVelocity += diff.gravity;
        gd.birdY += gd.birdVelocity;
        gd.birdRotation = 90;
      }
      if (gd.flashAlpha > 0) {
        gd.flashAlpha -= 0.05;
      }
    }
  }, [getDifficultySettings, checkCollision, vibrate]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gd = gameDataRef.current;
    const theme = settingsRef.current.theme;

    // Clear
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT - GROUND_HEIGHT);
    if (theme === 'night') {
      grad.addColorStop(0, '#0c1445');
      grad.addColorStop(0.4, '#1a237e');
      grad.addColorStop(0.8, '#283593');
      grad.addColorStop(1, '#3949ab');
    } else {
      grad.addColorStop(0, '#4ec0ca');
      grad.addColorStop(0.4, '#62d0cf');
      grad.addColorStop(0.7, '#78d8d4');
      grad.addColorStop(1, '#87CEEB');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT - GROUND_HEIGHT);

    // Clouds
    ctx.fillStyle = theme === 'night' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)';
    const drawCloud = (cx: number, cy: number, s: number) => {
      ctx.beginPath();
      ctx.arc(cx, cy, s * 20, 0, Math.PI * 2);
      ctx.arc(cx + s * 18, cy - s * 10, s * 16, 0, Math.PI * 2);
      ctx.arc(cx + s * 35, cy - s * 3, s * 19, 0, Math.PI * 2);
      ctx.arc(cx - s * 14, cy + s * 3, s * 15, 0, Math.PI * 2);
      ctx.arc(cx + s * 10, cy + s * 5, s * 14, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCloud(70, 110, 1.3);
    drawCloud(240, 55, 1.0);
    drawCloud(360, 150, 0.8);
    drawCloud(160, 210, 0.9);

    if (theme === 'night') {
      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const stars = [[50,30],[120,80],[200,20],[300,50],[350,100],[30,150],[280,180],[180,45],[95,170],[370,30],[260,120],[15,60]];
      stars.forEach(([sx,sy]) => {
        const twinkle = 0.5 + Math.sin(gd.frameCount * 0.03 + sx) * 0.5;
        ctx.globalAlpha = twinkle * 0.8;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Moon with glow
      ctx.shadowColor = 'rgba(255,255,200,0.5)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = 'rgba(255,255,220,0.95)';
      ctx.beginPath();
      ctx.arc(320, 55, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Moon crescent
      ctx.fillStyle = '#1a237e';
      ctx.beginPath();
      ctx.arc(329, 47, 19, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant city silhouette (behind pipes)
    if (theme === 'night') {
      ctx.fillStyle = 'rgba(20,20,50,0.4)';
    } else {
      ctx.fillStyle = 'rgba(100,180,140,0.2)';
    }
    const buildings = [
      [10, 20], [30, 35], [50, 25], [70, 45], [90, 30], [110, 50], [130, 28],
      [150, 40], [170, 22], [190, 55], [210, 35], [230, 42], [250, 28], [270, 48],
      [290, 32], [310, 38], [330, 52], [350, 30], [370, 45], [390, 25],
    ];
    const skylineY = GAME_HEIGHT - GROUND_HEIGHT;
    buildings.forEach(([bx, bh]) => {
      ctx.fillRect(bx, skylineY - bh, 18, bh);
    });

    // Pipes
    const diff = getDifficultySettings();
    gd.pipes.forEach(pipe => {
      // Pipe body gradient
      const pipeGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      pipeGrad.addColorStop(0, '#4CAF20');
      pipeGrad.addColorStop(0.15, '#5CBF2A');
      pipeGrad.addColorStop(0.4, '#73D216');
      pipeGrad.addColorStop(0.6, '#73D216');
      pipeGrad.addColorStop(0.85, '#5CBF2A');
      pipeGrad.addColorStop(1, '#3d8b1a');

      // Top pipe body
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x + 2, 0, PIPE_WIDTH - 4, pipe.topHeight - 26);
      
      // Top pipe cap (lip)
      const capGrad = ctx.createLinearGradient(pipe.x - 4, 0, pipe.x + PIPE_WIDTH + 4, 0);
      capGrad.addColorStop(0, '#3d8b1a');
      capGrad.addColorStop(0.15, '#5CBF2A');
      capGrad.addColorStop(0.4, '#8AE648');
      capGrad.addColorStop(0.6, '#73D216');
      capGrad.addColorStop(0.85, '#4CAF20');
      capGrad.addColorStop(1, '#2d6b14');
      ctx.fillStyle = capGrad;
      ctx.fillRect(pipe.x - 4, pipe.topHeight - 28, PIPE_WIDTH + 8, 28);
      // Cap border
      ctx.strokeStyle = '#2d6b14';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pipe.x - 4, pipe.topHeight - 28, PIPE_WIDTH + 8, 28);
      // Cap highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(pipe.x - 2, pipe.topHeight - 26, PIPE_WIDTH + 4, 3);

      // Bottom pipe body
      const bottomY = pipe.topHeight + diff.pipeGap;
      const bottomH = GAME_HEIGHT - GROUND_HEIGHT - bottomY;
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x + 2, bottomY + 26, PIPE_WIDTH - 4, bottomH - 26);
      
      // Bottom pipe cap
      ctx.fillStyle = capGrad;
      ctx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 28);
      ctx.strokeStyle = '#2d6b14';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(pipe.x - 2, bottomY + 2, PIPE_WIDTH + 4, 3);

      // Pipe body highlights
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(pipe.x + 6, 0, 8, pipe.topHeight - 28);
      ctx.fillRect(pipe.x + 6, bottomY + 28, 8, bottomH - 28);
    });

    // Ground with scrolling pattern
    const groundY = GAME_HEIGHT - GROUND_HEIGHT;
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, GAME_HEIGHT);
    groundGrad.addColorStop(0, '#DED895');
    groundGrad.addColorStop(0.08, '#D6C878');
    groundGrad.addColorStop(0.2, '#D2B55B');
    groundGrad.addColorStop(0.6, '#C8A94E');
    groundGrad.addColorStop(1, '#B8953E');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, GAME_WIDTH, GROUND_HEIGHT);

    // Ground texture pattern
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let gx = Math.floor(gd.groundX) % 48; gx < GAME_WIDTH; gx += 48) {
      ctx.fillRect(gx, groundY + 12, 24, GROUND_HEIGHT - 12);
    }

    // Grass on top of ground
    ctx.fillStyle = '#5CBF2A';
    ctx.fillRect(0, groundY, GAME_WIDTH, 6);
    ctx.fillStyle = '#73D216';
    ctx.fillRect(0, groundY, GAME_WIDTH, 3);
    // Grass detail
    ctx.fillStyle = '#8AE648';
    for (let gx = Math.floor(gd.groundX * 2) % 12; gx < GAME_WIDTH; gx += 12) {
      ctx.fillRect(gx, groundY, 4, 2);
    }

    // Bird
    ctx.save();
    ctx.translate(BIRD_X + BIRD_WIDTH / 2, gd.birdY + BIRD_HEIGHT / 2);
    ctx.rotate((gd.birdRotation * Math.PI) / 180);

    // Bird shadow on ground
    ctx.restore();
    ctx.save();
    if (gd.birdY < groundY - 30) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.ellipse(BIRD_X + BIRD_WIDTH / 2, groundY + 2, BIRD_WIDTH / 2 * 0.7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(BIRD_X + BIRD_WIDTH / 2, gd.birdY + BIRD_HEIGHT / 2);
    ctx.rotate((gd.birdRotation * Math.PI) / 180);

    // Body with gradient
    const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, BIRD_WIDTH / 2);
    bodyGrad.addColorStop(0, '#FFE066');
    bodyGrad.addColorStop(0.6, '#F5C842');
    bodyGrad.addColorStop(1, '#E0A800');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_WIDTH / 2, BIRD_HEIGHT / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#C89200';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Belly highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-2, -4, BIRD_WIDTH / 3, BIRD_HEIGHT / 3.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Wing with animation
    const wingAngle = Math.sin(gd.frameCount * 0.35) * 0.5;
    ctx.save();
    ctx.rotate(wingAngle);
    const wingGrad = ctx.createRadialGradient(-6, 5, 1, -4, 4, 12);
    wingGrad.addColorStop(0, '#F5C842');
    wingGrad.addColorStop(1, '#D49B00');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.ellipse(-4, 5, 11, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B88400';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();

    // Eye white
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8, -5, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Pupil
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(10, -5, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Pupil highlight
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(11, -6.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak (top)
    ctx.fillStyle = '#E86C00';
    ctx.beginPath();
    ctx.moveTo(BIRD_WIDTH / 2 - 5, -3);
    ctx.lineTo(BIRD_WIDTH / 2 + 9, 0);
    ctx.lineTo(BIRD_WIDTH / 2 - 5, 2);
    ctx.closePath();
    ctx.fill();
    // Beak (bottom)
    ctx.fillStyle = '#CC5500';
    ctx.beginPath();
    ctx.moveTo(BIRD_WIDTH / 2 - 5, 2);
    ctx.lineTo(BIRD_WIDTH / 2 + 6, 3);
    ctx.lineTo(BIRD_WIDTH / 2 - 5, 6);
    ctx.closePath();
    ctx.fill();

    // Tail feathers
    ctx.fillStyle = '#E0A800';
    ctx.beginPath();
    ctx.moveTo(-BIRD_WIDTH / 2, -2);
    ctx.lineTo(-BIRD_WIDTH / 2 - 6, -6);
    ctx.lineTo(-BIRD_WIDTH / 2 - 4, 0);
    ctx.lineTo(-BIRD_WIDTH / 2 - 7, 5);
    ctx.lineTo(-BIRD_WIDTH / 2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Score during playing
    if (gd.gameState === 'playing') {
      ctx.save();
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeText(gd.score.toString(), GAME_WIDTH / 2, 70);
      ctx.fillStyle = '#fff';
      ctx.fillText(gd.score.toString(), GAME_WIDTH / 2, 70);
      ctx.restore();
    }

    // Flash effect on hit
    if (gd.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${gd.flashAlpha})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // FPS counter
    if (settingsRef.current.showFPS) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(GAME_WIDTH - 60, 5, 55, 20);
      ctx.fillStyle = '#0f0';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${gd.fps} FPS`, GAME_WIDTH - 10, 19);
    }

    gd.frameCount++;
  }, [getDifficultySettings]);

  const gameLoop = useCallback(() => {
    update();
    render();
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [update, render]);

  const startLoop = useCallback(() => {
    loadImages();
    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      stopMusic();
    };
  }, [gameLoop, loadImages]);

  return {
    canvasRef,
    gameState,
    score,
    bestScore,
    flap,
    goToMenu,
    startLoop,
    gameDataRef,
    setGameState,
  };
}
