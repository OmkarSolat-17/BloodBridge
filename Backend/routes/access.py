"""Read-only access check. Emergency and inventory operations remain disabled."""
from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from database.database import db
from security.authorization import allowed_actions
from security.supabase_identity import (
    IdentityServiceUnavailable, InvalidCredentials, VerifiedIdentity,
)

access_bp = Blueprint("access", __name__, url_prefix="/api/v1")


def _unavailable():
    return jsonify(status="unavailable", message="Access verification is unavailable."), 503


def _unauthorized():
    response = jsonify(status="unauthorized", message="A valid bearer token is required.")
    response.headers["WWW-Authenticate"] = "Bearer"
    return response, 401


@access_bp.get("/organizations/<uuid:organization_id>/access")
def organization_access(organization_id):
    """Check the authenticated user's current permissions for one organization.

    This response is informational only, not an authorization grant for future
    requests. Each actual operation must re-check permissions transactionally.
    """
    authorization = request.headers.get("Authorization", "")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return _unauthorized()

    provider = current_app.extensions.get("bloodbridge_identity_provider")
    if provider is None:
        return _unavailable()
    try:
        identity = provider.verify(parts[1])
    except InvalidCredentials:
        return _unauthorized()
    except IdentityServiceUnavailable:
        return _unavailable()
    if not isinstance(identity, VerifiedIdentity):
        return _unavailable()

    try:
        # SQLite cannot provide the schema or access isolation required here.
        if db.engine.dialect.name != "postgresql":
            return _unavailable()
        with db.engine.connect() as connection:
            actions = allowed_actions(connection, identity, organization_id)
    except SQLAlchemyError:
        return _unavailable()

    # A uniform denial avoids disclosing whether the organization exists.
    if not actions:
        return jsonify(status="forbidden", message="Access denied."), 403
    return jsonify(
        status="success", organization_id=str(organization_id),
        policy_actions=list(actions),
        note="Policy check only; real-world operations are not yet available.",
    )
