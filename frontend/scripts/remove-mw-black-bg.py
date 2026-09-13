"""Remove near-black backgrounds from modality-welcome PNG icons."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

DIR = Path(__file__).resolve().parents[1] / "public" / "images" / "modality-welcome"
EXTRA_DIRS = [
    Path(__file__).resolve().parents[1] / "public" / "images" / "modality-workspace",
    Path(__file__).resolve().parents[1] / "public" / "Img" / "ticket-workflow",
]
THRESHOLD = 32
SOFT_RANGE = 55


def remove_black_background(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    bg = [[False] * w for _ in range(h)]

    def is_dark(r: int, g: int, b: int, a: int) -> bool:
        return a > 0 and r <= THRESHOLD and g <= THRESHOLD and b <= THRESHOLD

    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_dark(*px[x, y]):
                bg[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not bg[y][x] and is_dark(*px[x, y]):
                bg[y][x] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and is_dark(*px[nx, ny]):
                bg[ny][nx] = True
                q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if bg[y][x]:
                px[x, y] = (r, g, b, 0)
            elif is_dark(r, g, b, a):
                lum = max(r, g, b)
                if lum <= SOFT_RANGE:
                    fade = max(0, min(255, int(255 * (lum - THRESHOLD) / max(1, SOFT_RANGE - THRESHOLD))))
                    px[x, y] = (r, g, b, fade)

    img.save(path)
    print(f"Processed {path.name}")


def main() -> None:
    for base in [DIR, *EXTRA_DIRS]:
        base.mkdir(parents=True, exist_ok=True)
        for path in sorted(base.glob("*.png")):
            remove_black_background(path)


if __name__ == "__main__":
    main()
