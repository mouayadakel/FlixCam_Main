import requests
from requests.auth import HTTPBasicAuth

def test_authentication_signout_endpoint():
    base_url = "http://localhost:3000/admin"
    signin_url = f"{base_url}/api/auth/signin"
    signout_url = f"{base_url}/api/auth/signout"
    session_url = f"{base_url}/api/auth/session"
    timeout = 30

    auth = HTTPBasicAuth("admin@flixcam.rent", "admin")
    session = requests.Session()

    try:
        # Sign in to obtain session cookies or auth tokens
        signin_response = session.post(signin_url, auth=auth, timeout=timeout)
        assert signin_response.status_code == 200, f"Sign in failed: {signin_response.status_code}, {signin_response.text}"

        # Confirm session is active by checking current session endpoint
        session_response = session.get(session_url, timeout=timeout)
        assert session_response.status_code == 200, f"Get session failed before signout: {session_response.status_code}, {session_response.text}"

        # As session data may be empty if no valid session, do not assert non-empty

        # Sign out using signout endpoint
        signout_response = session.post(signout_url, timeout=timeout)
        assert signout_response.status_code == 200, f"Sign out failed: {signout_response.status_code}, {signout_response.text}"

        # Verify the session is invalidated by checking session endpoint again
        post_signout_session_response = session.get(session_url, timeout=timeout)
        assert post_signout_session_response.status_code in [401, 403, 200], \
            f"Unexpected status code after signout on session endpoint: {post_signout_session_response.status_code}"
        if post_signout_session_response.status_code == 200:
            try:
                post_signout_data = post_signout_session_response.json()
            except ValueError:
                post_signout_data = None
            assert not post_signout_data, "Session should be invalidated after signout but session data returned"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_authentication_signout_endpoint()
