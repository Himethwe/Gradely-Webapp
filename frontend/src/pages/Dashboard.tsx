import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label,
} from "recharts";
import {
  TrendingUp,
  Zap,
  LayoutDashboard,
  CheckCircle2,
  Lock,
  Loader2,
  ChevronLeft,
  MousePointerClick,
  AlertTriangle,
  Lightbulb,
  Dumbbell,
  BookOpen,
  ArrowLeft,
  Info,
  RefreshCcw,
  Stethoscope,
  Search,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import api from "../api/axios";
import { fetchStudentGrades } from "../api/grades";
import { supabase } from "../api/auth";
import {
  calculateGPA,
  calculateMaxPossibleGPA,
  getFutureInsights,
  getSemesterTrend,
  getModulesForSemester,
  groupModulesByYearAndSem,
  GRADE_SCALE,
} from "../utils/academic";

interface Module {
  id: number;
  name: string;
  credits: number;
  semester: number;
  year: number;
  category: string;
}

//RECOVERY ZONE COMPONENT
const RecoveryZone = ({
  modules,
  grades,
  repeats,
}: {
  modules: Module[];
  grades: Record<number, string>;
  repeats: Record<number, boolean>;
}) => {
  //Filter for ACTIVE issues only

  // Pending Repeats
  const pendingRepeats = modules.filter((m) => {
    const isRep = repeats[m.id];
    const g = grades[m.id];
    // Show only if it's a repeat AND (no grade OR placeholder string)
    return isRep && (!g || g === "REPEAT" || g === "REPEAT_PENDING");
  });

  // Pending Medicals: Grade is explicitly "MC" (not yet retaken/graded)
  const pendingMedicals = modules.filter((m) => grades[m.id] === "MC");

  if (pendingRepeats.length === 0 && pendingMedicals.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border-2 border-primary-100/40 p-6 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-6 h-6 text-primary-100" />
        <h2 className="text-[19px] font-bold text-text-100">
          Recovery Strategy
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* REPEATS STRATEGY - Grey Theme */}
        {pendingRepeats.length > 0 && (
          <div className="bg-bg-100 rounded-xl p-4 border border-bg-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-text-100 text-[15px">
                <RefreshCcw className="w-4 h-4 text-text-100" />
                <span>Pending Repeats ({pendingRepeats.length})</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-white px-2 py-1 rounded text-text-100 border border-bg-300">
                Capped at 2.0 (C)
              </span>
            </div>

            <p className="text-[13px] text-text-100 mb-3 leading-relaxed">
              <strong>Strategy: Efficiency.</strong> Since these are capped,
              aiming for an A+ yields 0 extra GPA. Focus on securing a safe Pass
              (C), and invest your energy into new subjects.
            </p>

            <div className="space-y-1">
              {pendingRepeats.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between items-center text-[13px] bg-white p-2 rounded border border-bg-300"
                >
                  <span className="font-medium text-text-100 truncate pr-2">
                    {m.name}
                  </span>
                  <span className="text-text-100 shrink-0">{m.credits} Cr</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEDICALS STRATEGY - Blue Theme (Opportunity) */}
        {pendingMedicals.length > 0 && (
          <div className="bg-primary-100/5 rounded-xl p-4 border border-primary-100/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-bold text-primary-100 text-[15px]">
                <Stethoscope className="w-4 h-4" />
                <span>Pending Medicals ({pendingMedicals.length})</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-white px-2 py-1 rounded text-primary-100 border border-primary-100/30">
                Uncapped Potential
              </span>
            </div>

            <p className="text-[13px] text-text-100 mb-3 leading-relaxed">
              <strong>Strategy: Maximization.</strong> These count as first
              attempts. Treat them as high-priority targets to boost your GPA
              significantly.
            </p>

            <div className="space-y-1">
              {pendingMedicals.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between items-center text-[13px] bg-white p-2 rounded border border-primary-100/30"
                >
                  <span className="font-medium text-text-100 truncate pr-2">
                    {m.name}
                  </span>
                  <span className="text-text-100 shrink-0">{m.credits} Cr</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Student");

  // Data State
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [grades, setGrades] = useState<Record<number, string>>({});
  const [repeats, setRepeats] = useState<Record<number, boolean>>({});

  // Interaction State
  const [selectedYear, setSelectedYear] = useState(1);
  const [selectedSem, setSelectedSem] = useState(1);
  const [drillDownSem, setDrillDownSem] = useState<string | null>(null);

  //Mobile Detection State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  //DATA FETCHING
  useEffect(() => {
    const loadDashboard = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const name = localStorage.getItem("user_name");
      if (name) setUserName(name.split(" ")[0]);

      //If ID is missing, just stop loading.
      const storedDegreeId = localStorage.getItem("selectedDegreeId");
      if (!storedDegreeId) {
        setLoading(false);
        return;
      }

      try {
        const modulesRes = await api.get(`/degrees/${storedDegreeId}/modules`);
        const modulesData = modulesRes.data;
        setAllModules(modulesData);

        const cloudGrades = await fetchStudentGrades();
        const gradesMap: Record<number, string> = {};
        const repeatsMap: Record<number, boolean> = {};

        if (cloudGrades) {
          cloudGrades.forEach((g: any) => {
            if (g.is_repeat) {
              repeatsMap[g.module_id] = true;
              gradesMap[g.module_id] = g.grade ? g.grade : "REPEAT";
            } else if (g.grade === "MC") {
              gradesMap[g.module_id] = "MC";
            } else if (g.grade) {
              gradesMap[g.module_id] = g.grade;
            }
          });
        }
        setGrades(gradesMap);
        setRepeats(repeatsMap);

        const grouped = groupModulesByYearAndSem(modulesData);
        let foundNext = false;
        for (const year of grouped) {
          for (const sem of year.semesters) {
            const hasGrades = sem.modules.some((m: any) => gradesMap[m.id]);
            if (!hasGrades) {
              setSelectedYear(year.year);
              setSelectedSem(sem.semester);
              foundNext = true;
              break;
            }
          }
          if (foundNext) break;
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  //CALCULATIONS
  const currentGPA = useMemo(
    () => calculateGPA(allModules, grades, repeats),
    [allModules, grades, repeats]
  );
  const maxPossible = useMemo(
    () => calculateMaxPossibleGPA(allModules, grades, repeats),
    [allModules, grades, repeats]
  );
  const trendData = useMemo(
    () => getSemesterTrend(allModules, grades, repeats),
    [allModules, grades, repeats]
  );

  const drillDownData = useMemo(() => {
    if (!drillDownSem) return [];
    const parts = drillDownSem.split(" ");
    const y = parseInt(parts[0].replace("Y", ""));
    const s = parseInt(parts[1].replace("S", ""));
    const semModules = getModulesForSemester(allModules, y, s);
    return semModules.map((m) => {
      const g = grades[m.id];
      const isRep = repeats[m.id];
      let val = 0;
      if (g && g !== "MC" && g !== "REPEAT" && GRADE_SCALE[g] !== undefined) {
        val = GRADE_SCALE[g];
        if (isRep) val = Math.min(val, 2.0);
      }
      return { name: m.name, grade: val, letter: g || "-" };
    });
  }, [drillDownSem, allModules, grades, repeats]);

  const groupedCurriculum = useMemo(
    () => groupModulesByYearAndSem(allModules),
    [allModules]
  );

  const insight = useMemo(() => {
    return getFutureInsights(allModules, grades, repeats, {
      year: selectedYear,
      semester: selectedSem,
    });
  }, [selectedYear, selectedSem, allModules, grades, repeats]);

  const selectedModules = useMemo(() => {
    return getModulesForSemester(allModules, selectedYear, selectedSem);
  }, [allModules, selectedYear, selectedSem]);

  const getClassification = (gpaStr: string) => {
    const gpa = parseFloat(gpaStr);
    if (gpa >= 3.7) return "First Class";
    if (gpa >= 3.3) return "Second Upper";
    if (gpa >= 3.0) return "Second Lower";
    if (gpa >= 2.0) return "General Pass";
    return "Not Classified";
  };

  const currentClass = getClassification(currentGPA);
  const maxClass = getClassification(maxPossible);

  const progressStats = useMemo(() => {
    let earned = 0;
    let total = 0;
    allModules.forEach((m) => {
      total += m.credits;
      if (
        grades[m.id] &&
        grades[m.id] !== "MC" &&
        grades[m.id] !== "REPEAT" &&
        grades[m.id] !== "REPEAT_PENDING"
      ) {
        earned += m.credits;
      }
    });
    return {
      earned,
      total,
      percent: total === 0 ? 0 : Math.round((earned / total) * 100),
    };
  }, [allModules, grades]);

  //LOADER
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-100">
        <Loader2 className="w-10 h-10 text-primary-100 animate-spin" />
      </div>
    );
  }

  if (!loading && allModules.length === 0) {
    return (
      <div className="min-h-screen bg-bg-100 font-sans relative flex items-center justify-center p-4">
        <div className="fixed inset-0 z-0 bg-bg-100 bg-grid-pattern animate-grid pointer-events-none"></div>
        <div className="relative z-10 bg-white p-8 rounded-3xl shadow-xl border border-primary-100/20 max-w-md text-center">
          <div className="bg-primary-100/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-primary-100" />
          </div>
          <h2 className="text-2xl font-bold text-text-100 mb-2">
            No Degree Selected
          </h2>
          <p className="text-text-200 mb-6 leading-relaxed">
            Please select your degree from the Home page to view your academic
            insights.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="w-full h-12 rounded-xl text-base font-bold bg-primary-100 hover:bg-primary-200 shadow-lg shadow-primary-100/20"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  //MAIN DASHBOARD RENDER
  return (
    <div className="min-h-screen bg-bg-100 font-sans relative pb-20">
      <div className="fixed inset-0 z-0 bg-bg-100 bg-grid-pattern animate-grid pointer-events-none"></div>

      <style>{`
        .recharts-wrapper *:focus { outline: none !important; }
        .recharts-surface:focus { outline: none !important; }
        path:focus { outline: none !important; }
      `}</style>

      {/*HEADER*/}
      <div className="mx-auto max-w-7xl px-4 mt-4 transition-all duration-300">
        <div className="bg-gradient-to-r from-white via-primary-100/10 to-white backdrop-blur-md rounded-3xl border-2 border-primary-100/40 shadow-sm hover:shadow-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="pl-0 mb-1 h-auto py-0 hover:bg-transparent text-text-200 hover:text-primary-100 group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />{" "}
              Back to Home
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold font-sans text-text-100 flex items-center gap-2">
              <LayoutDashboard className="h-8 w-8 text-primary-100" />
              Dashboard
            </h1>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-sm text-text-200 font-bold uppercase tracking-wider">
              Student
            </div>
            <div className="text-lg font-bold text-text-100">{userName}</div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10 space-y-8">
        {/*ZONE 1: THE PULSE*/}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Current GPA */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-primary-100/40 relative overflow-hidden flex flex-col justify-between h-40 group hover:shadow-md transition-all">
            <div>
              <div className="flex items-center gap-2 text-[14px] font-bold text-text-100 uppercase tracking-widest mb-1">
                Current GPA
              </div>
              <div className="text-5xl font-extrabold text-primary-100 tracking-tight">
                {currentGPA}
              </div>
            </div>
            <div className="mt-2">
              <span
                className={`px-2 py-1 rounded-md text-xs font-bold border ${
                  currentClass.includes("First")
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-primary-100/10 text-primary-100 border-primary-100/20"
                }`}
              >
                {currentClass}
              </span>
            </div>
          </div>

          {/* Card Progress (Blue Gradient) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-primary-100/40 flex items-center justify-between h-40 group hover:shadow-md transition-all">
            <div>
              <div className="text-[13px] font-bold text-text-100 uppercase tracking-widest mb-1">
                Progress
              </div>
              <div className="text-[26px] font-bold text-text-100">
                {progressStats.earned}{" "}
                <span className="text-base text-text-200 font-medium">
                  / {progressStats.total}
                </span>
              </div>
              <div className="text-[13px] text-text-200 mt-1">
                Credits Earned
              </div>
            </div>
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <defs>
                  <linearGradient
                    id="progressGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#0077C2" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="#f3f4f6"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={226}
                  strokeDashoffset={226 - (226 * progressStats.percent) / 100}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-[20px] text-primary-100">
                {progressStats.percent}%
              </div>
            </div>
          </div>

          {/* Card Ceiling (Max Potential) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-primary-100/40 relative overflow-hidden flex flex-col justify-between h-40 group hover:shadow-md transition-all">
            <div>
              <div className="flex items-center gap-2 text-[13px] font-bold text-text-100 uppercase tracking-widest mb-1">
                Max Potential
              </div>
              <div className="text-5xl font-extrabold text-primary-100 tracking-tight">
                {maxPossible}
              </div>
            </div>
            <div className="mt-2">
              <span className="px-2 py-1 rounded-md text-xs font-bold bg-bg-200 text-text-200 border border-bg-300 block w-fit mb-1">
                Ceiling: {maxClass}
              </span>
              <div className="text-[12px] text-text-100 leading-tight">
                Calculated assuming 4.0 (A+) in all future modules.
              </div>
            </div>
          </div>
        </div>

        {/*ZONE 2: FUTURE TERRAIN*/}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/*TABBED ROADMAP */}
          <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-primary-100/40 p-6 shadow-sm flex flex-col min-h-[400px]">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-6 h-6 text-primary-100" />
              <div>
                <h2 className="text-[19px] font-bold text-text-100">
                  Degree Roadmap
                </h2>
                <p className="text-[12px] text-text-100 font-medium">
                  Select a semester below to view syllabus & intel.
                </p>
              </div>
            </div>

            {/* Year Tabs */}
            <div className="flex gap-2 mb-6 border-b border-bg-300 pb-1">
              {groupedCurriculum.map((group) => (
                <button
                  key={group.year}
                  onClick={() => {
                    setSelectedYear(group.year);
                    setSelectedSem(group.semesters[0].semester);
                  }}
                  className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${
                    selectedYear === group.year
                      ? "text-primary-100 border-b-2 border-primary-100 bg-primary-100/5"
                      : "text-text-200 hover:text-text-100 hover:bg-bg-200"
                  }`}
                >
                  Year {group.year}
                </button>
              ))}
            </div>

            {/* Semester Selector */}
            <div className="flex gap-3 mb-6">
              {groupedCurriculum
                .find((y) => y.year === selectedYear)
                ?.semesters.map((sem) => {
                  const isCompleted = sem.modules.every(
                    (m) => grades[m.id] && grades[m.id] !== "MC"
                  );
                  const isActive = selectedSem === sem.semester;
                  return (
                    <button
                      key={sem.semester}
                      onClick={() => setSelectedSem(sem.semester)}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                        isActive
                          ? "border-primary-100 bg-primary-100 text-white shadow-md"
                          : "border-bg-300 bg-white text-text-200 hover:border-primary-200"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4 opacity-50" />
                      )}
                      <span className="font-bold text-sm">
                        Semester {sem.semester}
                      </span>
                    </button>
                  );
                })}
            </div>

            {/* Module Table */}
            <div className="flex-1 bg-bg-100/50 rounded-xl border border-bg-300 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-200 text-text-200 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Cat</th>
                    <th className="px-4 py-3 text-right">Cr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg-300">
                  {selectedModules.map((mod) => (
                    <tr
                      key={mod.id}
                      className="bg-white hover:bg-bg-100 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-text-100">
                        {mod.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] uppercase font-bold bg-bg-200 px-2 py-1 rounded text-text-200">
                          {mod.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-text-200">
                        {mod.credits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/*INTEL */}
          <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-primary-100/40 p-6 shadow-sm flex flex-col min-h-[400px]">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-6 h-6 text-accent-100" />
              <div>
                <h2 className="text-[19px] font-bold text-text-100">
                  Intel:{" "}
                  <span className="text-primary-100">
                    Year {selectedYear} Sem {selectedSem}
                  </span>
                </h2>
                <div className="flex items-center gap-1 text-[12px] text-text-100 font-medium">
                  <Info className="w-3 h-3" />
                  Analysis based on your past performance in similar categories.
                </div>
              </div>
            </div>

            {insight ? (
              <div className="flex flex-col gap-6 h-full">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-text-200 uppercase">
                    <span>Module Mix</span>
                    <span>{insight.counts.total} Modules</span>
                  </div>
                  <div className="flex h-4 rounded-full overflow-hidden w-full bg-bg-200">
                    <div
                      style={{
                        width: `${
                          (insight.counts.strong / insight.counts.total) * 100
                        }%`,
                      }}
                      className="bg-green-500 h-full"
                    ></div>
                    <div
                      style={{
                        width: `${
                          (insight.counts.weak / insight.counts.total) * 100
                        }%`,
                      }}
                      className="bg-red-500 h-full"
                    ></div>
                    <div
                      style={{
                        width: `${
                          (insight.counts.new / insight.counts.total) * 100
                        }%`,
                      }}
                      className="bg-gray-400 h-full"
                    ></div>
                  </div>
                  <div className="flex gap-4 text-[11px] font-bold text-text-100 justify-center">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>{" "}
                      Strong ({insight.counts.strong})
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>{" "}
                      Risk ({insight.counts.weak})
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>{" "}
                      New ({insight.counts.new})
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-thin">
                  {insight.tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border border-l-4 text-sm ${
                        tip.type === "strength"
                          ? "bg-green-50 border-green-200 border-l-green-500"
                          : tip.type === "risk"
                          ? "bg-red-50 border-red-200 border-l-red-500"
                          : "bg-blue-50 border-blue-200 border-l-blue-500"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 font-bold">
                        {tip.type === "strength" && (
                          <Dumbbell className="w-4 h-4 text-green-600" />
                        )}
                        {tip.type === "risk" && (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        {tip.type === "strategy" && (
                          <Lightbulb className="w-4 h-4 text-blue-600" />
                        )}
                        <span
                          className={
                            tip.type === "strength"
                              ? "text-green-800"
                              : tip.type === "risk"
                              ? "text-red-800"
                              : "text-blue-800"
                          }
                        >
                          {tip.title}
                        </span>
                      </div>
                      <p className="text-text-100 leading-snug">{tip.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-200 italic text-sm text-center">
                Select a future semester to generate strategy.
              </div>
            )}
          </div>
        </div>

        {/*ZONE 3: RECOVERY ZONE*/}
        {/* Only appears if you have Pending Repeats or Medicals */}
        <RecoveryZone modules={allModules} grades={grades} repeats={repeats} />

        {/*ZONE 4: CHART*/}
        <div className="bg-white rounded-2xl border-2 border-primary-100/40 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary-100" />
                <h2 className="text-[19px] font-bold text-text-100">
                  {drillDownSem
                    ? `Details: ${drillDownSem}`
                    : "Performance Trend"}
                </h2>
              </div>

              {!drillDownSem && (
                <div className="flex items-center gap-2 text-[13px] text-text-100 mt-1">
                  <MousePointerClick className="w-3 h-3" />
                  <span>Click columns to drill down</span>
                </div>
              )}
            </div>

            {drillDownSem && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDrillDownSem(null)}
                className="flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Overview
              </Button>
            )}
          </div>

          <div
            className={`h-80 w-full relative ${
              !drillDownSem ? "cursor-pointer" : ""
            }`}
          >
            {!drillDownSem && trendData.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-text-200 bg-bg-100/30 rounded-xl border border-dashed border-bg-300 z-10">
                <MousePointerClick className="w-8 h-8 mb-2 opacity-50" />
                <p>Complete a semester to see your trend.</p>
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout={isMobile && drillDownSem ? "vertical" : "horizontal"}
                data={drillDownSem ? drillDownData : trendData}
                onClick={(state) => {
                  if (!drillDownSem && state && state.activeLabel) {
                    setDrillDownSem(String(state.activeLabel));
                  }
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f3f4f6"
                />
                <XAxis
                  type={isMobile && drillDownSem ? "number" : "category"}
                  dataKey={isMobile && drillDownSem ? undefined : "name"}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 700 }}
                  dy={10}
                  interval={0}
                  domain={[0, 4]}
                />
                <YAxis
                  type={isMobile && drillDownSem ? "category" : "number"}
                  dataKey={isMobile && drillDownSem ? "name" : undefined}
                  domain={[0, 4]}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile && drillDownSem ? 100 : 40}
                  tick={{
                    fill: "#6b7280",
                    fontSize: isMobile && drillDownSem ? 10 : 12,
                    fontWeight: 700,
                  }}
                />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <ReferenceLine
                  x={isMobile && drillDownSem ? 3.7 : undefined}
                  y={!(isMobile && drillDownSem) ? 3.7 : undefined}
                  stroke="#fbbf24"
                  strokeDasharray="3 3"
                >
                  <Label
                    value="Target: First Class"
                    position="insideTopRight"
                    fill="#d97706"
                    fontSize={10}
                    fontWeight="bold"
                  />
                </ReferenceLine>

                <Bar
                  dataKey={drillDownSem ? "grade" : "gpa"}
                  radius={
                    isMobile && drillDownSem ? [0, 6, 6, 0] : [6, 6, 0, 0]
                  }
                  barSize={drillDownSem ? 20 : 40}
                  animationDuration={800}
                  style={{ outline: "none" }}
                >
                  {(drillDownSem ? drillDownData : trendData).map(
                    (entry: any, index: number) => {
                      const val = drillDownSem ? entry.grade : entry.gpa;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            val >= 3.7
                              ? "#0077C2"
                              : val >= 3.0
                              ? "#59a5f5"
                              : "#94a3b8"
                          }
                          style={{ outline: "none" }}
                        />
                      );
                    }
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
