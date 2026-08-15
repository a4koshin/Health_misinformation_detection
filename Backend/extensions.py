from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()


def init_cors(app):
    CORS(
        app,
        origins=[app.config["FRONTEND_URL"], "http://localhost:3000", "http://127.0.0.1:3000"],
        supports_credentials=False,
        max_age=86400,
    )
