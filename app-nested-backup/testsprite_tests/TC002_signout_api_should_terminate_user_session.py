import requests

BASE_URL = "http://localhost:3000"
SIGNIN_PATH = "/api/auth/signin"
SIGNOUT_PATH = "/api/auth/signout"
SESSION_PATH = "/api/auth/session"

CREDENTIALS = {
    "authType": "basic token",
    "credential": {
        "username": "admin@flixcam.rent",
        "password": "admin"
    }
}

def test_signout_api_should_terminate_user_session():
    session = requests.Session()
    # Sign in and obtain session cookies
    signin_resp = session.post(
        BASE_URL + SIGNIN_PATH,
        json=CREDENTIALS,
        timeout=30
    )
    assert signin_resp.status_code == 200, f"Signin failed with status {signin_resp.status_code}"
    # Validate that cookies are set
    assert signin_resp.cookies, "No cookies received after signin"

    # Call session endpoint before signout to verify session is active
    session_resp_before = session.get(
        BASE_URL + SESSION_PATH,
        timeout=30
    )
    assert session_resp_before.status_code == 200, f"Session check before signout failed with status {session_resp_before.status_code}"
    json_before = session_resp_before.json()
    assert json_before, "Session info empty before signout"

    # Sign out to terminate the session
    signout_resp = session.post(
        BASE_URL + SIGNOUT_PATH,
        timeout=30
    )
    assert signout_resp.status_code == 200, f"Signout failed with status {signout_resp.status_code}"

    # After signout, session endpoint should require re-authentication (likely 401 or 403)
    session_resp_after = session.get(
        BASE_URL + SESSION_PATH,
        timeout=30
    )
    assert session_resp_after.status_code in (401, 403), (
        f"Session endpoint after signout returned unexpected status {session_resp_after.status_code}"
    )

    # Also attempt to access a protected endpoint using the same session, expecting failure
    protected_resp = session.get(
        BASE_URL + "/api/bookings",
        timeout=30
    )
    assert protected_resp.status_code in (401, 403), (
        f"Protected endpoint accessed after signout, status {protected_resp.status_code}"
    )

test_signout_api_should_terminate_user_session()