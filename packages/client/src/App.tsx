import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LoginPage } from './components/Auth/LoginPage';
import { LobbyPage } from './components/Lobby/LobbyPage';
import { GamePage } from './components/Game/GamePage';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}

export function App() {
  const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
  const { validateToken } = useAuth();

  useEffect(() => {
    validateToken();
  }, [validateToken]);
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
        <Route path="/game/:gameId" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
