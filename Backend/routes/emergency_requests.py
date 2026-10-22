from flask import Blueprint, request, jsonify
from database.models import (
    EmergencyRequest,
    Donor,
    DonorResponse,
    DonorAlert,
    Stock
)
from database.database import db
from math import radians, sin, cos, sqrt, atan2
from datetime import date, timedelta
import re

emergency_request_bp = Blueprint(
    "emergency_requests",
    __name__,
    url_prefix="/api/emergency-requests"
)

def get_compatible_blood_types(blood_type):

    compatibility = {

        "O-": ["O-"],

        "O+": ["O-", "O+"],

        "A-": ["O-", "A-"],

        "A+": ["O-", "O+", "A-", "A+"],

        "B-": ["O-", "B-"],

        "B+": ["O-", "O+", "B-", "B+"],

        "AB-": ["O-", "A-", "B-", "AB-"],

        "AB+": [
            "O-",
            "O+",
            "A-",
            "A+",
            "B-",
            "B+",
            "AB-",
            "AB+"
        ]
    }

    return compatibility.get(blood_type, [])

def normalize_blood_type(value):
    if not value:
        return None

    cleaned = str(value).upper().replace(" ", "")
    cleaned = cleaned.replace("POSITIVE", "+").replace("POS", "+")
    cleaned = cleaned.replace("NEGATIVE", "-").replace("NEG", "-")
    cleaned = cleaned.replace("PLUS", "+").replace("MINUS", "-")

    aliases = {
        "OPLUS": "O+",
        "ONEG": "O-",
        "APLUS": "A+",
        "ANEG": "A-",
        "BPLUS": "B+",
        "BNEG": "B-",
        "ABPLUS": "AB+",
        "ABNEG": "AB-"
    }

    return aliases.get(cleaned, cleaned)

def parse_request_text(text):
    text = text or ""
    normalized = text.upper()

    blood_match = re.search(
        r"\b(AB|A|B|O)\s*(\+|-|POSITIVE|NEGATIVE|POS|NEG|PLUS|MINUS)\b",
        normalized
    )
    blood_type = None

    if blood_match:
        blood_type = normalize_blood_type(
            blood_match.group(1) + blood_match.group(2)
        )

    units_match = re.search(r"\b(\d+)\s*(?:UNIT|UNITS|BAG|BAGS)?\b", normalized)
    quantity_units = int(units_match.group(1)) if units_match else 1

    urgency_level = "medium"
    if any(word in normalized for word in ["CRITICAL", "URGENT", "EMERGENCY", "ASAP"]):
        urgency_level = "critical"
    elif any(word in normalized for word in ["HIGH", "SOON", "SERIOUS"]):
        urgency_level = "high"

    return {
        "blood_type": blood_type,
        "quantity_units": quantity_units,
        "urgency_level": urgency_level
    }

def calculate_donor_score(donor, distance):

    score = 0
    reasons = []


    # Distance score (40)
    if distance <= 5:
        score += 40
        reasons.append("Very close location")
    elif distance <= 10:
        score += 30
        reasons.append("Nearby location")
    else:
        score += 15


    # Eligibility score (30)
    from datetime import date

    if donor.last_donation_date:

        days = (date.today() - donor.last_donation_date).days

        if days >= 90:
            score += 30
            reasons.append("Eligible donor")


    # Donation history (20)
    if donor.total_donations:

        if donor.total_donations >= 5:
            score += 20
            reasons.append("Experienced donor")

        elif donor.total_donations >= 1:
            score += 10


    # Alert preference (10)
    if donor.opted_in_for_alerts:
        score += 10
        reasons.append("Available for emergency alerts")


    return score, reasons

