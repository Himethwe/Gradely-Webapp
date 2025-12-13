from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import degree_router, grade_router

app = FastAPI(title="UniStat API")

# ===========================
# 1. SECURITY CONFIG (CORS)
# ===========================
origins = ["*"]  # CHANGED: Allow ALL origins (Vercel, Localhost, etc.)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================
# 2. INCLUDE ROUTERS
# ===========================
app.include_router(degree_router.router, tags=["Degrees"])
app.include_router(grade_router.router, tags=["Grades"])

@app.get("/")
def read_root():
    return {"message": "UniStat Backend is Live! 🚀"}