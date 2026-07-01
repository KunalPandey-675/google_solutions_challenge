# JudgeNet 🔍

A full-stack platform to detect, analyze, and continuously monitor bias in machine learning models.

---

## Overview

JudgeNet helps developers and organizations understand whether their ML models are fair or biased, and how that bias evolves over time. Instead of one-time checks, it enables **continuous monitoring** — alerting users when bias increases or models start behaving unfairly.

---

## Features

### 🧪 Bias Detection
- Upload any CSV or XLS dataset
- Auto-detects protected attribute (e.g. `gender`, `race`, `age`) and target column
- 3-tier column detection: keyword heuristics → Gemini 1.5 Flash → error
- Computes fairness metrics using **AIF360**:
  - Statistical Parity Difference (SPD)
  - Disparate Impact
  - Mean Difference

### 🤖 Model Bias Analysis
- Accepts any external model API endpoint (REST or Hugging Face)
- Automatically tries multiple payload formats
- Computes model-level metrics: SPD, Disparate Impact, Equal Opportunity Difference, Average Odds Difference
- Compares dataset bias vs model bias with a verdict:
  - Model amplifies bias
  - Model reduces bias
  - Model mirrors dataset bias
- Runs adversarial prompt safety tests on text/LLM endpoints

### 📊 Continuous Monitoring
- Schedule bias checks: `daily`, `weekly`, or `manual`
- Background scheduler runs every 60 seconds, executes due jobs
- Stores all results in SQLite via SQLAlchemy

### 🚨 Alert System
- Triggers alerts on:
  - High bias (`|model_spd| > 0.3`)
  - Model amplification (`model_spd > dataset_spd + 0.1`)
  - Bias spikes between runs
  - Deviation from historical average
  - Model drift

### 📈 Monitoring Dashboard
- Day-wise and week-wise trend charts
- Dataset SPD vs Model SPD comparison
- Alert history with messages

---

## Tech Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | Next.js 16 (TypeScript), Tailwind CSS, Recharts |
| Backend  | Flask (Python), AIF360, LangChain, Gemini API   |
| Database | SQLite via SQLAlchemy                           |

---

## Project Structure

```
├── ml/
│   └── app.py              # Flask API — bias detection, monitoring, scheduler
├── src/
│   ├── app/
│   │   ├── api/            # Next.js API routes (proxies to Flask)
│   │   │   ├── upload/
│   │   │   ├── detect-bias/
│   │   │   ├── analyze/
│   │   │   ├── create-job/
│   │   │   ├── jobs/
│   │   │   ├── job-results/
│   │   │   ├── delete-job/
│   │   │   └── alerts/
│   │   ├── monitoring/     # Monitoring dashboard page
│   │   └── page.tsx        # Main analysis page
│   └── components/         # UI components (sections, layout, shadcn/ui)
├── bias_monitor.db         # SQLite database
├── requirements.txt
└── package.json
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Clone the repo

```bash
git clone https://github.com/BhavyaBhardwaj807/JudgeNet.git
cd JudgeNet
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Required for Hugging Face model API calls
HUGGINGFACE_API_TOKEN=<your_hf_token>

# Default model API used when no URL is provided in the request
MODEL_API_URL=https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english

# Optional: enables Gemini-based column detection and LangChain agent pipeline
GEMINI_API_KEY=<your_gemini_api_key>
```

### 3. Backend

```bash
pip install -r requirements.txt
python ml/app.py
```

Runs on `http://localhost:5001`

### 4. Frontend

```bash
npm install
npm run dev
```

Runs on `http://localhost:3000`

---

## How to Use

1. **Upload** a CSV or XLS dataset
2. **(Optional)** Provide a model API URL (REST endpoint or Hugging Face model URL)
3. Click **Analyze**
4. View:
   - Detected protected attribute and target column
   - Dataset bias metrics
   - Model bias metrics and comparison verdict
   - Prompt safety status (for text models)
5. **Enable Monitoring** to schedule recurring bias checks
6. Track bias trends over time in the **Monitoring Dashboard**

---

## API Reference

All endpoints served by Flask on `http://localhost:5001`.

| Method   | Endpoint                  | Description                          |
|----------|---------------------------|--------------------------------------|
| `POST`   | `/detect-bias`            | Run full bias analysis               |
| `POST`   | `/create-job`             | Create a monitoring job              |
| `GET`    | `/jobs`                   | List all monitoring jobs             |
| `GET`    | `/job-results/<job_id>`   | Get results for a job                |
| `GET`    | `/alerts`                 | Get all triggered alerts             |
| `DELETE` | `/delete-job/<job_id>`    | Delete a job and its results         |

### Request

```json
{
  "dataset_path": "/absolute/path/to/dataset.csv",
  "api_url": "https://your-model-api.com/predict"
}
```

### Response

```json
{
  "success": true,
  "detected_protected": "gender",
  "detected_target": "label",
  "dataset_bias": {
    "disparate_impact": 0.72,
    "statistical_parity_difference": -0.18,
    "mean_difference": -0.18
  },
  "model_bias": {
    "disparate_impact": 0.61,
    "statistical_parity_difference": -0.29,
    "equal_opportunity_difference": -0.21,
    "average_odds_difference": -0.19
  },
  "bias_comparison": {
    "dataset_spd": -0.18,
    "model_spd": -0.29,
    "verdict": "Model amplifies bias"
  },
  "severity": "HIGH",
  "prompt_safety_status": "safe"
}
```

---

## Fairness Metrics Explained

| Metric | Fair Value | Description |
|--------|-----------|-------------|
| Statistical Parity Difference | 0 | Difference in favorable outcome rates between groups |
| Disparate Impact | 1.0 | Ratio of favorable outcome rates between groups |
| Mean Difference | 0 | Same as SPD in this implementation |
| Equal Opportunity Difference | 0 | Difference in true positive rates between groups |
| Average Odds Difference | 0 | Average of TPR and FPR differences between groups |

---

## Built for Google Solutions Challenge 🌍

JudgeNet addresses **UN SDG 10 — Reduced Inequalities** by making AI fairness auditing accessible to every developer, not just large organizations with dedicated ML ethics teams.
