from flask import Blueprint, request, jsonify

from database.database import db
from database.models import BloodBank, Stock
from math import radians, sin, cos, sqrt, atan2


blood_bank_bp = Blueprint(
    "blood_banks",
    __name__,
    url_prefix="/api/blood-banks"
)

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


@blood_bank_bp.route("/register", methods=["POST"])
def register_blood_bank():

    data = request.get_json()

    # Check required fields
    required_fields = [
        "name",
        "latitude",
        "longitude"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "status": "error",
                "message": f"Missing required field: {field}"
            }), 400

    # Create blood bank
    blood_bank = BloodBank(
        name=data["name"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        contact_phone=data.get("contact_phone"),
        verified=data.get("verified", False)
    )

    db.session.add(blood_bank)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Blood bank registered successfully",
        "blood_bank": blood_bank.to_dict()
    }), 201

@blood_bank_bp.route("", methods=["GET"])
def get_blood_banks():

    blood_banks = BloodBank.query.all()

    return jsonify({
        "status": "success",
        "count": len(blood_banks),
        "blood_banks": [
            bank.to_dict()
            for bank in blood_banks
        ]
    }), 200

@blood_bank_bp.route("/<int:blood_bank_id>/stock", methods=["GET"])
def get_stock(blood_bank_id):

    blood_bank = db.session.get(
        BloodBank,
        blood_bank_id
    )

    if not blood_bank:
        return jsonify({
            "status": "error",
            "message": "Blood bank not found"
        }), 404

    stock = Stock.query.filter_by(
        blood_bank_id=blood_bank_id
    ).all()

    return jsonify({
        "status": "success",
        "blood_bank_id": blood_bank_id,
        "stock": [
            item.to_dict()
            for item in stock
        ]
    }), 200

@blood_bank_bp.route("/<int:blood_bank_id>/stock", methods=["POST"])
def update_stock(blood_bank_id):

    data = request.get_json()

    # Check required fields
    if "blood_type" not in data:
        return jsonify({
            "status": "error",
            "message": "blood_type is required"
        }), 400

    if "units_available" not in data:
        return jsonify({
            "status": "error",
            "message": "units_available is required"
        }), 400

    # Find blood bank
    blood_bank = db.session.get(
        BloodBank,
        blood_bank_id
    )

    if not blood_bank:
        return jsonify({
            "status": "error",
            "message": "Blood bank not found"
        }), 404

    # Check if this blood type already exists
    stock = Stock.query.filter_by(
        blood_bank_id=blood_bank_id,
        blood_type=data["blood_type"]
    ).first()

    if stock:

        # Update existing stock
        stock.units_available = data["units_available"]

    else:

        # Create new stock entry
        stock = Stock(
            blood_bank_id=blood_bank_id,
            blood_type=data["blood_type"],
            units_available=data["units_available"]
        )

        db.session.add(stock)

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Blood stock updated successfully",
        "stock": stock.to_dict()
    }), 200

@blood_bank_bp.route(
    "/<int:blood_bank_id>/stock/reserve",
    methods=["POST"]
)
def reserve_stock(blood_bank_id):

    data = request.get_json()

    blood_type = data.get("blood_type")
    units_required = data.get("units_required")

    # Validate input
    if not blood_type or units_required is None:
        return jsonify({
            "status": "error",
            "message": "blood_type and units_required are required"
        }), 400

    if units_required <= 0:
        return jsonify({
            "status": "error",
            "message": "units_required must be greater than 0"
        }), 400

    # Check blood bank
    blood_bank = db.session.get(
        BloodBank,
        blood_bank_id
    )

    if not blood_bank:
        return jsonify({
            "status": "error",
            "message": "Blood bank not found"
        }), 404

    # Find stock
    stock = Stock.query.filter_by(
        blood_bank_id=blood_bank_id,
        blood_type=blood_type
    ).first()

    if not stock:
        return jsonify({
            "status": "error",
            "message": "Blood stock not found"
        }), 404

    # Check available units
    if stock.units_available < units_required:
        return jsonify({
            "status": "error",
            "message": "Insufficient blood stock",
            "available_units": stock.units_available,
            "requested_units": units_required
        }), 409

    # Reserve units
    stock.units_available -= units_required
    stock.reserved_units += units_required

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Blood units reserved successfully",
        "reservation": {
            "blood_bank_id": blood_bank_id,
            "blood_type": blood_type,
            "units_reserved": units_required,
            "units_remaining": stock.units_available,
            "reserved_units": stock.reserved_units
        }
    }), 200

@blood_bank_bp.route("/nearby", methods=["GET"])
def get_nearby_blood_banks():

    latitude = request.args.get("lat", request.args.get("latitude", type=float), type=float)
    longitude = request.args.get("long", request.args.get("longitude", type=float), type=float)
    radius = request.args.get("radius", default=25, type=float)

    if latitude is None or longitude is None:
        return jsonify({
            "status": "error",
            "message": "lat/latitude and long/longitude are required"
        }), 400

    nearby_banks = []

    for bank in BloodBank.query.all():
        distance = calculate_distance(
            latitude,
            longitude,
            bank.latitude,
            bank.longitude
        )

        if distance <= radius:
            bank_data = bank.to_dict()
            bank_data["distance_km"] = round(distance, 2)
            bank_data["stock"] = [
                item.to_dict()
                for item in bank.stock
            ]
            nearby_banks.append(bank_data)

    nearby_banks.sort(key=lambda item: item["distance_km"])

    return jsonify({
        "status": "success",
        "radius_km": radius,
        "count": len(nearby_banks),
        "blood_banks": nearby_banks
    }), 200
