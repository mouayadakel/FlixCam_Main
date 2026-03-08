import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}

def test_invoices_generate_and_manage_endpoint():
    booking_id = None
    invoice_id = None

    # Step 1: Create a client (required for creating booking)
    client_payload = {
        "name": "Test Client",
        "email": "test.client@example.com"
    }
    client_id = None
    try:
        resp_client = requests.post(
            f"{BASE_URL}/api/clients",
            json=client_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp_client.raise_for_status()
        client_data = resp_client.json()
        client_id = client_data.get("id")
        assert client_id is not None, "Client creation failed: No ID returned"

        # Step 2: Create a booking (required for invoice generation)
        booking_payload = {
            "customerId": client_id,
            "startDate": "2026-01-25T10:00:00Z",
            "endDate": "2026-01-26T10:00:00Z",
            "equipmentIds": [],
            "studioId": None,
            "notes": "Test booking for invoice generation"
        }
        resp_booking = requests.post(
            f"{BASE_URL}/api/bookings",
            json=booking_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp_booking.raise_for_status()
        booking_data = resp_booking.json()
        booking_id = booking_data.get("id")
        assert booking_id is not None, "Booking creation failed: No ID returned"

        # Step 3: Generate invoice for the booking via POST /api/invoices/generate/{bookingId}
        resp_generate_invoice = requests.post(
            f"{BASE_URL}/api/invoices/generate/{booking_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp_generate_invoice.raise_for_status()
        invoice_gen_data = resp_generate_invoice.json()
        invoice_id = invoice_gen_data.get("id")
        assert invoice_id is not None, "Invoice generation failed: No ID returned"
        assert invoice_gen_data.get("bookingId") == booking_id, "Invoice bookingId mismatch"

        # Step 4: Retrieve the generated invoice via GET /api/invoices/{id}
        resp_get_invoice = requests.get(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp_get_invoice.raise_for_status()
        invoice_data = resp_get_invoice.json()
        assert invoice_data.get("id") == invoice_id, "Fetched invoice ID mismatch"

        # Step 5: Update the invoice via PATCH /api/invoices/{id}
        patch_payload = {
            "notes": "Updated invoice notes for testing"
        }
        resp_patch_invoice = requests.patch(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            json=patch_payload,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp_patch_invoice.raise_for_status()
        patched_data = resp_patch_invoice.json()
        assert patched_data.get("notes") == patch_payload["notes"], "Invoice update failed"

        # Step 6: Delete the invoice via DELETE /api/invoices/{id}
        resp_delete_invoice = requests.delete(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert resp_delete_invoice.status_code == 204, "Invoice deletion failed"
        invoice_id = None  # Mark as deleted

    finally:
        # Cleanup: delete booking if created
        if booking_id:
            try:
                resp_delete_booking = requests.delete(
                    f"{BASE_URL}/api/bookings/{booking_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT,
                )
                assert resp_delete_booking.status_code == 204, "Booking deletion failed"
            except Exception:
                pass

        # Cleanup: delete invoice if still exists (if delete step skipped or failed)
        if invoice_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/invoices/{invoice_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

        # Cleanup: delete client if created
        if client_id:
            try:
                resp_delete_client = requests.delete(
                    f"{BASE_URL}/api/clients/{client_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT,
                )
                assert resp_delete_client.status_code == 204, "Client deletion failed"
            except Exception:
                pass

test_invoices_generate_and_manage_endpoint()