from flask import Flask, jsonify
from flask_cors import CORS
import os
from sqlalchemy import text
from routes.blood_banks import (
    blood_bank_bp,
    get_nearby_blood_banks,
    register_blood_bank,
    update_stock
)
from routes.donors import donor_bp
from routes.appointments import appointment_bp
from routes.matching import matching_bp
from routes.emergency_requests import (
    broadcast_request_to_donors,
    create_emergency_request,
    emergency_request_bp,
    get_request_status,
    match_request_to_bank
)
from database.database import db
from routes.dashboard import dashboard_bp
from database.models import (
    BloodBank,
    DemandHistory,
    Donor,
    DonorAlert,
    DonorResponse,
    EmergencyRequest,
    Prediction,
    Stock,
    User
)
from flask_jwt_extended import JWTManager
from routes.auth import auth_bp
from routes.donor_alerts import donor_alert_bp
from routes.predictions import prediction_bp

app = Flask(__name__)
CORS(app)


# -----------------------------
# Database Configuration
# -----------------------------

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app.config["SQLALCHEMY_DATABASE_URI"] = (
    "sqlite:///" + os.path.join(BASE_DIR, "bloodbridge.db")
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["JWT_SECRET_KEY"]="bloodbridge-secret-key"

jwt = JWTManager(app)

# Connect SQLAlchemy to Flask
db.init_app(app)

# Register routes
app.register_blueprint(donor_bp)
app.register_blueprint(appointment_bp)
app.register_blueprint(blood_bank_bp)
app.register_blueprint(matching_bp)
app.register_blueprint(emergency_request_bp)
app.register_blueprint(dashboard_bp,url_prefix="/api/dashboard")
app.register_blueprint(auth_bp)
app.register_blueprint(donor_alert_bp)
app.register_blueprint(prediction_bp)


def add_column_if_missing(connection, table_name, column_name, column_sql):
    columns = connection.execute(
        text(f"PRAGMA table_info({table_name})")
    ).fetchall()
    existing_columns = {column[1] for column in columns}

    if column_name not in existing_columns:
        connection.execute(
            text(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}")
        )


def initialize_database():
    db.create_all()

    with db.engine.begin() as connection:
        add_column_if_missing(
            connection,
            "emergency_requests",
            "requester_name",
            "requester_name VARCHAR(100)"
        )
        add_column_if_missing(
            connection,
            "emergency_requests",
            "requester_phone",
            "requester_phone VARCHAR(20)"
        )
        add_column_if_missing(
            connection,
            "emergency_requests",
            "raw_text",
            "raw_text TEXT"
        )
        add_column_if_missing(
            connection,
            "emergency_requests",
            "matched_bank_id",
            "matched_bank_id INTEGER"
        )
        add_column_if_missing(
            connection,
            "emergency_requests",
            "matched_donor_id",
            "matched_donor_id INTEGER"
        )

# -----------------------------
# Health Check
# -----------------------------

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "success",
        "message": "BloodBridge backend is running!"
    })


# PRD-compatible aliases. Existing hyphenated URLs remain available.
app.add_url_rule(
    "/api/blood_banks/register",
    "prd_register_blood_bank",
    register_blood_bank,
    methods=["POST"]
)
app.add_url_rule(
    "/api/blood_banks/<int:blood_bank_id>/stock",
    "prd_update_stock",
    update_stock,
    methods=["POST"]
)
app.add_url_rule(
    "/api/blood_banks/nearby",
    "prd_nearby_blood_banks",
    get_nearby_blood_banks,
    methods=["GET"]
)
app.add_url_rule(
    "/api/requests/create",
    "prd_create_request",
    create_emergency_request,
    methods=["POST"]
)
app.add_url_rule(
    "/api/requests/<int:request_id>/status",
    "prd_request_status",
    get_request_status,
    methods=["GET"]
)
app.add_url_rule(
    "/api/requests/<int:request_id>/match",
    "prd_match_request",
    match_request_to_bank,
    methods=["POST"]
)
app.add_url_rule(
    "/api/requests/<int:request_id>/broadcast",
    "prd_broadcast_request",
    broadcast_request_to_donors,
    methods=["POST"]
)


with app.app_context():
    initialize_database()


# -----------------------------
# Start Server
# -----------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)
