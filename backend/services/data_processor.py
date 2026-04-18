import pandas as pd
import numpy as np
import uuid
import re
import logging
from typing import Optional, List, Tuple
from models.schemas import DatasetMeta, ColumnInfo

logger = logging.getLogger(__name__)

# In-memory session store (replace with Redis/GCS in production)
SESSION_STORE: dict[str, dict] = {}

PROTECTED_KEYWORDS = [
    "gender", "sex", "race", "ethnicity", "age", "religion",
    "nationality", "disability", "marital", "color", "colour",
    "caste", "tribe", "origin",
]

LABEL_KEYWORDS_EXACT = [
    "label", "target", "outcome", "class", "y", "output",
    "decision", "result",
]

LABEL_KEYWORDS_SUFFIX = [
    "hired", "approved", "admitted", "convicted", "diagnosis",
    "loan_status", "loan_approved", "is_hired", "is_approved",
]


def normalize_column_name(name: str) -> str:
    """Lowercase, snake_case, strip non-alphanumerics."""
    return re.sub(r"[^a-z0-9_]", "", name.strip().lower().replace(" ", "_").replace("-", "_"))


def _infer_column_info(df: pd.DataFrame) -> List[ColumnInfo]:
    infos = []
    for col in df.columns:
        series = df[col]
        sample = series.dropna().head(5).tolist()
        sample = [str(s) if not isinstance(s, (int, float, bool)) else s for s in sample]
        infos.append(ColumnInfo(
            name=col,
            dtype=str(series.dtype),
            unique_values=int(series.nunique()),
            null_count=int(series.isna().sum()),
            sample_values=sample,
        ))
    return infos


def detect_protected_attributes(df: pd.DataFrame) -> List[str]:
    """Return column names that likely represent protected attributes."""
    found = []
    for col in df.columns:
        col_norm = col.lower().replace("_", "")
        # Word-boundary matching: keyword must match the whole name or be a whole segment
        for kw in PROTECTED_KEYWORDS:
            parts = col.lower().split("_")
            if kw == col_norm or kw in parts:
                found.append(col)
                break
    return found


def detect_label_column(df: pd.DataFrame) -> Optional[str]:
    """Return the most likely label/target column."""
    # Pass 1: exact-match on common label keywords
    for col in df.columns:
        col_norm = col.lower().replace("_", "")
        if col_norm in LABEL_KEYWORDS_EXACT:
            return col

    # Pass 2: exact-match on domain-specific keywords
    for col in df.columns:
        col_norm = col.lower().replace("_", "")
        for kw in LABEL_KEYWORDS_SUFFIX:
            if col_norm == kw.replace("_", ""):
                return col

    # Pass 3: the last column IF it's binary (classic ML convention)
    last = df.columns[-1]
    if df[last].nunique() <= 2:
        return last

    return None


def load_and_register(filepath: str, filename: str) -> Tuple[str, DatasetMeta]:
    """Parse CSV, register in session store, return (session_id, meta)."""
    try:
        df = pd.read_csv(filepath)
    except pd.errors.EmptyDataError:
        raise ValueError("CSV file is empty.")
    except pd.errors.ParserError as e:
        raise ValueError(f"CSV parse error: {e}")

    if len(df) == 0:
        raise ValueError("CSV file contains no rows.")
    if len(df.columns) < 2:
        raise ValueError("CSV must have at least 2 columns.")

    # Normalize column names
    df.columns = [normalize_column_name(c) for c in df.columns]

    session_id = str(uuid.uuid4())
    SESSION_STORE[session_id] = {
        "df": df,
        "filename": filename,
        "filepath": filepath,
    }

    logger.info(f"Registered session {session_id[:8]}... for '{filename}' ({len(df)} rows)")

    meta = DatasetMeta(
        filename=filename,
        rows=len(df),
        columns=len(df.columns),
        detected_label_column=detect_label_column(df),
        detected_protected_attributes=detect_protected_attributes(df),
        all_columns=_infer_column_info(df),
    )
    return session_id, meta


def get_session(session_id: str) -> dict:
    """Retrieve session data or raise KeyError."""
    if session_id not in SESSION_STORE:
        raise KeyError(f"Session '{session_id}' not found. Please upload the dataset again.")
    return SESSION_STORE[session_id]


def save_mitigated_df(original_session_id: str, df_mitigated: pd.DataFrame) -> str:
    """Store a mitigated dataframe as a new session, return new session_id."""
    original = get_session(original_session_id)
    new_id = str(uuid.uuid4())
    SESSION_STORE[new_id] = {
        "df": df_mitigated,
        "filename": f"mitigated_{original['filename']}",
        "filepath": None,
        "parent_session": original_session_id,
    }
    logger.info(f"Saved mitigated session {new_id[:8]}... from {original_session_id[:8]}")
    return new_id
