// Single Appwrite entry point for the verification console.
// Operators sign in here; the `operators` team gates every console route.
import { Account, Client, Functions, Query, Storage, TablesDB, Teams } from "appwrite";

export const DATABASE_ID = "safeway";
export const TABLES = {
  divisions: "divisions",
  districts: "districts",
  profiles: "profiles",
  reports: "reports",
  auditEvents: "audit_events",
};
export const BUCKET = { reportPhotos: "report-photos" };
export const OPERATORS_TEAM = "operators";

export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1")
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID ?? "");

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
export { Query };

// Call a function and parse its JSON body. Throws Error with the server's message.
export async function callFunction(functionId, body = {}) {
  const execution = await functions.createExecution({
    functionId,
    body: JSON.stringify(body),
    method: "POST",
  });
  let data = {};
  try {
    data = execution?.responseBody ? JSON.parse(execution.responseBody) : {};
  } catch {
    data = { error: "Unexpected response from the server." };
  }
  if (!execution || execution.responseStatusCode >= 400) {
    throw new Error(data?.error ?? `Request failed (${execution?.responseStatusCode ?? "no response"})`);
  }
  return data;
}

// True when the signed-in user belongs to the operators team.
export async function isOperator(userId) {
  try {
    const list = await new Teams(client).listMemberships({
      teamId: OPERATORS_TEAM,
      queries: [Query.equal("userId", userId), Query.equal("confirm", true)],
      total: false,
    });
    return list.memberships.length > 0;
  } catch {
    return false;
  }
}
