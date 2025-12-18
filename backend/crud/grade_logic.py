from database import supabase
from schemas import GradeUpdate
from typing import List, Dict, Any

def get_student_grades(student_id: str):
    try:
        # get all grades for a student
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
    try:
        update_payload = {
            "grade": grade_data.grade,
            "grade_point": grade_data.grade_point,
            "is_completed": grade_data.is_completed,
            "is_repeat": grade_data.is_repeat  
        }

        # update Supabase
        # check student_id for security
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
    #seeding
    try:
        modules = supabase.table("modules").select("id").eq("degree_id", degree_id).execute()
        
        if not modules.data:
            return {"error": "No modules found for this degree"}

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

        #Bulk Insert
        response = supabase.table("student_grades").insert(new_grades).execute()
        return response.data

    except Exception as e:
        print(f"Error initializing grades: {e}")
        return None