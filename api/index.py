import sys
import os

# 1. Calculate the absolute path to the backend folder
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, '..', 'backend')

# 2. Add the backend folder to Python's system path
sys.path.append(backend_dir)

# 3. Now we can import main (because backend_dir is in the path)
from main import app

# 4. Fix the Vercel path prefix
app.root_path = "/api"