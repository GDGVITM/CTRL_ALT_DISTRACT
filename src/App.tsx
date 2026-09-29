import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Landing from "./pages/Landing";
import Rules from "./pages/Rules";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Lobby from "./pages/Lobby";
import Arena from "./pages/arena/Arena";
import Complete from "./pages/Complete";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/arena" element={<Arena />} />
        <Route path="/complete" element={<Complete />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
