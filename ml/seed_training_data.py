#!/usr/bin/env python3
"""
Generate a synthetic training dataset from the timesheet-app schema.

This script creates a SQLite database with realistic sample data that
mirrors the production work_entries + clients tables. Use it to bootstrap
model training when no production export is available.

Usage:
    python seed_training_data.py            # writes to ml/data/training_data.db
    python seed_training_data.py path.db    # custom output path
"""

import os
import sys
import random
import sqlite3
from datetime import datetime, timedelta

CLIENTS = [
    {"name": "Acme Corp", "department": "Engineering", "description": "Software development"},
    {"name": "Globex Inc", "department": "Marketing", "description": "Brand strategy"},
    {"name": "Initech", "department": "Finance", "description": "Financial consulting"},
    {"name": "Umbrella LLC", "department": "Research", "description": "R&D projects"},
    {"name": "Stark Industries", "department": "Engineering", "description": "Hardware prototyping"},
    {"name": "Wayne Enterprises", "department": "Operations", "description": "Logistics optimization"},
    {"name": "Hooli", "department": "Engineering", "description": "Cloud infrastructure"},
    {"name": "Pied Piper", "department": "Engineering", "description": "Compression algorithms"},
]

TASK_TEMPLATES = [
    ("code review", 1.0, 2.5),
    ("sprint planning meeting", 0.5, 1.5),
    ("bug fix for authentication module", 2.0, 5.0),
    ("frontend UI implementation", 3.0, 8.0),
    ("database migration", 1.5, 4.0),
    ("API endpoint development", 2.0, 6.0),
    ("unit test writing", 1.0, 3.0),
    ("deployment and release", 0.5, 2.0),
    ("client meeting", 0.5, 1.5),
    ("architecture design discussion", 1.0, 3.0),
    ("documentation update", 0.5, 2.0),
    ("performance optimization", 2.0, 6.0),
    ("security audit", 2.0, 5.0),
    ("data analysis and reporting", 1.5, 4.0),
    ("onboarding new team member", 1.0, 3.0),
    ("incident response and debugging", 1.0, 4.0),
    ("infrastructure setup", 2.0, 6.0),
    ("design mockup review", 0.5, 1.5),
    ("integration testing", 1.5, 4.0),
    ("stakeholder presentation prep", 1.0, 3.0),
]

NUM_ENTRIES = 500


def create_db(db_path):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            department TEXT,
            email TEXT,
            user_email TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS work_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            user_email TEXT NOT NULL,
            hours DECIMAL(5,2) NOT NULL,
            description TEXT,
            date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id)
        )
    """)

    # Insert clients
    for client in CLIENTS:
        c.execute(
            "INSERT INTO clients (name, description, department, email, user_email) VALUES (?, ?, ?, ?, ?)",
            (client["name"], client["description"], client["department"],
             f"contact@{client['name'].lower().replace(' ', '')}.com", "user@example.com"),
        )

    # Generate work entries
    random.seed(42)
    base_date = datetime(2024, 1, 1)

    for _ in range(NUM_ENTRIES):
        client_id = random.randint(1, len(CLIENTS))
        task_desc, min_hours, max_hours = random.choice(TASK_TEMPLATES)

        # Add some variance based on day of week (weekends shorter)
        date = base_date + timedelta(days=random.randint(0, 365))
        day_of_week = date.weekday()

        hours = random.uniform(min_hours, max_hours)
        if day_of_week >= 5:  # weekend
            hours *= 0.6

        # Engineering tasks tend to be longer
        dept = CLIENTS[client_id - 1]["department"]
        if dept == "Engineering":
            hours *= 1.15
        elif dept == "Marketing":
            hours *= 0.85

        hours = round(max(0.25, min(hours, 12.0)), 2)

        c.execute(
            "INSERT INTO work_entries (client_id, user_email, hours, description, date) VALUES (?, ?, ?, ?, ?)",
            (client_id, "user@example.com", hours, task_desc, date.strftime("%Y-%m-%d")),
        )

    conn.commit()
    conn.close()
    print(f"Created training database with {NUM_ENTRIES} entries at: {db_path}")


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "data", "training_data.db"
    )
    create_db(output)
