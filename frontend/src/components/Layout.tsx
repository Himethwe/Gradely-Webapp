import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  GraduationCap,
  LogOut,
  Home,
  Menu,
  X,
} from "lucide-react";
import { logoutUser } from "../api/auth";
import { Button } from "./ui/Button";

import type { User } from "@supabase/supabase-js";

// Define Props
interface LayoutProps {
  user: User | null;
}

const Layout = ({ user }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Helper
  const isActiveDesktop = (path: string) =>
    location.pathname === path
      ? "text-primary-100 border-primary-100"
      : "text-text-200 border-transparent hover:text-primary-100 hover:border-primary-200";

  const isActiveMobile = (path: string) =>
    location.pathname === path
      ? "bg-primary-100/10 text-primary-100 font-bold"
      : "text-text-200 hover:bg-bg-200 hover:text-primary-100";

  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem("user_name");
    localStorage.removeItem("access_token");
    navigate("/");
    setIsMenuOpen(false);
  };

  const isGuest = !user;
  const userName = user?.user_metadata?.full_name || "Student";

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="min-h-screen bg-bg-200 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-bg-100 shadow-sm border-b border-bg-300 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Mobile Menu + Logo */}
            <div className="flex items-center gap-3 md:gap-2">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 -ml-2 rounded-md text-text-200 hover:bg-bg-200 hover:text-primary-100 transition-colors"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <div className="bg-primary-100 p-1.5 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-text-100 tracking-tight">
                  Gradely
                </span>
              </div>
            </div>

            {/* Center: Desktop Links */}
            <div className="hidden md:flex items-center gap-6 h-full">
              {isGuest ? (
                <Link
                  to="/"
                  className={`flex items-center gap-2 px-1 py-1 text-sm font-medium transition-all border-b-2 ${isActiveDesktop(
                    "/"
                  )}`}
                >
                  <Home className="h-4 w-4" /> Home
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 px-1 py-1 text-sm font-bold transition-all border-b-2 text-accent-100 hover:text-accent-200 hover:border-accent-200 ${
                    location.pathname === "/dashboard"
                      ? "border-accent-100"
                      : "border-transparent animate-pulse"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
              )}

              <Link
                to="/planner"
                className={`flex items-center gap-2 px-1 py-1 text-sm font-medium transition-all border-b-2 ${isActiveDesktop(
                  "/planner"
                )}`}
              >
                <BookOpen className="h-4 w-4" /> Academic Record
              </Link>

              <Link
                to="/strategist"
                className={`flex items-center gap-2 px-1 py-1 text-sm font-medium transition-all border-b-2 ${isActiveDesktop(
                  "/strategist"
                )}`}
              >
                <Calculator className="h-4 w-4" /> Strategist
              </Link>
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center gap-4">
              {!isGuest && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary-100 hidden sm:block">
                    Hi, {userName}
                  </span>
                  <div className="h-6 w-px bg-bg-300 mx-1 hidden sm:block"></div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-full text-text-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              )}

              {isGuest && (
                <Link to="/login">
                  <Button variant="outline" className="border-bg-300">
                    Log In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-bg-300 bg-white/95 backdrop-blur-md absolute w-full left-0 shadow-lg z-40">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {isGuest ? (
                <Link
                  to="/"
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${isActiveMobile(
                    "/"
                  )}`}
                >
                  <Home className="h-5 w-5" /> Home
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-bold transition-colors text-accent-100 ${
                    location.pathname !== "/dashboard" && "animate-pulse"
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" /> Dashboard
                </Link>
              )}
              <Link
                to="/planner"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${isActiveMobile(
                  "/planner"
                )}`}
              >
                <BookOpen className="h-5 w-5" /> Academic Record
              </Link>
              <Link
                to="/strategist"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${isActiveMobile(
                  "/strategist"
                )}`}
              >
                <Calculator className="h-5 w-5" /> Strategist
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
