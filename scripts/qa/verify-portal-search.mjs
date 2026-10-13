import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Called by the existing isolated shell builder; never contacts a live server.
export async function verifyPortalSearch({ browser, js, css, artifacts, phase, artifactRoot }) {
  const rows = [];
  const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
  for (const portal of phase === "before" ? ["client"] : ["staff", "admin", "client"]) {
    for (const dark of [false, true]) {
      for (const width of portal === "client" ? [360, 1440] : [360, 390, 768, 1024, 1440]) {
        const name = `search-${portal}-${dark ? "dark" : "light"}-${width}`;
        const context = await browser.newContext({
          viewport: { width, height: 844 },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const row = { portal, dark, width, errors: [], network: [], pages: [], actions: [] };
        rows.push(row);
        page.on("pageerror", (error) => row.errors.push(error.message));
        await context.route("**/*", (route) => {
          if (route.request().url().startsWith("https://search.invalid/")) {
            return route.fulfill({
              contentType: "text/html",
              body: '<!doctype html><html lang="en"><head><title>Search QA</title></head><body><div id="root"></div></body></html>',
            });
          }
          row.network.push(route.request().url());
          return route.abort();
        });
        try {
          await page.goto(`https://search.invalid/${portal}`);
          await page.clock.setFixedTime(new Date("2026-09-18T04:15:00Z"));
          await page.addStyleTag({ content: css });
          // The frozen Client animation path is untouched. Compare settled paint,
          // not the arbitrary frame captured during its opening transition.
          await page.addStyleTag({
            content:
              "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
          });
          await page.addScriptTag({ content: js });
          await page.evaluate(
            ({ portal, dark }) => {
              document.documentElement.classList.toggle("dark", dark);
              window.open = (url) => {
                window.searchExternal = String(url);
                return null;
              };
              window.renderSearchFixture(portal);
            },
            { portal, dark },
          );
          const opener = page.getByRole("button", { name: "Open search", exact: true });
          const dialog = page.getByRole("dialog", { name: "Global Search and Command Palette" });
          const input = page.getByRole(
            portal === "client" || phase === "before" ? "textbox" : "combobox",
            { name: "Search query" },
          );
          const results = () => dialog.locator("[data-index]");
          const titles = () => results().locator("span.truncate").allTextContents();
          async function open() {
            await opener.click();
            await expect(input).toBeFocused();
          }
          async function capture(state) {
            if (portal !== "client") {
              if (phase === "after" && [360, 1440].includes(width) && state === "all")
                await page.screenshot({ path: path.join(artifacts, name + "-all.png") });
              return;
            }
            const png = await page.screenshot({
              path: path.join(artifacts, name + "-" + state + ".png"),
            });
            if (phase === "after") {
              const old = fs.readFileSync(
                path.join(artifactRoot, "before", name + "-" + state + ".png"),
              );
              assert.equal(sha(png), sha(old), "Client search rendering changed");
            }
          }
          await open();
          await capture("all");
          await input.fill("unmatched-search-qa");
          await expect(dialog.getByText("No results found")).toBeVisible();
          await capture("empty");
          await input.fill("");
          if (phase === "after" && portal !== "client") {
            const pagesTab = dialog.getByRole("button", { name: "Pages", exact: true });
            await pagesTab.focus();
            await pagesTab.press("Enter");
            await expect(pagesTab).toHaveAttribute("aria-pressed", "true");
          }
          await dialog.getByRole("button", { name: "Pages", exact: true }).click();
          row.pages = await titles();
          await capture("pages");
          if (phase === "after" && portal !== "client") {
            assert(row.pages.length > 1, "Arrow traversal needs multiple results");
            await input.focus();
            await input.press("ArrowUp");
            await expect(results().last()).toHaveAttribute("aria-selected", "true");
            await input.press("ArrowDown");
            await expect(results().first()).toHaveAttribute("aria-selected", "true");
          }
          // Select every page through the real component and inspect browser history.
          for (const title of width === 1440 ? row.pages : row.pages.slice(0, 1)) {
            await input.fill(title);
            await results().filter({ hasText: title }).first().click();
            const destination = new URL(page.url()).pathname;
            row.pageDestinations ??= [];
            row.pageDestinations.push(destination);
            if (phase === "after")
              assert(destination === `/${portal}` || destination.startsWith(`/${portal}/`));
            await expect(dialog).toBeHidden();
            await open();
            await dialog.getByRole("button", { name: "Pages", exact: true }).click();
          }
          await input.fill("");
          await dialog.getByRole("button", { name: /^(?:Cases|Matters) \(/ }).click();
          await expect(results().first()).toBeVisible();
          await capture("cases");
          await input.focus();
          await input.press("ArrowUp");
          if (phase === "after" && portal !== "client") {
            await expect(results().last()).toHaveAttribute("aria-selected", "true");
            await expect(input).toHaveAttribute(
              "aria-activedescendant",
              await results().last().getAttribute("id"),
            );
          }
          await input.press("ArrowDown");
          if (phase === "after" && portal !== "client")
            await expect(results().first()).toHaveAttribute("aria-selected", "true");
          await input.press("Enter");
          assert(new URL(page.url()).pathname.startsWith(`/${portal}/cases/`), "Case portal base");
          await open();
          if (portal !== "client") {
            await dialog.getByRole("button", { name: /^Clients \(/ }).click();
            await results().first().click();
            if (phase === "after") assert.equal(new URL(page.url()).pathname, `/${portal}/clients`);
            await open();
          }
          await dialog.getByRole("button", { name: "Actions", exact: true }).click();
          row.actions = await titles();
          const expected =
            portal === "client"
              ? {
                  "Message Legal Team": "/client/messages",
                  "Book Appointment": "/client/booking",
                  "View Documents": "/client/documents",
                }
              : {
                  "Create New Client": `/${portal}/clients`,
                  "Create New Case": `/${portal}/cases?create=1`,
                  "Schedule Appointment": `/${portal}/appointments`,
                  ...(portal === "admin"
                    ? { "Generate Court Filing / Agreement": "/admin/document-generator" }
                    : {}),
                  "Preview Live Public Website": "/",
                };
          if (phase === "after")
            assert.deepEqual([...row.actions].sort(), Object.keys(expected).sort());
          for (const [title, destination] of width === 1440
            ? Object.entries(expected)
            : Object.entries(expected).slice(0, 1)) {
            await input.fill(title);
            await input.press("Enter");
            if (phase === "after") {
              const actual = title.startsWith("Preview")
                ? await page.evaluate(() => window.searchExternal)
                : new URL(page.url()).pathname + new URL(page.url()).search;
              assert.equal(actual, destination, title);
            }
            await open();
            await dialog.getByRole("button", { name: "Actions", exact: true }).click();
          }
          await input.fill("conflict");
          if (phase === "after" && portal !== "client") await expect(results()).toHaveCount(0);
          await input.fill("");
          await input.focus();
          if (phase === "after" && portal !== "client") {
            await input.press("Shift+Tab");
            assert(
              await dialog.evaluate((node) => node.contains(document.activeElement)),
              "Reverse focus trap",
            );
            await page.keyboard.press("Tab");
            assert(
              await dialog.evaluate((node) => node.contains(document.activeElement)),
              "Forward focus trap",
            );
            const audit = await new AxeBuilder({ page })
              .include('[role="dialog"]')
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze();
            row.axe = audit.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              targets: v.nodes.map((n) => n.target),
            }));
            assert.equal(
              row.axe.filter((v) => ["serious", "critical"].includes(v.impact)).length,
              0,
              JSON.stringify(row.axe),
            );
          }
          await input.focus();
          await input.press("Escape");
          await expect(dialog).toBeHidden();
          if (phase === "after" && portal !== "client") await expect(opener).toBeFocused();
          assert(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            "Horizontal page overflow",
          );
          assert.equal(row.errors.length, 0, JSON.stringify(row.errors));
          assert.equal(row.network.length, 0, "Unexpected network");
          row.status = "passed";
        } catch (error) {
          row.status = "failed";
          row.error = error.stack;
          await page.screenshot({ path: path.join(artifacts, name + "-failure.png") });
        } finally {
          await context.close();
        }
        console.log(`${row.status}: ${name}${row.error ? " — " + row.error.split("\n")[0] : ""}`);
      }
    }
  }
  fs.writeFileSync(path.join(artifacts, "search-results.json"), JSON.stringify(rows, null, 2));
  assert(
    rows.every((row) => row.status === "passed"),
    "Search QA failed; inspect search-results.json",
  );
}
