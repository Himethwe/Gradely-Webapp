import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Target,
  TrendingUp,
  Calculator,
  AlertCircle,
  Award,
  Lightbulb,
  Layers,
  BarChart3,
  CheckCircle2,
  ArrowUpRight,
  Trophy,
  CheckCircle,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ComposedChart,
  Line,
} from "recharts";
import api from "../api/axios";
import { GRADE_SCALE, calculateGPA } from "../utils/academic";

// Helper to check for NGPA
const isNonGpaModule = (val: any) => {
  if (val === false) return true;
  if (val === 0) return true;
  if (typeof val === "string") {
    if (val.toLowerCase() === "false") return true;
    if (val === "0") return true;
  }
  return false;
};

// Recommendations Logic
const getRecommendation = (category: string, score: number) => {
  if (score >= 3.5)
    return [
      `You're a natural at ${category}! Keep up the momentum.`,
      "Since you excel here, consider taking advanced electives.",
      "This strength is a perfect candidate for your final year project.",
    ];

  if (score >= 2.7)
    return [
      `You have a solid foundation in ${category}.`,
      "Small adjustments to your routine could turn these good grades into great ones.",
      "Focus on the higher-credit modules here to maximize your GPA impact.",
    ];

  return [
    `${category} seems tricky right now, but you can turn it around.`,
    "Try allocating a little extra time each week specifically for this.",
    "Don't hesitate to reach out to lecturers or peers for help early on.",
  ];
};

interface Module {
  id: number;
  name: string;
  credits: number;
  year: number;
  semester: number;
  category: string;
  is_gpa?: any;
}

