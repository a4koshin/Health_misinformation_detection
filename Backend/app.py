from flask import Flask, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy import text
from werkzeug.exceptions import HTTPException

from config import Config
from extensions import db, init_cors, jwt
from routes.admin_routes import admin_bp
from routes.auth_routes import auth_bp
from routes.history_routes import history_bp
from routes.predict_routes import predict_bp
from routes.report_routes import report_bp
from routes.notification_routes import notification_bp
from routes.review_routes import review_bp
from routes.settings_routes import settings_bp
from routes.transcription_routes import transcription_bp


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", static_url_path="/static")
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    init_cors(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(transcription_bp)
    app.register_blueprint(review_bp)
    app.register_blueprint(notification_bp)

    # Import models so SQLAlchemy knows the tables.
    from models import AuditLog, Notification, PasswordReset, Prediction, User  # noqa: F401

    with app.app_context():
        db.create_all()
        # Safe additive column for existing Neon/local DBs.
        try:
            db.session.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS language_preference "
                    "VARCHAR(10) NOT NULL DEFAULT 'so'"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE predictions "
                    "ADD COLUMN IF NOT EXISTS needs_review "
                    "BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE predictions "
                    "ADD COLUMN IF NOT EXISTS review_status VARCHAR(20)"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE predictions "
                    "ADD COLUMN IF NOT EXISTS advisor_id INTEGER "
                    "REFERENCES users(id)"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE predictions "
                    "ADD COLUMN IF NOT EXISTS advisor_note TEXT"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE predictions "
                    "ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE predictions "
                    "ADD COLUMN IF NOT EXISTS corrected_claim_text TEXT"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS advisor_since TIMESTAMP"
                )
            )
            db.session.execute(
                text(
                    "UPDATE users "
                    "SET advisor_since = created_at "
                    "WHERE LOWER(role) = 'healthcare_advisor' "
                    "AND advisor_since IS NULL"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS is_active "
                    "BOOLEAN NOT NULL DEFAULT TRUE"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP"
                )
            )
            db.session.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS advisor_since TIMESTAMP"
                )
            )
            db.session.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS password_resets ("
                    "id SERIAL PRIMARY KEY, "
                    "user_id INTEGER NOT NULL REFERENCES users(id), "
                    "token VARCHAR(255) NOT NULL UNIQUE, "
                    "expires_at TIMESTAMP NOT NULL, "
                    "created_at TIMESTAMP NOT NULL DEFAULT NOW()"
                    ")"
                )
            )
            db.session.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS notifications ("
                    "id SERIAL PRIMARY KEY, "
                    "recipient_id INTEGER NOT NULL REFERENCES users(id), "
                    "audience VARCHAR(32) NOT NULL, "
                    "type VARCHAR(40) NOT NULL, "
                    "title VARCHAR(180) NOT NULL, "
                    "body TEXT NOT NULL, "
                    "prediction_id INTEGER, "
                    "actor_id INTEGER, "
                    "actor_role VARCHAR(32), "
                    "actor_name VARCHAR(120), "
                    "other_user_id INTEGER, "
                    "other_user_name VARCHAR(120), "
                    "claim_excerpt TEXT, "
                    "corrected_excerpt TEXT, "
                    "href VARCHAR(120), "
                    "read_at TIMESTAMP, "
                    "created_at TIMESTAMP NOT NULL DEFAULT NOW()"
                    ")"
                )
            )
            db.session.commit()
        except Exception:
            db.session.rollback()

        from services.seed_service import seed_admin

        try:
            seed_admin()
        except Exception:
            db.session.rollback()
            app.logger.exception("Admin seed failed")

        from services.seed_service import seed_admin

    @app.before_request
    def reject_deactivated_users():
        if request.method == "OPTIONS":
            return None
        try:
            verify_jwt_in_request(optional=True)
        except Exception:
            return None
        identity = get_jwt_identity()
        if not identity:
            return None
        from services import auth_service

        user = auth_service.get_user_by_id(identity)
        if user is not None and not user.is_active:
            return jsonify(
                {
                    "error": True,
                    "message": "This account has been deactivated.",
                }
            ), 403
        return None

        try:
            seed_admin()
        except Exception:
            db.session.rollback()
            app.logger.exception("Admin seed failed")

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        # Keep Flask/JWT HTTP errors (401, 404, …) intact.
        if isinstance(error, HTTPException):
            return jsonify({"error": True, "message": error.description}), error.code
        # Avoid dumping raw SQL / stack traces to the client.
        app.logger.exception("Unhandled error")
        return jsonify(
            {"error": True, "message": "Something went wrong. Please try again."}
        ), 500

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
