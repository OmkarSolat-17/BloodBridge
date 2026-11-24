"""Add a local synthetic onboarding audit table.

Revision ID: 0002_synthetic_onboarding_audit
Revises: 0001_identity_organizations
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0002_synthetic_onboarding_audit"
down_revision = "0001_identity_organizations"
branch_labels = None
depends_on = None
SCHEMA = "bloodbridge_private"


def upgrade():
    op.create_table(
        "synthetic_onboarding_audit",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("actor_kind", sa.String(40), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False),
        sa.Column("organization_id", UUID(as_uuid=True),
                  sa.ForeignKey(f"{SCHEMA}.organizations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("subject_id", UUID(as_uuid=True), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("actor_kind = 'synthetic_local_operator'", name="ck_synthetic_audit_actor"),
        sa.CheckConstraint("event_type IN ('organization_created','organization_verified','identity_activated','membership_approved','membership_suspended')", name="ck_synthetic_audit_event"),
        schema=SCHEMA,
    )
    # Defense in depth, not immutable against a database owner/superuser.
    op.execute("""
        CREATE FUNCTION bloodbridge_private.reject_synthetic_audit_mutation()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'synthetic onboarding audit is append-only'; END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER synthetic_audit_no_mutation
        BEFORE UPDATE OR DELETE ON bloodbridge_private.synthetic_onboarding_audit
        FOR EACH ROW EXECUTE FUNCTION bloodbridge_private.reject_synthetic_audit_mutation()
    """)
    op.execute("REVOKE ALL ON bloodbridge_private.synthetic_onboarding_audit FROM PUBLIC")
    op.execute("REVOKE ALL ON FUNCTION bloodbridge_private.reject_synthetic_audit_mutation() FROM PUBLIC")


def downgrade():
    raise RuntimeError("Downgrade is disabled: design and review a data-preserving recovery plan first.")
