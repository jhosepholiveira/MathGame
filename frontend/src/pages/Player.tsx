import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap } from 'lucide-react';
import SchoolBrand from '../components/SchoolBrand';

interface Question {
    id: string;
    text: string;
    answer: number;
}

export default function Player() {
    const [searchParams] = useSearchParams();
    const roomId = searchParams.get('room');
    const playerName = searchParams.get('name');
    const navigate = useNavigate();

    const [team, setTeam] = useState<'blue' | 'red' | null>(null);
    const [gameState, setGameState] = useState<'LOBBY' | 'PLAYING' | 'FINISHED'>('LOBBY');
    const [question, setQuestion] = useState<Question | null>(null);
    const [answerInput, setAnswerInput] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!roomId || !playerName) {
            navigate('/');
            return;
        }

        socket.connect();
        socket.emit('join_room', { roomId, playerName });

        socket.on('joined', (data: { team: 'blue' | 'red' }) => {
            setTeam(data.team);
        });

        socket.on('error', (err) => {
            alert(err);
            navigate('/');
        });
        socket.on('connect_error', () => {
            alert('Não foi possível conectar ao servidor. Tente novamente em alguns segundos.');
            navigate('/');
        });

        socket.on('game_started', () => setGameState('PLAYING'));
        socket.on('game_ended', () => setGameState('FINISHED'));

        socket.on('new_question', (q: Question) => {
            setQuestion(q);
            setAnswerInput('');
            setFeedback(null);
            setTimeout(() => inputRef.current?.focus(), 10);
        });

        socket.on('answer_result', (isCorrect: boolean) => {
            setFeedback(isCorrect ? 'correct' : 'wrong');
            if (isCorrect) {
                setAnswerInput('');
            } else {
                setTimeout(() => setFeedback(null), 1000);
                setAnswerInput('');
            }
        });

        return () => {
            socket.off('joined');
            socket.off('error');
            socket.off('connect_error');
            socket.off('game_started');
            socket.off('game_ended');
            socket.off('new_question');
            socket.off('answer_result');
        };
    }, [roomId, playerName, navigate]);

    const submitAnswer = (e?: React.FormEvent | React.MouseEvent) => {
        e?.preventDefault();
        if (!answerInput || !question) return;

        socket.emit('submit_answer', {
            roomId,
            questionId: question.id,
            answer: parseInt(answerInput),
        });
    };

    if (!team) {
        return (
            <div className="h-[100dvh] flex items-center justify-center">
                <div className="animate-spin text-indigo-500"><Loader2 size={48} /></div>
            </div>
        );
    }

    const teamBg = team === 'blue' ? 'bg-blue-500' : 'bg-red-500';
    const teamGlow = team === 'blue' ? 'shadow-blue-500/50' : 'shadow-red-500/50';
    const teamLabel = team === 'blue' ? 'Time Azul' : 'Time Vermelho';

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-950 p-2.5 md:p-3">
            <header className="mb-2 grid grid-cols-[auto_1fr_auto] items-start gap-2 md:mb-3 md:gap-3">
                <SchoolBrand mode="white-on-dark" tiny />
                <div className="min-w-0 pt-0.5">
                    <p className="text-xs md:text-sm font-medium text-slate-400">Jogando como</p>
                    <p className="text-base md:text-lg font-bold truncate">{playerName}</p>
                </div>
                <div className={`self-start whitespace-nowrap rounded-full border px-3 py-1 text-sm md:text-base font-black tracking-widest uppercase ${team === 'blue' ? 'bg-blue-950 border-blue-500/50 text-blue-400' : 'bg-red-950 border-red-500/50 text-red-500'
                    }`}>
                    {teamLabel}
                </div>
            </header>

            <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center">
                {gameState === 'LOBBY' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${teamBg} shadow-lg ${teamGlow} md:h-24 md:w-24`}>
                            <Zap size={46} fill="white" className="text-white drop-shadow-md pb-1 md:size-[52px]" />
                        </div>
                        <h2 className="mb-1 text-2xl md:text-3xl font-bold">Prepare-se!</h2>
                        <p className="text-slate-400 text-sm md:text-base">Aguardando o host iniciar...</p>
                        <div className="mt-5 flex justify-center gap-2">
                            <span className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" />
                        </div>
                    </motion.div>
                )}

                {gameState === 'PLAYING' && question && (
                    <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full min-h-0"
                    >
                        <div className="mb-3 rounded-3xl border border-slate-700 bg-slate-800 p-3 md:p-4 text-center shadow-2xl">
                            <p className="mb-2 text-xs md:text-sm font-medium uppercase tracking-widest text-slate-400">Resolva</p>
                            <div className="text-4xl md:text-5xl font-black font-mono tracking-tighter text-white drop-shadow-md">
                                {question.text}
                            </div>
                        </div>

                        <form onSubmit={submitAnswer} className="relative">
                            <input
                                ref={inputRef}
                                type="number"
                                value={answerInput}
                                onChange={(e) => setAnswerInput(e.target.value)}
                                autoFocus
                                className={`w-full rounded-2xl border-2 bg-slate-900 px-4 py-2.5 text-2xl md:text-3xl font-mono text-center shadow-lg focus:outline-none transition-colors
                  ${feedback === 'wrong' ? 'border-red-500 text-red-400 bg-red-950/20' :
                                        feedback === 'correct' ? 'border-green-500 text-green-400 bg-green-950/20' :
                                            'border-slate-700 focus:border-indigo-500'
                                    }
                `}
                                placeholder="?"
                            />
                            <AnimatePresence>
                                {feedback === 'wrong' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute -top-12 left-1/2 -translate-x-1/2 text-red-500 font-black text-xl bg-red-950 px-4 py-1 rounded-full border border-red-500"
                                    >
                                        ERRADO!
                                    </motion.div>
                                )}
                                {feedback === 'correct' && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5, y: 0 }}
                                        animate={{ opacity: 1, scale: 1.2, y: -20 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute -top-12 left-1/2 -translate-x-1/2 text-green-400 font-black text-xl drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]"
                                    >
                                        +1 PUXADA!
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>

                        <div className="mt-2.5 grid grid-cols-3 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '-', 0, '⌫'].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => {
                                        if (k === '⌫') setAnswerInput(prev => prev.slice(0, -1));
                                        else setAnswerInput(prev => prev + String(k));
                                        inputRef.current?.focus();
                                    }}
                                    className="rounded-xl bg-slate-800 py-2.5 text-lg md:text-xl font-bold font-mono shadow-sm transition-colors hover:bg-slate-700 active:bg-slate-600"
                                >
                                    {k === '-' && answerInput === '' ? '-' : k}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={submitAnswer}
                            className="mt-2.5 w-full rounded-xl bg-indigo-500 py-2.5 text-base md:text-lg font-bold text-white shadow-lg transition-colors hover:bg-indigo-400 active:bg-indigo-600"
                        >
                            ENVIAR
                        </button>
                    </motion.div>
                )}

                {gameState === 'FINISHED' && (
                    <div className="text-center">
                        <h2 className="mb-2 text-3xl md:text-4xl font-black">Fim de Jogo!</h2>
                        <p className="text-slate-400 text-base md:text-lg">Veja a tela do host para o resultado.</p>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-5 rounded-full bg-slate-800 px-7 py-2.5 font-bold hover:bg-slate-700"
                        >
                            Voltar ao Início
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
