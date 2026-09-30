const KEY = "cad-session";

export function signIn() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* storage unavailable: demo session just won't persist */
  }
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
