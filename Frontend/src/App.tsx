import { FormEvent, useEffect, useState } from "react";

import {
  approveLeaderJoinRequest,
  createEvent,
  createTeam,
  createTeamInvite,
  deleteEvent,
  getAdminProfile,
  getAttendanceByEvent,
  getEvents,
  getInvitePreview,
  getLeaderJoinRequests,
  getMyProfile,
  getMyTeams,
  getTeamsByEvent,
  joinTeamByInvite,
  login,
  markAttendance,
  rejectLeaderJoinRequest,
  register,
  sendOtp,
  updateAdminProfile,
  updateMyProfile,
  verifyAdminApiKey,
} from "./api";
import { AdminAuthPage } from "./components/AdminAuthPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { HomePage } from "./components/HomePage";
import { InvitePreviewPage } from "./components/InvitePreviewPage";
import { MemberAuthPage } from "./components/MemberAuthPage";
import { MemberDashboard } from "./components/MemberDashboard";
import { SiteFooter } from "./components/SiteFooter";
import { SiteNav } from "./components/SiteNav";
import {
  DUMMY_ADMIN_CREDENTIALS,
  DUMMY_EVENTS,
  DUMMY_JOIN_REQUESTS,
  DUMMY_MEMBER_CREDENTIALS,
  DUMMY_TEAMS,
  AdminProfile,
  EventItem,
  InvitePreviewItem,
  MemberProfile,
  SessionMode,
  TeamItem,
  TeamJoinRequestItem,
} from "./types";

type Screen = "home" | "member-auth" | "member-dashboard" | "admin-auth" | "admin-dashboard" | "invite-preview";
type MemberTab = "dashboard" | "register-event" | "registered-events" | "profile";
type AdminTab = "current-events" | "add-events" | "profile";

interface MemberSession {
  email: string;
  token: string;
  mode: SessionMode;
}

interface AdminSession {
  apiKey: string;
  mode: SessionMode;
}

const MEMBER_SESSION_KEY = "ts_member_session";
const ADMIN_SESSION_KEY = "ts_admin_session";

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function pageHeading(screen: Screen): { title: string; tags: string[] } {
  switch (screen) {
    case "member-auth":
      return { title: "Member Access", tags: ["Portal", "Registration"] };
    case "member-dashboard":
      return { title: "Member Workspace", tags: ["Teams", "Events"] };
    case "admin-auth":
      return { title: "Admin Access", tags: ["API Key", "Control"] };
    case "admin-dashboard":
      return { title: "Admin Workspace", tags: ["Events", "Attendance"] };
    case "invite-preview":
      return { title: "Team Invite", tags: ["Preview", "Request Join"] };
    default:
      return { title: "Official Event Portal", tags: ["Members", "Admin", "Operations"] };
  }
}

function normalizeInviteToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const directQueryMatch = trimmed.match(/[?&]invite=([^&]+)/i);
  if (directQueryMatch?.[1]) {
    return decodeURIComponent(directQueryMatch[1]).trim();
  }

  const invitePathMatch = trimmed.match(/\/invite\/([^/?#]+)/i);
  if (invitePathMatch?.[1]) {
    return decodeURIComponent(invitePathMatch[1]).trim();
  }

  try {
    const url = new URL(trimmed);
    const inviteFromQuery = url.searchParams.get("invite");
    if (inviteFromQuery) {
      return inviteFromQuery.trim();
    }

    const pathSegments = url.pathname.split("/").filter(Boolean);
    const inviteIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === "invite");
    if (inviteIndex !== -1 && pathSegments[inviteIndex + 1]) {
      return decodeURIComponent(pathSegments[inviteIndex + 1]).trim();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function buildDemoInvitePreview(token: string): InvitePreviewItem | null {
  if (!token.startsWith("DEMO-")) return null;
  const teamId = Number(token.replace("DEMO-", ""));
  if (!teamId) return null;

  const team = DUMMY_TEAMS.find((item) => item.id === teamId);
  if (!team) return null;

  const event = DUMMY_EVENTS.find((item) => item.id === team.event_id);
  if (!event) return null;

  return {
    invite_token: token,
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
    },
    team,
  };
}

export default function App() {
  const initialInviteToken = normalizeInviteToken(new URLSearchParams(window.location.search).get("invite") ?? "");

  const [screen, setScreen] = useState<Screen>(initialInviteToken ? "invite-preview" : "home");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [memberSession, setMemberSession] = useState<MemberSession | null>(() => readStored(MEMBER_SESSION_KEY));
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => readStored(ADMIN_SESSION_KEY));

  const [memberTab, setMemberTab] = useState<MemberTab>("dashboard");
  const [adminTab, setAdminTab] = useState<AdminTab>("current-events");
  const [memberAuthTab, setMemberAuthTab] = useState<"login" | "register">("login");

  const [events, setEvents] = useState<EventItem[]>([]);
  const [memberTeams, setMemberTeams] = useState<TeamItem[]>([]);
  const [leaderRequests, setLeaderRequests] = useState<TeamJoinRequestItem[]>([]);
  const [adminTeams, setAdminTeams] = useState<TeamItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, "present" | "absent">>({});
  const [invitePreview, setInvitePreview] = useState<InvitePreviewItem | null>(null);
  const [activeInviteToken, setActiveInviteToken] = useState(initialInviteToken);

  const [loginEmail, setLoginEmail] = useState(DUMMY_MEMBER_CREDENTIALS.email);
  const [loginPassword, setLoginPassword] = useState(DUMMY_MEMBER_CREDENTIALS.password);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerOtp, setRegisterOtp] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [adminKeyInput, setAdminKeyInput] = useState("");

  const [teamEventId, setTeamEventId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [inviteTokenInput, setInviteTokenInput] = useState(initialInviteToken);
  const [inviteLinks, setInviteLinks] = useState<Record<number, string>>({});

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");

  const [eventSearch, setEventSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");

  const [memberProfile, setMemberProfile] = useState<MemberProfile>({
    headline: "",
    college: "",
    bio: "",
    skills: "",
    github_url: "",
    linkedin_url: "",
  });
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    full_name: "",
    designation: "",
    organization: "",
    contact_email: "",
    bio: "",
  });

  const heading = pageHeading(screen);
  const showShellHeader = screen !== "home";
  const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (memberSession) localStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify(memberSession));
    else localStorage.removeItem(MEMBER_SESSION_KEY);
  }, [memberSession]);

  useEffect(() => {
    if (adminSession) localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminSession));
    else localStorage.removeItem(ADMIN_SESSION_KEY);
  }, [adminSession]);

  useEffect(() => {
    if (activeInviteToken) {
      setScreen("invite-preview");
      void loadInvitePreview(activeInviteToken);
      if (memberSession) {
        void loadMemberData(memberSession);
      } else if (adminSession) {
        void loadAdminBase(adminSession);
      }
    } else if (memberSession) {
      setScreen("member-dashboard");
      void loadMemberData(memberSession);
    } else if (adminSession) {
      setScreen("admin-dashboard");
      void loadAdminBase(adminSession);
    } else {
      setScreen("home");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeInviteToken) {
      setInvitePreview(null);
      return;
    }
    setInviteTokenInput(activeInviteToken);
    void loadInvitePreview(activeInviteToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInviteToken]);

  useEffect(() => {
    if (!adminSession || selectedEventId === null || screen !== "admin-dashboard") return;
    void loadAdminEventDetails(adminSession, selectedEventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminSession?.apiKey, adminSession?.mode, selectedEventId, screen]);

  function setInviteRouteToken(token: string | null) {
    const url = new URL(window.location.href);
    if (token) {
      url.searchParams.set("invite", token);
    } else {
      url.searchParams.delete("invite");
    }
    window.history.replaceState({}, "", url.toString());
    setActiveInviteToken(token ?? "");
  }

  async function loadInvitePreview(token: string) {
    setBusy(true);
    try {
      const demoPreview = buildDemoInvitePreview(token);
      if (demoPreview) {
        setInvitePreview(demoPreview);
        return;
      }
      const preview = await getInvitePreview(token);
      setInvitePreview(preview);
    } catch (error) {
      setInvitePreview(null);
      setNotice(`Failed to load invite: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadMemberData(session: MemberSession) {
    setBusy(true);
    try {
      if (session.mode === "demo") {
        const demoTeams = DUMMY_TEAMS.filter((team) => team.members.some((m) => m.email === DUMMY_MEMBER_CREDENTIALS.email));
        setEvents(DUMMY_EVENTS);
        setMemberTeams(demoTeams);
        setLeaderRequests(DUMMY_JOIN_REQUESTS.filter((request) => demoTeams.some((team) => team.id === request.team_id)));
        setMemberProfile({
          headline: "Demo Builder",
          college: "TechSphere University",
          bio: "Demo member profile for UI testing.",
          skills: "React, FastAPI, UI Design",
          github_url: "https://github.com/demo",
          linkedin_url: "https://linkedin.com/in/demo",
        });
        setNotice("Member dashboard loaded in demo mode.");
        return;
      }
      const [eventItems, teamItems, joinRequests, profile] = await Promise.all([
        getEvents(),
        getMyTeams(session.token),
        getLeaderJoinRequests(session.token),
        getMyProfile(session.token),
      ]);
      setEvents(eventItems);
      setMemberTeams(teamItems);
      setLeaderRequests(joinRequests);
      setMemberProfile(profile);
      setNotice("Member dashboard loaded.");
    } catch (error) {
      setNotice(`Failed to load member data: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminBase(session: AdminSession) {
    setBusy(true);
    try {
      if (session.mode === "demo") {
        setEvents(DUMMY_EVENTS);
        setAdminProfile({
          full_name: "Demo Admin",
          designation: "Event Coordinator",
          organization: "TechSphere",
          contact_email: "admin@techsphere.dev",
          bio: "Demo admin profile for local testing.",
        });
        setSelectedEventId(DUMMY_EVENTS[0]?.id ?? null);
        setNotice("Admin dashboard loaded in demo mode.");
        return;
      }
      const [eventItems, profile] = await Promise.all([getEvents(), getAdminProfile(session.apiKey)]);
      setEvents(eventItems);
      setAdminProfile(profile);
      setSelectedEventId(eventItems[0]?.id ?? null);
      setNotice("Admin dashboard loaded.");
    } catch (error) {
      setNotice(`Failed to load admin data: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminEventDetails(session: AdminSession, eventId: number) {
    setBusy(true);
    try {
      if (session.mode === "demo") {
        setAdminTeams(DUMMY_TEAMS.filter((team) => team.event_id === eventId));
        setAttendanceMap({});
        return;
      }
      const [teams, attendance] = await Promise.all([
        getTeamsByEvent(eventId, session.apiKey),
        getAttendanceByEvent(eventId, session.apiKey),
      ]);
      const lookup: Record<string, "present" | "absent"> = {};
      attendance.forEach((item) => {
        lookup[item.user_id] = item.status;
      });
      setAdminTeams(teams);
      setAttendanceMap(lookup);
    } catch (error) {
      setNotice(`Failed to load event details: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onMemberLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (
        loginEmail.trim().toLowerCase() === DUMMY_MEMBER_CREDENTIALS.email &&
        loginPassword === DUMMY_MEMBER_CREDENTIALS.password
      ) {
        const session: MemberSession = { email: DUMMY_MEMBER_CREDENTIALS.email, token: "demo-member", mode: "demo" };
        setMemberSession(session);
        setAdminSession(null);
        setScreen(activeInviteToken ? "invite-preview" : "member-dashboard");
        await loadMemberData(session);
        return;
      }
      const response = await login(loginEmail.trim(), loginPassword);
      const session: MemberSession = { email: loginEmail.trim().toLowerCase(), token: response.access_token, mode: "real" };
      setMemberSession(session);
      setAdminSession(null);
      setScreen(activeInviteToken ? "invite-preview" : "member-dashboard");
      await loadMemberData(session);
    } catch (error) {
      setNotice(`Member login failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onSendOtp() {
    setBusy(true);
    try {
      const response = await sendOtp(registerEmail.trim());
      setNotice(response.message);
    } catch (error) {
      setNotice(`OTP send failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onMemberRegister(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await register({
        email: registerEmail.trim(),
        otp: registerOtp.trim(),
        password: registerPassword,
        full_name: registerName.trim() || undefined,
      });
      setNotice(response.message);
      setMemberAuthTab("login");
      setLoginEmail(registerEmail.trim());
      setRegisterOtp("");
      setRegisterPassword("");
    } catch (error) {
      setNotice(`Registration failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onAdminLogin(event: FormEvent) {
    event.preventDefault();
    const key = adminKeyInput.trim();
    if (!key) return;
    setBusy(true);
    try {
      if (key === DUMMY_ADMIN_CREDENTIALS.apiKey) {
        const session: AdminSession = { apiKey: key, mode: "demo" };
        setAdminSession(session);
        setMemberSession(null);
        setScreen("admin-dashboard");
        await loadAdminBase(session);
        return;
      }
      const valid = await verifyAdminApiKey(key);
      if (!valid) {
        setNotice("Invalid admin API key.");
        return;
      }
      const session: AdminSession = { apiKey: key, mode: "real" };
      setAdminSession(session);
      setMemberSession(null);
      setScreen("admin-dashboard");
      await loadAdminBase(session);
    } catch (error) {
      setNotice(`Admin login failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onRegisterTeam(event: FormEvent) {
    event.preventDefault();
    if (!memberSession) return;
    const parsedEventId = Number(teamEventId);
    if (!parsedEventId || !teamName.trim()) {
      setNotice("Select an event and enter team name.");
      return;
    }
    setBusy(true);
    try {
      if (memberSession.mode === "demo") {
        const leader = { id: "demo", email: memberSession.email, full_name: "Demo Member" };
        const team: TeamItem = {
          id: Date.now(),
          name: teamName.trim(),
          event_id: parsedEventId,
          leader_id: "demo",
          created_at: new Date().toISOString(),
          leader,
          members: [leader],
        };
        setMemberTeams((previous) => [team, ...previous]);
      } else {
        const response = await createTeam({ name: teamName.trim(), event_id: parsedEventId, member_ids: [] }, memberSession.token);
        setMemberTeams((previous) => [response, ...previous]);
      }
      setNotice("Team registration saved.");
      setTeamEventId("");
      setTeamName("");
      setMemberTab("registered-events");
    } catch (error) {
      setNotice(`Team registration failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateEvent(event: FormEvent) {
    event.preventDefault();
    if (!adminSession) return;
    if (!eventTitle.trim() || !eventStart || !eventEnd) {
      setNotice("Title, start and end time are required.");
      return;
    }
    const startsAt = new Date(eventStart);
    const endsAt = new Date(eventEnd);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setNotice("Please use valid date and time.");
      return;
    }
    if (endsAt <= startsAt) {
      setNotice("End time must be later than start time.");
      return;
    }
    setBusy(true);
    try {
      if (adminSession.mode === "demo") {
        const demo: EventItem = {
          id: Date.now(),
          title: eventTitle,
          description: eventDescription || null,
          location: eventLocation || null,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          created_at: new Date().toISOString(),
        };
        setEvents((previous) => [demo, ...previous]);
      } else {
        const response = await createEvent(
          {
            title: eventTitle,
            description: eventDescription || undefined,
            location: eventLocation || undefined,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
          },
          adminSession.apiKey
        );
        setEvents((previous) => [response, ...previous]);
      }
      setNotice("Event created.");
      setAdminTab("current-events");
      setEventTitle("");
      setEventDescription("");
      setEventLocation("");
      setEventStart("");
      setEventEnd("");
    } catch (error) {
      setNotice(`Event creation failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onAttendanceToggle(userId: string, checked: boolean) {
    if (!adminSession || selectedEventId === null) return;
    const status: "present" | "absent" = checked ? "present" : "absent";
    const prev = attendanceMap[userId];
    setAttendanceMap((old) => ({ ...old, [userId]: status }));
    try {
      if (adminSession.mode !== "demo") {
        await markAttendance({ event_id: selectedEventId, user_id: userId, status }, adminSession.apiKey);
      }
      setNotice("Attendance updated.");
    } catch (error) {
      setAttendanceMap((old) => ({ ...old, [userId]: prev ?? "absent" }));
      setNotice(`Attendance update failed: ${(error as Error).message}`);
    }
  }

  async function ensureInviteLink(teamId: number): Promise<string> {
    const existing = inviteLinks[teamId];
    if (existing) return existing;
    if (!memberSession) throw new Error("Login as a member first.");

    if (memberSession.mode === "demo") {
      const demoLink = `${window.location.origin}/?invite=DEMO-${teamId}`;
      setInviteLinks((prev) => ({ ...prev, [teamId]: demoLink }));
      return demoLink;
    }

    const response = await createTeamInvite(teamId, memberSession.token);
    const link = `${window.location.origin}/?invite=${response.invite_token}`;
    setInviteLinks((prev) => ({ ...prev, [teamId]: link }));
    return link;
  }

  async function onCopyInviteLink(teamId: number) {
    setBusy(true);
    try {
      const link = await ensureInviteLink(teamId);
      try {
        await navigator.clipboard.writeText(link);
        setNotice("Invite link copied.");
      } catch {
        setNotice("Invite link generated.");
      }
    } catch (error) {
      setNotice(`Invite link failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onShareInviteWhatsApp(teamId: number) {
    setBusy(true);
    try {
      const link = await ensureInviteLink(teamId);
      const team = memberTeams.find((item) => item.id === teamId);
      const message = `Join my TechSphere team${team ? ` ${team.name}` : ""}: ${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      setNotice("WhatsApp share opened.");
    } catch (error) {
      setNotice(`WhatsApp share failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onNativeShareInvite(teamId: number) {
    setBusy(true);
    try {
      const link = await ensureInviteLink(teamId);
      const team = memberTeams.find((item) => item.id === teamId);
      if (!navigator.share) {
        await navigator.clipboard.writeText(link);
        setNotice("Share is not supported here, so the link was copied instead.");
        return;
      }
      await navigator.share({
        title: team ? `${team.name} Invite` : "TechSphere Team Invite",
        text: team ? `Join ${team.name} on TechSphere` : "Join our TechSphere team",
        url: link,
      });
      setNotice("Invite shared.");
    } catch (error) {
      setNotice(`Invite share failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onJoinInvite(rawValue?: string) {
    if (!memberSession) return;
    const token = normalizeInviteToken(rawValue ?? inviteTokenInput);
    if (!token) {
      setNotice("Paste invite link or token first.");
      return;
    }
    setBusy(true);
    try {
      if (token !== inviteTokenInput.trim()) {
        setInviteTokenInput(token);
      }
      if (memberSession.mode === "demo") {
        setNotice("Demo mode: join request sent to the team leader.");
        setInviteTokenInput("");
        return;
      }
      const response = await joinTeamByInvite(token, memberSession.token);
      setNotice(response.message);
      setInviteTokenInput("");
      await loadMemberData(memberSession);
      if (activeInviteToken) {
        await loadInvitePreview(activeInviteToken);
      }
    } catch (error) {
      setNotice(`Join invite failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onApproveJoinRequest(requestId: number) {
    if (!memberSession) return;
    setBusy(true);
    try {
      if (memberSession.mode === "demo") {
        const request = leaderRequests.find((item) => item.id === requestId);
        if (request) {
          setMemberTeams((previous) =>
            previous.map((team) =>
              team.id === request.team_id
                ? { ...team, members: [...team.members, request.requester] }
                : team
            )
          );
          setLeaderRequests((previous) => previous.filter((item) => item.id !== requestId));
        }
        setNotice("Join request approved.");
        return;
      }
      const response = await approveLeaderJoinRequest(requestId, memberSession.token);
      setNotice(response.message);
      await loadMemberData(memberSession);
    } catch (error) {
      setNotice(`Approve request failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onRejectJoinRequest(requestId: number) {
    if (!memberSession) return;
    setBusy(true);
    try {
      if (memberSession.mode === "demo") {
        setLeaderRequests((previous) => previous.filter((item) => item.id !== requestId));
        setNotice("Join request rejected.");
        return;
      }
      const response = await rejectLeaderJoinRequest(requestId, memberSession.token);
      setNotice(response.message);
      await loadMemberData(memberSession);
    } catch (error) {
      setNotice(`Reject request failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteEvent(eventId: number) {
    if (!adminSession) return;
    setBusy(true);
    try {
      if (adminSession.mode === "demo") {
        setEvents((prev) => prev.filter((item) => item.id !== eventId));
        if (selectedEventId === eventId) {
          const next = events.find((item) => item.id !== eventId);
          setSelectedEventId(next?.id ?? null);
        }
        setNotice("Demo event deleted.");
        return;
      }
      await deleteEvent(eventId, adminSession.apiKey);
      const nextEvents = events.filter((item) => item.id !== eventId);
      setEvents(nextEvents);
      if (selectedEventId === eventId) {
        setSelectedEventId(nextEvents[0]?.id ?? null);
      }
      setNotice("Event deleted.");
    } catch (error) {
      setNotice(`Delete event failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveMemberProfile(event: FormEvent) {
    event.preventDefault();
    if (!memberSession) return;
    setBusy(true);
    try {
      if (memberSession.mode === "demo") {
        setNotice("Demo profile saved.");
        return;
      }
      await updateMyProfile(
        {
          headline: memberProfile.headline || "",
          college: memberProfile.college || "",
          bio: memberProfile.bio || "",
          skills: memberProfile.skills || "",
          github_url: memberProfile.github_url || "",
          linkedin_url: memberProfile.linkedin_url || "",
        },
        memberSession.token
      );
      setNotice("Profile updated.");
    } catch (error) {
      setNotice(`Profile update failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveAdminProfile(event: FormEvent) {
    event.preventDefault();
    if (!adminSession) return;
    setBusy(true);
    try {
      if (adminSession.mode === "demo") {
        setNotice("Demo admin profile saved.");
        return;
      }
      await updateAdminProfile(
        {
          full_name: adminProfile.full_name || "",
          designation: adminProfile.designation || "",
          organization: adminProfile.organization || "",
          contact_email: adminProfile.contact_email || "",
          bio: adminProfile.bio || "",
        },
        adminSession.apiKey
      );
      setNotice("Admin profile updated.");
    } catch (error) {
      setNotice(`Admin profile update failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setMemberSession(null);
    setAdminSession(null);
    setInviteLinks({});
    setInviteTokenInput("");
    setLeaderRequests([]);
    if (activeInviteToken) {
      setScreen("invite-preview");
      return;
    }
    setScreen("home");
    setNotice("Logged out.");
  }

  function goHome() {
    if (activeInviteToken) {
      setInviteRouteToken(null);
    }
    setScreen("home");
  }

  const navSubtitle =
    screen === "member-dashboard"
      ? "Member Workspace"
      : screen === "admin-dashboard"
        ? "Admin Workspace"
        : screen === "invite-preview"
          ? "Team Invite"
          : "IET On Campus";

  const navItems =
    screen === "member-dashboard"
      ? [
          { key: "dashboard", label: "Dashboard", active: memberTab === "dashboard", onClick: () => setMemberTab("dashboard") },
          {
            key: "register-event",
            label: "Event Registration",
            active: memberTab === "register-event",
            onClick: () => setMemberTab("register-event"),
          },
          {
            key: "registered-events",
            label: "Registered Teams",
            active: memberTab === "registered-events",
            onClick: () => setMemberTab("registered-events"),
          },
          { key: "profile", label: "Profile", active: memberTab === "profile", onClick: () => setMemberTab("profile") },
        ]
      : screen === "admin-dashboard"
        ? [
            {
              key: "current-events",
              label: "Current Events",
              active: adminTab === "current-events",
              onClick: () => setAdminTab("current-events"),
            },
            { key: "add-events", label: "Add Events", active: adminTab === "add-events", onClick: () => setAdminTab("add-events") },
            { key: "profile", label: "Profile", active: adminTab === "profile", onClick: () => setAdminTab("profile") },
          ]
        : [
            { key: "home", label: "Home", active: screen === "home", onClick: goHome },
            {
              key: "member",
              label: "Member",
              active: screen === "member-auth",
              onClick: () => {
                if (memberSession) {
                  if (activeInviteToken) setInviteRouteToken(null);
                  setScreen("member-dashboard");
                  return;
                }
                setScreen("member-auth");
              },
            },
            {
              key: "admin",
              label: "Admin",
              active: screen === "admin-auth",
              onClick: () => {
                if (adminSession) {
                  if (activeInviteToken) setInviteRouteToken(null);
                  setScreen("admin-dashboard");
                  return;
                }
                setScreen("admin-auth");
              },
            },
          ];

  const handleBrandClick =
    screen === "member-dashboard"
      ? () => setMemberTab("dashboard")
      : screen === "admin-dashboard"
        ? () => setAdminTab("current-events")
        : screen === "invite-preview" && activeInviteToken
          ? () => setScreen("invite-preview")
          : goHome;

  return (
    <div className="app-shell">
      <div className="ambient" />
      <main className="container">
        {screen !== "home" && (
          <SiteNav
            items={navItems}
            subtitle={navSubtitle}
            onBrandClick={handleBrandClick}
            onLogout={memberSession || adminSession ? logout : undefined}
          />
        )}

        {showShellHeader && (
          <section className="page-hero">
            <div>
              <p className="eyebrow">IET TechSphere</p>
              <h1>{heading.title}</h1>
            </div>
            <div className="hero-meta">
              {heading.tags.map((tag) => (
                <span className="hero-pill" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {showShellHeader && notice && <p className="notice">{notice}</p>}

        <section className="page-content">
          {screen === "home" && <HomePage onOpenMember={() => setScreen("member-auth")} onOpenAdmin={() => setScreen("admin-auth")} />}
          {screen === "member-auth" && (
            <MemberAuthPage
              tab={memberAuthTab}
              busy={busy}
              loginEmail={loginEmail}
              loginPassword={loginPassword}
              registerName={registerName}
              registerEmail={registerEmail}
              registerOtp={registerOtp}
              registerPassword={registerPassword}
              setTab={setMemberAuthTab}
              setLoginEmail={setLoginEmail}
              setLoginPassword={setLoginPassword}
              setRegisterName={setRegisterName}
              setRegisterEmail={setRegisterEmail}
              setRegisterOtp={setRegisterOtp}
              setRegisterPassword={setRegisterPassword}
              onLogin={onMemberLogin}
              onRegister={onMemberRegister}
              onSendOtp={onSendOtp}
              onBack={() => setScreen(activeInviteToken ? "invite-preview" : "home")}
            />
          )}
          {screen === "admin-auth" && (
            <AdminAuthPage
              apiKey={adminKeyInput}
              busy={busy}
              setApiKey={setAdminKeyInput}
              onSubmit={onAdminLogin}
              onBack={() => setScreen(activeInviteToken ? "invite-preview" : "home")}
            />
          )}
          {screen === "invite-preview" && (
            <InvitePreviewPage
              busy={busy}
              invite={invitePreview}
              memberEmail={memberSession?.email}
              onBack={() => {
                setInviteRouteToken(null);
                setScreen(memberSession ? "member-dashboard" : "home");
              }}
              onLoginToJoin={() => {
                setScreen("member-auth");
                setMemberAuthTab("login");
                setNotice("Login as a member to send your join request.");
              }}
              onRequestJoin={() => {
                void onJoinInvite(activeInviteToken);
              }}
            />
          )}
          {screen === "member-dashboard" && memberSession && (
            <MemberDashboard
              email={memberSession.email}
              busy={busy}
              tab={memberTab}
              events={events}
              teams={memberTeams}
              leaderRequests={leaderRequests}
              teamEventId={teamEventId}
              teamName={teamName}
              inviteTokenInput={inviteTokenInput}
              inviteLinks={inviteLinks}
              profile={memberProfile}
              canUseNativeShare={canUseNativeShare}
              setTeamEventId={setTeamEventId}
              setTeamName={setTeamName}
              setInviteTokenInput={setInviteTokenInput}
              setProfile={setMemberProfile}
              onRegisterTeam={onRegisterTeam}
              onCopyInviteLink={(teamId) => {
                void onCopyInviteLink(teamId);
              }}
              onShareInviteWhatsApp={(teamId) => {
                void onShareInviteWhatsApp(teamId);
              }}
              onNativeShareInvite={(teamId) => {
                void onNativeShareInvite(teamId);
              }}
              onJoinInvite={() => {
                void onJoinInvite();
              }}
              onApproveJoinRequest={(requestId) => {
                void onApproveJoinRequest(requestId);
              }}
              onRejectJoinRequest={(requestId) => {
                void onRejectJoinRequest(requestId);
              }}
              onSaveProfile={onSaveMemberProfile}
            />
          )}
          {screen === "admin-dashboard" && adminSession && (
            <AdminDashboard
              tab={adminTab}
              busy={busy}
              events={events}
              teams={adminTeams}
              selectedEventId={selectedEventId}
              attendanceMap={attendanceMap}
              eventSearch={eventSearch}
              teamSearch={teamSearch}
              eventTitle={eventTitle}
              eventDescription={eventDescription}
              eventLocation={eventLocation}
              eventStart={eventStart}
              eventEnd={eventEnd}
              profile={adminProfile}
              setSelectedEventId={setSelectedEventId}
              setEventSearch={setEventSearch}
              setTeamSearch={setTeamSearch}
              setEventTitle={setEventTitle}
              setEventDescription={setEventDescription}
              setEventLocation={setEventLocation}
              setEventStart={setEventStart}
              setEventEnd={setEventEnd}
              setProfile={setAdminProfile}
              onCreateEvent={onCreateEvent}
              onDeleteEvent={(eventId) => {
                void onDeleteEvent(eventId);
              }}
              onAttendanceToggle={(userId, checked) => {
                void onAttendanceToggle(userId, checked);
              }}
              onSaveProfile={onSaveAdminProfile}
            />
          )}
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}
