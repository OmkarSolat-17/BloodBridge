"""Transactional synthetic inventory and reservations; no clinical assumptions."""
import hashlib
import json
from uuid import UUID, uuid4

from sqlalchemy import text

from security.supabase_identity import VerifiedIdentity
from security.synthetic_requests import RequestDenied, RequestValidationError, RetryConflict, _authorize_and_lock

_BLOOD = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}


class NotFound(Exception):
    pass


class InventoryConflict(Exception):
    pass


def _uuid(value, message):
    try:
        return UUID(str(value))
    except (TypeError, ValueError, AttributeError) as exc:
        raise RequestValidationError(message) from exc


def _bank(connection, identity, bank_id):
    if not isinstance(identity, VerifiedIdentity):
        raise RequestDenied()
    subject, bank = _uuid(identity.subject, "Invalid identity."), _uuid(bank_id, "Invalid bank.")
    row = connection.execute(text("""
        SELECT 1 FROM bloodbridge_private.identities i
        JOIN bloodbridge_private.memberships m ON m.subject_id=i.subject_id
        JOIN bloodbridge_private.organizations o ON o.id=m.organization_id
        WHERE i.subject_id=:subject AND o.id=:bank AND i.status='active'
          AND o.status='verified' AND o.kind='blood_bank'
          AND m.status='active' AND m.role='blood_bank_operator'
        FOR SHARE OF i, m, o
    """), {"subject": subject, "bank": bank}).scalar_one_or_none()
    if row is None:
        raise RequestDenied()
    return subject, bank


def _audit(connection, org, actor, event, request_id=None):
    connection.execute(text("""
        INSERT INTO bloodbridge_private.synthetic_inventory_audit(organization_id,actor,event_type,request_id)
        VALUES (:org,:actor,:event,:request)
    """), {"org": org, "actor": actor, "event": event, "request": request_id})


def receive(connection, identity, bank_id, payload, key):
    if not isinstance(payload, dict) or set(payload) != {"blood_type", "units"}:
        raise RequestValidationError("Provide only blood_type and units.")
    blood, units = payload["blood_type"], payload["units"]
    if not isinstance(blood, str) or blood not in _BLOOD or type(units) is not int or not 1 <= units <= 100:
        raise RequestValidationError("Invalid blood_type or units (1–100).")
    token = _uuid(key, "Idempotency-Key must be a UUID.")
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    actor, bank = _bank(connection, identity, bank_id)
    p = {"id": uuid4(), "bank": bank, "actor": actor, "key": token, "digest": digest, "blood": blood, "units": units}
    receipt = connection.execute(text("""
        INSERT INTO bloodbridge_private.synthetic_receipts(id,bank_id,actor,idempotency_key,payload_hash,blood_type,units)
        VALUES (:id,:bank,:actor,:key,:digest,:blood,:units)
        ON CONFLICT (bank_id,actor,idempotency_key) DO NOTHING RETURNING id,payload_hash
    """), p).mappings().one_or_none()
    created = receipt is not None
    if created:
        connection.execute(text("""
            INSERT INTO bloodbridge_private.synthetic_inventory(bank_id,blood_type,units_available)
            VALUES (:bank,:blood,:units)
            ON CONFLICT (bank_id,blood_type) DO UPDATE
            SET units_available=bloodbridge_private.synthetic_inventory.units_available + EXCLUDED.units_available
        """), p)
        _audit(connection, bank, actor, "receipt")
    else:
        receipt = connection.execute(text("""
            SELECT id,payload_hash FROM bloodbridge_private.synthetic_receipts
            WHERE bank_id=:bank AND actor=:actor AND idempotency_key=:key
        """), p).mappings().one()
        if receipt["payload_hash"] != digest:
            raise RetryConflict()
    return {"id": str(receipt["id"]), "blood_type": blood, "units": units}, created


def stock(connection, identity, bank_id, blood):
    if not isinstance(blood, str) or blood not in _BLOOD:
        raise RequestValidationError("Invalid blood_type.")
    _, bank = _bank(connection, identity, bank_id)
    units = connection.execute(text("SELECT units_available FROM bloodbridge_private.synthetic_inventory WHERE bank_id=:bank AND blood_type=:blood"), {"bank": bank, "blood": blood}).scalar_one_or_none()
    return {"blood_type": blood, "units_available": units if units is not None else 0}


