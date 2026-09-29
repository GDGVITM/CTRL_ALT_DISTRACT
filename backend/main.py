from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth import get_current_user, require_admin, AuthenticatedUser

app = FastAPI(
    title="CTRL_ALT_DISTRACT Backend API",
    description="FastAPI service for competition management and Judge0 orchestration",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "CTRL_ALT_DISTRACT Backend",
        "version": "1.0.0"
    }

# 1. Accessible by ANY authenticated user (Participant or Admin)
@app.get("/api/me")
async def get_my_profile(user: AuthenticatedUser = Depends(get_current_user)):
    return {
        "message": "Authenticated successfully with Supabase JWT",
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
        "status": "AUTHORIZED"
    }

# 2. Participant Endpoint (e.g., retrieving active problem state)
@app.get("/api/participant/challenge-state")
async def get_challenge_state(user: AuthenticatedUser = Depends(get_current_user)):
    return {
        "participant_id": user.user_id,
        "active_problem_sequence": 1,
        "challenge_status": "READY",
        "authoritative_server_time_ms": 600000
    }

# 3. Protected ADMIN-ONLY Endpoint
@app.get("/api/admin/metrics")
async def get_admin_metrics(admin: AuthenticatedUser = Depends(require_admin)):
    return {
        "status": "SUCCESS",
        "verified_admin_id": admin.user_id,
        "admin_email": admin.email,
        "role": admin.role,
        "live_metrics": {
            "active_participants": 128,
            "coding_in_arena": 84,
            "under_distraction": 19,
            "distractions_passed": 73,
            "distractions_failed": 6,
            "anomalies_detected": 3
        },
        "system_status": "OPTIMAL",
        "node": "US-EAST-01"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
