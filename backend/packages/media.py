"""Package media validation and local MEDIA_ROOT storage (Story 2.3)."""

from __future__ import annotations

import hashlib
import secrets
from pathlib import Path
from uuid import UUID

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile

ALLOWED_MIME_TYPES = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
    }
)

_MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

ADDITIONAL_IMAGES_MAX = 8
_DEFAULT_MAX_BYTES = 5242880


def _max_upload_bytes() -> int:
    raw = getattr(settings, "MEDIA_UPLOAD_MAX_BYTES", _DEFAULT_MAX_BYTES)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return _DEFAULT_MAX_BYTES


def _sniff_image_mime(header: bytes) -> str | None:
    """Detect JPEG/PNG/WebP from magic bytes; None if unrecognized."""
    if len(header) >= 3 and header[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if len(header) >= 8 and header[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if (
        len(header) >= 12
        and header[:4] == b"RIFF"
        and header[8:12] == b"WEBP"
    ):
        return "image/webp"
    return None


def validate_image_upload(uploaded: UploadedFile) -> str:
    """
    Validate MIME + magic sniff + size.

    Returns the canonical MIME type on success.
    Raises ValidationError without writing anything.
    """
    if uploaded is None:
        raise ValidationError({"file": "No file was uploaded."})

    max_bytes = _max_upload_bytes()
    size = getattr(uploaded, "size", None)
    if size is None:
        raise ValidationError({"file": "Unable to determine file size."})
    if size <= 0:
        raise ValidationError({"file": "Empty files are not allowed."})
    if size > max_bytes:
        raise ValidationError(
            {
                "file": (
                    f"File exceeds the configured maximum upload size "
                    f"({max_bytes} bytes)."
                )
            }
        )

    declared = (getattr(uploaded, "content_type", None) or "").split(";")[0].strip().lower()
    if declared not in ALLOWED_MIME_TYPES:
        raise ValidationError(
            {
                "file": (
                    "Unsupported file type. Only JPEG, PNG, and WebP images "
                    "are allowed."
                )
            }
        )

    header = uploaded.read(16)
    uploaded.seek(0)
    sniffed = _sniff_image_mime(header)
    if sniffed is None or sniffed != declared:
        raise ValidationError(
            {
                "file": (
                    "File content does not match an allowed image type "
                    "(JPEG, PNG, or WebP)."
                )
            }
        )
    return sniffed


def media_url_for_relative(relative_path: str) -> str:
    """Build a public `/media/...` URL from a path under MEDIA_ROOT."""
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    if not media_url.endswith("/"):
        media_url = f"{media_url}/"
    rel = relative_path.lstrip("/").replace("\\", "/")
    return f"{media_url}{rel}"


def relative_path_from_media_url(url: str) -> str | None:
    """Map `/media/...` back to a MEDIA_ROOT-relative path, or None."""
    if not url:
        return None
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    if not media_url.endswith("/"):
        media_url = f"{media_url}/"
    normalized = url.replace("\\", "/")
    if not normalized.startswith(media_url):
        return None
    return normalized[len(media_url) :]


def save_package_image(
    *,
    package_id: UUID,
    uploaded: UploadedFile,
    kind: str,
) -> str:
    """
    Validate and store under MEDIA_ROOT/packages/<id>/<kind>-<hash><ext>.

    Returns the public `/media/...` path.
    """
    mime = validate_image_upload(uploaded)
    ext = _MIME_TO_EXT[mime]
    max_bytes = _max_upload_bytes()
    digest = hashlib.sha256()
    # Mix content + nonce so replace-on-upload never collides on identical bytes.
    nonce = secrets.token_hex(8)
    for chunk in uploaded.chunks():
        digest.update(chunk)
    uploaded.seek(0)
    filename = f"{kind}-{digest.hexdigest()[:16]}-{nonce}{ext}"
    relative = Path("packages") / str(package_id) / filename
    absolute = Path(settings.MEDIA_ROOT) / relative
    absolute.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    try:
        with absolute.open("wb") as out:
            for chunk in uploaded.chunks():
                written += len(chunk)
                if written > max_bytes:
                    raise ValidationError(
                        {
                            "file": (
                                f"File exceeds the configured maximum upload "
                                f"size ({max_bytes} bytes)."
                            )
                        }
                    )
                out.write(chunk)
    except Exception:
        try:
            if absolute.is_file():
                absolute.unlink()
        except OSError:
            pass
        raise
    return media_url_for_relative(relative.as_posix())


def delete_media_file(url: str) -> None:
    """Best-effort delete of a `/media/...` file under MEDIA_ROOT."""
    relative = relative_path_from_media_url(url)
    if not relative:
        return
    rel_path = Path(relative)
    if rel_path.is_absolute() or ".." in rel_path.parts:
        return
    media_root = Path(settings.MEDIA_ROOT).resolve()
    absolute = (media_root / rel_path).resolve()
    if not absolute.is_relative_to(media_root):
        return
    try:
        if absolute.is_file():
            absolute.unlink()
    except OSError:
        # Best-effort only — DB update already owns the transaction.
        return
