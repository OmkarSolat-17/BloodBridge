from flask import Blueprint, request, jsonify
from database.database import db
from database.models import Donor

from datetime import date, timedelta
from math import radians, sin, cos, sqrt, atan2


matching_bp = Blueprint(
    "matching",
    __name__,
    url_prefix="/api/matching"
)


# Blood compatibility rules
COMPATIBLE_DONORS = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"]
}


def calculate_distance(lat1, lon1, lat2, lon2):

    R = 6371  # Earth radius in kilometers

    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


@matching_bp.route("/nearby", methods=["GET"])
def find_nearby_donors():

    blood_type = request.args.get("blood_type")
    latitude = request.args.get("latitude", type=float)
    longitude = request.args.get("longitude", type=float)
    radius = request.args.get("radius", default=10, type=float)

    if not blood_type or latitude is None or longitude is None:
        return jsonify({
            "status": "error",
            "message": "blood_type, latitude and longitude are required"
        }), 400

    blood_type = blood_type.upper()

    if blood_type not in COMPATIBLE_DONORS:
        return jsonify({
            "status": "error",
            "message": "Invalid blood type"
        }), 400

    compatible_types = COMPATIBLE_DONORS[blood_type]

    donors = Donor.query.filter(
        Donor.blood_type.in_(compatible_types),
        Donor.opted_in_for_alerts == True
    ).all()

    nearby_donors = []

    today = date.today()

    for donor in donors:

        # Check eligibility
        if donor.last_donation_date is not None:

            next_eligible_date = (
                donor.last_donation_date
                + timedelta(days=90)
            )

            if today < next_eligible_date:
                continue

        # Calculate distance
        distance = calculate_distance(
            latitude,
            longitude,
            donor.latitude,
            donor.longitude
        )

        if distance <= radius:

            nearby_donors.append({
                "id": donor.id,
                "name": donor.name,
                "blood_type": donor.blood_type,
                "phone": donor.phone,
                "latitude": donor.latitude,
                "longitude": donor.longitude,
                "distance_km": round(distance, 2),
                "total_donations": donor.total_donations
            })

    # Closest donors first
    nearby_donors.sort(
        key=lambda donor: donor["distance_km"]
    )

    return jsonify({
        "status": "success",
        "blood_type_requested": blood_type,
        "radius_km": radius,
        "count": len(nearby_donors),
        "donors": nearby_donors
    }), 200
