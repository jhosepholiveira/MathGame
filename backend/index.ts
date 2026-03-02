import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3001;

interface Player {
    socketId: string;
    name: string;
    score: number;
}

interface Question {
    id: string;
    text: string;
    answer: number;
}

interface GameRoom {
    id: string;
    hostId: string;
    state: 'LOBBY' | 'PLAYING' | 'FINISHED';
    difficulty: number;
    operations: string[];
    blueTeam: Player[];
    redTeam: Player[];
    score: number; // 0 is tie, negative is blue pulling, positive is red pulling
    timeRemaining: number;
    timerInterval?: NodeJS.Timeout;
    currentQuestions: Map<string, Question>; // socketId -> Question
}

const rooms = new Map<string, GameRoom>();
const GAME_DURATION_SECONDS = 60;
const SCORE_LIMIT = 100;
const ALLOWED_OPERATIONS = new Set(['+', '-', '*', '/']);

function normalizeDifficulty(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(3, Math.max(1, Math.floor(parsed)));
}

function sanitizeOperations(value: unknown) {
    if (!Array.isArray(value)) return [] as string[];

    const filtered = value.filter((item): item is string =>
        typeof item === 'string' && ALLOWED_OPERATIONS.has(item)
    );

    return [...new Set(filtered)];
}

function canStartGame(room: GameRoom) {
    return room.blueTeam.length > 0 && room.redTeam.length > 0;
}

function resetRound(room: GameRoom) {
    room.state = 'PLAYING';
    room.score = 0;
    room.timeRemaining = GAME_DURATION_SECONDS;
    room.currentQuestions.clear();
    room.blueTeam.forEach((player) => {
        player.score = 0;
    });
    room.redTeam.forEach((player) => {
        player.score = 0;
    });
}

function resetToLobby(room: GameRoom) {
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        delete room.timerInterval;
    }

    room.state = 'LOBBY';
    room.score = 0;
    room.timeRemaining = GAME_DURATION_SECONDS;
    room.currentQuestions.clear();
}

function finishGame(room: GameRoom) {
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        delete room.timerInterval;
    }

    room.state = 'FINISHED';
    room.currentQuestions.clear();
    io.to(room.id).emit('game_ended');
    io.to(room.id).emit('room_state_update', serializeRoom(room));
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateQuestion(difficulty: number, operations: string[]): Question {
    const op = operations[Math.floor(Math.random() * operations.length)];

    let maxVal = Math.pow(10, difficulty) - 1;
    let minVal = difficulty > 1 ? Math.pow(10, difficulty - 1) : 1;

    let a = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
    let b = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;

    let text = '';
    let answer = 0;

    switch (op) {
        case '+':
            text = `${a} + ${b}`;
            answer = a + b;
            break;
        case '-':
            if (a < b) [a, b] = [b, a]; // Avoid negative answers for simplicity unless requested
            text = `${a} - ${b}`;
            answer = a - b;
            break;
        case '*':
            // Keep multiplication simpler
            if (difficulty > 1) {
                a = Math.floor(Math.random() * 9) + 2; // 2-10
            }
            text = `${a} × ${b}`;
            answer = a * b;
            break;
        case '/':
            // Ensure clean division with reasonable numbers
            b = Math.floor(Math.random() * 9) + 2; // divisor between 2-10
            answer = Math.floor(Math.random() * (difficulty > 1 ? 20 : 10)) + 1;
            a = answer * b;
            text = `${a} ÷ ${b}`;
            break;
        default:
            text = `${a} + ${b}`;
            answer = a + b;
    }

    return { id: randomUUID(), text, answer };
}

function serializeRoom(room: GameRoom) {
    return {
        id: room.id,
        hostId: room.hostId,
        state: room.state,
        difficulty: room.difficulty,
        operations: room.operations,
        blueTeam: room.blueTeam,
        redTeam: room.redTeam,
        score: room.score,
        timeRemaining: room.timeRemaining,
    };
}

function sendQuestionToPlayer(room: GameRoom, socketId: string) {
    const q = generateQuestion(room.difficulty, room.operations);
    room.currentQuestions.set(socketId, q);
    io.to(socketId).emit('new_question', q);
}

function startGame(room: GameRoom) {
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        delete room.timerInterval;
    }

    resetRound(room);
    io.to(room.id).emit('game_started');
    io.to(room.id).emit('room_state_update', serializeRoom(room));

    const allPlayers = [...room.blueTeam, ...room.redTeam];
    allPlayers.forEach((player) => {
        sendQuestionToPlayer(room, player.socketId);
    });

    room.timerInterval = setInterval(() => {
        room.timeRemaining -= 1;
        io.to(room.id).emit('room_state_update', serializeRoom(room));

        if (room.timeRemaining <= 0 || Math.abs(room.score) >= SCORE_LIMIT) {
            finishGame(room);
        }
    }, 1000);
}

