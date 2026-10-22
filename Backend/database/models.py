from datetime import datetime
from database.database import db
from werkzeug.security import generate_password_hash, check_password_hash

class Donor(db.Model):
    __tablename__ = "donors"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        unique=True,
        nullable=True)

    name = db.Column(db.String(100), nullable=False)

    phone = db.Column(db.String(20), nullable=False)

    blood_type = db.Column(db.String(5), nullable=False)

    latitude = db.Column(db.Float, nullable=False)

    longitude = db.Column(db.Float, nullable=False)

    last_donation_date = db.Column(db.Date, nullable=True)

    total_donations = db.Column(db.Integer, default=0)

    opted_in_for_alerts = db.Column(
        db.Boolean,
        default=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "blood_type": self.blood_type,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "last_donation_date": (
                self.last_donation_date.isoformat()
                if self.last_donation_date
                else None
            ),
            "total_donations": self.total_donations,
            "opted_in_for_alerts": self.opted_in_for_alerts,
            "created_at": self.created_at.isoformat()
        }

class BloodBank(db.Model):
    __tablename__ = "blood_banks"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(150), nullable=False)

    latitude = db.Column(db.Float, nullable=False)

    longitude = db.Column(db.Float, nullable=False)

    contact_phone = db.Column(db.String(20), nullable=True)

    verified = db.Column(db.Boolean, default=False)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "contact_phone": self.contact_phone,
            "verified": self.verified,
            "created_at": self.created_at.isoformat()
        }

class Stock(db.Model):
    __tablename__ = "stock"

    id = db.Column(db.Integer, primary_key=True)

    blood_bank_id = db.Column(
        db.Integer,
        db.ForeignKey("blood_banks.id"),
        nullable=False
    )

    blood_type = db.Column(
        db.String(5),
        nullable=False
    )

    units_available = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    reserved_units = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    last_updated = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationship with BloodBank
    blood_bank = db.relationship(
        "BloodBank",
        backref=db.backref(
            "stock",
            lazy=True
        )
    )

    def to_dict(self):
        return {
            "id": self.id,
            "blood_bank_id": self.blood_bank_id,
            "blood_type": self.blood_type,
            "units_available": self.units_available,
            "reserved_units": self.reserved_units,
            "last_updated": self.last_updated.isoformat()
        }

