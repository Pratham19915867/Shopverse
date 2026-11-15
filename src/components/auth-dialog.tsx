"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, FlaskConical, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Brand, Dialog, Loading, requestJson } from "@/components/ui";
import type { User } from "@/lib/types";

type Challenge = { challengeId: string; demo: boolean; demoCode?: string };

export function AuthDialog({ onClose, onVerified }: { onClose: () => void; onVerified: (user: User) => Promise<void> }) {
  const [lit, setLit] = useState(false);
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("+91");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [policy, setPolicy] = useState(false);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown((value) => value - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  async function sendCode(event?: FormEvent) {
    event?.preventDefault(); setError("");
    if ((country === "+91" && phone.length !== 10) || phone.length < 7 || phone.length > 12) { setError("Please enter a valid mobile number."); return; }
    setBusy(true);
    try { const result = await requestJson<Challenge>("/api/auth/request", { method: "POST", body: JSON.stringify({ phone: `${country}${phone}` }) }); setChallenge(result); setCode(""); setCooldown(60); }
    catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try { const result = await requestJson<{ user: User }>("/api/auth/verify", { method: "POST", body: JSON.stringify({ challengeId: challenge?.challengeId, code }) }); await onVerified(result.user); }
    catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <Dialog title="Log in or sign up to Shopverse" onClose={onClose} className={`auth-dialog ${lit ? "lamp-is-on" : ""}`}>
    <div className="lamp-panel"><Brand light /><div className="lamp-panel-copy"><span className="eyebrow">A LITTLE LIGHT. A LOT TO LOVE.</span><h2>Your kind of things.<br />Your kind of place.</h2></div>
      <button className={`lamp-scene ${lit ? "lit" : ""}`} onClick={() => setLit(!lit)} aria-label={lit ? "Turn the lamp off" : "Turn the lamp on to sign in"} aria-pressed={lit}><span className="lamp-glow" /><span className="lamp-shade" /><span className="lamp-bulb" /><span className="lamp-stem" /><span className="lamp-base" /><span className="lamp-pull"><span /></span><span className="lamp-table" /><span className="lamp-instruction">{lit ? "Looking brighter already." : "Psst… pull the cord to begin"}<Sparkles size={13} /></span></button>
      <div className="lamp-bottom"><span className="tiny-star">✳</span>A whole little universe, just for you.</div>
    </div>
    <div className="auth-content">
      {!lit ? <div className="auth-welcome panel-reveal"><span className="round-feature"><Sparkles size={26} /></span><span className="eyebrow">WELCOME TO SHOPVERSE</span><h2>Good things<br />start here<span>.</span></h2><p>Turn on the light.<br />Make yourself at home.</p><button className="primary-button full-width" onClick={() => setLit(true)}>Let’s get you in<ArrowRight size={18} /></button><span className="auth-footnote">Discover. Shop. Sell. Be you.</span></div> : <div className="panel-reveal auth-form-wrap">
        {challenge ? <><button className="text-button back-link" onClick={() => { setChallenge(null); setError(""); }}><ArrowLeft size={15} /> Change number</button><span className="round-feature"><ShieldCheck size={25} /></span><h2>Check your phone.</h2><p>{challenge.demo ? "Let’s try phone verification for" : "We sent a 6-digit code to"}<br /><strong>{country} {phone}</strong></p><form onSubmit={verify}><label className="field-label" htmlFor="otp">Verification code</label><input id="otp" className="text-input otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} autoFocus required />{challenge.demo && <div className="preview-note"><FlaskConical size={18} /><div><strong>Preview mode · no SMS sent</strong><span>Use code <button type="button" onClick={() => setCode(challenge.demoCode || "")}>{challenge.demoCode}</button> to explore the full experience.</span></div></div>}{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="primary-button full-width" disabled={busy || code.length !== 6}>{busy ? <Loading label="Getting you in…" /> : <>Verify & continue<ArrowRight size={17} /></>}</button><div className="resend-row">Didn’t get it? <button type="button" className="text-button" disabled={cooldown > 0 || busy} onClick={() => sendCode()}>{cooldown ? `Resend in ${cooldown}s` : "Resend code"}</button></div></form></> : <><span className="round-feature"><ShoppingBagIcon /></span><span className="eyebrow">YOUR UNIVERSE AWAITS</span><h2>Make yourself<br />at home.</h2><p>Log in or sign up with your phone number.<br />No passwords. No fuss.</p><form onSubmit={sendCode}><label className="field-label" htmlFor="phone">Mobile number</label><div className="phone-input"><select aria-label="Country code" value={country} onChange={(event) => setCountry(event.target.value)}><option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option><option value="+61">🇦🇺 +61</option></select><input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="Your mobile number" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 12))} required autoFocus /></div><span className="input-hint"><LockKeyhole size={12} />Your number stays private. Always.</span>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-width" type="submit" disabled={busy || !phone}>{busy ? <Loading label="Sending your code…" /> : <>Send verification code<ArrowRight size={17} /></>}</button></form><p className="terms-copy">By continuing, you agree to our <button className="inline-link" onClick={() => setPolicy(!policy)}>Terms & Privacy Policy.</button></p>{policy && <div className="policy-note">We use your phone number to secure your account and your preferences to personalize your feed. Do not upload items you don’t own or unlawful content. This preview uses demo checkout; no payments or deliveries are processed.</div>}</>}
        <div className="secure-footer"><Check size={14} /> A safe space for your next favourite find.</div>
      </div>}
    </div>
  </Dialog>;
}
function ShoppingBagIcon() { return <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 7h14l1 14H4L5 7Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></svg>; }
