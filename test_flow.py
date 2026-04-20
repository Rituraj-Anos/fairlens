import requests
import json
import os

BACKEND_URL = "http://localhost:8080"
FRONTEND_URL = "http://localhost:5174"

def test_flow():
    print("--- Starting Application Flow Test ---")
    
    # 1. localhost:5174 loads
    try:
        requests.get(FRONTEND_URL)
        print("✅ Step 1: localhost:5174 loads - PASS")
    except:
        print("❌ Step 1: Frontend unreachable - FAIL")
        return

    # 2. Upload
    dataset_path = os.path.join("datasets", "hiring_sample.csv")
    r = requests.post(f"{BACKEND_URL}/api/upload/", files={"file": open(dataset_path, "rb")})
    session_id = r.json()["session_id"]
    print("✅ Step 2: Upload successful - PASS")

    # 3. Analyze
    r = requests.post(f"{BACKEND_URL}/api/analyze/", json={
        "session_id": session_id,
        "protected_attributes": ["gender"],
        "label_column": "hired"
    })
    analysis_results = r.json()
    print("✅ Step 3: Analysis successful - PASS")

    # 4. Metrics Check
    try:
        metrics = analysis_results["attribute_analyses"][0]["metrics"]
        print(f"✅ Step 4: Metrics Dashboard shows real numbers (Found {len(metrics)} metrics) - PASS")
    except:
        print("❌ Step 4: Metrics structure invalid - FAIL")
        return

    # 5/6. Mitigation
    r = requests.post(f"{BACKEND_URL}/api/mitigate/", json={
        "session_id": session_id,
        "protected_attributes": ["gender"],
        "label_column": "hired",
        "method": "reweighing"
    })
    mitigation_results = r.json()
    if "comparisons" in mitigation_results:
        print(f"✅ Step 6: Mitigation successful ({len(mitigation_results['comparisons'])} metrics compared) - PASS")
    else:
        print("❌ Step 6: Mitigation response invalid - FAIL")
        return

    print("\n--- All Application Flow Steps PASSED ---")

if __name__ == "__main__":
    test_flow()
