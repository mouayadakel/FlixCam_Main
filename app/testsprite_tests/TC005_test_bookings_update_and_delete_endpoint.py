import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30


def test_bookings_update_and_delete_endpoint():
    # Step 1: Create a new booking to use for update and delete tests
    booking_payload = {
        "customerId": "test-customer-id-001",
        "startDate": "2026-02-01T10:00:00Z",
        "endDate": "2026-02-05T10:00:00Z",
        "equipmentIds": ["equipment-id-001"],
        "studioId": "studio-id-001",
        "notes": "Initial test booking"
    }

    try:
        create_response = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_payload,
            timeout=TIMEOUT,
        )
        assert create_response.status_code == 201, f"Booking creation failed: {create_response.text}"
        created_booking = create_response.json()
        booking_id = created_booking.get("id")
        assert booking_id, "Created booking has no id"

        # Step 2: Update booking via PATCH /api/bookings/{id}
        update_payload = {
            "notes": "Updated test booking notes",
            "endDate": "2026-02-06T10:00:00Z"
        }
        update_response = requests.patch(
            f"{BASE_URL}/api/bookings/{booking_id}",
            json=update_payload,
            timeout=TIMEOUT,
        )
        assert update_response.status_code == 200, f"Booking update failed: {update_response.text}"
        updated_booking = update_response.json()
        assert updated_booking.get("notes") == update_payload["notes"], "Booking notes not updated"
        assert updated_booking.get("endDate") == update_payload["endDate"], "Booking endDate not updated"

        # Step 3: Delete booking via DELETE /api/bookings/{id}
        delete_response = requests.delete(
            f"{BASE_URL}/api/bookings/{booking_id}",
            timeout=TIMEOUT,
        )
        assert delete_response.status_code == 204, f"Booking deletion failed: {delete_response.text}"

        # Step 4: Verify booking is deleted by attempting to GET it
        get_response = requests.get(
            f"{BASE_URL}/api/bookings/{booking_id}",
            timeout=TIMEOUT,
        )
        assert get_response.status_code == 404 or get_response.status_code == 410, \
            f"Deleted booking still accessible: Status {get_response.status_code}"

    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"


test_bookings_update_and_delete_endpoint()