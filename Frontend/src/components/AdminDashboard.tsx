import { FormEvent } from "react";

import { AdminProfile, EventItem, TeamItem } from "../types";

interface AdminDashboardProps {
  tab: "current-events" | "add-events" | "profile";
  isDemo: boolean;
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
  setTab: (value: "current-events" | "add-events" | "profile") => void;
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
  onSaveProfile: (event: FormEvent) => void;
}

function eventRange(event: EventItem): string {
  return `${new Date(event.starts_at).toLocaleString()} - ${new Date(event.ends_at).toLocaleString()}`;
}

export function AdminDashboard(props: AdminDashboardProps) {
  const {
    tab,
    isDemo,
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
    setTab,
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
    onSaveProfile,
  } = props;

  const searchedEvents = events.filter((event) =>
    event.title.toLowerCase().includes(eventSearch.trim().toLowerCase())
  );
  const activeEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const searchedTeams = teams.filter((team) => team.name.toLowerCase().includes(teamSearch.trim().toLowerCase()));

  return (
    <section className="dashboard">
      <aside className="card sidebar">
        <h3>Admin Panel</h3>
        <button
          type="button"
          className={tab === "current-events" ? "menu active" : "menu"}
          onClick={() => setTab("current-events")}
        >
          Current Events
        </button>
        <button type="button" className={tab === "add-events" ? "menu active" : "menu"} onClick={() => setTab("add-events")}>
          Add Events
        </button>
        <button type="button" className={tab === "profile" ? "menu active" : "menu"} onClick={() => setTab("profile")}>
          Profile
        </button>
        {isDemo && <span className="badge">Demo Mode</span>}
      </aside>

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
                  <button className="btn-danger" type="button" onClick={() => onDeleteEvent(activeEvent.id)}>
                    Delete Event
                  </button>
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
                <div className="team-grid">
                  {searchedTeams.length === 0 && <p className="empty">No teams found for this event.</p>}
                  {searchedTeams.map((team) => (
                    <article key={team.id} className="team-card">
                      <div className="team-head">
                        <strong>{team.name}</strong>
                        <span>{team.members.length} members</span>
                      </div>
                      <ul>
                        {team.members.map((member) => {
                          const present = attendanceMap[member.id] === "present";
                          return (
                            <li key={member.id}>
                              <div>
                                <p>{member.full_name || member.email}</p>
                                <small>{member.email}</small>
                              </div>
                              <label className="tick">
                                <input
                                  type="checkbox"
                                  checked={present}
                                  onChange={(event) => onAttendanceToggle(member.id, event.target.checked)}
                                />
                                <span>{present ? "Present" : "Absent"}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  ))}
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
                <input value={eventStart} onChange={(event) => setEventStart(event.target.value)} type="datetime-local" required />
              </label>
              <label>
                Ends At
                <input value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} type="datetime-local" required />
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

