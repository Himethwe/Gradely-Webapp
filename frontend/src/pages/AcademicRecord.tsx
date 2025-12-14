import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  Loader2,
  Info,
  Target,
  ArrowRight,
  RotateCcw,
  Cloud,
  AlertCircle,
  X,
  Check,
  LogIn,
  User,
  Shield,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import api from "../api/axios";
import { fetchStudentGrades, saveStudentGrades } from "../api/grades";
import { supabase } from "../api/auth";
import { useDebounce } from "../hooks/useDebounce";
import {
  GRADE_SCALE,
  GRADING_SCHEMA,
  calculateGPA,
  groupModulesByYearAndSem,
} from "../utils/academic";

interface Module {
  id: number;
  name: string;
  credits: number;
  semester: number;
  year: number;
  category: string;
  is_gpa?: any;
}

interface YearGroup {
  year: number;
  semesters: {
    semester: number;
    modules: Module[];
  }[];
}

const isNonGpa = (val: any) => {
  if (val === false) return true;
  if (val === 0) return true;
  if (typeof val === "string") {
    if (val.toLowerCase() === "false") return true;
    if (val === "0") return true;
  }
  return false;
};

export default function AcademicRecord() {
  const navigate = useNavigate();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [degreeName, setDegreeName] = useState("");

  // NEW: Student Type State (Day Scholar vs Cadet)
  const [studentType, setStudentType] = useState<"day" | "cadet">(() => {
    return (localStorage.getItem("studentType") as "day" | "cadet") || "day";
  });

  const [allModules, setAllModules] = useState<Module[]>([]);
  const [curriculum, setCurriculum] = useState<YearGroup[]>([]);

  // Main Status: Now allows null/empty string to represent "Cleared"
  const [grades, setGrades] = useState<Record<number, string | null>>({});
  const [suppGrades, setSuppGrades] = useState<Record<number, string>>({});

  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // NEW: Toast Notification State
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  });

  const debouncedGrades = useDebounce(grades, 1500);
  const debouncedSupp = useDebounce(suppGrades, 1500);

  // --- HANDLER: Toggle Student Type ---
  const toggleStudentType = (type: "day" | "cadet") => {
    setStudentType(type);
    localStorage.setItem("studentType", type);
  };

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    const initialize = async () => {
      const storedDegreeId = localStorage.getItem("selectedDegreeId");
      const storedDegreeName = localStorage.getItem("selectedDegreeName");

      if (!storedDegreeId) {
        navigate("/");
        return;
      }
      setDegreeName(storedDegreeName || "Unknown Degree");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        try {
          const cloudGrades = await fetchStudentGrades();
          if (cloudGrades && cloudGrades.length > 0) {
            const gradesMap: Record<number, string | null> = {};
            const suppMap: Record<number, string> = {};

            cloudGrades.forEach((g: any) => {
              // Handle repeats - check is_repeat flag FIRST
              if (g.is_repeat) {
                gradesMap[g.module_id] = "REPEAT";
                // Load supplementary grade if it exists AND it's not the placeholder
                if (g.grade && g.grade !== "REPEAT_PENDING") {
                  suppMap[g.module_id] = g.grade;
                }
              }
              // Handle medicals - only if NOT a repeat
              else if (g.grade === "MC") {
                gradesMap[g.module_id] = "MC";
              }
              // Handle normal grades - only if NOT a repeat
              else if (g.grade) {
                gradesMap[g.module_id] = g.grade;
              }
              // Handle cleared/empty entries
              else if (g.grade === null || g.grade === "") {
                gradesMap[g.module_id] = null;
              }
            });
            setGrades(gradesMap);
            setSuppGrades(suppMap);
          } else {
            loadFromLocalStorage();
          }
        } catch (err) {
          console.error("Cloud load failed, using local", err);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }

      try {
        const response = await api.get(`/degrees/${storedDegreeId}/modules`);
        setAllModules(response.data);
        setCurriculum(groupModulesByYearAndSem(response.data));
      } catch (err) {
        console.error("Failed to load modules", err);
        setError("Could not load module data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [navigate]);

  const loadFromLocalStorage = () => {
    const savedGrades = localStorage.getItem("guestGrades");
    if (savedGrades) setGrades(JSON.parse(savedGrades));
    const savedSupp = localStorage.getItem("guestSuppGrades");
    if (savedSupp) setSuppGrades(JSON.parse(savedSupp));
  };

  // --- AUTO-SAVE EFFECT ---
  useEffect(() => {
    if (!user) return;
    // We run this even if keys are empty, to support clearing
    if (
      Object.keys(debouncedGrades).length === 0 &&
      Object.keys(debouncedSupp).length === 0
    )
      return;

    const performAutoSave = async () => {
      setSaveStatus("saving");
      try {
        const finalGrades: Record<number, string | null> = {};
        const finalRepeats: Record<number, boolean> = {};

        Object.keys(debouncedGrades).forEach((key: any) => {
          const id = Number(key);
          const mainVal = debouncedGrades[id];

          // 1. Handle Cleared/Empty Values
          if (mainVal === null || mainVal === "") {
            finalGrades[id] = null; // Send null to DB to clear it
            finalRepeats[id] = false;
            return;
          }

          // 2. Handle Repeats
          if (mainVal === "REPEAT") {
            // CRITICAL: Always save repeat status, even if grade is empty
            finalRepeats[id] = true;
            if (debouncedSupp[id]) {
              finalGrades[id] = debouncedSupp[id];
            } else {
              // Save a placeholder grade to ensure the row exists in DB
              finalGrades[id] = "REPEAT_PENDING";
            }
          }
          // 3. Handle Medicals
          else if (mainVal === "MC") {
            if (debouncedSupp[id]) {
              finalGrades[id] = debouncedSupp[id];
              finalRepeats[id] = false;
            } else {
              finalGrades[id] = "MC";
              finalRepeats[id] = false;
            }
          }
          // 4. Normal Grades
          else {
            finalGrades[id] = mainVal;
            finalRepeats[id] = false;
          }
        });

        await saveStudentGrades(finalGrades, finalRepeats, GRADE_SCALE);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch (err) {
        console.error("Auto-save failed", err);
        setSaveStatus("error");
      }
    };

    performAutoSave();
  }, [debouncedGrades, debouncedSupp, user]);

  // --- GPA CALCULATION (Filtered) ---
  const currentGPA = useMemo(() => {
    // 1. Filter modules: If Day Scholar, exclude 'Military' category
    const relevantModules = allModules.filter((m) =>
      studentType === "cadet" ? true : m.category !== "Military"
    );

    const effectiveRepeats: Record<number, boolean> = {};
    const effectiveGrades: Record<number, string> = {};

    Object.keys(grades).forEach((key: any) => {
      const id = Number(key);
      const status = grades[id];

      if (!status) return; // Skip nulls

      if (status === "REPEAT") {
        effectiveRepeats[id] = true;
        if (suppGrades[id]) {
          effectiveGrades[id] = suppGrades[id];
        } else {
          // FIX: explicitly treat as "REPEAT" (0.00) if no supplementary grade
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

    return calculateGPA(relevantModules, effectiveGrades, effectiveRepeats);
  }, [grades, suppGrades, allModules, studentType]); // Added studentType

  // --- HANDLERS ---
  const handleMainStatusChange = (moduleId: number, value: string) => {
    // If clearing (value === ""), set to null so AutoSave detects it
    const valToStore = value === "" ? null : value;

    const updatedGrades = { ...grades, [moduleId]: valToStore };
    const updatedSupp = { ...suppGrades };

    if (value !== "REPEAT" && value !== "MC") {
      delete updatedSupp[moduleId];
    } else {
      // Trigger the toast notification
      setToast({ show: true, message: "Supplementary Exam added below ↓" });
      setTimeout(() => setToast({ show: false, message: "" }), 3000);
    }

    setGrades(updatedGrades);
    setSuppGrades(updatedSupp);
    localStorage.setItem("guestGrades", JSON.stringify(updatedGrades));
    localStorage.setItem("guestSuppGrades", JSON.stringify(updatedSupp));
    if (user) setSaveStatus("saving");
  };

  const handleSuppGradeChange = (moduleId: number, value: string) => {
    const updatedSupp = { ...suppGrades, [moduleId]: value };
    setSuppGrades(updatedSupp);
    localStorage.setItem("guestSuppGrades", JSON.stringify(updatedSupp));
    if (user) setSaveStatus("saving");
  };

  const handleClearYear = (year: number) => {
    const yearGroup = curriculum.find((y) => y.year === year);
    if (!yearGroup) return;

    const updatedGrades = { ...grades };
    const updatedSupp = { ...suppGrades };

    yearGroup.semesters.forEach((sem) => {
      sem.modules.forEach((mod) => {
        // Crucial: Set to NULL, do not delete key.
        // This tells AutoSave "Please update this row to be empty"
        updatedGrades[mod.id] = null;
        delete updatedSupp[mod.id];
      });
    });

    setGrades(updatedGrades);
    setSuppGrades(updatedSupp);

    // Trigger Auto-Save immediately or rely on effect
    // Because object reference changed, effect will trigger.
    if (user) setSaveStatus("saving");
  };

  const gpaPercentage = (parseFloat(currentGPA) / 4.0) * 100;

  // Filter Supplementary modules based on student type too
  const supplementaryModules = allModules
    .filter((m) => (studentType === "cadet" ? true : m.category !== "Military"))
    .filter((m) => grades[m.id] === "REPEAT" || grades[m.id] === "MC");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-100 text-primary-100 font-sans">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <p className="animate-pulse">Retrieving Curriculum...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-100 font-sans relative pb-20">
      <div className="fixed inset-0 z-0 bg-bg-100 bg-grid-pattern animate-grid pointer-events-none"></div>

      {/* --- AUTH MODAL OVERLAY --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-text-200 hover:text-text-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-primary-100/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-8 h-8 text-primary-100" />
              </div>
              <h3 className="text-xl font-bold text-text-100 mb-2">
                Sync to Cloud?
              </h3>
              <p className="text-text-200 mb-8 leading-relaxed text-sm">
                Create an account to save your grades permanently and unlock the
                Dashboard analytics.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigate("/signup")}
                  className="w-full h-12 bg-primary-100 hover:bg-primary-200 text-white font-bold text-base shadow-lg shadow-primary-100/20"
                >
                  Create Account
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/login")}
                  className="w-full h-12 text-text-200 hover:text-primary-100 font-bold"
                >
                  Log In
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER (Sticky) */}
      <div className="sticky top-4 z-40 mx-auto max-w-7xl px-4 transition-all duration-300 hover:-translate-y-1">
        <div className="bg-gradient-to-r from-white via-primary-100/10 to-white backdrop-blur-md rounded-3xl border border-primary-100/40 shadow-sm hover:shadow-md px-4 py-3 md:px-6 md:py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* LEFT: Back & Title */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="p-2 h-auto hover:bg-white/50 text-text-200 hover:text-primary-100 rounded-full"
                title="Change Degree"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {/* FIX: Removed 'truncate' so long degree names wrap on mobile */}
              <h1 className="text-lg md:text-xl font-bold font-sans text-text-100 flex items-center gap-2 leading-tight">
                <GraduationCap className="hidden md:block h-6 w-6 text-primary-100" />
                {degreeName}
              </h1>
            </div>

            {/* CENTER: Student Type Toggle (Desktop) */}
            <div className="hidden md:flex bg-bg-200 p-1 rounded-full border border-bg-300">
              <button
                onClick={() => toggleStudentType("day")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  studentType === "day"
                    ? "bg-white text-primary-100 shadow-sm"
                    : "text-text-200 hover:text-text-100"
                }`}
              >
                <User className="w-3 h-3" /> Day Scholar
              </button>
              <button
                onClick={() => toggleStudentType("cadet")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  studentType === "cadet"
                    ? "bg-white text-accent-200 shadow-sm"
                    : "text-text-200 hover:text-text-100"
                }`}
              >
                <Shield className="w-3 h-3" /> Cadet
              </button>
            </div>

            {/* RIGHT: Status / Sync Indicator (DESKTOP ONLY) */}
            <div className="hidden md:block flex-shrink-0">
              {!user ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-primary-100/20 shadow-sm text-primary-100 font-bold text-sm hover:bg-primary-100/5 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  Log In to Sync
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-200 bg-white/50 rounded-full border border-transparent">
                  {saveStatus === "saving" ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-primary-100" />
                      Saving...
                    </>
                  ) : saveStatus === "saved" ? (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3 text-text-200/50" />
                      Auto-save on
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* MOBILE ONLY: Student Type + GPA BAR + SYNC ROW           */}
          {/* ======================================================== */}
          <div className="md:hidden mt-4 pt-3 border-t border-primary-100/10 space-y-3">
            {/* Mobile Student Toggle (FIX: w-max mx-auto for compact size) */}
            <div className="flex bg-bg-200 p-0.5 rounded-lg border border-bg-300 w-max mx-auto">
              <button
                onClick={() => toggleStudentType("day")}
                className={`flex justify-center items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                  studentType === "day"
                    ? "bg-white text-primary-100 shadow-sm"
                    : "text-text-200 hover:text-text-100"
                }`}
              >
                Day Scholar
              </button>
              <button
                onClick={() => toggleStudentType("cadet")}
                className={`flex justify-center items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                  studentType === "cadet"
                    ? "bg-white text-accent-100 shadow-sm"
                    : "text-text-200 hover:text-text-100"
                }`}
              >
                Cadet
              </button>
            </div>

            <div className="flex items-center justify-between">
              {/* LEFT: GPA (FIX: Prominent Big Text) */}
              <div className="flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-text-200 tracking-wider mb-[-4px]">
                  Current GPA
                </span>
                <span className="text-5xl font-black text-primary-100 leading-none tracking-tighter drop-shadow-sm">
                  {currentGPA}
                </span>
              </div>

              {/* RIGHT: Compact Action Button (Restored) */}
              {!user ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-primary-100/30 shadow-sm text-primary-100 font-bold text-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Log In to Sync
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/50 border border-primary-100/10 text-xs font-bold text-primary-100/70">
                  {saveStatus === "saving" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  {saveStatus === "saving" ? "..." : "Saved"}
                </div>
              )}
            </div>
          </div>
          {/* ======================================================== */}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: MODULES */}
          <div className="lg:col-span-8 space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 shadow-sm">
                {error}
              </div>
            )}

            {curriculum.map((yearGroup) => {
              // Identify supplementary modules specifically for this year
              const yearRepeats = supplementaryModules.filter(
                (m) => m.year === yearGroup.year
              );

              return (
                <div
                  key={yearGroup.year}
                  className="bg-white rounded-2xl shadow-sm border border-primary-100/40 overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="bg-gradient-to-r from-primary-100/10 to-transparent px-6 py-4 border-b border-primary-100/40 flex items-center justify-between">
                    <span className="bg-white text-primary-100 font-bold px-3 py-1 rounded-md text-sm shadow-sm border border-primary-100/40">
                      YEAR {yearGroup.year}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => handleClearYear(yearGroup.year)}
                      className="text-text-100 hover:text-text-100 hover:bg-accent-200/10 h-8 px-3 text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear
                    </Button>
                  </div>

                  <div className="p-6 space-y-8">
                    {yearGroup.semesters.map((sem) => {
                      const visibleModules = sem.modules.filter((m) =>
                        studentType === "cadet"
                          ? true
                          : m.category !== "Military"
                      );

                      if (visibleModules.length === 0) return null;

                      return (
                        <div key={sem.semester}>
                          <h3 className="text-sm font-bold text-text-200 uppercase tracking-wider mb-4 border-l-4 border-accent-100 pl-3">
                            Semester {sem.semester}
                          </h3>
                          <div className="grid grid-cols-1 gap-3">
                            {visibleModules.map((module) => {
                              const status = grades[module.id] || "";

                              return (
                                <div
                                  key={module.id}
                                  // FIX 1: Responsive Flex - Column on Mobile, Row on Desktop
                                  className="group p-4 bg-white rounded-xl border border-bg-300 hover:border-primary-100 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4"
                                >
                                  <div className="flex-grow min-w-0 w-full md:w-auto">
                                    <div className="font-bold text-text-100 truncate pr-2 group-hover:text-primary-100 transition-colors">
                                      {module.name}
                                    </div>
                                    <div className="text-xs text-text-200 mt-1 flex items-center gap-2">
                                      <span className="bg-bg-200 px-2 py-0.5 rounded text-text-200 font-medium">
                                        {module.credits} Credits
                                      </span>
                                      {isNonGpa(module.is_gpa) && (
                                        <span className="bg-bg-200 text-text-200 px-2 py-0.5 rounded border border-bg-300 text-[10px] font-bold">
                                          NGPA
                                        </span>
                                      )}
                                      <span>{module.category}</span>
                                    </div>
                                  </div>

                                  <div className="relative w-full md:w-auto">
                                    <select
                                      value={status}
                                      onChange={(e) =>
                                        handleMainStatusChange(
                                          module.id,
                                          e.target.value
                                        )
                                      }
                                      // FIX 2: Full width select on mobile, fixed on desktop
                                      className={`
                                        appearance-none w-full md:w-32 h-10 text-center font-bold text-sm rounded-lg border-2 cursor-pointer transition-all outline-none focus:ring-2 focus:ring-offset-1
                                        ${
                                          status === "MC"
                                            ? "bg-purple-50 border-purple-200 text-purple-700"
                                            : status === "REPEAT"
                                            ? "bg-slate-100 border-slate-300 text-slate-600"
                                            : status
                                            ? "bg-primary-100 border-primary-100 text-white shadow-lg shadow-primary-100/30"
                                            : "bg-bg-100 border-bg-300 text-text-200 hover:border-primary-200"
                                        }
                                      `}
                                    >
                                      <option value="">-</option>
                                      {Object.keys(GRADE_SCALE).map((grade) => (
                                        <option
                                          key={grade}
                                          value={grade}
                                          className="bg-white text-text-100"
                                        >
                                          {grade}
                                        </option>
                                      ))}
                                      <option
                                        value="MC"
                                        className="bg-white text-text-100"
                                      >
                                        Medical (MC)
                                      </option>
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* --- SUPPLEMENTARY EXAMS SECTION (PER YEAR) --- */}
                    {yearRepeats.length > 0 && (
                      <div className="mt-8 pt-6 border-t-2 border-slate-100 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 mb-4">
                          <AlertCircle className="w-5 h-5 text-slate-500" />
                          <h3 className="text-lg font-bold text-slate-700">
                            Repeat Exams and Medicals (Year {yearGroup.year})
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {yearRepeats.map((module) => {
                            const isMedical = grades[module.id] === "MC";
                            const suppGrade = suppGrades[module.id] || "";

                            return (
                              <div
                                key={module.id}
                                className="group flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-200 hover:border-primary-100 transition-all gap-4"
                              >
                                <div className="flex-grow min-w-0">
                                  <div className="font-bold text-text-100 truncate pr-2">
                                    {module.name}
                                  </div>
                                  <div className="text-xs flex gap-2 mt-1 items-center">
                                    <span className="text-text-200">
                                      Sem {module.semester}
                                    </span>
                                    {/* FIX 3: Added Category Label Here */}
                                    <span className="text-text-200 border-l border-slate-300 pl-2">
                                      {module.category}
                                    </span>
                                    <span
                                      className={`font-bold px-2 rounded ml-auto md:ml-0 ${
                                        isMedical
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-slate-200 text-slate-600"
                                      }`}
                                    >
                                      {isMedical ? "Medical" : "Repeat"}
                                    </span>
                                  </div>
                                </div>

                                <div className="relative">
                                  <select
                                    value={suppGrade}
                                    onChange={(e) =>
                                      handleSuppGradeChange(
                                        module.id,
                                        e.target.value
                                      )
                                    }
                                    className={`
                                      appearance-none w-24 h-10 text-center font-bold text-sm rounded-lg border-2 cursor-pointer transition-all outline-none focus:ring-2 focus:ring-offset-1
                                      ${
                                        suppGrade
                                          ? "bg-primary-100 border-primary-100 text-white shadow-lg"
                                          : "bg-white border-bg-300 text-text-200 hover:border-primary-200"
                                      }
                                    `}
                                  >
                                    <option value="">-</option>
                                    {Object.keys(GRADE_SCALE)
                                      .filter(
                                        (g) =>
                                          isMedical || GRADE_SCALE[g] <= 2.0
                                      )
                                      .map((grade) => (
                                        <option
                                          key={grade}
                                          value={grade}
                                          className="bg-white text-text-100"
                                        >
                                          {grade}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* MOBILE ONLY BOTTOM */}
            <div className="lg:hidden mt-8 space-y-6">
              <StrategistBanner onClick={() => navigate("/strategist")} />
              <h3 className="text-lg font-bold text-text-100 text-center">
                Reference Guide
              </h3>
              <GradingTable />
            </div>
          </div>

          {/* RIGHT COLUMN: STICKY SIDEBAR (Desktop) */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
            <div className="sticky top-32 space-y-6">
              {/* GPA CARD */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-primary-100/40 hover:-translate-y-1 transition-all hover:shadow-xl relative overflow-hidden">
                <h2 className="text-xs font-bold uppercase tracking-widest text-text-200 mb-2">
                  Current GPA
                </h2>
                <div className="text-6xl font-extrabold text-primary-100 tracking-tighter mb-4">
                  {currentGPA}
                </div>
                <div className="w-full bg-bg-200 h-3 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-primary-100 to-accent-100 transition-all duration-1000 ease-out"
                    style={{ width: `${gpaPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs font-medium text-text-200">
                  <span>0.0</span>
                  <span>4.0 Scale</span>
                </div>
              </div>

              <StrategistBanner onClick={() => navigate("/strategist")} />
              <GradingTable />
            </div>
          </div>
        </div>
      </main>

      {/* FLOATING TOAST NOTIFICATION */}
      <div
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${
          toast.show
            ? "translate-y-0 opacity-100"
            : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-text-100 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-bg-300/20 backdrop-blur-md">
          <div className="bg-primary-100 p-1 rounded-full">
            <ArrowRight className="w-3 h-3 text-white rotate-90" />
          </div>
          <span className="text-sm font-bold tracking-wide">
            {toast.message}
          </span>
        </div>
      </div>
    </div>
  );
}

const GradingTable = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-bg-300 overflow-hidden">
    <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex items-center gap-2">
      <Info className="w-4 h-4 text-gray-700" />
      <span className="font-bold text-sm text-gray-900">Grading Schema</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr>
            <th className="px-4 py-3 bg-white text-gray-900 font-bold border-b-2 border-gray-200">
              Marks
            </th>
            <th className="px-4 py-3 bg-white text-gray-900 font-bold border-b-2 border-gray-200">
              Grade
            </th>
            <th className="px-4 py-3 bg-white text-gray-900 font-bold border-b-2 border-gray-200">
              GPA
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {GRADING_SCHEMA.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2 text-gray-900 font-medium border-r border-gray-100">
                {row.marks}
              </td>
              <td
                className={`px-4 py-2 font-bold border-r border-gray-100 ${
                  row.grade.startsWith("A")
                    ? "text-primary-100"
                    : "text-text-100"
                }`}
              >
                {row.grade}
              </td>
              <td className="px-4 py-2 text-gray-900 font-bold">{row.gpa}</td>
            </tr>
          ))}
          <tr className="bg-gray-50 border-t-2 border-gray-200">
            <td className="px-4 py-2 font-medium border-r border-gray-100 text-text-200">
              Medical
            </td>
            <td className="px-4 py-2 font-bold text-text-100 border-r border-gray-100">
              MC
            </td>
            <td className="px-4 py-2 text-text-200 italic">Excluded</td>
          </tr>
          <tr className="bg-gray-50 border-t-2 border-gray-200">
            <td className="px-4 py-2 font-medium border-r border-gray-100 text-text-200">
              Repeat
            </td>
            <td className="px-4 py-2 font-bold text-text-100 border-r border-gray-100">
              Repeat
            </td>
            <td className="px-4 py-2 text-text-100 italic">0.00</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const StrategistBanner = ({ onClick }: { onClick: () => void }) => (
  <div className="bg-gradient-to-br from-white to-primary-100/5 rounded-2xl p-6 border-2 border-accent-100/30 shadow-md flex flex-col gap-4 relative overflow-hidden group hover:border-accent-100/60 transition-all">
    <div className="flex items-start gap-4">
      <div className="p-3 bg-accent-100/10 rounded-xl text-accent-100 shrink-0">
        <Target className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-text-100">
          Targeting a First Class?
        </h3>
        <p className="text-sm text-text-200 mt-1 leading-relaxed">
          Don't just track your GPA—control it. Calculate exactly what grades
          you need next.
        </p>
      </div>
    </div>
    <Button
      onClick={onClick}
      className="w-full bg-primary-100 hover:bg-primary-200 text-white shadow-lg shadow-primary-100/20 h-11 text-base font-bold transition-all transform group-hover:translate-y-[-2px]"
    >
      Open Strategist Page <ArrowRight className="ml-2 h-5 w-5" />
    </Button>
  </div>
);
