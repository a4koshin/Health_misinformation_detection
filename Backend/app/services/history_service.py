import uuid

from sqlalchemy.orm import Session

from app.models.detection import Detection


def get_user_detections(db: Session, user_id: uuid.UUID) -> list[Detection]:
    return (
        db.query(Detection)
        .filter(Detection.user_id == user_id)
        .order_by(Detection.created_at.desc())
        .all()
    )
