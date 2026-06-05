import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "15s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"]
  }
};

const BASE_URL = __ENV.BASE_URL || "http://nginx";

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/health`);
  check(res, {
    "health is 200": (r) => r.status === 200
  });
  sleep(1);
}
