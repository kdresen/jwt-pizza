import { test, expect } from "playwright-test-coverage";

test("home page", async ({ page }) => {
  await page.goto("/");

  expect(await page.title()).toBe("JWT Pizza");
});

test("purchase with login", async ({ page }) => {
  await page.route("*/**/version.json", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: { version: "test" } });
  });

  await page.route("*/**/api/order/menu", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({
      json: [
        {
          id: "1",
          title: "Veggie A",
          description: "A delicious veggie pizza",
          image: "/pizza1.png",
          price: 0.004,
        },
        {
          id: "2",
          title: "Pepperoni",
          description: "A classic pepperoni pizza",
          image: "/pizza2.png",
          price: 0.004,
        },
      ],
    });
  });

  await page.route("*/**/api/franchise*", async (route) => {
    expect(route.request().method()).toBe("GET");
    expect(route.request().url()).toContain(
      "/api/franchise?page=0&limit=20&name=*",
    );
    await route.fulfill({
      json: {
        franchises: [
          {
            id: "1",
            name: "JWT Pizza",
            stores: [{ id: "1", name: "Main Street" }],
          },
        ],
        more: false,
      },
    });
  });

  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "d@jwt.com", password: "diner" };
    const loginRes = {
      user: {
        id: 2,
        name: "pizza diner",
        email: "d@jwt.com",
        roles: [
          {
            role: "diner",
          },
        ],
      },
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibmFtZSI6InBpenphIGRpbmVyIiwiZW1haWwiOiJkQGp3dC5jb20iLCJyb2xlcyI6W3sicm9sZSI6ImRpbmVyIn1dLCJpYXQiOjE3OTE0MTc1MDd9._zd6iVhYU9wK1AVA1OGdZJgyjc7Nd0QXoiH_8B-OrQg",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route("**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({
      json: {
        id: 2,
        name: "pizza diner",
        email: "d@jwt.com",
        roles: [{ role: "diner" }],
      },
    });
  });

  await page.route("*/**/api/order", async (route) => {
    expect(route.request().method()).toBe("POST");
    const orderReq = route.request().postDataJSON();
    expect(orderReq).toMatchObject({
      franchiseId: "1",
      storeId: "1",
      items: [
        { menuId: "1", description: "Veggie A", price: 0.004 },
        { menuId: "2", description: "Pepperoni", price: 0.004 },
      ],
    });
    await route.fulfill({
      json: {
        order: {
          ...orderReq,
          id: "order-1",
          date: "2026-01-01T00:00:00.000Z",
        },
        jwt: "mock-order-jwt",
      },
    });
  });

  await page.route("*/**/api/order/verify", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ jwt: "mock-order-jwt" });
    await route.fulfill({
      json: {
        message: "valid",
        payload: { orderId: "order-1" },
      },
    });
  });

  await page.goto("http://localhost:5173/");
  await page.getByRole("button", { name: "Order now" }).click();
  await expect(page.locator("h2")).toContainText("Awesome is a click away");
  await page.getByRole("combobox").selectOption("1");
  await page
    .getByRole("link", { name: "Image Description Veggie A" })
    .first()
    .click();
  await page
    .getByRole("link", { name: "Image Description Pepperoni" })
    .first()
    .click();
  await expect(page.locator("form")).toContainText("Selected pizzas: 2");
  await page.getByRole("button", { name: "Checkout" }).click();
  await page.getByRole("textbox", { name: "Email address" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Email address" }).press("Tab");
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("main")).toContainText(
    "Send me those 2 pizzas right now!",
  );
  await expect(page.locator("tbody")).toContainText("Veggie");
  await page.getByRole("button", { name: "Pay now" }).click();
  await expect(page.getByRole("main")).toContainText("0.008 ₿");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.locator("h3")).toContainText("valid");
});

