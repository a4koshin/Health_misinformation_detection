from flask_jwt_extended import create_access_token


def create_token(user_id: int) -> str:
    return create_access_token(identity=str(user_id))
