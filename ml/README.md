# ML Pipeline — Task Duration Prediction

A Python-based machine learning pipeline that predicts how long a timesheet task will take based on historical work-entry data.

## Overview

The pipeline extracts features from existing timesheet entries and trains a regression model to estimate hours for new tasks.

### Features Used

| Feature | Source | Encoding |
|---------|--------|----------|
| `client_name` | `clients.name` | Label-encoded |
| `department` | `clients.department` (project type) | Label-encoded |
| `description` | `work_entries.description` | TF-IDF (top-N keywords) |
| `day_of_week` | Derived from `work_entries.date` | Integer 0–6 |

### Model

- **Algorithm**: Random Forest Regressor (scikit-learn)
- **Target**: `work_entries.hours`

---

## Quick Start

```bash
cd ml/

# 1. Install dependencies
pip install -r requirements.txt

# 2. Generate synthetic training data (optional — or point to your production DB)
python seed_training_data.py

# 3. Train the model
python train.py

# 4. Start the prediction API
python app.py
```

The API will be available at `http://localhost:5000`.

---

## REST Endpoint

### `GET /api/predict-duration`

Accepts task metadata and returns an estimated duration.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_name` | string | No | Client name (defaults to "unknown") |
| `department` | string | No | Project type / department (defaults to "unknown") |
| `description` | string | No | Task description with keywords |
| `day_of_week` | int | No | 0=Monday .. 6=Sunday (defaults to today) |

#### Example Request

```bash
curl "http://localhost:5000/api/predict-duration?client_name=Acme+Corp&department=Engineering&description=bug+fix+authentication&day_of_week=2"
```

#### Example Response

```json
{
  "estimated_hours": 3.25,
  "confidence": "high",
  "features_used": {
    "client_name": "Acme Corp",
    "department": "Engineering",
    "description": "bug fix authentication",
    "day_of_week": 2
  }
}
```

#### Confidence Levels

- **high** — both client and department are known from training data
- **medium** — one of client or department is known
- **low** — neither is known (prediction relies on description keywords and day of week)

---

## Configuration

All hyperparameters are configurable via environment variables or by editing `config.py`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ML_DATABASE_PATH` | `ml/data/training_data.db` | Path to SQLite training database |
| `ML_MAX_KEYWORD_FEATURES` | `50` | Max TF-IDF features from descriptions |
| `ML_N_ESTIMATORS` | `100` | Number of trees in the forest |
| `ML_MAX_DEPTH` | `10` | Maximum tree depth (`None` for unlimited) |
| `ML_MIN_SAMPLES_SPLIT` | `2` | Min samples to split an internal node |
| `ML_MIN_SAMPLES_LEAF` | `1` | Min samples at a leaf node |
| `ML_RANDOM_STATE` | `42` | Random seed for reproducibility |
| `ML_TEST_SIZE` | `0.2` | Fraction held out for evaluation |
| `ML_MODEL_OUTPUT_PATH` | `ml/model/duration_model.pkl` | Output path for trained model |
| `ML_PORT` | `5000` | Port for the Flask prediction server |

### Example: Tune Hyperparameters

```bash
ML_N_ESTIMATORS=200 ML_MAX_DEPTH=15 ML_TEST_SIZE=0.25 python train.py
```

---

## Project Structure

```
ml/
├── README.md               # This file
├── requirements.txt        # Python dependencies
├── config.py               # Configurable hyperparameters
├── features.py             # Feature extraction logic
├── train.py                # Training script
├── seed_training_data.py   # Synthetic data generator
├── app.py                  # Flask REST API (GET /api/predict-duration)
├── .gitignore              # Excludes model/ and data/ artifacts
├── model/                  # (generated) serialized model artifacts
│   ├── duration_model.pkl
│   ├── tfidf_vectorizer.pkl
│   └── label_encoders.pkl
└── data/                   # (generated) training data
    └── training_data.db
```

---

## Production Deployment

For production use, run the prediction server with Gunicorn:

```bash
gunicorn app:app -b 0.0.0.0:5000 --workers 4
```

To retrain on real data, export your production SQLite database (or connect the `ML_DATABASE_PATH` to a copy) and re-run `python train.py`.

---

## Health Check

```bash
curl http://localhost:5000/health
```

Returns model load status:
```json
{"model_exists": true, "model_loaded": true, "status": "ok"}
```
