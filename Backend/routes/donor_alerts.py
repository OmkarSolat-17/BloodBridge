from flask import Blueprint, request, jsonify

from database.database import db
from database.models import DonorAlert, DonorResponse, EmergencyRequest


donor_alert_bp = Blueprint(
    "donor_alerts",
    __name__,
    url_prefix="/api/donor_alerts"
)


@donor_alert_bp.route("/<int:alert_id>/respond", methods=["POST"])
def respond_to_alert(alert_id):
    data = request.get_json() or {}
    response = data.get("response")

    if response == "rejected":
        response = "declined"

    if response not in ["accepted", "declined"]:
        return jsonify({
            "status": "error",
            "message": "response must be accepted or declined"
        }), 400

    alert = db.session.get(DonorAlert, alert_id)

    if not alert:
        return jsonify({
            "status": "error",
            "message": "Donor alert not found"
        }), 404

    emergency = db.session.get(
        EmergencyRequest,
        alert.emergency_request_id
    )

    if not emergency:
        return jsonify({
            "status": "error",
            "message": "Emergency request not found"
        }), 404

    if alert.status in ["accepted", "declined", "expired"]:
        return jsonify({
            "status": "error",
            "message": "Alert has already been answered",
            "alert": alert.to_dict()
        }), 409

    alert.status = response

    donor_response = DonorResponse(
        emergency_request_id=alert.emergency_request_id,
        donor_id=alert.donor_id,
        response="accepted" if response == "accepted" else "rejected"
    )
    db.session.add(donor_response)

    if response == "accepted" and emergency.status not in ["fulfilled", "matched_bank"]:
        emergency.status = "matched_donor"
        emergency.matched_donor_id = alert.donor_id

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Alert response recorded successfully",
        "alert": alert.to_dict(),
        "request": emergency.to_dict()
    }), 200


@donor_alert_bp.route("", methods=["GET"])
def list_alerts():
    donor_id = request.args.get("donor_id", type=int)
    request_id = request.args.get("request_id", type=int)

    query = DonorAlert.query

    if donor_id:
        query = query.filter_by(donor_id=donor_id)

    if request_id:
        query = query.filter_by(emergency_request_id=request_id)

    alerts = query.order_by(DonorAlert.created_at.desc()).all()

    return jsonify({
        "status": "success",
        "count": len(alerts),
        "alerts": [alert.to_dict() for alert in alerts]
    }), 200
