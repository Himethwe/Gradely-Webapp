from backend.main import app

# 1. Critical Fix: Tell FastAPI it is running behind "/api"
# This strips the "/api" prefix so requests like "/api/login" connect to "/login"
app.root_path = "/api"

# 2. This is just for Vercel to find the app instance
# No other code is needed here.