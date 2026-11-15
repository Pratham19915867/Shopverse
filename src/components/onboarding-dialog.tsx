"use client";

import { useState } from "react";
import { Armchair, ArrowLeft, ArrowLeftRight, ArrowRight, Check, CheckCircle2, Dumbbell, Flower2, Headphones, Heart, Layers3, Shapes, Shirt, ShoppingBag, Sparkles, Store, Zap } from "lucide-react";
import { Brand, Dialog, Loading, requestJson } from "@/components/ui";
import { BUDGETS, CATEGORIES, STYLES, type User } from "@/lib/types";

const categoryIcons = [Headphones, Shirt, Armchair, Flower2, Dumbbell];
const styleIcons = [Heart, Shapes, Zap, Layers3];
const steps = ["A little about you", "Your interests", "Your everyday style", "Make it yours"];

export function OnboardingDialog({ user, onClose, onComplete }: { user: User; onClose: () => void; onComplete: (user: User) => void }) {
  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState(user.intent || "buy");
  const [interests, setInterests] = useState<string[]>(user.interests || []);
  const [style, setStyle] = useState(user.style || STYLES[0]);
  const [budget, setBudget] = useState(user.budget || BUDGETS[3]);
  const [username, setUsername] = useState(user.username === "New explorer" ? "" : user.username);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function toggleInterest(category: string) { setInterests((values) => values.includes(category) ? values.filter((value) => value !== category) : [...values, category]); }
  async function complete() {
    setBusy(true); setError("");
    try { const result = await requestJson<{ user: User }>("/api/account", { method: "PATCH", body: JSON.stringify({ username, intent, interests, style, budget }) }); onComplete(result.user); }
    catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  const valid = step === 1 ? interests.length > 0 : step === 3 ? username.trim().length >= 2 : true;
  return <Dialog title="Customize your Shopverse experience" onClose={onClose} className="onboarding-dialog"><Brand /><div className="onboarding-progress">{steps.map((_, index) => <span key={index} className={index <= step ? "complete" : ""} />)}</div><div className="onboarding-step"><span>STEP {step + 1} OF 4</span>{steps[step]}</div>
    <div key={step} className="panel-reveal onboarding-body">
      {step === 0 && <><h2>Let’s make this<br />your kind of universe.</h2><p>First things first. What brings you to Shopverse?</p><div className="intent-options">{[{ value: "buy", title: "I’m here to discover & shop", description: "Find a few new favourites for my everyday.", Icon: ShoppingBag }, { value: "sell", title: "I’d love to sell my products", description: "Give my great products a place to shine.", Icon: Store }, { value: "both", title: "A little bit of both", description: "Good finds are even better when shared.", Icon: ArrowLeftRight }].map(({ value, title, description, Icon }) => <button key={value} className={`choice-card intent-card ${intent === value ? "selected" : ""}`} onClick={() => setIntent(value)} aria-pressed={intent === value}><span className="choice-icon"><Icon size={22} /></span><span><strong>{title}</strong><small>{description}</small></span><span className="choice-check">{intent === value && <Check size={13} />}</span></button>)}</div></>}
      {step === 1 && <><h2>What catches<br />your eye?</h2><p>Pick the things you love. We’ll bring them to your feed.</p><div className="choice-grid">{CATEGORIES.map((category, index) => { const Icon = categoryIcons[index]; return <button key={category} className={`choice-card category-choice ${interests.includes(category) ? "selected" : ""}`} onClick={() => toggleInterest(category)} aria-pressed={interests.includes(category)}><Icon size={27} /><strong>{category}</strong><span className="choice-check">{interests.includes(category) && <Check size={13} />}</span></button>; })}</div><span className="input-hint"><CheckCircle2 size={14} /> Pick as many as you like. You can change these later.</span></>}
      {step === 2 && <><h2>And what’s<br />your everyday vibe?</h2><p>There’s no right answer. Just your answer.</p><div className="choice-grid">{STYLES.map((item, index) => { const Icon = styleIcons[index]; return <button key={item} className={`choice-card category-choice style-choice ${style === item ? "selected" : ""}`} onClick={() => setStyle(item)} aria-pressed={style === item}><Icon size={27} /><strong>{item}</strong><small>{["The useful, feel-good things", "Less, but a little better", "A little personality, please", "I like to keep my options open"][index]}</small><span className="choice-check">{style === item && <Check size={13} />}</span></button>; })}</div></>}
      {step === 3 && <><h2>A good find feels<br />even better at your price.</h2><p>What’s your happy price range?</p><div className="budget-options">{BUDGETS.map((item) => <button key={item} className={`choice-card ${budget === item ? "selected" : ""}`} onClick={() => setBudget(item)} aria-pressed={budget === item}>{item}{budget === item && <Check size={15} />}</button>)}</div><label className="field-label name-label" htmlFor="username">And what should we call you?</label><input id="username" className="text-input" placeholder="Your name or a favourite nickname" value={username} onChange={(event) => setUsername(event.target.value)} maxLength={24} autoComplete="nickname" /><div className="onboarding-preview"><Sparkles size={15} /><span>Your profile tags</span>{interests.slice(0, 2).map((item) => <span className="small-tag" key={item}>{item}</span>)}{interests.length > 2 && <span className="small-tag">+{interests.length - 2}</span>}</div></>}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="onboarding-footer"><button className="text-button" onClick={() => step ? setStep(step - 1) : onClose()}><ArrowLeft size={16} />{step ? "Back" : "Do this later"}</button><button className="primary-button" disabled={!valid || busy} onClick={() => step < 3 ? setStep(step + 1) : complete()}>{busy ? <Loading label="Making it yours…" /> : step === 3 ? <>Create my universe<Sparkles size={17} /></> : <>Continue<ArrowRight size={17} /></>}</button></div><div className="onboarding-note">A few little details. A feed that feels a lot more you.</div>
  </Dialog>;
}
