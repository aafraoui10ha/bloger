import { describe, expect, it } from "vitest";
import { getDesktopRelease, safeDownloadUrl } from "@/lib/desktop-release";

const SHA = "a".repeat(64);
const full = {
  DESKTOP_RELEASE_VERSION: "1.0.0",
  DESKTOP_RELEASE_DATE: "2026-11-01",
  DESKTOP_EXE_URL: "https://downloads.example.com/desktop/windows/x64/Toolbox_1.0.0_x64-setup.exe",
  DESKTOP_EXE_SHA256: SHA.toUpperCase(),
  DESKTOP_EXE_SIZE: "8123456",
  DESKTOP_MSI_URL: "/downloads/desktop/windows/x64/Toolbox_1.0.0_x64_en-US.msi",
  DESKTOP_MSI_SHA256: "b".repeat(64),
  DESKTOP_MSI_SIZE: "9123456",
} as unknown as NodeJS.ProcessEnv;

describe("desktop release config", () => {
  it("offers nothing until a valid release is configured", () => {
    expect(getDesktopRelease({} as NodeJS.ProcessEnv)).toBeNull();
    expect(getDesktopRelease({ ...full, DESKTOP_RELEASE_VERSION: "1.0" } as NodeJS.ProcessEnv)).toBeNull();
    expect(getDesktopRelease({ DESKTOP_RELEASE_VERSION: "1.0.0" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
  it("lists only installers with a URL, a SHA-256 and a size", () => {
    const r = getDesktopRelease(full)!;
    expect(r.version).toBe("1.0.0");
    expect(r.date).toBe("2026-11-01");
    expect(r.channel).toBe("stable");
    expect(r.installers.map((i) => i.format)).toEqual(["exe", "msi"]);
    expect(r.installers[0]!.sha256).toBe(SHA);
    const noMsiHash = getDesktopRelease({ ...full, DESKTOP_MSI_SHA256: "xyz" } as NodeJS.ProcessEnv)!;
    expect(noMsiHash.installers.map((i) => i.format)).toEqual(["exe"]);
    expect(getDesktopRelease({ ...full, DESKTOP_EXE_SIZE: "-5", DESKTOP_MSI_SIZE: "abc" } as NodeJS.ProcessEnv)).toBeNull();
  });
  it("accepts only https or same-site URLs with the right extension", () => {
    expect(safeDownloadUrl("https://cdn.example.com/a/Toolbox.exe", "exe")).toBeTruthy();
    expect(safeDownloadUrl("/downloads/Toolbox.msi", "msi")).toBeTruthy();
    expect(safeDownloadUrl("http://cdn.example.com/Toolbox.exe", "exe")).toBeNull();
    expect(safeDownloadUrl("//evil.example.com/Toolbox.exe", "exe")).toBeNull();
    expect(safeDownloadUrl("javascript:alert(1)//.exe", "exe")).toBeNull();
    expect(safeDownloadUrl("https://cdn.example.com/Toolbox.msi", "exe")).toBeNull();
    expect(safeDownloadUrl("https://cdn.example.com/Toolbox.apk", "exe")).toBeNull();
  });
  it("ignores invalid dates and unknown channels", () => {
    const r = getDesktopRelease({ ...full, DESKTOP_RELEASE_DATE: "next week", DESKTOP_RELEASE_CHANNEL: "nightly" } as NodeJS.ProcessEnv)!;
    expect(r.date).toBeNull();
    expect(r.channel).toBe("stable");
    expect(getDesktopRelease({ ...full, DESKTOP_RELEASE_CHANNEL: "beta" } as NodeJS.ProcessEnv)!.channel).toBe("beta");
  });
});
