import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { socket } from '../utils/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Play, Users, Link as LinkIcon, AlertCircle, Trophy, Clock3, RotateCcw } from 'lucide-react';
import SchoolBrand from '../components/SchoolBrand';

interface Player {
    socketId: string;
    name: string;
    score: number;
}

interface RoomState {
    id: string;
    state: 'LOBBY' | 'PLAYING' | 'FINISHED';
    difficulty: number;
    operations: string[];
    blueTeam: Player[];
    redTeam: Player[];
    score: number;
    timeRemaining: number;
}

type TugSide = 'blue' | 'red';

interface PullerProps {
    side: TugSide;
    index: number;
    label: string;
    isPlaying: boolean;
}

const OPERATION_OPTIONS = [
    { op: '+', label: 'Adição' },
    { op: '-', label: 'Subtração' },
    { op: '*', label: 'Multiplicação' },
    { op: '/', label: 'Divisão' },
];

function toggleOperation(current: string[], operation: string) {
    if (current.includes(operation)) {
        return current.filter((item) => item !== operation);
    }

    return [...current, operation];
}

function sameOperations(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort().join('|');
    const sortedB = [...b].sort().join('|');
    return sortedA === sortedB;
}

function Puller({ side, index, label, isPlaying }: PullerProps) {
    const dir = side === 'blue' ? -1 : 1;
    const x = dir * (120 + index * 82);
    const mainTone = side === 'blue' ? '#1D4ED8' : '#B91C1C';
    const accentTone = side === 'blue' ? '#60A5FA' : '#FB923C';
    const shoeTone = side === 'blue' ? '#2563EB' : '#DC2626';

    return (
        <motion.div
            className="absolute bottom-4 md:bottom-8"
            initial={false}
            animate={isPlaying ? {
                x,
                y: [0, -5, 0, 3, 0],
                rotate: [dir * 8, dir * 13, dir * 8],
            } : {
                x,
                y: 0,
                rotate: dir * 10,
            }}
            transition={{
                duration: 0.8 + index * 0.06,
                repeat: isPlaying ? Infinity : 0,
                ease: 'easeInOut',
            }}
        >
            <div className="relative">
                <svg
                    viewBox="0 0 80 120"
                    className="w-16 md:w-20 drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]"
                    style={side === 'red' ? { transform: 'scaleX(-1)' } : undefined}
                >
                    <ellipse cx="38" cy="112" rx="18" ry="5" fill="rgba(0,0,0,0.25)" />
                    <circle cx="40" cy="18" r="12" fill="#F8D7B5" />
                    <path d="M28 16c6-11 18-11 24 0v4H28z" fill="#0F172A" />
                    <rect x="24" y="31" width="32" height="34" rx="9" fill={mainTone} />
                    <path d="M24 45h32" stroke={accentTone} strokeWidth="6" />
                    <path d="M24 38h32" stroke={accentTone} strokeWidth="4" />
                    <path d="M17 42c7 2 12 8 13 16" stroke="#F8D7B5" strokeWidth="6" strokeLinecap="round" />
                    <path d="M63 42c-15 4-22 11-27 19" stroke="#F8D7B5" strokeWidth="6" strokeLinecap="round" />
                    <path d="M32 65l-8 27" stroke="#0B1120" strokeWidth="10" strokeLinecap="round" />
                    <path d="M48 65l10 24" stroke="#0B1120" strokeWidth="10" strokeLinecap="round" />
                    <path d="M17 93h16" stroke={shoeTone} strokeWidth="7" strokeLinecap="round" />
                    <path d="M51 90h17" stroke={shoeTone} strokeWidth="7" strokeLinecap="round" />
                </svg>
                <div
                    className={`absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wide md:text-xs ${side === 'blue'
                            ? 'border-blue-300/70 bg-blue-500/20 text-blue-100'
                            : 'border-red-300/70 bg-red-500/20 text-red-100'
                        }`}
                >
                    {label}
                </div>
            </div>
        </motion.div>
    );
}

