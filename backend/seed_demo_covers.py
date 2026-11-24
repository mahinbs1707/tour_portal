"""Attach generated cover images to the 10 demo packages."""

from __future__ import annotations

from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from packages.models import TourPackage
from packages.services import PackageService

COVER_DIR = Path("/tmp/covers")

# title -> cover filename
COVER_MAP = {
    "Cox's Bazar Coastal Retreat": "cover-coxs-bazar.jpg",
    "Sundarbans Mangrove Expedition": "cover-sundarbans.jpg",
    "Sylhet Tea Garden Escape": "cover-sylhet-tea.jpg",
    "Bandarban Hill Trails": "cover-bandarban.jpg",
    "Saint Martin's Island Getaway": "cover-saint-martin.jpg",
    "Sajek Valley Cloud Camp": "cover-sajek.jpg",
    "Old Dhaka Heritage Walk": "cover-old-dhaka.jpg",
    "Kuakata Sea & Horizon": "cover-kuakata.jpg",
    "Rangamati Lake Circuit": "cover-rangamati.jpg",
    "Paharpur & Bogura Heritage Trail": "cover-paharpur.jpg",
}


def _sniff(path: Path) -> tuple[str, str]:
    header = path.read_bytes()[:16]
    if header[:3] == b"\xff\xd8\xff":
        return "image/jpeg", ".jpg"
    if header[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png", ".png"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp", ".webp"
    raise SystemExit(f"Unrecognized image type for {path}")


def run() -> None:
    User = get_user_model()
    admin = User.objects.filter(role="ADMIN").order_by("date_joined").first()
    if admin is None:
        raise SystemExit("No admin user found.")

    svc = PackageService()
    ok = 0
    for title, filename in COVER_MAP.items():
        pkg = TourPackage.objects.filter(title=title).first()
        if pkg is None:
            print(f"MISSING  package: {title}")
            continue
        path = COVER_DIR / filename
        if not path.is_file():
            print(f"MISSING  file: {path}")
            continue
        mime, ext = _sniff(path)
        uploaded = SimpleUploadedFile(
            name=f"{path.stem}{ext}",
            content=path.read_bytes(),
            content_type=mime,
        )
        pkg = svc.set_cover_image(
            actor_id=admin.id,
            package=pkg,
            uploaded=uploaded,
        )
        print(f"COVERED  {title} -> {pkg.cover_image}")
        ok += 1
    print(f"Done. covers_set={ok}")


if __name__ == "__main__":
    import django

    django.setup()
    run()
