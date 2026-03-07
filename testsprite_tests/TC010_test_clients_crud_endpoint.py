import requests

BASE_URL = "http://localhost:3000"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
TIMEOUT = 30

def test_clients_crud_endpoint():
    client_id = None
    try:
        # 1. Create a new client (POST /api/clients)
        create_payload = {
            "name": "Test Client",
            "email": "testclient@example.com",
            "phone": "+966500000000",
            "address": "123 Test St, Riyadh",
            "notes": "Created for automated test"
        }
        response = requests.post(
            f"{BASE_URL}/api/clients",
            json=create_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 201, f"Client creation failed: {response.text}"
        client = response.json()
        assert "id" in client and client["id"], "Created client response missing id"
        client_id = client["id"]

        # 2. List clients (GET /api/clients) and check created client is in list
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Listing clients failed: {response.text}"
        clients_list = response.json()
        assert isinstance(clients_list, list), "Clients list response is not a list"
        assert any(c.get("id") == client_id for c in clients_list), "Created client not found in clients list"

        # 3. Get client by ID (GET /api/clients/{id})
        response = requests.get(
            f"{BASE_URL}/api/clients/{client_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Get client by ID failed: {response.text}"
        client_data = response.json()
        assert client_data.get("id") == client_id, "Returned client ID does not match created client ID"

        # 4. Update client (PATCH /api/clients/{id})
        update_payload = {
            "name": "Updated Test Client",
            "notes": "Updated by automated test"
        }
        response = requests.patch(
            f"{BASE_URL}/api/clients/{client_id}",
            json=update_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 200, f"Update client failed: {response.text}"
        updated_client = response.json()
        assert updated_client.get("name") == update_payload["name"], "Client name not updated"
        assert updated_client.get("notes") == update_payload["notes"], "Client notes not updated"

        # 5. Delete client (DELETE /api/clients/{id})
        response = requests.delete(
            f"{BASE_URL}/api/clients/{client_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 204, f"Delete client failed: {response.text}"

        # 6. Confirm client deletion (GET /api/clients/{id} should fail)
        response = requests.get(
            f"{BASE_URL}/api/clients/{client_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert response.status_code == 404, "Deleted client still accessible"

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {str(e)}"
    finally:
        # Cleanup in case test failed before deletion
        if client_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/clients/{client_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass

test_clients_crud_endpoint()
