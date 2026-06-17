"""
Download training images for popular breeds not in the Stanford Dogs dataset.
Run this BEFORE train.py.

Install first:
    pip install icrawler

Usage:
    python collect_breeds.py

Images land in data/extra_breeds/<BreedName>/  (one folder per breed).
train.py picks them up automatically when it finds that directory.
"""

import sys
from pathlib import Path

EXTRA_DIR = Path("data") / "extra_breeds"
IMAGES_PER_BREED = 200  # raise to 300 for better accuracy, lower to go faster

# (folder_name, bing_search_query)
# folder_name becomes the class label — spaces become underscores for ImageFolder
EXTRA_BREEDS: list[tuple[str, str]] = [
    ("Goldendoodle",    "Goldendoodle dog breed purebred"),
    ("Labradoodle",     "Labradoodle dog breed purebred"),
    ("Cockapoo",        "Cockapoo dog breed purebred"),
    ("Bernedoodle",     "Bernedoodle dog breed purebred"),
    ("Cavapoo",         "Cavapoo dog breed purebred"),
    ("American_Bully",  "American Bully dog breed pocket bully"),
    ("Pomsky",          "Pomsky dog breed purebred"),
    ("Aussiedoodle",    "Aussiedoodle dog breed purebred"),
    ("Maltipoo",        "Maltipoo dog breed purebred"),
    ("Sheepadoodle",    "Sheepadoodle dog breed purebred"),
]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def count_images(folder: Path) -> int:
    return sum(1 for f in folder.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS)


def download(folder_name: str, query: str, n: int) -> None:
    from icrawler.builtin import BingImageCrawler

    out_dir = EXTRA_DIR / folder_name
    out_dir.mkdir(parents=True, exist_ok=True)

    existing = count_images(out_dir)
    if existing >= int(n * 0.8):
        print(f"  ✓  {folder_name:20s}  {existing} images already — skipping")
        return

    print(f"  ↓  {folder_name:20s}  fetching {n} images …", flush=True)
    crawler = BingImageCrawler(
        storage={"root_dir": str(out_dir)},
        downloader_threads=4,
        log_level=40,   # ERROR only — suppress icrawler noise
    )
    crawler.crawl(keyword=query, max_num=n, file_idx_offset=0)
    saved = count_images(out_dir)
    print(f"       {folder_name:20s}  → {saved} images saved")


def main() -> None:
    try:
        import icrawler  # noqa: F401
    except ImportError:
        print("ERROR: icrawler is not installed.")
        print("       Run:  pip install icrawler")
        sys.exit(1)

    EXTRA_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Collecting images for {len(EXTRA_BREEDS)} extra breeds → {EXTRA_DIR}/\n")

    for folder_name, query in EXTRA_BREEDS:
        download(folder_name, query, IMAGES_PER_BREED)

    total = sum(count_images(EXTRA_DIR / n) for n, _ in EXTRA_BREEDS)
    print(f"\n✓  Done — {total:,} images across {len(EXTRA_BREEDS)} breeds.")
    print("   Now run:  python train.py")


if __name__ == "__main__":
    main()
