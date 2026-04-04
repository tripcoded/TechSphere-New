import { FormEvent, useEffect, useState } from "react";

import { AdminProfile, EventItem, TeamItem } from "../types";

interface AdminDashboardProps {
  tab: "current-events" | "add-events" | "profile";
  busy: boolean;
  events: EventItem[];
  teams: TeamItem[];
  selectedEventId: number | null;
  attendanceMap: Record<string, "present" | "absent">;
  eventSearch: string;
  teamSearch: string;
  eventTitle: string;
  eventDescription: string;
  eventLocation: string;
  eventStart: string;
  eventEnd: string;
  profile: AdminProfile;
  setSelectedEventId: (value: number) => void;
  setEventSearch: (value: string) => void;
  setTeamSearch: (value: string) => void;
  setEventTitle: (value: string) => void;
  setEventDescription: (value: string) => void;
  setEventLocation: (value: string) => void;
  setEventStart: (value: string) => void;
  setEventEnd: (value: string) => void;
  setProfile: (value: AdminProfile) => void;
  onCreateEvent: (event: FormEvent) => void;
  onDeleteEvent: (eventId: number) => void;
  onAttendanceToggle: (userId: string, checked: boolean) => void;
  onExportEvent: (format: "xlsx" | "pdf") => void;
  onSaveProfile: (event: FormEvent) => void;
}

function eventRange(event: EventItem): string {
  return `${new Date(event.starts_at).toLocaleString()} - ${new Date(event.ends_at).toLocaleString()}`;
}

function teamLeader(team: TeamItem) {
  return team.members.find((member) => member.id === team.leader_id) ?? team.members[0] ?? null;
}

function teamMatchesSearch(team: TeamItem, search: string) {
  const terms = search
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) return true;

  const searchableText = [
    team.name,
    teamLeader(team)?.full_name ?? "",
    teamLeader(team)?.email ?? "",
    ...team.members.flatMap((member) => [
      member.full_name ?? "",
      member.email,
      member.roll_no ?? "",
      member.branch ?? "",
      member.year ? String(member.year) : "",
    ]),
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => searchableText.includes(term));
}

