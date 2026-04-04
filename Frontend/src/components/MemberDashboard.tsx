import { FormEvent, useEffect, useState } from "react";

import { ACADEMIC_BRANCH_OPTIONS, AcademicBranch, EventItem, MemberProfile, TeamItem, TeamJoinRequestItem, TeamMember } from "../types";

interface MemberDashboardProps {
  email: string;
  busy: boolean;
  academicProfileLocked: boolean;
  tab: "dashboard" | "register-event" | "registered-events" | "profile";
  events: EventItem[];
  teams: TeamItem[];
  leaderRequests: TeamJoinRequestItem[];
  teamEventId: string;
  teamName: string;
  inviteTokenInput: string;
  inviteLinks: Record<number, string>;
  profile: MemberProfile;
  canUseNativeShare: boolean;
  setTeamEventId: (value: string) => void;
  setTeamName: (value: string) => void;
  setInviteTokenInput: (value: string) => void;
  setProfile: (profile: MemberProfile) => void;
  onRegisterTeam: (event: FormEvent) => void;
  onCopyInviteLink: (teamId: number) => void;
  onShareInviteWhatsApp: (teamId: number) => void;
  onNativeShareInvite: (teamId: number) => void;
  onJoinInvite: () => void;
  onApproveJoinRequest: (requestId: number) => void;
  onRejectJoinRequest: (requestId: number) => void;
  onSaveProfile: (event: FormEvent) => void;
}

function eventTitleFromId(eventId: number, events: EventItem[]): string {
  return events.find((event) => event.id === eventId)?.title ?? `Event #${eventId}`;
}

function eventRange(event: EventItem): string {
  return `${new Date(event.starts_at).toLocaleString()} - ${new Date(event.ends_at).toLocaleString()}`;
}

function teamLeader(team: TeamItem): TeamMember | null {
  return team.leader ?? team.members.find((member) => member.id === team.leader_id) ?? null;
}

