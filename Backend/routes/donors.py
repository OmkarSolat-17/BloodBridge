from flask import Blueprint, request, jsonify
from database.database import db
from database.models import Donor, User
from datetime import date, timedelta, datetime
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

donor_bp = Blueprint(
    "donors",
    __name__,
    url_prefix="/api/donors"
)

# ============================================================
# STEP 4C
# GET DONOR PROFILE USING USER ID
# ============================================================

@donor_bp.route("/user/<int:user_id>", methods=["GET"])
def get_donor_by_user(user_id):

    # --------------------------------------------------------
    # Verify that the logged-in user is requesting
    # their own donor profile
    # --------------------------------------------------------

    verify_jwt_in_request()

    current_user_id = get_jwt_identity()

    try:
        current_user_id = int(current_user_id)
    except (TypeError, ValueError):
        return jsonify({
            "status": "error",
            "message": "Invalid user identity"
        }), 401


    if current_user_id != user_id:
        return jsonify({
            "status": "error",
            "message": "You are not authorized to access this donor profile"
        }), 403


    # --------------------------------------------------------
    # FIND DONOR USING USER ID
    # --------------------------------------------------------

    donor = Donor.query.filter_by(
        user_id=user_id
    ).first()


    if not donor:
        return jsonify({
            "status": "error",
            "message": "Donor profile not found for this user"
        }), 404


    # --------------------------------------------------------
    # SUCCESS
    # --------------------------------------------------------

    return jsonify({
        "status": "success",
        "donor": donor.to_dict()
    }), 200


@donor_bp.route("/register", methods=["POST"])
def register_donor():

    data = request.get_json()
    verify_jwt_in_request(optional=True)
    user_id = get_jwt_identity()
    user_id = int(user_id) if user_id is not None else None

    required_fields = [
        "name",
        "phone",
        "blood_type",
        "latitude",
        "longitude"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "status": "error",
                "message": f"Missing required field: {field}"
            }), 400

    if user_id is None:
        phone_digits = "".join(
            ch for ch in str(data["phone"])
            if ch.isdigit()
        ) or "anonymous"
        base_email = f"donor_{phone_digits}@bloodbridge.local"
        email = base_email
        suffix = 1

        while User.query.filter_by(email=email).first():
            suffix += 1
            email = base_email.replace("@", f"_{suffix}@")

        user = User(
            name=data["name"],
            email=email,
            role="donor"
        )
        user.set_password("bloodbridge-demo")
        db.session.add(user)
        db.session.flush()
        user_id = user.id

    donor = Donor(
        user_id=user_id,
        name=data["name"],
        phone=data["phone"],
        blood_type=data["blood_type"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        last_donation_date=(datetime.strptime(
            data["last_donation_date"],"%Y-%m-%d").date()
        if data.get("last_donation_date")
        else None),
        total_donations=data.get("total_donations", 0),
        opted_in_for_alerts=data.get(
            "opted_in_for_alerts",
            True
        )
    )

    db.session.add(donor)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Donor registered successfully",
        "donor": donor.to_dict()
    }), 201

def donor_eligibility_payload(donor):
    if donor.last_donation_date is None:
        return {
            "eligible": True,
            "next_eligible_date": date.today().isoformat(),
            "days_remaining": 0
        }

    next_eligible_date = donor.last_donation_date + timedelta(days=90)
    days_remaining = (next_eligible_date - date.today()).days

    return {
        "eligible": date.today() >= next_eligible_date,
        "last_donation_date": donor.last_donation_date.isoformat(),
        "next_eligible_date": next_eligible_date.isoformat(),
        "days_remaining": max(days_remaining, 0)
    }

@donor_bp.route("", methods=["GET"])
def get_donors():

    donors = Donor.query.all()

    return jsonify({
        "status": "success",
        "count": len(donors),
        "donors": [
            donor.to_dict()
            for donor in donors
        ]
    }), 200

@donor_bp.route("/<int:donor_id>", methods=["GET"])
def get_donor(donor_id):

    donor = db.session.get(Donor, donor_id)

    if not donor:
        return jsonify({
            "status": "error",
            "message": "Donor not found"
        }), 404

    return jsonify({
        "status": "success",
        "donor": donor.to_dict(),
        "eligibility": donor_eligibility_payload(donor),
        "impact": {
            "total_donations": donor.total_donations,
            "estimated_lives_helped": donor.total_donations * 3
        }
    }), 200

