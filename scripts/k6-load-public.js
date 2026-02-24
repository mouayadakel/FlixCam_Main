/**
 * k6 load test – public and key APIs (Phase 8.4).
 * Run: k6 run scripts/k6-load-public.js
 * Target: 200 concurrent users (or set stages below).
 */

import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE = __ENV.BASE_URL || 'http://localhost:3001'

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
  },
}

export default function loadTest() {
  const res = http.get(`${BASE}/api/public/equipment?limit=10`)
  check(res, { 'equipment status 200': (r) => r.status === 200 })
  sleep(0.5)

  const catRes = http.get(`${BASE}/api/public/categories`)
  check(catRes, { 'categories status 200': (r) => r.status === 200 })
  sleep(0.3)
}
