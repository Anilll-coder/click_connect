"""Password hashing and policy helpers.

Uses Argon2id (OWASP-recommended default) for all new/rotated password
hashes. `verify_and_migrate` supports a one-time, transparent upgrade path
for accounts created before hashing was introduced: those rows still hold
a plaintext password, so on a successful legacy login we immediately
re-hash and persist it. No bulk migration script or forced password reset
is required, and no user is locked out.
"""
import re

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

_hasher = PasswordHasher()

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


def hash_password(plain_password: str) -> str:
    return _hasher.hash(plain_password)


def _looks_like_argon2_hash(value: str) -> bool:
    return isinstance(value, str) and value.startswith("$argon2")


def verify_and_migrate(stored_value: str, plain_password: str) -> tuple[bool, str | None]:
    """Check a login attempt against whatever is currently stored.

    Returns (is_valid, new_hash_to_persist_or_None).
    `new_hash_to_persist_or_None` is set when a legacy plaintext row just
    verified successfully and should be rewritten as a proper hash.
    """
    if _looks_like_argon2_hash(stored_value):
        try:
            _hasher.verify(stored_value, plain_password)
        except (VerifyMismatchError, InvalidHashError):
            return False, None
        if _hasher.check_needs_rehash(stored_value):
            return True, hash_password(plain_password)
        return True, None

    # Legacy plaintext row (pre-hashing accounts).
    if stored_value == plain_password:
        return True, hash_password(plain_password)
    return False, None


def validate_password_policy(password: str) -> str | None:
    """Returns an error message if the password fails policy, else None."""
    if not isinstance(password, str) or len(password) < PASSWORD_MIN_LENGTH:
        return f"Password must be at least {PASSWORD_MIN_LENGTH} characters long"
    if len(password) > PASSWORD_MAX_LENGTH:
        return f"Password must be at most {PASSWORD_MAX_LENGTH} characters long"
    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        return "Password must contain at least one letter and one number"
    return None
