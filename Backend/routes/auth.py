from flask import Blueprint, request, jsonify
from database.database import db
from database.models import User
from flask_jwt_extended import (
    create_access_token
)


auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)



@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    required_fields = [
        "name",
        "email",
        "password",
        "role"]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "status":"error",
                "message":f"{field} is required"
            }),400


    if User.query.filter_by(
        email=data["email"]
        ).first():

        return jsonify({
            "status":"error",
            "message":"Email already exists"
        }),400


    user = User(
        name=data["name"],
        email=data["email"],
        role=data["role"]
    )


    user.set_password(
        data["password"]
    )


    db.session.add(user)
    db.session.commit()


    return jsonify({
        "status":"success",
        "user":user.to_dict()
    }),201




@auth_bp.route("/login", methods=["POST"])
def login():

    data=request.get_json()


    user=User.query.filter_by(
        email=data["email"]
    ).first()


    if not user or not user.check_password(
        data["password"]
    ):

        return jsonify({
            "status":"error",
            "message":"Invalid credentials"
        }),401



    token=create_access_token(
        identity=str(user.id)
    )


    return jsonify({

        "status":"success",

        "access_token":token,

        "user":user.to_dict()

    })
