import { supabase } from "./auth";

/**
 * FETCH GRADES
 * Loads all saved grades for the currently logged-in user.
 */
export const fetchStudentGrades = async () => {
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  //Get data from Supabase
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
@param grades 
@param repeats 
 @param gradeScale 
 */
export const saveStudentGrades = async (
  grades: Record<number, string | null>, 
  repeats: Record<number, boolean>,
  gradeScale: Record<string, number>
) => {
  //Check user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in to save progress.");

  const upsertData = Object.keys(grades).map((moduleIdStr) => {
    const moduleId = parseInt(moduleIdStr);
    const grade = grades[moduleId];
    const isRepeat = repeats[moduleId] || false;

    //1.CLEARING A GRADE
    if (!grade || grade === "") {
        return {
            student_id: user.id,
            module_id: moduleId,
            grade: null,        
            grade_point: 0.0,
            is_repeat: false,   
            is_completed: false
        };
    }

    //2: SAVING A VALID GRADE
    let points = 0.0;
    
    // Handle MC (Medical)
    if (grade === "MC") {
        points = 0.0;
    } 
    // Handle Normal Grades
    else if (gradeScale[grade] !== undefined) {
        points = gradeScale[grade];
        // Apply the Repeat Cap (Max 2.0 / C) 
        if (isRepeat) {
            points = Math.min(points, 2.0);
        }
    }

    return {
      student_id: user.id,
      module_id: moduleId,
      grade: grade,
      grade_point: points,
      is_repeat: isRepeat, 
      is_completed: true,
    };
  });

  if (upsertData.length === 0) return;

  //Send to Supabase
  const { error } = await supabase
    .from("student_grades")
    .upsert(upsertData, { onConflict: "student_id, module_id" });

  if (error) {
    console.error("Error saving grades:", error);
    throw error;
  }

  return true;
};