@donor_bp.route("/<int:donor_id>/eligibility", methods=["GET"])
def check_donor_eligibility(donor_id):

    donor = db.session.get(Donor, donor_id)

    if not donor:
        return jsonify({
            "status": "error",
            "message": "Donor not found"
        }), 404

    payload = donor_eligibility_payload(donor)
    payload.update({
        "status": "success",
        "donor_id": donor.id
    })

    return jsonify(payload), 200

@donor_bp.route("/<int:donor_id>/donations", methods=["POST"])
def log_donation(donor_id):

    donor = db.session.get(Donor, donor_id)

    if not donor:
        return jsonify({
            "status": "error",
            "message": "Donor not found"
        }), 404

    data = request.get_json() or {}
    donation_date = data.get("donation_date")

    if donation_date:
        try:
            donor.last_donation_date = datetime.strptime(
                donation_date,
                "%Y-%m-%d"
            ).date()
        except ValueError:
            return jsonify({
                "status": "error",
                "message": "donation_date must be YYYY-MM-DD"
            }), 400

    if user_id is None:
        phone_digits = "".join(
            ch for ch in str(data["phone"])
            if ch.isdigit()
        ) or "anonymous"
        base_email = f"donor_{phone_digits}@bloodbridge.local"
        email = base_email
        suffix = 1

        while User.query.filter_by(email=email).first():
            suffix += 1
            email = base_email.replace("@", f"_{suffix}@")

        user = User(
            name=data["name"],
            email=email,
            role="donor"
        )
        user.set_password("bloodbridge-demo")
        db.session.add(user)
        db.session.flush()
        user_id = user.id
    else:
        donor.last_donation_date = date.today()

    donor.total_donations = (donor.total_donations or 0) + 1
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Donation logged successfully",
        "donor": donor.to_dict(),
        "eligibility": donor_eligibility_payload(donor)
    }), 200

# ============================================================
# STEP 6C
# UPDATE DONOR PROFILE
# ============================================================

@donor_bp.route("/<int:donor_id>", methods=["PUT"])
def update_donor(donor_id):

    verify_jwt_in_request()

    current_user_id = get_jwt_identity()

    try:
        current_user_id = int(current_user_id)
    except (TypeError, ValueError):

        return jsonify({
            "status": "error",
            "message": "Invalid user identity"
        }), 401


    donor = db.session.get(
        Donor,
        donor_id
    )


    if not donor:

        return jsonify({
            "status": "error",
            "message": "Donor not found"
        }), 404


    # Security check
    if donor.user_id != current_user_id:

        return jsonify({
            "status": "error",
            "message": "You are not authorized to update this donor profile"
        }), 403


    data = request.get_json() or {}


    # Update phone
    if "phone" in data:
        donor.phone = data["phone"]


    # Update location
    if "latitude" in data:
        donor.latitude = data["latitude"]


    if "longitude" in data:
        donor.longitude = data["longitude"]


    # Update alert preference
    if "opted_in_for_alerts" in data:

        donor.opted_in_for_alerts = bool(
            data["opted_in_for_alerts"]
        )


    # Update name
    if "name" in data and data["name"]:

        donor.name = data["name"]

        user = db.session.get(
            User,
            donor.user_id
        )

        if user:
            user.name = data["name"]


    # Save changes
    db.session.commit()


    return jsonify({

        "status": "success",

        "message":
            "Donor profile updated successfully",

        "donor":
            donor.to_dict()

    }), 200

@donor_bp.route("/<int:donor_id>", methods=["DELETE"])
def delete_donor(donor_id):

    donor = db.session.get(Donor, donor_id)


    if not donor:
        return jsonify({
            "status":"error",
            "message":"Donor not found"
        }),404


    db.session.delete(donor)

    db.session.commit()


    return jsonify({
        "status":"success",
        "message":"Donor deleted successfully"
    }),200

@donor_bp.route("/<int:donor_id>/dashboard", methods=["GET"])
def donor_dashboard(donor_id):

    donor = db.session.get(
        Donor,
        donor_id
    )


    if not donor:
        return jsonify({
            "status":"error",
            "message":"Donor not found"
        }),404


    return jsonify({

        "status":"success",

        "dashboard":{

            "name": donor.name,

            "blood_type": donor.blood_type,

            "total_donations":
                donor.total_donations,

            "available_for_alerts":
                donor.opted_in_for_alerts,

            "last_donation_date":
                donor.last_donation_date.isoformat()
                if donor.last_donation_date
                else None
        }

    })
