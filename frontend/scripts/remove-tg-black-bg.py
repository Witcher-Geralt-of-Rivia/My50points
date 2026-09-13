"""Remove near-black backgrounds from tournament-guide PNG icons."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

DIR = Path(__file__).resolve().parents[1] / "public" / "images" / "tournament-guide"
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
                continue
            lum = max(r, g, b)
            if lum < THRESHOLD + SOFT_RANGE:
                alpha = int(max(0, min(255, (lum - THRESHOLD) * 255 / SOFT_RANGE)))
                px[x, y] = (r, g, b, min(a, alpha))

    img.save(path, format="PNG")
    print(f"Processed {path.name}")


def main() -> None:
    for png in sorted(DIR.glob("*.png")):
        remove_black_background(png)


if __name__ == "__main__":
    main()
