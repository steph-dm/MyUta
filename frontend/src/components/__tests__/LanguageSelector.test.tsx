import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
import LanguageSelector from "../LanguageSelector";

describe("LanguageSelector", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("always shows both languages and marks the active one", () => {
    render(<LanguageSelector />);

    expect(screen.getByRole("radio", { name: "🇺🇸 English" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "🇯🇵 日本語" })).not.toBeChecked();
  });

  it("changes the application language", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);

    await user.click(screen.getByRole("radio", { name: "🇯🇵 日本語" }));

    expect(i18n.resolvedLanguage).toBe("ja");
    expect(screen.getByRole("radiogroup", { name: "言語" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "🇯🇵 日本語" })).toBeChecked();
  });
});
