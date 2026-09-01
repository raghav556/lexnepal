import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FirmBrand, shouldDisplayFirmLogo } from "../../src/components/branding/firm-brand";
import { pickPortalBranding } from "../../src/lib/portal-branding";

describe("dynamic firm branding", () => {
  it("renders the published logo and firm name", () => {
    const markup = renderToStaticMarkup(
      createElement(FirmBrand, {
        firmName: "Example Legal",
        logoUrl: "/api/v1/public/cms/assets/logo-id",
        subtitle: "Client Portal",
      }),
    );

    expect(markup).toContain('src="/api/v1/public/cms/assets/logo-id"');
    expect(markup).toContain("Example Legal");
    expect(markup).toContain("Client Portal");
  });

  it("falls back only for the failed URL and accepts a newly published logo", () => {
    expect(shouldDisplayFirmLogo("/logo-old.png", "/logo-old.png")).toBe(false);
    expect(shouldDisplayFirmLogo("/logo-new.png", "/logo-old.png")).toBe(true);
    expect(shouldDisplayFirmLogo("", undefined)).toBe(false);
  });

  it("maps the favicon alongside the logo without altering stored settings", () => {
    expect(
      pickPortalBranding({
        firmName: "Example Legal",
        logoUrl: "/logo.png",
        faviconUrl: "/favicon.png",
      }),
    ).toMatchObject({
      firmName: "Example Legal",
      logoUrl: "/logo.png",
      faviconUrl: "/favicon.png",
    });
  });

  it("wires one reusable brand into every required application surface", () => {
    const portalLayouts = [
      "src/app/(admin)/layout.tsx",
      "src/app/(staff)/layout.tsx",
      "src/app/(client)/layout.tsx",
    ];
    for (const file of portalLayouts) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("<PortalFirmBrand");
      expect(source, file).not.toMatch(/>\s*Srimar Law\s*</);
    }

    const signIn = readFileSync("src/views/auth/SignInPage.tsx", "utf8");
    const publicShell = readFileSync("src/app/(public)/public-layout-shell.tsx", "utf8");
    const pageShell = readFileSync("src/components/dashboard/portal-page-shell.tsx", "utf8");
    expect(signIn).toContain("<FirmBrand");
    expect(publicShell.match(/<FirmBrand/g)).toHaveLength(3);
    expect(pageShell).toContain("<FirmBrand");
  });

  it("publishes uploaded settings assets immediately and keeps pasted URLs explicit", () => {
    const editor = readFileSync("src/views/admin/cms/AdminCMSDashboard.tsx", "utf8");
    const upload = readFileSync("src/components/cms/CmsImageUploadField.tsx", "utf8");
    expect(editor.match(/onUploadComplete=/g)).toHaveLength(3);
    expect(editor).toContain('publishBrandAsset("logoUrl"');
    expect(editor).toContain('publishBrandAsset("faviconUrl"');
    expect(editor).toContain('publishBrandAsset("heroImageUrl"');
    expect(upload).toContain("Save the form to publish it.");
    expect(upload).toContain("The previous published asset is unchanged.");
  });

  it("serves protected CMS images through the same-origin route instead of a CSP-blocked redirect", () => {
    const route = readFileSync("src/app/api/v1/public/cms/assets/[assetId]/route.ts", "utf8");
    expect(route).toContain("getPublicAssetDelivery");
    expect(route).toContain('"cross-origin-resource-policy": "same-origin"');
    expect(route).toContain("new Response(asset.bytes");
  });
});
