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

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.loop = true;
        audio.volume = ACTIVE_VOLUME;
        audio.muted = isMuted;
    }, [isMuted]);

    const tryPlay = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio || isMuted) return;
        try {
            await audio.play();
        } catch {
            // Browser blocked autoplay; next interaction will try again.
        }
    }, [isMuted]);

    useEffect(() => {
        const activateOnInteraction = () => {
            setHasInteracted(true);
            void tryPlay();
            window.removeEventListener('pointerdown', activateOnInteraction);
            window.removeEventListener('keydown', activateOnInteraction);
        };

        window.addEventListener('pointerdown', activateOnInteraction);
        window.addEventListener('keydown', activateOnInteraction);

        return () => {
            window.removeEventListener('pointerdown', activateOnInteraction);
            window.removeEventListener('keydown', activateOnInteraction);
        };
    }, [tryPlay]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(isMuted));
        } catch {
            // Ignore storage errors (private mode / blocked storage).
        }
    }, [isMuted]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.muted = isMuted;
        if (!isMuted && hasInteracted) {
            void tryPlay();
        }
        if (isMuted) {
            audio.pause();
        }
    }, [isMuted, hasInteracted, tryPlay]);

    const toggleMute = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (!nextMuted && hasInteracted) {
            void tryPlay();
        }
    };

    return (
        <>
            <audio ref={audioRef} src={soundtrackUrl} preload="auto" />
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
