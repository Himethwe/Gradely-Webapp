
export const GRADE_SCALE: Record<string, number> = {
  "A+": 4.0, A: 4.0, "A-": 3.7,
  "B+": 3.3, B: 3.0, "B-": 2.7,
  "C+": 2.3, C: 2.0, "C-": 1.7,
  "D+": 1.3, D: 1.0, 
  "E": 0.0,
  "REPEAT": 0.0,
};

export const GRADING_SCHEMA = [
  { grade: "A+", gpa: "4.00", marks: "85-100" },
  { grade: "A", gpa: "4.00", marks: "75-84" },
  { grade: "A-", gpa: "3.70", marks: "70-74" },
  { grade: "B+", gpa: "3.30", marks: "65-69" },
  { grade: "B", gpa: "3.00", marks: "60-64" },
  { grade: "B-", gpa: "2.70", marks: "55-59" },
  { grade: "C+", gpa: "2.30", marks: "50-54" },
  { grade: "C", gpa: "2.00", marks: "45-49" },
  { grade: "C-", gpa: "1.70", marks: "40-44" },
  { grade: "D+", gpa: "1.30", marks: "35-39" },
  { grade: "D", gpa: "1.00", marks: "30-34" },
  { grade: "E", gpa: "0.00", marks: "00-29" },
];

const isNonGpaModule = (val: any) => {
  if (val === false) return true;
  if (val === 0) return true;
  if (typeof val === "string") {
    if (val.toLowerCase() === "false") return true;
    if (val === "0") return true;
  }
  return false;
};

export const calculateGPA = (
  allModules: { id: number; credits: number; is_gpa?: any }[],
  grades: Record<number, string>,
  repeats: Record<number, boolean>
) => {
  let totalPoints = 0;
  let totalCredits = 0;

  allModules.forEach((mod) => {
    // SKIP IF NON-GPA
    if (isNonGpaModule(mod.is_gpa)) return;

    const grade = grades[mod.id];
    const isRepeat = repeats[mod.id];

    // SKIP IF MEDICAL
    if (grade === "MC") return;

    // CALCULATE IF VALID GRADE (Includes "REPEAT" as 0.0)
    if (grade && GRADE_SCALE[grade] !== undefined) {
      let points = GRADE_SCALE[grade];
      
      // Handle Repeat Capping (Max 2.0 / C)
      if (isRepeat) points = Math.min(points, 2.0);

      totalPoints += points * mod.credits;
      totalCredits += mod.credits;
    }
  });

  return totalCredits === 0 ? "0.00" : (totalPoints / totalCredits).toFixed(2);
};

export const groupModulesByYearAndSem = (flatModules: any[]) => {
  const groups: Record<number, Record<number, any[]>> = {};
  flatModules.forEach((mod) => {
    const year = mod.year || 1;
    if (!groups[year]) groups[year] = {};
    if (!groups[year][mod.semester]) groups[year][mod.semester] = [];
    groups[year][mod.semester].push(mod);
  });
  return Object.keys(groups).sort().map((yearStr) => {
    const year = parseInt(yearStr);
    const semesters = Object.keys(groups[year]).sort().map((semStr) => {
      const sem = parseInt(semStr);
      return { semester: sem, modules: groups[year][sem] };
    });
    return { year, semesters };
  });
};

export const getSemesterTrend = (
  allModules: any[],
  grades: Record<number, string>,
  repeats: Record<number, boolean>
) => {
  const semMap: Record<string, { points: number; credits: number }> = {};
  allModules.forEach((mod) => {
    if (isNonGpaModule(mod.is_gpa)) return;

    const grade = grades[mod.id];
    const isRepeat = repeats[mod.id];
    const key = `Y${mod.year} S${mod.semester}`;
    
    if (grade && grade !== "MC" && GRADE_SCALE[grade] !== undefined) {
      let points = GRADE_SCALE[grade];
      if (isRepeat) points = Math.min(points, 2.0);
      
      if (!semMap[key]) semMap[key] = { points: 0, credits: 0 };
      semMap[key].points += points * mod.credits;
      semMap[key].credits += mod.credits;
    }
  });
  return Object.keys(semMap).sort().map((key) => ({
    name: key,
    gpa: parseFloat((semMap[key].points / semMap[key].credits).toFixed(2)),
    credits: semMap[key].credits,
  }));
};

export const getModulesForSemester = (allModules: any[], year: number, sem: number) => {
  return allModules.filter(m => m.year === year && m.semester === sem);
};

