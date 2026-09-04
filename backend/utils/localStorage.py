# utils/local_storage.py
import io
import logging
import uuid
from pathlib import Path
from PIL import Image, ImageOps
import urllib.parse

logger = logging.getLogger("clickconnect.uploads")

UPLOAD_DIR = Path("static/uploads")

AVATAR_DIR = UPLOAD_DIR / "avatars"
POST_IMAGE_DIR = UPLOAD_DIR / "post_images"
POST_VIDEO_DIR = UPLOAD_DIR / "post_videos"

MAX_IMAGE_SIZE = 10 * 1024 * 1024     # 10 MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024     # 50 MB

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
VIDEO_TYPES = {"video/mp4", "video/mkv", "video/webm"}

MAX_IMAGE_WIDTH = 1600
MAX_IMAGE_PIXELS = 40_000_000  # ~40MP; guards against decompression-bomb style uploads
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

PIL_FORMAT_TO_EXT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
VIDEO_TYPE_TO_EXT = {"video/mp4": ".mp4", "video/mkv": ".mkv", "video/webm": ".webm"}

for d in (UPLOAD_DIR, AVATAR_DIR, POST_IMAGE_DIR, POST_VIDEO_DIR):
    d.mkdir(parents=True, exist_ok=True)


def secure_filename(filename: str) -> str:
    """Kept for backward compatibility; prefer the content-verified helpers
    below (`_load_and_verify_image` / `_sniff_video_extension`), which
    derive the extension from the actual decoded content rather than a
    client-supplied filename."""
    ext = Path(filename or "").suffix
    return f"{uuid.uuid4().hex}{ext}"


def validate_file(content_type: str, file_size: int):
    if content_type in IMAGE_TYPES:
        if file_size > MAX_IMAGE_SIZE:
            raise ValueError("Image exceeds 10MB limit")
        return "image"

    if content_type in VIDEO_TYPES:
        if file_size > MAX_VIDEO_SIZE:
            raise ValueError("Video exceeds 50MB limit")
        return "video"

    raise ValueError("Unsupported file type")


def _load_and_verify_image(data: bytes) -> Image.Image:
    """Decode and verify image bytes fully in memory before anything is
    ever written to disk. Raises ValueError for anything that isn't a
    genuine, decodable image of an allowed format — including a file
    whose real bytes don't match its claimed Content-Type (e.g. an SVG or
    HTML payload uploaded as "image/png").
    """
    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()
    except Exception:
        raise ValueError("File is not a valid image")

    # verify() leaves the parser unusable for further operations, so
    # re-open a fresh handle for actual processing.
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:
        raise ValueError("File is not a valid image")

    if img.format not in PIL_FORMAT_TO_EXT:
        raise ValueError("Unsupported image format")

    if img.width <= 0 or img.height <= 0 or img.width * img.height > MAX_IMAGE_PIXELS:
        raise ValueError("Image dimensions are too large")

    return img


def _sniff_video_extension(data: bytes, content_type: str) -> str:
    """Lightweight magic-byte check so an arbitrary file can't ride in
    behind a spoofed video Content-Type. Not a full codec/container
    validation (that would need ffprobe or a dedicated library) — it just
    confirms the bytes actually look like a binary video container.
    """
    is_mp4 = len(data) >= 12 and data[4:8] == b"ftyp"
    is_ebml = len(data) >= 4 and data[:4] == b"\x1a\x45\xdf\xa3"  # WebM/Matroska

    if content_type == "video/mp4" and not is_mp4:
        raise ValueError("File does not look like a valid MP4 video")
    if content_type in ("video/webm", "video/mkv") and not is_ebml:
        raise ValueError("File does not look like a valid video")
    if not (is_mp4 or is_ebml):
        raise ValueError("File does not look like a valid video")

    return VIDEO_TYPE_TO_EXT.get(content_type, ".mp4")


def _save_verified_image(img: Image.Image, dest_dir: Path, resize_to: int | None = None, max_width: int | None = None) -> Path:
    filename = f"{uuid.uuid4().hex}{PIL_FORMAT_TO_EXT[img.format]}"
    dest = dest_dir / filename

    fmt = img.format
    img = ImageOps.exif_transpose(img)

    if resize_to:
        img = img.resize((resize_to, resize_to))
    elif max_width and img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)

    save_kwargs = {"optimize": True}
    if fmt == "JPEG":
        save_kwargs["quality"] = 85
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
    img.save(dest, format=fmt, **save_kwargs)
    return dest


def save_image(data: bytes, content_type: str = "image/jpeg") -> str:
    img = _load_and_verify_image(data)
    dest = _save_verified_image(img, POST_IMAGE_DIR, max_width=MAX_IMAGE_WIDTH)
    return f"/static/uploads/post_images/{dest.name}"


def save_video(data: bytes, content_type: str = "video/mp4") -> str:
    ext = _sniff_video_extension(data, content_type)
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = POST_VIDEO_DIR / filename
    dest.write_bytes(data)
    return f"/static/uploads/post_videos/{filename}"


def save_avatar(upload_file, user_id: int) -> str:
    data = upload_file.file.read()
    kind = validate_file(upload_file.content_type, len(data))
    if kind != "image":
        raise ValueError("Avatar must be an image")

    img = _load_and_verify_image(data)
    dest = _save_verified_image(img, AVATAR_DIR, resize_to=400)
    filename = f"{user_id}_{dest.name}"
    final_dest = AVATAR_DIR / filename
    dest.rename(final_dest)
    return f"/static/uploads/avatars/{filename}"


def save_avatar_bytes(data: bytes, original_filename: str, user_id: int, resize_to: int = 400) -> str:
    """Save already-read avatar bytes and return a public URL path.
    `original_filename` is accepted for API compatibility but is not
    trusted for path/extension generation.
    """
    img = _load_and_verify_image(data)
    dest = _save_verified_image(img, AVATAR_DIR, resize_to=resize_to)
    filename = f"{user_id}_{dest.name}"
    final_dest = AVATAR_DIR / filename
    dest.rename(final_dest)
    return f"/static/uploads/avatars/{filename}"


def _url_to_basename(url: str) -> str:
    """
    Extract a safe basename from a URL or path.
    Examples:
      '/static/uploads/avatars/12_abcd.png' -> '12_abcd.png'
      'https://example.com/static/uploads/avatars/12_abcd.png' -> '12_abcd.png'
      'uploads/avatars/12_abcd.png' -> '12_abcd.png'
    """
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlparse(url)
        path = parsed.path or url
    except Exception:
        path = url
    return Path(path).name


def delete_avatar(url: str, user_id: int | str) -> None:
    """
    Delete a previously uploaded avatar file.

    Safety checks:
      - resolve candidate path and ensure it's inside AVATAR_DIR
      - ensure filename starts with '<user_id>_' so we don't delete other users' files
    """
    if not url:
        return

    filename = _url_to_basename(url)
    if not filename:
        return

    prefix = f"{user_id}_"
    if not filename.startswith(prefix):
        raise ValueError("Filename does not belong to the provided user; aborting delete")

    candidate = (AVATAR_DIR / filename).resolve()
    avatars_dir_resolved = AVATAR_DIR.resolve()

    try:
        candidate.relative_to(avatars_dir_resolved)
    except Exception:
        raise ValueError("Avatar path is outside avatars directory; aborting delete")

    if candidate.exists() and candidate.is_file():
        candidate.unlink()
