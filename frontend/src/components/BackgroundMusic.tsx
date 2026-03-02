import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import soundtrackUrl from '../assets/Full Version.mp3';

const STORAGE_KEY = 'mathgame_music_muted';
const ACTIVE_VOLUME = 0.35;

export default function BackgroundMusic() {
    const [isMuted, setIsMuted] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });
    const [hasInteracted, setHasInteracted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const attemptPlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio || isMuted) return false;

        try {
            audio.muted = false;
            audio.volume = ACTIVE_VOLUME;
            await audio.play();
            return true;
        } catch {
            // Browser may block until a valid user gesture.
            return false;
        }
    }, [isMuted]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.loop = true;
        audio.volume = ACTIVE_VOLUME;
        audio.muted = isMuted;
    }, [isMuted]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(isMuted));
        } catch {
            // Ignore storage errors.
        }
    }, [isMuted]);

    useEffect(() => {
        const handleGesture = () => {
            setHasInteracted(true);
            if (!isMuted) {
                void attemptPlay();
            }
        };

        window.addEventListener('pointerdown', handleGesture, { passive: true });
        window.addEventListener('touchstart', handleGesture, { passive: true });
        window.addEventListener('keydown', handleGesture);

        return () => {
            window.removeEventListener('pointerdown', handleGesture);
            window.removeEventListener('touchstart', handleGesture);
            window.removeEventListener('keydown', handleGesture);
        };
    }, [attemptPlay, isMuted]);

    useEffect(() => {
        const handleVisibility = () => {
            if (!document.hidden && !isMuted && hasInteracted) {
                void attemptPlay();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [attemptPlay, hasInteracted, isMuted]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isMuted) {
            audio.muted = true;
            audio.pause();
            return;
        }

        audio.muted = false;
        if (hasInteracted) {
            void attemptPlay();
        }
    }, [attemptPlay, hasInteracted, isMuted]);

    const toggleMute = () => {
        const nextMuted = !isMuted;
        setHasInteracted(true);
        setIsMuted(nextMuted);

        const audio = audioRef.current;
        if (!audio) return;

        if (nextMuted) {
            audio.muted = true;
            audio.pause();
            return;
        }

        audio.muted = false;
        audio.volume = ACTIVE_VOLUME;
        void audio.play().catch(() => {
            // If this immediate play fails, interaction listeners will retry.
        });
    };

    return (
        <>
            <audio
                ref={audioRef}
                src={soundtrackUrl}
                preload="auto"
                onCanPlay={() => {
                    if (!isMuted && hasInteracted) {
                        void attemptPlay();
                    }
                }}
            />
            <button
                type="button"
                onClick={toggleMute}
                className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-slate-500/70 bg-slate-900/85 px-4 py-2 text-sm font-bold text-slate-100 shadow-lg backdrop-blur-sm transition hover:bg-slate-800"
                aria-label={isMuted ? 'Ativar música de fundo' : 'Mutar música de fundo'}
                title={isMuted ? 'Ativar música' : 'Mutar música'}
            >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {isMuted ? 'Música OFF' : 'Música ON'}
            </button>
        </>
    );
}
