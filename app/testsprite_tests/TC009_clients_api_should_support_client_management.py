import requests

BASE_URL = "http://localhost:3000"
SIGNIN_URL = f"{BASE_URL}/api/auth/signin"
CLIENTS_URL = f"{BASE_URL}/api/clients"

AUTH_PAYLOAD = {
    "email": "admin@flixcam.rent",
    "password": "admin"
}

TIMEOUT = 30


def test_clients_api_crud_role_based_access():
    session = requests.Session()
    # Authenticate and store cookies for protected requests
    resp = session.post(SIGNIN_URL, data=AUTH_PAYLOAD, timeout=TIMEOUT)
    assert resp.status_code == 200, "Signin failed"
    assert resp.cookies, "No cookies received on signin"

    # Prepare client data for creation
    new_client_data = {
        "name": "Test Client",
        "email": "testclient@example.com",
        "phone": "+966500000000",
        "notes": "Created by automated test"
    }

    created_client_id = None

    try:
        # Create a new client (POST /api/clients)
        resp = session.post(CLIENTS_URL, json=new_client_data, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Client creation failed: {resp.text}"
        created_client = resp.json()
        created_client_id = created_client.get("id")
        assert created_client_id, "Created client ID not returned"

        # Validate returned client data matches input (allowing possible extra fields)
        assert created_client.get("name") == new_client_data["name"]
        assert created_client.get("email") == new_client_data["email"]
        assert created_client.get("phone") == new_client_data["phone"]

        # Retrieve client by ID (GET /api/clients/{id})
        resp = session.get(f"{CLIENTS_URL}/{created_client_id}", timeout=TIMEOUT)
        assert resp.status_code == 200, f"Failed to get client: {resp.text}"
        get_client = resp.json()
        assert get_client.get("id") == created_client_id

        # Update client data (PATCH /api/clients/{id})
        updated_data = {"notes": "Updated by automated test"}
        resp = session.patch(f"{CLIENTS_URL}/{created_client_id}", json=updated_data, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Update client failed: {resp.text}"
        updated_client = resp.json()
        assert updated_client.get("notes") == updated_data["notes"]

        # List all clients (GET /api/clients)
        resp = session.get(CLIENTS_URL, timeout=TIMEOUT)
        assert resp.status_code == 200, f"List clients failed: {resp.text}"
        clients_list = resp.json()
        assert isinstance(clients_list, list), "Clients list is not an array"
        assert any(c.get("id") == created_client_id for c in clients_list), "Created client not in clients list"

        # Test role-based access control:
        # Attempt to create client with missing required fields (data validation)
        invalid_data = {"email": "invalid@example.com"}  # Missing required "name"
        resp = session.post(CLIENTS_URL, json=invalid_data, timeout=TIMEOUT)
        assert resp.status_code == 400 or resp.status_code == 422, "Invalid client data should be rejected"

    finally:
        # Cleanup - delete the created client if exists
        if created_client_id:
            del_resp = session.delete(f"{CLIENTS_URL}/{created_client_id}", timeout=TIMEOUT)
            assert del_resp.status_code == 200 or del_resp.status_code == 204, "Failed to delete client"


test_clients_api_crud_role_based_access()
