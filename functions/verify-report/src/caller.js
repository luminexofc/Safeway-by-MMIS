import { Account, Client } from "node-appwrite";

// Caller identity for both functions.
//
// The session JWT is the only accepted credential. Appwrite validates it and
// resolves the account, so the id comes back from the platform rather than
// from anything the caller can type. x-appwrite-user-id is deliberately NOT
// trusted: it is an inbound request header, and the SDK lets a caller set
// arbitrary execution headers, so using it would let any signed-in user act
// as anyone else.

export const NO_SESSION = { userId: null, reason: "missing" };
export const BAD_SESSION = { userId: null, reason: "invalid" };

const BEARER = /^Bearer[ ]+([A-Za-z0-9\-_.]+)$/i;

// The client sends the JWT in a dedicated header. Authorization is also
// accepted as a fallback, but a custom name is safer: some platforms reserve
// or rewrite Authorization on function executions, which would silently drop
// the credential and break sign-in.
export const JWT_HEADER = "x-safeway-jwt";

function header(req, name) {
  const headers = req?.headers ?? {};
  const direct = headers[name];
  if (typeof direct === "string") return direct;
  const lower = headers[name.toLowerCase()];
  return typeof lower === "string" ? lower : undefined;
}

// Returns the JWT string from the execution headers, or null.
export function readBearer(req) {
  const custom = header(req, JWT_HEADER);
  if (custom) return custom.trim() || null;
  const auth = header(req, "authorization");
  if (typeof auth !== "string") return null;
  const match = BEARER.exec(auth.trim());
  return match ? match[1] : null;
}

// Resolve the caller from the request. Never falls back to a self-reported id.
// `clientFactory` is injected so tests can supply a fake.
export async function resolveCaller(req, { clientFactory, accountFactory } = {}) {
  const jwt = readBearer(req);
  if (!jwt) return NO_SESSION;

  const makeClient = clientFactory ?? platformClient;
  const makeAccount = accountFactory ?? ((client) => new Account(client));
  try {
    const account = makeAccount(makeClient(jwt));
    const user = await account.get();
    if (!user?.$id) return BAD_SESSION;
    return { userId: user.$id, reason: "ok" };
  } catch {
    // Expired, tampered, or issued for a logged-out session.
    return BAD_SESSION;
  }
}

function platformClient(jwt) {
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setJWT(jwt);
}

// Shared 401 body so both functions answer identically.
export function unauthorized(res, reason = "invalid") {
  return res.json(
    {
      error:
        reason === "missing"
          ? "Sign in to continue."
          : "Your session is no longer valid. Sign in again.",
    },
    401,
  );
}
