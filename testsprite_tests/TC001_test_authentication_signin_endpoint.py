import requests

def test_authentication_signin_endpoint():
    base_url = "http://localhost:3000"
    endpoint = "/api/auth/signin"
    url = base_url + endpoint

    payload = {
        "email": "admin@flixcam.rent",
        "password": "admin"
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(data, dict), "Response JSON is not an object"
    assert any(key in data for key in ("accessToken", "token", "jwt", "refreshToken")), "No authentication token found in response"
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"


test_authentication_signin_endpoint()