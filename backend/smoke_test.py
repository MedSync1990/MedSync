import asyncio
import httpx
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "http://127.0.0.1:8000"
# Using the stub Admin token we configured in dependencies.py
HEADERS = {"Authorization": "Bearer Administrator"}

async def run_smoke_tests():
    logger.info("Starting Smoke Tests (Read-Only)...")
    
    async with httpx.AsyncClient(base_url=BASE_URL, headers=HEADERS) as client:
        # 1. Test Swagger Docs (Ensures server is running and routers are mounted)
        logger.info("Testing /docs...")
        response = await client.get("/docs")
        if response.status_code == 200:
            logger.info("✓ /docs is available")
        else:
            logger.error(f"✗ /docs failed with status {response.status_code}")
            return # Stop if server is down

        # 2. Test the Reports Endpoints (Read-Only)
        endpoints = [
            "/api/v1/reports/appointments-summary",
            "/api/v1/reports/doctor-revenue",
            "/api/v1/reports/doctor-revenue/1/payments", # Assuming doctor_id 1
            "/api/v1/reports/outstanding-balances",
            "/api/v1/reports/treatment-categories",
            "/api/v1/reports/insurance-vs-out-of-pocket"
        ]

        logger.info("\nTesting Reports Endpoints (These are read-only SELECT queries and cause zero harm):")
        for ep in endpoints:
            response = await client.get(ep)
            if response.status_code == 200:
                data = response.json()
                total = data.get("total", 0)
                logger.info(f"✓ {ep} -> Success! (Returned {total} records)")
            else:
                logger.error(f"✗ {ep} -> Failed! Status {response.status_code} | Details: {response.text}")

        # 3. Test a 404 for a missing route
        logger.info("\nTesting Error Handler for Missing Route...")
        response = await client.get("/api/v1/auth/non-existent-route")
        if response.status_code == 404:
            logger.info(f"✓ 404 handler works. Response: {response.json()}")
        else:
            logger.warning(f"⚠ Expected 404, got {response.status_code}")

if __name__ == "__main__":
    asyncio.run(run_smoke_tests())
