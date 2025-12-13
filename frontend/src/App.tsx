import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./api/auth"; // Ensure this import path is correct
import Layout from "./components/Layout";
import AuthGuard from "./components/AuthGuard";

// Public Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import UpdatePassword from "./pages/UpdatePassword"; // New Page

// Private/App Pages
import Dashboard from "./pages/Dashboard";
import AcademicRecord from "./pages/AcademicRecord";
import Strategist from "./pages/Strategist";

function App() {
  // --- AUTH LISTENER (Fixes Auto-Login & Reset Flow) ---
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // 1. Handle Auto-Login after Email Confirmation
        if (event === "SIGNED_IN" && session) {
          localStorage.setItem("access_token", session.access_token);

          // If we have user metadata (name), save it too
          if (session.user.user_metadata?.full_name) {
            localStorage.setItem(
              "user_name",
              session.user.user_metadata.full_name
            );
          }
        }

        // 2. Handle Logout
        if (event === "SIGNED_OUT") {
          localStorage.clear(); // Clear all app data on logout
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* ======================================================== */}
        {/* 1. PUBLIC ROUTES WITH NAVBAR                             */}
        {/* ======================================================== */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/planner" element={<AcademicRecord />} />
          <Route path="/strategist" element={<Strategist />} />
        </Route>

        {/* ======================================================== */}
        {/* 2. AUTH PAGES (No Navbar)                                */}
        {/* ======================================================== */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login />} />

        {/* NEW: Password Reset Page */}
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* ======================================================== */}
        {/* 3. PRIVATE ROUTES (Requires Login)                       */}
        {/* ======================================================== */}
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
