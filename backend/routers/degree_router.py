from fastapi import APIRouter, HTTPException
from typing import List
from crud import degree_logic
from schemas import Degree, Module

# Create a "Sub-App" just for Degree URLs
router = APIRouter()

@router.get("/degrees", response_model=List[Degree])
def read_degrees():
    """
    Get a list of all available degrees.
    Frontend uses this for the 'Select Degree' dropdown.
    """
    degrees = degree_logic.get_all_degrees()
    if not degrees:
        raise HTTPException(status_code=404, detail="No degrees found")
    return degrees

@router.get("/degrees/{degree_id}/modules", response_model=List[Module])
def read_modules(degree_id: int):
    """
    Get the full curriculum (modules) for a specific degree ID.
    Used when a student selects their degree to see what subjects they need.
    """
    modules = degree_logic.get_modules_by_degree(degree_id)
    if not modules:
        raise HTTPException(status_code=404, detail="No modules found for this degree")
    return modules