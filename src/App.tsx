import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameLoop } from './game/useGameLoop';
import {
  GAME_WIDTH, GAME_HEIGHT, DIFFICULTY_SETTINGS,
  type Difficulty, type GameSettings, DEFAULT_SETTINGS,
} from './game/constants';
import { playButtonClick, initAudio } from './sounds/SoundEngine';

function App() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('flappySettings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const { canvasRef, gameState, score, bestScore, flap, goToMenu, startLoop } = useGameLoop(settings);

  // Save settings
  useEffect(() => {
    localStorage.setItem('flappySettings', JSON.stringify(settings));
  }, [settings]);

  // Start game loop
  useEffect(() => {
    const cleanup = startLoop();
    return cleanup;
  }, [startLoop]);

  // Responsive scaling
  useEffect(() => {
    const handleResize = () => {
      const maxW = window.innerWidth;
      const maxH = window.innerHeight;
      const scaleX = maxW / GAME_WIDTH;
      const scaleY = maxH / GAME_HEIGHT;
      setScale(Math.min(scaleX, scaleY, 1.5));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!showSettings) flap();
      }
      if (e.code === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
          playButtonClick();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flap, showSettings]);

  const handleCanvasClick = useCallback(() => {
    if (!showSettings) {
      initAudio();
      flap();
    }
  }, [flap, showSettings]);

  // Prevent default touch behavior for the game area
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!showSettings) {
      initAudio();
      flap();
    }
  }, [flap, showSettings]);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    playButtonClick();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center overflow-hidden select-none"
      style={{ touchAction: 'none' }}>
      <div
        ref={containerRef}
        className="relative"
        style={{
          width: GAME_WIDTH * scale,
          height: GAME_HEIGHT * scale,
        }}
      >
        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          className="rounded-2xl shadow-2xl cursor-pointer"
          style={{
            width: GAME_WIDTH * scale,
            height: GAME_HEIGHT * scale,
            imageRendering: 'auto',
          }}
        />

        {/* UI Overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            width: GAME_WIDTH * scale,
            height: GAME_HEIGHT * scale,
          }}
        >
          {/* Menu Screen */}
          {gameState === 'menu' && !showSettings && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
              <div className="text-center" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                <h1
                  className="font-extrabold mb-2 drop-shadow-lg"
                  style={{
                    fontSize: '52px',
                    color: '#fff',
                    textShadow: '3px 3px 0 #e86c00, 6px 6px 0 rgba(0,0,0,0.3)',
                    letterSpacing: '2px',
                  }}
                >
                  Flappy Bird
                </h1>
                <p className="text-white/80 text-lg mb-8 font-medium">Tap or Press Space to Start</p>

                <div className="flex flex-col gap-3 items-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); flap(); }}
                    className="px-8 py-3 bg-gradient-to-b from-green-400 to-green-600 text-white font-bold text-xl rounded-xl shadow-lg hover:from-green-300 hover:to-green-500 active:scale-95 transition-all border-2 border-green-700 min-w-[200px]"
                  >
                    ▶ Play
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(true);
                      playButtonClick();
                    }}
                    className="px-8 py-3 bg-gradient-to-b from-blue-400 to-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:from-blue-300 hover:to-blue-500 active:scale-95 transition-all border-2 border-blue-700 min-w-[200px]"
                  >
                    ⚙ Settings
                  </button>
                </div>

                {bestScore > 0 && (
                  <div className="mt-6 bg-black/40 rounded-xl px-6 py-3 backdrop-blur-sm">
                    <p className="text-yellow-300 font-bold text-lg">🏆 Best: {bestScore}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ready Screen */}
          {gameState === 'ready' && !showSettings && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }} className="text-center">
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-8 py-6">
                  <p className="text-white text-2xl font-bold mb-3">Get Ready!</p>
                  <div className="text-5xl mb-3 animate-bounce">👆</div>
                  <p className="text-white/80 text-base">Tap to flap</p>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {gameState === 'gameover' && !showSettings && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto">
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }} className="text-center">
                <div className="bg-black/60 backdrop-blur-md rounded-2xl px-8 py-6 border border-white/20 shadow-2xl">
                  <h2 className="text-white text-3xl font-extrabold mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    Game Over
                  </h2>

                  <div className="bg-amber-100/90 rounded-xl p-4 mb-4 min-w-[240px]">
                    <div className="flex items-center gap-4">
                      {/* Medal */}
                      <div className="flex-shrink-0">
                        {score >= 40 ? (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-300 to-purple-600 flex items-center justify-center text-2xl shadow-lg border-2 border-purple-400">💎</div>
                        ) : score >= 20 ? (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-500 flex items-center justify-center text-2xl shadow-lg border-2 border-yellow-400">🥇</div>
                        ) : score >= 10 ? (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-2xl shadow-lg border-2 border-gray-300">🥈</div>
                        ) : score >= 5 ? (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-2xl shadow-lg border-2 border-amber-600">🥉</div>
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center text-xl shadow-lg border-2 border-gray-200">💀</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-amber-800 font-bold text-sm">Score</span>
                          <span className="text-amber-900 font-extrabold text-2xl">{score}</span>
                        </div>
                        <div className="w-full h-px bg-amber-300 my-1"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-amber-800 font-bold text-sm">Best</span>
                          <span className="text-amber-900 font-extrabold text-2xl">{bestScore}</span>
                        </div>
                      </div>
                    </div>
                    {score === bestScore && score > 0 && (
                      <div className="mt-2 text-center animate-pulse">
                        <span className="text-sm font-bold text-orange-600">🎉 New High Score! 🎉</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); flap(); }}
                      className="px-6 py-3 bg-gradient-to-b from-green-400 to-green-600 text-white font-bold text-lg rounded-xl shadow-lg hover:from-green-300 hover:to-green-500 active:scale-95 transition-all border-2 border-green-700"
                    >
                      ↻ Retry
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); goToMenu(); }}
                      className="px-6 py-2.5 bg-gradient-to-b from-gray-400 to-gray-600 text-white font-bold text-base rounded-xl shadow-lg hover:from-gray-300 hover:to-gray-500 active:scale-95 transition-all border-2 border-gray-700"
                    >
                      🏠 Menu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Score display during gameplay - top area */}
          {gameState === 'playing' && !showSettings && (
            <div className="absolute top-2 right-3 pointer-events-none" style={{ transform: `scale(${scale})`, transformOrigin: 'top right' }}>
              <div className="text-xs text-white/50 font-medium text-right">
                {settings.difficulty !== 'normal' && (
                  <span className="bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
                    {DIFFICULTY_SETTINGS[settings.difficulty].label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/50 backdrop-blur-sm rounded-2xl">
              <div
                style={{ transform: `scale(${Math.min(scale, 1)})`, transformOrigin: 'center' }}
                className="bg-gradient-to-b from-sky-100 to-sky-200 rounded-2xl p-5 w-[360px] max-h-[650px] overflow-y-auto shadow-2xl border-2 border-sky-300"
              >
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-2xl font-extrabold text-sky-800">⚙ Settings</h2>
                  <button
                    onClick={() => { setShowSettings(false); playButtonClick(); }}
                    className="w-9 h-9 bg-red-500 hover:bg-red-400 text-white rounded-full font-bold text-lg flex items-center justify-center active:scale-95 transition-all shadow-md"
                  >
                    ✕
                  </button>
                </div>

                {/* Difficulty */}
                <div className="mb-4">
                  <label className="text-sky-800 font-bold text-sm mb-2 block">Difficulty</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map(d => (
                      <button
                        key={d}
                        onClick={() => updateSetting('difficulty', d)}
                        className={`py-2 px-3 rounded-lg font-bold text-sm transition-all active:scale-95 ${
                          settings.difficulty === d
                            ? 'bg-sky-500 text-white shadow-md scale-105'
                            : 'bg-white/70 text-sky-700 hover:bg-white'
                        }`}
                      >
                        {DIFFICULTY_SETTINGS[d].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme */}
                <div className="mb-4">
                  <label className="text-sky-800 font-bold text-sm mb-2 block">Theme</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateSetting('theme', 'day')}
                      className={`py-2 px-3 rounded-lg font-bold text-sm transition-all active:scale-95 ${
                        settings.theme === 'day'
                          ? 'bg-amber-400 text-white shadow-md scale-105'
                          : 'bg-white/70 text-sky-700 hover:bg-white'
                      }`}
                    >
                      ☀️ Day
                    </button>
                    <button
                      onClick={() => updateSetting('theme', 'night')}
                      className={`py-2 px-3 rounded-lg font-bold text-sm transition-all active:scale-95 ${
                        settings.theme === 'night'
                          ? 'bg-indigo-600 text-white shadow-md scale-105'
                          : 'bg-white/70 text-sky-700 hover:bg-white'
                      }`}
                    >
                      🌙 Night
                    </button>
                  </div>
                </div>

                {/* Master Volume */}
                <div className="mb-4">
                  <label className="text-sky-800 font-bold text-sm mb-2 block">
                    🔊 Volume: {Math.round(settings.masterVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(settings.masterVolume * 100)}
                    onChange={(e) => updateSetting('masterVolume', parseInt(e.target.value) / 100)}
                    className="w-full h-2 bg-sky-300 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                {/* Toggle switches */}
                <div className="space-y-3 mb-4">
                  <ToggleSwitch
                    label="🎵 Music"
                    checked={settings.musicEnabled}
                    onChange={(v) => updateSetting('musicEnabled', v)}
                  />
                  <ToggleSwitch
                    label="🔈 Sound Effects"
                    checked={settings.sfxEnabled}
                    onChange={(v) => updateSetting('sfxEnabled', v)}
                  />
                  <ToggleSwitch
                    label="📳 Vibration"
                    checked={settings.vibration}
                    onChange={(v) => updateSetting('vibration', v)}
                  />
                  <ToggleSwitch
                    label="📊 Show FPS"
                    checked={settings.showFPS}
                    onChange={(v) => updateSetting('showFPS', v)}
                  />
                </div>

                {/* Difficulty Info */}
                <div className="bg-white/50 rounded-xl p-3 mb-4">
                  <p className="text-sky-800 font-bold text-xs mb-1">
                    Current: {DIFFICULTY_SETTINGS[settings.difficulty].label}
                  </p>
                  <p className="text-sky-600 text-xs">
                    Gap: {DIFFICULTY_SETTINGS[settings.difficulty].pipeGap}px •
                    Speed: {DIFFICULTY_SETTINGS[settings.difficulty].pipeSpeed} •
                    Gravity: {DIFFICULTY_SETTINGS[settings.difficulty].gravity}
                  </p>
                </div>

                {/* Reset */}
                <button
                  onClick={() => {
                    setSettings(DEFAULT_SETTINGS);
                    localStorage.removeItem('flappyBestScore');
                    playButtonClick();
                  }}
                  className="w-full py-2.5 bg-gradient-to-b from-red-400 to-red-600 text-white font-bold text-sm rounded-xl shadow-md hover:from-red-300 hover:to-red-500 active:scale-95 transition-all border-2 border-red-700"
                >
                  🗑 Reset All Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sky-800 font-bold text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-all duration-200 relative ${
          checked ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5 transition-all duration-200 ${
            checked ? 'left-6' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export default App;
