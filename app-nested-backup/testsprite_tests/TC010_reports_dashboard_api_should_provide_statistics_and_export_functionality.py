import requests

BASE_URL = "http://localhost:3000"
AUTH_URL = f"{BASE_URL}/api/auth/signin"
REPORTS_DASHBOARD_URL = f"{BASE_URL}/api/reports/dashboard"
REPORTS_TYPE_URL_TEMPLATE = f"{BASE_URL}/api/reports/{{type}}"
REPORTS_TYPE_EXPORT_URL_TEMPLATE = f"{BASE_URL}/api/reports/{{type}}/export"

# Fixed AUTH_PAYLOAD to match NextAuth.js signin typical fields: email and password
AUTH_PAYLOAD = {
    "email": "admin@flixcam.rent",
    "password": "admin"
}

TIMEOUT = 30


def test_reports_dashboard_api_statistics_and_export():
    # Sign in to get session cookies
    session = requests.Session()
    try:
        signin_response = session.post(AUTH_URL, json=AUTH_PAYLOAD, timeout=TIMEOUT)
        assert signin_response.status_code == 200, f"Signin failed: {signin_response.text}"

        # Test GET /api/reports/dashboard
        dashboard_response = session.get(REPORTS_DASHBOARD_URL, timeout=TIMEOUT)
        assert dashboard_response.status_code == 200, f"Dashboard GET failed: {dashboard_response.text}"
        dashboard_json = dashboard_response.json()
        assert isinstance(dashboard_json, dict), "Dashboard response should be a JSON object"
        assert "statistics" in dashboard_json or "data" in dashboard_json or len(dashboard_json) > 0, "Dashboard response missing expected report data"

        # Determine a valid report type from dashboard or use a placeholder
        # If dashboard info contains keys, use its keys as types else use a default "default"
        report_type = "default"
        if isinstance(dashboard_json, dict) and dashboard_json:
            # Take first key as report type candidate that is string type and non-empty
            keys = list(dashboard_json.keys())
            for k in keys:
                if isinstance(k, str) and k.strip():
                    report_type = k
                    break

        report_type_url = REPORTS_TYPE_URL_TEMPLATE.format(type=report_type)
        report_type_export_url = REPORTS_TYPE_EXPORT_URL_TEMPLATE.format(type=report_type)

        # Test POST /api/reports/{type} to generate report data
        type_post_response = session.post(report_type_url, json={}, timeout=TIMEOUT)
        assert type_post_response.status_code == 200, f"Report type POST failed: {type_post_response.text}"
        type_post_json = type_post_response.json()
        assert isinstance(type_post_json, dict), "Report type POST response should be a JSON object"
        assert "report" in type_post_json or len(type_post_json) > 0, "Report type POST missing expected data"

        # Test POST /api/reports/{type}/export to export report data
        export_post_response = session.post(report_type_export_url, json={}, timeout=TIMEOUT)
        assert export_post_response.status_code == 200, f"Report export POST failed: {export_post_response.text}"
        content_type = export_post_response.headers.get("Content-Type", "")
        # Expecting CSV, Excel or JSON or similar content type for export
        acceptable_content_types = [
            "application/json",
            "application/octet-stream",
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ]
        assert any(ct in content_type for ct in acceptable_content_types), f"Unexpected export content type: {content_type}"
        assert export_post_response.content, "Export response content is empty"

    finally:
        # Sign out to clean session, best effort
        try:
            session.post(f"{BASE_URL}/api/auth/signout", timeout=TIMEOUT)
        except Exception:
            pass


test_reports_dashboard_api_statistics_and_export()
