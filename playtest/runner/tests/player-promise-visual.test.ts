import { expect, test } from "@playwright/test";
import path from "node:path";

const artifact = (name: string) =>
  path.resolve(process.cwd(), "../../artifacts/qa", name);

async function openHub(page: import("@playwright/test").Page) {
  await page.goto("/?player-promise-qa=1", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const game = globalThis as any;
    game.setLang("tr");
    await game.quickStart();
    await game.quickAll();
  });

  await expect(page.locator("#postClubName")).toBeVisible();
  await page.locator("#postClubName").fill("Söz QA");
  await page.evaluate(() => {
    const game = globalThis as any;
    game.pcGo();
    game.fastTournamentDraw();
    game.finishTournamentDraw();
    game.setCaptain(0);
    game.closeModal();
  });
  await expect(page.locator("#hub")).toBeVisible();
}

test("captain promise request and active promise are visible", async ({ page }, testInfo) => {
  await openHub(page);

  const playerName = await page.evaluate(() => {
    const game = globalThis as any;
    game.closeModal();
    game.setLang("tr");

    const player = game.picksBySlot[1] || game.picksBySlot[0];
    const key = `${String(player.name)
      .replace(/[<>\r\n]/g, "")
      .trim()
      .toLocaleLowerCase("tr-TR")}|${String(player.pos || "")}`;
    const state = game.CopaRelationships.snapshot();

    state.bonds[key] = 4;
    state.pending = {
      eventKind: "promise",
      key,
      name: player.name,
      pos: player.pos,
      personality: "ambitious",
      bond: 4,
      type: "captain",
      round: game.round,
      groups: ["captain"],
    };

    game.CopaRelationships.restore(state);
    game.CopaRelationships.showPending();
    return player.name;
  });

  const promiseModal = page.locator(".promise-modal");
  await expect(promiseModal).toBeVisible();
  await expect(promiseModal).toContainText("OYUNCU SÖZÜ");
  await expect(promiseModal).toContainText(playerName);
  await page.screenshot({
    path: artifact(`player-promise-request-${testInfo.project.name}.png`),
    fullPage: false,
  });

  await promiseModal
    .locator("button")
    .filter({ has: page.locator("b", { hasText: /^SÖZ VER$/ }) })
    .click();
  await expect(promiseModal).toBeHidden();

  await page.evaluate(() => {
    const game = globalThis as any;
    game.pickCaptain();
  });

  const promisedCaptain = page.locator(".cap-card-promise");
  await expect(promisedCaptain).toBeVisible();
  await expect(promisedCaptain).toContainText("SÖZ VERİLDİ");
  await expect(promisedCaptain).toContainText(playerName);
  await page.screenshot({
    path: artifact(`player-promise-active-${testInfo.project.name}.png`),
    fullPage: false,
  });
});
