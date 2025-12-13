import { supabase } from "./auth";

/**
 * FETCH GRADES
 * Loads all saved grades for the currently logged-in user.
 * Returns an array of objects: { module_id, grade, is_repeat }
 */
export const fetchStudentGrades = async () => {
  // 1. Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // console.warn("No user logged in. Skipping fetch."); // Optional: Silence warning
    return null;
  }

  // 2. Get data from Supabase
  const { data, error } = await supabase
    .from("student_grades")
    .select("module_id, grade, is_repeat")
    .eq("student_id", user.id);

  if (error) {
    console.error("Error fetching grades:", error);
    throw error;
  }

  return data;
};

/**
 * SAVE GRADES
 * Takes the frontend state (grades + repeats) and syncs it to the database.
 * * @param grades - Object { module_id: "A" | null } (Now accepts null to clear)
 * @param repeats - Object { module_id: true/false }
 * @param gradeScale - The GRADE_SCALE object from your config to calculate points
 */
export const saveStudentGrades = async (
  grades: Record<number, string | null>, // <--- UPDATED TYPE: Allows null
  repeats: Record<number, boolean>,
  gradeScale: Record<string, number>
) => {
  // 1. Check user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in to save progress.");

  // 2. Transform the frontend "State Objects" into "Database Rows"
  const upsertData = Object.keys(grades).map((moduleIdStr) => {
    const moduleId = parseInt(moduleIdStr);
    const grade = grades[moduleId];
    const isRepeat = repeats[moduleId] || false;

    // --- CASE 1: CLEARING A GRADE (Null or Empty) ---
    if (!grade || grade === "") {
        return {
            student_id: user.id,
            module_id: moduleId,
            grade: null,        // Explicitly send NULL to clear DB column
            grade_point: 0.0,
            is_repeat: false,   // Reset flags
            is_completed: false
        };
    }

    // --- CASE 2: SAVING A VALID GRADE ---
    let points = 0.0;
    
    // Handle MC (Medical)
    if (grade === "MC") {
        points = 0.0;
    } 
    // Handle Normal Grades
    else if (gradeScale[grade] !== undefined) {
        points = gradeScale[grade];
        // Apply the Repeat Cap (Max 2.0 / C) 
        // We save the capped value to DB to maintain consistency
        if (isRepeat) {
            points = Math.min(points, 2.0);
        }
    }

    return {
      student_id: user.id,
      module_id: moduleId,
      grade: grade,
      grade_point: points,
      is_repeat: isRepeat, // <--- CRITICAL: Sending the flag
      is_completed: true,
    };
  });

  if (upsertData.length === 0) return;

  // 3. Send to Supabase
  // .upsert() means: "Insert new rows, or UPDATE if the (student_id, module_id) already exists"
  const { error } = await supabase
    .from("student_grades")
    .upsert(upsertData, { onConflict: "student_id, module_id" });

  if (error) {
    console.error("Error saving grades:", error);
    throw error;
  }

  return true;
};