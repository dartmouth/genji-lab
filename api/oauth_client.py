# oauth_client.py

"""
Authlib OAuth client for OIDC (Microsoft Entra ID) authentication.
Configuration comes exclusively from environment variables; the client
secret is never stored in the database or exposed via any endpoint.
"""

import os

from authlib.integrations.starlette_client import OAuth
from dotenv import load_dotenv

load_dotenv()


def _build_oauth() -> OAuth:
    oauth = OAuth()
    oauth.register(
        "entra",
        server_metadata_url=os.getenv("OIDC_DISCOVERY_URL", ""),
        client_id=os.getenv("OIDC_CLIENT_ID", ""),
        client_secret=os.getenv("OIDC_CLIENT_SECRET", ""),
        client_kwargs={
            "scope": os.getenv("OIDC_SCOPES", "openid profile email"),
        },
    )
    return oauth


oauth = _build_oauth()
