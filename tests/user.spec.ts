import { test, expect } from "playwright-test-coverage";

test("updateUser", async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  let currentUser = {
    id: 100,
    name: "pizza diner",
    email,
    roles: [{ role: "diner" }],
  };

  await page.route("**/api/auth", async (route) => {
    const method = route.request().method();

    if (method === "DELETE") {
      await route.fulfill({ json: {} });
      return;
    }

    if (method === "POST") {
      expect(route.request().postDataJSON()).toMatchObject({
        name: "pizza diner",
        email,
        password: "diner",
      });
      await route.fulfill({
        json: { user: currentUser, token: "mock-user-token" },
      });
      return;
    }

    expect(method).toBe("PUT");
    await route.fulfill({
      json: { user: currentUser, token: "mock-user-token" },
    });
  });

  await page.route("**/api/user/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/me")) {
      expect(route.request().method()).toBe("GET");
      await route.fulfill({ json: currentUser });
      return;
    }

    expect(route.request().method()).toBe("PUT");
    const update = route.request().postDataJSON();
    currentUser = { ...currentUser, name: update.name };
    await route.fulfill({
      json: { user: currentUser, token: "mock-user-token" },
    });
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("pizza diner");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Register" }).click();

  await page.getByRole("link", { name: "pd" }).click();

  await expect(page.getByRole("main")).toContainText("pizza diner");
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("pizza diner");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("pizza dinerx");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("pizza dinerx");

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "pd" }).click();

  await expect(page.getByRole("main")).toContainText("pizza dinerx");
});
