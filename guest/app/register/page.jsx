"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Icon } from "@/components/ui/Icon";
import { GlassCard, PrimaryButton, GhostButton, Field, inputClass } from "@/components/portal/primitives";
import { apiRequest } from "@/utils/apiRequest";

const EMPTY = { email: "", otp: "", username: "", password: "", repeatPassword: "", fullName: "", phoneNumber: "", birthDate: "", termsAccepted: false };

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(key) {
    return (event) => {
      const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
      setError("");
    };
  }

  async function requestOtp() {
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(form.email)) {
      setError("Please check your email format.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiRequest("/cinema/auth/otp/request", { email: form.email });
      setOtpSent(true);
      setDevOtp(res?.devOtp ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function continueToDetails() {
    if (!form.otp.trim()) {
      setError("Please enter the OTP sent to your email.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function submit(event) {
    event.preventDefault();
    if (form.password !== form.repeatPassword) {
      setError("Repeat password must match password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest("/cinema/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phoneNumber: form.phoneNumber,
        birthDate: form.birthDate,
        otp: form.otp,
        termsAccepted: form.termsAccepted,
      });
      window.alert("Register Successful!");
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-on-surface">
      <GlassCard className="w-full max-w-sm p-7">
        <h1 className="mb-1 text-center text-xl font-extrabold">Create An Account</h1>
        <p className="mb-6 text-center text-xs text-on-surface-variant">
          {step === 1 ? "Step 1: Email Validation" : "Step 2: Add More Information"}
        </p>

        {error ? <p role="alert" className="mb-4 rounded-xl border border-rose-500/25 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{error}</p> : null}

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <Field label="Enter your email:" icon="mail">
              <input className={inputClass} type="email" value={form.email} onChange={update("email")} />
            </Field>
            <GhostButton type="button" disabled={busy} onClick={requestOtp}>
              {busy && !otpSent ? "Getting OTP..." : otpSent ? "Resend OTP" : "Get OTP"}
            </GhostButton>
            {otpSent ? (
              <Field label="OTP" icon="pin">
                <input className={inputClass} inputMode="numeric" maxLength={6} value={form.otp} onChange={update("otp")} />
                {devOtp ? <span className="text-[11px] text-on-surface-variant">Development OTP: {devOtp}</span> : null}
              </Field>
            ) : null}
            {otpSent ? <PrimaryButton type="button" onClick={continueToDetails}>Continue</PrimaryButton> : null}
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Username" icon="person"><input className={inputClass} value={form.username} onChange={update("username")} /></Field>
            <Field label="Password" icon="lock"><input className={inputClass} type="password" value={form.password} onChange={update("password")} /></Field>
            <Field label="Repeat your password" icon="lock"><input className={inputClass} type="password" value={form.repeatPassword} onChange={update("repeatPassword")} /></Field>
            <Field label="Full Name" icon="badge"><input className={inputClass} value={form.fullName} onChange={update("fullName")} /></Field>
            <Field label="Phone Number" icon="call"><input className={inputClass} value={form.phoneNumber} onChange={update("phoneNumber")} /></Field>
            <Field label="Birth Date" icon="cake"><input className={inputClass} type="date" value={form.birthDate} onChange={update("birthDate")} /></Field>
            <label className="flex items-start gap-2 text-xs text-on-surface-variant">
              <input type="checkbox" className="mt-0.5" checked={form.termsAccepted} onChange={update("termsAccepted")} />
              <span>I agree to the terms of service.</span>
            </label>
            <PrimaryButton type="submit" disabled={busy}>Register</PrimaryButton>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-on-surface-variant">
          Already have an account? <Link href="/" className="font-bold text-primary">Login</Link>
        </p>
      </GlassCard>
    </div>
  );
}
