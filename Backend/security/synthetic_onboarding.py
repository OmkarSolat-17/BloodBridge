"""Synthetic local-only onboarding transactions. Not an API or production workflow.

The caller owns the transaction and must enforce the local-only execution guard.
The record's actor is explicitly a synthetic local operator, not an identity-
verified administrator. Never use these functions for real people or facilities.
"""
from sqlalchemy import text

SCHEMA = "bloodbridge_private"
_ROLE_KIND = {"hospital_operator": "hospital", "blood_bank_operator": "blood_bank"}


class OnboardingError(Exception):
    """Invalid input or an unsafe state transition."""


def _audit(connection, event, org_id, subject_id=None):
    connection.execute(text(f"""
        INSERT INTO {SCHEMA}.synthetic_onboarding_audit
        (actor_kind, event_type, organization_id, subject_id)
        VALUES ('synthetic_local_operator', :event, :org, :subject)
    """), {"event": event, "org": org_id, "subject": subject_id})


def create_organization(connection, org_id, name, kind):
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 200:
        raise OnboardingError("A name of 1–200 characters is required.")
    if kind not in ("hospital", "blood_bank"):
        raise OnboardingError("Organization kind must be hospital or blood_bank.")
    name = name.strip()
    inserted = connection.execute(text(f"""
        INSERT INTO {SCHEMA}.organizations (id, name, kind)
        VALUES (:org, :name, :kind) ON CONFLICT (id) DO NOTHING RETURNING id
    """), {"org": org_id, "name": name, "kind": kind}).scalar_one_or_none()
    row = connection.execute(text(f"SELECT name, kind FROM {SCHEMA}.organizations WHERE id=:org FOR UPDATE"), {"org": org_id}).mappings().one()
    if (row["name"], row["kind"]) != (name, kind):
        raise OnboardingError("Organization ID already belongs to different data.")
    if inserted:
        _audit(connection, "organization_created", org_id)
    return bool(inserted)


def _organization(connection, org_id):
    row = connection.execute(text(f"SELECT kind, status FROM {SCHEMA}.organizations WHERE id=:org FOR UPDATE"), {"org": org_id}).mappings().one_or_none()
    if row is None:
        raise OnboardingError("Organization not found.")
    return row


def verify_organization(connection, org_id):
    org = _organization(connection, org_id)
    if org["status"] == "verified":
        return False
    if org["status"] != "pending":
        raise OnboardingError("Only a pending organization may be verified.")
    connection.execute(text(f"UPDATE {SCHEMA}.organizations SET status='verified' WHERE id=:org"), {"org": org_id})
    _audit(connection, "organization_verified", org_id)
    return True


def approve_membership(connection, org_id, subject_id, role):
    org = _organization(connection, org_id)
    if org["status"] != "verified":
        raise OnboardingError("Organization must be verified first.")
    if _ROLE_KIND.get(role) != org["kind"]:
        raise OnboardingError("Membership role does not match organization kind.")
    connection.execute(text(f"""
        INSERT INTO {SCHEMA}.identities(subject_id) VALUES (:subject)
        ON CONFLICT (subject_id) DO NOTHING
    """), {"subject": subject_id})
    identity_status = connection.execute(text(f"SELECT status FROM {SCHEMA}.identities WHERE subject_id=:subject FOR UPDATE"), {"subject": subject_id}).scalar_one()
    if identity_status == "suspended":
        raise OnboardingError("Suspended identities cannot be reactivated by this command.")
    if identity_status == "pending":
        connection.execute(text(f"UPDATE {SCHEMA}.identities SET status='active' WHERE subject_id=:subject"), {"subject": subject_id})
        _audit(connection, "identity_activated", org_id, subject_id)
    connection.execute(text(f"""
        INSERT INTO {SCHEMA}.memberships(subject_id, organization_id, role)
        VALUES (:subject, :org, :role) ON CONFLICT (subject_id, organization_id) DO NOTHING
    """), {"subject": subject_id, "org": org_id, "role": role})
    membership = connection.execute(text(f"""
        SELECT role, status FROM {SCHEMA}.memberships
        WHERE subject_id=:subject AND organization_id=:org FOR UPDATE
    """), {"subject": subject_id, "org": org_id}).mappings().one()
    if membership["role"] != role:
        raise OnboardingError("Existing membership has a different role.")
    if membership["status"] == "active":
        return False
    if membership["status"] != "pending":
        raise OnboardingError("Suspended memberships cannot be reactivated by this command.")
    connection.execute(text(f"""
        UPDATE {SCHEMA}.memberships SET status='active'
        WHERE subject_id=:subject AND organization_id=:org
    """), {"subject": subject_id, "org": org_id})
    _audit(connection, "membership_approved", org_id, subject_id)
    return True


def suspend_membership(connection, org_id, subject_id):
    _organization(connection, org_id)
    status = connection.execute(text(f"""
        SELECT status FROM {SCHEMA}.memberships
        WHERE subject_id=:subject AND organization_id=:org FOR UPDATE
    """), {"subject": subject_id, "org": org_id}).scalar_one_or_none()
    if status is None:
        raise OnboardingError("Membership not found.")
    if status == "suspended":
        return False
    connection.execute(text(f"""
        UPDATE {SCHEMA}.memberships SET status='suspended'
        WHERE subject_id=:subject AND organization_id=:org
    """), {"subject": subject_id, "org": org_id})
    _audit(connection, "membership_suspended", org_id, subject_id)
    return True
