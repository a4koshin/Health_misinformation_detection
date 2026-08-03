from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()


def init_cors(app):
    CORS(app, origins=[app.config["FRONTEND_URL"]], supports_credentials=False)
