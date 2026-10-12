import { expect, it } from "vitest";
import { confirmationEmail } from "@/server/email";

it("escapes user content in the email HTML", () => {
  const { html, text, subject } = confirmationEmail(
    { id: "abcdef123456", fullName: "Ada <script>x</script>", item: `"><img src=x onerror=1>`, price: 9500, vendorName: "V&Co", nomination: "" } as never,
    "https://promo.example", "help@locoomo.com",
  );
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img src=x");
  expect(html).toContain("V&amp;Co");
  expect(html).toContain("₦9,500");
  expect(text).toContain("Please don't buy anything");
  expect(subject).toMatch(/received/);
});
