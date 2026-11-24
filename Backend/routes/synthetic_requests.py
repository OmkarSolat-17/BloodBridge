"""Local, synthetic-only request endpoints. No clinical workflows."""
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from database.database import db
from routes.access import _unauthorized, _unavailable
from security.supabase_identity import IdentityServiceUnavailable, InvalidCredentials, VerifiedIdentity
from security.synthetic_requests import (
    RequestDenied, RequestValidationError, RetryConflict, create_request, get_request,
)

synthetic_requests_bp = Blueprint("synthetic_requests", __name__, url_prefix="/api/v1")


def _configured_locally():
    if current_app.config.get("BLOODBRIDGE_ENABLE_SYNTHETIC_REQUESTS") != "1":
        return False
    url = db.engine.url
    return (url.get_backend_name() == "postgresql" and
            url.host in ("127.0.0.1", "localhost", "::1") and
            url.database in ("bloodbridge_dev", "bloodbridge_test"))


def _identity():
    parts = request.headers.get("Authorization", "").split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None, _unauthorized()
    provider = current_app.extensions.get("bloodbridge_identity_provider")
    if provider is None:
        return None, _unavailable()
    try:
        identity = provider.verify(parts[1])
    except InvalidCredentials:
        return None, _unauthorized()
    except IdentityServiceUnavailable:
        return None, _unavailable()
    if not isinstance(identity, VerifiedIdentity):
        return None, _unavailable()
    return identity, None


@synthetic_requests_bp.post("/organizations/<uuid:organization_id>/synthetic-requests")
def create(organization_id):
    if not _configured_locally():
        return _unavailable()
    identity, error = _identity()
    if error:
        return error
    try:
        with db.engine.begin() as connection:
            result, created = create_request(connection, identity, organization_id,
                                             request.get_json(silent=True),
                                             request.headers.get("Idempotency-Key"))
    except RequestValidationError as exc:
        return jsonify(status="invalid", message=str(exc)), 400
    except RequestDenied:
        return jsonify(status="forbidden", message="Access denied."), 403
    except RetryConflict:
        return jsonify(status="conflict", message="Idempotency key was used with different data."), 409
    except SQLAlchemyError:
        return _unavailable()
    return jsonify(status="success", mode="synthetic-only", request=result), 201 if created else 200


@synthetic_requests_bp.get("/organizations/<uuid:organization_id>/synthetic-requests/<uuid:request_id>")
def read(organization_id, request_id):
    if not _configured_locally():
        return _unavailable()
    identity, error = _identity()
    if error:
        return error
    try:
        with db.engine.begin() as connection:
            result = get_request(connection, identity, organization_id, request_id)
    except RequestDenied:
        return jsonify(status="forbidden", message="Access denied."), 403
    except SQLAlchemyError:
        return _unavailable()
    if result is None:
        return jsonify(status="not_found", message="Request not found."), 404
    return jsonify(status="success", mode="synthetic-only", request=result)
