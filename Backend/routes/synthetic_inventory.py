"""Local synthetic inventory endpoints; not for healthcare operations."""
from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from database.database import db
from routes.access import _unavailable
from routes.synthetic_requests import _configured_locally, _identity
from security.synthetic_inventory import InventoryConflict, NotFound, grant, receive, reserve, stock
from security.synthetic_requests import RequestDenied, RequestValidationError, RetryConflict

synthetic_inventory_bp = Blueprint("synthetic_inventory", __name__, url_prefix="/api/v1")


def _run(operation):
    if not _configured_locally():
        return _unavailable()
    identity, error = _identity()
    if error:
        return error
    try:
        with db.engine.begin() as connection:
            body, code = operation(connection, identity)
    except RequestValidationError as exc:
        return jsonify(status="invalid", message=str(exc)), 400
    except RequestDenied:
        return jsonify(status="forbidden", message="Access denied."), 403
    except NotFound:
        return jsonify(status="not_found", message="Not found."), 404
    except (InventoryConflict, RetryConflict):
        return jsonify(status="conflict", message="The operation conflicts with current state."), 409
    except SQLAlchemyError:
        return _unavailable()
    return jsonify(status="success", mode="synthetic-only", **body), code


@synthetic_inventory_bp.post("/organizations/<uuid:organization_id>/synthetic-inventory/receipts")
def add_receipt(organization_id):
    def run(connection, identity):
        result, created = receive(connection, identity, organization_id, request.get_json(silent=True), request.headers.get("Idempotency-Key"))
        return {"receipt": result}, 201 if created else 200
    return _run(run)


@synthetic_inventory_bp.get("/organizations/<uuid:organization_id>/synthetic-inventory")
def read_stock(organization_id):
    return _run(lambda connection, identity: ({"stock": stock(connection, identity, organization_id, request.args.get("blood_type"))}, 200))


@synthetic_inventory_bp.post("/organizations/<uuid:organization_id>/synthetic-requests/<uuid:request_id>/bank-grants")
def grant_bank(organization_id, request_id):
    def run(connection, identity):
        created = grant(connection, identity, organization_id, request_id, request.get_json(silent=True))
        return {"granted": True}, 201 if created else 200
    return _run(run)


@synthetic_inventory_bp.post("/organizations/<uuid:organization_id>/synthetic-reservations")
def reserve_request(organization_id):
    def run(connection, identity):
        result, created = reserve(connection, identity, organization_id, request.get_json(silent=True))
        return {"reservation": result}, 201 if created else 200
    return _run(run)
