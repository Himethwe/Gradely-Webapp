import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ArrowRight,
  GraduationCap,
  Target,
  BookOpen,
  Calculator,
  X,
  LayoutDashboard,
  Info,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import api from "../api/axios";
import { supabase } from "../api/auth";

interface Degree {
  id: number;
  name: string;
  duration_years: number;
  total_credits: number;
}

export default function Home() {
  const navigate = useNavigate();

  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDegree, setSelectedDegree] = useState<Degree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  const [isVerifying, setIsVerifying] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const fetchDegrees = useCallback(async () => {
    try {
      const response = await api.get("/degrees");
      setDegrees(response.data);
      setError("");
    } catch (err: any) {
      console.error("Error fetching degrees:", err);
      setError("Server connection failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  //AUTH LISTENER
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes("access_token")) {
      setIsVerifying(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) setIsVerifying(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session) setIsVerifying(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  //Degree Data
  useEffect(() => {
    const savedId = localStorage.getItem("selectedDegreeId");
    if (degrees.length > 0 && savedId) {
      const foundDegree = degrees.find((d) => d.id.toString() === savedId);
      if (foundDegree) {
        setSelectedDegree(foundDegree);
        setSearchTerm(foundDegree.name);
      }
    }
  }, [degrees]);

  useEffect(() => {
    fetchDegrees();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fetchDegrees]);

  const filteredDegrees = degrees.filter((degree) =>
    degree.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  //Save to Storage directly on selection
  const handleSelectDegree = (degree: Degree) => {
    setSelectedDegree(degree);
    setSearchTerm(degree.name);
    setIsDropdownOpen(false);

    localStorage.setItem("selectedDegreeId", degree.id.toString());
    localStorage.setItem("selectedDegreeName", degree.name);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSelectedDegree(null);
    setIsDropdownOpen(true);
  };

  const handleStartGuestMode = () => {
    if (selectedDegree) {
      localStorage.setItem("selectedDegreeId", selectedDegree.id.toString());
      localStorage.setItem("selectedDegreeName", selectedDegree.name);
      navigate("/planner");
    }
  };

  return (
    <div className="flex flex-col font-sans relative min-h-[calc(100vh-4rem)] overflow-x-hidden">
      {/*BACKGROUND: ANIMATED GRID*/}
      <div className="fixed inset-0 z-0 bg-bg-100 bg-grid-pattern animate-grid pointer-events-none"></div>

      {/*HERO SECTION*/}
      <main className="relative w-full flex items-center min-h-[600px] overflow-visible z-30 pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full grid lg:grid-cols-2 gap-12 items-center relative">
          {/* LEFT COLUMN */}
          <div className="flex flex-col justify-center py-12">
            <div className="mb-8">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-text-100 leading-tight whitespace-nowrap">
                Your Academic Strategy,
              </h1>
              <span className="text-6xl lg:text-8xl font-handwriting text-text-100 mt-4 block tracking-wide">
                Simplified.
              </span>
            </div>

            <p className="text-lg text-text-100 leading-relaxed mb-8 max-w-lg">
              Instant GPA calculations without the wait. Gradely is your
              intelligent academic strategist, helping you track performance,
              analyze strengths, and map your path to your best possible degree
              classification.
            </p>

            {/*SMART STATUS PILL*/}
            {isVerifying ? (
              <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-bg-300 backdrop-blur-sm text-xs md:text-sm text-text-100 shadow-sm w-fit animate-pulse">
                <Loader2 className="w-4 h-4 text-primary-100 animate-spin" />
                <span>Verifying your account...</span>
              </div>
            ) : !user ? (
              // GUEST USER
              <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-bg-300 backdrop-blur-sm text-xs md:text-sm text-text-100 shadow-sm w-fit">
                <Info className="w-4 h-4 text-primary-100" />
                <span>
                  Using Guest Mode.{" "}
                  <button
                    onClick={() => navigate("/login")}
                    className="font-bold text-primary-100 hover:underline"
                  >
                    Log In
                  </button>{" "}
                  to auto-save & view Dashboard.
                </span>
              </div>
            ) : (
              // LOGGED IN USER
              <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-bg-300 backdrop-blur-sm text-xs md:text-sm text-text-100 shadow-sm w-fit animate-in fade-in slide-in-from-bottom-2">
                <LayoutDashboard className="w-4 h-4 text-primary-100" />
                <span>
                  Welcome back! Go to{" "}
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="font-bold text-primary-100 hover:underline"
                  >
                    Dashboard
                  </button>{" "}
                  for your personalized insights.
                </span>
              </div>
            )}

            {/*SEARCH ROW*/}
            <div
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 relative z-[50] max-w-2xl w-full"
              ref={searchRef}
            >
              <div className="relative flex-grow rounded-2xl shadow-lg shadow-primary-100/5 border border-bg-300 bg-white transition-all focus-within:shadow-xl focus-within:border-primary-100 focus-within:ring-4 focus-within:ring-primary-100/10">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-primary-100" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedDegree(null);
                    setIsDropdownOpen(true);
                  }}
                  className="block w-full pl-12 pr-12 text-base lg:text-lg rounded-2xl h-12 border-none focus:ring-0 outline-none placeholder-text-200 truncate bg-transparent font-medium"
                  placeholder={
                    loading ? "Loading..." : "Search for your degree..."
                  }
                  disabled={loading}
                />

                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-200 hover:text-red-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}

                {isDropdownOpen && filteredDegrees.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-bg-300 rounded-2xl shadow-2xl max-h-[200px] overflow-y-auto z-[100] p-2">
                    {filteredDegrees.map((degree) => (
                      <div
                        key={degree.id}
                        onClick={() => handleSelectDegree(degree)}
                        className="px-4 py-3 cursor-pointer hover:bg-bg-100 rounded-xl text-text-100 transition-colors flex flex-col justify-center"
                      >
                        <div className="font-bold text-base">{degree.name}</div>
                        <div className="text-xs text-text-200 mt-0.5 font-medium">
                          {degree.duration_years} Years • {degree.total_credits}{" "}
                          Credits
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleStartGuestMode}
                className="h-12 px-6 rounded-2xl text-base font-bold bg-accent-200 hover:bg-accent-100 shadow-xl shadow-accent-100/20 whitespace-nowrap transition-transform active:scale-95"
                disabled={!selectedDegree}
              >
                Start Calculating <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {error && (
              <p className="text-red-500 text-sm mt-4 font-bold bg-red-50 p-3 rounded-lg border border-red-100 inline-block">
                {error}
              </p>
            )}
          </div>

          {/* RIGHT COLUMN: The Image */}
          <div className="hidden lg:flex items-center justify-center h-full w-full p-8 relative z-0">
            <img
              src="/hero_bg5.png"
              alt="Gradely App Preview"
              className="w-full max-w-2xl object-contain drop-shadow-2xl lg:scale-110 transform transition-transform duration-700 hover:scale-115"
            />
          </div>
        </div>
      </main>

      {/*FEATURES SECTION*/}
      <div className="w-full bg-white py-16 rounded-t-[4rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.05)] z-20 relative">
        <div className="absolute top-20 left-20 opacity-[0.03] text-primary-100 pointer-events-none">
          <GraduationCap className="w-80 h-80 -rotate-12" />
        </div>
        <div className="absolute bottom-20 right-20 opacity-[0.03] text-accent-100 pointer-events-none">
          <Calculator className="w-64 h-64 rotate-12" />
        </div>

        <div className="max-w-[1600px] mx-auto px-6 md:px-20 lg:px-32 relative z-30">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-text-100 mb-4 tracking-tight">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg md:text-xl text-text-200 max-w-2xl mx-auto">
              A complete academic toolkit designed specifically for
              undergraduates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <FeatureCard
              icon={<ShieldCheck className="h-10 w-10" />}
              title="Cloud Sync & Privacy"
              description="Create an account to unlock the Dashboard and enable auto-saving across devices. Your academic data is encrypted, strictly private, and accessible only by you—ensuring your records are safe and permanent."
            />
            <FeatureCard
              icon={<BookOpen className="h-10 w-10" />}
              title="Smart Calculation Engine"
              description="Input your grades to get an instant GPA calculation. Toggle between 'Day Scholar' and 'Cadet' modes to filter Military subjects automatically. We handle complex logic like Repeat caps (max 2.0) and Medicals (uncapped) for you."
            />
            <FeatureCard
              icon={<Target className="h-10 w-10" />}
              title="Goal & Performance Analysis"
              description="Stop guessing. Select your target degree class (e.g., First Class), and we calculate exactly what grades you need next. We also categorize your past modules to visualize exactly which subject fields are your strengths or weaknesses."
            />
            <FeatureCard
              icon={<LayoutDashboard className="h-10 w-10" />}
              title="Visual Intelligence"
              description="Your personalized command center. View interactive charts with semester drill-downs to track trends. Get specific recovery strategies for pending Repeats and Medicals to ensure you maximize your final potential."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="bg-bg-100/50 backdrop-blur-sm p-10 rounded-[2.5rem] border border-bg-300 hover:border-primary-100/30 hover:shadow-2xl hover:shadow-primary-100/5 transition-all duration-500 hover:-translate-y-2 h-full flex flex-col group">
    <div className="p-5 bg-white rounded-2xl text-primary-100 w-fit mb-6 shadow-sm group-hover:bg-primary-100 group-hover:text-white transition-colors duration-300">
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-text-100 mb-4">{title}</h3>
    <p className="text-text-200 text-base leading-relaxed flex-grow">
      {description}
    </p>
  </div>
);
