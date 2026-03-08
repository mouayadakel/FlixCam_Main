import requests
from requests.exceptions import RequestException

BASE_URL = "http://localhost:3000"

import os

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@flixcam.rent")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "admin")

def test_bookings_transition_api_should_handle_valid_state_transitions():
    session = requests.Session()
    try:
        # Authenticate first to get session cookies
        auth_resp = session.post(
            f"{BASE_URL}/api/auth/signin",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30,
        )
        assert auth_resp.status_code == 200, f"Signin failed: {auth_resp.text}"
        # At this point cookies are stored in the session automatically

        # Step 1: Create a new booking resource to test transitions on
        # Minimal valid booking payload based on typical booking creation flow:
        booking_create_payload = {
            # Assuming minimal required fields: clientId, rentalItems, rentalPeriod, price etc.
            # As no exact schema given, dummy plausible data:
            "clientId": None,
            "rentalItems": [],
            "startDate": "2026-02-01T10:00:00Z",
            "endDate": "2026-02-05T10:00:00Z",
            "notes": "Test booking for state transition",
            # We need a valid clientId: fetch clients list and pick one
        }

        # Fetch clients list to get a valid clientId
        clients_resp = session.get(f"{BASE_URL}/api/clients", timeout=30)
        assert clients_resp.status_code == 200, f"Failed to get clients: {clients_resp.text}"
        clients = clients_resp.json()
        assert isinstance(clients, list) and len(clients) > 0, "No clients found to assign booking"
        booking_create_payload["clientId"] = clients[0].get("id")
        assert booking_create_payload["clientId"], "Client ID missing in clients list"

        # Create booking POST /api/bookings
        booking_resp = session.post(
            f"{BASE_URL}/api/bookings",
            json=booking_create_payload,
            timeout=30,
        )
        assert booking_resp.status_code == 201, f"Booking creation failed: {booking_resp.text}"
        booking = booking_resp.json()
        booking_id = booking.get("id")
        assert booking_id, "Booking ID not returned after creation"

        # Define a list of valid transitions to test sequentially:
        # We do not have exact states or transitions from PRD,
        # but test framework for enforcing valid transitions:
        # Example transitions: draft -> risk_check; risk_check -> payment_pending; payment_pending -> confirmed
        valid_transitions = [
            {"toState": "risk_check"},
            {"toState": "payment_pending"},
            {"toState": "confirmed"},
            {"toState": "active"},
            {"toState": "returned"},
            {"toState": "closed"},
        ]

        # We'll test each transition ensuring it succeeds or fails appropriately
        current_state = "draft"  # initial assumed state on create
        for trans in valid_transitions:
            transition_payload = trans

            try:
                trans_resp = session.post(
                    f"{BASE_URL}/api/bookings/{booking_id}/transition",
                    json=transition_payload,
                    timeout=30,
                )
            except RequestException as e:
                assert False, f"Request to transition endpoint failed: {e}"

            # Validate response: expecting 200 OK with state changed accordingly
            if trans_resp.status_code == 200:
                trans_data = trans_resp.json()
                new_state = trans_data.get("state")
                # The new state should match toState requested
                assert new_state == trans["toState"], (
                    f"Transition to {trans['toState']} returned state {new_state}"
                )
                current_state = new_state
            else:
                # If transition is invalid, API should reject it, for these tests we want valid transitions to succeed
                assert False, (
                    f"Transition to {trans['toState']} failed with status {trans_resp.status_code}: {trans_resp.text}"
                )
    finally:
        # Cleanup: delete the created booking
        if 'booking_id' in locals() and booking_id:
            try:
                del_resp = session.delete(
                    f"{BASE_URL}/api/bookings/{booking_id}",
                    timeout=30
                )
                # Accept 200 or 204 for successful deletion
                assert del_resp.status_code in (200, 204), (
                    f"Booking delete failed with status {del_resp.status_code}: {del_resp.text}"
                )
            except Exception:
                pass


test_bookings_transition_api_should_handle_valid_state_transitions()