#!/usr/bin/env python3
"""
Training script for the task-duration prediction model.

Usage:
    python train.py                          # uses defaults from config.py
    ML_N_ESTIMATORS=200 python train.py      # override hyperparams via env

The script:
1. Loads historical work-entry data from the SQLite database.
2. Extracts features (client, department, day_of_week, description keywords).
3. Trains a Random Forest regressor to predict hours.
4. Evaluates on a held-out test set.
5. Serializes the model and transformers to disk.
"""

import os
import sys

import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

import config
from features import load_data_from_db, extract_features


def train():
    print("=" * 60)
    print("Task Duration Prediction - Training Pipeline")
    print("=" * 60)

    # --- Load data ---
    db_path = config.DATABASE_PATH
    if not os.path.exists(db_path):
        print(f"ERROR: Database not found at {db_path}")
        print("Provide a valid path via ML_DATABASE_PATH env var or place a")
        print("SQLite DB with work_entries and clients tables at that location.")
        sys.exit(1)

    print(f"\nLoading data from: {db_path}")
    df = load_data_from_db(db_path)
    print(f"  Total samples: {len(df)}")

    if len(df) < 10:
        print("ERROR: Not enough data to train (need at least 10 entries).")
        sys.exit(1)

    # --- Extract features ---
    print("\nExtracting features...")
    print(f"  Max keyword features (TF-IDF): {config.MAX_KEYWORD_FEATURES}")
    y = df["hours"].values.astype(np.float64)
    X, tfidf_vectorizer, label_encoders = extract_features(df, fit=True)
    print(f"  Feature matrix shape: {X.shape}")

    # --- Train/test split ---
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=config.TEST_SIZE, random_state=config.RANDOM_STATE
    )
    print(f"\n  Train samples: {X_train.shape[0]}")
    print(f"  Test samples:  {X_test.shape[0]}")

    # --- Train model ---
    print("\nTraining Random Forest Regressor...")
    print(f"  n_estimators:     {config.N_ESTIMATORS}")
    print(f"  max_depth:        {config.MAX_DEPTH}")
    print(f"  min_samples_split:{config.MIN_SAMPLES_SPLIT}")
    print(f"  min_samples_leaf: {config.MIN_SAMPLES_LEAF}")
    print(f"  random_state:     {config.RANDOM_STATE}")

    model = RandomForestRegressor(
        n_estimators=config.N_ESTIMATORS,
        max_depth=config.MAX_DEPTH,
        min_samples_split=config.MIN_SAMPLES_SPLIT,
        min_samples_leaf=config.MIN_SAMPLES_LEAF,
        random_state=config.RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # --- Evaluate ---
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print("\n--- Evaluation on Test Set ---")
    print(f"  MAE:  {mae:.4f} hours")
    print(f"  RMSE: {rmse:.4f} hours")
    print(f"  R2:   {r2:.4f}")

    # --- Serialize ---
    os.makedirs(os.path.dirname(config.MODEL_OUTPUT_PATH), exist_ok=True)
    joblib.dump(model, config.MODEL_OUTPUT_PATH)
    joblib.dump(tfidf_vectorizer, config.VECTORIZER_OUTPUT_PATH)
    joblib.dump(label_encoders, config.LABEL_ENCODERS_OUTPUT_PATH)

    print(f"\nModel saved to:       {config.MODEL_OUTPUT_PATH}")
    print(f"Vectorizer saved to:  {config.VECTORIZER_OUTPUT_PATH}")
    print(f"Label encoders saved: {config.LABEL_ENCODERS_OUTPUT_PATH}")
    print("\nDone.")


if __name__ == "__main__":
    train()
