"""
simulator/simulator.py — Synthetic transaction generator & fraud scenario injector.

Normal traffic: random realistic transactions.
Fraud scenarios injected every N transactions:
  1. Teleport — same user, two cities 7000+ km apart within 30 min
  2. Velocity Burst — 8 transactions in 4 minutes for one user
  3. Whale Amount — amount = 150× user's average
"""
import asyncio
import logging
import random
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from faker import Faker

logger = logging.getLogger(__name__)

API_BASE = "http://localhost:8000"
INJECT_EVERY = 15   # inject a fraud scenario after every N normal txns

# Pairs of cities (name, lat, lon) for teleport scenarios
TELEPORT_PAIRS = [
    (("Chennai", 13.08, 80.27), ("London", 51.51, -0.12)),
    (("Mumbai", 19.07, 72.87), ("New York", 40.71, -74.00)),
    (("Tokyo", 35.68, 139.69), ("Los Angeles", 34.05, -118.25)),
    (("Sydney", -33.87, 151.21), ("Paris", 48.85, 2.35)),
    (("Dubai", 25.20, 55.27), ("Toronto", 43.65, -79.38)),
]

CITY_POOL = [
    ("New York", 40.71, -74.00), ("Chicago", 41.88, -87.63),
    ("San Francisco", 37.77, -122.42), ("Houston", 29.76, -95.37),
    ("Miami", 25.77, -80.19), ("Seattle", 47.61, -122.33),
    ("Boston", 42.36, -71.06), ("Denver", 39.74, -104.98),
    ("Atlanta", 33.75, -84.39), ("Dallas", 32.78, -96.80),
]

fake = Faker()


def _rand_city():
    return random.choice(CITY_POOL)


def _rand_device():
    return f"dev-{random.randint(100, 999)}"


def _rand_user():
    return f"user-{random.randint(1, 30)}"


def _rand_token():
    return f"pmt-{random.choice(['visa', 'mc', 'amex'])}-{random.randint(1000, 9999)}"


class Simulator:
    def __init__(self):
        self.running = False
        self._count = 0

    def stop(self):
        self.running = False
        logger.info("Simulator stop requested.")

    async def run(self):
        self.running = True
        logger.info("Simulator started.")
        async with httpx.AsyncClient(base_url=API_BASE, timeout=10) as client:
            while self.running:
                try:
                    await self._send_normal(client)
                    self._count += 1

                    # Inject fraud scenario
                    if self._count % INJECT_EVERY == 0:
                        scenario = random.choice(["teleport", "velocity", "whale"])
                        logger.info("Injecting fraud scenario: %s", scenario)
                        if scenario == "teleport":
                            await self._inject_teleport(client)
                        elif scenario == "velocity":
                            await self._inject_velocity_burst(client)
                        else:
                            await self._inject_whale(client)

                    await asyncio.sleep(random.uniform(0.3, 1.2))
                except Exception as exc:
                    logger.warning("Simulator error: %s", exc)
                    await asyncio.sleep(2)

        logger.info("Simulator stopped after %d transactions.", self._count)

    async def _post(self, client: httpx.AsyncClient, payload: dict):
        resp = await client.post("/transactions", json=payload)
        resp.raise_for_status()
        return resp.json()

    async def _send_normal(self, client: httpx.AsyncClient):
        city_name, lat, lon = _rand_city()
        ts = datetime.now(timezone.utc)
        payload = {
            "user_id": _rand_user(),
            "amount": round(random.uniform(10, 800), 2),
            "currency": "USD",
            "merchant": fake.company(),
            "device_id": _rand_device(),
            "payment_token": _rand_token(),
            "shipping_address": fake.address().replace("\n", ", "),
            "city": city_name,
            "latitude": lat,
            "longitude": lon,
            "timestamp": ts.isoformat(),
        }
        result = await self._post(client, payload)
        logger.debug("Normal txn: score=%s risk=%s", result.get("total_score"), result.get("risk_level"))

    async def _inject_teleport(self, client: httpx.AsyncClient):
        """Same user, two locations 7000+ km apart within 30 min."""
        user_id = f"user-teleport-{random.randint(1, 5)}"
        (city1, lat1, lon1), (city2, lat2, lon2) = random.choice(TELEPORT_PAIRS)
        t1 = datetime.now(timezone.utc) - timedelta(minutes=31)
        t2 = datetime.now(timezone.utc)
        device = _rand_device()
        token = _rand_token()

        # First txn
        await self._post(client, {
            "user_id": user_id, "amount": round(random.uniform(50, 500), 2),
            "currency": "USD", "merchant": "TravelShop", "device_id": device,
            "payment_token": token, "city": city1, "latitude": lat1, "longitude": lon1,
            "timestamp": t1.isoformat(),
        })
        await asyncio.sleep(0.2)
        # Second txn — impossible travel
        result = await self._post(client, {
            "user_id": user_id, "amount": round(random.uniform(500, 5000), 2),
            "currency": "USD", "merchant": "ForeignStore", "device_id": device,
            "payment_token": token, "city": city2, "latitude": lat2, "longitude": lon2,
            "timestamp": t2.isoformat(),
        })
        logger.info("Teleport injected: %s→%s score=%s", city1, city2, result.get("total_score"))

    async def _inject_velocity_burst(self, client: httpx.AsyncClient):
        """8 transactions in 4 minutes for one user."""
        user_id = f"user-burst-{random.randint(1, 3)}"
        city_name, lat, lon = _rand_city()
        base_time = datetime.now(timezone.utc) - timedelta(minutes=4)

        for i in range(8):
            ts = base_time + timedelta(seconds=i * 30)
            await self._post(client, {
                "user_id": user_id, "amount": round(random.uniform(10, 200), 2),
                "currency": "USD", "merchant": fake.company(), "device_id": _rand_device(),
                "payment_token": _rand_token(), "city": city_name,
                "latitude": lat, "longitude": lon, "timestamp": ts.isoformat(),
            })
            await asyncio.sleep(0.05)
        logger.info("Velocity burst injected for %s", user_id)

    async def _inject_whale(self, client: httpx.AsyncClient):
        """Transaction 150× user's historic average."""
        user_id = f"user-{random.randint(1, 30)}"
        city_name, lat, lon = _rand_city()
        whale_amount = round(random.uniform(50000, 250000), 2)
        result = await self._post(client, {
            "user_id": user_id, "amount": whale_amount,
            "currency": "USD", "merchant": "LuxuryGoods", "device_id": _rand_device(),
            "payment_token": _rand_token(), "city": city_name,
            "latitude": lat, "longitude": lon,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Whale txn injected: $%s score=%s", whale_amount, result.get("total_score"))
