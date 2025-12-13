import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../api/auth";
import { useState, useEffect } from "react";
import { GraduationCap } from "lucide-react";

const AuthGuard = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 1. Check for an active session with Supabase
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();

      // 2. If session exists AND the user object is valid, they are authenticated
      if (data?.session) {
        setIsAuthenticated(true);
        // Save the user ID needed for the API headers
        localStorage.setItem("student-id", data.session.user.id);
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem("student-id");
      }
      setLoading(false);
    };

    checkAuth();

    // 3. Listen for real-time auth changes (e.g., if session expires or user logs out)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setIsAuthenticated(true);
          localStorage.setItem("student-id", session.user.id);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem("student-id");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    // Show a loading spinner/screen while Supabase checks the token
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-text-200">
        <GraduationCap className="h-8 w-8 animate-spin text-primary-100" />
        <p className="mt-3 text-sm">Checking authentication status...</p>
      </div>
    );
  }

  // --- The Routing Logic ---
  if (isAuthenticated) {
    // If logged in, render the child route (Dashboard, Strategist)
    return <Outlet />;
  } else {
    // If NOT logged in, redirect them to the /login page
    return <Navigate to="/login" replace />;
  }
};

export default AuthGuard;
