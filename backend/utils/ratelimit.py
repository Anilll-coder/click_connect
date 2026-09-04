"""Rate limiting setup.

Client IP resolution: the app runs on Render behind a single reverse
proxy/load balancer, which is the only party allowed to set
`X-Forwarded-For` for a request that reaches us. A well-behaved proxy
appends the real client IP as the LAST entry of that header, so we trust
the last entry rather than the first — the first entry is whatever the
original client sent and is trivially spoofable. If another proxy (e.g. a
CDN) is ever placed in front of Render, this needs to read one entry
further back (parts[-2]) instead.

Storage backend: in-memory (per-process). That's correct for a single
Render instance today. If this app is ever scaled to multiple instances,
switch the storage_uri below to a shared Redis instance
(e.g. `redis://<host>:6379`) via the RATE_LIMIT_STORAGE_URL env var —
in-memory limits are per-process and would under-count abuse spread
across instances otherwise.
"""
import os

from fastapi import Request
from slowapi import Limiter


def get_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if parts:
            return parts[-1]
    return request.client.host if request.client else "unknown"


STORAGE_URI = os.getenv("RATE_LIMIT_STORAGE_URL", "memory://")

limiter = Limiter(key_func=get_client_ip, storage_uri=STORAGE_URI)


def user_or_ip_key(request: Request) -> str:
    """Key by authenticated user id when available, else by IP.

    Prevents an attacker from simply rotating IPs to dodge per-IP limits
    on authenticated endpoints, while still limiting anonymous traffic.
    """
    user = getattr(request.state, "current_user_id", None)
    if user is not None:
        return f"user:{user}"
    return f"ip:{get_client_ip(request)}"
