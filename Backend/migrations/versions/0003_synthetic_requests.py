"""Add synthetic-only emergency requests and their local audit records.

Revision ID: 0003_synthetic_requests
Revises: 0002_synthetic_onboarding_audit
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0003_synthetic_requests"
down_revision = "0002_synthetic_onboarding_audit"
branch_labels = None
depends_on = None
S = "bloodbridge_private"


def upgrade():
    op.create_table(
        "synthetic_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.organizations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("requested_by", UUID(as_uuid=True), sa.ForeignKey(f"{S}.identities.subject_id", ondelete="RESTRICT"), nullable=False),
        sa.Column("idempotency_key", UUID(as_uuid=True), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("blood_type", sa.String(3), nullable=False),
        sa.Column("units_required", sa.Integer, nullable=False),
        sa.Column("urgency", sa.String(12), nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("organization_id", "requested_by", "idempotency_key", name="uq_synthetic_request_retry"),
        sa.CheckConstraint("blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')", name="ck_synthetic_request_blood_type"),
        sa.CheckConstraint("units_required BETWEEN 1 AND 10", name="ck_synthetic_request_units"),
        sa.CheckConstraint("urgency IN ('routine','urgent','critical')", name="ck_synthetic_request_urgency"),
        sa.CheckConstraint("status = 'open'", name="ck_synthetic_request_status"),
        schema=S,
    )
    op.create_index("ix_synthetic_requests_org", "synthetic_requests", ["organization_id"], schema=S)
    op.create_table(
        "synthetic_request_audit",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("request_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.synthetic_requests.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("event_type", sa.String(20), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("event_type = 'created'", name="ck_synthetic_request_audit_event"),
        schema=S,
    )
    op.execute("""
        CREATE TRIGGER synthetic_request_audit_no_mutation
        BEFORE UPDATE OR DELETE ON bloodbridge_private.synthetic_request_audit
        FOR EACH ROW EXECUTE FUNCTION bloodbridge_private.reject_synthetic_audit_mutation()
    """)
    op.execute("REVOKE ALL ON bloodbridge_private.synthetic_requests, bloodbridge_private.synthetic_request_audit FROM PUBLIC")


def downgrade():
    raise RuntimeError("Downgrade is disabled: design and review a data-preserving recovery plan first.")
