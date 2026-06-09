/**
 * @returns {string}
 */
function fallbackApiUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return 'http://localhost:3000';
  }
  return `${window.location.origin}/api`;
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || fallbackApiUrl();

/**
 * @returns {string | null}
 */
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * @template T
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 * @returns {Promise<{ status: number; data: T }>}
 */
export async function api(method, path, body) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return {
      status: 0,
      data: { message: 'Nao foi possivel conectar ao servidor.' },
    };
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* sem corpo */
  }
  return { status: res.status, data };
}
