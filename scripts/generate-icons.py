"""Project-created MIT media geometry. Regenerate with Python 3 and Inkscape 1.4.4."""
from pathlib import Path
from tempfile import TemporaryDirectory
import os
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "icons"
WHITE, GREEN, GRAY = "#F3F7F5", "#7FE0B2", "#7D8983"
speaker = '<path d="M26 58h20l28-22v72L46 86H26z"/>'
wave = '<path d="M88 51q24 21 0 42M103 36q40 36 0 72"/>'
heart = '<path d="M72 116 28 74C1 46 39 13 72 47c33-34 71-1 44 27z"/>'
broken = '<path d="M70 40 61 66 81 77 70 103"/>'
shuffle = '<path d="M24 42h12c26 0 41 60 68 60h15M24 102h12c26 0 41-60 68-60h15M107 30l14 12-14 12M107 90l14 12-14 12"/>'
repeat = '<path d="M44 40h51q25 0 25 25v15M104 66l16 15 16-15M100 104H49q-25 0-25-25V64M8 78l16-15 16 15"/>'
playlist = '<path d="M25 36h58M25 59h58M25 82h38"/><path d="m92 64 27 17-27 17z" fill="currentColor"/>'
shapes = {
    "music-play": ('<path d="m48 30 58 42-58 42z" fill="currentColor"/>', WHITE),
    "music-pause": ('<rect x="40" y="30" width="20" height="84" rx="4"/><rect x="84" y="30" width="20" height="84" rx="4"/>', WHITE),
    "music-next": ('<path d="m32 37 47 35-47 35z" fill="currentColor"/><path d="M104 37v70"/>', WHITE),
    "music-prev": ('<path d="m112 37-47 35 47 35z" fill="currentColor"/><path d="M40 37v70"/>', WHITE),
    "like-off": (heart, GRAY), "like-on": (heart, GREEN),
    "dislike-off": (heart + broken, GRAY), "dislike-on": (heart + broken, GREEN),
    "volume-on": (speaker + wave, WHITE),
    "volume-mute": (speaker + '<path d="m95 58 24 28m0-28-24 28"/>', GREEN),
    "volume-up": (speaker + '<path d="M92 72h30M107 57v30"/>', WHITE),
    "volume-down": (speaker + '<path d="M92 72h30"/>', WHITE),
    "shuffle": (shuffle, WHITE), "shuffle-off": (shuffle, GRAY), "shuffle-on": (shuffle, GREEN),
    "repeat": (repeat, WHITE), "repeat-none": (repeat + '<path d="m58 58 28 28m0-28L58 86"/>', GRAY),
    "repeat-all": (repeat + '<circle cx="61" cy="72" r="2"/><circle cx="83" cy="72" r="2"/>', GREEN),
    "repeat-one": (repeat + '<path d="m64 62 9-7v36M62 91h24"/>', GREEN),
    "playlist": (playlist, WHITE),
    "action-image": ('<circle cx="116" cy="23" r="12"/><path d="M116 22v7m0-13v1"/>', GRAY),
    "category-icon": ('<path d="M51 84V37l53-9v46M51 48l53-9"/><ellipse cx="39" cy="89" rx="13" ry="10"/><ellipse cx="92" cy="79" rx="13" ry="10"/>', GREEN),
}
shapes['plugin-icon'] = shapes['category-icon']

def main():
    ICONS.mkdir(exist_ok=True)
    with TemporaryDirectory(prefix="pear-icons-") as profile:
        env = dict(os.environ, INKSCAPE_PROFILE_DIR=profile, XDG_CACHE_HOME=profile)
        for name, (geometry, color) in shapes.items():
            svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <!-- Original Pear Desktop Connector geometry; MIT, see LICENSE and icons/NOTICE.md. -->
  <g color="{color}" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">{geometry}</g>
</svg>
'''
            source = ICONS / f"{name}.svg"
            source.write_text(svg)
            base_size = 28 if name == "category-icon" else 72
            for size, suffix in [(base_size, ""), (base_size * 2, "@2x")]:
                result = subprocess.run(["inkscape", str(source), "--export-type=png",
                                f"--export-width={size}", f"--export-height={size}",
                                f"--export-filename={ICONS / (name + suffix + '.png')}"],
                               env=env, capture_output=True, text=True)
                if result.returncode:
                    raise RuntimeError(result.stderr)
    print(f"Generated {len(shapes)} SVG sources and {len(shapes) * 2} PNG renditions.")

if __name__ == "__main__":
    main()