@emergency_request_bp.route("", methods=["POST"])
@emergency_request_bp.route("/create", methods=["POST"])
def create_emergency_request():

    data = request.get_json() or {}
    parsed = parse_request_text(data.get("raw_text") or data.get("text") or "")

    blood_type = normalize_blood_type(
        data.get("blood_type") or parsed.get("blood_type")
    )
    units_required = data.get(
        "units_required",
        data.get("quantity_units", parsed["quantity_units"])
    )
    urgency = data.get(
        "urgency",
        data.get("urgency_level", parsed["urgency_level"])
    )

    required_fields = [
        "latitude",
        "longitude"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "status": "error",
                "message": f"{field} is required"
            }), 400

    if not blood_type:
        return jsonify({
            "status": "error",
            "message": "blood_type is required or must be parseable from raw_text"
        }), 400

    if not units_required:
        return jsonify({
            "status": "error",
            "message": "units_required/quantity_units is required"
        }), 400

    request_data = EmergencyRequest(
        patient_name=data.get("patient_name") or data.get("requester_name") or "Unknown",
        requester_name=data.get("requester_name"),
        requester_phone=data.get("requester_phone"),
        raw_text=data.get("raw_text") or data.get("text"),
        blood_type=blood_type,
        units_required=int(units_required),
        hospital_name=data.get("hospital_name") or "Unknown",
        latitude=data["latitude"],
        longitude=data["longitude"],
        urgency=urgency,
        status="pending"
    )

    db.session.add(request_data)
    db.session.flush()

    bank_match = reserve_bank_match(
        request_data,
        radius_km=float(data.get("bank_radius_km", 50))
    )

    alerts = []
    if not bank_match:
        alerts = create_donor_alerts(
            request_data,
            radius_km=float(data.get("donor_radius_km", 25))
        )

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Emergency blood request created successfully",
        "parsed": parsed,
        "request": request_data.to_dict(),
        "matched_bank": bank_match,
        "donor_alerts": alerts
    }), 201

@emergency_request_bp.route("", methods=["GET"])
def get_emergency_requests():

    requests = EmergencyRequest.query.all()

    return jsonify({
        "status": "success",
        "requests": [
            req.to_dict()
            for req in requests
        ]
    }), 200

@emergency_request_bp.route("/<int:request_id>/status", methods=["GET"])
def get_request_status(request_id):

    emergency = db.session.get(EmergencyRequest, request_id)

    if not emergency:
        return jsonify({
            "status": "error",
            "message": "Emergency request not found"
        }), 404

    alerts = DonorAlert.query.filter_by(
        emergency_request_id=request_id
    ).all()

    return jsonify({
        "status": "success",
        "request": emergency.to_dict(),
        "alerts": [alert.to_dict() for alert in alerts]
    }), 200

@emergency_request_bp.route("/<int:request_id>/match", methods=["POST"])
def match_request_to_bank(request_id):

    emergency = db.session.get(EmergencyRequest, request_id)

    if not emergency:
        return jsonify({
            "status": "error",
            "message": "Emergency request not found"
        }), 404

    data = request.get_json() or {}
    bank_match = reserve_bank_match(
        emergency,
        radius_km=float(data.get("radius_km", 50))
    )

    if not bank_match:
        alerts = create_donor_alerts(
            emergency,
            radius_km=float(data.get("donor_radius_km", 25))
        )
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "No blood bank had enough stock; donor broadcast created",
            "request": emergency.to_dict(),
            "matched_bank": None,
            "donor_alerts": alerts
        }), 200

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Request matched to nearest blood bank with sufficient stock",
        "request": emergency.to_dict(),
        "matched_bank": bank_match
    }), 200

@emergency_request_bp.route("/<int:request_id>/broadcast", methods=["POST"])
def broadcast_request_to_donors(request_id):

    emergency = db.session.get(EmergencyRequest, request_id)

    if not emergency:
        return jsonify({
            "status": "error",
            "message": "Emergency request not found"
        }), 404

    data = request.get_json() or {}
    alerts = create_donor_alerts(
        emergency,
        radius_km=float(data.get("radius_km", 25)),
        limit=int(data.get("limit", 5))
    )
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Emergency alerts sent successfully",
        "request": emergency.to_dict(),
        "total_alerts_sent": len(alerts),
        "alerts": alerts
    }), 200

