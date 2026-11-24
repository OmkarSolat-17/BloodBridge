"""BloodBridge backend foundation.

Legacy endpoints are deliberately unavailable until authorization and emergency
workflow safety are implemented. This is not ready for a real-world pilot.
"""

import os

import click
from flask import Flask, jsonify, request
from flask_jwt_extended import JWTManager
from sqlalchemy import inspect

from database.database import db
# Import models so SQLAlchemy knows the schema before the explicit init command.
from database import models  # noqa: F401
from routes.access import access_bp
from routes.appointments import appointment_bp
from routes.auth import auth_bp
from routes.blood_banks import (
    blood_bank_bp, get_nearby_blood_banks, register_blood_bank, update_stock,
)
from routes.dashboard import dashboard_bp
from routes.donor_alerts import donor_alert_bp
from routes.donors import donor_bp
from routes.emergency_requests import (
    broadcast_request_to_donors, create_emergency_request, emergency_request_bp,
    get_request_status, match_request_to_bank,
)
from routes.matching import matching_bp
from routes.predictions import prediction_bp
from routes.synthetic_requests import synthetic_requests_bp
from routes.synthetic_inventory import synthetic_inventory_bp
from security.supabase_identity import SupabaseIdentityProvider


def create_app(config=None):
    """Create an isolated application. No database is initialized on import."""
    app = Flask(__name__, instance_relative_config=True)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=os.environ.get(
            "BLOODBRIDGE_DATABASE_URL",
            "sqlite:///" + os.path.join(app.instance_path, "bloodbridge.db"),
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_SECRET_KEY=os.environ.get("BLOODBRIDGE_JWT_SECRET"),
        SUPABASE_PROJECT_URL=os.environ.get("SUPABASE_PROJECT_URL"),
        SUPABASE_PUBLISHABLE_KEY=os.environ.get("SUPABASE_PUBLISHABLE_KEY"),
        BLOODBRIDGE_ENABLE_SYNTHETIC_REQUESTS=os.environ.get("BLOODBRIDGE_ENABLE_SYNTHETIC_REQUESTS", "0"),
        MAX_CONTENT_LENGTH=4096,
    )
    if config:
        app.config.update(config)

    # Supabase supplies postgresql:// URLs; use the installed psycopg 3 driver.
    # SQLite is retained only for isolated local tests during the rebuild.
    url = app.config.get("SQLALCHEMY_DATABASE_URI")
    if isinstance(url, str) and url.startswith(("postgres://", "postgresql://")):
        app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql+psycopg://" + url.split("://", 1)[1]

    secret = app.config.get("JWT_SECRET_KEY")
    if not isinstance(secret, str) or len(secret) < 32:
        raise RuntimeError(
            "Set BLOODBRIDGE_JWT_SECRET to a unique random secret of at least "
            "32 characters. Do not use a shared example or commit the secret."
        )

    provider_url = app.config.get("SUPABASE_PROJECT_URL")
    provider_key = app.config.get("SUPABASE_PUBLISHABLE_KEY")
    if bool(provider_url) != bool(provider_key):
        raise RuntimeError("Configure both SUPABASE_PROJECT_URL and SUPABASE_PUBLISHABLE_KEY, or neither.")
    if provider_url and provider_key:
        app.extensions["bloodbridge_identity_provider"] = SupabaseIdentityProvider(provider_url, provider_key)

    db.init_app(app)
    JWTManager(app)
    app.register_blueprint(access_bp)
    app.register_blueprint(synthetic_requests_bp)
    app.register_blueprint(synthetic_inventory_bp)
    for blueprint in (
        donor_bp, appointment_bp, blood_bank_bp, matching_bp,
        emergency_request_bp, auth_bp, donor_alert_bp, prediction_bp,
    ):
        app.register_blueprint(blueprint)
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    # Keep existing aliases registered but guarded exactly like the blueprints.
    aliases = (
        ("/api/blood_banks/register", "prd_register_blood_bank", register_blood_bank, ["POST"]),
        ("/api/blood_banks/<int:blood_bank_id>/stock", "prd_update_stock", update_stock, ["POST"]),
        ("/api/blood_banks/nearby", "prd_nearby_blood_banks", get_nearby_blood_banks, ["GET"]),
        ("/api/requests/create", "prd_create_request", create_emergency_request, ["POST"]),
        ("/api/requests/<int:request_id>/status", "prd_request_status", get_request_status, ["GET"]),
        ("/api/requests/<int:request_id>/match", "prd_match_request", match_request_to_bank, ["POST"]),
        ("/api/requests/<int:request_id>/broadcast", "prd_broadcast_request", broadcast_request_to_donors, ["POST"]),
    )
    for rule, endpoint, view, methods in aliases:
        app.add_url_rule(rule, endpoint, view, methods=methods)

    @app.before_request
    def block_unreviewed_routes():
        # Fail closed, including aliases: authentication alone is not sufficient
        # because most legacy routes lack role/ownership checks. Do not remove
        # this guard until each endpoint is replaced and security-tested.
        allowed = request.endpoint in (None, "health_check") or (
            request.endpoint == "access.organization_access" and request.method in ("GET", "HEAD")
        ) or (
            request.endpoint == "synthetic_requests.create" and request.method == "POST"
        ) or (
            request.endpoint == "synthetic_requests.read" and request.method in ("GET", "HEAD")
        ) or (
            request.endpoint in {"synthetic_inventory.add_receipt", "synthetic_inventory.grant_bank", "synthetic_inventory.reserve_request"}
            and request.method == "POST"
        ) or (
            request.endpoint == "synthetic_inventory.read_stock" and request.method in ("GET", "HEAD")
        )
        if not allowed:
            return jsonify(
                status="unavailable",
                message="This endpoint is temporarily disabled during the security rebuild.",
            ), 503
        return None

    @app.after_request
    def prohibit_access_caching(response):
        if request.path.startswith("/api/v1/organizations/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/api/health")
    def health_check():
        # Liveness only. A 200 does not mean the service is ready for use.
        return jsonify(status="alive", mode="security-rebuild", ready=False)

    @app.cli.command("init-empty-db")
    def init_empty_db():
        """Create tables in an EMPTY database for local synthetic development."""
        if db.engine.dialect.name != "sqlite":
            raise click.ClickException(
                "This legacy schema command is restricted to disposable SQLite databases; "
                "PostgreSQL migrations are not ready."
            )
        os.makedirs(app.instance_path, exist_ok=True)
        if inspect(db.engine).get_table_names():
            raise click.ClickException("Database is not empty; refusing to modify it.")
        db.create_all()
        click.echo("Created empty schema. Do not use real patient or donor data.")

    return app


if __name__ == "__main__":
    # Development only; the security guard remains active and debug is off.
    create_app().run(host="127.0.0.1", port=5000, debug=False)
