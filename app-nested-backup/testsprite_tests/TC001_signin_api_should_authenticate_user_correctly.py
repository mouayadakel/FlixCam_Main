import requests

def test_signin_api_should_authenticate_user_correctly():
    base_url = "http://localhost:3000"
    signin_url = f"{base_url}/api/auth/signin"
    payload = {
        "email": "admin@flixcam.rent",
        "password": "admin"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(signin_url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
        # Check response content type for JSON
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type.lower(), f"Expected JSON response content type, got {content_type}"

        json_resp = response.json()
        # The signin should return session info or auth tokens
        assert isinstance(json_resp, dict), "Response JSON must be a dictionary"
        # At minimum expect some keys that indicate successful signin (this depends on implementation)
        # Since no explicit schema for response, check common keys presence that might be in session/auth response
        expected_keys = ["user", "token", "expires"]
        assert any(key in json_resp for key in expected_keys), f"Response JSON does not contain expected keys {expected_keys}"

        # Validate that cookies are set for the session
        cookie_jar = response.cookies
        assert cookie_jar, "Response should contain cookies for session"
        # Typical nextauth cookies pattern could be checked if needed (e.g. 'next-auth.session-token'), but no schema provided, so generic check
        
    except requests.exceptions.RequestException as e:
        assert False, f"Request to signin endpoint failed: {e}"

test_signin_api_should_authenticate_user_correctly()