export type RecoveryParameters = {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  type?: string;
  error?: string;
};

export function parseRecoveryParameters(url: string): RecoveryParameters {
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");
  const query =
    queryStart >= 0
      ? url.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined)
      : "";
  const hash = hashStart >= 0 ? url.slice(hashStart + 1) : "";
  const parameters = new URLSearchParams([query, hash].filter(Boolean).join("&"));

  return {
    accessToken: parameters.get("access_token") ?? undefined,
    refreshToken: parameters.get("refresh_token") ?? undefined,
    code: parameters.get("code") ?? undefined,
    type: parameters.get("type") ?? undefined,
    error:
      parameters.get("error_description") ??
      parameters.get("error") ??
      undefined,
  };
}
