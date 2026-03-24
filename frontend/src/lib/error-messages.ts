import type { TFunction } from "i18next";

const ERROR_MAP: [RegExp, string][] = [
  [/invalid email or password/i, "errors.api.invalidCredentials"],
  [/email already in use/i, "errors.api.emailTaken"],
  [/name already taken/i, "errors.api.nameTaken"],
  [/current password is incorrect/i, "errors.api.wrongCurrentPassword"],
  [/password is incorrect/i, "errors.api.wrongPassword"],
  [/account has been deactivated/i, "errors.api.accountDeactivated"],
  [/not authorized/i, "errors.api.notAuthorized"],
  [/not found/i, "errors.api.notFound"],
  [/password must be at least 12/i, "errors.api.passwordTooShort"],
  [/password cannot exceed/i, "errors.api.passwordTooLong"],
  [/password must contain.*lowercase/i, "errors.api.passwordNeedsLowercase"],
  [/password must contain.*uppercase/i, "errors.api.passwordNeedsUppercase"],
  [/password must contain.*number/i, "errors.api.passwordNeedsNumber"],
  [/password must contain.*special/i, "errors.api.passwordNeedsSpecial"],
  [/invalid email format/i, "errors.api.invalidEmail"],
  [/name must be between/i, "errors.api.nameLength"],
  [/must be at least 13/i, "errors.api.tooYoung"],
  [/import data cannot exceed/i, "errors.api.importTooLarge"],
  [/score must be between/i, "errors.api.scoreRange"],
  [/invalid date/i, "errors.api.invalidDate"],
];

export function translateError(message: string, t: TFunction): string {
  for (const [pattern, key] of ERROR_MAP) {
    if (pattern.test(message)) {
      return t(key, { ns: "common" });
    }
  }
  return t("errors.generic", { ns: "common" });
}
