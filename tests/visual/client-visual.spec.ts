import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { test, expect, type Page } from "@playwright/test";
import {
  visualRoutes,
  visualViewports,
  visualStates,
  visualClock,
  type VisualState,
} from "./support/catalog";
import { compareRgbPixels } from "./support/pixel-comparison";

const artifacts = path.resolve(process.env.CUI19_ARTIFACT_DIR || ".local/qa/cui-19/current");
const digest = (bytes: Buffer) => crypto.createHash("sha256").update(bytes).digest("hex");
async function mount(page: Page, route: string, state: VisualState) {
  await page.setContent(
    '<!DOCTYPE html><html lang="en"><head><title>Isolated Client visual fixture</title></head><body><div id="root"></div></body></html>',
  );
  await page.clock.setFixedTime(new Date(visualClock));
  await page.addStyleTag({ content: fs.readFileSync(path.join(artifacts, "fixture.css"), "utf8") });
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await page.addScriptTag({ content: fs.readFileSync(path.join(artifacts, "fixture.js"), "utf8") });
  await page.evaluate(({ route, state }) => window.renderClientVisual(route, state), {
    route,
    state,
  });
  await page.locator("[data-client-shell] main").waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Client Messages chooses a default thread in an effect. Wait for actual DOM
    // and scroll quiescence, rather than taking an intermediate render as a golden.
    await new Promise<void>((resolve) => {
      let quiet: ReturnType<typeof setTimeout>;
      const observer = new MutationObserver(reset);
      const limit = setTimeout(done, 3000);
      function done() {
        clearTimeout(quiet);
        clearTimeout(limit);
        observer.disconnect();
        document.removeEventListener("scroll", reset, true);
        resolve();
      }
      function reset() {
        clearTimeout(quiet);
        quiet = setTimeout(done, 150);
      }
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      document.addEventListener("scroll", reset, true);
      reset();
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.querySelectorAll("*").forEach((node) => {
      if (node.scrollTop) node.scrollTop = 0;
      if (node.scrollLeft) node.scrollLeft = 0;
    });
  });
}

