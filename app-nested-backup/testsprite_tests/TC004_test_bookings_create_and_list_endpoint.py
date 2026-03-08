import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30
SESSION = requests.Session()

# Helper to sign in and get auth cookie/session
# Adjust credentials as needed
import os

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@flixcam.rent")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "admin")

def signin():
    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    resp = SESSION.post(f"{BASE_URL}/api/auth/signin", json=payload, headers=HEADERS, timeout=TIMEOUT)
    assert resp.status_code == 200 or resp.status_code == 201, f"Failed to sign in: {resp.status_code} {resp.text}"


def test_bookings_create_and_list_endpoint():
    booking_id = None
    try:
        # Authenticate first
        signin()

        # Fetch clients list to get a valid customerId
        clients_resp = SESSION.get(f"{BASE_URL}/api/clients", timeout=TIMEOUT)
        assert clients_resp.status_code == 200, f"Failed to get clients: {clients_resp.text}"
        clients = clients_resp.json()
        assert isinstance(clients, list) and len(clients) > 0, "No clients found to create booking"
        customer_id = clients[0].get("id")
        assert customer_id, "Client object missing 'id'"

        # Fetch equipment list to get equipmentIds
        equipment_resp = SESSION.get(f"{BASE_URL}/api/equipment", timeout=TIMEOUT)
        assert equipment_resp.status_code == 200, f"Failed to get equipment: {equipment_resp.text}"
        equipment_list = equipment_resp.json()
        equipment_ids = [equipment_list[0]["id"]] if equipment_list and isinstance(equipment_list, list) else []

        # Prepare booking dates - startDate for tomorrow, endDate day after tomorrow in ISO format
        start_date = (datetime.utcnow() + timedelta(days=1)).replace(microsecond=0).isoformat() + "Z"
        end_date = (datetime.utcnow() + timedelta(days=2)).replace(microsecond=0).isoformat() + "Z"

        booking_payload = {
            "customerId": customer_id,
            "startDate": start_date,
            "endDate": end_date,
            "equipmentIds": equipment_ids,
            "notes": "Test booking created by automated test"
        }

        create_resp = SESSION.post(f"{BASE_URL}/api/bookings", json=booking_payload, headers=HEADERS, timeout=TIMEOUT)
        assert create_resp.status_code == 201 or create_resp.status_code == 200, f"Failed to create booking: {create_resp.status_code} {create_resp.text}"
        created_booking = create_resp.json()
        booking_id = created_booking.get("id")
        assert booking_id, "Created booking response missing 'id'"

        # List bookings with filters
        params = {
            "customerId": customer_id,
            "startDate": start_date[:10],
            "endDate": end_date[:10],
            "limit": 10,
            "offset": 0
        }

        list_resp = SESSION.get(f"{BASE_URL}/api/bookings", headers=HEADERS, params=params, timeout=TIMEOUT)
        assert list_resp.status_code == 200, f"Failed to list bookings: {list_resp.status_code} {list_resp.text}"

        bookings_list = list_resp.json()
        assert isinstance(bookings_list, list), "Bookings list response is not a list"
        found = any(b.get("id") == booking_id for b in bookings_list)
        assert found, "Created booking not found in bookings list with filters"

    finally:
        if booking_id:
            del_resp = SESSION.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=HEADERS, timeout=TIMEOUT)
            assert del_resp.status_code in (200, 204), f"Failed to delete booking cleanup: {del_resp.status_code} {del_resp.text}"


test_bookings_create_and_list_endpoint()