export const calculateMaxPossibleGPA = (
  allModules: any[],
  grades: Record<number, string>,
  repeats: Record<number, boolean>
) => {
  let currentPoints = 0;
  let totalCredits = 0;

  allModules.forEach((mod) => {
    if (isNonGpaModule(mod.is_gpa)) return;

    const grade = grades[mod.id];
    const isRepeat = repeats[mod.id];

    // Completed Module (Use actual score)
    if (grade && grade !== "MC" && grade !== "REPEAT" && GRADE_SCALE[grade] !== undefined) {
      let points = GRADE_SCALE[grade];
      if (isRepeat) points = Math.min(points, 2.0);
      currentPoints += points * mod.credits;
    } 
    // Pending Repeat (Assumes user pass, but MAX is 2.0)
    else if (isRepeat || grade === "REPEAT") {
      currentPoints += 2.0 * mod.credits;
    }
    // Future Module / Medical (Assumes user gets A+ / 4.0)
    else {
      currentPoints += 4.0 * mod.credits;
    }
    
    totalCredits += mod.credits;
  });

  if (totalCredits === 0) return "0.00";
  return (currentPoints / totalCredits).toFixed(2);
};

interface InsightResult {
  semesterName: string;
  counts: { strong: number; weak: number; new: number; total: number };
  tips: { type: "strength" | "risk" | "strategy"; title: string; text: string }[];
}

export const getFutureInsights = (
  allModules: any[],
  grades: Record<number, string>,
  repeats: Record<number, boolean>,
  target?: { year: number; semester: number }
): InsightResult | null => {
  
  const catStats: Record<string, { total: number; count: number }> = {};
  const catExperience = new Set<string>();

  allModules.forEach((mod) => {
    const grade = grades[mod.id];
    
    if (grade) {
      const cat = mod.category || "General";
      catExperience.add(cat);

      if (!isNonGpaModule(mod.is_gpa)) {
        const isRepeat = repeats[mod.id];
        if (grade !== "MC" && GRADE_SCALE[grade] !== undefined) {
          let points = GRADE_SCALE[grade];
          if (isRepeat) points = Math.min(points, 2.0);
          
          if (!catStats[cat]) catStats[cat] = { total: 0, count: 0 };
          catStats[cat].total += points;
          catStats[cat].count += 1;
        }
      }
    }
  });

  const getCatGPA = (cat: string) => {
    if (!catStats[cat] || catStats[cat].count === 0) return null;
    return catStats[cat].total / catStats[cat].count;
  };

  let modulesToAnalyze: any[] = [];
  let displayTitle = "";
  let targetYear = 0;
  let targetSem = 0;

  if (target) {
    modulesToAnalyze = allModules.filter(m => m.year === target.year && m.semester === target.semester);
    displayTitle = `Year ${target.year} Semester ${target.semester}`;
    targetYear = target.year;
    targetSem = target.semester;
  } else {
    const grouped = groupModulesByYearAndSem(allModules);
    for (const year of grouped) {
      for (const sem of year.semesters) {
        const hasGrades = sem.modules.some((m: any) => grades[m.id]);
        if (!hasGrades) {
          modulesToAnalyze = sem.modules;
          displayTitle = `Year ${year.year} Semester ${sem.semester}`;
          targetYear = year.year;
          targetSem = sem.semester;
          break;
        }
      }
      if (modulesToAnalyze.length > 0) break;
    }
  }

  if (modulesToAnalyze.length === 0) return null;

  const tips: { type: "strength" | "risk" | "strategy"; title: string; text: string }[] = [];
  const counts = { strong: 0, weak: 0, new: 0, total: modulesToAnalyze.length };
  
  const semCatMap: Record<string, string[]> = {};
  
  modulesToAnalyze.forEach(m => {
    const cat = m.category || "General";
    if(!semCatMap[cat]) semCatMap[cat] = [];
    semCatMap[cat].push(m.name);
  });

  Object.keys(semCatMap).forEach(cat => {
    const histGPA = getCatGPA(cat);
    const hasHistory = catExperience.has(cat);
    const modulesList = semCatMap[cat].join(", ");
    const modCount = semCatMap[cat].length;

    const isFreshman = targetYear === 1 && targetSem === 1;

    if (!hasHistory) {
      counts.new += modCount;
      if (!isFreshman) {
        tips.push({
          type: "strategy",
          title: `New Field: ${cat}`,
          text: `You have never taken ${cat} before. This semester includes: ${modulesList}. Check the syllabus early.`
        });
      }
    } else if (histGPA !== null) {
      if (histGPA >= 3.3) {
        counts.strong += modCount;
        tips.push({
          type: "strength",
          title: `Strength: ${cat}`,
          text: `You have a ${histGPA.toFixed(2)} average in ${cat}. Maintain this standard for: ${modulesList}.`
        });
      } else if (histGPA < 2.7) {
        counts.weak += modCount;
        tips.push({
          type: "risk",
          title: `Risk Area: ${cat}`,
          text: `You average ${histGPA.toFixed(2)} in ${cat}. Be extra careful with: ${modulesList}.`
        });
      }
    }
  });

  const order = { risk: 1, strategy: 2, strength: 3 };
  tips.sort((a, b) => order[a.type] - order[b.type]);

  return { semesterName: displayTitle, counts, tips };
};