import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { loginUser, signUpUser, supabase } from "../api/auth";
import { Button } from "../components/ui/Button";
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(location.pathname !== "/signup");
  const [view, setView] = useState<"auth" | "forgot_password" | "check_email">(
    "auth"
  );
  const [resetSent, setResetSent] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  //HANDLER LOGIN & SIGN UP
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;

      if (isLogin) {
        result = await loginUser(email, password);
        const savedName = result.user?.user_metadata?.full_name || "Student";
        localStorage.setItem("user_name", savedName);
      } else {
        result = await signUpUser(name, email, password);
        localStorage.setItem("user_name", name);

        // Check if waiting for verification
        if (result.user && !result.session) {
          setView("check_email");
          setLoading(false);
          return;
        }
      }

      if (result.session?.access_token) {
        localStorage.setItem("access_token", result.session.access_token);
      }

      //Redirect to HOME Page (as logged in user)
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  //HANDLER: FORGOT PASSWORD
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      //Redirect to the Update Password page
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    const targetMode = !isLogin;
    setIsLogin(targetMode);
    setError("");
    setView("auth");
    const newPath = targetMode ? "/login" : "/signup";
    window.history.pushState(null, "", newPath);
  };

  return (
    <div className="min-h-screen bg-bg-100 font-sans flex items-center justify-center p-4 relative">
      <div className="fixed inset-0 z-0 bg-bg-100 bg-grid-pattern animate-grid pointer-events-none"></div>

      <Link
        to="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-text-200 hover:text-primary-100 transition-colors font-medium bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-bg-300 shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex min-h-[600px] relative z-10 border border-bg-300">
        {/* LEFT SIDE */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-primary-100 p-2 rounded-xl shadow-md shadow-primary-100/20">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-text-100">Gradely</span>
            </div>

            {/* VIEW 1: CHECK EMAIL */}
            {view === "check_email" && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="w-16 h-16 bg-primary-100/10 rounded-full flex items-center justify-center mb-6">
                  <Mail className="h-8 w-8 text-primary-100" />
                </div>
                <h2 className="text-3xl font-extrabold text-text-100 tracking-tight mb-3">
                  Check your email
                </h2>
                <p className="text-[15px] text-text-100 leading-relaxed mb-8">
                  We've sent a verification link to{" "}
                  <span className="font-bold">{email}</span>. Note: Verification
                  email will arrive from 'Supabase Auth', Please click the link
                  to activate your account.
                </p>
                <div className="p-4 bg-accent-100/10 rounded-xl text-xs text-accent-200 border border-accent-100/20 mb-6 flex gap-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Tip:</strong> If you don't see it within a minute,
                    check your spam folder.
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full h-12 font-bold"
                >
                  Return to Login
                </Button>
              </div>
            )}

            {/* VIEW 2: FORGOT PASSWORD */}
            {view === "forgot_password" && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                {resetSent ? (
                  <div>
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-text-100 tracking-tight mb-3">
                      Email Sent
                    </h2>
                    <p className="text-[15px] text-text-200 leading-relaxed mb-8">
                      Check your inbox for password reset instructions.
                    </p>
                    <Button
                      onClick={() => {
                        setView("auth");
                        setResetSent(false);
                      }}
                      className="w-full h-12 font-bold"
                    >
                      Back to Login
                    </Button>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-3xl font-extrabold text-text-100 tracking-tight mb-3">
                      Reset Password
                    </h2>
                    <p className="text-[15px] text-text-100 leading-relaxed mb-8">
                      Enter your email address and we'll send you a link to
                      reset your password.
                    </p>
                    {error && (
                      <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {error}
                      </div>
                    )}
                    <form onSubmit={handleResetPassword} className="space-y-5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-100 ml-1">
                          Email
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-text-200" />
                          </div>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-10 pr-4 py-3 bg-bg-100 border border-bg-300/70 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-100/20 focus:border-primary-100 outline-none transition-all placeholder-text-200/50 font-medium"
                            placeholder="user@email.com"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="w-full py-3 rounded-xl text-base font-bold shadow-lg shadow-primary-100/20"
                        disabled={loading}
                      >
                        {loading ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </form>
                    <button
                      onClick={() => setView("auth")}
                      className="w-full mt-6 text-sm font-bold text-text-200 hover:text-text-100 transition-colors"
                    >
                      Back to Login
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: MAIN AUTH */}
            {view === "auth" && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <h2 className="text-3xl font-extrabold text-text-100 tracking-tight mb-3">
                  {isLogin ? "Welcome back" : "Create account"}
                </h2>
                <p className="text-[15px] text-text-100 leading-relaxed mb-8">
                  {isLogin
                    ? "Log in to unlock your full academic history and access Dashboard analytics."
                    : "Create Account to save your academic record and unlock the Dashboard."}
                </p>

                {error && (
                  <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {error}
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleAuth}>
                  {!isLogin && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-xs font-bold text-text-100 ml-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-text-200" />
                        </div>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-bg-100 border border-bg-300/70 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-100/20 focus:border-primary-100 outline-none transition-all placeholder-text-200/50 font-medium"
                          placeholder="Your Name"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-text-100 ml-1">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-text-200" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-bg-100 border border-bg-300/70 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-100/20 focus:border-primary-100 outline-none transition-all placeholder-text-200/50 font-medium"
                        placeholder="user@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-xs font-bold text-text-100">
                        Password
                      </label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => setView("forgot_password")}
                          className="text-xs font-bold text-primary-100 hover:text-primary-200 hover:underline transition-colors flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3" /> Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-text-200" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-3 bg-bg-100 border border-bg-300/70 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-100/20 focus:border-primary-100 outline-none transition-all placeholder-text-200/50 font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-200 hover:text-primary-100 transition-colors cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-3 rounded-xl text-base font-bold shadow-lg shadow-primary-100/20 mt-2"
                    disabled={loading}
                  >
                    {loading
                      ? "Processing..."
                      : isLogin
                      ? "Log In"
                      : "Create Account"}
                  </Button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-[16px] text-text-100">
                    {isLogin
                      ? "Don't have an account? "
                      : "Already have an account? "}
                    <button
                      onClick={toggleMode}
                      className="font-bold text-primary-100 hover:text-primary-200 hover:underline transition-all"
                    >
                      {isLogin ? "Create Account" : "Log In"}
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: IMAGE */}
        <div className="hidden lg:block w-1/2 relative bg-gray-50">
          <img
            className="absolute inset-0 w-full h-full object-cover"
            src="/login_page2.png"
            alt="University Campus"
          />
        </div>
      </div>
    </div>
  );
}
