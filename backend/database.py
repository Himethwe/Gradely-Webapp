import os
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. Load the secrets from the .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

# 2. Check if keys exist (Crash early if they are missing)
if not url or not key:
    raise ValueError("❌ SUPABASE_URL or SUPABASE_KEY is missing in .env file")

# 3. Create the Connection
supabase: Client = create_client(url, key)

print("✅ Connected to Supabase!")