@emergency_request_bp.route("/<int:request_id>/match-donors", methods=["GET"])
def match_donors(request_id):

    emergency = EmergencyRequest.query.get(request_id)

    if not emergency:
        return jsonify({
            "status": "error",
            "message": "Emergency request not found"
        }), 404


    compatible_types = get_compatible_blood_types(
        emergency.blood_type)


    donors = Donor.query.filter(
        Donor.blood_type.in_(compatible_types)
        ).all()


    matched_donors = []

    for donor in donors:

        distance = calculate_distance(
            emergency.latitude,
            emergency.longitude,
            donor.latitude,
            donor.longitude
        )

        score, reasons = calculate_donor_score(donor,distance)


        matched_donors.append({
            "name": donor.name,
            "phone": donor.phone,
            "blood_type": donor.blood_type,
            "distance_km": round(distance,2),
            "match_score": score,
            "reasons": reasons})


    matched_donors.sort(
        key=lambda x: x["match_score"],
        reverse=True)


    return jsonify({
        "status":"success",
        "total_matches":len(matched_donors),
        "recommended_donors":matched_donors[:5]
    })

@emergency_request_bp.route(
    "/<int:emergency_id>/respond",
    methods=["POST"]
)
def donor_response(emergency_id):

    data = request.get_json()

    donor_id = data.get("donor_id")
    response = data.get("response")

    # Validate required fields
    if not donor_id or not response:
        return jsonify({
            "status": "error",
            "message": "donor_id and response are required"
        }), 400

    # Validate response
    if response == "declined":
        response = "rejected"

    if response not in ["accepted", "rejected"]:
        return jsonify({
            "status": "error",
            "message": "response must be accepted, declined or rejected"
        }), 400

    # Find emergency
    emergency = EmergencyRequest.query.get(emergency_id)

    if not emergency:
        return jsonify({
            "status": "error",
            "message": "Emergency request not found"
        }), 404

    # Find donor
    donor = Donor.query.get(donor_id)

    if not donor:
        return jsonify({
            "status": "error",
            "message": "Donor not found"
        }), 404

    # Check if donor already responded
    existing_response = DonorResponse.query.filter_by(
        emergency_request_id=emergency_id,
        donor_id=donor_id
    ).first()

    if existing_response:
        return jsonify({
            "status": "error",
            "message": "Donor has already responded to this emergency"
        }), 409

    # Create response
    donor_response = DonorResponse(
        emergency_request_id=emergency_id,
        donor_id=donor_id,
        response=response
    )

    db.session.add(donor_response)

    alert = DonorAlert.query.filter_by(
        emergency_request_id=emergency_id,
        donor_id=donor_id
    ).first()

    if alert:
        alert.status = "accepted" if response == "accepted" else "declined"

    if response == "accepted" and emergency.status not in ["fulfilled", "matched_bank"]:
        emergency.matched_donor_id = donor.id
        emergency.status = "matched_donor"

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Donor response recorded successfully",
        "response": donor_response.to_dict(),
        "request": emergency.to_dict(),
        "alert": alert.to_dict() if alert else None
    }), 201

@emergency_request_bp.route(
    "/<int:emergency_id>/responses",
    methods=["GET"]
)
def get_donor_responses(emergency_id):

    emergency = EmergencyRequest.query.get(emergency_id)

    if not emergency:
        return jsonify({
            "status": "error",
            "message": "Emergency request not found"
        }), 404


    responses = DonorResponse.query.filter_by(
        emergency_request_id=emergency_id
    ).all()


    return jsonify({
        "status": "success",
        "total_responses": len(responses),
        "responses": [
            {
                "donor_id": r.donor_id,
                "donor_name": r.donor.name,
                "phone": r.donor.phone,
                "response": r.response
            }
            for r in responses
        ]
    }), 200

def calculate_distance(lat1, lon1, lat2, lon2):

    R = 6371

    lat1 = radians(lat1)
    lon1 = radians(lon1)

    lat2 = radians(lat2)
    lon2 = radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2

    c = 2 * atan2(sqrt(a), sqrt(1-a))

    return R*c

