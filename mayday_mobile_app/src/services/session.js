import { ENDPOINTS } from '../config/endpoints';

export async function createSession(token, { fingerprint, sipUsername }) {
  const res = await fetch(`${ENDPOINTS.BASE_URL}${ENDPOINTS.CREATE_SESSION}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ fingerprint, sipUsername })
  });
  if (!res.ok) throw new Error('Failed to create session');
  return await res.json();
}

export async function endSession(token, sessionId) {
  const res = await fetch(`${ENDPOINTS.BASE_URL}${ENDPOINTS.END_SESSION}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) throw new Error('Failed to end session');
  return await res.json();
}
