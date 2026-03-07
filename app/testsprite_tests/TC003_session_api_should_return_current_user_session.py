import requests

BASE_URL = "http://localhost:3000"
SIGNIN_ENDPOINT = "/api/auth/signin"
SESSION_ENDPOINT = "/api/auth/session"
TIMEOUT = 30

def test_session_api_should_return_current_user_session():
    signin_url = BASE_URL + SIGNIN_ENDPOINT
    session_url = BASE_URL + SESSION_ENDPOINT

    signin_payload = {
        "email": "admin@flixcam.rent",
        "password": "admin"
    }
    headers = {
        "Content-Type": "application/json"
    }

    # Perform signin to get session cookies
    try:
        signin_response = requests.post(signin_url, json=signin_payload, headers=headers, timeout=TIMEOUT)
        assert signin_response.status_code == 200, f"Signin failed with status code {signin_response.status_code}"
        # Extract cookies from signin response
        cookies = signin_response.cookies

        # Request the current user session with the auth cookies
        session_response = requests.get(session_url, cookies=cookies, timeout=TIMEOUT)
        if session_response.status_code == 200:
            # Expect JSON response with session details
            session_json = session_response.json()
            # Basic validation that user info or session keys exist in response
            assert isinstance(session_json, dict), "Session response is not a JSON object"
            assert "user" in session_json or "expires" in session_json, "Session response missing expected keys"
        elif session_response.status_code == 401:
            # Unauthorized if session does not exist
            error_json = session_response.json()
            assert "error" in error_json or "message" in error_json, "Error response missing message"
        else:
            assert False, f"Unexpected status code {session_response.status_code} from session endpoint"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_session_api_should_return_current_user_session()
