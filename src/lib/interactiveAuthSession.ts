const INTERACTIVE_AUTH_KEY = "__interactive_password_auth_session";

type InteractiveAuthSession = {
  userId: string;
  createdAt: number;
};

const getStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

export const markInteractiveAuthSession = (userId: string | null | undefined) => {
  if (!userId) return;
  try {
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
    getStorage()?.removeItem(INTERACTIVE_AUTH_KEY);
  } catch {
    // noop
  }
};