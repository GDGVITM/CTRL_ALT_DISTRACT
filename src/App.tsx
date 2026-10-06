import { Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { EventProvider } from "./context/EventContext";
import { MeProvider } from "./context/MeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CompetitionPolicy } from "./components/competition/CompetitionPolicy";
import { PixelSpinner } from "./components/ui/Button";

// Code-split route components into separate asynchronous chunks
const Landing = lazy(() => import("./pages/Landing"));
const Rules = lazy(() => import("./pages/Rules"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Lobby = lazy(() => import("./pages/Lobby"));
const Arena = lazy(() => import("./pages/arena/Arena"));
const Questions = lazy(() => import("./pages/Questions"));
const Complete = lazy(() => import("./pages/Complete"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="crt-grid crt-scanlines flex min-h-screen flex-col items-center justify-center bg-bg-canvas text-accent-cyan">
      <div className="border border-accent-cyan/30 bg-bg-base/80 p-6 text-center font-mono shadow-[0_0_20px_rgba(56,225,255,0.15)]">
        <div className="mb-3 flex justify-center">
          <PixelSpinner />
        </div>
        <p className="text-xs uppercase tracking-widest text-text-secondary">LOADING...</p>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <MeProvider>
      <EventProvider>
      <CompetitionPolicy>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/rules" element={<ProtectedRoute publicAccess><Rules /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/leaderboard" element={<ProtectedRoute publicAccess><Leaderboard /></ProtectedRoute>} />

          {/* Protected Participant Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lobby"
            element={
              <ProtectedRoute>
                <Lobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/arena"
            element={
              <ProtectedRoute>
                <Arena />
              </ProtectedRoute>
            }
          />
          <Route
            path="/questions"
            element={
              <ProtectedRoute>
                <Questions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complete"
            element={
              <ProtectedRoute>
                <Complete />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<ProtectedRoute publicAccess><NotFound /></ProtectedRoute>} />
        </Routes>
      </Suspense>
      </CompetitionPolicy>
      </EventProvider>
      </MeProvider>
    </AuthProvider>
  );
}
