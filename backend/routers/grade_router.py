from fastapi import APIRouter, HTTPException, Header, Depends
from typing import List
from crud import grade_logic
from schemas import StudentGrade, GradeUpdate
from database import supabase

router = APIRouter()

# authorize and verify with supabase
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    
    try:
        token = authorization.split(" ")[1]
        
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
             raise HTTPException(status_code=401, detail="Invalid Token")
             
        return user_response.user.id

    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Authentication Failed")

# ROUTES

@router.get("/grades", response_model=List[StudentGrade])
def read_my_grades(student_id: str = Depends(get_current_user)):
    """
    Get all grades. Uses the verified student_id from the token.
    """
    grades = grade_logic.get_student_grades(student_id)
    return grades


@router.post("/grades/init/{degree_id}")
def initialize_grades(degree_id: int, student_id: str = Depends(get_current_user)):
    """
    Initialize grades. Uses the verified student_id.
    """
    result = grade_logic.initialize_student_grades(student_id, degree_id)
    if not result:
         raise HTTPException(status_code=400, detail="Could not initialize grades")
    return {"message": "Grades initialized successfully"}


@router.put("/grades/{grade_id}")
def update_grade(grade_id: int, grade_data: GradeUpdate, student_id: str = Depends(get_current_user)):
    """
    Update a grade. Uses the verified student_id.
    """
    result = grade_logic.update_student_grade(grade_id, grade_data, student_id)
    if not result:
        raise HTTPException(status_code=400, detail="Update failed")
    return {"message": "Grade updated"}