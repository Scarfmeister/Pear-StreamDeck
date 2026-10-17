#!/usr/bin/env python3
"""Offline Tk manual-test runner with display-free validation and export."""
import argparse
from pathlib import Path
import sys
from manual_testing.model import MATRIX_IDS, load_catalog
from manual_testing.storage import load_session
from manual_testing.exporter import export_session

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--definitions', type=Path, default=ROOT / 'docs/manual-testing/test-cases.json')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--validate', action='store_true', help='Validate the catalog without Tk')
    group.add_argument('--export', type=Path, metavar='SESSION', help='Export a saved session without Tk')
    parser.add_argument('--output', type=Path, help='Markdown destination for --export')
    parser.add_argument('--session', type=Path, help='Open this session in the GUI')
    args = parser.parse_args()
    try:
        if args.validate:
            catalog = load_catalog(args.definitions)
            ids = {t['id'] for t in catalog['tests']}
            if not set(MATRIX_IDS) <= ids:
                raise ValueError('Missing current matrix IDs')
            if not any(s['id'] == 'windows-pi-retest' and 'PI01' in s['tests'] for s in catalog['suites']):
                raise ValueError('Missing detailed PI retest suite')
            print(f'Valid: {len(MATRIX_IDS)} matrix tests; {len(catalog["tests"])} total tests; {len(catalog["suites"])} suites.')
            return 0
        if args.export:
            if not args.output:
                parser.error('--export requires --output')
            export_session(args.output, load_session(args.export), ROOT)
            print(f'Exported {args.output}')
            return 0
        if args.output:
            parser.error('--output requires --export')
        try:
            from manual_testing.gui import launch
            launch(ROOT, load_catalog(args.definitions), args.session)
        except ImportError:
            print('Tkinter is unavailable. Check: python3 -m tkinter (Windows: py -3 -m tkinter). '
                  'Fedora/Nobara: sudo dnf install python3-tkinter. See docs/manual-testing/README.md.', file=sys.stderr)
            return 1
        return 0
    except (OSError, ValueError) as error:
        print(f'Manual test runner: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
