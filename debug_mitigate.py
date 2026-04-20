import requests
import json
import os

BACKEND_URL = "http://localhost:8080"

def test_flow():
    # 2. Upload
    dataset_path = os.path.join("datasets", "hiring_sample.csv")
    r = requests.post(f"{BACKEND_URL}/api/upload/", files={"file": open(dataset_path, "rb")})
    session_id = r.json()["session_id"]

    # 5/6. Mitigation
    r = requests.post(f"{BACKEND_URL}/api/mitigate/", json={
        "session_id": session_id,
        "protected_attributes": ["gender"],
        "label_column": "hired",
        "method": "reweighing"
    })
    print(f"DEBUG: Mitigate Response: {json.dumps(r.json(), indent=2)}")

if __name__ == "__main__":
    test_flow()
