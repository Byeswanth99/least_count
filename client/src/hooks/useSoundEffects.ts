import { useRef, useCallback } from 'react';

type SoundType = 'select' | 'discard' | 'draw' | 'turnNotification';

export function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  // Initialize AudioContext lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a simple beep with specified frequency and duration
  const playBeep = useCallback((frequency: number, duration: number, volume: number = 0.3) => {
    if (!enabledRef.current) return;

    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn('Sound effect failed:', error);
    }
  }, [getAudioContext]);

  // Play realistic card sound using white noise
  const playCardSound = useCallback((type: 'pick' | 'place') => {
    if (!enabledRef.current) return;

    try {
      const ctx = getAudioContext();
      const bufferSize = ctx.sampleRate * 0.1; // 100ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Create filters to shape the noise into card-like sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = type === 'pick' ? 2000 : 1500; // Higher for pick, lower for place
      filter.Q.value = 2;

      const gainNode = ctx.createGain();
      const volume = 0.15;
      
      // Quick attack and decay for snappy card sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      // Connect: noise -> filter -> gain -> output
      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + 0.1);
    } catch (error) {
      console.warn('Sound effect failed:', error);
    }
  }, [getAudioContext]);

  const playSound = useCallback((type: SoundType) => {
    switch (type) {
      case 'select':
        // Light card touch sound
        playCardSound('pick');
        break;
      
      case 'discard':
        // Card being placed down
        playCardSound('place');
        break;
      
      case 'draw':
        // Card being picked up
        playCardSound('pick');
        break;
      
      case 'turnNotification':
        // Attention sound - two-tone notification
        playBeep(600, 0.1, 0.3);
        setTimeout(() => {
          playBeep(800, 0.15, 0.3);
        }, 100);
        break;
    }
  }, [playBeep, playCardSound, getAudioContext]);

  const enable = useCallback(() => {
    enabledRef.current = true;
  }, []);

  const disable = useCallback(() => {
    enabledRef.current = false;
  }, []);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    return enabledRef.current;
  }, []);

  return {
    playSound,
    enable,
    disable,
    toggle,
    isEnabled: () => enabledRef.current
  };
}
