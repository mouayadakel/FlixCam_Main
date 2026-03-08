import requests
import uuid

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

AUTH_PAYLOAD = {
    "email": "admin@flixcam.rent",
    "password": "admin"
}

def test_equipment_api_management_and_availability():
    session = requests.Session()

    # Sign in to get authenticated session cookies
    signin_resp = session.post(f"{BASE_URL}/api/auth/signin", json=AUTH_PAYLOAD, timeout=TIMEOUT)
    assert signin_resp.status_code == 200, f"Signin failed: {signin_resp.text}"
    assert signin_resp.cookies, "Signin response did not return cookies"

    headers = {
        "Content-Type": "application/json"
    }

    equipment_id = None
    try:
        # 1. Create new equipment (POST /api/equipment)
        new_equipment_data = {
            "name": f"Test Equipment {uuid.uuid4()}",
            "description": "Automated test equipment creation",
            "category": "Camera",
            "brand": "TestBrand",
            "model": "T1000",
            "serialNumber": f"SN-{uuid.uuid4()}",
            "condition": "new",
            "location": "Warehouse A",
            "rentalPricePerDay": 150.00,
            "available": True,
            "metadata": {"test_case": "TC006"}
        }
        create_resp = session.post(f"{BASE_URL}/api/equipment", json=new_equipment_data, headers=headers, timeout=TIMEOUT)
        assert create_resp.status_code == 201, f"Failed to create equipment: {create_resp.text}"
        create_json = create_resp.json()
        assert "id" in create_json, "Created equipment response missing 'id'"
        equipment_id = create_json["id"]

        # 2. Read equipment (GET /api/equipment/{id})
        get_resp = session.get(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Failed to get equipment by id: {get_resp.text}"
        get_json = get_resp.json()
        assert get_json.get("id") == equipment_id, "Get equipment returned wrong id"
        assert get_json.get("name") == new_equipment_data["name"], "Equipment name mismatch"
        assert get_json.get("available") is True, "Equipment availability mismatch"

        # 3. Update equipment (PATCH /api/equipment/{id})
        update_data = {
            "description": "Updated equipment description",
            "rentalPricePerDay": 180.00,
            "available": False
        }
        patch_resp = session.patch(f"{BASE_URL}/api/equipment/{equipment_id}", json=update_data, headers=headers, timeout=TIMEOUT)
        assert patch_resp.status_code == 200, f"Failed to update equipment: {patch_resp.text}"
        patch_json = patch_resp.json()
        for key, val in update_data.items():
            assert patch_json.get(key) == val, f"Updated field '{key}' does not match"

        # 4. Check availability (GET /api/equipment/{id}/availability)
        avail_resp = session.get(f"{BASE_URL}/api/equipment/{equipment_id}/availability", headers=headers, timeout=TIMEOUT)
        assert avail_resp.status_code == 200, f"Failed to get equipment availability: {avail_resp.text}"
        avail_json = avail_resp.json()
        assert isinstance(avail_json, dict), "Availability response is not a JSON object"
        assert "available" in avail_json, "Availability response missing 'available' field"
        assert avail_json["available"] is False, "Availability status does not reflect updated availability"

        # 5. List all equipment to verify inclusion (GET /api/equipment)
        list_resp = session.get(f"{BASE_URL}/api/equipment", headers=headers, timeout=TIMEOUT)
        assert list_resp.status_code == 200, f"Failed to list equipment: {list_resp.text}"
        list_json = list_resp.json()
        assert isinstance(list_json, list), "Equipment list response is not a list"
        assert any(eq.get("id") == equipment_id for eq in list_json), "Created equipment not in equipment list"

    finally:
        # Cleanup - delete the created equipment
        if equipment_id:
            del_resp = session.delete(f"{BASE_URL}/api/equipment/{equipment_id}", headers=headers, timeout=TIMEOUT)
            assert del_resp.status_code in (200, 204), f"Failed to delete equipment: {del_resp.text}"

test_equipment_api_management_and_availability()
