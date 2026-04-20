"""
gemini_client.py — Day 6 update
Full Gemini 1.5 Flash integration with real API calls.
Falls back to intelligent stub when GEMINI_API_KEY not set.
"""
import os
import json
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

try:
    import google.generativeai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False


BIAS_REPORT_PROMPT = """
You are an AI fairness auditor. A machine learning model has been analyzed for bias.

Dataset: {dataset_name}
Protected attribute analyzed: {attribute}

Fairness Metrics Results:
- Demographic Parity Difference: {dpd} (fair threshold: ≤ 0.10, yours: {dpd_status})
- Disparate Impact Ratio: {dir_val} (fair threshold: ≥ 0.80, yours: {dir_status})
- Equalized Odds Difference: {eod} (fair threshold: ≤ 0.10, yours: {eod_status})
- Statistical Parity Difference: {spd} (fair threshold: ≤ 0.05, yours: {spd_status})

Group positive rates: {group_rates}

Your task:
1. Write a 2-3 sentence plain English summary of what these numbers mean for real people. No jargon.
2. List the 3 most likely root causes of this bias (be specific to this dataset type).
3. Give 3 concrete actionable recommendations to reduce this bias.
4. Rate overall severity: CRITICAL / HIGH / MODERATE / LOW / FAIR

Respond ONLY in valid JSON. No markdown, no backticks, no preamble. Pure JSON only:
{{
  "summary": "string",
  "root_causes": ["string", "string", "string"],
  "recommendations": ["string", "string", "string"],
  "severity": "string"
}}
"""


def _get_model():
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or not api_key.startswith("AIza"):
        raise EnvironmentError("GEMINI_API_KEY not configured or invalid.")
    if not _GENAI_AVAILABLE:
        raise ImportError("google-generativeai not installed. Run: pip install google-generativeai")
    genai.configure(api_key=api_key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    return genai.GenerativeModel(model_name)


def generate_bias_report(
    dataset_name: str,
    attribute: str,
    dpd: float,
    dir_val: float,
    eod: float,
    spd: float,
    group_rates: Dict[str, float] = None,
) -> Dict[str, Any]:
    """
    Call Gemini 1.5 Flash to generate a plain-English bias audit report.
    Returns dict with: summary, root_causes, recommendations, severity.
    Falls back to intelligent stub if Gemini unavailable.
    """
    group_rates_str = ", ".join(
        f"{g}: {r:.1%}" for g, r in (group_rates or {}).items()
    ) or "not available"

    prompt = BIAS_REPORT_PROMPT.format(
        dataset_name=dataset_name,
        attribute=attribute,
        dpd=round(dpd, 4),
        dpd_status="FAIL" if abs(dpd) > 0.10 else "PASS",
        dir_val=round(dir_val, 4),
        dir_status="FAIL" if dir_val < 0.80 else "PASS",
        eod=round(eod, 4),
        eod_status="FAIL" if abs(eod) > 0.10 else "PASS",
        spd=round(spd, 4),
        spd_status="FAIL" if abs(spd) > 0.05 else "PASS",
        group_rates=group_rates_str,
    )

    try:
        model = _get_model()
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip accidental markdown fences
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    raw = part
                    break

        result = json.loads(raw)

        # Validate required keys
        required = ["summary", "root_causes", "recommendations", "severity"]
        for key in required:
            if key not in result:
                raise ValueError(f"Missing key: {key}")

        result["_source"] = "gemini"
        return result

    except (EnvironmentError, ImportError):
        return _intelligent_stub(dataset_name, attribute, dpd, dir_val, eod, spd)

    except Exception as e:
        # Try stub as fallback
        stub = _intelligent_stub(dataset_name, attribute, dpd, dir_val, eod, spd)
        stub["_error"] = str(e)
        return stub


def _intelligent_stub(
    dataset_name: str,
    attribute: str,
    dpd: float,
    dir_val: float,
    eod: float,
    spd: float,
) -> Dict[str, Any]:
    """
    Intelligent fallback that generates contextually relevant responses
    based on actual metric values — not just generic text.
    """
    # Determine severity
    if abs(dpd) >= 0.30 or dir_val < 0.60:
        severity = "CRITICAL"
    elif abs(dpd) >= 0.20 or dir_val < 0.70:
        severity = "HIGH"
    elif abs(dpd) >= 0.10 or dir_val < 0.80:
        severity = "MODERATE"
    elif abs(dpd) >= 0.05:
        severity = "LOW"
    else:
        severity = "FAIR"

    # Direction of bias
    direction = "higher" if dpd > 0 else "lower"
    disadvantaged = "one group" if dpd < 0 else "another group"

    # Dataset-specific context
    dataset_lower = dataset_name.lower()
    if "hiring" in dataset_lower or "hire" in dataset_lower:
        context = "hiring decisions"
        domain_cause = "Historical underrepresentation of certain groups in the workforce"
        domain_rec = "Implement blind resume screening to remove demographic information from initial evaluation"
    elif "loan" in dataset_lower or "credit" in dataset_lower:
        context = "loan approvals"
        domain_cause = "Socioeconomic disparities reflected in credit history data"
        domain_rec = "Use alternative credit scoring models that consider non-traditional financial indicators"
    elif "medical" in dataset_lower or "diagnosis" in dataset_lower:
        context = "medical diagnoses"
        domain_cause = "Underrepresentation of certain demographic groups in medical training datasets"
        domain_rec = "Collect more diverse clinical data and validate the model separately on each demographic group"
    else:
        context = "predictions"
        domain_cause = "Training data that reflects historical societal inequalities"
        domain_rec = "Audit the training data collection process for systematic sampling bias"

    summary = (
        f"The model shows a Demographic Parity Difference of {dpd:.3f} for '{attribute}', "
        f"meaning one group receives {context} at a {direction} rate than others. "
        f"With a Disparate Impact Ratio of {dir_val:.3f}, "
        f"{'this violates' if dir_val < 0.80 else 'this passes'} the industry-standard 4/5 rule "
        f"(threshold: 0.80), indicating {'significant systemic disadvantage' if dir_val < 0.80 else 'acceptable fairness levels'}."
    )

    return {
        "summary": summary,
        "root_causes": [
            domain_cause,
            f"Proxy variables in the feature set that correlate with '{attribute}' (e.g., zip code, school name)",
            "Imbalanced representation of demographic groups in the training dataset",
        ],
        "recommendations": [
            domain_rec,
            f"Apply Reweighing or Exponentiated Gradient debiasing to reduce the {abs(dpd):.3f} parity gap",
            "Set up ongoing fairness monitoring to track bias metrics across model versions",
        ],
        "severity": severity,
        "_source": "stub",
    }
