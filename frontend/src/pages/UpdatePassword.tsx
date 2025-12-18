import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/auth";
import { Button } from "../components/ui/Button";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Ensure user is authenticated (via the reset link)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If no session, link might be invalid or expired
        setError("Invalid or expired reset link. Please request a new one.");
      }
    });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      // Auto redirect after 2 seconds
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-100 font-sans flex items-center justify-center p-4 relative">
      <div className="fixed inset-0 z-0 bg-bg-100 bg-grid-pattern animate-grid pointer-events-none"></div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-12 relative z-10 border border-bg-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary-100" />
          </div>
          <h2 className="text-2xl font-extrabold text-text-100">
            Set New Password
          </h2>
          <p className="text-text-200 mt-2 text-sm">
            Enter your new password below.
          </p>
        </div>

        {success ? (
          <div className="text-center animate-in fade-in zoom-in-95">
            <div className="p-4 bg-green-50 text-green-700 rounded-xl mb-4 border border-green-100 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Password Updated!</span>
            </div>
            <p className="text-sm text-text-200">Redirecting to home...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-100 ml-1">
                New Password
              </label>
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
              className="w-full py-3 rounded-xl text-base font-bold shadow-lg shadow-primary-100/20"
              disabled={loading || !!error}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
