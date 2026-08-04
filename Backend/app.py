from flask import Flask, jsonify
from sqlalchemy import text
from werkzeug.exceptions import HTTPException

from config import Config
from extensions import db, init_cors, jwt
from routes.admin_routes import admin_bp
from routes.auth_routes import auth_bp
from routes.history_routes import history_bp
from routes.predict_routes import predict_bp
from routes.report_routes import report_bp
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

    # Import models so SQLAlchemy knows the tables.
    from models import AuditLog, Prediction, User  # noqa: F401

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
            db.session.commit()
        except Exception:
            db.session.rollback()

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
