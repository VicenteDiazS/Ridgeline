export const SUPABASE_PUBLIC_CONFIG = {
  url: "https://liogrqeevozzwefnketm.supabase.co",
  publishableKey: "sb_publishable_LFaNldVgRH4iXHX3U0OVUg_nE1DiHfs",
  table: "garage_kv",
  bucket: "2019 Honda Ridgeline Main",
  bucketFallback: "2019-honda-ridgeline-main",
  signedUrlTtlSeconds: 60 * 60 * 24,
  sharedMemoryId: "ridgeline-site-memory",
  ownerEmails: ["vicente.diaz.sal@gmail.com"]
};

const SESSION_STORAGE_KEY = "ridgeline-owner-auth-session-v1";
const listeners = new Set();
let initPromise = null;

const state = {
  initialized: false,
  loading: false,
  session: null,
  user: null,
  isOwner: false,
  lastError: ""
};

function normalizedOwnerEmails() {
  return SUPABASE_PUBLIC_CONFIG.ownerEmails
    .map((email) => `${email || ""}`.trim().toLowerCase())
    .filter((email) => email && !email.startsWith("replace-with-your-owner-email"));
}

function persistSession(session) {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage persistence errors and keep the in-memory session.
  }
}

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function notifyAuthChange() {
  const snapshot = getOwnerAuthState();
  window.dispatchEvent(new CustomEvent("ridgeline:owner-auth-changed", { detail: snapshot }));
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // Ignore listener errors so auth state still propagates.
    }
  });
}

function setSession(session, user = null) {
  state.session = session || null;
  state.user = user || session?.user || null;
  state.isOwner = Boolean(
    state.user?.email &&
    normalizedOwnerEmails().includes(`${state.user.email}`.trim().toLowerCase())
  );
  persistSession(state.session);
  notifyAuthChange();
}

function clearSession() {
  setSession(null, null);
}

function authHeaders(accessToken = "") {
  return {
    apikey: SUPABASE_PUBLIC_CONFIG.publishableKey,
    Authorization: accessToken
      ? `Bearer ${accessToken}`
      : `Bearer ${SUPABASE_PUBLIC_CONFIG.publishableKey}`,
    "Content-Type": "application/json"
  };
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_PUBLIC_CONFIG.url}/auth/v1/${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      ...authHeaders(options.accessToken || ""),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.msg || payload.message || `Auth request failed: ${response.status}`);
  }

  return payload;
}

function sessionExpired(session) {
  const expiresAt = Number(session?.expires_at || 0);
  if (!expiresAt) {
    return false;
  }
  return Date.now() >= expiresAt * 1000 - 60_000;
}

async function refreshStoredSession(session) {
  if (!session?.refresh_token) {
    return session;
  }

  const payload = await authRequest("token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({
      refresh_token: session.refresh_token
    })
  });

  const nextSession = {
    ...payload,
    user: payload.user || session.user || null
  };
  setSession(nextSession, nextSession.user);
  return nextSession;
}

export async function initOwnerAuth() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    state.loading = true;
    const stored = readStoredSession();
    if (!stored) {
      state.initialized = true;
      state.loading = false;
      notifyAuthChange();
      return getOwnerAuthState();
    }

    try {
      const session = sessionExpired(stored) ? await refreshStoredSession(stored) : stored;
      setSession(session, session.user || stored.user || null);
    } catch (error) {
      state.lastError = error.message;
      clearSession();
    } finally {
      state.initialized = true;
      state.loading = false;
      notifyAuthChange();
    }

    return getOwnerAuthState();
  })();

  return initPromise;
}

export async function signInOwner(email, password) {
  state.loading = true;
  state.lastError = "";
  notifyAuthChange();

  try {
    const payload = await authRequest("token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    const session = {
      ...payload,
      user: payload.user || null
    };
    setSession(session, session.user);

    if (!state.isOwner) {
      throw new Error(
        normalizedOwnerEmails().length
          ? "This account signed in, but it is not configured as the owner account for memory writes."
          : "Owner email is not configured yet, so write access remains locked."
      );
    }

    return getOwnerAuthState();
  } catch (error) {
    state.lastError = error.message;
    if (!state.isOwner) {
      clearSession();
    }
    notifyAuthChange();
    throw error;
  } finally {
    state.loading = false;
    notifyAuthChange();
  }
}

export async function signOutOwner() {
  const accessToken = state.session?.access_token || "";
  try {
    if (accessToken) {
      await authRequest("logout?scope=local", {
        method: "POST",
        accessToken
      });
    }
  } catch {
    // Ignore logout failures and clear the local session anyway.
  }

  clearSession();
  state.loading = false;
  state.lastError = "";
  notifyAuthChange();
}

export function getOwnerAuthState() {
  return {
    initialized: state.initialized,
    loading: state.loading,
    session: state.session,
    user: state.user,
    isOwner: state.isOwner,
    ownerEmailConfigured: normalizedOwnerEmails().length > 0,
    ownerEmails: normalizedOwnerEmails(),
    lastError: state.lastError
  };
}

export function canWriteMemory() {
  const authState = getOwnerAuthState();
  return location.protocol === "file:" || !authState.ownerEmailConfigured || Boolean(authState.isOwner);
}

export function canWriteRemoteMemory() {
  const authState = getOwnerAuthState();
  return Boolean(authState.ownerEmailConfigured && authState.isOwner && authState.session?.access_token);
}

export function getOwnerAccessToken() {
  return state.session?.access_token || "";
}

export function onOwnerAuthChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
