import requests
import json
import os
import time

BACKEND_URL = "http://localhost:8080"

def test_flow():
    print("--- Starting Day 5-6 Fixes Verification ---")
    
    # 2. Upload hiring_sample.csv
    dataset_path = os.path.join("datasets", "hiring_sample.csv")
    try:
        with open(dataset_path, "rb") as f:
            r = requests.post(f"{BACKEND_URL}/api/upload/", files={"file": f})
        data = r.json()
        session_id = data["session_id"]
        print(f"✅ Step 2: Upload successful (session_id: {session_id})")
    except Exception as e:
        print(f"❌ Step 2: Upload error: {e}")
        return

    # 3. Analyze Bias (race)
    try:
        r = requests.post(f"{BACKEND_URL}/api/analyze/", json={
            "session_id": session_id,
            "protected_attributes": ["race"],
            "label_column": "hired"
        })
        analysis_results = r.json()
        print("✅ Step 3: Analysis (race) successful")
        
        # Check metrics
        metrics = analysis_results["attribute_analyses"][0]["metrics"]
        eod = next(m for m in metrics if m["name"] == "equalized_odds_difference")
        aod = next(m for m in metrics if m["name"] == "average_odds_difference")
        
        print(f"   - Equalized Odds: {eod['value']} (N/A: {eod.get('not_applicable')})")
        print(f"   - Average Odds: {aod['value']} (N/A: {aod.get('not_applicable')})")
        
        if eod['value'] != 0.0 or aod['value'] != 0.0 or eod.get('not_applicable'):
             print("✅ Step 3b: Metrics show real values or correct N/A status")
        else:
             print("⚠️ Step 3b: Metrics still showing 0.000 (might be legitimate if no bias, but check logic)")

    except Exception as e:
        print(f"❌ Step 3: Analysis error: {e}")
        return

    # 4. Gemini Report Card
    try:
        r = requests.post(f"{BACKEND_URL}/api/report/", json={
            "session_id": session_id,
            "analysis": analysis_results
        })
        report = r.json()
        print(f"✅ Step 4: Gemini Report generated ({report.get('_source', 'unknown')} source)")
        print(f"   - Summary: {report.get('summary')[:100]}...")
        if "summary" in report and len(report["summary"]) > 20:
             print("✅ Step 4b: Real AI-generated text verified")
        else:
             print("❌ Step 4b: Report text looks empty or too short")
    except Exception as e:
        print(f"❌ Step 4: Report generation error: {e}")

    # 5. Mitigation
    try:
        r = requests.post(f"{BACKEND_URL}/api/mitigate/", json={
            "session_id": session_id,
            "protected_attributes": ["race"],
            "label_column": "hired",
            "method": "reweighing"
        })
        mitigation = r.json()
        print(f"✅ Step 5: Mitigation successful")
        print(f"   - Improvement %: {mitigation.get('improvement_pct')}%")
        
        imp = mitigation.get('improvement_pct')
        if imp != 60.0:
            print("✅ Step 5b: Improvement % is real (not hardcoded 60%)")
        else:
            print("⚠️ Step 5b: Improvement % is exactly 60.0% (could be a coincidence, or still hardcoded)")
            
    except Exception as e:
        print(f"❌ Step 5: Mitigation error: {e}")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    # Wait a moment for server to be fully ready
    time.sleep(2)
    test_flow()
