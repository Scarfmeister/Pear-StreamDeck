"""Crash-resistant local JSON storage. No active sessions are committed."""
import json
import hashlib
import os
from pathlib import Path
import tempfile
from .model import validate_session


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
        return validate_session(json.load(stream))


def file_sha256(path):
    """Hash an explicitly selected local installer without loading it into memory."""
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()
