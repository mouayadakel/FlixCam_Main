import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH = HTTPBasicAuth("admin@flixcam.rent", "admin")
TIMEOUT = 30
HEADERS = {"Accept": "application/json"}


def test_payments_list_and_refund_endpoint():
    # Step 1: List payments with filters
    params = {
        "status": "completed",
        "page": 1,
        "pageSize": 5
    }
    try:
        list_response = requests.get(
            f"{BASE_URL}/api/payments",
            auth=AUTH,
            headers=HEADERS,
            params=params,
            timeout=TIMEOUT
        )
        list_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Failed to list payments: {e}"

    # Check content-type and non-empty body before parsing JSON
    content_type = list_response.headers.get("Content-Type", "")
    assert "application/json" in content_type, "Payments list response is not JSON"
    assert list_response.text.strip(), "Payments list response is empty"

    payments_data = list_response.json()
    assert isinstance(payments_data, dict), "Payments list response is not a dict"

    # Extract list of payments from known keys
    payments = None
    for key in ["data", "payments", "items"]:
        if key in payments_data and isinstance(payments_data[key], list):
            payments = payments_data[key]
            break
    if payments is None and isinstance(payments_data, list):
        payments = payments_data

    assert isinstance(payments, list), "Payments data is not a list"

    if not payments:
        # No existing payments, skip refund test as payment creation is not supported
        print("No payments available to test refund endpoint. Skipping refund test.")
        return

    payment_id = payments[0].get("id")
    assert payment_id, "Payment ID not found in payment record"

    # Step 2: Process refund for the payment
    try:
        refund_response = requests.post(
            f"{BASE_URL}/api/payments/{payment_id}/refund",
            auth=AUTH,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        refund_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Failed to process refund for payment {payment_id}: {e}"

    content_type_refund = refund_response.headers.get("Content-Type", "")
    assert "application/json" in content_type_refund, "Refund response is not JSON"
    assert refund_response.text.strip(), "Refund response is empty"

    refund_data = refund_response.json()
    assert isinstance(refund_data, dict), "Refund response is not a dict"
    # Basic refund response validation - usually contains paymentId or status
    assert refund_data.get("id") == payment_id or refund_data.get("paymentId") == payment_id or refund_data.get("status") == "refunded", \
        f"Refund response does not confirm refund of payment {payment_id}"

    # Optionally, verify refund status by getting payment details again if API available
    try:
        payment_detail_response = requests.get(
            f"{BASE_URL}/api/payments/{payment_id}",
            auth=AUTH,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        payment_detail_response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Failed to get payment details after refund for payment {payment_id}: {e}"

    content_type_detail = payment_detail_response.headers.get("Content-Type", "")
    assert "application/json" in content_type_detail, "Payment detail response is not JSON"
    assert payment_detail_response.text.strip(), "Payment detail response is empty"

    payment_detail = payment_detail_response.json()
    assert isinstance(payment_detail, dict), "Payment detail response is not a dict"
    # Assuming the payment object has a status field to represent refund state
    refund_status = payment_detail.get("status") or payment_detail.get("paymentStatus")
    assert refund_status in ["refunded", "partially_refunded", "refund_pending"], \
        f"Payment status after refund is unexpected: {refund_status}"


test_payments_list_and_refund_endpoint()
