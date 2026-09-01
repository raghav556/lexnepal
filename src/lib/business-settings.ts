function cleanSetting(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function resolvePublicContact(settings?: Record<string, unknown>) {
  const phone = cleanSetting(settings?.phone);
  const email = cleanSetting(settings?.email);
  const lines = [phone ? `Phone: ${phone}` : "", email ? `Email: ${email}` : ""].filter(Boolean);

  return lines.length > 0
    ? lines.join("\n")
    : "Verified phone and email details are available on our Contact page.";
}
