import { FormEvent } from "react";

import { EventItem, MemberProfile, TeamItem } from "../types";

interface MemberDashboardProps {
  email: string;
  isDemo: boolean;
  busy: boolean;
  tab: "dashboard" | "register-event" | "registered-events" | "profile";
  events: EventItem[];
  teams: TeamItem[];
  teamEventId: string;
  teamName: string;
  inviteTokenInput: string;
  inviteLinks: Record<number, string>;
  profile: MemberProfile;
  setTab: (value: "dashboard" | "register-event" | "registered-events" | "profile") => void;
  setTeamEventId: (value: string) => void;
  setTeamName: (value: string) => void;
  setInviteTokenInput: (value: string) => void;
  setProfile: (profile: MemberProfile) => void;
  onRegisterTeam: (event: FormEvent) => void;
  onGenerateInvite: (teamId: number) => void;
  onJoinInvite: () => void;
  onSaveProfile: (event: FormEvent) => void;
}

function eventTitleFromId(eventId: number, events: EventItem[]): string {
  return events.find((event) => event.id === eventId)?.title ?? `Event #${eventId}`;
}

function eventRange(event: EventItem): string {
  return `${new Date(event.starts_at).toLocaleString()} - ${new Date(event.ends_at).toLocaleString()}`;
}

export function MemberDashboard(props: MemberDashboardProps) {
  const {
    email,
    isDemo,
    busy,
    tab,
    events,
    teams,
    teamEventId,
    teamName,
    inviteTokenInput,
    inviteLinks,
    profile,
    setTab,
    setTeamEventId,
    setTeamName,
    setInviteTokenInput,
    setProfile,
    onRegisterTeam,
    onGenerateInvite,
    onJoinInvite,
    onSaveProfile,
  } = props;

  return (
    <section className="dashboard">
      <aside className="card sidebar">
        <h3>Member Panel</h3>
        <p className="muted">{email}</p>
        <button type="button" className={tab === "dashboard" ? "menu active" : "menu"} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        <button
          type="button"
          className={tab === "register-event" ? "menu active" : "menu"}
          onClick={() => setTab("register-event")}
        >
          Event Registration
        </button>
        <button
          type="button"
          className={tab === "registered-events" ? "menu active" : "menu"}
          onClick={() => setTab("registered-events")}
        >
          Registered Events
        </button>
        <button type="button" className={tab === "profile" ? "menu active" : "menu"} onClick={() => setTab("profile")}>
          Profile
        </button>
        {isDemo && <span className="badge">Demo Mode</span>}
      </aside>

      <div className="content">
        {tab === "dashboard" && (
          <article className="card">
            <h2>Member Dashboard</h2>
            <div className="stats">
              <div>
                <span>Total Events</span>
                <strong>{events.length}</strong>
              </div>
              <div>
                <span>Your Teams</span>
                <strong>{teams.length}</strong>
              </div>
            </div>

            <div className="invite-join-box">
              <label>
                Join Team by Invite Token
                <input
                  value={inviteTokenInput}
                  onChange={(event) => setInviteTokenInput(event.target.value)}
                  type="text"
                  placeholder="Paste invite token here"
                />
              </label>
              <button className="btn-outline" type="button" onClick={onJoinInvite}>
                Join Team
              </button>
            </div>

            <ul className="list">
              {events.map((event) => (
                <li key={event.id}>
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.location ?? "Location TBA"}</p>
                  </div>
                  <small>{eventRange(event)}</small>
                </li>
              ))}
            </ul>
          </article>
        )}

        {tab === "register-event" && (
          <article className="card">
            <h2>Register Event</h2>
            <p className="muted">Create a team first, then share the invite token with teammates.</p>
            <form className="form" onSubmit={onRegisterTeam}>
              <label>
                Event
                <select value={teamEventId} onChange={(event) => setTeamEventId(event.target.value)} required>
                  <option value="">Select event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Team Name
                <input value={teamName} onChange={(event) => setTeamName(event.target.value)} type="text" required />
              </label>
              <button className="btn-primary" disabled={busy} type="submit">
                {busy ? "Submitting..." : "Create Team"}
              </button>
            </form>
          </article>
        )}

        {tab === "registered-events" && (
          <article className="card">
            <h2>Registered Teams</h2>
            <ul className="list">
              {teams.length === 0 && <li className="empty">No teams registered yet.</li>}
              {teams.map((team) => (
                <li key={team.id} className="team-row">
                  <div>
                    <strong>{team.name}</strong>
                    <p>{eventTitleFromId(team.event_id, events)}</p>
                    {inviteLinks[team.id] && <small className="invite-link">{inviteLinks[team.id]}</small>}
                  </div>
                  <button className="btn-outline" type="button" onClick={() => onGenerateInvite(team.id)}>
                    Generate Invite Link
                  </button>
                </li>
              ))}
            </ul>
          </article>
        )}

        {tab === "profile" && (
          <article className="card">
            <h2>Member Profile</h2>
            <form className="form" onSubmit={onSaveProfile}>
              <label>
                Headline
                <input
                  value={profile.headline ?? ""}
                  onChange={(event) => setProfile({ ...profile, headline: event.target.value })}
                  type="text"
                />
              </label>
              <label>
                College / Company
                <input
                  value={profile.college ?? ""}
                  onChange={(event) => setProfile({ ...profile, college: event.target.value })}
                  type="text"
                />
              </label>
              <label>
                Skills
                <input
                  value={profile.skills ?? ""}
                  onChange={(event) => setProfile({ ...profile, skills: event.target.value })}
                  type="text"
                />
              </label>
              <label>
                Github URL
                <input
                  value={profile.github_url ?? ""}
                  onChange={(event) => setProfile({ ...profile, github_url: event.target.value })}
                  type="url"
                />
              </label>
              <label>
                LinkedIn URL
                <input
                  value={profile.linkedin_url ?? ""}
                  onChange={(event) => setProfile({ ...profile, linkedin_url: event.target.value })}
                  type="url"
                />
              </label>
              <label>
                About
                <textarea
                  value={profile.bio ?? ""}
                  onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
                />
              </label>
              <button className="btn-primary" disabled={busy} type="submit">
                Save Profile
              </button>
            </form>
          </article>
        )}
      </div>
    </section>
  );
}

