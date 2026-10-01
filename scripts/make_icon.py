"""
make_icon.py — draws the app icon (a progress ring on Stanford cardinal)
as PNG files, using only Python's built-in libraries.
    python3 scripts/make_icon.py
"""
import math, struct, zlib
from pathlib import Path

def png(size, path):
    bg, fg, dim = (140, 21, 21), (255, 255, 255), (184, 102, 102)
    c = size / 2
    r_out, r_in = size * 0.34, size * 0.24
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            px = bg
            # anti-aliased ring: sample 4 points per pixel
            hits = full = 0
            for dx, dy in ((.25, .25), (.75, .25), (.25, .75), (.75, .75)):
                X, Y = x + dx - c, y + dy - c
                d = math.hypot(X, Y)
                if r_in <= d <= r_out:
                    full += 1
                    angle = (math.degrees(math.atan2(X, -Y)) + 360) % 360  # 0° = top, clockwise
                    if angle <= 270:
                        hits += 1
            if full:
                ring = tuple(round((fg[i] * hits + dim[i] * (full - hits)) / full) for i in range(3))
                px = tuple(round((ring[i] * full + bg[i] * (4 - full)) / 4) for i in range(3))
            row += bytes(px)
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) \
        + chunk(b'IDAT', raw) + chunk(b'IEND', b'')
    Path(path).write_bytes(data)

root = Path(__file__).resolve().parent.parent
for size, name in ((180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')):
    png(size, root / name)
print('icons written')
