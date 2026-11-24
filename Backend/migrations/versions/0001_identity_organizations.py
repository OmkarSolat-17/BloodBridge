"""Create the local-only identity and organization foundation.

Revision ID: 0001_identity_organizations
Revises:
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0001_identity_organizations"
down_revision = None
branch_labels = None
depends_on = None
SCHEMA = "bloodbridge_private"


def upgrade():
    op.create_table(
        "identities",
        sa.Column("subject_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.CheckConstraint("status IN ('pending','active','suspended')", name="ck_identity_status"),
        schema=SCHEMA,
    )
    op.create_table(
        "organizations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.CheckConstraint("length(trim(name)) > 0", name="ck_organization_name"),
        sa.CheckConstraint("kind IN ('hospital','blood_bank')", name="ck_organization_kind"),
        sa.CheckConstraint("status IN ('pending','verified','suspended')", name="ck_organization_status"),
        schema=SCHEMA,
    )
    op.create_table(
        "memberships",
        sa.Column("subject_id", UUID(as_uuid=True),
                  sa.ForeignKey(f"{SCHEMA}.identities.subject_id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True),
                  sa.ForeignKey(f"{SCHEMA}.organizations.id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("role", sa.String(24), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.CheckConstraint("role IN ('hospital_operator','blood_bank_operator')", name="ck_membership_role"),
        sa.CheckConstraint("status IN ('pending','active','suspended')", name="ck_membership_status"),
        schema=SCHEMA,
    )
    op.create_index("ix_memberships_organization_id", "memberships", ["organization_id"], schema=SCHEMA)
    # A private schema alone is not a substitute for role grants or RLS.
    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA bloodbridge_private FROM PUBLIC")


def downgrade():
    raise RuntimeError("Downgrade is disabled: design and review a data-preserving recovery plan first.")
