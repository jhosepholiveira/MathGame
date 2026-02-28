import { io } from 'socket.io-client';

const backendFromEnv = import.meta.env.VITE_BACKEND_URL;
const backendFromWindow = typeof window !== 'undefined'
    ? (import.meta.env.DEV
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : window.location.origin)
    : 'http://localhost:3001';
const URL = backendFromEnv || backendFromWindow;

export const socket = io(URL, {
    autoConnect: false
});
