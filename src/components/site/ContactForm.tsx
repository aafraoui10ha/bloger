"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { sendContactMessage } from "@/app/[locale]/[slug]/actions";
import type { ContactField, ContactState } from "@/lib/contact";

const initial: ContactState = { status: "idle" };

/** Contact form; inputs are controlled so a failed submission keeps what the visitor typed. */
export function ContactForm() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [state, action, pending] = useActionState(sendContactMessage, initial);
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });

  if (state.status === "sent") {
    return (
      <p role="status" className="alert-success">
        {t("sent")}
      </p>
    );
  }

  const invalid = (f: ContactField) => state.status === "error" && state.error === "invalid" && !!state.fields?.includes(f);
  const errorKey = { name: "errorName", email: "errorEmail", subject: "errorSubject", message: "errorMessage" } as const;
  const bind = (f: ContactField) => ({
    id: `contact-${f}`,
    name: f,
    value: values[f],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [f]: e.target.value })),
    "aria-invalid": invalid(f) || undefined,
    "aria-describedby": invalid(f) ? `contact-${f}-error` : undefined,
  });
  const fieldError = (f: ContactField) =>
    invalid(f) && (
      <p id={`contact-${f}-error`} className="mt-1 text-sm text-danger">
        {t(errorKey[f])}
      </p>
    );

  return (
    <form action={action} className="card space-y-4 p-5" noValidate>
      <h2 className="text-lg font-semibold">{t("formTitle")}</h2>
      {state.status === "error" && (
        <p role="alert" className="alert-error">
          {t(state.error === "rate" ? "errorRate" : state.error === "send" ? "errorSend" : "errorInvalid")}
        </p>
      )}
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot, hidden from people and assistive technology. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="label">{t("name")}</label>
          <input {...bind("name")} type="text" className="input w-full" autoComplete="name" maxLength={100} required />
          {fieldError("name")}
        </div>
        <div>
          <label htmlFor="contact-email" className="label">{t("email")}</label>
          <input {...bind("email")} type="email" className="input w-full" autoComplete="email" maxLength={254} dir="ltr" required />
          {fieldError("email")}
        </div>
      </div>
      <div>
        <label htmlFor="contact-subject" className="label">{t("subject")}</label>
        <input {...bind("subject")} type="text" className="input w-full" maxLength={150} />
        {fieldError("subject")}
      </div>
      <div>
        <label htmlFor="contact-message" className="label">{t("message")}</label>
        <textarea {...bind("message")} className="input min-h-40 w-full" maxLength={5000} required />
        {fieldError("message")}
      </div>
      <p className="hint">{t("privacyNote")}</p>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? t("sending") : t("send")}
      </button>
    </form>
  );
}