export function AdminDashboard(props: AdminDashboardProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const {
    tab,
    busy,
    events,
    teams,
    selectedEventId,
    attendanceMap,
    eventSearch,
    teamSearch,
    eventTitle,
    eventDescription,
    eventLocation,
    eventStart,
    eventEnd,
    profile,
    setSelectedEventId,
    setEventSearch,
    setTeamSearch,
    setEventTitle,
    setEventDescription,
    setEventLocation,
    setEventStart,
    setEventEnd,
    setProfile,
    onCreateEvent,
    onDeleteEvent,
    onAttendanceToggle,
    onExportEvent,
    onSaveProfile,
  } = props;

  const searchedEvents = events.filter((event) =>
    event.title.toLowerCase().includes(eventSearch.trim().toLowerCase())
  );
  const activeEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const searchedTeams = teams.filter((team) => teamMatchesSearch(team, teamSearch));
  const activeTeam = searchedTeams.find((team) => team.id === selectedTeamId) ?? null;

  useEffect(() => {
    setSelectedTeamId(null);
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedTeamId === null) return;
    const selectedTeamStillVisible = searchedTeams.some((team) => team.id === selectedTeamId);
    if (!selectedTeamStillVisible) {
      setSelectedTeamId(null);
    }
  }, [searchedTeams, selectedTeamId]);

  return (
    <section className="dashboard">
      <div className="content">
        {tab === "current-events" && (
          <article className="card">
            <h2>Current Events</h2>
            <label>
              Search Event
              <input
                value={eventSearch}
                onChange={(event) => setEventSearch(event.target.value)}
                type="text"
                placeholder="Type event name"
              />
            </label>
            <div className="chips">
              {searchedEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className={selectedEventId === event.id ? "chip active" : "chip"}
                  onClick={() => setSelectedEventId(event.id)}
                >
                  {event.title}
                </button>
              ))}
            </div>
            {!activeEvent && <p className="muted">Select an event to locate teams and mark attendance.</p>}

            {activeEvent && (
              <>
                <div className="event-admin-row">
                  <div>
                    <h3>{activeEvent.title}</h3>
                    <p className="muted">{eventRange(activeEvent)}</p>
                  </div>
                  <div className="event-admin-actions">
                    <button className="btn-outline" disabled={busy} type="button" onClick={() => onExportEvent("xlsx")}>
                      Download Excel
                    </button>
                    <button className="btn-outline" disabled={busy} type="button" onClick={() => onExportEvent("pdf")}>
                      Download PDF
                    </button>
                    <button className="btn-danger" type="button" onClick={() => onDeleteEvent(activeEvent.id)}>
                      Delete Event
                    </button>
                  </div>
                </div>

                <label>
                  Search Team
                  <input
                    value={teamSearch}
                    onChange={(event) => setTeamSearch(event.target.value)}
                    type="text"
                    placeholder="Type team name"
                  />
                </label>
                <div className="team-overview">
                  <div className="team-overview-head">
                    <div>
                      <h4>Registered Teams</h4>
                      <p className="muted">Search by team, leader, or member keyword, then open a team to inspect details.</p>
                    </div>
                    <span className="team-count-badge">{searchedTeams.length} teams</span>
                  </div>
                </div>
                <div className="team-browser">
                  <section className="team-list-panel">
                    {searchedTeams.length === 0 && <p className="empty">No teams found for this event.</p>}
                    {searchedTeams.length > 0 && (
                      <ul className="team-list">
                        {searchedTeams.map((team) => {
                          const leader = teamLeader(team);
                          const isActive = activeTeam?.id === team.id;
                          return (
                            <li key={team.id}>
                              <button
                                type="button"
                                className={isActive ? "team-list-item active" : "team-list-item"}
                                onClick={() => setSelectedTeamId(isActive ? null : team.id)}
                              >
                                <div className="team-list-copy">
                                  <strong>{team.name}</strong>
                                  <small>Leader: {leader?.full_name || leader?.email || "Not assigned"}</small>
                                </div>
                                <span className="team-list-count">{team.members.length}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  {activeTeam && (
                    <article className="team-detail-card">
                      <div className="team-detail-head">
                        <div>
                          <p className="team-detail-kicker">Team Details</p>
                          <h3>{activeTeam.name}</h3>
                          <p className="muted">
                            Led by {teamLeader(activeTeam)?.full_name || teamLeader(activeTeam)?.email || "Not assigned"}
                          </p>
                        </div>
                        <div className="team-detail-actions">
                          <div className="team-detail-stats">
                            <div>
                              <span>Members</span>
                              <strong>{activeTeam.members.length}</strong>
                            </div>
                            <div>
                              <span>Leader</span>
                              <strong>1</strong>
                            </div>
                          </div>
                          <button className="btn-outline" type="button" onClick={() => setSelectedTeamId(null)}>
                            Close
                          </button>
                        </div>
                      </div>

                      <div className="team-member-list">
                        {activeTeam.members.map((member) => {
                          const present = attendanceMap[member.id] === "present";
                          const isLeader = member.id === activeTeam.leader_id;
                          return (
                            <article key={member.id} className="team-member-row">
                              <div className="team-member-copy">
                                <div className="team-member-title-row">
                                  <p>{member.full_name || member.email}</p>
                                  {isLeader && <span className="role-pill">Leader</span>}
                                </div>
                                <small>{member.email}</small>
                                <div className="participant-meta-grid">
                                  <span>Roll No: {member.roll_no || "Pending"}</span>
                                  <span>Branch: {member.branch || "Pending"}</span>
                                  <span>Year: {member.year ? `${member.year}` : "Pending"}</span>
                                </div>
                                <div className="participant-link-row">
                                  {member.github_url && (
                                    <a href={member.github_url} target="_blank" rel="noreferrer">
                                      GitHub
                                    </a>
                                  )}
                                  {member.linkedin_url && (
                                    <a href={member.linkedin_url} target="_blank" rel="noreferrer">
                                      LinkedIn
                                    </a>
                                  )}
                                  {member.portfolio_url && (
                                    <a href={member.portfolio_url} target="_blank" rel="noreferrer">
                                      Portfolio
                                    </a>
                                  )}
                                  {!member.github_url && !member.linkedin_url && !member.portfolio_url && (
                                    <span>No digital links added</span>
                                  )}
                                </div>
                              </div>
                              <label className={present ? "attendance-switch is-present" : "attendance-switch"}>
                                <input
                                  type="checkbox"
                                  checked={present}
                                  onChange={(event) => onAttendanceToggle(member.id, event.target.checked)}
                                />
                                <span>{present ? "Present" : "Absent"}</span>
                              </label>
                            </article>
                          );
                        })}
                      </div>
                    </article>
                  )}
                </div>
              </>
            )}
          </article>
        )}

        {tab === "add-events" && (
          <article className="card">
            <h2>Add Event</h2>
            <form className="form" onSubmit={onCreateEvent}>
              <label>
                Title
                <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} type="text" required />
              </label>
              <label>
                Description
                <textarea value={eventDescription} onChange={(event) => setEventDescription(event.target.value)} />
              </label>
              <label>
                Location
                <input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} type="text" />
              </label>
              <label>
                Starts At
                <div className="datetime-input-shell">
                  <input value={eventStart} onChange={(event) => setEventStart(event.target.value)} type="datetime-local" required />
                  <span className="datetime-input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 2v4" />
                      <path d="M16 2v4" />
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18" />
                      <path d="M8 14h.01" />
                      <path d="M12 14h.01" />
                      <path d="M16 14h.01" />
                      <path d="M8 18h.01" />
                      <path d="M12 18h.01" />
                      <path d="M16 18h.01" />
                    </svg>
                  </span>
                </div>
              </label>
              <label>
                Ends At
                <div className="datetime-input-shell">
                  <input value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} type="datetime-local" required />
                  <span className="datetime-input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 2v4" />
                      <path d="M16 2v4" />
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18" />
                      <path d="M8 14h.01" />
                      <path d="M12 14h.01" />
                      <path d="M16 14h.01" />
                      <path d="M8 18h.01" />
                      <path d="M12 18h.01" />
                      <path d="M16 18h.01" />
                    </svg>
                  </span>
                </div>
              </label>
              <button className="btn-primary" disabled={busy} type="submit">
                {busy ? "Saving..." : "Create Event"}
              </button>
            </form>
          </article>
        )}

        {tab === "profile" && (
          <article className="card">
            <h2>Admin Profile</h2>
            <form className="form" onSubmit={onSaveProfile}>
              <label>
                Full Name
                <input
                  value={profile.full_name ?? ""}
                  onChange={(event) => setProfile({ ...profile, full_name: event.target.value })}
                  type="text"
                />
              </label>
              <label>
                Designation
                <input
                  value={profile.designation ?? ""}
                  onChange={(event) => setProfile({ ...profile, designation: event.target.value })}
                  type="text"
                />
              </label>
              <label>
                Organization
                <input
                  value={profile.organization ?? ""}
                  onChange={(event) => setProfile({ ...profile, organization: event.target.value })}
                  type="text"
                />
              </label>
              <label>
                Contact Email
                <input
                  value={profile.contact_email ?? ""}
                  onChange={(event) => setProfile({ ...profile, contact_email: event.target.value })}
                  type="email"
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
