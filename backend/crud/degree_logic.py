from database import supabase

def get_all_degrees():
    """
    Fetches all available degrees from the database.
    Used for the 'Select Degree' dropdown on the frontend.
    """
    try:
        # SQL Equivalent: SELECT * FROM degrees;
        response = supabase.table("degrees").select("*").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching degrees: {e}")
        return []

def get_modules_by_degree(degree_id: int):
    """
    Fetches the curriculum (modules) for a specific degree.
    """
    try:
        # SQL Equivalent: SELECT * FROM modules WHERE degree_id = X;
        response = supabase.table("modules").select("*").eq("degree_id", degree_id).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching modules for degree {degree_id}: {e}")
        return []