import requests

def test_authentication_session_endpoint():
    base_url = "http://localhost:3000"
    session_endpoint = "/api/auth/session"
    timeout = 30

    headers = {
        "Accept": "application/json"
    }

    try:
        response = requests.get(f"{base_url}{session_endpoint}", headers=headers, timeout=timeout)
        response.raise_for_status()
    except requests.HTTPError as e:
        # Accepting 401 Unauthorized as a valid response when no authentication provided
        if e.response.status_code == 401:
            # Valid case: Unauthenticated
            return
        assert False, f"Request to {session_endpoint} failed: {e}"
    except requests.RequestException as e:
        assert False, f"Request to {session_endpoint} failed: {e}"

    # Validate response content
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert isinstance(data, dict), "Response JSON should be an object"
    assert "user" in data, "'user' key not found in session response"
    user_info = data.get("user")
    assert isinstance(user_info, dict), "'user' should be a dictionary"
    assert "email" in user_info, "'email' field missing in user info"
    assert user_info["email"] == "admin@flixcam.rent", f"User email mismatch, expected admin@flixcam.rent got {user_info['email']}"

test_authentication_session_endpoint()
