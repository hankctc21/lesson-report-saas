import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PublicSharePage from "./pages/PublicSharePage";

export default function App() {
  const { isAuthenticated, signIn, signOut } = useAuth();

  return (
    <Routes>
      <Route path="/share/:token" element={<PublicSharePage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/app" replace /> : <LoginPage onLogin={signIn} />} />
      <Route path="/app" element={isAuthenticated ? <DashboardPage onLogout={signOut} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/app" : "/login"} replace />} />
    </Routes>
  );
}
