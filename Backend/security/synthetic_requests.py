"""Synthetic-only request service. The caller owns the transaction."""
import hashlib
import json
from uuid import UUID, uuid4

from sqlalchemy import text

from security.supabase_identity import VerifiedIdentity


class RequestValidationError(Exception):
    pass


class RequestDenied(Exception):
    pass


class RetryConflict(Exception):
    pass


_BLOOD_TYPES = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
_URGENCIES = {"routine", "urgent", "critical"}


def validate_input(payload, key):
    if not isinstance(payload, dict) or set(payload) != {"blood_type", "units_required", "urgency"}:
        raise RequestValidationError("Provide only blood_type, units_required and urgency.")
    if not isinstance(payload["blood_type"], str) or payload["blood_type"] not in _BLOOD_TYPES:
        raise RequestValidationError("Invalid blood_type.")
    if type(payload["units_required"]) is not int or not 1 <= payload["units_required"] <= 10:
        raise RequestValidationError("units_required must be an integer from 1 to 10.")
    if not isinstance(payload["urgency"], str) or payload["urgency"] not in _URGENCIES:
        raise RequestValidationError("Invalid urgency.")
    try:
        parsed_key = UUID(key)
    except (ValueError, TypeError, AttributeError) as exc:
        raise RequestValidationError("Idempotency-Key must be a UUID.") from exc
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return parsed_key, digest


def _authorize_and_lock(connection, identity, org_id):
    if not isinstance(identity, VerifiedIdentity):
        raise RequestDenied()
    try:
        subject = UUID(identity.subject)
        organization = UUID(str(org_id))
    except (TypeError, ValueError, AttributeError) as exc:
        raise RequestDenied() from exc
    # Share locks prevent concurrent status changes until the request transaction
    # commits. Future operations must implement their own transaction checks.
    row = connection.execute(text("""
        SELECT 1 FROM bloodbridge_private.identities i
        JOIN bloodbridge_private.memberships m ON m.subject_id=i.subject_id
        JOIN bloodbridge_private.organizations o ON o.id=m.organization_id
        WHERE i.subject_id=:subject AND o.id=:org
          AND i.status='active' AND o.status='verified' AND o.kind='hospital'
          AND m.status='active' AND m.role='hospital_operator'
        FOR SHARE OF i, m, o
    """), {"subject": subject, "org": organization}).scalar_one_or_none()
    if row is None:
        raise RequestDenied()
    return subject, organization


def _public(row):
    return {
        "id": str(row["id"]), "organization_id": str(row["organization_id"]),
        "blood_type": row["blood_type"], "units_required": row["units_required"],
        "urgency": row["urgency"], "status": row["status"],
        "created_at": row["created_at"].isoformat(),
    }


def create_request(connection, identity, org_id, payload, key):
    key, digest = validate_input(payload, key)
    subject, organization = _authorize_and_lock(connection, identity, org_id)
    params = {"id": uuid4(), "org": organization, "subject": subject, "key": key,
              "digest": digest, **payload}
    row = connection.execute(text("""
        INSERT INTO bloodbridge_private.synthetic_requests
            (id,organization_id,requested_by,idempotency_key,payload_hash,blood_type,units_required,urgency)
        VALUES (:id,:org,:subject,:key,:digest,:blood_type,:units_required,:urgency)
        ON CONFLICT (organization_id, requested_by, idempotency_key) DO NOTHING
        RETURNING id,organization_id,blood_type,units_required,urgency,status,created_at,payload_hash
    """), params).mappings().one_or_none()
    created = row is not None
    if created:
        connection.execute(text("""
            INSERT INTO bloodbridge_private.synthetic_request_audit(request_id,event_type)
            VALUES (:id,'created')
        """), {"id": row["id"]})
    else:
        row = connection.execute(text("""
            SELECT id,organization_id,blood_type,units_required,urgency,status,created_at,payload_hash
            FROM bloodbridge_private.synthetic_requests
            WHERE organization_id=:org AND requested_by=:subject AND idempotency_key=:key
        """), params).mappings().one()
        if row["payload_hash"] != digest:
            raise RetryConflict()
    return _public(row), created


def get_request(connection, identity, org_id, request_id):
    _, organization = _authorize_and_lock(connection, identity, org_id)
    row = connection.execute(text("""
        SELECT id,organization_id,blood_type,units_required,urgency,status,created_at
        FROM bloodbridge_private.synthetic_requests WHERE id=:id AND organization_id=:org
    """), {"id": request_id, "org": organization}).mappings().one_or_none()
    return _public(row) if row else None
