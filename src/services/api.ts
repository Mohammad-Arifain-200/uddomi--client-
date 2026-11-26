import { CommunityEvent } from '../types';
import { getPublicApiBaseUrl } from '../lib/auth-client';

const getApiBase = (): string => {
  const base = getPublicApiBaseUrl();
  return base ? `${base}/api` : '/api';
};

export const API_BASE = getApiBase();

let inMemoryAuthToken: string | null = null;

export const setInMemoryAuthToken = (token: string | null): void => {
  inMemoryAuthToken = token && token !== 'cookie_session' ? token : null;
};

export const getInMemoryAuthToken = (): string | null => inMemoryAuthToken;

const buildAuthHeaders = (token?: string, includeJson = false): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const resolved = token && token !== 'cookie_session' ? token : inMemoryAuthToken;
  if (resolved) {
    headers.Authorization = `Bearer ${resolved}`;
  }
  return headers;
};

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const errData = await res.json();
    if (errData && typeof errData.error === 'string' && errData.error.trim()) {
      return errData.error;
    }
  } catch {
    // Ignore non-JSON error body
  }
  return fallback;
}

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 1
): Promise<Response> {
  const timeoutMs = 12000;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const callerSignal = options?.signal;
    const onCallerAbort = () => controller.abort();
    if (callerSignal) {
      if (callerSignal.aborted) {
        clearTimeout(timer);
        throw new DOMException('Aborted', 'AbortError');
      }
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      if (res.status >= 502 && res.status <= 504 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err: any) {
      if (callerSignal?.aborted || err?.name === 'AbortError') {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
    }
  }
  throw new Error('Unable to reach the server.');
}

export const eventService = {
  /**
   * Fetches events from MongoDB backend API with query parameters:
   * - limit (uses MongoDB .limit(6) on home page)
   * - category (Cleanup, Donation, Plantation, Education, Community, Health)
   * - search
   * - onlyUpcoming (filters past events)
   */
  getEvents: async (options?: {
    limit?: number;
    category?: string;
    search?: string;
    onlyUpcoming?: boolean;
    signal?: AbortSignal;
  }): Promise<CommunityEvent[]> => {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.category) params.set('category', options.category);
      if (options?.search) params.set('search', options.search);
      if (options?.onlyUpcoming !== undefined) {
        params.set('onlyUpcoming', String(options.onlyUpcoming));
      }

      const query = params.toString();
      const res = await fetchWithRetry(`${getApiBase()}/events${query ? `?${query}` : ''}`, {
        credentials: 'include',
        signal: options?.signal,
      });
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, 'Failed to load events from the server.'));
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw err;
      }
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },

  /**
   * Retrieves single event details from MongoDB backend
   */
  getEventById: async (id: string): Promise<CommunityEvent | null> => {
    try {
      const res = await fetchWithRetry(`${getApiBase()}/events/${encodeURIComponent(id)}`, {
        credentials: 'include',
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, 'Failed to load event details from database.'));
      }
      return await res.json();
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },

  /**
   * Creates a new event on the Express/MongoDB backend (Protected with JWT)
   */
  createEvent: async (
    data: Omit<CommunityEvent, 'id' | 'createdAt' | 'joinedUsers'>,
    token: string
  ): Promise<CommunityEvent> => {
    try {
      const res = await fetch(`${getApiBase()}/events`, {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, 'Failed to create event in MongoDB database.'));
      }

      const result = await res.json();
      return result.event || result;
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },

  /**
   * Updates an existing event on the Express/MongoDB backend (Protected with Ownership Check)
   */
  updateEvent: async (
    id: string,
    data: Partial<CommunityEvent>,
    _userEmail: string,
    token: string
  ): Promise<CommunityEvent> => {
    try {
      const res = await fetch(`${getApiBase()}/events/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Forbidden: You can only edit events created by yourself.');
        }
        throw new Error(await parseErrorMessage(res, 'Failed to update event details.'));
      }

      const result = await res.json();
      return result.event || result;
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },

  /**
   * Deletes an event on the Express/MongoDB backend (Protected with Ownership Check)
   */
  deleteEvent: async (id: string, _userEmail: string, token: string): Promise<boolean> => {
    try {
      const res = await fetch(`${getApiBase()}/events/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: buildAuthHeaders(token),
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Forbidden: You can only delete events created by yourself.');
        }
        throw new Error(await parseErrorMessage(res, 'Failed to delete event from database.'));
      }

      return true;
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },

  /**
   * Registers user participation for an event in MongoDB (Protected with JWT)
   */
  joinEvent: async (id: string, _userEmail: string, token: string): Promise<CommunityEvent> => {
    try {
      const res = await fetch(`${getApiBase()}/events/${encodeURIComponent(id)}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders(token, true),
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, 'Failed to join event in MongoDB.'));
      }

      const result = await res.json();
      return result.event;
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },

  /**
   * Cancels user participation in MongoDB (Protected with JWT)
   */
  leaveEvent: async (id: string, _userEmail: string, token: string): Promise<CommunityEvent> => {
    try {
      const res = await fetch(`${getApiBase()}/events/${encodeURIComponent(id)}/leave`, {
        method: 'DELETE',
        credentials: 'include',
        headers: buildAuthHeaders(token),
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, 'Failed to cancel participation.'));
      }

      const result = await res.json();
      return result.event;
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },

  /**
   * Retrieves events joined by the current user from MongoDB
   */
  getUserJoinedEvents: async (_userEmail: string, token?: string): Promise<CommunityEvent[]> => {
    try {
      const res = await fetch(`${getApiBase()}/user/joined-events`, {
        credentials: 'include',
        headers: buildAuthHeaders(token),
      });
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, 'Failed to fetch joined events.'));
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },

  /**
   * Retrieves events created by the current user from MongoDB
   */
  getUserEvents: async (_userEmail: string, token?: string): Promise<CommunityEvent[]> => {
    try {
      const res = await fetch(`${getApiBase()}/user/manage-events`, {
        credentials: 'include',
        headers: buildAuthHeaders(token),
      });
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, 'Failed to fetch user events.'));
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },

  /**
   * Alias for getUserEvents
   */
  getUserCreatedEvents: async (userEmail: string, token?: string): Promise<CommunityEvent[]> => {
    return eventService.getUserEvents(userEmail, token);
  },

  /**
   * Retrieves user's favorited event IDs from MongoDB
   */
  getUserFavorites: async (token?: string): Promise<string[]> => {
    try {
      const res = await fetch(`${getApiBase()}/user/favorites`, {
        credentials: 'include',
        headers: buildAuthHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.favoriteEventIds) ? data.favoriteEventIds : [];
      }
    } catch {
      // Non-blocking favorite badge lookup
    }
    return [];
  },

  /**
   * Toggles favorite status of an event in MongoDB (Protected with JWT)
   */
  toggleFavorite: async (id: string, token: string): Promise<{ favorited: boolean }> => {
    try {
      const res = await fetch(`${getApiBase()}/events/${encodeURIComponent(id)}/favorite`, {
        method: 'POST',
        credentials: 'include',
        headers: buildAuthHeaders(token),
      });

      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, 'Failed to update favorite status.'));
      }

      return await res.json();
    } catch (err: any) {
      if (err instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your internet connection.');
      }
      throw err;
    }
  },
};
