"""Organization-scoped authorization for verified identities.

This does not implement onboarding, organization verification, or clinical rules.
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


def allowed_actions(connection, identity, organization_id):
    """Return the current organization's actions from one membership snapshot.

    Errors propagate; callers must fail closed. The caller must have verified
    identity with the configured identity provider, not client-provided claims.
    """
    if not isinstance(identity, VerifiedIdentity):
        return ()
    try:
        subject_id = UUID(identity.subject)
        org_id = UUID(str(organization_id))
    except (TypeError, ValueError, AttributeError):
        return ()
    row = connection.execute(
        _MEMBERSHIP, {"subject_id": subject_id, "organization_id": org_id}
    ).mappings().one_or_none()
    if row is None or not (
        row["identity_status"] == "active"
        and row["organization_status"] == "verified"
        and row["membership_status"] == "active"
    ):
        return ()
    actual = (row["organization_kind"], row["role"])
    return tuple(action for action, expected in _POLICY.items() if actual == expected)


def is_allowed(connection, identity, organization_id, action):
    """Return False unless the verified identity has the named scoped action."""
    if not isinstance(action, str) or action not in _POLICY:
        return False
    return action in allowed_actions(connection, identity, organization_id)
