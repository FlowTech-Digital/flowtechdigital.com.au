"""Build only the public website; keep tooling and review material out of deployment."""

from __future__ import annotations

import json
from pathlib import Path
import re
import shutil
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "site-dist"
PUBLIC_FILES = (
    "index.html", "404.html", "manifest.json", "og-image.png",
    "robots.txt", "sitemap.xml",
)
PUBLIC_DIRECTORIES = (
    "assets", "favicons", "services", "about", "contact", "intake-form",
    "privacy", "terms",
)
WEB_EXTENSIONS = {
    ".html", ".css", ".js", ".json", ".xml", ".txt", ".svg", ".png",
    ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".ico", ".ttf", ".otf",
    ".woff", ".woff2", ".eot", ".mp4", ".webm", ".mp3", ".m4a",
}
IMAGE_EXTENSIONS = {".svg", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".ico"}


def checked_source(path: Path) -> Path:
    """Reject symlinks and files outside this checkout before copying."""
    resolved = path.resolve()
    if path.is_symlink() or not resolved.is_relative_to(ROOT):
        raise ValueError(f"Source must remain inside the checkout: {path}")
    return resolved


def source_files() -> set[Path]:
    selected: set[Path] = set()
    for name in PUBLIC_FILES:
        path = checked_source(ROOT / name)
        if not path.is_file():
            raise FileNotFoundError(f"Missing public website file: {name}")
        selected.add(path)
    for name in PUBLIC_DIRECTORIES:
        directory = checked_source(ROOT / name)
        if not directory.is_dir():
            raise FileNotFoundError(f"Missing public website directory: {name}")
        for path in directory.rglob("*"):
            checked_source(path)
            if path.is_file() and path.suffix.lower() in WEB_EXTENSIONS:
                selected.add(path)

    # Legacy root icons and logo files are included only when a public document
    # references them. The manifest can use relative icon paths as well.
    references: list[str] = []
    for path in tuple(selected):
        if path.suffix.lower() in {".html", ".css", ".json"}:
            document = path.read_text(encoding="utf-8")
            references.extend(re.findall(r'["\']([^"\'\s<>]+)["\']', document))
            references.extend(re.findall(r"url\(\s*['\"]?([^)'\"\s]+)", document))
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    references.extend(icon["src"] for icon in manifest.get("icons", []) if "src" in icon)
    for reference in references:
        parsed = urlparse(reference)
        if parsed.scheme and not (
            parsed.scheme in {"http", "https"}
            and parsed.netloc == "flowtechdigital.com.au"
        ):
            continue
        relative = Path(unquote(parsed.path).lstrip("/"))
        if len(relative.parts) != 1 or relative.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        source = checked_source(ROOT / relative)
        if source.is_file():
            selected.add(source)
    return selected


def main() -> None:
    selected = source_files()
    # Validate the final absolute target before removing a previous generated
    # build. A junction or symlink must never redirect this operation.
    expected = ROOT / "site-dist"
    if DESTINATION.is_symlink() or DESTINATION.resolve() != expected:
        raise ValueError("Refusing to clean a redirected site-dist directory")
    if not DESTINATION.resolve().is_relative_to(ROOT) or DESTINATION.parent != ROOT:
        raise ValueError("Build destination must be directly inside this checkout")
    if DESTINATION.exists():
        if not DESTINATION.is_dir():
            raise ValueError("site-dist exists but is not a generated directory")
        shutil.rmtree(DESTINATION)
    DESTINATION.mkdir()
    for source in sorted(selected):
        target = DESTINATION / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    print(f"Built {len(selected)} public files in {DESTINATION.name}")


if __name__ == "__main__":
    main()
