const INTERACTIVE_AUTH_KEY = "__interactive_password_auth_session";
const INTERACTIVE_AUTH_ATTEMPT_KEY = "__interactive_password_auth_attempt";

type InteractiveAuthSession = {
  userId: string;
  createdAt: number;
};

const getStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

const getAttemptStorage = () => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
};

export const markInteractiveAuthAttempt = () => {
  try {
    getAttemptStorage()?.setItem(INTERACTIVE_AUTH_ATTEMPT_KEY, String(Date.now()));
  } catch {
    // noop
  }
};

export const hasRecentInteractiveAuthAttempt = () => {
  try {
    const raw = getAttemptStorage()?.getItem(INTERACTIVE_AUTH_ATTEMPT_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < 15_000;
  } catch {
    return false;
  }
};

export const markInteractiveAuthSession = (userId: string | null | undefined) => {
  if (!userId) return;
  try {
    getAttemptStorage()?.removeItem(INTERACTIVE_AUTH_ATTEMPT_KEY);
    getStorage()?.setItem(
      INTERACTIVE_AUTH_KEY,
      JSON.stringify({ userId, createdAt: Date.now() } satisfies InteractiveAuthSession),
    );
  } catch {
    // noop
  }
};

export const hasInteractiveAuthSession = (userId: string | null | undefined) => {
  if (!userId) return false;
  try {
    const raw = getStorage()?.getItem(INTERACTIVE_AUTH_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<InteractiveAuthSession>;
    return parsed.userId === userId;
  } catch {
    return false;
  }
};

export const clearInteractiveAuthSession = () => {
  try {
    getAttemptStorage()?.removeItem(INTERACTIVE_AUTH_ATTEMPT_KEY);
    getStorage()?.removeItem(INTERACTIVE_AUTH_KEY);
  } catch {
    // noop
  }
};