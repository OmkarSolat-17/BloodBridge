from datetime import date, timedelta

from flask import Blueprint, request, jsonify

from database.database import db
from database.models import DemandHistory, Prediction


prediction_bp = Blueprint(
    "predictions",
    __name__,
    url_prefix="/api/predictions"
)


def score_shortage_risk(units_requested, units_donated):
    if units_requested <= 0:
        return "low"

    shortage_ratio = max(units_requested - units_donated, 0) / units_requested

    if shortage_ratio >= 0.45:
        return "high"

    if shortage_ratio >= 0.20:
        return "medium"

    return "low"


@prediction_bp.route("/dashboard", methods=["GET"])
def prediction_dashboard():
    region = request.args.get("region")
    blood_type = request.args.get("blood_type")

    query = Prediction.query

    if region:
        query = query.filter_by(region=region)

    if blood_type:
        query = query.filter_by(blood_type=blood_type)

    predictions = query.order_by(
        Prediction.region,
        Prediction.blood_type,
        Prediction.generated_at.desc()
    ).all()

    return jsonify({
        "status": "success",
        "count": len(predictions),
        "predictions": [
            prediction.to_dict()
            for prediction in predictions
        ]
    }), 200


@prediction_bp.route("/run", methods=["POST"])
def run_predictions():
    data = request.get_json() or {}
    days = int(data.get("days", 90))
    today = date.today()
    start_date = today - timedelta(days=days)

    rows = DemandHistory.query.filter(
        DemandHistory.date >= start_date
    ).all()

    grouped = {}
    for row in rows:
        key = (row.region, row.blood_type)
        grouped.setdefault(key, {
            "units_requested": 0,
            "units_donated": 0
        })
        grouped[key]["units_requested"] += row.units_requested
        grouped[key]["units_donated"] += row.units_donated

    created = []
    forecast_start = today + timedelta(days=1)
    forecast_end = today + timedelta(days=28)

    for (region, blood_type), totals in grouped.items():
        prediction = Prediction(
            region=region,
            blood_type=blood_type,
            risk_score=score_shortage_risk(
                totals["units_requested"],
                totals["units_donated"]
            ),
            forecast_window_start=forecast_start,
            forecast_window_end=forecast_end
        )
        db.session.add(prediction)
        created.append(prediction)

    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Prediction run completed",
        "count": len(created),
        "predictions": [
            prediction.to_dict()
            for prediction in created
        ]
    }), 201


@prediction_bp.route("/history", methods=["POST"])
def add_demand_history():
    data = request.get_json() or {}
    required_fields = [
        "region",
        "blood_type",
        "date",
        "units_requested",
        "units_donated"
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "status": "error",
                "message": f"{field} is required"
            }), 400

    try:
        history_date = date.fromisoformat(data["date"])
    except ValueError:
        return jsonify({
            "status": "error",
            "message": "date must be YYYY-MM-DD"
        }), 400

    history = DemandHistory(
        region=data["region"],
        blood_type=data["blood_type"],
        date=history_date,
        units_requested=int(data["units_requested"]),
        units_donated=int(data["units_donated"])
    )

    db.session.add(history)
    db.session.commit()

    return jsonify({
        "status": "success",
        "history": history.to_dict()
    }), 201