test("franchise dashboard", async ({ page }) => {
  await page.route("**/version.json", async (route) => {
    await route.fulfill({ json: { version: "test" } });
  });

  await page.route("*/**/api/auth", async (route) => {
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject({
      email: "f@jwt.com",
      password: "franchisee",
    });
    await route.fulfill({
      json: {
        user: {
          id: 2,
          name: "pizza franchisee",
          email: "f@jwt.com",
          roles: [{ role: "franchisee" }],
        },
        token: "mock-franchisee-token",
      },
    });
  });

  await page.route("http://localhost:3000/api/franchise/2", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({
      json: [
        {
          id: "franchise-1",
          name: "Downtown Pizza",
          stores: [
            {
              id: "store-1",
              name: "Main Street",
              totalRevenue: 12.5,
            },
          ],
        },
      ],
    });
  });

  await page.goto("/franchise-dashboard/login");
  await page.getByRole("textbox", { name: "Email address" }).fill("f@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("franchisee");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(
    page.getByRole("heading", { name: "Downtown Pizza", level: 2 }),
  ).toBeVisible();
  await expect(page.locator("tbody")).toContainText("Main Street");
  await expect(page.locator("tbody")).toContainText("12.5 ₿");

  await page.getByRole("button", { name: "Create store" }).click();
  await expect(page).toHaveURL(/\/franchise-dashboard\/create-store$/);
});

test("admin dashboard", async ({ page }) => {
  await page.route("**/version.json", async (route) => {
    await route.fulfill({ json: { version: "test" } });
  });

  await page.route("*/**/api/auth", async (route) => {
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject({
      email: "a@jwt.com",
      password: "admin",
    });
    await route.fulfill({
      json: {
        user: {
          id: 1,
          name: "pizza admin",
          email: "a@jwt.com",
          roles: [{ role: "admin" }],
        },
        token: "mock-admin-token",
      },
    });
  });

  await page.route("http://localhost:3000/api/franchise**", async (route) => {
    expect(route.request().method()).toBe("GET");
    const url = new URL(route.request().url());
    const pageNumber = url.searchParams.get("page");
    const nameFilter = url.searchParams.get("name");

    if (pageNumber === "0" && nameFilter === "*") {
      await route.fulfill({
        json: {
          franchises: [
            {
              id: "franchise-1",
              name: "Downtown Pizza",
              admins: [{ name: "pizza franchisee" }],
              stores: [
                {
                  id: "store-1",
                  name: "Main Street",
                  totalRevenue: 12.5,
                },
              ],
            },
          ],
          more: true,
        },
      });
      return;
    }

    if (pageNumber === "1" && nameFilter === "*") {
      await route.fulfill({
        json: {
          franchises: [
            {
              id: "franchise-2",
              name: "Uptown Pizza",
              admins: [{ name: "another franchisee" }],
              stores: [
                {
                  id: "store-2",
                  name: "North Street",
                  totalRevenue: 20,
                },
              ],
            },
          ],
          more: false,
        },
      });
      return;
    }

    expect(pageNumber).toBe("1");
    expect(nameFilter).toBe("*Downtown*");
    await route.fulfill({
      json: {
        franchises: [
          {
            id: "franchise-1",
            name: "Downtown Pizza",
            admins: [{ name: "pizza franchisee" }],
            stores: [],
          },
        ],
        more: false,
      },
    });
  });

  await page.goto("/admin-dashboard/login");
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(
    page.getByRole("heading", { name: "Mama Ricci's kitchen", level: 2 }),
  ).toBeVisible();
  await expect(page.locator("tbody")).toContainText("Downtown Pizza");
  await expect(page.locator("tbody")).toContainText("pizza franchisee");
  await expect(page.locator("tbody")).toContainText("Main Street");
  await expect(page.locator("tbody")).toContainText("12.5 ₿");

  await page.getByRole("button", { name: "»" }).click();
  await expect(page.locator("tbody")).toContainText("Uptown Pizza");
  await expect(page.locator("tbody")).toContainText("North Street");

  await page.getByPlaceholder("Filter franchises").fill("Downtown");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.locator("tbody")).toContainText("Downtown Pizza");
  await expect(page.locator("tbody")).not.toContainText("Uptown Pizza");

  await page.getByRole("button", { name: "Add Franchise" }).click();
  await expect(page).toHaveURL(/\/admin-dashboard\/create-franchise$/);
});

