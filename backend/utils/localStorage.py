# utils/local_storage.py
import os
import uuid
from pathlib import Path
from PIL import Image, ImageOps
import urllib.parse


UPLOAD_DIR = Path("static/uploads")

AVATAR_DIR = UPLOAD_DIR / "avatars"
POST_IMAGE_DIR = UPLOAD_DIR / "post_images"
POST_VIDEO_DIR = UPLOAD_DIR / "post_videos"

MAX_IMAGE_SIZE = 10 * 1024 * 1024     # 10 MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024     # 50 MB

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
VIDEO_TYPES = {"video/mp4", "video/mkv", "video/webm"}

MAX_IMAGE_WIDTH = 1600

for d in (UPLOAD_DIR, AVATAR_DIR, POST_IMAGE_DIR, POST_VIDEO_DIR):
    d.mkdir(parents=True, exist_ok=True)

def secure_filename(filename: str) -> str:
    ext = Path(filename).suffix
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

def save_image(data: bytes, filename: str) -> str:
    dest = POST_IMAGE_DIR / filename
    dest.write_bytes(data)

    try:
        img = Image.open(dest)
        img = ImageOps.exif_transpose(img)

        if img.width > MAX_IMAGE_WIDTH:
            ratio = MAX_IMAGE_WIDTH / img.width
            img = img.resize((MAX_IMAGE_WIDTH, int(img.height * ratio)), Image.LANCZOS)

        img.save(dest, optimize=True, quality=85)
    except Exception:
        pass

    return f"/static/uploads/post_images/{filename}"

def save_video(data: bytes, filename: str) -> str:
    dest = POST_VIDEO_DIR / filename
    dest.write_bytes(data)
    return f"/static/uploads/post_videos/{filename}"

def save_avatar(upload_file, user_id: int) -> str:
    filename = f"{user_id}_{secure_filename(upload_file.filename)}"
    data = upload_file.file.read()

    kind = validate_file(upload_file.content_type, len(data))
    if kind != "image":
        raise ValueError("Avatar must be an image")

    dest = AVATAR_DIR / filename
    dest.write_bytes(data)

    try:
        img = Image.open(dest)
        img = ImageOps.exif_transpose(img)
        img = img.resize((400, 400))
        img.save(dest, optimize=True, quality=85)
    except Exception:
        pass

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

    Assumptions (matching your save_avatar implementation):
      - save_avatar stores files to: AVATAR_DIR / "<user_id>_<uuid>.<ext>"
      - save_avatar returns URL like: "/static/uploads/avatars/<filename>"

    Safety checks:
      - resolve candidate path and ensure it's inside AVATAR_DIR
      - ensure filename starts with '<user_id>_' so we don't delete other users' files
    """
    if not url:
        return

    filename = _url_to_basename(url)
    if not filename:
        return

    # Basic safety: filename should start with the user id prefix (as per save_avatar)
    prefix = f"{user_id}_"
    if not filename.startswith(prefix):
        # refuse to delete if it doesn't match expected user prefix
        raise ValueError("Filename does not belong to the provided user; aborting delete")

    candidate = (AVATAR_DIR / filename).resolve()
    avatars_dir_resolved = AVATAR_DIR.resolve()

    # Ensure candidate path is inside avatars dir
    try:
        candidate.relative_to(avatars_dir_resolved)
    except Exception:
        raise ValueError("Avatar path is outside avatars directory; aborting delete")

    # Delete file if exists
    if candidate.exists() and candidate.is_file():
        candidate.unlink()
        # optionally remove avatar dir if empty (not necessary, but safe)
        try:
            if not any(avatars_dir_resolved.iterdir()):
                # don't remove the top-level AVATAR_DIR itself since it's shared;
                # but if you had per-user directories you could remove them here.
                pass
        except Exception:
            pass
    else:
        # nothing to remove (file already missing) — silently return
        return
def save_avatar_bytes(data: bytes, original_filename: str, user_id: int, resize_to: int = 400) -> str:
    """
    Save avatar bytes and return a URL path.
    Filename will be: <user_id>_<uuid><ext>
    """
    # Use secure filename for uniqueness and safe ext
    safe_name = secure_filename(original_filename)
    filename = f"{user_id}_{safe_name}"
    dest = AVATAR_DIR / filename
    dest.write_bytes(data)

    # Try to normalize/resize
    try:
        img = Image.open(dest)
        img = ImageOps.exif_transpose(img)
        img = img.resize((resize_to, resize_to))
        img.save(dest, optimize=True, quality=85)
    except Exception:
        # if Pillow fails, leave raw bytes on disk
        pass

    return f"/static/uploads/avatars/{filename}"