for (const screen of visualRoutes) {
  for (const viewport of visualViewports) {
    test(`${screen.id} ${viewport.width}px — isolated state screenshots`, async ({
      page,
      context,
    }) => {
      const errors: string[] = [];
      const requests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await context.route("**/*", (route) => {
        requests.push(new URL(route.request().url()).origin);
        return route.abort();
      });
      await page.setViewportSize(viewport);
      const outcomes: { state: VisualState; status: string; [key: string]: unknown }[] = [];
      const destination = path.join(artifacts, "screenshots", screen.id, String(viewport.width));
      fs.mkdirSync(destination, { recursive: true });
      for (const state of visualStates) {
        try {
          await mount(page, screen.route, state);
          if (screen.route === "/client/profile" && !["healthy", "complete"].includes(state)) {
            await page.getByRole("tab", { name: "Data & Privacy", exact: true }).click();
            await expect(
              page.getByRole("heading", { name: "Activity Log", exact: true }),
            ).toBeVisible();
          }
          if (
            screen.route === "/client/messages" &&
            viewport.width < 1024 &&
            ["long-text", "high-volume"].includes(state)
          ) {
            await page.locator(".client-messages-channel").first().click();
            await expect(page.locator(".client-messages-conversation-visible")).toBeVisible();
          }
          await page.evaluate(async () => {
            await document.fonts.ready;
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
          });
          const geometry = await page.evaluate(() => {
            const main = document.querySelector("main")!;
            const rect = main.getBoundingClientRect();
            const visible = (selector: string) => {
              const el = document.querySelector(selector);
              return !!el && getComputedStyle(el).display !== "none";
            };
            const escaped = [...main.querySelectorAll("*")]
              .filter((el) => {
                const box = el.getBoundingClientRect();
                if (!box.width || !box.height || getComputedStyle(el).position === "fixed")
                  return false;
                // Intentional local scrolling (tables/tabs) is allowed.
                for (
                  let parent = el.parentElement;
                  parent && parent !== main;
                  parent = parent.parentElement
                ) {
                  if (/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowX))
                    return false;
                }
                return box.right > rect.right + 1 || box.left < rect.left - 1;
              })
              .slice(0, 8)
              .map((el) => ({
                tag: el.tagName,
                className: el.className.toString(),
                text: el.textContent?.slice(0, 70),
              }));
            return {
              documentWidth: document.documentElement.scrollWidth,
              bodyWidth: document.body.scrollWidth,
              mainWidth: rect.width,
              mainCount: document.querySelectorAll("#client-main-content").length,
              desktop: visible(".client-desktop-sidebar"),
              mobile: visible(".client-mobile-header"),
              bottomNav: visible(".client-mobile-bottom-nav"),
              escaped,
            };
          });
          const file = path.join(destination, `${state}.png`);
          const bytes = await page.screenshot({
            path: file,
            animations: "disabled",
            caret: "hide",
            scale: "css",
          });
          const repeat = await page.screenshot({
            animations: "disabled",
            caret: "hide",
            scale: "css",
          });
          if (digest(bytes) !== digest(repeat))
            fs.writeFileSync(path.join(destination, `${state}-unstable-repeat.png`), repeat);
          const defects: string[] = [];
          if (
            geometry.documentWidth > viewport.width ||
            geometry.bodyWidth > viewport.width ||
            geometry.escaped.length
          )
            defects.push("horizontal-overflow");
          if (
            geometry.desktop !== viewport.width >= 1024 ||
            geometry.mobile !== viewport.width < 1024 ||
            geometry.bottomNav !== viewport.width < 1024
          )
            defects.push("navigation-visibility");
          if (geometry.mainCount !== 1 || geometry.mainWidth <= 0)
            defects.push("missing-or-duplicated-main");
          if (digest(bytes) !== digest(repeat)) defects.push("unstable-capture");
          let bottomFile;
          if (["healthy", "long-text", "high-volume"].includes(state)) {
            await page.evaluate(() => {
              const main = document.querySelector("main")!;
              for (let node: HTMLElement | null = main; node; node = node.parentElement) {
                if (
                  node.scrollHeight > node.clientHeight &&
                  /auto|scroll/.test(getComputedStyle(node).overflowY)
                )
                  node.scrollTop = node.scrollHeight;
              }
            });
            bottomFile = path.join(destination, `${state}-bottom.png`);
            await page.screenshot({
              path: bottomFile,
              animations: "disabled",
              caret: "hide",
              scale: "css",
            });
          }
          let baselineStatus = "NOT VERIFIED — no reviewed synthetic baseline supplied";
          let baselineComparison;
          if (process.env.CUI19_REVIEWED_BASELINES) {
            const baselineRoot = path.resolve(process.env.CUI19_REVIEWED_BASELINES);
            const review = JSON.parse(
              fs.readFileSync(path.join(baselineRoot, "review.json"), "utf8"),
            );
            const manifest = JSON.parse(
              fs.readFileSync(path.join(artifacts, "fixture-manifest.json"), "utf8"),
            );
            if (
              review.scope !== "synthetic-component" ||
              !review.reviewedBy ||
              review.fontSHA256 !== manifest.font.sha256 ||
              review.platform !== process.platform ||
              review.chromiumVersion !== context.browser()!.version()
            )
              throw new Error("Reviewed baseline capture conditions do not match");
            const golden = path.join(
              baselineRoot,
              screen.id,
              String(viewport.width),
              `${state}.png`,
            );
            const expected = await sharp(golden)
              .removeAlpha()
              .raw()
              .toBuffer({ resolveWithObject: true });
            if (expected.info.width !== viewport.width || expected.info.height !== viewport.height)
              throw new Error("Reviewed baseline dimensions differ; resizing forbidden");
            baselineComparison = compareRgbPixels(
              await sharp(bytes).removeAlpha().raw().toBuffer(),
              expected.data,
              viewport.width,
              viewport.height,
            );
            baselineStatus = baselineComparison.changedPixels ? "DEFECT" : "PASS";
            if (baselineComparison.changedPixels) defects.push("reviewed-screenshot-regression");
          }
          const result = {
            state,
            status: defects.length ? "DEFECT" : "PASS",
            scope: "synthetic layout/capture only",
            file,
            bottomFile,
            sha256: digest(bytes),
            geometry,
            defects,
            baselineStatus,
            baselineComparison,
          };
          outcomes.push(result);
        } catch (error) {
          outcomes.push({ state, status: "BLOCKED", reason: String(error) });
        }
      }
      fs.writeFileSync(
        path.join(destination, "results.json"),
        JSON.stringify(
          {
            route: screen.route,
            viewport,
            referenceAcceptance: "NOT VERIFIED — substitute font/assets and synthetic adapters",
            outcomes,
            errors,
            blockedRequests: requests,
          },
          null,
          2,
        ),
      );
      expect(errors, "Browser runtime errors").toEqual([]);
      expect(
        outcomes.filter((outcome) => outcome.status !== "PASS"),
        "State geometry/capture failures; screenshots retained",
      ).toEqual([]);
      expect(requests, "Fixture must not request external services").toEqual([]);
    });
  }
}

