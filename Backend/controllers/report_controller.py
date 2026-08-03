from datetime import datetime, timezone

from flask import Response, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services import audit_service, auth_service, db_service


def _client_ip() -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


@jwt_required()
def get_report():
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    is_admin = (user.role or "").lower() == "admin"
    report = db_service.get_platform_report(user.id, is_admin=is_admin)
    return jsonify(report), 200


@jwt_required()
def download_report():
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    is_admin = (user.role or "").lower() == "admin"
    report = db_service.get_platform_report(user.id, is_admin=is_admin)
    csv_text = db_service.build_report_csv(report)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"healthai-report-{stamp}.csv"

    audit_service.log_action(
        actor_id=user.id,
        actor_email=user.email,
        action="report.download",
        entity_type="report",
        details=f"Downloaded CSV report ({report.get('total_claims', 0)} rows)",
        ip_address=_client_ip(),
    )

    return Response(
        csv_text,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    is_admin = (user.role or "").lower() == "admin"
    report = db_service.get_platform_report(user.id, is_admin=is_admin)
    return jsonify(report), 200


@jwt_required()
def download_report():
    user = auth_service.get_user_by_id(get_jwt_identity())
    if not user:
        return jsonify({"error": True, "message": "User not found."}), 404

    is_admin = (user.role or "").lower() == "admin"
    report = db_service.get_platform_report(user.id, is_admin=is_admin)
    csv_text = db_service.build_report_csv(report)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"healthai-report-{stamp}.csv"
    return Response(
        csv_text,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
