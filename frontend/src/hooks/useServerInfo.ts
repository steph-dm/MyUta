import { useQuery } from "@apollo/client";
import { SERVER_INFO } from "@/graphql/account";

const FALLBACK = {
  ocrEnabled: false,
  youtubeSearchEnabled: false,
  mailEnabled: false,
  passwordMinLength: 12,
  passwordMaxBytes: 72,
  maxUploadBytes: 10 * 1024 * 1024,
  maxImportRows: 5000,
  machines: [],
};

/** Capabilities of the server; optional features are hidden when disabled. */
export function useServerInfo() {
  const { data } = useQuery(SERVER_INFO, { fetchPolicy: "cache-first" });
  return data?.serverInfo ?? FALLBACK;
}
