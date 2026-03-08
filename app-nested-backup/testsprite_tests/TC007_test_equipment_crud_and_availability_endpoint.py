import requests

BASE_URL = "http://localhost:3000"
HEADERS = {"Content-Type": "application/json"}
TIMEOUT = 30

def test_equipment_crud_and_availability_endpoint():
    # Define sample data for new equipment creation
    new_equipment_data = {
        "name": "Test Camera 1",
        "description": "High resolution test camera",
        "categoryId": "test-category-1",
        "brandId": "test-brand-1",
        "condition": "new",
        "isActive": True,
        "featured": False,
        "notes": "Initial test equipment"
    }

    created_equipment_id = None

    try:
        # Step 1: Create new equipment (POST /api/equipment)
        response = requests.post(
            f"{BASE_URL}/api/equipment",
            json=new_equipment_data,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert response.status_code == 201, f"Create equipment failed: {response.text}"
        try:
            created_equipment = response.json()
        except Exception as e:
            assert False, f"Response is not valid JSON on equipment creation: {response.text}"
        created_equipment_id = created_equipment.get("id")
        assert created_equipment_id, "Created equipment has no ID"

        # Step 2: Get equipment by ID (GET /api/equipment/{id})
        response = requests.get(
            f"{BASE_URL}/api/equipment/{created_equipment_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Get equipment failed: {response.text}"
        try:
            equipment = response.json()
        except Exception as e:
            assert False, f"Response is not valid JSON on get equipment: {response.text}"
        assert equipment.get("id") == created_equipment_id, "Equipment ID mismatch"
        assert equipment.get("name") == new_equipment_data["name"], "Equipment name mismatch"

        # Step 3: Update equipment (PATCH /api/equipment/{id})
        update_data = {"description": "Updated description for test camera"}
        response = requests.patch(
            f"{BASE_URL}/api/equipment/{created_equipment_id}",
            json=update_data,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Update equipment failed: {response.text}"
        try:
            updated_equipment = response.json()
        except Exception as e:
            assert False, f"Response is not valid JSON on update equipment: {response.text}"
        assert updated_equipment.get("description") == update_data["description"], "Equipment description not updated"

        # Step 4: Check equipment availability (GET /api/equipment/{id}/availability)
        response = requests.get(
            f"{BASE_URL}/api/equipment/{created_equipment_id}/availability",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert response.status_code == 200, f"Check availability failed: {response.text}"
        try:
            availability = response.json()
        except Exception as e:
            assert False, f"Response is not valid JSON on availability check: {response.text}"
        assert isinstance(availability, dict), "Availability response should be a dictionary/object"

        # Step 5: Delete equipment (DELETE /api/equipment/{id})
        response = requests.delete(
            f"{BASE_URL}/api/equipment/{created_equipment_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert response.status_code in (204, 200), f"Delete equipment failed: {response.text}"

        # Verify deleted equipment is no longer accessible
        response = requests.get(
            f"{BASE_URL}/api/equipment/{created_equipment_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert response.status_code == 404, "Deleted equipment should not be retrievable"

    finally:
        # Cleanup in case delete step failed and equipment was created
        if created_equipment_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/equipment/{created_equipment_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT,
                )
            except Exception:
                pass

test_equipment_crud_and_availability_endpoint()
