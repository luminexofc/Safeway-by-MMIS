import test from "node:test";
import assert from "node:assert/strict";
import { AppwriteException } from "node-appwrite";
import { tightenPhotoPermissions } from "../src/main.js";

const notFound = () => new AppwriteException("Not found", 404, "general_not_found", "not_found");

// Fake storage records every call so mutation-before-verification is caught.
function fakeStorage({ files, failUpdateOn = null }) {
  const calls = [];
  return {
    calls,
    async getFile({ fileId }) {
      calls.push(`get:${fileId}`);
      if (files[fileId] === "404") throw notFound();
      return { name: `${fileId}.png`, $permissions: files[fileId] };
    },
    async updateFile({ fileId, name, permissions }) {
      calls.push(`update:${fileId}:${name}:${permissions.join("|")}`);
      if (fileId === failUpdateOn) throw new AppwriteException("boom", 500, "general_server_error", "server_error");
      files[fileId] = permissions;
    },
    async deleteFile({ fileId }) {
      calls.push(`delete:${fileId}`);
      delete files[fileId];
    },
  };
}

const OWN = 'read("user:u1")';
const TEAM = 'read("team:operators")';

test("tightenPhotoPermissions: owned files gain operator read, name preserved", async () => {
  const files = { f1: [OWN] };
  const storage = fakeStorage({ files });

  const result = await tightenPhotoPermissions(storage, "u1", ["f1"]);

  assert.equal(result, "ok");
  assert.deepEqual(files.f1, [OWN, TEAM]);
  assert.deepEqual(storage.calls, ["get:f1", `update:f1:f1.png:${OWN}|${TEAM}`]);
});

test("tightenPhotoPermissions: foreign file is rejected with no mutation", async () => {
  const files = { f1: ['read("user:u2")'] };
  const storage = fakeStorage({ files });

  assert.equal(await tightenPhotoPermissions(storage, "u1", ["f1"]), "foreign");
  assert.deepEqual(storage.calls, ["get:f1"]);
  assert.deepEqual(files.f1, ['read("user:u2")']);
});

test("tightenPhotoPermissions: missing file is reported, nothing mutated", async () => {
  const files = { f1: "404" };
  const storage = fakeStorage({ files });

  assert.equal(await tightenPhotoPermissions(storage, "u1", ["f1"]), "missing");
  assert.deepEqual(storage.calls, ["get:f1"]);
});

test("tightenPhotoPermissions: failed widen removes the caller's uploads", async () => {
  const files = { f1: [OWN], f2: [OWN] };
  const storage = fakeStorage({ files, failUpdateOn: "f2" });

  await assert.rejects(
    tightenPhotoPermissions(storage, "u1", ["f1", "f2"]),
    /boom/,
  );
  assert.deepEqual(files, {});
  assert.deepEqual(storage.calls, [
    "get:f1",
    "get:f2",
    `update:f1:f1.png:${OWN}|${TEAM}`,
    `update:f2:f2.png:${OWN}|${TEAM}`,
    "delete:f1",
    "delete:f2",
  ]);
});
