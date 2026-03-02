import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const STORAGE_KEY = 'mathgame_music_muted';
const LOOP_DURATION_SECONDS = 4;
const ACTIVE_VOLUME = 0.1;

type Note = {
    freq: number;
    time: number;
    duration: number;
    gain: number;
};

const LOOP_PATTERN: Note[] = [
    { freq: 261.63, time: 0.0, duration: 0.22, gain: 0.22 },
    { freq: 329.63, time: 0.35, duration: 0.22, gain: 0.2 },
    { freq: 392.0, time: 0.7, duration: 0.25, gain: 0.2 },
    { freq: 523.25, time: 1.05, duration: 0.35, gain: 0.22 },
    { freq: 440.0, time: 1.7, duration: 0.22, gain: 0.2 },
    { freq: 349.23, time: 2.05, duration: 0.22, gain: 0.19 },
    { freq: 392.0, time: 2.4, duration: 0.25, gain: 0.2 },
    { freq: 329.63, time: 2.9, duration: 0.35, gain: 0.2 },
];

function scheduleNote(
    ctx: AudioContext,
    masterGain: GainNode,
    note: Note,
    startAt: number
) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, startAt + note.time);

    gain.gain.setValueAtTime(0.0001, startAt + note.time);
    gain.gain.linearRampToValueAtTime(note.gain, startAt + note.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + note.time + note.duration
    );

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startAt + note.time);
    osc.stop(startAt + note.time + note.duration + 0.03);
}

function scheduleLoop(ctx: AudioContext, masterGain: GainNode) {
    const startAt = ctx.currentTime + 0.05;
    LOOP_PATTERN.forEach((note) => scheduleNote(ctx, masterGain, note, startAt));
}

export default function BackgroundMusic() {
    const [isMuted, setIsMuted] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const contextRef = useRef<AudioContext | null>(null);
    const masterGainRef = useRef<GainNode | null>(null);
    const loopIntervalRef = useRef<number | null>(null);

    const ensureStarted = useCallback(async () => {
        if (!contextRef.current) {
            const context = new AudioContext();
            const masterGain = context.createGain();
            masterGain.gain.value = 0;
            masterGain.connect(context.destination);
            contextRef.current = context;
            masterGainRef.current = masterGain;
        }

        const context = contextRef.current;
        if (context.state === 'suspended') {
            await context.resume();
        }

        if (loopIntervalRef.current === null && masterGainRef.current) {
            scheduleLoop(context, masterGainRef.current);
            loopIntervalRef.current = window.setInterval(() => {
                if (!contextRef.current || !masterGainRef.current) return;
                scheduleLoop(contextRef.current, masterGainRef.current);
            }, LOOP_DURATION_SECONDS * 1000);
        }
    }, []);

    useEffect(() => {
        const activateOnInteraction = () => {
            if (!isMuted) {
                void ensureStarted();
            }
            window.removeEventListener('pointerdown', activateOnInteraction);
            window.removeEventListener('keydown', activateOnInteraction);
        };

        window.addEventListener('pointerdown', activateOnInteraction);
        window.addEventListener('keydown', activateOnInteraction);

        return () => {
            window.removeEventListener('pointerdown', activateOnInteraction);
            window.removeEventListener('keydown', activateOnInteraction);
        };
    }, [ensureStarted, isMuted]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(isMuted));
        } catch {
            // Ignore storage errors (private mode / blocked storage).
        }

        if (!contextRef.current || !masterGainRef.current) return;

        const now = contextRef.current.currentTime;
        const target = isMuted ? 0.0001 : ACTIVE_VOLUME;
        masterGainRef.current.gain.cancelScheduledValues(now);
        masterGainRef.current.gain.setTargetAtTime(target, now, 0.12);
    }, [isMuted]);

    useEffect(() => {
        return () => {
            if (loopIntervalRef.current !== null) {
                window.clearInterval(loopIntervalRef.current);
                loopIntervalRef.current = null;
            }
            if (contextRef.current) {
                void contextRef.current.close();
                contextRef.current = null;
                masterGainRef.current = null;
            }
        };
    }, []);

    const toggleMute = async () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (!nextMuted) {
            await ensureStarted();
        }
    };

    return (
        <button
            type="button"
            onClick={() => void toggleMute()}
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-slate-500/70 bg-slate-900/85 px-4 py-2 text-sm font-bold text-slate-100 shadow-lg backdrop-blur-sm transition hover:bg-slate-800"
            aria-label={isMuted ? 'Ativar música de fundo' : 'Mutar música de fundo'}
            title={isMuted ? 'Ativar música' : 'Mutar música'}
        >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {isMuted ? 'Música OFF' : 'Música ON'}
        </button>
    );
}
