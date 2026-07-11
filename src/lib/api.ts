interface ApiRequestOptions extends RequestInit {
  organizationId?: string;
  userId?: string;
  adminId?: string;
  skipOrganizationIdHeader?: boolean;
}

const apiBaseUrl = (() => {
  try {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (typeof base === 'string' && base.trim() !== '') return base.trim().replace(/\/$/, '');
    return 'https://medicarebackendtest-rnnf.vercel.app';
  } catch {
    return 'https://medicarebackendtest-rnnf.vercel.app';
  }
})();

const resolveApiUrl = (url: string) => {
  if (!apiBaseUrl) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiBaseUrl}${url}`;
};

const readInitialAuthToken = (): string | null => {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
};

let authToken: string | null = readInitialAuthToken();

export const setApiAuthToken = (token: string | null) => {
  authToken = token;
};

const getStoredToken = (): string | null => {
  if (authToken) return authToken;
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
};

const readStoredAuthUser = (): { id?: string; userId?: string; organizationId?: string; organization_id?: string } | null => {
  try {
    const rawUser = localStorage.getItem('auth_user');
    if (!rawUser) return null;
    return JSON.parse(rawUser) as { id?: string; userId?: string; organizationId?: string; organization_id?: string };
  } catch {
    return null;
  }
};

const getStoredOrganizationId = (): string | undefined => {
  const storedUser = readStoredAuthUser();
  const raw = localStorage.getItem('auth_organization_id') || storedUser?.organizationId || storedUser?.organization_id || undefined;
  // Guard against stale localStorage entries storing the literal string "undefined"
  if (!raw || raw === 'undefined' || raw === 'null') return undefined;
  return raw;
};

const getStoredUserId = (): string | undefined => {
  const storedUser = readStoredAuthUser();
  return storedUser?.id || storedUser?.userId || undefined;
};

const getHeaders = (options?: ApiRequestOptions, url?: string): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const organizationId = options?.skipOrganizationIdHeader ? undefined : (options?.organizationId || getStoredOrganizationId());
  if (organizationId && organizationId !== 'undefined' && organizationId !== 'null') {
    headers['x-organization-id'] = organizationId;
  }

  const userId = options?.userId || getStoredUserId();
  if (userId) {
    headers['x-user-id'] = userId;
    // Automatically inject x-admin-id for admin routes
    if (url && url.includes('/api/admin/')) {
      headers['x-admin-id'] = userId;
    }
  }

  const adminId = options?.adminId;
  if (adminId && adminId !== 'undefined' && adminId !== 'null') {
    headers['x-admin-id'] = adminId;
  }

  return { ...headers, ...(options?.headers as Record<string, string>) };
};

async function handleResponse<T>(response: Response, url: string): Promise<T> {
  const contentType = response.headers.get('content-type');
  let data: unknown;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage: string;
    if (typeof data === 'object' && data !== null) {
      errorMessage = (data as { error?: string; message?: string }).error || (data as { error?: string; message?: string }).message || response.statusText;
    } else {
      errorMessage = typeof data === 'string' ? data : response.statusText;
    }

    // A 401 from /api/auth/login (or similar pre-session endpoints) means the
    // credentials themselves were rejected, not that an existing session went
    // stale — there's no session yet at that point. Only endpoints that act on
    // an existing token (chiefly /api/auth/validate) should trigger the
    // session-expired logout flow. Other endpoints' 401s are thrown normally
    // so callers can handle them gracefully without destroying the session.
    const isPreSessionAuthCall = /\/api\/auth\/(login|register|forgot-password|reset-password|verify-otp|otp)(\?|$)/i.test(url);
    const isSessionValidation = /\/api\/auth\/validate(\?|$)/i.test(url);

    if (response.status === 401 && isSessionValidation) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_organization_id');
      localStorage.removeItem('user_id');
      localStorage.removeItem('organization_id');
      authToken = null;
      errorMessage = /session expired|log in again/i.test(errorMessage)
        ? errorMessage
        : 'Session expired. Please log in again.';

      // Clearing localStorage alone doesn't update in-memory auth state, so a
      // live 401 (e.g. the 1-hour session expiring mid-use) wouldn't actually
      // send the user to /login until they reloaded. Broadcast it so
      // AuthProvider can clear its state and ProtectedRoute can redirect.
      try {
        window.dispatchEvent(new Event('auth:session-expired'));
      } catch {
        // no-op outside a browser environment
      }
    }

    throw new Error(errorMessage);
  }

  return data as T;
}

async function request<T>(url: string, options: RequestInit): Promise<T> {
  try {
    const res = await fetch(resolveApiUrl(url), options);
    try { window.dispatchEvent(new Event('api:online')); } catch { /* ignore */ }
    return await handleResponse<T>(res, url);
  } catch (error) {
    if (error instanceof Error) {
      const networkFailure = /failed to fetch|networkerror|load failed|econnrefused|err_connection_refused/i.test(error.message);
      if (networkFailure) {
        try { window.dispatchEvent(new Event('api:offline')); } catch { /* ignore */ }
      }
      if (!networkFailure) {
        throw error;
      }
    }

    try { window.dispatchEvent(new Event('api:offline')); } catch { /* ignore */ }
    throw new Error(
      apiBaseUrl
        ? `Unable to reach the API at ${apiBaseUrl}. Make sure the backend server is running.`
        : 'Unable to reach the backend API. Make sure the server is running.'
    );
  }
}

export const api = {
  setAuthToken: setApiAuthToken,

  async get<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, {
      ...options,
      method: 'GET',
      headers: getHeaders(options, url),
    });
  },

  async post<T>(url: string, body: any, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, {
      ...options,
      method: 'POST',
      headers: getHeaders(options, url),
      body: JSON.stringify(body),
    });
  },

  async put<T>(url: string, body: any, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, {
      ...options,
      method: 'PUT',
      headers: getHeaders(options, url),
      body: JSON.stringify(body),
    });
  },

  async del<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, {
      ...options,
      method: 'DELETE',
      headers: getHeaders(options, url),
    });
  },

  async delete<T>(url: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>(url, {
      ...options,
      method: 'DELETE',
      headers: getHeaders(options, url),
    });
  },

  async validateToken<T>(options?: ApiRequestOptions): Promise<T> {
    return request<T>('/api/auth/validate', {
      ...options,
      method: 'GET',
      headers: getHeaders(options, '/api/auth/validate'),
    });
  },

  async upload<T>(url: string, file: File, options?: ApiRequestOptions & { fields?: Record<string, string> }): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.fields) {
      for (const [key, value] of Object.entries(options.fields)) {
        formData.append(key, value);
      }
    }

    const headers = getHeaders(options, url) as Record<string, string>;
    delete headers['Content-Type'];

    return request<T>(url, {
      ...options,
      method: 'POST',
      headers,
      body: formData,
    });
  },
};


