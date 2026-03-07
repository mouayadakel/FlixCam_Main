import requests

BASE_URL = "http://localhost:3000"
AUTH_SIGNIN_URL = f"{BASE_URL}/api/auth/signin"
INVOICES_URL = f"{BASE_URL}/api/invoices"
INVOICE_GENERATE_URL_TEMPLATE = f"{BASE_URL}/api/invoices/generate/{{bookingId}}"
BOOKINGS_URL = f"{BASE_URL}/api/bookings"
CLIENTS_URL = f"{BASE_URL}/api/clients"

ADMIN_CREDENTIALS = {
    "email": "admin@flixcam.rent",
    "password": "admin"
}

def test_invoices_api_should_generate_and_manage_invoices():
    session = requests.Session()
    timeout = 30

    # Step 1: Authenticate and get session cookies for protected endpoints
    signin_payload = {
        "email": ADMIN_CREDENTIALS["email"],
        "password": ADMIN_CREDENTIALS["password"]
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    signin_resp = session.post(AUTH_SIGNIN_URL, data=signin_payload, headers=headers, timeout=timeout)
    assert signin_resp.status_code == 200, f"Signin failed with status {signin_resp.status_code}"
    assert session.cookies, "Session cookies not set after signin"

    # Step 2: We need a booking to generate an invoice for.
    # Since no booking ID is provided, create a minimal booking resource to use.
    # Create booking
    booking_payload = {
        "clientId": None,
        "items": [],
        "startDate": "2026-02-01T10:00:00Z",
        "endDate": "2026-02-02T10:00:00Z"
    }
    # Try to get clientId for booking, create a dummy client if needed
    client_id = None
    try:
        # Try to get existing clients
        clients_resp = session.get(CLIENTS_URL, timeout=timeout)
        assert clients_resp.status_code == 200, "Failed to fetch clients"
        clients_data = clients_resp.json()
        if isinstance(clients_data, list) and len(clients_data) > 0:
            client_id = clients_data[0].get('id')
        else:
            # Create a client as fallback
            new_client_payload = {
                "name": "Invoice Test Client",
                "email": "invoice-test-client@example.com"
            }
            client_create_resp = session.post(CLIENTS_URL, json=new_client_payload, timeout=timeout)
            assert client_create_resp.status_code == 201, "Failed to create client for booking"
            client_id = client_create_resp.json().get('id')

        booking_payload["clientId"] = client_id

        booking_create_resp = session.post(BOOKINGS_URL, json=booking_payload, timeout=timeout)
        assert booking_create_resp.status_code == 201, f"Booking creation failed: {booking_create_resp.text}"
        booking = booking_create_resp.json()
        booking_id = booking.get("id")
        assert booking_id, "Booking ID missing from creation response"

        # Step 3: Generate invoice for the booking
        generate_url = INVOICE_GENERATE_URL_TEMPLATE.format(bookingId=booking_id)
        generate_resp = session.post(generate_url, timeout=timeout)
        assert generate_resp.status_code == 201, f"Invoice generation failed: {generate_resp.text}"
        invoice = generate_resp.json()
        invoice_id = invoice.get("id")
        assert invoice_id, "Invoice ID missing from generation response"

        # Step 4: Retrieve the invoice by ID
        get_invoice_resp = session.get(f"{INVOICES_URL}/{invoice_id}", timeout=timeout)
        assert get_invoice_resp.status_code == 200, "Failed to retrieve invoice"
        retrieved_invoice = get_invoice_resp.json()
        assert retrieved_invoice.get("id") == invoice_id, "Retrieved invoice ID mismatch"

        # Step 5: Update the invoice - patch some fields (e.g. add a note)
        patch_payload = {
            "note": "Updated via test case TC008"
        }
        patch_resp = session.patch(f"{INVOICES_URL}/{invoice_id}", json=patch_payload, timeout=timeout)
        assert patch_resp.status_code == 200, f"Invoice update failed: {patch_resp.text}"
        updated_invoice = patch_resp.json()
        assert updated_invoice.get("note") == patch_payload["note"], "Invoice note not updated"

        # Step 6: Attempt invalid update to confirm validation (e.g., negative amount)
        invalid_patch_payload = {
            "amount": -500
        }
        invalid_patch_resp = session.patch(f"{INVOICES_URL}/{invoice_id}", json=invalid_patch_payload, timeout=timeout)
        assert invalid_patch_resp.status_code >= 400, "Invalid invoice update should fail"

        # Step 7: Delete the invoice
        delete_resp = session.delete(f"{INVOICES_URL}/{invoice_id}", timeout=timeout)
        assert delete_resp.status_code == 204, f"Invoice deletion failed: {delete_resp.text}"

        # Step 8: Confirm invoice deletion by trying to GET it again (expect 404)
        get_deleted_resp = session.get(f"{INVOICES_URL}/{invoice_id}", timeout=timeout)
        assert get_deleted_resp.status_code == 404, "Deleted invoice should not be found"

    finally:
        # Cleanup: delete the booking and client if created
        if 'booking_id' in locals():
            session.delete(f"{BOOKINGS_URL}/{booking_id}", timeout=timeout)
        if client_id:
            session.delete(f"{CLIENTS_URL}/{client_id}", timeout=timeout)

test_invoices_api_should_generate_and_manage_invoices()
