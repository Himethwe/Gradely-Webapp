from database import supabase

def get_all_degrees():
    try:
        # get all degrees
        response = supabase.table("degrees").select("*").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching degrees: {e}")
        return []

def get_modules_by_degree(degree_id: int):
    try:
        # get degree modules
        response = supabase.table("modules").select("*").eq("degree_id", degree_id).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching modules for degree {degree_id}: {e}")
        return []