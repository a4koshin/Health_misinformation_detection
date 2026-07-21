from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.admin_controller import router as admin_router
from app.controllers.auth_controller import router as auth_router
from app.controllers.history_controller import router as history_router
from app.controllers.prediction_controller import router as prediction_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine, ensure_user_role_column
from app.models import ChatMessage, Detection, User  # noqa: F401
from app.services import auth_service, detection_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_user_role_column()
    detection_service.load_models()

    db = SessionLocal()
    try:
        auth_service.seed_admin_user(db)
    finally:
        db.close()

    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(history_router)
app.include_router(prediction_router)
app.include_router(admin_router)