test("register account", async ({ page }) => {
  await page.route("**/version.json", async (route) => {
    await route.fulfill({ json: { version: "test" } });
  });

  await page.route("*/**/api/auth", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      name: "new pizza diner",
      email: "new@jwt.com",
      password: "test-password",
    });
    await route.fulfill({
      json: {
        user: {
          id: 3,
          name: "new pizza diner",
          email: "new@jwt.com",
          roles: [{ role: "diner" }],
        },
        token: "mock-registration-token",
      },
    });
  });

  await page.goto("/register");
  await page.getByPlaceholder("Full name").fill("new pizza diner");
  await page.getByRole("textbox", { name: "Email address" }).fill("new@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("test-password");
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "nd" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();
});

test("close franchise and store", async ({ page }) => {
  await page.route("**/version.json", async (route) => {
    await route.fulfill({ json: { version: "test" } });
  });

  await page.route("*/**/api/auth", async (route) => {
    expect(route.request().method()).toBe("PUT");
    await route.fulfill({
      json: {
        user: {
          id: 1,
          name: "pizza admin",
          email: "a@jwt.com",
          roles: [{ role: "admin" }],
        },
        token: "mock-admin-token",
      },
    });
  });

  await page.route("http://localhost:3000/api/franchise**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          franchises: [
            {
              id: "franchise-1",
              name: "Downtown Pizza",
              admins: [{ name: "pizza franchisee" }],
              stores: [
                {
                  id: "store-1",
                  name: "Main Street",
                  totalRevenue: 12.5,
                },
              ],
            },
          ],
          more: false,
        },
      });
      return;
    }

    expect(route.request().method()).toBe("DELETE");
    expect(route.request().url()).toMatch(
      /\/api\/franchise\/(franchise-1|franchise-1\/store\/store-1)$/,
    );
    await route.fulfill({ json: {} });
  });

  await page.goto("/admin-dashboard/login");
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(
    page.getByRole("heading", { name: "Mama Ricci's kitchen", level: 2 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).nth(0).click();
  await expect(page.getByRole("main")).toContainText(
    "close the Downtown Pizza franchise",
  );
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/admin-dashboard$/);

  await page.getByRole("button", { name: "Close" }).nth(1).click();
  await expect(page.getByRole("main")).toContainText(
    "Downtown Pizza store Main Street",
  );
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/admin-dashboard$/);
});

test("diner dashboard", async ({ page }) => {
  await page.route("**/version.json", async (route) => {
    await route.fulfill({ json: { version: "test" } });
  });

  await page.route("*/**/api/auth", async (route) => {
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject({
      email: "d@jwt.com",
      password: "diner",
    });
    await route.fulfill({
      json: {
        user: {
          id: 2,
          name: "pizza diner",
          email: "d@jwt.com",
          roles: [{ role: "diner" }],
        },
        token: "mock-diner-token",
      },
    });
  });

  await page.route("http://localhost:3000/api/order", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({
      json: {
        id: "history-1",
        dinerId: "2",
        orders: [
          {
            id: "order-42",
            franchiseId: "franchise-1",
            storeId: "store-1",
            date: "2026-01-15T12:00:00.000Z",
            items: [
              {
                menuId: "1",
                description: "Veggie A",
                price: 0.004,
              },
              {
                menuId: "2",
                description: "Pepperoni",
                price: 0.004,
              },
            ],
          },
        ],
      },
    });
  });

  await page.goto("/diner-dashboard/login");
  await page.getByRole("textbox", { name: "Email address" }).fill("d@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(
    page.getByRole("heading", { name: "Your pizza kitchen", level: 2 }),
  ).toBeVisible();
  await expect(page.getByText("name:").locator("..")).toContainText(
    "pizza diner",
  );
  await expect(page.getByText("email:").locator("..")).toContainText(
    "d@jwt.com",
  );
  await expect(page.getByText("role:").locator("..")).toContainText("diner");
  await expect(page.locator("tbody")).toContainText("order-42");
  await expect(page.locator("tbody")).toContainText("0.008 ₿");
  await expect(page.locator("tbody")).toContainText("2026-01-15");
});
