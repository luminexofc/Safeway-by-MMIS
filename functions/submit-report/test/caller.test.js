import test from "node:test";
import assert from "node:assert/strict";
import { JWT_HEADER, readBearer, resolveCaller, unauthorized } from "../src/caller.js";

// A fake Appwrite account service. `get()` is what the real SDK calls after
// the JWT is attached, so it is the only thing that decides the caller.
function fakeAccount({ resolvesTo, throws = false }) {
  return (client) => ({
    async get() {
      if (throws) throw new Error("401 unauthorized");
      return { $id: resolvesTo };
    },
    _client: client,
  });
}

function fakeClient(jwt) {
  return { jwt };
}

test("readBearer: reads the dedicated header", () => {
  assert.equal(readBearer({ headers: { [JWT_HEADER]: "abc.def.ghi" } }), "abc.def.ghi");
});

test("readBearer: falls back to a Bearer Authorization header", () => {
  assert.equal(readBearer({ headers: { authorization: "Bearer abc.def.ghi" } }), "abc.def.ghi");
  assert.equal(readBearer({ headers: { authorization: "bearer   abc" } }), "abc");
});

test("readBearer: rejects junk, empty and non-Bearer schemes", () => {
  assert.equal(readBearer({ headers: {} }), null);
  assert.equal(readBearer({ headers: { authorization: "" } }), null);
  assert.equal(readBearer({ headers: { authorization: "abc.def" } }), null);
  assert.equal(readBearer({ headers: { authorization: "Basic dXNlcjpwYXNz" } }), null);
  assert.equal(readBearer({ headers: { authorization: "Bearer " } }), null);
  assert.equal(readBearer({}), null);
});

test("resolveCaller: no credential means no session", async () => {
  const caller = await resolveCaller({ headers: {} }, {
    clientFactory: fakeClient,
    accountFactory: fakeAccount({ resolvesTo: "u1" }),
  });
  assert.deepEqual(caller, { userId: null, reason: "missing" });
});

test("resolveCaller: a claimed x-appwrite-user-id header is not identity", async () => {
  // The whole point of the fix: a caller-supplied id header must be ignored.
  const caller = await resolveCaller(
    { headers: { "x-appwrite-user-id": "victim" } },
    { clientFactory: fakeClient, accountFactory: fakeAccount({ resolvesTo: "u1" }) },
  );
  assert.deepEqual(caller, { userId: null, reason: "missing" });
});

test("resolveCaller: identity is whatever the platform resolves for the JWT", async () => {
  const caller = await resolveCaller(
    { headers: { [JWT_HEADER]: "good.jwt.token", "x-appwrite-user-id": "victim" } },
    { clientFactory: fakeClient, accountFactory: fakeAccount({ resolvesTo: "real-user" }) },
  );
  assert.deepEqual(caller, { userId: "real-user", reason: "ok" });
});

test("resolveCaller: the JWT is what gets attached to the verification client", async () => {
  let seen = null;
  await resolveCaller(
    { headers: { [JWT_HEADER]: "my.jwt.token" } },
    {
      clientFactory: (jwt) => {
        seen = jwt;
        return { jwt };
      },
      accountFactory: fakeAccount({ resolvesTo: "u1" }),
    },
  );
  assert.equal(seen, "my.jwt.token");
});

test("resolveCaller: a rejected JWT is invalid, never a fallback identity", async () => {
  const caller = await resolveCaller(
    { headers: { [JWT_HEADER]: "bad.jwt.token", "x-appwrite-user-id": "victim" } },
    { clientFactory: fakeClient, accountFactory: fakeAccount({ throws: true }) },
  );
  assert.deepEqual(caller, { userId: null, reason: "invalid" });
});

test("resolveCaller: a resolved account without an id is invalid", async () => {
  const caller = await resolveCaller(
    { headers: { [JWT_HEADER]: "good.jwt.token" } },
    { clientFactory: fakeClient, accountFactory: fakeAccount({ resolvesTo: undefined }) },
  );
  assert.deepEqual(caller, { userId: null, reason: "invalid" });
});

test("unauthorized: sends 401 with a sign-in message, never a stack trace", () => {
  const calls = [];
  const res = { json: (body, status) => calls.push({ body, status }) };
  unauthorized(res, "missing");
  unauthorized(res, "invalid");
  assert.equal(calls[0].status, 401);
  assert.equal(calls[1].status, 401);
  assert.match(calls[0].body.error, /sign in/i);
  assert.match(calls[1].body.error, /session/i);
});
