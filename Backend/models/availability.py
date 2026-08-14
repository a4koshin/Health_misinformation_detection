from datetime import datetime, timezone

from extensions import db


def isoformat_utc(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


class DoctorAvailability(db.Model):
    """A date/time window a doctor opens for appointments."""

    __tablename__ = "doctor_availability"

    id = db.Column(db.Integer, primary_key=True)
    doctor_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    starts_at = db.Column(db.DateTime, nullable=False, index=True)
    ends_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self, *, booked: bool = False) -> dict:
        return {
            "id": str(self.id),
            "doctor_user_id": str(self.doctor_user_id),
            "starts_at": isoformat_utc(self.starts_at),
            "ends_at": isoformat_utc(self.ends_at),
            "created_at": isoformat_utc(self.created_at),
            "booked": bool(booked),
        }
