export type SessionMode = "real" | "demo";

export interface EventItem {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
}

export interface TeamItem {
  id: number;
  name: string;
  event_id: number;
  leader_id: string;
  created_at: string;
  members: TeamMember[];
}

export interface AttendanceItem {
  event_id: number;
  user_id: string;
  status: "present" | "absent";
  updated_at: string;
}

export interface MemberProfile {
  headline: string | null;
  college: string | null;
  bio: string | null;
  skills: string | null;
  github_url: string | null;
  linkedin_url: string | null;
}

export interface AdminProfile {
  full_name: string | null;
  designation: string | null;
  organization: string | null;
  contact_email: string | null;
  bio: string | null;
}

export const DUMMY_MEMBER_CREDENTIALS = {
  email: "demo@techsphere.dev",
  password: "Demo@12345",
};

export const DUMMY_ADMIN_CREDENTIALS = {
  apiKey: "DEMO_ADMIN_KEY",
};

export const DUMMY_EVENTS: EventItem[] = [
  {
    id: 101,
    title: "TechSprint 2026",
    description: "Rapid build challenge for student teams.",
    location: "Innovation Hall",
    starts_at: "2026-04-12T09:00:00Z",
    ends_at: "2026-04-12T18:00:00Z",
    created_at: "2026-04-01T12:00:00Z",
  },
  {
    id: 102,
    title: "Design Duel",
    description: "UI/UX case round and prototype jam.",
    location: "Studio Wing",
    starts_at: "2026-04-18T10:00:00Z",
    ends_at: "2026-04-18T16:30:00Z",
    created_at: "2026-04-01T12:00:00Z",
  },
];

export const DUMMY_TEAMS: TeamItem[] = [
  {
    id: 5001,
    name: "Pixel Pioneers",
    event_id: 102,
    leader_id: "demo-leader-1",
    created_at: "2026-04-02T08:00:00Z",
    members: [
      { id: "demo-leader-1", email: "demo@techsphere.dev", full_name: "Demo Member" },
      { id: "demo-member-2", email: "member2@techsphere.dev", full_name: "Second Member" },
    ],
  },
  {
    id: 5002,
    name: "Algo Architects",
    event_id: 101,
    leader_id: "demo-leader-3",
    created_at: "2026-04-02T09:00:00Z",
    members: [
      { id: "demo-leader-3", email: "captain@techsphere.dev", full_name: "Team Captain" },
      { id: "demo-member-4", email: "member4@techsphere.dev", full_name: "Fourth Member" },
    ],
  },
];
