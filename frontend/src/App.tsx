import { Routes, Route, HashRouter } from 'react-router-dom';
import Home from './pages/Home';
import Host from './pages/Host';
import Player from './pages/Player';
import BackgroundMusic from './components/BackgroundMusic';

function App() {
  return (
    <HashRouter>
      <div className="h-[100dvh] overflow-hidden text-slate-50 selection:bg-sky-400/35">
        <BackgroundMusic />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<Host />} />
          <Route path="/play" element={<Player />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
