import sys
import os

#get path to the backend folder
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, '..', 'backend')

#Add backend folder to Python
sys.path.append(backend_dir)

from main import app

#Fix Vercel path prefix
app.root_path = "/api"