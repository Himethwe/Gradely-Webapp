from fastapi import APIRouter, HTTPException
from typing import List
from crud import degree_logic
from schemas import Degree, Module

router = APIRouter()

@router.get("/degrees", response_model=List[Degree])
def read_degrees():
    #get list of all available degrees
    degrees = degree_logic.get_all_degrees()
    if not degrees:
        raise HTTPException(status_code=404, detail="No degrees found")
    return degrees

@router.get("/degrees/{degree_id}/modules", response_model=List[Module])
def read_modules(degree_id: int):
    #get specific modules for selected degree
    modules = degree_logic.get_modules_by_degree(degree_id)
    if not modules:
        raise HTTPException(status_code=404, detail="No modules found for this degree")
    return modules