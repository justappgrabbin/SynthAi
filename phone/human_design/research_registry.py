"""Append-only local experiment records. Hashes aid inspection, not external attestation."""
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

class ResearchRegistry:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS forecasts (id TEXT PRIMARY KEY, payload TEXT NOT NULL, digest TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS outcomes (forecast_id TEXT PRIMARY KEY REFERENCES forecasts(id), observed INTEGER NOT NULL, recorded_at TEXT NOT NULL)')

    def connect(self):
        db = sqlite3.connect(self.path)
        db.execute('PRAGMA foreign_keys=ON')
        return db

    def lock(self, title, criterion, probability, baseline, deadline, now=None, configuration_id=None, chart_id=None):
        now = now or datetime.now(timezone.utc)
        due = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
        if due.tzinfo is None or due <= now:
            raise ValueError('Choose an outcome deadline in the future, including a timezone.')
        if not title.strip() or not criterion.strip() or not 0 <= probability <= 1 or not 0 <= baseline <= 1:
            raise ValueError('A prediction needs a title, measurable criterion, and probabilities between 0 and 1.')
        row = dict(id=str(uuid4()), title=title.strip(), criterion=criterion.strip(), probability=probability, baseline=baseline, deadline=due.isoformat(), locked_at=now.isoformat(), protocol_version='pilot-v1', configuration_id=configuration_id, chart_id=chart_id)
        payload = json.dumps(row, sort_keys=True, separators=(',', ':'))
        digest = hashlib.sha256(payload.encode()).hexdigest()
        with self.connect() as db:
            db.execute('INSERT INTO forecasts VALUES (?, ?, ?)', (row['id'], payload, digest))
        return dict(row, prediction_hash=digest)

    def resolve(self, forecast_id, observed, now=None):
        now = now or datetime.now(timezone.utc)
        if type(observed) is not int or observed not in (0, 1):
            raise ValueError('The observed outcome must be 0 or 1.')
        with self.connect() as db:
            row = db.execute('SELECT payload FROM forecasts WHERE id=?', (forecast_id,)).fetchone()
            if row is None:
                raise ValueError('Prediction was not found.')
            if now < datetime.fromisoformat(json.loads(row[0])['deadline']):
                raise ValueError('Record the outcome after the locked observation window closes.')
            try:
                db.execute('INSERT INTO outcomes VALUES (?, ?, ?)', (forecast_id, observed, now.isoformat()))
            except sqlite3.IntegrityError as exc:
                raise ValueError('This outcome is already recorded and cannot be overwritten.') from exc

    def list(self):
        with self.connect() as db:
            rows = db.execute('SELECT f.payload, f.digest, o.observed, o.recorded_at FROM forecasts f LEFT JOIN outcomes o ON f.id=o.forecast_id ORDER BY f.rowid DESC').fetchall()
        results = []
        for payload, digest, observed, at in rows:
            row = json.loads(payload)
            row.update(prediction_hash=digest, integrity_ok=hashlib.sha256(payload.encode()).hexdigest()==digest, observed=observed, resolved_at=at)
            if observed is not None:
                row.update(brier=(row['probability']-observed)**2, baseline_brier=(row['baseline']-observed)**2)
            results.append(row)
        return results
