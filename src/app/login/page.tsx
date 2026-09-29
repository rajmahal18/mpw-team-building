import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="auth-main"><section className="auth-card">
    <div className="eyebrow">Organizer access</div>
    <h1>Sign in to event operations</h1>
    <p className="muted">Use your authorized MPW organizer account.</p>
    {params.error && <div className="notice notice-error" role="alert"><strong>Sign-in failed</strong><span>Check your email and password, then try again.</span></div>}
    <form action={signIn} className="stack auth-form">
      <label>Email<input name="email" type="email" required autoComplete="username"/></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password"/></label>
      <button>Sign in</button>
    </form>
  </section></main>;
}
