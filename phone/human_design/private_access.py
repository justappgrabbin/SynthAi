"""Private chart ownership using the existing account identity or a browser capability."""
from contextvars import ContextVar
from dataclasses import dataclass
import hashlib
import re
import secrets
import sqlite3
import threading

from fastapi import Depends, HTTPException, Request, Response
from .network_identity import optional_network_identity

COOKIE = 'synthia_private_browser'

@dataclass(frozen=True)
class PrivateIdentity:
    browser: str
    account: str | None

private_identity: ContextVar[PrivateIdentity | None] = ContextVar('private_identity', default=None)

async def private_session(request: Request, response: Response,
                          member: dict | None = Depends(optional_network_identity)):
    token = request.cookies.get(COOKIE, '')
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}', token):
        token = secrets.token_urlsafe(32)
        response.set_cookie(COOKIE, token, httponly=True, secure=request.url.scheme == 'https',
                            samesite='lax', max_age=365*24*60*60)
    identity = PrivateIdentity('browser:' + hashlib.sha256(token.encode()).hexdigest(),
                               f"account:{member['id']}" if member else None)
    context = private_identity.set(identity)
    try:
        yield identity
    finally:
        private_identity.reset(context)

class ChartOwnership:
    def __init__(self, path=None):
        self.path = path
        self.owners = {}
        self.lock = threading.RLock()
        if path:
            with sqlite3.connect(path) as db:
                db.execute('CREATE TABLE IF NOT EXISTS private_chart_owners (chart_id TEXT PRIMARY KEY, subject TEXT NOT NULL)')

    def assign(self, chart_id):
        identity = private_identity.get()
        if identity is None:
            return  # Trusted in-process tools do not run under an HTTP request.
        subject = identity.account or identity.browser
        if self.path:
            with sqlite3.connect(self.path) as db:
                db.execute('INSERT INTO private_chart_owners VALUES (?, ?)', (chart_id, subject))
        else:
            with self.lock:
                self.owners[chart_id] = subject

    @staticmethod
    def _authorized(owner, identity):
        if owner is not None and (owner == identity.account or owner == identity.browser):
            return identity.account or owner
        # Same response for unknown, legacy-unowned, and another person's chart.
        raise HTTPException(status_code=404, detail='This private chart is not available in your session. Sign in to its account or use its creating browser.')

    def require(self, chart_id):
        identity = private_identity.get()
        if identity is None:
            return
        if self.path:
            with sqlite3.connect(self.path) as db:
                db.execute('BEGIN IMMEDIATE')
                row = db.execute('SELECT subject FROM private_chart_owners WHERE chart_id=?', (chart_id,)).fetchone()
                owner = row[0] if row else None
                next_owner = self._authorized(owner, identity)
                if next_owner != owner:
                    db.execute('UPDATE private_chart_owners SET subject=? WHERE chart_id=?', (next_owner, chart_id))
        else:
            with self.lock:
                owner = self.owners.get(chart_id)
                self.owners[chart_id] = self._authorized(owner, identity)

    def available_ids(self):
        identity = private_identity.get()
        if identity is None:
            return []
        subjects = [identity.browser] + ([identity.account] if identity.account else [])
        if self.path:
            with sqlite3.connect(self.path) as db:
                marks = ','.join('?' for _ in subjects)
                return [row[0] for row in db.execute(f'SELECT chart_id FROM private_chart_owners WHERE subject IN ({marks})', subjects)]
        with self.lock:
            return [chart_id for chart_id, subject in self.owners.items() if subject in subjects]
