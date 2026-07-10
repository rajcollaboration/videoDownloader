import logging

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def init_db_extensions(db: Session) -> None:
    """Enable PostgreSQL extensions required by the AI video platform."""
    if db.bind is None or db.bind.dialect.name != "postgresql":
        return

    try:
        db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        db.commit()
        logger.info("pgvector extension enabled")
    except Exception as exc:
        db.rollback()
        logger.warning("Could not enable pgvector extension: %s", exc)
