import type { AttendanceItem, EventItem, InvitePreviewItem, TeamItem, TeamJoinRequestItem } from "./types";

// API base URL: use env var, fallback to localhost for local development
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

interface ApiRequestOptions extends RequestInit {
  token?: string;
  adminApiKey?: string;
}

export async function parseApiError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.detail === "string") return parsed.detail;
    if (Array.isArray(parsed?.detail)) {
      const messages = parsed.detail
        .map((item: { loc?: unknown[]; msg?: string }) => item.msg || JSON.stringify(item))
        .join(", ");
      return messages || "Validation error.";
    }
    if (parsed?.detail) return JSON.stringify(parsed.detail);
  } catch {
    return text || `Request failed (${response.status})`;
  }
  return text || `Request failed (${response.status})`;
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  if (options.adminApiKey) {
    headers.set("X-API-Key", options.adminApiKey);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function sendOtp(email: string): Promise<{ message: string }> {
  return apiRequest("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function register(payload: {
  email: string;
  otp: string;
  password: string;
  full_name?: string;
}): Promise<{ message: string }> {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(email: string, password: string): Promise<{ access_token: string }> {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function resetPassword(payload: { email: string; otp: string; new_password: string }): Promise<{ message: string }> {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getEvents(): Promise<EventItem[]> {
  return apiRequest("/events", { method: "GET" });
}

export async function createEvent(
  payload: {
    title: string;
    description?: string;
    location?: string;
    starts_at: string;
    ends_at: string;
  },
  adminApiKey: string
): Promise<EventItem> {
  return apiRequest("/events", {
    method: "POST",
    adminApiKey,
    body: JSON.stringify(payload),
  });
}

export async function deleteEvent(eventId: number, adminApiKey: string): Promise<void> {
  return apiRequest(`/events/${eventId}`, {
    method: "DELETE",
    adminApiKey,
  });
}

export async function createTeam(
  payload: { name: string; event_id: number; member_ids: string[] },
  token: string
): Promise<TeamItem> {
  return apiRequest("/teams", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function createTeamInvite(teamId: number, token: string): Promise<{ invite_token: string; invite_path: string }> {
  return apiRequest(`/teams/${teamId}/invite`, {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export async function joinTeamByInvite(inviteToken: string, token: string): Promise<{ message: string }> {
  return apiRequest("/teams/join-by-invite", {
    method: "POST",
    token,
    body: JSON.stringify({ invite_token: inviteToken }),
  });
}

export async function getInvitePreview(inviteToken: string): Promise<InvitePreviewItem> {
  return apiRequest(`/teams/invite/${encodeURIComponent(inviteToken)}`, {
    method: "GET",
  });
}

export async function getLeaderJoinRequests(token: string): Promise<TeamJoinRequestItem[]> {
  return apiRequest("/teams/leader/requests", {
    method: "GET",
    token,
  });
}

export async function approveLeaderJoinRequest(requestId: number, token: string): Promise<{ message: string }> {
  return apiRequest(`/teams/requests/${requestId}/approve`, {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export async function rejectLeaderJoinRequest(requestId: number, token: string): Promise<{ message: string }> {
  return apiRequest(`/teams/requests/${requestId}/reject`, {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export async function getMyTeams(token: string): Promise<TeamItem[]> {
  return apiRequest("/teams/my", {
    method: "GET",
    token,
  });
}

export async function getTeamsByEvent(eventId: number, adminApiKey: string): Promise<TeamItem[]> {
  return apiRequest(`/teams/event/${eventId}`, {
    method: "GET",
    adminApiKey,
  });
}

export async function markAttendance(
  payload: { event_id: number; user_id: string; status: "present" | "absent" },
  adminApiKey: string
): Promise<AttendanceItem> {
  return apiRequest("/attendance/mark", {
    method: "POST",
    adminApiKey,
    body: JSON.stringify(payload),
  });
}

export async function getAttendanceByEvent(eventId: number, adminApiKey: string): Promise<AttendanceItem[]> {
  return apiRequest(`/attendance/event/${eventId}`, {
    method: "GET",
    adminApiKey,
  });
}

export async function verifyAdminApiKey(adminApiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/admin/validate`, {
      method: "GET",
      headers: {
        "X-API-Key": adminApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Key validation failed:", response.status, errorText);
      return false;
    }
    return true;
  } catch (error) {
    console.error("API Key validation error:", error);
    throw new Error(`Failed to validate API key: ${(error as Error).message}`);
  }
}

export async function getMyProfile(token: string): Promise<{
  headline: string | null;
  college: string | null;
  bio: string | null;
  skills: string | null;
  github_url: string | null;
  linkedin_url: string | null;
}> {
  return apiRequest("/profiles/me", {
    method: "GET",
    token,
  });
}

export async function updateMyProfile(
  payload: {
    headline?: string;
    college?: string;
    bio?: string;
    skills?: string;
    github_url?: string;
    linkedin_url?: string;
  },
  token: string
): Promise<void> {
  return apiRequest("/profiles/me", {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export async function getAdminProfile(adminApiKey: string): Promise<{
  full_name: string | null;
  designation: string | null;
  organization: string | null;
  contact_email: string | null;
  bio: string | null;
}> {
  return apiRequest("/profiles/admin", {
    method: "GET",
    adminApiKey,
  });
}

export async function updateAdminProfile(
  payload: {
    full_name?: string;
    designation?: string;
    organization?: string;
    contact_email?: string;
    bio?: string;
  },
  adminApiKey: string
): Promise<void> {
  return apiRequest("/profiles/admin", {
    method: "PUT",
    adminApiKey,
    body: JSON.stringify(payload),
  });
}
