import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  scenarios: {
    admin_system_broadcast: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "20s", target: 5 },
        { duration: "40s", target: 10 },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const COOKIE = __ENV.ADMIN_COOKIE || "";

function buildPayload(iteration) {
  const data = {
    title: `k6 System ${iteration}`,
    message: "k6 Broadcast Lasttest",
    target_mode: "all",
  };

  return Object.entries(data)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join("&");
}

export default function () {
  const payload = buildPayload(__ITER);
  const res = http.post(`${BASE_URL}/api/admin/system-notifications`, payload, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: COOKIE,
      Origin: BASE_URL,
      Referer: `${BASE_URL}/admin/news`,
    },
    redirects: 0,
  });

  check(res, {
    "status is redirect": (r) => r.status === 303,
  });

  sleep(0.5);
}
