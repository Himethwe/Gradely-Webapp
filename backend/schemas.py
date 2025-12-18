from pydantic import BaseModel
from typing import Optional, List

# 1. DEGREE SCHEMAS
class DegreeBase(BaseModel):
    name: str
    duration_years: int
    total_credits: int

class Degree(DegreeBase):
    id: int

    class Config:
        from_attributes = True


# 2. MODULE SCHEMAS

class ModuleBase(BaseModel):
    code: Optional[str] = None  
    name: str
    credits: int
    semester: int
    year: int
    category: str
    is_gpa: bool = True        


class Module(ModuleBase):
    id: int
    degree_id: int

    class Config:
        from_attributes = True


# 3. GRADE SCHEMAS

class GradeUpdate(BaseModel):
    grade: Optional[str] = None       
    grade_point: float = 0.0          
    is_completed: bool = False
    is_repeat: bool = False          

class StudentGrade(GradeUpdate):
    id: int
    student_id: str
    module_id: int
    module: Optional[Module] = None   

    class Config:
        from_attributes = True