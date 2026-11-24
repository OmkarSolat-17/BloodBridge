"""Synthetic inventory, explicit handoff and full-request reservations.

Revision ID: 0004_synthetic_inventory
Revises: 0003_synthetic_requests
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0004_synthetic_inventory"
down_revision = "0003_synthetic_requests"
branch_labels = None
depends_on = None
S = "bloodbridge_private"
BLOOD = "blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')"


def upgrade():
    op.drop_constraint("ck_synthetic_request_status", "synthetic_requests", schema=S, type_="check")
    op.create_check_constraint("ck_synthetic_request_status", "synthetic_requests", "status IN ('open','reserved')", schema=S)
    op.create_table(
        "synthetic_inventory",
        sa.Column("bank_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.organizations.id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("blood_type", sa.String(3), primary_key=True),
        sa.Column("units_available", sa.Integer, nullable=False),
        sa.CheckConstraint(BLOOD, name="ck_inventory_blood"),
        sa.CheckConstraint("units_available >= 0", name="ck_inventory_nonnegative"), schema=S,
    )
    op.create_table(
        "synthetic_receipts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("bank_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.organizations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("actor", UUID(as_uuid=True), sa.ForeignKey(f"{S}.identities.subject_id", ondelete="RESTRICT"), nullable=False),
        sa.Column("idempotency_key", UUID(as_uuid=True), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("blood_type", sa.String(3), nullable=False),
        sa.Column("units", sa.Integer, nullable=False),
        sa.UniqueConstraint("bank_id", "actor", "idempotency_key", name="uq_synthetic_receipt_retry"),
        sa.CheckConstraint(BLOOD, name="ck_receipt_blood"),
        sa.CheckConstraint("units BETWEEN 1 AND 100", name="ck_receipt_units"), schema=S,
    )
    op.create_table(
        "synthetic_bank_grants",
        sa.Column("request_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.synthetic_requests.id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("bank_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.organizations.id", ondelete="RESTRICT"), primary_key=True),
        sa.Column("granted_by", UUID(as_uuid=True), sa.ForeignKey(f"{S}.identities.subject_id", ondelete="RESTRICT"), nullable=False), schema=S,
    )
    op.create_table(
        "synthetic_reservations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.synthetic_requests.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("bank_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.organizations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("actor", UUID(as_uuid=True), sa.ForeignKey(f"{S}.identities.subject_id", ondelete="RESTRICT"), nullable=False),
        sa.Column("blood_type", sa.String(3), nullable=False),
        sa.Column("units", sa.Integer, nullable=False),
        sa.CheckConstraint(BLOOD, name="ck_reservation_blood"),
        sa.CheckConstraint("units BETWEEN 1 AND 10", name="ck_reservation_units"), schema=S,
    )
    op.create_table(
        "synthetic_inventory_audit",
        sa.Column("id", sa.BigInteger, sa.Identity(), primary_key=True),
        sa.Column("organization_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.organizations.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("actor", UUID(as_uuid=True), sa.ForeignKey(f"{S}.identities.subject_id", ondelete="RESTRICT"), nullable=False),
        sa.Column("event_type", sa.String(20), nullable=False),
        sa.Column("request_id", UUID(as_uuid=True), sa.ForeignKey(f"{S}.synthetic_requests.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("event_type IN ('receipt','bank_grant','reservation')", name="ck_inventory_audit_event"), schema=S,
    )
    op.execute("""CREATE TRIGGER synthetic_inventory_audit_no_mutation
        BEFORE UPDATE OR DELETE ON bloodbridge_private.synthetic_inventory_audit
        FOR EACH ROW EXECUTE FUNCTION bloodbridge_private.reject_synthetic_audit_mutation()""")
    op.execute("REVOKE ALL ON bloodbridge_private.synthetic_inventory, bloodbridge_private.synthetic_receipts, bloodbridge_private.synthetic_bank_grants, bloodbridge_private.synthetic_reservations, bloodbridge_private.synthetic_inventory_audit FROM PUBLIC")


def downgrade():
    raise RuntimeError("Downgrade is disabled: design and review a data-preserving recovery plan first.")
