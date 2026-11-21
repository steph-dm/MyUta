import { ApolloError } from "@apollo/client";
import type { GraphQLFormattedError } from "graphql";
import type { TFunction } from "i18next";

/** One error as sent by the API (extensions.code / reason / field). */
export interface ApiError {
  message: string;
  code?: string;
  reason?: string;
  field?: string;
  extensions: Record<string, unknown>;
}

/** Error thrown by the upload helper (same shape as ApolloError.graphQLErrors). */
export class UploadError extends Error {
  constructor(public readonly errors: readonly GraphQLFormattedError[]) {
    super(errors[0]?.message ?? "Upload failed");
  }
}

function fromFormatted(e: GraphQLFormattedError): ApiError {
  const ext = (e.extensions ?? {}) as Record<string, unknown>;
  return {
    message: e.message,
    code: typeof ext.code === "string" ? ext.code : undefined,
    reason: typeof ext.reason === "string" ? ext.reason : undefined,
    field: typeof ext.field === "string" ? ext.field : undefined,
    extensions: ext,
  };
}

/** Extracts API errors from anything a mutation/query can throw. */
export function apiErrors(err: unknown): ApiError[] {
  if (err instanceof UploadError) return err.errors.map(fromFormatted);
  if (err instanceof ApolloError) {
    if (err.graphQLErrors.length) return err.graphQLErrors.map(fromFormatted);
    const result = (err.networkError as { result?: { errors?: GraphQLFormattedError[] } } | null)
      ?.result;
    if (result?.errors?.length) return result.errors.map(fromFormatted);
    if (err.networkError) return [{ message: err.message, code: "NETWORK_ERROR", extensions: {} }];
  }
  return [];
}

export const errorCode = (err: unknown) => apiErrors(err)[0]?.code;
export const errorReason = (err: unknown) => apiErrors(err)[0]?.reason;

/**
 * Translates an error for display, by reason first, then by code. The
 * server's English message is never parsed.
 */
export function errorMessage(err: unknown, t: TFunction): string {
  const e = apiErrors(err)[0];
  if (!e) return t("common:errors.generic");
  if (e.reason && t(`common:errors.reasons.${e.reason}`, { defaultValue: "" })) {
    return t(`common:errors.reasons.${e.reason}`, { seconds: e.extensions.retryAfterSeconds });
  }
  if (e.code === "RATE_LIMITED") {
    return t("common:errors.codes.RATE_LIMITED", { seconds: e.extensions.retryAfterSeconds ?? 60 });
  }
  if (e.code && t(`common:errors.codes.${e.code}`, { defaultValue: "" })) {
    return t(`common:errors.codes.${e.code}`, {
      maxMb: Math.round(Number(e.extensions.maxBytes ?? 0) / 1048576),
    });
  }
  return t("common:errors.generic");
}

/** Field-level messages, keyed by extensions.field (for showing next to inputs). */
export function fieldErrors(err: unknown, t: TFunction): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of apiErrors(err)) {
    if (e.field && (e.code === "BAD_USER_INPUT" || e.code === "CONFLICT"))
      out[e.field] = translateOne(e, t);
  }
  return out;
}

function translateOne(e: ApiError, t: TFunction): string {
  if (e.reason) {
    const msg = t(`common:errors.reasons.${e.reason}`, { defaultValue: "" });
    if (msg) return msg;
  }
  return t("common:errors.generic");
}
