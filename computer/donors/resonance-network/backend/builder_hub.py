"""
Builder's Hub -- the real-world extension of the Resonance Market.

Where the Market trades a single skill/energy in one exchange, the
Builder's Hub is for standing projects: something someone is actually
building (an app, a business idea, a piece of art, a tool) that needs
ongoing collaborators, not a one-off. Maps to the "Resonance Field
Project" concept from the original design doc -- creative/community/
business projects that need diverse roles to succeed.

Matching reuses the same real complementarity engine as everything else
(resonance.center_complementarity) -- "who would complement this project"
is computed from real chart data, the same way pod-fit and 1:1 matching
already work. Nothing new invented for matching; this module is really
just: real project storage + real support tracking + the existing
matching brain pointed at a new kind of target.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
import sqlite3
import uuid

from resonance import center_complementarity, ALL_CENTERS

VALID_CATEGORIES = ["app", "business", "art", "research", "tool", "community", "other"]
VALID_STATUSES = ["seeking_collaborators", "building", "launched", "paused"]


@dataclass
class BuilderProject:
    id: str
    creator_id: str
    creator_name: str
    title: str
    description: str
    category: str
    status: str
    centers_needed: List[str]  # which real centers this project could use help in
    link: Optional[str]
    support_count: int
    created_at: str


def init_builder_hub_tables(conn: sqlite3.Connection) -> None:
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS builder_projects (
        id TEXT PRIMARY KEY, creator_id TEXT, creator_name TEXT, title TEXT,
        description TEXT, category TEXT, status TEXT, centers_needed TEXT,
        link TEXT, created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS builder_project_supporters (
        project_id TEXT, user_id TEXT, user_name TEXT, supported_at TEXT,
        PRIMARY KEY (project_id, user_id)
    );
    """)
    conn.commit()


class BuilderHub:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        init_builder_hub_tables(conn)

    def create_project(self, creator_id: str, creator_name: str, title: str,
                        description: str, category: str, centers_needed: List[str],
                        link: Optional[str] = None) -> BuilderProject:
        if category not in VALID_CATEGORIES:
            raise ValueError(f"category must be one of {VALID_CATEGORIES}")
        for c in centers_needed:
            if c not in ALL_CENTERS:
                raise ValueError(f"Unknown center: {c}. Must be one of {ALL_CENTERS}")

        project = BuilderProject(
            id=f"proj_{uuid.uuid4().hex[:12]}", creator_id=creator_id, creator_name=creator_name,
            title=title, description=description, category=category, status="seeking_collaborators",
            centers_needed=centers_needed, link=link, support_count=0,
            created_at=datetime.utcnow().isoformat(),
        )
        self.conn.execute(
            "INSERT INTO builder_projects VALUES (?,?,?,?,?,?,?,?,?,?)",
            (project.id, project.creator_id, project.creator_name, project.title,
             project.description, project.category, project.status,
             ",".join(project.centers_needed), project.link, project.created_at),
        )
        self.conn.commit()
        return project

    def update_status(self, project_id: str, creator_id: str, status: str) -> None:
        if status not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        row = self.conn.execute("SELECT creator_id FROM builder_projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise ValueError("Project not found")
        if row["creator_id"] != creator_id:
            raise ValueError("Only the project creator can update its status")
        self.conn.execute("UPDATE builder_projects SET status = ? WHERE id = ?", (status, project_id))
        self.conn.commit()

    def support_project(self, project_id: str, user_id: str, user_name: str) -> int:
        """Express support/interest. Idempotent -- supporting twice doesn't
        double-count. Returns the new support count."""
        exists = self.conn.execute(
            "SELECT 1 FROM builder_project_supporters WHERE project_id = ? AND user_id = ?",
            (project_id, user_id),
        ).fetchone()
        if not exists:
            self.conn.execute(
                "INSERT INTO builder_project_supporters VALUES (?, ?, ?, ?)",
                (project_id, user_id, user_name, datetime.utcnow().isoformat()),
            )
            self.conn.commit()
        return self.conn.execute(
            "SELECT COUNT(*) c FROM builder_project_supporters WHERE project_id = ?", (project_id,)
        ).fetchone()["c"]

    def get_supporters(self, project_id: str, requesting_user_id: str) -> List[Dict]:
        """Only the project creator can see WHO supported -- everyone else
        just sees the count via browse_projects. Real names of interested
        collaborators are useful to the creator, not to be broadcast."""
        row = self.conn.execute("SELECT creator_id FROM builder_projects WHERE id = ?", (project_id,)).fetchone()
        if not row or row["creator_id"] != requesting_user_id:
            raise ValueError("Only the project creator can view supporters")
        rows = self.conn.execute(
            "SELECT user_id, user_name, supported_at FROM builder_project_supporters WHERE project_id = ?",
            (project_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def browse_projects(self, category: Optional[str] = None,
                         center_needed: Optional[str] = None) -> List[BuilderProject]:
        query = "SELECT * FROM builder_projects WHERE status != 'paused'"
        params: List = []
        if category:
            query += " AND category = ?"
            params.append(category)
        query += " ORDER BY created_at DESC"

        rows = self.conn.execute(query, params).fetchall()
        projects = []
        for r in rows:
            centers = r["centers_needed"].split(",") if r["centers_needed"] else []
            if center_needed and center_needed not in centers:
                continue
            support_count = self.conn.execute(
                "SELECT COUNT(*) c FROM builder_project_supporters WHERE project_id = ?", (r["id"],)
            ).fetchone()["c"]
            projects.append(BuilderProject(
                id=r["id"], creator_id=r["creator_id"], creator_name=r["creator_name"],
                title=r["title"], description=r["description"], category=r["category"],
                status=r["status"], centers_needed=centers, link=r["link"],
                support_count=support_count, created_at=r["created_at"],
            ))
        return projects

    def project_fit(self, project_id: str, viewer_centers: Dict[str, str]) -> Optional[Dict]:
        """Real complementarity between a project's stated needs and a
        viewer's actual chart -- same engine as pod-fit and 1:1 matching,
        just pointed at 'what this project needs' instead of 'what this
        person has'."""
        row = self.conn.execute("SELECT * FROM builder_projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            return None
        needed = row["centers_needed"].split(",") if row["centers_needed"] else []
        if not needed:
            return None

        # Build a synthetic "project centers" map: Defined for whatever it
        # HAS (implicitly: everything not listed as needed), Undefined for
        # what it explicitly needs -- so center_complementarity naturally
        # rewards a viewer who's Defined exactly where the project is gapped.
        project_centers = {c: ("Undefined" if c in needed else "Defined") for c in ALL_CENTERS}
        comp = center_complementarity(project_centers, viewer_centers)
        return {
            "project_id": project_id,
            "fit_score": comp["complementarity_score"],
            "you_could_help_with": [c for c in comp["completing_centers"] if c in needed],
        }
