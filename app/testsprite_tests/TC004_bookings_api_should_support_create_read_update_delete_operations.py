import requests
import uuid

BASE_URL = "http://localhost:3000"
ADMIN_ENDPOINT = f"{BASE_URL}/api/bookings"
AUTH_SIGNIN = f"{BASE_URL}/api/auth/signin"
AUTH_CREDENTIALS = {
    "authType": "basic",
    "credential": {"username": "admin@flixcam.rent", "password": "admin"},
}
TIMEOUT = 30


def test_TC004_bookings_crud_operations():
    session = requests.Session()
    # Authenticate and save session cookies
    signin_resp = session.post(
        AUTH_SIGNIN, json=AUTH_CREDENTIALS, timeout=TIMEOUT
    )
    assert signin_resp.status_code == 200, "Failed to signin"
    assert signin_resp.cookies, "No cookies returned after signin"

    # Helper function to create a booking resource
    def create_booking():
        booking_data = {
            "clientId": str(uuid.uuid4()),  # random UUID assuming clientId format
            "equipment": [],
            "studio": None,
            "package": None,
            "rentalStart": "2026-02-01T10:00:00Z",
            "rentalEnd": "2026-02-05T18:00:00Z",
            "deliveryOption": "pickup",
            "notes": "Test booking created by automated test",
        }
        resp = session.post(
            ADMIN_ENDPOINT, json=booking_data, timeout=TIMEOUT
        )
        assert resp.status_code == 201, f"Failed to create booking: {resp.text}"
        booking = resp.json()
        assert "id" in booking, "Created booking response missing id"
        return booking

    # Create booking for use in tests
    booking = None
    try:
        booking = create_booking()
        booking_id = booking["id"]

        # Read booking (GET /api/bookings/{id})
        get_resp = session.get(
            f"{ADMIN_ENDPOINT}/{booking_id}", timeout=TIMEOUT
        )
        assert get_resp.status_code == 200, f"Failed to get booking id {booking_id}"
        fetched = get_resp.json()
        assert fetched["id"] == booking_id, "Fetched booking id mismatch"
        # Basic sanity checks on returned data keys
        assert "clientId" in fetched and "rentalStart" in fetched

        # Update booking (PATCH /api/bookings/{id})
        update_data = {"notes": "Updated notes from test"}
        patch_resp = session.patch(
            f"{ADMIN_ENDPOINT}/{booking_id}", json=update_data, timeout=TIMEOUT
        )
        assert patch_resp.status_code == 200, f"Failed to update booking id {booking_id}"
        patched = patch_resp.json()
        assert patched.get("notes") == update_data["notes"], "Booking notes did not update"

        # Validate the updated booking via GET again
        get_resp_2 = session.get(
            f"{ADMIN_ENDPOINT}/{booking_id}", timeout=TIMEOUT
        )
        assert get_resp_2.status_code == 200, "Failed to get booking after update"
        assert get_resp_2.json().get("notes") == update_data["notes"], "Updated notes not persisted"

        # List bookings (GET /api/bookings)
        list_resp = session.get(ADMIN_ENDPOINT, timeout=TIMEOUT)
        assert list_resp.status_code == 200, "Booking list request failed"
        bookings_list = list_resp.json()
        assert isinstance(bookings_list, list), "Booking list response is not a list"
        assert any(b["id"] == booking_id for b in bookings_list), "Created booking not listed"

        # Delete booking (DELETE /api/bookings/{id})
        del_resp = session.delete(
            f"{ADMIN_ENDPOINT}/{booking_id}", timeout=TIMEOUT
        )
        assert del_resp.status_code in (200, 204), f"Failed to delete booking id {booking_id}"

        # Confirm deletion (GET should return 404 or similar)
        get_after_del = session.get(
            f"{ADMIN_ENDPOINT}/{booking_id}", timeout=TIMEOUT
        )
        assert get_after_del.status_code == 404, "Deleted booking still accessible"

    finally:
        # Cleanup if booking still exists (try to delete)
        if booking:
            session.delete(f"{ADMIN_ENDPOINT}/{booking['id']}", timeout=TIMEOUT)


test_TC004_bookings_crud_operations()
