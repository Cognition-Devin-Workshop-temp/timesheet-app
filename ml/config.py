"""
Training configuration with configurable hyperparameters.
Override via environment variables or by editing this file.
"""

import os

# --- Data source ---
# Path to the SQLite database file used for training.
# Falls back to the backend in-memory seed if not set.
DATABASE_PATH = os.getenv("ML_DATABASE_PATH", os.path.join(os.path.dirname(__file__), "data", "training_data.db"))

# --- Feature engineering ---
# Maximum number of keyword features extracted from descriptions via TF-IDF.
MAX_KEYWORD_FEATURES = int(os.getenv("ML_MAX_KEYWORD_FEATURES", "50"))

# --- Model hyperparameters (Random Forest Regressor) ---
N_ESTIMATORS = int(os.getenv("ML_N_ESTIMATORS", "100"))
MAX_DEPTH = int(os.getenv("ML_MAX_DEPTH", "10")) if os.getenv("ML_MAX_DEPTH") else None
MIN_SAMPLES_SPLIT = int(os.getenv("ML_MIN_SAMPLES_SPLIT", "2"))
MIN_SAMPLES_LEAF = int(os.getenv("ML_MIN_SAMPLES_LEAF", "1"))
RANDOM_STATE = int(os.getenv("ML_RANDOM_STATE", "42"))

# --- Training ---
TEST_SIZE = float(os.getenv("ML_TEST_SIZE", "0.2"))

# --- Output ---
MODEL_OUTPUT_PATH = os.getenv("ML_MODEL_OUTPUT_PATH", os.path.join(os.path.dirname(__file__), "model", "duration_model.pkl"))
VECTORIZER_OUTPUT_PATH = os.getenv("ML_VECTORIZER_OUTPUT_PATH", os.path.join(os.path.dirname(__file__), "model", "tfidf_vectorizer.pkl"))
LABEL_ENCODERS_OUTPUT_PATH = os.getenv("ML_LABEL_ENCODERS_OUTPUT_PATH", os.path.join(os.path.dirname(__file__), "model", "label_encoders.pkl"))