export function MemberDashboard(props: MemberDashboardProps) {
  const {
    email,
    busy,
    academicProfileLocked,
    tab,
    events,
    teams,
    leaderRequests,
    teamEventId,
    teamName,
    inviteTokenInput,
    inviteLinks,
    profile,
    canUseNativeShare,
    setTeamEventId,
    setTeamName,
    setInviteTokenInput,
    setProfile,
    onRegisterTeam,
    onCopyInviteLink,
    onShareInviteWhatsApp,
    onNativeShareInvite,
    onJoinInvite,
    onApproveJoinRequest,
    onRejectJoinRequest,
    onSaveProfile,
  } = props;

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const effectiveTab = academicProfileLocked ? "profile" : tab;

  useEffect(() => {
    if (effectiveTab !== "registered-events") {
      setSelectedTeamId(null);
    }
  }, [effectiveTab]);

  useEffect(() => {
    if (selectedTeamId === null) return;
    const stillExists = teams.some((team) => team.id === selectedTeamId);
    if (!stillExists) {
      setSelectedTeamId(null);
    }
  }, [teams, selectedTeamId]);

  const activeTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const normalizedEmail = email.trim().toLowerCase();
  const activeLeader = activeTeam ? teamLeader(activeTeam) : null;
  const isActiveLeader = Boolean(activeLeader && activeLeader.email.toLowerCase() === normalizedEmail);
  const activeTeamRequests = activeTeam ? leaderRequests.filter((request) => request.team_id === activeTeam.id) : [];

  return (
    <section className="dashboard">
      <div className="content">
        {effectiveTab === "dashboard" && (
          <article className="card">
            <h2>Member Dashboard</h2>
            <div className="member-identity-card">
              <div>
                <span>Member Name</span>
                <strong>{profile.full_name?.trim() || "Name not provided during signup"}</strong>
              </div>
              <div>
                <span>Email ID</span>
                <strong>{profile.email || email}</strong>
              </div>
            </div>
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
                Join Team by Invite Link or Token
                <input
                  value={inviteTokenInput}
                  onChange={(event) => setInviteTokenInput(event.target.value)}
                  type="text"
                  placeholder="Paste invite link or token here"
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

        {effectiveTab === "register-event" && (
          <article className="card">
            <h2>Register Event</h2>
            <p className="muted">Registering a team makes you the team leader and unlocks invite sharing plus join-request approvals.</p>
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

        {effectiveTab === "registered-events" && (
          <article className="card">
            <div className="registered-team-head">
              <div>
                <h2>Registered Teams</h2>
                <p className="muted">Open any team to view the leader, all registered members, and leader-only invite controls.</p>
              </div>
              <span className="team-count-badge">{teams.length} teams</span>
            </div>

            {teams.length === 0 && <p className="empty">No teams registered yet.</p>}

            {teams.length > 0 && (
              <div className="team-browser">
                <section className="team-list-panel">
                  <ul className="team-list">
                    {teams.map((team) => {
                      const leader = teamLeader(team);
                      const isSelected = activeTeam?.id === team.id;
                      const isLeader = leader?.email.toLowerCase() === normalizedEmail;
                      return (
                        <li key={team.id}>
                          <button
                            type="button"
                            className={isSelected ? "team-list-item active" : "team-list-item"}
                            onClick={() => setSelectedTeamId(isSelected ? null : team.id)}
                          >
                            <div className="team-list-copy">
                              <div className="team-list-title-row">
                                <strong>{team.name}</strong>
                                {isLeader && <span className="role-pill">Leader</span>}
                              </div>
                              <small>{eventTitleFromId(team.event_id, events)}</small>
                            </div>
                            <span className="team-list-count">{team.members.length}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {activeTeam && (
                  <article className="team-detail-card">
                    <div className="team-detail-head">
                      <div>
                        <p className="team-detail-kicker">Team Details</p>
                        <h3>{activeTeam.name}</h3>
                        <p className="muted">{eventTitleFromId(activeTeam.event_id, events)}</p>
                      </div>
                      <div className="team-detail-actions">
                        <div className="team-detail-stats">
                          <div>
                            <span>Members</span>
                            <strong>{activeTeam.members.length}</strong>
                          </div>
                          <div>
                            <span>Your Role</span>
                            <strong>{isActiveLeader ? "Leader" : "Member"}</strong>
                          </div>
                        </div>
                        <button className="btn-outline" type="button" onClick={() => setSelectedTeamId(null)}>
                          Close
                        </button>
                      </div>
                    </div>

                    <section className="team-role-panel">
                      <div className="team-role-card leader">
                        <span className="team-role-label">Team Leader</span>
                        <strong>{activeLeader?.full_name || activeLeader?.email || "Not assigned"}</strong>
                        <small>{activeLeader?.email || "No email available"}</small>
                      </div>
                      <div className="team-role-card">
                        <span className="team-role-label">Members</span>
                        <strong>{Math.max(activeTeam.members.length - 1, 0)}</strong>
                        <small>Registered teammates besides the leader</small>
                      </div>
                    </section>

                    <div className="team-member-list">
                      {activeTeam.members.map((member) => {
                        const memberIsLeader = member.id === activeTeam.leader_id;
                        return (
                          <article key={member.id} className="team-member-row">
                            <div className="team-member-copy">
                              <div className="team-member-title-row">
                                <p>{member.full_name || member.email}</p>
                                {memberIsLeader && <span className="role-pill">Leader</span>}
                                {!memberIsLeader && <span className="member-pill">Member</span>}
                              </div>
                              <small>{member.email}</small>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    {isActiveLeader ? (
                      <>
                        <section className="team-share-panel">
                          <div>
                            <h4>Share Invite</h4>
                            <p className="muted">Only the team leader can share invite links and review incoming join requests.</p>
                          </div>
                          <div className="team-share-actions">
                            <button className="btn-outline" disabled={busy} type="button" onClick={() => onCopyInviteLink(activeTeam.id)}>
                              Copy Invite Link
                            </button>
                            <button className="btn-outline" disabled={busy} type="button" onClick={() => onShareInviteWhatsApp(activeTeam.id)}>
                              Share On WhatsApp
                            </button>
                            {canUseNativeShare && (
                              <button className="btn-outline" disabled={busy} type="button" onClick={() => onNativeShareInvite(activeTeam.id)}>
                                More Share Options
                              </button>
                            )}
                          </div>
                          {inviteLinks[activeTeam.id] && <small className="invite-link">{inviteLinks[activeTeam.id]}</small>}
                        </section>

                        <section className="join-request-panel">
                          <div className="join-request-head">
                            <div>
                              <h4>Pending Join Requests</h4>
                              <p className="muted">Approve or reject who gets added to this team.</p>
                            </div>
                            <span className="team-count-badge">{activeTeamRequests.length} pending</span>
                          </div>

                          {activeTeamRequests.length === 0 && <p className="empty">No pending requests for this team right now.</p>}

                          {activeTeamRequests.length > 0 && (
                            <div className="join-request-list">
                              {activeTeamRequests.map((request) => (
                                <article key={request.id} className="join-request-item">
                                  <div className="join-request-copy">
                                    <strong>{request.requester.full_name || request.requester.email}</strong>
                                    <small>{request.requester.email}</small>
                                  </div>
                                  <div className="join-request-actions">
                                    <button className="btn-primary" disabled={busy} type="button" onClick={() => onApproveJoinRequest(request.id)}>
                                      Approve
                                    </button>
                                    <button className="btn-outline" disabled={busy} type="button" onClick={() => onRejectJoinRequest(request.id)}>
                                      Reject
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </section>
                      </>
                    ) : (
                      <section className="team-share-panel passive">
                        <h4>Invite Controls</h4>
                        <p className="muted">Invite sharing and join approvals are available only to the team leader who registered this team.</p>
                      </section>
                    )}
                  </article>
                )}
              </div>
            )}
          </article>
        )}

        {effectiveTab === "profile" && (
          <article className="card">
            <div className="profile-form-head">
              <div>
                <h2>Member Profile</h2>
                <p className="muted">
                  Academic Profile is required before event registration, team creation, invite joining, and leader actions unlock.
                </p>
              </div>
              <span className={academicProfileLocked ? "role-pill" : "team-count-badge"}>
                {academicProfileLocked ? "Required" : "Unlocked"}
              </span>
            </div>

            {academicProfileLocked && (
              <div className="profile-lock-banner">
                Fill your roll number, branch, and year first. Once saved, the rest of the member workspace becomes available.
              </div>
            )}

            <form className="form" onSubmit={onSaveProfile}>
              <div className="profile-stack">
                <section className="profile-section-card">
                  <div className="profile-section-head">
                    <div>
                      <p className="section-kicker">Account Details</p>
                      
                    </div>
                    
                  </div>

                  <label>
                    Full Name
                    <input value={profile.full_name?.trim() || ""} type="text" readOnly placeholder="Name not provided during signup" />
                  </label>
                  <label>
                    Email ID
                    <input value={profile.email || email} type="email" readOnly />
                  </label>
                </section>

                <section className="profile-section-card">
                  <div className="profile-section-head">
                    <div>
                      <p className="section-kicker">Academic Profile</p>
                      <h3>Required For Access</h3>
                    </div>
                    <span className="member-pill">Mandatory</span>
                  </div>

                  <label>
                    Roll Number
                    <input
                      value={profile.roll_no ?? ""}
                      onChange={(event) => setProfile({ ...profile, roll_no: event.target.value })}
                      type="text"
                      required
                    />
                  </label>
                  <label>
                    Branch
                    <select
                      value={profile.branch ?? ""}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          branch: event.target.value ? (event.target.value as AcademicBranch) : null,
                        })
                      }
                      required
                    >
                      <option value="">Select branch</option>
                      {ACADEMIC_BRANCH_OPTIONS.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Year
                    <select
                      value={profile.year ? String(profile.year) : ""}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          year: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                      required
                    >
                      <option value="">Select year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </label>
                </section>

                <section className="profile-section-card">
                  <div className="profile-section-head">
                    <div>
                      <p className="section-kicker">Digital Presence</p>
                      
                    </div>
                    
                  </div>

                  <label>
                    GitHub URL
                    <input
                      value={profile.github_url ?? ""}
                      onChange={(event) => setProfile({ ...profile, github_url: event.target.value })}
                      type="url"
                      placeholder="https://github.com/username"
                    />
                  </label>
                  <label>
                    LinkedIn URL
                    <input
                      value={profile.linkedin_url ?? ""}
                      onChange={(event) => setProfile({ ...profile, linkedin_url: event.target.value })}
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </label>
                  <label>
                    Portfolio / Website URL
                    <input
                      value={profile.portfolio_url ?? ""}
                      onChange={(event) => setProfile({ ...profile, portfolio_url: event.target.value })}
                      type="url"
                      placeholder="https://your-site.dev"
                    />
                  </label>
                </section>
              </div>
              <button className="btn-primary" disabled={busy} type="submit">
                {academicProfileLocked ? "Save And Continue" : "Save Profile"}
              </button>
            </form>
          </article>
        )}
      </div>
    </section>
  );
}