def grant(connection, identity, hospital_id, request_id, payload):
    if not isinstance(payload, dict) or set(payload) != {"bank_id"}:
        raise RequestValidationError("Provide only bank_id.")
    bank_id = _uuid(payload["bank_id"], "bank_id must be a UUID.")
    actor, hospital = _authorize_and_lock(connection, identity, hospital_id)
    req = connection.execute(text("SELECT status FROM bloodbridge_private.synthetic_requests WHERE id=:id AND organization_id=:org FOR UPDATE"), {"id": request_id, "org": hospital}).mappings().one_or_none()
    if req is None:
        raise NotFound()
    bank = connection.execute(text("SELECT 1 FROM bloodbridge_private.organizations WHERE id=:id AND kind='blood_bank' AND status='verified' FOR SHARE"), {"id": bank_id}).scalar_one_or_none()
    if bank is None:
        raise NotFound()
    existing = connection.execute(text("SELECT 1 FROM bloodbridge_private.synthetic_bank_grants WHERE request_id=:id AND bank_id=:bank"), {"id": request_id, "bank": bank_id}).scalar_one_or_none()
    if existing:
        return False
    if req["status"] != "open":
        raise InventoryConflict()
    connection.execute(text("INSERT INTO bloodbridge_private.synthetic_bank_grants(request_id,bank_id,granted_by) VALUES (:id,:bank,:actor)"), {"id": request_id, "bank": bank_id, "actor": actor})
    _audit(connection, hospital, actor, "bank_grant", request_id)
    return True


def reserve(connection, identity, bank_id, payload):
    if not isinstance(payload, dict) or set(payload) != {"request_id"}:
        raise RequestValidationError("Provide only request_id.")
    request_id = _uuid(payload["request_id"], "request_id must be a UUID.")
    actor, bank = _bank(connection, identity, bank_id)
    granted = connection.execute(text("SELECT 1 FROM bloodbridge_private.synthetic_bank_grants WHERE request_id=:id AND bank_id=:bank"), {"id": request_id, "bank": bank}).scalar_one_or_none()
    if not granted:
        raise NotFound()  # Do not reveal requests without an explicit grant.
    req = connection.execute(text("SELECT blood_type,units_required,status FROM bloodbridge_private.synthetic_requests WHERE id=:id FOR UPDATE"), {"id": request_id}).mappings().one_or_none()
    if req is None:
        raise NotFound()
    previous = connection.execute(text("SELECT id,bank_id,blood_type,units FROM bloodbridge_private.synthetic_reservations WHERE request_id=:id"), {"id": request_id}).mappings().one_or_none()
    if previous:
        if previous["bank_id"] != bank:
            raise InventoryConflict()
        return {"id": str(previous["id"]), "request_id": str(request_id), "blood_type": previous["blood_type"], "units": previous["units"]}, False
    if req["status"] != "open":
        raise InventoryConflict()
    # Exact type only. This is not a compatibility or crossmatch decision.
    updated = connection.execute(text("""
        UPDATE bloodbridge_private.synthetic_inventory SET units_available=units_available-:units
        WHERE bank_id=:bank AND blood_type=:blood AND units_available>=:units RETURNING units_available
    """), {"bank": bank, "blood": req["blood_type"], "units": req["units_required"]}).scalar_one_or_none()
    if updated is None:
        raise InventoryConflict()
    reservation_id = uuid4()
    connection.execute(text("""
        INSERT INTO bloodbridge_private.synthetic_reservations(id,request_id,bank_id,actor,blood_type,units)
        VALUES (:id,:request,:bank,:actor,:blood,:units)
    """), {"id": reservation_id, "request": request_id, "bank": bank, "actor": actor, "blood": req["blood_type"], "units": req["units_required"]})
    connection.execute(text("UPDATE bloodbridge_private.synthetic_requests SET status='reserved' WHERE id=:id"), {"id": request_id})
    _audit(connection, bank, actor, "reservation", request_id)
    return {"id": str(reservation_id), "request_id": str(request_id), "blood_type": req["blood_type"], "units": req["units_required"]}, True
