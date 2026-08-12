"""
Curate apartment galleries from dedicated room folders.

Room 1 Tropical Escape  -> src/assets/room1/*
Room 2 Island Breeze    -> src/assets/room2/*
Room 3 Palm Retreat     -> src/assets/room3/*
Room 4 Golden Serenity  -> src/assets/room4/*
Room A&B Sunset Suite   -> src/assets/Malfranza A and B/*

Usage: python src/scripts/rebuild-room-galleries.py
Then:  backend  npx tsx src/scripts/seed-apartment-media.ts
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(r"d:\Malfranza Barbados Gateway\src\assets")
NEWIMAGE = ROOT / "newimage"
ROOM1 = ROOT / "room1"
ROOM2 = ROOT / "room2"
ROOM3 = ROOT / "room3"
ROOM4 = ROOT / "room4"
ROOM_AB = ROOT / "Malfranza A and B"
ROOMS = ROOT / "rooms"

# (slug, gallery folder name, source_dir, ordered filenames — hero first, washroom last)
CURATED: list[tuple[str, str, Path, list[str]]] = [
    (
        "apartment-1",
        "tropical-escape",
        ROOM1,
        [
            "Malfranza Apartment Number 1-10.jpg",
            "Malfranza Apartment Number 1.jpg",
            "Malfranza Apartment Number 1-25.jpg",
            "Malfranza Apartment Number 1-35.jpg",
            "Malfranza Apartment Number 1-34.jpg",
            "Malfranza Apartment Number 1-33.jpg",
            "Malfranza Apartment Number 1-23.jpg",
        ],
    ),
    (
        "apartment-2",
        "island-breeze",
        ROOM2,
        [
            "Malfranza Apartment Number 2-4.jpg",
            "Malfranza Apartment Number 2-8.jpg",
            "Malfranza Apartment Number 2-18.jpg",
            "Malfranza Apartment Number 2-22.jpg",
            "Malfranza Apartment Number 2-27.jpg",
            "Malfranza Apartment Number 2-11.jpg",
        ],
    ),
    (
        "apartment-3",
        "palm-retreat",
        ROOM3,
        [
            "Malfranza Apartment Number 3.jpg",
            "Malfranza Apartment Number 3-32.jpg",
            "Malfranza Apartment Number 3-30.jpg",
            "Malfranza Apartment Number 3-14.jpg",
            "Malfranza Apartment Number 3-22.jpg",
            "Malfranza Apartment Number 3-13.jpg",
        ],
    ),
    (
        "apartment-4",
        "golden-serenity",
        ROOM4,
        [
            "Malfranza Apartment Number 4-13.jpg",  # bedroom + TV hero
            "Malfranza Apartment Number 4-12.jpg",  # wardrobe / bedroom
            "Malfranza Apartment Number 4-32.jpg",  # dining
            "Malfranza Apartment Number 4-35.jpg",  # kitchen
            "Malfranza Apartment Number 4-17.jpg",  # bathroom vanity
            "Malfranza Apartment Number 4-25.jpg",  # toilet last
        ],
    ),
    (
        "apartment-a-and-b",
        "sunset-suite",
        ROOM_AB,
        [
            "Malfranza A AND B-9.jpg",  # bedroom hero
            "Malfranza A AND B-10.jpg",  # bedroom + TV / AC
            "Malfranza A AND B-30.jpg",  # dining
            "Malfranza A AND B-31.jpg",  # kitchen
            "Malfranza A AND B-22.jpg",  # exterior stairs
            "Malfranza A AND B-19.jpg",  # closet
            "Malfranza A AND B-4.jpg",  # washroom last
        ],
    ),
]


def ahash(path: Path, size: int = 8) -> str:
    im = Image.open(path).convert("L").resize((size, size), Image.Resampling.LANCZOS)
    px = list(im.getdata())
    avg = sum(px) / len(px)
    return "".join("1" if p >= avg else "0" for p in px)


def hamming(a: str, b: str) -> int:
    return sum(x != y for x, y in zip(a, b))


def write_web_jpg(src: Path, dest: Path, max_side: int = 2000, quality: int = 85) -> None:
    """CDN-friendly JPEG under Cloudinary free-plan upload limit (~10MB)."""
    with Image.open(src) as im:
        im = im.convert("RGB")
        w, h = im.size
        scale = min(1.0, max_side / max(w, h))
        if scale < 1.0:
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        im.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    if dest.stat().st_size > 9_000_000:
        with Image.open(src) as im:
            im = im.convert("RGB")
            w, h = im.size
            scale = min(1.0, 1600 / max(w, h))
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
            im.save(dest, "JPEG", quality=75, optimize=True, progressive=True)


def resolve_src(source_dir: Path, name: str) -> Path | None:
    for base in (source_dir, ROOM1, ROOM2, ROOM3, ROOM4, ROOM_AB, NEWIMAGE):
        candidate = base / name
        if candidate.exists():
            return candidate
    return None


def copy_unique(slug: str, folder_name: str, source_dir: Path, names: list[str]) -> None:
    dest = ROOMS / f"{slug}_{folder_name}"
    dest.mkdir(parents=True, exist_ok=True)
    for old in dest.glob("*"):
        old.unlink()

    if not names:
        print(f"=== {slug}: no files (folder emptied)")
        return

    kept_hashes: list[str] = []
    n = 0
    print(f"=== {slug} / {folder_name}  (from {source_dir.name})")
    for name in names:
        src = resolve_src(source_dir, name)
        if src is None:
            print(f"  missing: {name}")
            continue
        try:
            h = ahash(src)
        except Exception as exc:
            print(f"  unreadable {name}: {exc}")
            continue
        if any(hamming(h, kh) <= 10 for kh in kept_hashes):
            print(f"  skip near-dup: {name}")
            continue
        kept_hashes.append(h)
        n += 1
        stem = src.stem.lower().replace(" ", "-")
        stem = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in stem)
        out = dest / f"{folder_name}-{n:02d}-{stem}.jpg"
        write_web_jpg(src, out)
        print(f"  {n:02d} {name} -> {out.name} ({out.stat().st_size // 1024} KB)")


def clear_legacy_from_newimage(patterns: list[str]) -> None:
    if not NEWIMAGE.exists():
        return
    removed = 0
    for p in list(NEWIMAGE.iterdir()):
        if not p.is_file():
            continue
        lower = p.name.lower()
        if any(pat in lower for pat in patterns):
            p.unlink()
            removed += 1
            print(f"  removed legacy {p.name}")
    print(f"Cleared {removed} legacy file(s) from newimage/")


def main() -> None:
    import os

    only = os.environ.get("ONLY", "").strip()
    ROOMS.mkdir(parents=True, exist_ok=True)
    for folder, label in (
        (ROOM1, "room1"),
        (ROOM2, "room2"),
        (ROOM3, "room3"),
        (ROOM4, "room4"),
        (ROOM_AB, "Malfranza A and B"),
    ):
        if only and only not in {label, folder.name}:
            continue
        if not folder.exists():
            raise SystemExit(f"Missing {label} folder: {folder}")

    for slug, folder_name, source_dir, names in CURATED:
        if only and only not in {slug, folder_name, source_dir.name, "Malfranza A and B"}:
            continue
        copy_unique(slug, folder_name, source_dir, names)

    print("\nCleaning legacy Room 4 & A/B images from newimage...")
    clear_legacy_from_newimage(
        [
            "apartment number 4",
            "a and b",
        ]
    )
    print("\nDone. Re-run seed-apartment-media to push to Cloudinary/DB.")


if __name__ == "__main__":
    main()
