from flask import Blueprint, request, jsonify
from database.database import db
from database.models import Appointment, Donor, BloodBank
from datetime import datetime


appointment_bp = Blueprint(
    "appointments",
    __name__,
    url_prefix="/api/appointments"
)


# ============================================================
# STEP 7B
# CREATE DONATION APPOINTMENT
# ============================================================

@appointment_bp.route("", methods=["POST"])
def create_appointment():

    data = request.get_json() or {}


    # --------------------------------------------------------
    # REQUIRED FIELDS
    # --------------------------------------------------------

    required_fields = [
        "donor_id",
        "blood_bank_id",
        "appointment_date",
        "appointment_time"
    ]


    for field in required_fields:

        if field not in data:

            return jsonify({
                "status": "error",
                "message": f"Missing required field: {field}"
            }), 400


    # --------------------------------------------------------
    # CHECK DONOR
    # --------------------------------------------------------

    donor = db.session.get(
        Donor,
        data["donor_id"]
    )


    if not donor:

        return jsonify({
            "status": "error",
            "message": "Donor not found"
        }), 404


    # --------------------------------------------------------
    # CHECK BLOOD BANK
    # --------------------------------------------------------

    blood_bank = db.session.get(
        BloodBank,
        data["blood_bank_id"]
    )


    if not blood_bank:

        return jsonify({
            "status": "error",
            "message": "Blood bank not found"
        }), 404


    # --------------------------------------------------------
    # VALIDATE DATE
    # --------------------------------------------------------

    try:

        appointment_date = datetime.strptime(
            data["appointment_date"],
            "%Y-%m-%d"
        ).date()

    except (TypeError, ValueError):

        return jsonify({
            "status": "error",
            "message":
                "appointment_date must be YYYY-MM-DD"
        }), 400


    # --------------------------------------------------------
    # CREATE APPOINTMENT
    # --------------------------------------------------------

    appointment = Appointment(

        donor_id=data["donor_id"],

        blood_bank_id=data["blood_bank_id"],

        appointment_date=appointment_date,

        appointment_time=data["appointment_time"],

        status="scheduled",

        notes=data.get("notes")

    )


    db.session.add(appointment)

    db.session.commit()


    # --------------------------------------------------------
    # SUCCESS
    # --------------------------------------------------------

    return jsonify({

        "status": "success",

        "message":
            "Donation appointment scheduled successfully",

        "appointment":
            appointment.to_dict()

    }), 201


# ============================================================
# STEP 7B
# GET DONOR APPOINTMENTS
# ============================================================

@appointment_bp.route(
    "/donor/<int:donor_id>",
    methods=["GET"]
)
def get_donor_appointments(donor_id):

    donor = db.session.get(
        Donor,
        donor_id
    )


    if not donor:

        return jsonify({
            "status": "error",
            "message": "Donor not found"
        }), 404


    appointments = Appointment.query.filter_by(
        donor_id=donor_id
    ).order_by(
        Appointment.appointment_date.desc()
    ).all()


    return jsonify({

        "status": "success",

        "count":
            len(appointments),

        "appointments": [

            appointment.to_dict()

            for appointment in appointments

        ]

    }), 200
# ============================================================
# STEP 7E
# CANCEL DONATION APPOINTMENT
# ============================================================

@appointment_bp.route(
    "/<int:appointment_id>/cancel",
    methods=["PUT"]
)
def cancel_appointment(appointment_id):

    # --------------------------------------------------------
    # FIND APPOINTMENT
    # --------------------------------------------------------

    appointment = db.session.get(
        Appointment,
        appointment_id
    )

    if not appointment:

        return jsonify({
            "status": "error",
            "message": "Appointment not found"
        }), 404


    # --------------------------------------------------------
    # CHECK CURRENT STATUS
    # --------------------------------------------------------

    if appointment.status == "cancelled":

        return jsonify({
            "status": "error",
            "message": "Appointment is already cancelled"
        }), 400


    # --------------------------------------------------------
    # PREVENT CANCELLING COMPLETED APPOINTMENT
    # --------------------------------------------------------

    if appointment.status == "completed":

        return jsonify({
            "status": "error",
            "message":
                "Completed appointments cannot be cancelled"
        }), 400


    # --------------------------------------------------------
    # CANCEL APPOINTMENT
    # --------------------------------------------------------

    appointment.status = "cancelled"

    db.session.commit()


    # --------------------------------------------------------
    # SUCCESS RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "status": "success",

        "message":
            "Donation appointment cancelled successfully",

        "appointment":
            appointment.to_dict()

    }), 200