export default function Strategist() {
  const navigate = useNavigate();

  //STATE
  const [loading, setLoading] = useState(true);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [grades, setGrades] = useState<Record<number, string>>({});
  const [suppGrades, setSuppGrades] = useState<Record<number, string>>({});
  const [targetGPA, setTargetGPA] = useState<number>(3.7);

  // Student Type for filtering
  const [studentType, _setStudentType] = useState<"day" | "cadet">(() => {
    return (localStorage.getItem("studentType") as "day" | "cadet") || "day";
  });

  //SCROLL TO TOP ON MOUNT
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  //DATA LOADING LOGIC
  useEffect(() => {
    const storedDegreeId = localStorage.getItem("selectedDegreeId");
    // Check if user is logged in
    const token = localStorage.getItem("access_token");

    if (!storedDegreeId) {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Modules
        const modulesResponse = await api.get(
          `/degrees/${storedDegreeId}/modules`
        );
        setAllModules(modulesResponse.data);

        // 2. Fetch Grades
        if (token) {
          // A. LOGGED IN USER: Fetch from Database
          const gradesResponse = await api.get("/grades");

          const dbGrades: Record<number, string> = {};
          const dbSupp: Record<number, string> = {};

          gradesResponse.data.forEach((g: any) => {
            if (g.is_repeat) {
              if (g.grade && g.grade !== "REPEAT_PENDING") {
                dbSupp[g.module_id] = g.grade;
              }

              // Ensure main grade map knows it's a repeat
              if (!dbGrades[g.module_id]) {
                dbGrades[g.module_id] = "REPEAT";
              }
            } else {
              dbGrades[g.module_id] = g.grade;
            }
          });

          setGrades(dbGrades);
          setSuppGrades(dbSupp);
        } else {
          // B. GUEST USER: Fetch from LocalStorage
          const storedGrades = localStorage.getItem("guestGrades");
          const storedSupp = localStorage.getItem("guestSuppGrades");
          if (storedGrades) setGrades(JSON.parse(storedGrades));
          if (storedSupp) setSuppGrades(JSON.parse(storedSupp));
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  //HELPER Convert Number back to Letter Grade
  const getClosestGrade = (gpa: number) => {
    if (gpa > 4.0) return "Requires > 4.0";
    if (gpa < 0) return "Target Secured";

    let closestGrade = "E";
    let minDiff = 100;

    Object.entries(GRADE_SCALE).forEach(([grade, value]) => {
      if (grade === "REPEAT" || grade === "REPEAT_PENDING") return;

      const diff = Math.abs(gpa - value);
      if (diff < minDiff) {
        minDiff = diff;
        closestGrade = grade;
      }
    });
    return closestGrade;
  };

  //CORE LOGIC
  const stats = useMemo(() => {
    //Filter Modules
    const relevantModules = allModules.filter((m) =>
      studentType === "cadet" ? true : m.category !== "Military"
    );

    //Construct Effective Grades
    const effectiveRepeats: Record<number, boolean> = {};
    const effectiveGrades: Record<number, string> = {};

    Object.keys(grades).forEach((key: any) => {
      const id = Number(key);
      const status = grades[id];

      if (!status) return;

      if (status === "REPEAT") {
        effectiveRepeats[id] = true;

        if (suppGrades[id]) {
          effectiveGrades[id] = suppGrades[id];
        } else {
          effectiveGrades[id] = "REPEAT";
        }
      } else if (status === "MC") {
        if (suppGrades[id]) {
          effectiveGrades[id] = suppGrades[id];
        } else {
          effectiveGrades[id] = "MC";
        }
      } else {
        effectiveGrades[id] = status;
      }
    });

    // Calculate GPA
    const currentGPAString = calculateGPA(
      relevantModules,
      effectiveGrades,
      effectiveRepeats
    );
    const currentGPA = parseFloat(currentGPAString);

    //CHART & TREND DATA GENERATION
    let completedCredits = 0;
    let remainingCredits = 0;

    const categoryMap: Record<string, { total: number; count: number }> = {};
    const semesterMap: Record<
      string,
      {
        totalPoints: number;
        totalCredits: number;
        modules: { name: string; grade: string }[];
      }
    > = {};

    relevantModules.forEach((mod) => {
      if (isNonGpaModule(mod.is_gpa)) return;

      const grade = effectiveGrades[mod.id];
      const isRepeat = effectiveRepeats[mod.id];

      if (grade === "MC") {
        remainingCredits += mod.credits;
        return;
      }

      // Check for valid grade OR unresolved Repeat
      const isValidGrade = grade && GRADE_SCALE[grade] !== undefined;
      const isUnresolvedRepeat = grade === "REPEAT";

      if (isValidGrade || isUnresolvedRepeat) {
        let points = 0;

        if (isUnresolvedRepeat) {
          points = 0.0;
        } else {
          points = GRADE_SCALE[grade];
          // Cap repeats at 2.0 (C)
          if (isRepeat) points = Math.min(points, 2.0);
        }

        completedCredits += mod.credits;

        const cat = mod.category || "General";
        if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
        categoryMap[cat].total += points;
        categoryMap[cat].count += 1;

        const semKey = `Y${mod.year} S${mod.semester}`;
        if (!semesterMap[semKey])
          semesterMap[semKey] = {
            totalPoints: 0,
            totalCredits: 0,
            modules: [],
          };
        semesterMap[semKey].totalPoints += points * mod.credits;
        semesterMap[semKey].totalCredits += mod.credits;

        semesterMap[semKey].modules.push({
          name: mod.name,
          grade: isUnresolvedRepeat
            ? "REPEAT"
            : isRepeat
            ? `${grade} (R)`
            : grade,
        });
      } else {
        remainingCredits += mod.credits;
      }
    });

    const totalCredits = completedCredits + remainingCredits;

    const currentPoints = currentGPA * completedCredits;

    const totalPointsNeeded = targetGPA * totalCredits;
    const pointsStillNeeded = totalPointsNeeded - currentPoints;
    const requiredAvg =
      remainingCredits === 0 ? 0 : pointsStillNeeded / remainingCredits;

    const isDegreeComplete = remainingCredits === 0;
    const isTargetAchieved = currentGPA >= targetGPA;
    const isDone = requiredAvg < 0;
    const isImpossible = requiredAvg > 4.0;
    const isPossible = !isImpossible && !isDone;

    const radarData = Object.keys(categoryMap).map((key) => ({
      subject: key,
      A: parseFloat(
        (categoryMap[key].total / categoryMap[key].count).toFixed(2)
      ),
      fullMark: 4,
    }));

    const trendData = Object.keys(semesterMap)
      .sort()
      .map((key) => ({
        name: key,
        gpa: parseFloat(
          (
            semesterMap[key].totalPoints / semesterMap[key].totalCredits
          ).toFixed(2)
        ),
        modules: semesterMap[key].modules,
      }));

    const sortedRadar = [...radarData].sort((a, b) => a.A - b.A);
    const weakestScore = sortedRadar[0]?.A;
    const strongestScore = sortedRadar[sortedRadar.length - 1]?.A;

    const weakest = sortedRadar.filter((r) => r.A === weakestScore);
    const strongest = sortedRadar.filter((r) => r.A === strongestScore);

    return {
      completedCredits,
      remainingCredits,
      totalCredits,
      currentGPA,
      requiredAvg,
      isPossible,
      isDone,
      isDegreeComplete,
      isTargetAchieved,
      requiredGrade: getClosestGrade(requiredAvg),
      radarData,
      trendData,
      weakest,
      strongest,
    };
  }, [allModules, grades, suppGrades, targetGPA, studentType]);

  const getTargetColor = (gpa: number) => {
    if (gpa >= 3.7) return "text-primary-100";
    if (gpa >= 3.3) return "text-primary-200";
    if (gpa >= 3.0) return "text-accent-200";
    return "text-text-100";
  };

  const getClassStyle = (value: number) => {
    const isSelected = targetGPA === value;
    if (isSelected) {
      if (value === 3.7)
        return "bg-primary-100 text-white shadow-md ring-2 ring-primary-100 ring-offset-2 border-primary-100";
      if (value === 3.3)
        return "bg-primary-200 text-white shadow-md ring-2 ring-primary-200 ring-offset-2 border-primary-200";
      if (value === 3.0)
        return "bg-accent-200 text-white shadow-md ring-2 ring-accent-200 ring-offset-2 border-accent-200";
      return "bg-accent-100 text-white shadow-md ring-2 ring-accent-100 ring-offset-2 border-accent-100";
    }
    return "bg-white border-2 border-bg-300 text-text-200 hover:border-primary-100/50 hover:text-primary-100";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-100 text-primary-100 font-sans">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="animate-pulse">Loading Strategy Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-100 font-sans relative">
      <div className="fixed inset-0 z-0 bg-bg-100 bg-grid-pattern animate-grid pointer-events-none"></div>

      {/*HEADER*/}
      <div className="sticky top-4 z-40 mx-auto max-w-7xl px-4 transition-all duration-300 hover:-translate-y-1">
        <div className="bg-gradient-to-r from-white via-primary-100/10 to-white backdrop-blur-md rounded-3xl border border-primary-100/20 shadow-sm hover:shadow-md px-6 py-4 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/planner")}
              className="pl-0 mb-1 h-auto py-0 hover:bg-transparent text-text-200 hover:text-primary-100 group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />{" "}
              Back to Record
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold font-sans text-text-100 flex items-center gap-2">
              <Target className="h-8 w-8 text-primary-100" />
              Strategist
            </h1>
          </div>
        </div>
      </div>

      {/*MAIN CONTENT*/}
      <main className="max-w-7xl mx-auto px-4 py-4 lg:py-8 relative z-10 space-y-6 lg:space-y-8 pb-32">
        {/*TARGET & STATS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* TARGET SELECTION CARD */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 lg:p-8 shadow-md border border-primary-100/40 text-center relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <div className="bg-primary-100/5 rounded-2xl py-8 mb-8 border border-primary-100/30">
                <h2 className="text-[16px] font-bold font-sans text-text-100 uppercase tracking-widest mb-4">
                  My Target GPA
                </h2>
                <div
                  className={`text-[90px] font-extrabold transition-colors duration-300 leading-none ${getTargetColor(
                    targetGPA
                  )}`}
                >
                  {targetGPA.toFixed(2)}
                </div>
              </div>

              <div className="text-left mb-4">
                <h3 className="text-sm font-bold text-text-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-100" />
                  Set Your Goal
                </h3>
                <p className="text-[13px] text-text-100 mt-1">
                  Select your desired degree classification to calculate the
                  required performance for your remaining modules.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTargetGPA(3.7)}
                  className={`flex flex-col items-center justify-center p-4 h-28 rounded-xl transition-all duration-200 ${getClassStyle(
                    3.7
                  )}`}
                >
                  <Award className="w-5 h-5 mb-1" />
                  <div className="font-bold text-[15px] lg:text-base">
                    First Class
                  </div>
                  <div className="text-xs opacity-80 mt-1 font-medium">
                    3.70
                  </div>
                </button>

                <button
                  onClick={() => setTargetGPA(3.3)}
                  className={`flex flex-col items-center justify-center p-4 h-28 rounded-xl transition-all duration-200 ${getClassStyle(
                    3.3
                  )}`}
                >
                  <div className="font-bold text-[15px] lg:text-base">
                    Second Upper
                  </div>
                  <div className="text-xs opacity-80 mt-1 font-medium">
                    3.30
                  </div>
                </button>

                <button
                  onClick={() => setTargetGPA(3.0)}
                  className={`flex flex-col items-center justify-center p-4 h-28 rounded-xl transition-all duration-200 ${getClassStyle(
                    3.0
                  )}`}
                >
                  <div className="font-bold text-[15px] lg:text-base">
                    Second Lower
                  </div>
                  <div className="text-xs opacity-80 mt-1 font-medium">
                    3.00
                  </div>
                </button>

                <button
                  onClick={() => setTargetGPA(2.0)}
                  className={`flex flex-col items-center justify-center p-4 h-28 rounded-xl transition-all duration-200 ${getClassStyle(
                    2.0
                  )}`}
                >
                  <div className="font-bold text-[15px] lg:text-base">
                    General Pass
                  </div>
                  <div className="text-xs opacity-80 mt-1 font-medium">
                    2.00
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/*STATS COLUMN */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/*VERDICT CARD */}
            {stats.isDegreeComplete ? (
              <div
                className={`rounded-2xl p-6 shadow-lg border relative overflow-hidden flex-1 flex flex-col justify-center transition-all duration-300 ${
                  stats.isTargetAchieved
                    ? "bg-primary-100 text-white border-primary-200"
                    : "bg-bg-100 text-text-100 border-bg-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2 opacity-90">
                  {stats.isTargetAchieved ? (
                    <Trophy className="h-6 w-6 text-yellow-300" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-primary-100" />
                  )}
                  <span className="text-[13px] font-bold uppercase">
                    Final Verdict
                  </span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight leading-tight">
                  {stats.isTargetAchieved
                    ? "Target Achieved!"
                    : "Degree Concluded"}
                </div>
                <div className="text-sm font-medium opacity-90 mt-2">
                  Final GPA:{" "}
                  <span className="text-xl font-bold">
                    {stats.currentGPA.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-2xl p-6 shadow-lg border relative overflow-hidden flex-1 flex flex-col justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  stats.isPossible || stats.isDone
                    ? "bg-primary-100 text-white border-primary-200"
                    : "bg-bg-300 text-text-100 border-bg-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2 opacity-90">
                  {stats.isPossible || stats.isDone ? (
                    <Target className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span className="text-[13px] font-bold uppercase">
                    Required Average
                  </span>
                </div>
                <div
                  className={`text-5xl font-extrabold tracking-tighter ${
                    !stats.isPossible && !stats.isDone ? "text-4xl" : ""
                  }`}
                >
                  {stats.requiredGrade}
                </div>
                {stats.isPossible && !stats.isDone && (
                  <div className="text-sm font-medium opacity-80 mt-1 mb-2">
                    (Approx. GPA {stats.requiredAvg.toFixed(2)})
                  </div>
                )}
                <p className="text-[13px] font-medium opacity-90 leading-snug border-t border-white/20 pt-2 mt-auto">
                  {stats.isDone
                    ? "Congratulations! You have already mathematically secured this target."
                    : stats.isPossible
                    ? "You need to maintain this average grade for all remaining modules."
                    : "Target requires > 4.0 GPA. Try lowering the target slightly."}
                </p>
              </div>
            )}

            {/*CURRENT STATUS */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-primary-100/40 flex-1 flex flex-col justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <div className="flex items-center gap-2 mb-2 text-primary-100">
                <Calculator className="h-5 w-5" />
                <span className="text-[14px] font-bold uppercase">
                  Current GPA
                </span>
              </div>
              <div className="text-[40px] font-bold text-text-100">
                {stats.currentGPA.toFixed(2)}
              </div>
              <div className="text-[13px] text-text-100 mt-1">
                Based on {stats.completedCredits} credits
              </div>
            </div>

            {/*WORK CARD */}
            {stats.isDegreeComplete ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-primary-100/40 flex-1 flex flex-col justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center gap-2 mb-2 text-primary-100">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-[14px] font-bold uppercase">
                    Total Credits
                  </span>
                </div>
                <div className="text-[40px] font-bold text-text-100">
                  {stats.completedCredits}
                </div>
                <div className="text-[13px] text-text-100 mt-1">
                  All modules completed.
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-primary-100/40 flex-1 flex flex-col justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center gap-2 mb-2 text-primary-100">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-[14px] font-bold uppercase">
                    Remaining Work
                  </span>
                </div>
                <div className="text-[40px] font-bold text-text-100">
                  {stats.remainingCredits}
                </div>
                <div className="text-[13px] text-text-100 mt-1">
                  Credits left to complete
                </div>
              </div>
            )}
          </div>
        </div>

        {/*FIELD MASTERY & INSIGHTS*/}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* RADAR CHART */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-primary-100/40 flex flex-col items-center">
            <div className="w-full mb-4">
              <h3 className="font-bold text-[22px] text-text-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-100" />
                {stats.isDegreeComplete
                  ? "Final Skill Profile"
                  : "Field Mastery"}
              </h3>
              <p className="text-[13px] text-text-100 mt-1">
                Performance by subject category (calculated from module
                combinations).
              </p>
            </div>

            <div className="w-full h-80 text-xs">
              {stats.radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="75%"
                    data={stats.radarData}
                  >
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{
                        fill: "#6b7280",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 4]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="Field GPA"
                      dataKey="A"
                      stroke="#2563eb"
                      fill="#2563eb"
                      fillOpacity={0.4}
                      style={{ outline: "none" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-100 italic bg-bg-100/50 rounded-xl border border-dashed border-bg-300">
                  <span>No data yet.</span>
                  <span className="text-xs mt-1">
                    Complete modules to see your field analysis.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* INSIGHTS CARD */}
          <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-primary-100/40 relative overflow-hidden flex flex-col gap-6">
            <div>
              <h3 className="font-bold text-[22px] text-text-100 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent-100" />
                Strategic Insight
              </h3>
              <p className="text-[13px] text-text-100 mt-1">
                Automated analysis based on your strongest and weakest fields.
              </p>
            </div>

            {/* Top Strength Section */}
            {stats.strongest.length > 0 && (
              <div className="z-10 bg-primary-100/10 p-4 rounded-xl border border-primary-100/30">
                <div className="flex items-center gap-2 mb-2 text-primary-100 font-bold text-sm uppercase tracking-wide">
                  <ArrowUpRight className="w-4 h-4" />
                  Your Superpower
                </div>
                <div className="font-bold text-text-100 text-[19px]">
                  {stats.strongest.map((s) => s.subject).join(" & ")}
                </div>
                <div className="text-sm text-text-200 mt-1">
                  GPA: {stats.strongest[0].A} — Keep leveraging this strength!
                </div>
              </div>
            )}

            {/* Weakness Section */}
            {stats.weakest.length > 0 ? (
              <div className="z-10 flex-grow">
                <div className="inline-block bg-accent-100/5 text-accent-200 text-[13px] font-bold px-2 py-1 rounded-md mb-3 border border-primary-100/30">
                  Focus Area: {stats.weakest.map((w) => w.subject).join(" & ")}{" "}
                  (GPA: {stats.weakest[0].A})
                </div>
                <div className="space-y-2">
                  {getRecommendation(
                    stats.weakest[0].subject,
                    stats.weakest[0].A
                  ).map((tip, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 text-sm text-text-100 leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary-100 flex-shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-200 z-10 italic">
                Once you enter grades, we will analyze your performance fields
                here.
              </p>
            )}
          </div>
        </div>

        {/*PERFORMANCE TREND*/}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-primary-100/40">
          <div className="mb-6">
            <h3 className="font-bold text-[22px] text-text-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-100" />
              Semester Performance Breakdown
            </h3>
            <p className="text-[13px] text-text-100">
              Hover over a bar to see the specific modules and grades for that
              semester.
            </p>
          </div>

          <div className="h-72 w-full">
            {stats.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={stats.trendData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f3f4f6"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#4b5563", fontSize: 12, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis
                    domain={[0, 4]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#4b5563", fontSize: 12, fontWeight: 700 }}
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-xl shadow-xl border border-bg-300 text-xs">
                            <div className="font-bold text-text-100 mb-2 border-b border-bg-200 pb-1">
                              {label} (GPA: {data.gpa})
                            </div>
                            <div className="space-y-1">
                              {data.modules.map((m: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex justify-between gap-4 text-text-200"
                                >
                                  <span>{m.name}</span>
                                  <span className="font-bold text-text-100">
                                    {m.grade}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/*Black Outline Removal from chart */}
                  <Bar
                    dataKey="gpa"
                    radius={[6, 6, 0, 0]}
                    barSize={50}
                    style={{ outline: "none" }}
                  >
                    {stats.trendData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.gpa >= 3.0 ? "#0077C2" : "#59a5f5"}
                        style={{ outline: "none" }}
                      />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="gpa"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#f59e0b" }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-200 italic bg-bg-100/50 rounded-xl border border-dashed border-bg-300">
                Complete at least one semester to see your trend line.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
