"""Hormuud EVC Plus payments via WaafiPay merchant API."""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib import error as urlerror
from urllib import request as urlrequest

from flask import current_app


class EvcPlusError(Exception):
    """Raised when an EVC Plus / WaafiPay purchase fails."""

    def __init__(self, message: str, *, code: str | None = None):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class EvcPurchaseResult:
    success: bool
    request_id: str
    reference_id: str
    invoice_id: str
    amount: str
    currency: str
    payer_account: str
    response_code: str | None
    response_msg: str | None
    raw: dict[str, Any]


def payment_config() -> dict[str, Any]:
    amount = float(current_app.config.get("APPOINTMENT_FEE_USD") or 0.01)
    enabled = bool(current_app.config.get("EVC_PLUS_ENABLED"))
    configured = all(
        [
            (current_app.config.get("EVC_MERCHANT_UID") or "").strip(),
            (current_app.config.get("EVC_API_USER_ID") or "").strip(),
            (current_app.config.get("EVC_API_KEY") or "").strip(),
        ]
    )
    return {
        "enabled": enabled and configured,
        "amount": amount,
        "currency": "USD",
        "payment_method": "EVC Plus",
        "instructions": (
            "Enter your Hormuud EVC Plus number. Approve the PIN prompt on your "
            "phone to complete the appointment payment."
        ),
    }


def normalize_evc_phone(raw: str | None) -> str:
    digits = re.sub(r"\D+", "", (raw or "").strip())
    if digits.startswith("00252"):
        digits = digits[2:]
    if digits.startswith("252"):
        local = digits[3:]
    elif digits.startswith("0") and len(digits) == 10:
        local = digits[1:]
    else:
        local = digits

    if not re.fullmatch(r"61\d{7}", local):
        raise ValueError(
            "Enter a valid Hormuud EVC Plus number (e.g. 61xxxxxxx)."
        )
    return f"252{local}"


def _friendly_message(response_msg: str | None, fallback: str) -> str:
    text = (response_msg or "").strip()
    lower = text.lower()
    if "rcs_success" in lower:
        return "Payment successful."
    if "user aborted" in lower or "user cancelled" in lower:
        return "Payment cancelled on your phone."
    if "subscriber not found" in lower:
        return "That EVC Plus number was not found."
    if "invalid pin" in lower:
        return "Invalid EVC Plus PIN. Try again."
    if "rejected to authorize" in lower or "customer rejected" in lower:
        return "Payment was rejected on your phone."
    if "dialog timedout" in lower or "timeout" in lower:
        return "EVC Plus prompt timed out. Try again and approve quickly."
    if "not authz" in lower or "unauthorized" in lower:
        return "Payment gateway credentials were rejected. Contact support."
    if text:
        # Avoid leaking long raw gateway payloads to clients.
        cleaned = re.sub(r"\s+", " ", text)
        return cleaned[:180]
    return fallback


def purchase(
    *,
    payer_phone: str,
    amount: float | None = None,
    description: str,
    reference_id: str | None = None,
    invoice_id: str | None = None,
) -> EvcPurchaseResult:
    cfg = payment_config()
    if not cfg["enabled"]:
        raise EvcPlusError(
            "EVC Plus payments are not configured on the server.",
            code="not_configured",
        )

    account = normalize_evc_phone(payer_phone)
    pay_amount = float(amount if amount is not None else cfg["amount"])
    if pay_amount <= 0:
        raise EvcPlusError("Appointment fee must be greater than zero.")

    merchant_uid = (current_app.config.get("EVC_MERCHANT_UID") or "").strip()
    api_user_id = (current_app.config.get("EVC_API_USER_ID") or "").strip()
    api_key = (current_app.config.get("EVC_API_KEY") or "").strip()
    endpoint = (
        current_app.config.get("EVC_API_URL") or "https://api.waafipay.net/asm"
    ).strip()
    timeout = int(current_app.config.get("EVC_TIMEOUT_SECONDS") or 120)

    request_id = uuid.uuid4().hex[:24]
    reference = (reference_id or f"APT-{uuid.uuid4().hex[:12]}").upper()
    invoice = (invoice_id or f"INV-{uuid.uuid4().hex[:12]}").upper()
    amount_str = f"{pay_amount:.2f}"
    currency = "USD"

    payload = {
        "schemaVersion": "1.0",
        "requestId": request_id,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")[
            :-3
        ],
        "channelName": "WEB",
        "serviceName": "API_PURCHASE",
        "serviceParams": {
            "merchantUid": merchant_uid,
            "apiUserId": api_user_id,
            "apiKey": api_key,
            "paymentMethod": "mwallet_account",
            "payerInfo": {"accountNo": account},
            "transactionInfo": {
                "referenceId": reference,
                "invoiceId": invoice,
                "amount": amount_str,
                "currency": currency,
                "description": (description or "SomAI appointment")[:120],
            },
        },
    }

    body = json.dumps(payload).encode("utf-8")
    req = urlrequest.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urlrequest.urlopen(req, timeout=timeout) as resp:
            raw_text = resp.read().decode("utf-8", errors="replace")
            status = getattr(resp, "status", 200)
    except urlerror.HTTPError as exc:
        raw_text = exc.read().decode("utf-8", errors="replace")
        raise EvcPlusError(
            _friendly_message(raw_text, "Payment gateway returned an error."),
            code=str(exc.code),
        ) from exc
    except urlerror.URLError as exc:
        raise EvcPlusError(
            "Could not reach the EVC Plus payment gateway. Try again.",
            code="network",
        ) from exc

    try:
        data = json.loads(raw_text) if raw_text else {}
    except json.JSONDecodeError as exc:
        raise EvcPlusError(
            "Unexpected response from the payment gateway.",
            code="invalid_response",
        ) from exc

    if not isinstance(data, dict):
        data = {"raw": data}

    response_msg = str(data.get("responseMsg") or data.get("response_msg") or "")
    response_code = str(
        data.get("responseCode") or data.get("response_code") or ""
    )
    success = response_msg.strip().upper() == "RCS_SUCCESS" or response_code in {
        "2001",
        "0",
    }

    result = EvcPurchaseResult(
        success=success,
        request_id=request_id,
        reference_id=reference,
        invoice_id=invoice,
        amount=amount_str,
        currency=currency,
        payer_account=account,
        response_code=response_code or None,
        response_msg=response_msg or None,
        raw=data,
    )

    if not success:
        raise EvcPlusError(
            _friendly_message(
                response_msg,
                "Payment failed. Approve the EVC Plus prompt and try again.",
            ),
            code=response_code or "failed",
        )

    if status and int(status) >= 400:
        raise EvcPlusError(
            "Payment gateway returned an error.",
            code=str(status),
        )

    return result
