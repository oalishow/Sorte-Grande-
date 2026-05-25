class InMemoryStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

function getLocalStorage(): Storage {
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch (e) {
    console.warn("localStorage is not available (likely running in restricted iframe or sandbox). Using safe in-memory storage fallback.");
    return new InMemoryStorage() as any as Storage;
  }
}

function getSessionStorage(): Storage {
  try {
    const testKey = "__session_storage_test__";
    window.sessionStorage.setItem(testKey, testKey);
    window.sessionStorage.removeItem(testKey);
    return window.sessionStorage;
  } catch (e) {
    console.warn("sessionStorage is not available (likely running in restricted iframe or sandbox). Using safe in-memory storage fallback.");
    return new InMemoryStorage() as any as Storage;
  }
}

export const safeStorage = getLocalStorage();
export const safeSessionStorage = getSessionStorage();
