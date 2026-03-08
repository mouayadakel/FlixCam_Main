import requests
import datetime
import uuid

BASE_URL = "http://localhost:3000"
HEADERS = {
    "Content-Type": "application/json"
}
TIMEOUT = 30

def test_bookings_status_transition_endpoint():
    booking_id = None
    client_id = None
    equipment_id = None
    
    try:
        # 1. Create a client (required for creating booking)
        client_payload = {
            "name": f"Test Client {uuid.uuid4()}",
            "email": f"testclient_{uuid.uuid4().hex[:8]}@example.com",
            "phone": "+966500000000"
        }
        client_resp = requests.post(
            f"{BASE_URL}/api/clients",
            headers=HEADERS,
            json=client_payload,
            timeout=TIMEOUT
        )
        assert client_resp.status_code == 201, f"Client creation failed: {client_resp.text}"
        client_data = client_resp.json()
        client_id = client_data.get("id")
        assert client_id, "No client ID returned"

        # 2. Get available equipment for booking (fetch first available active equipment)
        equipment_resp = requests.get(
            f"{BASE_URL}/api/equipment",
            headers=HEADERS,
            params={"isActive": True, "take": 1},
            timeout=TIMEOUT
        )
        assert equipment_resp.status_code == 200, f"Failed to get equipment list: {equipment_resp.text}"
        equipment_list = equipment_resp.json()
        assert isinstance(equipment_list, list) and len(equipment_list) > 0, "No active equipment available"
        equipment_id = equipment_list[0].get("id")
        assert equipment_id, "No equipment ID found"

        # 3. Create a booking with valid data
        start_date = (datetime.datetime.utcnow() + datetime.timedelta(days=1)).isoformat() + "Z"
        end_date = (datetime.datetime.utcnow() + datetime.timedelta(days=2)).isoformat() + "Z"
        booking_payload = {
            "customerId": client_id,
            "startDate": start_date,
            "endDate": end_date,
            "equipmentIds": [equipment_id]
        }

        booking_resp = requests.post(
            f"{BASE_URL}/api/bookings",
            headers=HEADERS,
            json=booking_payload,
            timeout=TIMEOUT
        )
        assert booking_resp.status_code == 201, f"Booking creation failed: {booking_resp.text}"
        booking_data = booking_resp.json()
        booking_id = booking_data.get("id")
        assert booking_id, "No booking ID returned"

        # 4. Valid transition: Assume 'draft' to 'risk_check' is valid
        valid_transition_payload = {"to": "risk_check"}
        transition_resp = requests.post(
            f"{BASE_URL}/api/bookings/{booking_id}/transition",
            headers=HEADERS,
            json=valid_transition_payload,
            timeout=TIMEOUT
        )
        assert transition_resp.status_code == 200, f"Valid transition failed: {transition_resp.text}"
        transition_data = transition_resp.json()
        assert "status" in transition_data, "No status field in response"
        assert transition_data["status"] == "risk_check", "Booking status did not transition to risk_check"

        # 5. Invalid transition: Transition from 'risk_check' directly to 'closed' (assuming this is invalid)
        invalid_transition_payload = {"to": "closed"}
        invalid_resp = requests.post(
            f"{BASE_URL}/api/bookings/{booking_id}/transition",
            headers=HEADERS,
            json=invalid_transition_payload,
            timeout=TIMEOUT
        )
        # Expecting client error 4xx (e.g., 400 or 422)
        assert invalid_resp.status_code >= 400 and invalid_resp.status_code < 500, (
            f"Invalid transition did not fail as expected: {invalid_resp.text}"
        )

    finally:
        # Cleanup - delete booking if created
        if booking_id:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/bookings/{booking_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
                assert del_resp.status_code == 204, f"Failed to delete booking: {del_resp.text}"
            except Exception:
                pass

        # Cleanup - delete client if created
        if client_id:
            try:
                del_client_resp = requests.delete(
                    f"{BASE_URL}/api/clients/{client_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
                assert del_client_resp.status_code == 204, f"Failed to delete client: {del_client_resp.text}"
            except Exception:
                pass

test_bookings_status_transition_endpoint()
