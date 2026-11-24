"""Unit tests of the unwired, default-deny authorization policy."""
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock
from uuid import UUID, uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from security.authorization import is_allowed  # noqa: E402
from security.supabase_identity import VerifiedIdentity  # noqa: E402


class AuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.connection = Mock()
        self.identity = VerifiedIdentity(str(uuid4()))
        self.org = uuid4()
        self.row = {
            "identity_status": "active", "organization_status": "verified",
            "membership_status": "active", "organization_kind": "hospital",
            "role": "hospital_operator",
        }
        self.connection.execute.return_value.mappings.return_value.one_or_none.return_value = self.row

    def test_approved_hospital_membership(self):
        self.assertTrue(is_allowed(self.connection, self.identity, self.org, "hospital.request.create"))
        query_parameters = self.connection.execute.call_args.args[1]
        self.assertEqual(query_parameters["subject_id"], UUID(self.identity.subject))
        self.assertEqual(query_parameters["organization_id"], self.org)

    def test_approved_blood_bank_membership(self):
        self.row.update(organization_kind="blood_bank", role="blood_bank_operator")
        self.assertTrue(is_allowed(self.connection, self.identity, self.org, "blood_bank.inventory.manage"))
        self.assertFalse(is_allowed(self.connection, self.identity, self.org, "hospital.request.create"))

    def test_pending_suspended_or_mismatched_membership_denied(self):
        for key, value in (
            ("identity_status", "pending"), ("identity_status", "suspended"),
            ("organization_status", "pending"), ("organization_status", "suspended"),
            ("membership_status", "pending"), ("membership_status", "suspended"),
            ("organization_kind", "blood_bank"), ("role", "blood_bank_operator"),
        ):
            with self.subTest(key=key, value=value):
                copy = dict(self.row)
                copy[key] = value
                self.connection.execute.return_value.mappings.return_value.one_or_none.return_value = copy
                self.assertFalse(is_allowed(self.connection, self.identity, self.org, "hospital.request.create"))

    def test_no_membership_is_denied(self):
        self.connection.execute.return_value.mappings.return_value.one_or_none.return_value = None
        self.assertFalse(is_allowed(self.connection, self.identity, self.org, "hospital.request.create"))

    def test_bad_identity_org_and_unknown_action_denied_before_query(self):
        for identity, org, action in (
            (None, self.org, "hospital.request.create"),
            (self.identity, "not-a-uuid", "hospital.request.create"),
            (VerifiedIdentity("bad"), self.org, "hospital.request.create"),
            (self.identity, self.org, "admin.everything"),
            (self.identity, self.org, None),
        ):
            with self.subTest(action=action):
                self.assertFalse(is_allowed(self.connection, identity, org, action))
        self.connection.execute.assert_not_called()

    def test_database_error_propagates_not_allowed(self):
        self.connection.execute.side_effect = RuntimeError("synthetic db unavailable")
        with self.assertRaises(RuntimeError):
            is_allowed(self.connection, self.identity, self.org, "hospital.request.create")


if __name__ == "__main__":
    unittest.main()