def find_nearest_bank_with_stock(emergency, radius_km=50):
    matches = []

    stock_rows = Stock.query.filter(
        Stock.blood_type == emergency.blood_type,
        Stock.units_available >= emergency.units_required
    ).all()

    for stock in stock_rows:
        bank = stock.blood_bank
        distance = calculate_distance(
            emergency.latitude,
            emergency.longitude,
            bank.latitude,
            bank.longitude
        )

        if distance <= radius_km:
            matches.append({
                "bank": bank,
                "stock": stock,
                "distance_km": distance
            })

    matches.sort(key=lambda item: item["distance_km"])
    return matches[0] if matches else None

def reserve_bank_match(emergency, radius_km=50):
    match = find_nearest_bank_with_stock(emergency, radius_km)

    if not match:
        return None

    stock = match["stock"]
    stock.units_available -= emergency.units_required
    stock.reserved_units += emergency.units_required
    emergency.matched_bank_id = match["bank"].id
    emergency.status = "matched_bank"

    return {
        "blood_bank": match["bank"].to_dict(),
        "stock": stock.to_dict(),
        "distance_km": round(match["distance_km"], 2)
    }

def eligible_compatible_donors(emergency, radius_km=25, limit=5):
    compatible_types = get_compatible_blood_types(emergency.blood_type)
    today = date.today()
    matches = []

    donors = Donor.query.filter(
        Donor.blood_type.in_(compatible_types),
        Donor.opted_in_for_alerts == True
    ).all()

    for donor in donors:
        if donor.last_donation_date:
            next_eligible_date = donor.last_donation_date + timedelta(days=90)
            if today < next_eligible_date:
                continue

        distance = calculate_distance(
            emergency.latitude,
            emergency.longitude,
            donor.latitude,
            donor.longitude
        )

        if distance <= radius_km:
            score, reasons = calculate_donor_score(donor, distance)
            matches.append({
                "donor": donor,
                "distance": distance,
                "score": score,
                "reasons": reasons
            })

    matches.sort(key=lambda item: (item["score"], -item["distance"]), reverse=True)
    return matches[:limit]

def create_donor_alerts(emergency, radius_km=25, limit=5):
    selected_donors = eligible_compatible_donors(emergency, radius_km, limit)
    alerts_created = []

    for match in selected_donors:
        donor = match["donor"]
        existing_alert = DonorAlert.query.filter_by(
            emergency_request_id=emergency.id,
            donor_id=donor.id
        ).first()

        if existing_alert:
            continue

        alert = DonorAlert(
            emergency_request_id=emergency.id,
            donor_id=donor.id,
            status="sent"
        )

        db.session.add(alert)
        alerts_created.append({
            "donor_id": donor.id,
            "name": donor.name,
            "blood_type": donor.blood_type,
            "distance_km": round(match["distance"], 2),
            "match_score": match["score"],
            "reasons": match["reasons"]
        })

    return alerts_created

@emergency_request_bp.route(
    "/<int:emergency_id>/alert-donors",
    methods=["POST"]
)
def alert_donors(emergency_id):

    emergency = EmergencyRequest.query.get(emergency_id)

    if not emergency:
        return jsonify({
            "status": "error",
            "message": "Emergency request not found"
        }), 404

    data = request.get_json() or {}
    alerts_created = create_donor_alerts(
        emergency,
        radius_km=float(data.get("radius_km", 25)),
        limit=int(data.get("limit", 5))
    )

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Emergency alerts sent successfully",
        "emergency_id": emergency_id,
        "total_alerts_sent": len(alerts_created),
        "alerts": alerts_created
    }), 200

@emergency_request_bp.route(
    "/<int:emergency_id>/status",
    methods=["PUT"]
)
def update_emergency_status(emergency_id):

    data = request.get_json()

    new_status = data.get("status")

    allowed_statuses = [
        "pending",
        "active",
        "matched_bank",
        "matched_donor",
        "fulfilled",
        "expired",
        "closed",
        "cancelled"
    ]

    if new_status not in allowed_statuses:
        return jsonify({
            "status": "error",
            "message": "Invalid status",
            "allowed_statuses": allowed_statuses
        }), 400

    emergency = EmergencyRequest.query.get(emergency_id)

    if not emergency:
        return jsonify({
            "status": "error",
            "message": "Emergency request not found"
        }), 404

    emergency.status = new_status

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Emergency status updated successfully",
        "emergency": emergency.to_dict()
    }), 200