export default function Host() {
    const [room, setRoom] = useState<RoomState | null>(null);
    const [difficulty, setDifficulty] = useState(1);
    const [operations, setOperations] = useState<string[]>(['+']);
    const [rematchDifficulty, setRematchDifficulty] = useState(1);
    const [rematchOperations, setRematchOperations] = useState<string[]>(['+']);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const previousRoomStateRef = useRef<RoomState['state'] | null>(null);

    useEffect(() => {
        socket.connect();

        const handleRoomUpdate = (data: RoomState) => {
            setRoom(data);
            setError('');

            // Sync filters when we enter lobby (from create/finish), without overwriting in-lobby edits.
            if (data.state === 'LOBBY' && previousRoomStateRef.current !== 'LOBBY') {
                setRematchDifficulty(data.difficulty);
                setRematchOperations(data.operations);
            }

            previousRoomStateRef.current = data.state;
        };

        socket.on('room_created', handleRoomUpdate);
        socket.on('room_state_update', handleRoomUpdate);
        socket.on('error', (err: string) => setError(err));
        socket.on('connect_error', () => {
            setError('Não foi possível conectar ao servidor. Confira se o backend está online.');
        });

        return () => {
            socket.off('room_created', handleRoomUpdate);
            socket.off('room_state_update', handleRoomUpdate);
            socket.off('error');
            socket.off('connect_error');
        };
    }, []);

    const createRoom = () => {
        if (operations.length === 0) {
            setError('Selecione pelo menos uma operação');
            return;
        }
        setError('');
        setRematchDifficulty(difficulty);
        setRematchOperations(operations);
        socket.emit('create_room', { difficulty, operations });
    };

    const startGame = () => {
        if (!room) return;
        setError('');
        socket.emit('start_game', room.id);
    };

    const restartWithSameFilters = () => {
        if (!room) return;
        setError('');
        socket.emit('restart_game', { roomId: room.id });
    };

    const restartWithCustomFilters = () => {
        if (!room) return;

        if (rematchOperations.length === 0) {
            setError('Selecione pelo menos uma operação para a nova rodada.');
            return;
        }

        setError('');
        socket.emit('restart_game', {
            roomId: room.id,
            difficulty: rematchDifficulty,
            operations: rematchOperations,
            autoStart: false,
        });
    };

    if (!room) {
        return (
            <div className="flex h-[100dvh] flex-col items-center justify-center overflow-hidden p-3 md:p-4">
                <div className="mb-3 md:mb-4 w-full max-w-lg">
                    <SchoolBrand mode="white-on-dark" className="mx-auto w-fit" />
                </div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-900/90 p-5 md:p-6 rounded-3xl shadow-2xl border border-sky-500/25 w-full max-w-lg backdrop-blur-sm"
                >
                    <div className="flex items-center gap-3 mb-5 md:mb-6">
                        <div className="p-3 bg-sky-500/20 text-sky-300 rounded-xl">
                            <Settings size={28} />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold">Configuração da Partida</h2>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30 flex items-center gap-2">
                            <AlertCircle size={20} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-4 md:space-y-5">
                        <div>
                            <label className="block text-slate-400 font-medium mb-2">Operações Matemáticas</label>
                            <div className="grid grid-cols-4 gap-2">
                                {OPERATION_OPTIONS.map(({ op, label }) => (
                                    <button
                                        key={op}
                                        onClick={() => {
                                            setOperations((current) => toggleOperation(current, op));
                                        }}
                                        className={`py-2.5 rounded-xl font-bold text-lg md:text-xl border transition-all ${operations.includes(op)
                                                ? 'bg-blue-600 border-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.45)] text-white'
                                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                                            }`}
                                        title={label}
                                    >
                                        {op}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 font-medium mb-2">Nível de Dificuldade (Dígitos)</label>
                            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                                {[1, 2, 3].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setDifficulty(level)}
                                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${difficulty === level
                                                ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md'
                                                : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                    >
                                        Nível {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={createRoom}
                            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2"
                        >
                            Criar Sala <LinkIcon size={20} />
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const currentUrl = window.location.origin + window.location.pathname;
    const joinUrl = `${currentUrl}#/play?room=${room.id}`;
    const hasMinimumPlayers = room.blueTeam.length > 0 && room.redTeam.length > 0;
    const operationsPreview = room.operations.join(' ');
    const hasPendingFilterChanges =
        room.difficulty !== rematchDifficulty ||
        !sameOperations(room.operations, rematchOperations);

    if (room.state === 'LOBBY') {
        return (
            <div className="mx-auto flex h-[100dvh] max-w-7xl flex-col overflow-hidden p-3 md:p-4">
                <header className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-5">
                    <div className="flex items-center gap-4">
                        <SchoolBrand mode="white-on-dark" compact />
                        <div>
                            <h1 className="flex items-center gap-3 text-2xl md:text-3xl font-extrabold">
                                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                                    <Users size={20} />
                                </div>
                                Lobby da Sala
                            </h1>
                            <p className="text-sm text-slate-300/80">Colégio Santíssimo Senhor</p>
                        </div>
                    </div>
                    <button
                        onClick={startGame}
                        disabled={!hasMinimumPlayers}
                        className="bg-green-500 hover:bg-green-400 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-green-500/30 transition-all flex items-center gap-2"
                    >
                        Iniciar Jogo <Play size={20} fill="currentColor" />
                    </button>
                </header>
                {error && (
                    <p className="mb-3 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
                        {error}
                    </p>
                )}
                {!hasMinimumPlayers && (
                    <p className="mb-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200">
                        Para iniciar, é obrigatório ter pelo menos 1 jogador no Time Azul e 1 no Time Vermelho.
                    </p>
                )}
                <div className="mb-3 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100">
                    Filtros atuais: Nível {room.difficulty} | Operações {operationsPreview}
                </div>
                <div className="mb-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3 md:p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Ajustar Filtros Antes de Iniciar</p>

                    <div className="mb-3">
                        <p className="mb-2 text-xs font-semibold text-slate-300">Operações</p>
                        <div className="grid grid-cols-4 gap-2">
                            {OPERATION_OPTIONS.map(({ op, label }) => (
                                <button
                                    key={`lobby-filter-${op}`}
                                    type="button"
                                    onClick={() => setRematchOperations((current) => toggleOperation(current, op))}
                                    title={label}
                                    className={`rounded-lg border py-1.5 text-lg font-bold transition ${rematchOperations.includes(op)
                                        ? 'border-cyan-300 bg-cyan-500 text-slate-950'
                                        : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                                        }`}
                                >
                                    {op}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-3">
                        <p className="mb-2 text-xs font-semibold text-slate-300">Nível (dígitos)</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((level) => (
                                <button
                                    key={`lobby-level-${level}`}
                                    type="button"
                                    onClick={() => setRematchDifficulty(level)}
                                    className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${rematchDifficulty === level
                                        ? 'border-cyan-300 bg-cyan-500 text-slate-950'
                                        : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                                        }`}
                                >
                                    Nível {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={restartWithCustomFilters}
                        disabled={rematchOperations.length === 0 || !hasPendingFilterChanges}
                        className="w-full rounded-xl border border-cyan-400/70 bg-transparent px-4 py-2.5 text-xs font-black uppercase tracking-wide text-cyan-200 transition hover:bg-cyan-500/15 disabled:border-slate-700 disabled:text-slate-500 md:text-sm"
                    >
                        Salvar filtros para próxima partida
                    </button>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(290px,1fr)_2fr] md:gap-5">
                    {/* QR Code Column */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="h-fit bg-white p-5 md:p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center text-slate-800"
                    >
                        <h2 className="text-2xl font-bold mb-2">Entre para Jogar!</h2>
                        <p className="text-slate-500 mb-5 md:mb-6 font-medium">Escaneie o QR ou digite o PIN</p>

                        <div className="bg-slate-100 p-3 md:p-4 rounded-2xl mb-5 md:mb-6">
                            <QRCodeSVG value={joinUrl} size={160} />
                        </div>

                        <div className="text-center w-full">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">PIN da Sala</p>
                            <div className="bg-indigo-50 border-2 border-indigo-100 rounded-xl py-2.5 px-4 text-4xl md:text-5xl font-mono font-bold tracking-widest text-indigo-600">
                                {room.id}
                            </div>
                        </div>
                    </motion.div>

                    {/* Teams Column */}
                    <div className="grid min-h-0 grid-cols-2 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative flex min-h-0 flex-col overflow-hidden rounded-3xl border border-blue-500/30 bg-blue-950/40 p-4 md:p-5"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-blue-400">Time Azul</h3>
                                <span className="bg-blue-500/20 text-blue-300 py-1 px-3 rounded-full text-sm font-bold">
                                    {room.blueTeam.length} jogadores
                                </span>
                            </div>
                            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                                <AnimatePresence>
                                    {room.blueTeam.map((p) => (
                                        <motion.li
                                            key={p.socketId}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="bg-slate-900/50 py-3 px-4 rounded-xl border border-slate-700/50 font-medium text-lg flex items-center gap-3 shadow-sm"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            {p.name}
                                        </motion.li>
                                    ))}
                                </AnimatePresence>
                                {room.blueTeam.length === 0 && (
                                    <p className="text-slate-500 italic text-center py-8">Aguardando jogadores...</p>
                                )}
                            </ul>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="relative flex min-h-0 flex-col overflow-hidden rounded-3xl border border-red-500/30 bg-red-950/40 p-4 md:p-5"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full" />
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-2xl font-extrabold text-red-500">Time Vermelho</h3>
                                <span className="bg-red-500/20 text-red-400 py-1 px-3 rounded-full text-sm font-bold">
                                    {room.redTeam.length} jogadores
                                </span>
                            </div>
                            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                                <AnimatePresence>
                                    {room.redTeam.map((p) => (
                                        <motion.li
                                            key={p.socketId}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="bg-slate-900/50 py-3 px-4 rounded-xl border border-slate-700/50 font-medium text-lg flex items-center gap-3 shadow-sm"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            {p.name}
                                        </motion.li>
                                    ))}
                                </AnimatePresence>
                                {room.redTeam.length === 0 && (
                                    <p className="text-slate-500 italic text-center py-8">Aguardando jogadores...</p>
                                )}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </div>
        );
    }

    // PLAYING OR FINISHED STATE (animated tug of war)
    const ropePos = Math.max(-100, Math.min(100, room.score)); // -100 to 100
    const ropeOffsetPx = ropePos * 2.8;
    const ropeMeter = ((ropePos + 100) / 200) * 100;
    const isPlaying = room.state === 'PLAYING';

    const blueFighterLabels = Array.from(
        { length: Math.max(2, Math.min(4, room.blueTeam.length || 2)) },
        (_, i) => (room.blueTeam[i]?.name || `Azul ${i + 1}`).slice(0, 8).toUpperCase()
    );
    const redFighterLabels = Array.from(
        { length: Math.max(2, Math.min(4, room.redTeam.length || 2)) },
        (_, i) => (room.redTeam[i]?.name || `Verm ${i + 1}`).slice(0, 8).toUpperCase()
    );

    const winner = room.score < 0 ? 'Time Azul' : room.score > 0 ? 'Time Vermelho' : 'Nenhum time';
    const elapsedSeconds = Math.max(0, 60 - room.timeRemaining);

    return (
        <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden p-2.5 md:p-4">
            <header
                className={`relative z-20 flex items-start justify-between gap-3 ${room.state === 'FINISHED' ? 'mb-2 md:mb-3' : 'mb-3 md:mb-4'
                    }`}
            >
                <div className="flex flex-col gap-2">
                    <SchoolBrand mode="white-on-dark" compact={room.state !== 'FINISHED'} tiny={room.state === 'FINISHED'} />
                    <h1
                        className={`flex flex-col font-black ${room.state === 'FINISHED' ? 'text-base md:text-xl' : 'text-lg md:text-2xl'
                            }`}
                    >
                        Arena do Cabo de Guerra Matemático
                        <span className="font-mono text-xs text-slate-400 md:text-sm">Sala: {room.id}</span>
                    </h1>
                </div>
                {room.state === 'PLAYING' && (
                    <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-base font-black text-cyan-300 md:px-5 md:py-2 md:text-xl">
                        <Clock3 size={18} />
                        <span className="font-mono">
                            {Math.floor(room.timeRemaining / 60)}:{(room.timeRemaining % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                )}
                {room.state === 'FINISHED' && (
                    <button
                        onClick={() => navigate('/')}
                        className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-slate-100 transition hover:bg-slate-700"
                    >
                        Encerrar Jogo
                    </button>
                )}
            </header>
            {error && (
                <p className="mb-3 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300">
                    {error}
                </p>
            )}

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-slate-700/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 shadow-2xl">
                <div className="absolute inset-0">
                    <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-blue-950/45 via-blue-900/15 to-transparent" />
                    <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-red-950/45 via-red-900/15 to-transparent" />
                    <div className="absolute left-1/2 top-6 h-[84%] -translate-x-1/2 border-l-2 border-dashed border-white/15" />
                    <div className="absolute inset-x-0 top-[64%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                <div className="relative z-10 flex h-full flex-col p-3 md:p-5">
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                        <div className="rounded-2xl border border-blue-500/40 bg-blue-950/45 p-2.5 md:p-3">
                            <p className="text-xs font-black uppercase tracking-wider text-blue-300/80 md:text-sm">Time Azul</p>
                            <p className="text-xl font-black text-blue-300 md:text-3xl">{room.blueTeam.length}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-600 bg-slate-900/70 p-2.5 text-center md:p-3">
                            <p className="text-xs font-black uppercase tracking-wider text-slate-400 md:text-sm">Pressão da Corda</p>
                            <p className="text-base font-black text-slate-100 md:text-xl">{Math.abs(ropePos)}%</p>
                        </div>
                        <div className="rounded-2xl border border-red-500/40 bg-red-950/45 p-2.5 text-right md:p-3">
                            <p className="text-xs font-black uppercase tracking-wider text-red-300/80 md:text-sm">Time Vermelho</p>
                            <p className="text-xl font-black text-red-300 md:text-3xl">{room.redTeam.length}</p>
                        </div>
                    </div>

                    <div className="mt-3 rounded-full border border-slate-700 bg-slate-900/80 p-1">
                        <motion.div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-cyan-300 to-red-500"
                            animate={{ width: `${ropeMeter}%` }}
                            transition={{ type: 'spring', stiffness: 90, damping: 20 }}
                        />
                    </div>

                    <div className="relative mt-3 min-h-0 flex-1 md:mt-4">
                        <motion.div
                            className="absolute left-1/2 top-[58%] z-20"
                            animate={{ x: ropeOffsetPx }}
                            transition={{ type: 'spring', stiffness: 110, damping: 17 }}
                        >
                            <div className="absolute left-0 top-0 h-[10px] -translate-x-1/2 rounded-full border border-amber-200/20 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 shadow-[0_6px_10px_rgba(0,0,0,0.45)] [width:clamp(220px,78vw,760px)]" />
                            <div className="absolute left-0 top-[4px] h-[2px] -translate-x-1/2 bg-amber-100/30 [width:clamp(220px,78vw,760px)]" />

                            <motion.div
                                className="absolute left-0 -top-8 h-16 w-3 -translate-x-1/2 rounded-full bg-amber-900 shadow-lg"
                                animate={{ y: isPlaying ? [0, -3, 0, 2, 0] : 0 }}
                                transition={{ duration: 0.9, repeat: isPlaying ? Infinity : 0 }}
                            >
                                <div className="absolute -left-3 top-7 h-6 w-9 rounded-r-full bg-red-500" />
                            </motion.div>

                            {blueFighterLabels.map((label, i) => (
                                <Puller key={`blue-${i}`} side="blue" index={i} label={label} isPlaying={isPlaying} />
                            ))}
                            {redFighterLabels.map((label, i) => (
                                <Puller key={`red-${i}`} side="red" index={i} label={label} isPlaying={isPlaying} />
                            ))}
                        </motion.div>

                        <div className="absolute bottom-2 left-2 rounded-full border border-blue-500/40 bg-blue-950/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-200 md:bottom-4 md:left-5 md:px-4 md:py-2 md:text-xs">
                            Time Azul Puxando
                        </div>
                        <div className="absolute bottom-2 right-2 rounded-full border border-red-500/40 bg-red-950/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-200 md:bottom-4 md:right-5 md:px-4 md:py-2 md:text-xs">
                            Time Vermelho Puxando
                        </div>
                    </div>
                </div>

                {room.state === 'FINISHED' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 z-30 overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm md:p-4"
                    >
                        <div className="flex min-h-full items-center justify-center py-1">
                            <div className="w-full max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-3xl border border-slate-600 bg-slate-900/95 p-5 text-center shadow-2xl md:p-6">
                                <SchoolBrand mode="white-on-dark" tiny className="mb-3 mx-auto w-fit" />
                                <div className="mx-auto mb-3 w-fit rounded-full border border-amber-300/30 bg-amber-500/10 p-3 text-amber-300">
                                    <Trophy size={36} />
                                </div>
                                <h2 className="mb-1 text-3xl font-black md:text-4xl">
                                    {room.score < 0 ? <span className="text-blue-400">AZUL VENCEU!</span> : room.score > 0 ? <span className="text-red-400">VERMELHO VENCEU!</span> : <span className="text-slate-300">EMPATE!</span>}
                                </h2>
                                <p className="mb-4 text-slate-300">
                                    {winner} dominou a corda.
                                </p>

                                <div className="mb-4 grid grid-cols-2 gap-2.5 text-left">
                                    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Puxada Final</p>
                                        <p className="text-2xl font-black text-slate-100">{Math.abs(room.score)}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3">
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Tempo</p>
                                        <p className="text-2xl font-black text-slate-100">{elapsedSeconds}s</p>
                                    </div>
                                </div>

                                <div className="mb-3 space-y-3 rounded-2xl border border-slate-700 bg-slate-800/65 p-3 text-left md:p-4">
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Filtros da Próxima Rodada</p>

                                    <div>
                                        <p className="mb-2 text-xs font-semibold text-slate-300">Operações</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {OPERATION_OPTIONS.map(({ op, label }) => (
                                                <button
                                                    key={`rematch-${op}`}
                                                    type="button"
                                                    onClick={() => setRematchOperations((current) => toggleOperation(current, op))}
                                                    title={label}
                                                    className={`rounded-lg border py-1.5 text-lg font-bold transition ${rematchOperations.includes(op)
                                                        ? 'border-cyan-300 bg-cyan-500 text-slate-950'
                                                        : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                                                        }`}
                                                >
                                                    {op}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-2 text-xs font-semibold text-slate-300">Nível (dígitos)</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[1, 2, 3].map((level) => (
                                                <button
                                                    key={`rematch-level-${level}`}
                                                    type="button"
                                                    onClick={() => setRematchDifficulty(level)}
                                                    className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${rematchDifficulty === level
                                                        ? 'border-cyan-300 bg-cyan-500 text-slate-950'
                                                        : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                                                        }`}
                                                >
                                                    Nível {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <button
                                        onClick={restartWithSameFilters}
                                        disabled={!hasMinimumPlayers}
                                        className="mx-auto flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-base font-black text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                                    >
                                        <RotateCcw size={18} />
                                        Revanche (mesmos filtros)
                                    </button>
                                    <button
                                        onClick={restartWithCustomFilters}
                                        disabled={rematchOperations.length === 0}
                                        className="mx-auto flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/70 bg-transparent px-5 py-2.5 text-xs font-black uppercase tracking-wide text-cyan-200 transition hover:bg-cyan-500/15 disabled:border-slate-700 disabled:text-slate-500 md:text-sm"
                                    >
                                        Aplicar novos filtros e voltar ao lobby
                                    </button>
                                </div>
                                {!hasMinimumPlayers && (
                                    <p className="mt-3 text-sm text-amber-300">
                                        Revanche imediata exige 1 jogador em cada time. Com novos filtros, você volta ao lobby para revisar.
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
