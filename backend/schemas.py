from pydantic import BaseModel
from typing import Optional, List

# =======================
# 1. DEGREE SCHEMAS
# =======================
class DegreeBase(BaseModel):
    name: str
    duration_years: int
    total_credits: int

# What we return to the Frontend (includes ID)
class Degree(DegreeBase):
    id: int

    class Config:
        from_attributes = True

# =======================
# 2. MODULE SCHEMAS
# =======================
class ModuleBase(BaseModel):
    code: Optional[str] = None  # NEW: Added Code
    name: str
    credits: int
    semester: int
    year: int
    category: str
    is_gpa: bool = True         # NEW: Added Non-GPA Flag (Default True)

# What we return to the Frontend (includes ID and Link)
class Module(ModuleBase):
    id: int
    degree_id: int

    class Config:
        from_attributes = True

# =======================
# 3. GRADE SCHEMAS
# =======================
# Used when the user UPDATES their marks (Input)
class GradeUpdate(BaseModel):
    grade: Optional[str] = None       # e.g. "A" or "B+" or null
    grade_point: float = 0.0          # e.g. 4.0
    is_completed: bool = False
    is_repeat: bool = False           # <--- NEW: Added Repeat Flag

# Used when we SEND data to the user (Output)
class StudentGrade(GradeUpdate):
    id: int
    student_id: str
    module_id: int
    module: Optional[Module] = None   # Nested Data (The Module Name!)

    class Config:
        from_attributes = True