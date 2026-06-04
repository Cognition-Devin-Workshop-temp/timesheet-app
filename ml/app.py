#!/usr/bin/env python3
"""
Flask application exposing the prediction REST endpoint.

GET /api/predict-duration
    Query parameters:
        client_name  (str)  - name of the client
        department   (str)  - project type / department
        description  (str)  - task description keywords
        day_of_week  (int)  - 0=Monday .. 6=Sunday (optional, defaults to today)

    Response (200):
        {
            "estimated_hours": 3.25,
            "confidence": "medium",
            "features_used": { ... }
        }

Run:
    python app.py                     # development server on port 5000
    gunicorn app:app -b 0.0.0.0:5000  # production
"""

import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify

import config
from features import extract_features

app = Flask(__name__)

# --- Load model artifacts at startup ---
_model = None
_tfidf_vectorizer = None
_label_encoders = None


def _load_model():
    global _model, _tfidf_vectorizer, _label_encoders
    if _model is not None:
        return

    if not os.path.exists(config.MODEL_OUTPUT_PATH):
        raise FileNotFoundError(
            f"Trained model not found at {config.MODEL_OUTPUT_PATH}. "
            "Run `python train.py` first."
        )

    _model = joblib.load(config.MODEL_OUTPUT_PATH)
    _tfidf_vectorizer = joblib.load(config.VECTORIZER_OUTPUT_PATH)
    _label_encoders = joblib.load(config.LABEL_ENCODERS_OUTPUT_PATH)


@app.route("/api/predict-duration", methods=["GET"])
def predict_duration():
    """Predict task duration based on metadata."""
    try:
        _load_model()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503

    # Parse input parameters
    client_name = request.args.get("client_name", "unknown")
    department = request.args.get("department", "unknown")
    description = request.args.get("description", "")
    day_of_week = request.args.get("day_of_week")

    if day_of_week is not None:
        try:
            day_of_week = int(day_of_week)
            if day_of_week < 0 or day_of_week > 6:
                return jsonify({"error": "day_of_week must be 0-6"}), 400
        except ValueError:
            return jsonify({"error": "day_of_week must be an integer 0-6"}), 400
    else:
        day_of_week = datetime.now().weekday()

    # Build a single-row DataFrame for feature extraction
    # We need a 'date' column for feature extraction; synthesize from day_of_week
    # Find next date matching the given day_of_week
    today = datetime.now()
    days_ahead = day_of_week - today.weekday()
    if days_ahead < 0:
        days_ahead += 7
    target_date = today + pd.Timedelta(days=days_ahead)

    input_df = pd.DataFrame([{
        "client_name": client_name,
        "department": department,
        "description": description,
        "date": target_date.strftime("%Y-%m-%d"),
    }])

    # Extract features using fitted transformers
    X, _, _ = extract_features(
        input_df,
        tfidf_vectorizer=_tfidf_vectorizer,
        label_encoders=_label_encoders,
        fit=False,
    )

    # Predict
    prediction = _model.predict(X)[0]
    prediction = float(max(0.25, round(prediction, 2)))

    # Estimate confidence based on how familiar the inputs are
    known_client = client_name in _label_encoders["client_name"].classes_
    known_dept = department in _label_encoders["department"].classes_
    if known_client and known_dept:
        confidence = "high"
    elif known_client or known_dept:
        confidence = "medium"
    else:
        confidence = "low"

    return jsonify({
        "estimated_hours": prediction,
        "confidence": confidence,
        "features_used": {
            "client_name": client_name,
            "department": department,
            "description": description,
            "day_of_week": day_of_week,
        },
    })


@app.route("/health", methods=["GET"])
def health():
    model_loaded = _model is not None
    model_exists = os.path.exists(config.MODEL_OUTPUT_PATH)
    return jsonify({
        "status": "ok",
        "model_loaded": model_loaded,
        "model_exists": model_exists,
    })


if __name__ == "__main__":
    port = int(os.getenv("ML_PORT", "5000"))
    debug = os.getenv("ML_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
