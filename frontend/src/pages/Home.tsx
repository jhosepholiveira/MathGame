import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ArrowRight, Trophy, Clock3, Sparkles } from 'lucide-react';
import { useState } from 'react';
import SchoolBrand from '../components/SchoolBrand';

export default function Home() {
    const navigate = useNavigate();
    const [pin, setPin] = useState('');
    const [name, setName] = useState('');

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.trim() && name.trim()) {
            navigate(`/play?room=${pin}&name=${name}`);
        }
    };

    return (
        <div className="h-[100dvh] overflow-hidden px-4 py-3 md:px-7 md:py-5">
            <div className="mx-auto grid h-full w-full max-w-6xl items-center gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
                <motion.section
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="min-h-0"
                >
                    <div className="mb-4 w-fit">
                        <SchoolBrand mode="original-on-light" />
                    </div>

                    <h1 className="brand-title-glow mb-2 text-3xl font-black leading-tight md:text-5xl">
                        Arena de Cálculo
                    </h1>
                    <p className="max-w-xl text-sm text-slate-200/90 md:text-lg">
                        Plataforma oficial do Colégio Santíssimo Senhor para desafios de matemática em tempo real no estilo cabo de guerra.
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:max-w-xl">
                        <div className="rounded-2xl border border-sky-500/25 bg-slate-900/65 px-3 py-3 backdrop-blur-sm">
                            <div className="mb-2 w-fit rounded-lg bg-sky-500/20 p-1.5 text-sky-300">
                                <Clock3 size={16} />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tempo real</p>
                            <p className="text-sm font-bold text-slate-100">Partidas rápidas</p>
                        </div>
                        <div className="rounded-2xl border border-sky-500/25 bg-slate-900/65 px-3 py-3 backdrop-blur-sm">
                            <div className="mb-2 w-fit rounded-lg bg-amber-500/20 p-1.5 text-amber-300">
                                <Trophy size={16} />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Competição</p>
                            <p className="text-sm font-bold text-slate-100">Azul x Vermelho</p>
                        </div>
                        <div className="rounded-2xl border border-sky-500/25 bg-slate-900/65 px-3 py-3 backdrop-blur-sm">
                            <div className="mb-2 w-fit rounded-lg bg-fuchsia-500/20 p-1.5 text-fuchsia-300">
                                <Sparkles size={16} />
                            </div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Engajamento</p>
                            <p className="text-sm font-bold text-slate-100">Aprender jogando</p>
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 }}
                    className="min-h-0"
                >
                    <div className="rounded-3xl border border-sky-500/25 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-sm md:p-5">
                        <h2 className="mb-4 flex items-center gap-2 text-xl font-black md:text-2xl">
                            <Users className="text-sky-300" /> Entrar no Jogo
                        </h2>
                        <form onSubmit={handleJoin} className="space-y-3">
                            <input
                                type="text"
                                placeholder="PIN da Sala"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-lg font-mono tracking-widest uppercase transition-colors focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Seu Nome"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={15}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg transition-colors focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                required
                            />
                            <button
                                type="submit"
                                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-3 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-500 hover:to-sky-400"
                            >
                                Entrar
                                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                            </button>
                        </form>

                        <div className="mt-4 rounded-2xl border border-sky-500/20 bg-slate-950/60 px-4 py-3 text-center">
                            <p className="mb-2 text-slate-300">Você é professor(a)?</p>
                            <button
                                onClick={() => navigate('/host')}
                                className="rounded-full border border-sky-500/40 px-5 py-2 font-semibold text-sky-300 transition-all hover:border-sky-300 hover:bg-slate-900/70 hover:text-sky-100"
                            >
                                Criar Novo Jogo
                            </button>
                        </div>
                    </div>
                </motion.section>
            </div>
        </div>
    );
}
