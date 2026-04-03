import { InvitePreviewItem } from "../types";

interface InvitePreviewPageProps {
  busy: boolean;
  invite: InvitePreviewItem | null;
  memberEmail?: string | null;
  onBack: () => void;
  onLoginToJoin: () => void;
  onRequestJoin: () => void;
}

function eventRange(startsAt: string, endsAt: string): string {
  return `${new Date(startsAt).toLocaleString()} - ${new Date(endsAt).toLocaleString()}`;
}

export function InvitePreviewPage({
  busy,
  invite,
  memberEmail,
  onBack,
  onLoginToJoin,
  onRequestJoin,
}: InvitePreviewPageProps) {
  if (!invite) {
    return (
      <article className="card invite-preview-card">
        <h2>Invite Preview</h2>
        <p className="muted">This invite could not be loaded. It may have expired or the backend may have restarted.</p>
        <button className="btn-outline" type="button" onClick={onBack}>
          Back
        </button>
      </article>
    );
  }

  const leader = invite.team.leader ?? invite.team.members.find((member) => member.id === invite.team.leader_id) ?? null;
  const normalizedMemberEmail = memberEmail?.trim().toLowerCase() ?? "";
  const isLeader = Boolean(leader && leader.email.toLowerCase() === normalizedMemberEmail);
  const isMember = invite.team.members.some((member) => member.email.toLowerCase() === normalizedMemberEmail);

  return (
    <article className="card invite-preview-card">
      <div className="invite-preview-head">
        <div>
          <p className="team-detail-kicker">Team Invite</p>
          <h2>{invite.team.name}</h2>
          <p className="muted">{invite.event.title}</p>
        </div>
        <button className="btn-outline" type="button" onClick={onBack}>
          Back
        </button>
      </div>

      <div className="invite-preview-meta">
        <div>
          <span>Leader</span>
          <strong>{leader?.full_name || leader?.email || "Not assigned"}</strong>
        </div>
        <div>
          <span>Members</span>
          <strong>{invite.team.members.length}</strong>
        </div>
        <div>
          <span>Event Time</span>
          <strong>{eventRange(invite.event.starts_at, invite.event.ends_at)}</strong>
        </div>
      </div>

      <div className="invite-preview-summary">
        <div>
          <h3>About The Event</h3>
          <p className="muted">{invite.event.description || "No event description added yet."}</p>
          <p className="muted">Location: {invite.event.location || "Location TBA"}</p>
        </div>

        <div className="invite-preview-cta">
          {!memberEmail && (
            <>
              <p className="muted">Log in as a member first, then you can send a request to the team leader.</p>
              <button className="btn-primary" type="button" onClick={onLoginToJoin}>
                Login To Ask To Join
              </button>
            </>
          )}

          {memberEmail && isLeader && <p className="muted">You created this team, so there is nothing to request here.</p>}
          {memberEmail && !isLeader && isMember && <p className="muted">You are already part of this team.</p>}

          {memberEmail && !isLeader && !isMember && (
            <>
              <p className="muted">Send a join request. The team leader will review and approve it from their workspace.</p>
              <button className="btn-primary" disabled={busy} type="button" onClick={onRequestJoin}>
                {busy ? "Sending Request..." : "Ask To Join"}
              </button>
            </>
          )}
        </div>
      </div>

      <section className="invite-members-panel">
        <div className="invite-members-head">
          <h3>Registered Members</h3>
          <span className="team-count-badge">{invite.team.members.length} total</span>
        </div>

        <div className="team-member-list">
          {invite.team.members.map((member) => {
            const memberIsLeader = member.id === invite.team.leader_id;
            return (
              <article key={member.id} className="team-member-row">
                <div className="team-member-copy">
                  <div className="team-member-title-row">
                    <p>{member.full_name || member.email}</p>
                    {memberIsLeader && <span className="role-pill">Leader</span>}
                  </div>
                  <small>{member.email}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </article>
  );
}
