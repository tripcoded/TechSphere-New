from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    with TestClient(app) as client:
        health = client.get("/health")
        print(f"/health status_code={health.status_code}")
        print(f"/health json={health.json()}")

        events = client.get("/events")
        print(f"/events status_code={events.status_code}")
        print(f"/events json={events.json()}")

        send_otp = client.post("/auth/send-otp", json={"email": "check@example.com"})
        print(f"/auth/send-otp status_code={send_otp.status_code}")
        print(f"/auth/send-otp json={send_otp.json()}")


if __name__ == "__main__":
    main()
