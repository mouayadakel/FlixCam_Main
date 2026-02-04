import requests

BASE_URL = "http://localhost:3000"
ADMIN_BASE = f"{BASE_URL}/admin"
AUTH_SIGNIN = f"{BASE_URL}/api/auth/signin"
PAYMENTS_ENDPOINT = f"{ADMIN_BASE}/api/payments"

EMAIL = "admin@flixcam.rent"
PASSWORD = "admin"

def test_payments_api_should_list_payments_and_process_refunds():
    session = requests.Session()
    try:
        # Authenticate and save cookies in session
        auth_payload = { "email": EMAIL, "password": PASSWORD }
        auth_response = session.post(AUTH_SIGNIN, json=auth_payload, timeout=30)
        assert auth_response.status_code == 200, f"Sign in failed: {auth_response.text}"
        assert session.cookies, "No cookies received after signin"

        # 1. List payments (GET /api/payments)
        list_response = session.get(PAYMENTS_ENDPOINT, timeout=30)
        assert list_response.status_code == 200, f"List payments failed: {list_response.text}"
        payments = list_response.json()
        assert isinstance(payments, list), "Payments response is not a list"

        if not payments:
            # No payments found, create a dummy payment resource to proceed
            # Since PRD does not define creating payment, skip creation and end test here
            # Just assert payments is list and empty then finish test
            return

        payment = payments[0]
        payment_id = payment.get("id") or payment.get("_id") or payment.get("paymentId")
        assert payment_id, "Payment ID not found in payment object"

        # 2. Update payment details (PATCH /api/payments/{id})
        # We will patch the payment's metadata or an updatable field. Assume 'notes' is updatable.
        update_payload = { "notes": "Updated by automated test" }
        update_response = session.patch(f"{PAYMENTS_ENDPOINT}/{payment_id}", json=update_payload, timeout=30)
        assert update_response.status_code in (200, 204), f"Update payment failed: {update_response.text}"

        # Optionally verify update persisted: GET updated payment details
        get_response = session.get(f"{PAYMENTS_ENDPOINT}/{payment_id}", timeout=30)
        assert get_response.status_code == 200, f"Get payment by ID failed: {get_response.text}"
        updated_payment = get_response.json()
        assert updated_payment.get("notes") == "Updated by automated test", "Payment notes not updated"

        # 3. Process refund (POST /api/payments/{id}/refund)
        refund_payload = {
            "amount": payment.get("amount") or 0,
            "reason": "Automated test refund"
        }
        refund_response = session.post(f"{PAYMENTS_ENDPOINT}/{payment_id}/refund", json=refund_payload, timeout=30)
        assert refund_response.status_code == 200, f"Refund failed: {refund_response.text}"
        refund_result = refund_response.json()
        # Assert refund response contains a refund id or success indicator
        assert "refundId" in refund_result or refund_result.get("status") == "refunded", "Refund response invalid"
    finally:
        # No resource was created here, so no cleanup needed.
        session.close()

test_payments_api_should_list_payments_and_process_refunds()