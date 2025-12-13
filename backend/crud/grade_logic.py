from database import supabase
from schemas import GradeUpdate
from typing import List, Dict, Any

def get_student_grades(student_id: str):
    """
    Fetches all grades for a specific student.
    Crucial: It joins with the 'modules' table so we know the subject name!
    """
    try:
        # SQL: SELECT *, modules(*) FROM student_grades WHERE student_id = 'XYZ'
        response = supabase.table("student_grades")\
            .select("*, module:modules(*)")\
            .eq("student_id", student_id)\
            .order("module(year)", desc=False)\
            .order("module(semester)", desc=False)\
            .execute()
        
        return response.data
    except Exception as e:
        print(f"Error fetching grades: {e}")
        return []

def update_student_grade(grade_id: int, grade_data: GradeUpdate, student_id: str):
    """
    Updates a specific grade row (e.g., changing 'Linear Algebra' from NULL to 'A').
    """
    try:
        # 1. Prepare the data to update
        update_payload = {
            "grade": grade_data.grade,
            "grade_point": grade_data.grade_point,
            "is_completed": grade_data.is_completed,
            "is_repeat": grade_data.is_repeat  # <--- NEW: Save the repeat flag
        }

        # 2. Send update to Supabase
        # We check 'student_id' again for double security (Application Logic Security)
        response = supabase.table("student_grades")\
            .update(update_payload)\
            .eq("id", grade_id)\
            .eq("student_id", student_id)\
            .execute()
            
        return response.data
    except Exception as e:
        print(f"Error updating grade {grade_id}: {e}")
        return None

def initialize_student_grades(student_id: str, degree_id: int):
    """
    The 'Seeding' Logic for a new User.
    When a student selects a degree, this copies ALL modules for that degree
    into the 'student_grades' table with empty marks.
    """
    try:
        # 1. Get all modules for the chosen degree
        modules = supabase.table("modules").select("id").eq("degree_id", degree_id).execute()
        
        if not modules.data:
            return {"error": "No modules found for this degree"}

        # 2. Prepare the list of rows to insert
        # We explicitly tell Python: "This data is a List of Dictionaries"
        module_list: List[Any] = modules.data
        
        new_grades = []
        for mod in module_list:
            new_grades.append({
                "student_id": student_id,
                "module_id": mod['id'],  
                "grade": None,
                "grade_point": 0.0,
                "is_completed": False
            })

        # 3. Bulk Insert
        response = supabase.table("student_grades").insert(new_grades).execute()
        return response.data

    except Exception as e:
        print(f"Error initializing grades: {e}")
        return None