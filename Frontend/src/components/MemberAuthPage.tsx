import { FormEvent } from "react";

interface MemberAuthPageProps {
  tab: "login" | "register";
  busy: boolean;
  loginEmail: string;
  loginPassword: string;
  registerName: string;
  registerEmail: string;
  registerOtp: string;
  registerPassword: string;
  setTab: (tab: "login" | "register") => void;
  setLoginEmail: (value: string) => void;
  setLoginPassword: (value: string) => void;
  setRegisterName: (value: string) => void;
  setRegisterEmail: (value: string) => void;
  setRegisterOtp: (value: string) => void;
  setRegisterPassword: (value: string) => void;
  onLogin: (event: FormEvent) => void;
  onRegister: (event: FormEvent) => void;
  onSendOtp: () => void;
  onBack: () => void;
}

export function MemberAuthPage(props: MemberAuthPageProps) {
  const {
    tab,
    busy,
    loginEmail,
    loginPassword,
    registerName,
    registerEmail,
    registerOtp,
    registerPassword,
    setTab,
    setLoginEmail,
    setLoginPassword,
    setRegisterName,
    setRegisterEmail,
    setRegisterOtp,
    setRegisterPassword,
    onLogin,
    onRegister,
    onSendOtp,
    onBack,
  } = props;

  return (
    <section className="card auth-card">
      <div className="tabs">
        <button type="button" className={tab === "login" ? "tab active" : "tab"} onClick={() => setTab("login")}>
          Member Login
        </button>
        <button
          type="button"
          className={tab === "register" ? "tab active" : "tab"}
          onClick={() => setTab("register")}
        >
          Member Register
        </button>
      </div>

      {tab === "login" ? (
        <form className="form" onSubmit={onLogin}>
          <label>
            Email
            <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              type="password"
              required
            />
          </label>
          <div className="row">
            <button className="btn-primary" disabled={busy} type="submit">
              {busy ? "Signing in..." : "Login"}
            </button>
            <button className="btn-outline" type="button" onClick={onBack}>
              Back
            </button>
          </div>
          <p className="form-note">Preview credentials remain available for local testing.</p>
        </form>
      ) : (
        <form className="form" onSubmit={onRegister}>
          <label>
            Full Name
            <input value={registerName} onChange={(event) => setRegisterName(event.target.value)} type="text" />
          </label>
          <label>
            Email
            <input
              value={registerEmail}
              onChange={(event) => setRegisterEmail(event.target.value)}
              type="email"
              required
            />
          </label>
          <button className="btn-outline" type="button" onClick={onSendOtp} disabled={busy}>
            Send OTP
          </button>
          <label>
            OTP
            <input value={registerOtp} onChange={(event) => setRegisterOtp(event.target.value)} type="text" required />
          </label>
          <label>
            Password
            <input
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
              type="password"
              minLength={8}
              required
            />
          </label>
          <div className="row">
            <button className="btn-primary" disabled={busy} type="submit">
              {busy ? "Creating..." : "Create Account"}
            </button>
            <button className="btn-outline" type="button" onClick={onBack}>
              Back
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