class EmergencyRequest(db.Model):
    __tablename__ = "emergency_requests"

    id = db.Column(db.Integer, primary_key=True)

    patient_name = db.Column(db.String(100), nullable=False)
    blood_type = db.Column(db.String(5), nullable=False)

    units_required = db.Column(db.Integer, nullable=False)

    hospital_name = db.Column(db.String(150), nullable=False)

    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    urgency = db.Column(db.String(20), default="normal", nullable=False)

    status = db.Column(db.String(20), default="pending", nullable=False)

    requester_name = db.Column(db.String(100), nullable=True)
    requester_phone = db.Column(db.String(20), nullable=True)
    raw_text = db.Column(db.Text, nullable=True)
    matched_bank_id = db.Column(
        db.Integer,
        db.ForeignKey("blood_banks.id"),
        nullable=True
    )
    matched_donor_id = db.Column(
        db.Integer,
        db.ForeignKey("donors.id"),
        nullable=True
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_name": self.patient_name,
            "blood_type": self.blood_type,
            "units_required": self.units_required,
            "hospital_name": self.hospital_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "urgency": self.urgency,
            "urgency_level": self.urgency,
            "status": self.status,
            "requester_name": self.requester_name,
            "requester_phone": self.requester_phone,
            "raw_text": self.raw_text,
            "matched_bank_id": self.matched_bank_id,
            "matched_donor_id": self.matched_donor_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class DonorResponse(db.Model):
    __tablename__ = "donor_responses"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    emergency_request_id = db.Column(
        db.Integer,
        db.ForeignKey("emergency_requests.id"),
        nullable=False
    )

    donor_id = db.Column(
        db.Integer,
        db.ForeignKey("donors.id"),
        nullable=False
    )

    response = db.Column(
        db.String(20),
        default="pending",
        nullable=False
    )

    responded_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    emergency_request = db.relationship(
        "EmergencyRequest",
        backref=db.backref(
            "donor_responses",
            lazy=True
        )
    )

    donor = db.relationship(
        "Donor",
        backref=db.backref(
            "emergency_responses",
            lazy=True
        )
    )

    def to_dict(self):
        return {
            "id": self.id,
            "emergency_request_id": self.emergency_request_id,
            "donor_id": self.donor_id,
            "response": self.response,
            "responded_at": (
                self.responded_at.isoformat()
                if self.responded_at
                else None
            )
        }
# ============================================================
# STEP 7A
# DONATION APPOINTMENT MODEL
# ============================================================

class Appointment(db.Model):

    __tablename__ = "appointments"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    donor_id = db.Column(
        db.Integer,
        db.ForeignKey("donors.id"),
        nullable=False
    )

    blood_bank_id = db.Column(
        db.Integer,
        db.ForeignKey("blood_banks.id"),
        nullable=False
    )

    appointment_date = db.Column(
        db.Date,
        nullable=False
    )

    appointment_time = db.Column(
        db.String(20),
        nullable=False
    )

    status = db.Column(
        db.String(20),
        default="scheduled",
        nullable=False
    )

    notes = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


    donor = db.relationship(
        "Donor",
        backref=db.backref(
            "appointments",
            lazy=True
        )
    )


    blood_bank = db.relationship(
        "BloodBank",
        backref=db.backref(
            "appointments",
            lazy=True
        )
    )


    def to_dict(self):

        return {
            "id": self.id,

            "donor_id":
                self.donor_id,

            "blood_bank_id":
                self.blood_bank_id,

            "appointment_date":
                self.appointment_date.isoformat(),

            "appointment_time":
                self.appointment_time,

            "status":
                self.status,

            "notes":
                self.notes,

            "created_at":
                self.created_at.isoformat()
                if self.created_at
                else None
        }

class DonorAlert(db.Model):
    __tablename__ = "donor_alerts"

    id = db.Column(db.Integer, primary_key=True)

    emergency_request_id = db.Column(
        db.Integer,
        db.ForeignKey("emergency_requests.id"),
        nullable=False
    )

    donor_id = db.Column(
        db.Integer,
        db.ForeignKey("donors.id"),
        nullable=False
    )

    status = db.Column(
        db.String(20),
        default="sent",
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def to_dict(self):
        return {
            "id": self.id,
            "emergency_request_id": self.emergency_request_id,
            "request_id": self.emergency_request_id,
            "donor_id": self.donor_id,
            "status": self.status,
            "created_at": self.created_at.isoformat()
            if self.created_at else None
        }

class DemandHistory(db.Model):
    __tablename__ = "demand_history"

    id = db.Column(db.Integer, primary_key=True)
    region = db.Column(db.String(100), nullable=False)
    blood_type = db.Column(db.String(5), nullable=False)
    date = db.Column(db.Date, nullable=False)
    units_requested = db.Column(db.Integer, nullable=False)
    units_donated = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "region": self.region,
            "blood_type": self.blood_type,
            "date": self.date.isoformat(),
            "units_requested": self.units_requested,
            "units_donated": self.units_donated
        }

class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)
    region = db.Column(db.String(100), nullable=False)
    blood_type = db.Column(db.String(5), nullable=False)
    risk_score = db.Column(db.String(20), nullable=False)
    forecast_window_start = db.Column(db.Date, nullable=True)
    forecast_window_end = db.Column(db.Date, nullable=True)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "region": self.region,
            "blood_type": self.blood_type,
            "risk_score": self.risk_score,
            "forecast_window_start": (
                self.forecast_window_start.isoformat()
                if self.forecast_window_start else None
            ),
            "forecast_window_end": (
                self.forecast_window_end.isoformat()
                if self.forecast_window_end else None
            ),
            "generated_at": (
                self.generated_at.isoformat()
                if self.generated_at else None
            )
        }

class User(db.Model):

    __tablename__ = "users"

    donor_profile = db.relationship(
        "Donor",
        backref="user",
        uselist=False)

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(255),
        nullable=False
    )

    role = db.Column(
        db.String(20),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


    def set_password(self, password):
        self.password = generate_password_hash(password)


    def check_password(self, password):
        return check_password_hash(
            self.password,
            password
        )


    def to_dict(self):

        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role
        }
