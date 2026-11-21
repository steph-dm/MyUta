import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print, type GraphQLFormattedError } from "graphql";
import { CLIENT_HEADER, GRAPHQL_URL } from "./apollo";
import { UploadError } from "./errors";

/**
 * Runs a mutation with one file, following the GraphQL multipart request spec.
 * Throws UploadError for GraphQL errors (handled like Apollo errors by lib/errors).
 */
export async function uploadMutation<TData, TVars extends Record<string, unknown>>(
  document: TypedDocumentNode<TData, TVars>,
  variables: Omit<TVars, keyof TVars> & Record<string, unknown>,
  fileVariable: keyof TVars & string,
  file: File,
): Promise<TData> {
  const body = new FormData();
  body.append(
    "operations",
    JSON.stringify({ query: print(document), variables: { ...variables, [fileVariable]: null } }),
  );
  body.append("map", JSON.stringify({ 0: [`variables.${fileVariable}`] }));
  body.append("0", file, file.name);
  let res: Response;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      credentials: "include",
      headers: CLIENT_HEADER,
      body,
    });
  } catch {
    throw new UploadError([{ message: "Network error", extensions: { code: "NETWORK_ERROR" } }]);
  }
  const json = (await res.json().catch(() => ({}))) as {
    data?: TData;
    errors?: GraphQLFormattedError[];
  };
  if (json.errors?.length) throw new UploadError(json.errors);
  if (!json.data)
    throw new UploadError([
      { message: "Upload failed", extensions: { code: "INTERNAL_SERVER_ERROR" } },
    ]);
  return json.data;
}
