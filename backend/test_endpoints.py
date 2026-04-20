import httpx
import asyncio
import os

BASE = "http://localhost:8080"

async def test_all():
    async with httpx.AsyncClient() as client:
        # Health
        r = await client.get(f"{BASE}/health")
        assert r.status_code == 200, f"Health failed: {r.text}"
        print("✅ /health")
        
        # Upload
        # Use the relative path to sample_loan.csv
        csv_path = "sample_loan.csv"
        if not os.path.exists(csv_path):
             # Try absolute path if relative fails in some environments
             csv_path = os.path.join(os.path.dirname(__file__), "sample_loan.csv")

        with open(csv_path, "rb") as f:
            r = await client.post(f"{BASE}/api/upload", files={"file": f})
        assert r.status_code == 200, f"Upload failed: {r.text}"
        dataset_id = r.json()["dataset_id"]
        print(f"✅ /upload → {dataset_id}")
        
        # Analyze
        r = await client.post(f"{BASE}/api/analyze", json={
            "dataset_id": dataset_id,
            "protected_attribute": "gender",
            "target_column": "loan_approved"
        })
        assert r.status_code == 200, f"Analyze failed: {r.text}"
        print(f"✅ /analyze → DI: {r.json()['metrics']['disparate_impact_ratio']}")
        
        # Mitigate
        r = await client.post(f"{BASE}/api/mitigate", json={
            "dataset_id": dataset_id,
            "method": "resampling"
        })
        assert r.status_code == 200, f"Mitigate failed: {r.text}"
        print(f"✅ /mitigate → Improvement: {r.json()['improvement_pct']}%")

if __name__ == "__main__":
    try:
        asyncio.run(test_all())
    except Exception as e:
        print(f"❌ Test failed: {e}")
