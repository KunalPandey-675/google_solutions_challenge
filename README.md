JudgeNet

A full-stack platform to detect, analyze, and continuously monitor bias in machine learning models.

🚀 Overview

This project helps developers and organizations understand whether their models are fair or biased, and how that bias evolves over time.

Instead of one-time checks, it enables continuous monitoring, alerting users when bias increases or models start behaving unfairly.

✨ Key Features
🔍 Bias Detection
Computes fairness metrics using AIF360
Supports:
Statistical Parity Difference (SPD)
Disparate Impact
Mean Difference
Automatically detects:
Protected attribute (e.g. gender)
Target variable
🤖 Model Bias Analysis
Accepts external model API endpoints
Compares:
Dataset bias vs Model bias
Verdicts:
Model amplifies bias
Model reduces bias
Model mirrors dataset bias
⏱ Continuous Monitoring
Schedule bias checks (daily/weekly)
Tracks bias trends over time
Stores results in database
🚨 Alert System
Detects:
Sudden bias spikes
Model drift
Bias amplification
Highlights critical fairness issues
📊 Monitoring Dashboard
Day-wise and week-wise trend analysis
Interactive charts
Key insights:
Bias increase %
Dataset vs model comparison
Clean and minimal UI
🛠 Tech Stack
Frontend
Next.js (TypeScript)
Tailwind CSS
Recharts (for visualization)
Backend
Flask (Python)
AIF360 (fairness metrics)
Database
SQLite (monitoring results)
📁 Project Structure
├── src/                # Frontend (Next.js)
├── public/             # Static assets
├── app.py              # Backend (Flask API)
├── model_api.py        # Sample model API
├── demo-data/          # Sample dataset
├── uploads/            # Runtime uploads (ignored in Git)
├── package.json
└── README.md
▶️ How to Run Locally
1️⃣ Backend
pip install -r requirements.txt
python app.py

Runs on:

http://localhost:5001
2️⃣ Frontend
npm install
npm run dev

Runs on:

http://localhost:3000
🧪 How to Use
Upload a dataset (CSV/XLS)
(Optional) Provide a model API URL
Click Analyze
View:
Dataset bias
Model bias
Comparison verdict
Enable Monitoring
Track bias over time in dashboard
