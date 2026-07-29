import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRecoveryParameters } from "../src/auth-url.ts";

test("parses implicit recovery credentials from a URL fragment", () => {
  assert.deepEqual(
    parseRecoveryParameters(
      "symptomstory://?recovery=password#access_token=access&refresh_token=refresh&type=recovery",
    ),
    {
      accessToken: "access",
      refreshToken: "refresh",
      code: undefined,
      type: "recovery",
      error: undefined,
    },
  );
});

test("parses a PKCE recovery code and provider errors", () => {
  assert.equal(
    parseRecoveryParameters("symptomstory://?type=recovery&code=one-time-code")
      .code,
    "one-time-code",
  );
  assert.equal(
    parseRecoveryParameters(
      "symptomstory://?type=recovery&error_description=Link%20expired",
    ).error,
    "Link expired",
  );
});
