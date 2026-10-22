from flask import Blueprint, jsonify

from database.database import db
from database.models import Donor, BloodBank, Stock, EmergencyRequest


dashboard_bp = Blueprint(
    "dashboard",
    __name__
)


@dashboard_bp.route("/stats", methods=["GET"])
def dashboard_stats():

    total_donors = Donor.query.count()

    total_blood_banks = BloodBank.query.count()

    total_requests = EmergencyRequest.query.count()

    total_stock = db.session.query(
        db.func.sum(Stock.units_available)
    ).scalar()


    return jsonify({

        "status": "success",

        "dashboard": {

            "total_donors": total_donors,

            "total_blood_banks": total_blood_banks,

            "total_emergency_requests": total_requests,

            "available_blood_units": total_stock or 0

        }

    })