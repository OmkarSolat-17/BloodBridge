"""Resolve a Supabase access token through the Auth server.

The legacy API remains locked. A verified identity is not a permission grant;
application authorization is separate.
"""
from dataclasses import dataclass
from urllib.parse import urlsplit
from uuid import UUID

import requests


class InvalidCredentials(Exception):
    """The caller has not presented a valid access token."""


class IdentityServiceUnavailable(Exception):
    """Identity cannot be verified; requests must fail closed."""


@dataclass(frozen=True)
class VerifiedIdentity:
    subject: str


class SupabaseIdentityProvider:
    def __init__(self, project_url, publishable_key, *, session=None):
        parts = urlsplit(project_url)
        if (
            parts.scheme != "https" or not parts.hostname or parts.username
            or parts.password or parts.path not in ("", "/")
            or parts.query or parts.fragment
        ):
            raise ValueError("Supabase project URL must be an HTTPS origin")
        if not isinstance(publishable_key, str) or not publishable_key.strip():
            raise ValueError("Supabase publishable key is required")
        # A publishable/anon key is not a service-role credential. Never place
        # a secret key in frontend code or rely on client-provided role claims.
        if publishable_key.startswith("sb_secret_"):
            raise ValueError("Use a publishable key, not a Supabase secret key")
        self._url = project_url.rstrip("/") + "/auth/v1/user"
        self._key = publishable_key
        # Default to requests' per-call client instead of sharing a mutable
        # Session across Flask threads. Tests may inject a local mock.
        self._session = session or requests

    def verify(self, token):
        if (
            not isinstance(token, str) or not token or len(token) > 8192
            or any(c.isspace() for c in token)
        ):
            raise InvalidCredentials("Invalid access token")
        try:
            response = self._session.get(
                self._url,
                headers={"apikey": self._key, "Authorization": f"Bearer {token}"},
                timeout=(3, 5),
                allow_redirects=False,
            )
        except requests.RequestException as exc:
            raise IdentityServiceUnavailable("Identity service unavailable") from exc
        if response.status_code in (401, 403):
            raise InvalidCredentials("Invalid access token")
        if response.status_code != 200:
            raise IdentityServiceUnavailable("Identity service unavailable")
        try:
            body = response.json()
            subject = str(UUID(body["id"]))
        except (ValueError, TypeError, KeyError, AttributeError) as exc:
            raise IdentityServiceUnavailable("Invalid identity service response") from exc
        return VerifiedIdentity(subject=subject)
