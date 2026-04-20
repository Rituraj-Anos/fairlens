import requests
import json
import os

BACKEND_URL = "http://localhost:8080"

def test_flow():
    # 2. Upload
    dataset_path = os.path.join("datasets", "hiring_sample.csv")
    with open(dataset_path, "rb") as f:
        r = requests.post(f"{BACKEND_URL}/api/upload/", files={"file": f})
    session_id = r.json()["session_id"]

    # 3. Analyze
    r = requests.post(f"{BACKEND_URL}/api/analyze/", json={
        "session_id": session_id,
        "protected_attributes": ["gender"],
        "label_column": "hired"
    })
    print(f"DEBUG: Analyze Response: {json.dumps(r.json(), indent=2)}")

if __name__ == "__main__":
    test_flow()
