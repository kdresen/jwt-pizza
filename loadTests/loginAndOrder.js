import { sleep, check, group, fail } from "k6";
import http from "k6/http";
import jsonpath from "https://jslib.k6.io/jsonpath/1.0.2/index.js";

export const options = {
  cloud: {
    distribution: {
      "amazon:us:ashburn": { loadZone: "amazon:us:ashburn", percent: 100 },
    },
    apm: [],
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    checks: ["rate>0.95"],
  },
  scenarios: {
    Imported_HAR: {
      executor: "ramping-vus",
      gracefulStop: "30s",
      stages: [
        { target: 5, duration: "30s" },
        { target: 5, duration: "1m" },
        { target: 0, duration: "30s" },
      ],
      gracefulRampDown: "30s",
      exec: "imported_HAR",
    },
  },
};

export function imported_HAR() {
  let response;

  const vars = {};

  group("page_10 - https://pizza.kallai-byu-cs.click/", function () {
    // Login
    response = http.put(
      "https://pizza-service.kallai-byu-cs.click/api/auth",
      '{"email":"d@jwt.com","password":"diner"}',
      {
        headers: {
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "en-US,en;q=0.9,es-HN;q=0.8,es;q=0.7",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://pizza.kallai-byu-cs.click",
          priority: "u=1, i",
          "sec-ch-ua":
            '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
      },
    );
    if (
      !check(response, {
        "status equals 200": (response) => response.status === 200,
      })
    ) {
      console.error(`Login failed with HTTP ${response.status}`);
      fail("Login was not 200");
    }

    vars["token"] = jsonpath.query(response.json(), "$.token")[0];

    if (!vars["token"]) {
      fail("Login succeeded but no JWT was returned");
    }

    sleep(16);

    // Get Pizza Menu
    response = http.get(
      "https://pizza-service.kallai-byu-cs.click/api/order/menu",
      {
        headers: {
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "en-US,en;q=0.9,es-HN;q=0.8,es;q=0.7",
          authorization: `Bearer ${vars["token"]}`,
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://pizza.kallai-byu-cs.click",
          priority: "u=1, i",
          "sec-ch-ua":
            '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
      },
    );

    // Get franchises
    response = http.get(
      "https://pizza-service.kallai-byu-cs.click/api/franchise?page=0&limit=20&name=*",
      {
        headers: {
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "en-US,en;q=0.9,es-HN;q=0.8,es;q=0.7",
          authorization: `Bearer ${vars["token"]}`,
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://pizza.kallai-byu-cs.click",
          priority: "u=1, i",
          "sec-ch-ua":
            '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
      },
    );
    sleep(12.6);

    // Get current user
    response = http.get(
      "https://pizza-service.kallai-byu-cs.click/api/user/me",
      {
        headers: {
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "en-US,en;q=0.9,es-HN;q=0.8,es;q=0.7",
          authorization: `Bearer ${vars["token"]}`,
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://pizza.kallai-byu-cs.click",
          priority: "u=1, i",
          "sec-ch-ua":
            '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
      },
    );
    sleep(3.3);

    // Purchase pizza
    response = http.post(
      "https://pizza-service.kallai-byu-cs.click/api/order",
      '{"items":[{"menuId":1,"description":"Veggie","price":0.0038}],"storeId":"1","franchiseId":1}',
      {
        headers: {
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "en-US,en;q=0.9,es-HN;q=0.8,es;q=0.7",
          authorization: `Bearer ${vars["token"]}`,
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://pizza.kallai-byu-cs.click",
          priority: "u=1, i",
          "sec-ch-ua":
            '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
        },
      },
    );

    if (
      !check(response, {
        "purchase succeeded": (response) => response.status === 200,
      })
    ) {
      console.error(`Purchase failed with HTTP ${response.status}`);
      fail("Purchase was not 200");
    }

    // Extract the JWT returned by the pizza purchase
    vars["pizzaJwt"] = jsonpath.query(response.json(), "$.jwt")[0];

    if (!vars["pizzaJwt"]) {
      fail("Purchase succeeded but no pizza JWT was returned");
    }

    // Verify pizza JWT
    response = http.post(
      "https://pizza-factory.cs329.click/api/order/verify",
      JSON.stringify({
        jwt: vars["pizzaJwt"],
      }),
      {
        headers: {
          "content-type": "application/json",
        },
      },
    );

    check(response, {
      "pizza JWT verification succeeded": (response) => response.status === 200,
    });
  });
}
