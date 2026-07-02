from fastapi import APIRouter

from app.api import (
    routes_ai_actions,
    routes_audio,
    routes_health,
    routes_jobs,
    routes_notes,
    routes_recordings,
    routes_settings,
    routes_voiceprint_profiles,
)

api_router = APIRouter()
api_router.include_router(routes_health.router)
api_router.include_router(routes_audio.router)
api_router.include_router(routes_recordings.router)
api_router.include_router(routes_jobs.router)
api_router.include_router(routes_ai_actions.router)
api_router.include_router(routes_notes.router)
api_router.include_router(routes_voiceprint_profiles.router)
api_router.include_router(routes_settings.user_settings_router)
api_router.include_router(routes_settings.llm_settings_router)
api_router.include_router(routes_settings.transcription_settings_router)
