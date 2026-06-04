"""
Feature extraction from work entry data.

Extracts the following features:
- client_name (label-encoded)
- department (label-encoded, from clients table)
- day_of_week (0=Monday .. 6=Sunday)
- description keywords (TF-IDF vectorized)
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from scipy.sparse import hstack, csr_matrix

import config


def load_data_from_db(db_path):
    """Load work entries joined with client info from SQLite database."""
    import sqlite3

    conn = sqlite3.connect(db_path)
    query = """
        SELECT
            we.hours,
            we.description,
            we.date,
            c.name AS client_name,
            c.department
        FROM work_entries we
        JOIN clients c ON we.client_id = c.id
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df


def extract_features(df, tfidf_vectorizer=None, label_encoders=None, fit=True):
    """
    Extract features from a DataFrame of work entries.

    Parameters
    ----------
    df : pd.DataFrame
        Must contain columns: client_name, department, description, date.
    tfidf_vectorizer : TfidfVectorizer or None
        If provided and fit=False, uses this pre-fitted vectorizer.
    label_encoders : dict or None
        If provided and fit=False, uses these pre-fitted encoders.
    fit : bool
        If True, fits new transformers. If False, uses provided ones.

    Returns
    -------
    X : sparse matrix
        Feature matrix.
    tfidf_vectorizer : TfidfVectorizer
    label_encoders : dict
    """
    df = df.copy()

    # Parse date and extract day of week
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["day_of_week"] = df["date"].dt.dayofweek.fillna(0).astype(int)

    # Fill missing text fields
    df["description"] = df["description"].fillna("")
    df["client_name"] = df["client_name"].fillna("unknown")
    df["department"] = df["department"].fillna("unknown")

    # Label encode categorical features
    if fit:
        label_encoders = {}
        for col in ["client_name", "department"]:
            le = LabelEncoder()
            df[col + "_encoded"] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le
    else:
        for col in ["client_name", "department"]:
            le = label_encoders[col]
            # Handle unseen labels gracefully
            df[col + "_encoded"] = df[col].astype(str).apply(
                lambda x: le.transform([x])[0] if x in le.classes_ else -1
            )

    # TF-IDF on description
    if fit:
        tfidf_vectorizer = TfidfVectorizer(
            max_features=config.MAX_KEYWORD_FEATURES,
            stop_words="english",
            ngram_range=(1, 2),
        )
        tfidf_matrix = tfidf_vectorizer.fit_transform(df["description"])
    else:
        tfidf_matrix = tfidf_vectorizer.transform(df["description"])

    # Combine numeric + sparse features
    numeric_features = df[["client_name_encoded", "department_encoded", "day_of_week"]].values
    numeric_sparse = csr_matrix(numeric_features.astype(np.float64))
    X = hstack([numeric_sparse, tfidf_matrix])

    return X, tfidf_vectorizer, label_encoders
