"""Crash-resistant local JSON storage. No active sessions are committed."""
import json
import hashlib
import os
from pathlib import Path
import platform
import tempfile
from .model import validate_session, migrate_session


def atomic_text(path, text):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', newline='\n',
                                         dir=path.parent, prefix='.' + path.name + '.',
                                         suffix='.tmp', delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        # Best effort directory durability on POSIX; unsupported on Windows.
        if os.name == 'posix':
            try:
                fd = os.open(path.parent, os.O_RDONLY)
                try:
                    os.fsync(fd)
                finally:
                    os.close(fd)
            except OSError:
                pass
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def save_session(path, session):
    validate_session(session)
    atomic_text(path, json.dumps(session, ensure_ascii=False, indent=2) + '\n')


def load_session(path):
    with Path(path).open(encoding='utf-8') as stream:
        return migrate_session(json.load(stream))


def file_sha256(path):
    """Hash an explicitly selected local installer without loading it into memory."""
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def application_state_directory(system=None, environ=None, home=None):
    """Machine/user-local app state, never inferred from the source checkout."""
    system = system or platform.system()
    environ = os.environ if environ is None else environ
    home = Path.home() if home is None else Path(home)
    if system == 'Windows':
        base = Path(environ['LOCALAPPDATA']) if environ.get('LOCALAPPDATA') else home / 'AppData/Local'
        return base / 'PearStreamDeck/manual-testing'
    base = Path(environ['XDG_STATE_HOME']) if environ.get('XDG_STATE_HOME') else home / '.local/state'
    if not base.is_absolute():
        base = home / '.local/state'
    return base / 'pear-streamdeck/manual-testing'


def remember_session(state_directory, session_path):
    # This path is operational local state, not Runner Environment/export metadata.
    atomic_text(Path(state_directory) / 'last-session.txt', str(Path(session_path).resolve()))


def resume_session_path(state_directory):
    pointer = Path(state_directory) / 'last-session.txt'
    if not pointer.exists():
        return None
    text = pointer.read_text(encoding='utf-8').strip()
    if not text:
        return None
    path = Path(text)
    return path if path.is_absolute() and path.is_file() else None
