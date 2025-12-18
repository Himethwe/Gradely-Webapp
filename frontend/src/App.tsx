import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./api/auth";
import Layout from "./components/Layout";
import AuthGuard from "./components/AuthGuard";

// Public Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import UpdatePassword from "./pages/UpdatePassword";

// Private Pages
import Dashboard from "./pages/Dashboard";
import AcademicRecord from "./pages/AcademicRecord";
import Strategist from "./pages/Strategist";

import type { User } from "@supabase/supabase-js";

function App() {
  const [user, setUser] = useState<User | null>(null);

  //AUTH LISTENER
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) {
        localStorage.setItem("access_token", session.access_token);
        if (session.user.user_metadata?.full_name) {
          localStorage.setItem(
            "user_name",
            session.user.user_metadata.full_name
          );
        }
      }
    });

    //Real-time Subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session) {
        localStorage.setItem("access_token", session.access_token);
        if (session.user.user_metadata?.full_name) {
          localStorage.setItem(
            "user_name",
            session.user.user_metadata.full_name
          );
        }
      }

      if (event === "SIGNED_OUT") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_name");
        localStorage.removeItem("sb-access-token");
        localStorage.removeItem("sb-refresh-token");

        //leave 'selectedDegreeId' and 'selectedDegreeName' for next login to remember
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout user={user} />}>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/planner" element={<AcademicRecord />} />
          <Route path="/strategist" element={<Strategist />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />
          <Route path="/update-password" element={<UpdatePassword />} />
        </Route>

        {/* Private Routes */}
        <Route element={<AuthGuard />}>
          <Route element={<Layout user={user} />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
