/**
 * Phase 10: k6 load test for critical API endpoints
 * Run: k6 run scripts/load-test.k6.js
 * Requires: k6 installed (brew install k6 or https://k6.io/docs/getting-started/installation/)
 * Ensure app is running at BASE_URL before running.
 */

import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 VUs
    { duration: '1m', target: 10 },  // Stay at 10 VUs for 1 min
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    http_req_failed: ['rate<0.05'],    // < 5% failure rate
  },
}

/** k6 main scenario (default export required by k6) */
export default function loadTestScenario() {
  // Public endpoints (no auth)
  const healthRes = http.get(`${BASE_URL}/api/health`)
  check(healthRes, { 'health status 200': (r) => r.status === 200 })

  const equipmentRes = http.get(`${BASE_URL}/api/public/equipment?limit=10`)
  check(equipmentRes, { 'public equipment status 200': (r) => r.status === 200 })

  sleep(1)
}
