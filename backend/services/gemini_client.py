"""
gemini_client.py
Wraps Google Generative AI (Gemini 1.5 Flash) for bias report generation.
"""
import os
import json
import logging
from typing import Dict, Any, Optional, List

try:
    import google.generativeai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False

logger = logging.getLogger(__name__)


BIAS_REPORT_PROMPT = """
You are an AI fairness auditor analyzing a machine learning model for discrimination.

=== DATASET ===
Name: {dataset_name}
Protected attribute analyzed: {attribute}
Group statistics: {group_stats}

=== FAIRNESS METRICS ===
- Demographic Parity Difference: {dpd}  (fair if |value| ≤ 0.10)
- Disparate Impact Ratio: {dir_val}     (fair if ≥ 0.80, per EEOC 4/5 rule)
- Equalized Odds Difference: {eod}      (fair if |value| ≤ 0.10)
- Statistical Parity Difference: {spd}  (fair if |value| ≤ 0.05)

=== YOUR TASK ===
1. **summary**: Explain in 2-3 plain-English sentences what these numbers mean for real people. No jargon.
2. **root_causes**: 3-4 likely reasons for this bias (e.g., historical data bias, proxy variables, underrepresentation).
3. **recommendations**: 3 specific, actionable fixes, ordered by impact.
4. **severity**: Rate as CRITICAL / HIGH / MODERATE / LOW / FAIR.

Respond ONLY in valid JSON — no markdown, no code fences:
{{"summary": "...", "root_causes": ["...", "..."], "recommendations": ["...", "..."], "severity": "..."}}
"""


def _get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY not set in environment.")
    if not _GENAI_AVAILABLE:
        raise ImportError("google-generativeai not installed.")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


def generate_bias_report(
    dataset_name: str,
    attribute: str,
    dpd: float,
    dir_val: float,
    eod: float,
    spd: float,
    group_stats: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Call Gemini to generate a plain-English bias audit report.
    Returns parsed JSON dict with keys: summary, root_causes, recommendations, severity.
    Falls back to deterministic stub if Gemini unavailable.
    """
    group_stats_str = json.dumps(group_stats or [], indent=2) if group_stats else "N/A"

    prompt = BIAS_REPORT_PROMPT.format(
        dataset_name=dataset_name,
        attribute=attribute,
        group_stats=group_stats_str,
        dpd=round(dpd, 4),
        dir_val=round(dir_val, 4),
        eod=round(eod, 4),
        spd=round(spd, 4),
    )

    try:
        model = _get_client()
        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        # Strip markdown code fences if Gemini ignored instructions
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            lines = [l for l in lines if not l.startswith("```")]
            raw_text = "\n".join(lines)
            if raw_text.startswith("json"):
                raw_text = raw_text[4:].strip()

        parsed = json.loads(raw_text)
        logger.info(f"Gemini report generated for attribute '{attribute}'")
        return parsed

    except (EnvironmentError, ImportError) as e:
        logger.warning(f"Gemini unavailable, using stub: {e}")
        return _stub_report(attribute, dpd, dir_val)

    except json.JSONDecodeError as e:
        logger.error(f"Gemini returned invalid JSON: {e}")
        return _stub_report(attribute, dpd, dir_val, error="Gemini JSON parse failed")

    except Exception as e:
        logger.exception("Gemini call failed")
        return _stub_report(attribute, dpd, dir_val, error=str(e))


def _stub_report(
    attribute: str, dpd: float, dir_val: float, error: Optional[str] = None
) -> Dict[str, Any]:
    """Deterministic stub used when Gemini is unavailable."""
    severity = (
        "CRITICAL" if abs(dpd) > 0.30 or dir_val < 0.60 else
        "HIGH"     if abs(dpd) > 0.20 or dir_val < 0.70 else
        "MODERATE" if abs(dpd) > 0.10 or dir_val < 0.80 else
        "LOW"      if abs(dpd) > 0.05 else "FAIR"
    )
    return {
        "summary": (
            f"The model shows a Demographic Parity Difference of {dpd:.2f} "
            f"for '{attribute}', with a Disparate Impact Ratio of {dir_val:.2f}. "
            f"{'This violates the EEOC 4/5 rule and indicates measurable discrimination.' if dir_val < 0.8 else 'This passes the 4/5 rule.'}"
        ),
        "root_causes": [
            "Historical bias embedded in the training labels.",
            "Underrepresentation of minority groups in training data.",
            "Proxy variables correlated with the protected attribute.",
        ],
        "recommendations": [
            "Apply Reweighing (AIF360) pre-processing to balance sample weights.",
            "Audit features for proxies (e.g., zip code, school name, name origin).",
            "Use Exponentiated Gradient (Fairlearn) to enforce fairness constraints during training.",
        ],
        "severity": severity,
        "_stub": True,
        **({"_error": error} if error else {}),
    }
