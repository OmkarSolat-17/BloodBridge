"""Unwired, organization-scoped authorization primitive.

A caller MUST verify identity using the configured identity provider first.
Nothing here exposes a route or implements onboarding/verification.
"""
from uuid import UUID

from sqlalchemy import text

from security.supabase_identity import VerifiedIdentity

# Intentionally narrow. A successful decision never proves clinical eligibility
# or grants access to another organization. More actions need explicit review.
_POLICY = {
    "hospital.request.create": ("hospital", "hospital_operator"),
    "blood_bank.inventory.manage": ("blood_bank", "blood_bank_operator"),
}

_MEMBERSHIP = text("""
    SELECT i.status AS identity_status, o.status AS organization_status,
           o.kind AS organization_kind, m.status AS membership_status, m.role AS role
      FROM bloodbridge_private.identities AS i
      JOIN bloodbridge_private.memberships AS m ON m.subject_id = i.subject_id
      JOIN bloodbridge_private.organizations AS o ON o.id = m.organization_id
     WHERE i.subject_id = :subject_id AND o.id = :organization_id
""")


def is_allowed(connection, identity, organization_id, action):
    """Return False unless a verified identity has an active scoped membership.

    Database errors propagate: callers must map them to an unavailable response,
    never allow access on error. No endpoint may trust a role supplied by a user.
    """
    expected = _POLICY.get(action) if isinstance(action, str) else None
    if expected is None or not isinstance(identity, VerifiedIdentity):
        return False
    try:
        subject_id = UUID(identity.subject)
        org_id = UUID(str(organization_id))
    except (TypeError, ValueError, AttributeError):
        return False
    row = connection.execute(
        _MEMBERSHIP, {"subject_id": subject_id, "organization_id": org_id}
    ).mappings().one_or_none()
    if row is None:
        return False
    return (
        row["identity_status"] == "active"
        and row["organization_status"] == "verified"
        and row["membership_status"] == "active"
        and (row["organization_kind"], row["role"]) == expected
    )