io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', (config) => {
        const safeDifficulty = normalizeDifficulty(config?.difficulty);
        const safeOperations = sanitizeOperations(config?.operations);
        const roomId = generateRoomId();
        const newRoom: GameRoom = {
            id: roomId,
            hostId: socket.id,
            state: 'LOBBY',
            difficulty: safeDifficulty,
            operations: safeOperations.length > 0 ? safeOperations : ['+'],
            blueTeam: [],
            redTeam: [],
            score: 0,
            timeRemaining: GAME_DURATION_SECONDS,
            currentQuestions: new Map()
        };
        rooms.set(roomId, newRoom);
        socket.join(roomId);
        socket.emit('room_created', newRoom);
        console.log(`Room ${roomId} created`);
    });

    socket.on('join_room', ({ roomId, playerName }) => {
        const room = rooms.get(roomId);
        if (!room) return socket.emit('error', 'Sala não encontrada');
        if (room.state === 'PLAYING') return socket.emit('error', 'O jogo já foi iniciado');

        const existingBluePlayer = room.blueTeam.find(p => p.socketId === socket.id);
        const existingRedPlayer = room.redTeam.find(p => p.socketId === socket.id);
        if (existingBluePlayer || existingRedPlayer) {
            const assignedTeam = existingBluePlayer ? 'blue' : 'red';
            socket.join(roomId);
            socket.emit('joined', {
                roomId,
                team: assignedTeam,
                playerName: existingBluePlayer?.name || existingRedPlayer?.name,
                roomState: room.state,
            });
            io.to(room.id).emit('room_state_update', serializeRoom(room));
            return;
        }

        const newPlayer: Player = { socketId: socket.id, name: playerName, score: 0 };
        let assignedTeam = 'blue';

        if (room.blueTeam.length <= room.redTeam.length) {
            room.blueTeam.push(newPlayer);
        } else {
            room.redTeam.push(newPlayer);
            assignedTeam = 'red';
        }

        socket.join(roomId);
        socket.emit('joined', { roomId, team: assignedTeam, playerName, roomState: room.state });
        io.to(room.id).emit('room_state_update', serializeRoom(room));
    });

    socket.on('start_game', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.hostId !== socket.id || room.state !== 'LOBBY') return;
        if (!canStartGame(room)) {
            socket.emit('error', 'É necessário no mínimo 1 jogador em cada time para iniciar.');
            return;
        }

        startGame(room);
    });

    socket.on('restart_game', (payload: { roomId: string; difficulty?: number; operations?: string[]; autoStart?: boolean }) => {
        const room = rooms.get(payload?.roomId);
        if (!room || room.hostId !== socket.id) return;
        if (room.state !== 'FINISHED' && room.state !== 'LOBBY') return;

        if (payload?.difficulty !== undefined) {
            room.difficulty = normalizeDifficulty(payload.difficulty);
        }

        if (payload?.operations !== undefined) {
            const nextOperations = sanitizeOperations(payload.operations);
            if (nextOperations.length === 0) {
                socket.emit('error', 'Selecione pelo menos uma operação para reiniciar.');
                return;
            }
            room.operations = nextOperations;
        }

        if (payload?.autoStart === false) {
            resetToLobby(room);
            io.to(room.id).emit('room_state_update', serializeRoom(room));
            return;
        }

        if (!canStartGame(room)) {
            socket.emit('error', 'É necessário no mínimo 1 jogador em cada time para reiniciar.');
            io.to(room.id).emit('room_state_update', serializeRoom(room));
            return;
        }

        startGame(room);
    });

    socket.on('submit_answer', ({ roomId, questionId, answer }) => {
        const room = rooms.get(roomId);
        if (!room || room.state !== 'PLAYING') return;

        const currentQ = room.currentQuestions.get(socket.id);
        if (currentQ && currentQ.id === questionId) {
            const isCorrect = currentQ.answer === answer;
            socket.emit('answer_result', isCorrect);

            if (isCorrect) {
                // Update score
                const isBlue = room.blueTeam.some(p => p.socketId === socket.id);
                room.score += isBlue ? -5 : 5; // Blue pulls negative, Red pulls positive
                io.to(roomId).emit('room_state_update', serializeRoom(room));

                // Give new question
                sendQuestionToPlayer(room, socket.id);
            }
        }
    });

    socket.on('disconnect', () => {
        rooms.forEach((room, roomId) => {
            if (room.hostId === socket.id) {
                clearInterval(room.timerInterval);
                rooms.delete(roomId);
                io.to(roomId).emit('room_closed');
                return;
            }

            const blueIdx = room.blueTeam.findIndex(p => p.socketId === socket.id);
            if (blueIdx !== -1) room.blueTeam.splice(blueIdx, 1);

            const redIdx = room.redTeam.findIndex(p => p.socketId === socket.id);
            if (redIdx !== -1) room.redTeam.splice(redIdx, 1);

            room.currentQuestions.delete(socket.id);
            io.to(roomId).emit('room_state_update', serializeRoom(room));
        });
    });
});

httpServer.listen(PORT, () => {
    console.log(`Socket server on port ${PORT}`);
});
