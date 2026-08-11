from datetime import datetime, timezone

from flask import Response, jsonify, request
from flask_jwt_extended import jwt_required

from services import admin_service, audit_service, db_service


def _client_ip() -> str | None:
    from flask import request

    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr


@jwt_required()
def get_report():
    try:
        admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    report = db_service.get_platform_report(
        is_admin=True,
        role=request.args.get("role"),
        doctor_id=request.args.get("doctor_id"),
    )
    return jsonify(report), 200


@jwt_required()
def download_report():
    try:
        admin = admin_service.require_admin()
    except PermissionError as exc:
        return jsonify({"error": True, "message": str(exc), "detail": str(exc)}), 403

    report = db_service.get_platform_report(is_admin=True)
    csv_text = db_service.build_report_csv(report)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"healthai-report-{stamp}.csv"

    audit_service.log_action(
        actor_id=admin.id,
        actor_email=admin.email,
        action="report.download",
        entity_type="report",
        details=f"Downloaded CSV report ({report.get('total_claims', 0)} rows)",
        ip_address=_client_ip(),
    )
