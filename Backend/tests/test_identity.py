"""Provider contract tests; these mock Supabase and are not live integration tests."""
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from security.supabase_identity import (  # noqa: E402
    IdentityServiceUnavailable, InvalidCredentials, SupabaseIdentityProvider,
)


class IdentityTests(unittest.TestCase):
    def setUp(self):
        self.session = Mock()
        self.provider = SupabaseIdentityProvider(
            "https://project.example", "sb_publishable_synthetic",
            session=self.session,
        )

    def test_success_is_identity_only_and_no_redirect(self):
        response = self.session.get.return_value
        response.status_code = 200
        response.json.return_value = {
            "id": "58c735a1-b4bd-4be5-9dd0-a343504ea883", "role": "admin"
        }
        identity = self.provider.verify("synthetic-token")
        self.assertEqual(identity.subject, "58c735a1-b4bd-4be5-9dd0-a343504ea883")
        self.assertFalse(hasattr(identity, "role"))
        args, kwargs = self.session.get.call_args
        self.assertEqual(args[0], "https://project.example/auth/v1/user")
        self.assertFalse(kwargs["allow_redirects"])
        self.assertEqual(kwargs["timeout"], (3, 5))
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer synthetic-token")

    def test_bad_tokens_are_rejected_without_network_call(self):
        for token in (None, "", "token\nother", "x" * 8193):
            with self.subTest(token_type=type(token).__name__):
                with self.assertRaises(InvalidCredentials):
                    self.provider.verify(token)
        self.session.get.assert_not_called()

    def test_remote_rejection_and_unavailability_fail_closed(self):
        for status in (401, 403):
            self.session.get.return_value.status_code = status
            with self.assertRaises(InvalidCredentials):
                self.provider.verify("token")
        for status in (302, 429, 500):
            self.session.get.return_value.status_code = status
            with self.assertRaises(IdentityServiceUnavailable):
                self.provider.verify("token")
        self.session.get.side_effect = requests.Timeout("timeout")
        with self.assertRaises(IdentityServiceUnavailable):
            self.provider.verify("token")

    def test_invalid_server_response_fails_closed(self):
        response = self.session.get.return_value
        response.status_code = 200
        for value in ({}, {"id": "not-a-uuid"}, None):
            response.json.return_value = value
            with self.assertRaises(IdentityServiceUnavailable):
                self.provider.verify("token")
        response.json.side_effect = ValueError("not JSON")
        with self.assertRaises(IdentityServiceUnavailable):
            self.provider.verify("token")

    def test_invalid_configuration_rejected(self):
        for url in ("http://project.example", "https://user:pw@project.example", "https://project.example/path", "https://project.example?x=y"):
            with self.subTest(url=url):
                with self.assertRaises(ValueError):
                    SupabaseIdentityProvider(url, "publishable")
        for key in ("", "sb_secret_example"):
            with self.assertRaises(ValueError):
                SupabaseIdentityProvider("https://project.example", key)


if __name__ == "__main__":
    unittest.main()
