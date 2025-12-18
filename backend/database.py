import os
from supabase import create_client, Client
from dotenv import load_dotenv

#Load from .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

#check fo key
if not url or not key:
    raise ValueError("❌ SUPABASE_URL or SUPABASE_KEY is missing in .env file")

#connect
supabase: Client = create_client(url, key)

print("✅ Connected to Supabase!")