for (const width of [1440, 390]) {
  test(`document upload and Client security dialog visual states ${width}px`, async ({
    page,
    context,
  }) => {
    await context.route("**/*", (route) => route.abort());
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const directory = path.join(artifacts, "dialogs", String(width));
    fs.mkdirSync(directory, { recursive: true });
    const results: Record<string, unknown>[] = [];
    for (const flow of [
      {
        route: "/client/documents",
        button: "Upload Document",
        dialog: "Upload Document",
        name: "document-upload",
      },
      {
        route: "/client/profile",
        button: "Enable 2FA",
        dialog: "Enable two-factor authentication",
        name: "client-security",
      },
    ]) {
      await mount(page, flow.route, "healthy");
      const opener = page.getByRole("button", { name: flow.button, exact: true }).first();
      await opener.focus();
      await page.screenshot({
        path: path.join(directory, flow.name + "-focus.png"),
        animations: "disabled",
        caret: "hide",
      });
      await opener.click();
      const dialog = page.getByRole("dialog", { name: flow.dialog, exact: true });
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds).toBeTruthy();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
      await page.screenshot({
        path: path.join(directory, flow.name + ".png"),
        animations: "disabled",
        caret: "hide",
      });
      results.push({
        route: flow.route,
        dialog: flow.dialog,
        status: "PASS",
        scope: "synthetic named dialog containment/focus screenshots",
        bounds,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
    fs.writeFileSync(path.join(directory, "results.json"), JSON.stringify(results, null, 2));
  });
}

test("approved references — same-scale candidate comparison, never mobile rescaling", async ({
  page,
  context,
}) => {
  await context.route("**/*", (route) => route.abort());
  const manifest = JSON.parse(
    fs.readFileSync(path.join(artifacts, "fixture-manifest.json"), "utf8"),
  );
  const comparisons: Record<string, unknown>[] = [];
  const destination = path.join(artifacts, "reference-comparisons");
  fs.mkdirSync(destination, { recursive: true });
  for (const screen of visualRoutes) {
    const reference = manifest.references.find(
      (ref: { file: string }) => ref.file === screen.id + ".jpg",
    );
    expect(reference).toBeTruthy();
    await page.setViewportSize({ width: reference.width, height: reference.height });
    await mount(page, screen.route, "healthy");
    const actual = await page.screenshot({
      path: path.join(destination, screen.id + "-actual.png"),
      animations: "disabled",
      caret: "hide",
    });
    const approved = fs.readFileSync(
      path.join("doc/ui-reference/client/references", reference.file),
    );
    // BODY-only references reject the light sidebar. Crop both at the same
    // source-scale content boundary; retain the originals without alteration.
    const left = reference.bodyOnly ? 260 : 0;
    const extract = { left, top: 0, width: reference.width - left, height: reference.height };
    const a = await sharp(approved).extract(extract).removeAlpha().raw().toBuffer();
    const b = await sharp(actual).extract(extract).removeAlpha().raw().toBuffer();
    const diff = Buffer.alloc(a.length);
    for (let i = 0; i < a.length; i++) diff[i] = Math.abs(a[i] - b[i]);
    const pixels = compareRgbPixels(b, a, extract.width, extract.height);
    await sharp(diff, { raw: { width: extract.width, height: extract.height, channels: 3 } })
      .png()
      .toFile(path.join(destination, screen.id + "-difference.png"));
    await sharp({
      create: {
        width: extract.width * 2,
        height: extract.height,
        channels: 3,
        background: "white",
      },
    })
      .composite([
        { input: await sharp(approved).extract(extract).png().toBuffer(), left: 0, top: 0 },
        {
          input: await sharp(actual).extract(extract).png().toBuffer(),
          left: extract.width,
          top: 0,
        },
      ])
      .png()
      .toFile(path.join(destination, screen.id + "-side-by-side.png"));
    comparisons.push({
      route: screen.route,
      reference,
      crop: extract,
      resized: false,
      pixels,
      status: "NOT VERIFIED",
      reason:
        "Diagnostic comparison: synthetic content, substitute font and absent approved CMS assets; no threshold approval inferred",
    });
  }
  fs.writeFileSync(path.join(destination, "results.json"), JSON.stringify(comparisons, null, 2));
  expect(comparisons).toHaveLength(12);
});
