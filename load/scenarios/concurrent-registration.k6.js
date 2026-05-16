import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";
import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  scenarios: {
    concurrent_registration: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 }, // Ramp up to 50 users
        { duration: "1m", target: 50 }, // Hold at 50 users
        { duration: "30s", target: 0 }, // Ramp down
      ],
    },
  },
};

const BASE_URL = __ENV.SITE_URL || "http://localhost:3000";
const TOUR_ID = __ENV.TOUR_ID || "00000000-0000-0000-0000-000000000000"; // Replace with real Tour ID

export default function () {
  // Simulate user viewing the tour page
  const resPage = http.get(`${BASE_URL}/touren/${TOUR_ID}`);
  check(resPage, {
    "page loaded successfully": (r) => r.status === 200,
  });

  sleep(Math.random() * 2);

  // Prepare dynamic payload for an idempotent registration
  // Because server actions are hard to invoke directly without Next.js metadata,
  // we would typically use the REST API (if available) or simulate the Supabase RPC call.
  // Assuming we test against a dedicated internal test-endpoint `api/test/register`
  // which wraps the RPC for load testing purposes.

  const payload = JSON.stringify({
    tour_id: TOUR_ID,
    idempotency_key: uuidv4(), // Different key for each VU iteration
    // Simulating required inputs:
    materials: [],
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      // Typically would need Auth header here
      // 'Authorization': `Bearer ${token}`
    },
  };

  // Note: Since auth is required, you'd need an endpoint that accepts mock auth in test environment
  const resReg = http.post(
    `${BASE_URL}/api/test/register-load`,
    payload,
    params,
  );

  check(resReg, {
    "registration successful (200/201)": (r) =>
      r.status === 200 || r.status === 201,
  });

  sleep(1);
}
