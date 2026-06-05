import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    ramping_users: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "3m", target: 1000 },
        { duration: "2m", target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"]
  }
};

const BASE_URL = __ENV.BASE_URL || "http://localhost/api";

export default function () {
  const resolvePayload = JSON.stringify({
    url: "https://youtube.com/watch?v=k6test"
  });

  const params = { headers: { "Content-Type": "application/json" } };

  const resolveRes = http.post(`${BASE_URL}/v1/videos/resolve`, resolvePayload, params);
  check(resolveRes, { "resolve status is 200": (r) => r.status === 200 });

  if (resolveRes.status === 200) {
    const body = JSON.parse(resolveRes.body);
    const downloadPayload = JSON.stringify({
      request_id: body.requestId,
      format_id: body.formats?.[0]?.id || "18",
      audio_only: false
    });

    const downloadRes = http.post(`${BASE_URL}/v1/downloads`, downloadPayload, params);
    check(downloadRes, { "download status is accepted": (r) => r.status === 202 });
  }

  sleep(1);
}

