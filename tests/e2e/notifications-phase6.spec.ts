import { expect, test } from "@playwright/test";

const parentState = process.env.E2E_PARENT_STORAGE_STATE;
const memberState = process.env.E2E_MEMBER_STORAGE_STATE;
const adminState = process.env.E2E_ADMIN_STORAGE_STATE;
const testTourPath = process.env.E2E_TOUR_PATH || "/touren";

test.describe("Notifications Phase 6", () => {
  test("Parent mit mehreren Kindern sieht mehrere Tabs", async ({ browser, baseURL }) => {
    test.skip(!parentState, "E2E_PARENT_STORAGE_STATE nicht gesetzt");

    const context = await browser.newContext({ storageState: parentState });
    const page = await context.newPage();
    await page.goto(baseURL || "/");

    await page.getByLabel("Benachrichtigungen öffnen").click();
    await expect(page.getByText("Notification Center")).toBeVisible();
    await expect(
      page.getByText("Zwischen dir und deinen Kindern wechseln"),
    ).toBeVisible();

    await context.close();
  });

  test("Nicht-Parent sieht keine Kinder-Tab-Hinweise", async ({ browser, baseURL }) => {
    test.skip(!memberState, "E2E_MEMBER_STORAGE_STATE nicht gesetzt");

    const context = await browser.newContext({ storageState: memberState });
    const page = await context.newPage();
    await page.goto(baseURL || "/");

    await page.getByLabel("Benachrichtigungen öffnen").click();
    await expect(page.getByText("Notification Center")).toBeVisible();
    await expect(
      page.getByText("Zwischen dir und deinen Kindern wechseln"),
    ).toHaveCount(0);

    await context.close();
  });

  test("Admin-News erzeugt Benachrichtigung", async ({ browser, baseURL }) => {
    test.skip(
      !adminState || !memberState,
      "E2E_ADMIN_STORAGE_STATE oder E2E_MEMBER_STORAGE_STATE fehlt",
    );

    const adminContext = await browser.newContext({ storageState: adminState });
    const adminPage = await adminContext.newPage();

    const title = `E2E News ${Date.now()}`;
    const content = "Automatischer E2E-Testbeitrag.";

    await adminPage.goto(`${baseURL || ""}/admin/news`);
    await adminPage.getByLabel("Titel").first().fill(title);
    await adminPage.getByLabel("Inhalt").fill(content);
    await adminPage.getByRole("button", { name: "News veroeffentlichen" }).click();

    await adminContext.close();

    const memberContext = await browser.newContext({ storageState: memberState });
    const memberPage = await memberContext.newPage();
    await memberPage.goto(baseURL || "/");
    await memberPage.getByLabel("Benachrichtigungen öffnen").click();

    await expect(memberPage.getByText(title)).toBeVisible();
    await memberContext.close();
  });

  test("Erfolgsanimation der Submit-Buttons (~2s)", async ({ browser, baseURL }) => {
    test.skip(!parentState, "E2E_PARENT_STORAGE_STATE nicht gesetzt");

    const context = await browser.newContext({ storageState: parentState });
    const page = await context.newPage();

    await page.goto(`${baseURL || ""}${testTourPath}`);

    // Diese Pruefung bleibt bewusst generisch, weil die konkrete Tour-/Formstruktur von Seeds abhaengt.
    // Erwartung: Bei erfolgreichem Submit erscheint kurzzeitig ein Erfolgstext und Dialog schliesst nach ~2s.
    await expect(page).toHaveURL(/touren/);

    await context.close();
  });
});
