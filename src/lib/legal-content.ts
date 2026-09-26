// Placeholder operator details — replace once a business and support email exist.
export const LEGAL = {
  product: "Aurora",
  operator: "[Operator Full Name], an individual (sole operator, not yet a registered company)",
  address: "[Street, City, Postal code, Country — to be added]",
  email: "support@aurora-example.com",
  privacyEmail: "privacy@aurora-example.com",
  country: "Romania (European Union)",
  lastUpdated: "26 September 2026",
  minAge: 16,
};

export type LegalDoc = {
  slug: string;
  title: string;
  summary: string;
  sections: { h: string; p: string[] }[];
};

const L = LEGAL;

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "terms",
    title: "Terms & Conditions",
    summary: "The rules for using Aurora.",
    sections: [
      { h: "1. Agreement", p: [`By creating an account or using ${L.product} ("the Service") you agree to these Terms. If you do not agree, do not use the Service. The Service is provided by ${L.operator} ("we", "us").`] },
      { h: "2. Eligibility", p: [`You must be at least ${L.minAge} years old. See the Age Restrictions policy.`] },
      { h: "3. Your account", p: ["You are responsible for keeping your login credentials secure and for all activity under your account. Tell us immediately at " + L.email + " if you suspect unauthorised access."] },
      { h: "4. AI output", p: ["Aurora generates responses using artificial intelligence. Output may be inaccurate, incomplete or offensive and is not professional (legal, medical, financial) advice. You are responsible for reviewing output before relying on it or acting on it, including actions taken in connected apps such as email or calendar."] },
      { h: "5. Connected apps", p: ["When you connect third-party apps, you authorise Aurora to act on your behalf within the permissions you grant. You can disconnect at any time in Settings → Plugins. Third-party services are governed by their own terms."] },
      { h: "6. Credits and plans", p: ["Usage consumes credits based on message length and features used. Credits reset daily and do not roll over or carry cash value. Paid plans are governed by the Subscription & Auto-Renewal Terms and the Refund Policy."] },
      { h: "7. Acceptable use", p: ["You must follow the Acceptable Use Policy. We may suspend or terminate accounts that breach it."] },
      { h: "8. Intellectual property", p: ["We own the Service, its software, design and branding. You keep rights to the content you submit; you grant us a limited licence to process it solely to provide the Service. Subject to law and third-party rights, you may use the output generated for you."] },
      { h: "9. Availability", p: ["The Service is provided \"as is\" and \"as available\". We may change, suspend or discontinue features, and do not guarantee uninterrupted or error-free operation."] },
      { h: "10. Limitation of liability", p: ["To the maximum extent permitted by law, we are not liable for indirect, incidental or consequential losses, lost data or lost profits. Our total liability is limited to the amount you paid us in the 12 months before the claim. Nothing limits liability that cannot be limited by law, including your statutory consumer rights."] },
      { h: "11. Termination", p: ["You may delete your account at any time in Settings → Privacy & legal. We may terminate or suspend access for breach of these Terms."] },
      { h: "12. Changes", p: ["We may update these Terms. For material changes we will notify you in the app or by email in advance. Continued use after the effective date means acceptance."] },
      { h: "13. Governing law", p: [`These Terms are governed by the laws of ${L.country}. If you are a consumer in the EU you also benefit from the mandatory protections of your country of residence and may use the EU Online Dispute Resolution platform.`] },
      { h: "14. Contact", p: [`${L.email}`] },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy (GDPR)",
    summary: "What personal data we collect, why, and your rights.",
    sections: [
      { h: "1. Controller", p: [`The data controller is ${L.operator}, ${L.address}. Contact: ${L.privacyEmail}.`] },
      { h: "2. Data we collect", p: ["Account data: email, name, profile photo, sign-in provider.", "Content: chat messages, uploaded files, generated images, memories and personalisation settings.", "Connected-app data: data from apps you connect (e.g. calendar events, emails) retrieved only when needed to complete your request.", "Usage data: credit usage, plan, timestamps, device/browser information and error logs.", "Payment data (paid plans): handled by our payment processor; we do not store full card details."] },
      { h: "3. Purposes and legal bases (Art. 6 GDPR)", p: ["Providing the Service and your account — performance of contract (Art. 6(1)(b)).", "Security, fraud and abuse prevention, error monitoring — legitimate interests (Art. 6(1)(f)).", "Billing, tax and accounting records — legal obligation (Art. 6(1)(c)).", "Optional analytics cookies and marketing — consent (Art. 6(1)(a)), which you can withdraw at any time."] },
      { h: "4. AI processing", p: ["Your messages are sent to AI model providers to generate responses. We do not use your content to train our own models. We do not make decisions producing legal or similarly significant effects based solely on automated processing."] },
      { h: "5. Sharing", p: ["We share data only with processors needed to run the Service (hosting, database, AI providers, connected-app integrators, payment processor) — see the Third-Party Services disclosure. We do not sell your personal data."] },
      { h: "6. International transfers", p: ["Some processors are outside the EEA. Transfers rely on adequacy decisions (e.g. the EU–US Data Privacy Framework) or Standard Contractual Clauses."] },
      { h: "7. Retention", p: ["Account data and content: until you delete them or your account.", "Deleted accounts: removed from active systems immediately; backups are overwritten within 30 days.", "Billing records: as long as required by tax law (typically up to 10 years).", "Security logs: up to 90 days."] },
      { h: "8. Your rights", p: ["You have the right to access, rectify, erase, restrict, port and object to processing of your data, and to withdraw consent at any time. You can download your data and delete your account in Settings, or submit a request via the Data Request page. We respond within one month.", "You may lodge a complaint with a supervisory authority, e.g. Romania's ANSPDCP (dataprotection.ro) or the authority in your country."] },
      { h: "9. Security", p: ["See the Security & Data-Breach policy."] },
      { h: "10. Children", p: [`The Service is not intended for anyone under ${L.minAge}.`] },
      { h: "11. Changes", p: ["We will notify you of material changes to this policy."] },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    summary: "How we use cookies and similar storage.",
    sections: [
      { h: "What are cookies", p: ["Cookies and local storage are small pieces of data saved in your browser."] },
      { h: "Strictly necessary", p: ["Used to keep you signed in, remember your cookie choice and preferences (such as accent colour), and protect against abuse. These do not need consent and cannot be disabled."] },
      { h: "Analytics (optional)", p: ["Help us understand how the Service is used so we can improve it. Only set if you accept them. We currently do not run third-party advertising cookies."] },
      { h: "Managing your choice", p: ["You can change your choice at any time with the \"Cookie settings\" link at the bottom of legal pages, or by clearing your browser storage."] },
    ],
  },
  {
    slug: "refunds",
    title: "Refund & Cancellation Policy",
    summary: "How to cancel and when refunds apply.",
    sections: [
      { h: "Cancellation", p: ["You can cancel a paid plan at any time. Cancellation stops the next renewal; you keep paid access until the end of the current billing period."] },
      { h: "Refunds", p: ["Subscription fees are generally non-refundable for partially used periods, except where required by law, where the Service was materially unavailable, or in the EU withdrawal case described in the EU 14-Day Withdrawal page. Unused daily credits have no cash value."] },
      { h: "Accidental charges", p: [`If you were charged in error, contact ${L.email} within 14 days and we will review it.`] },
      { h: "How refunds are paid", p: ["Approved refunds go back to the original payment method, usually within 5–10 business days."] },
    ],
  },
  {
    slug: "subscriptions",
    title: "Subscription & Auto-Renewal Terms",
    summary: "How paid plans renew and are billed.",
    sections: [
      { h: "Plans", p: ["Free: 5 credits per day. Plus: €10/month, 50 credits per day. Pro: €30/month, 200 credits per day. Prices include VAT where applicable."] },
      { h: "Auto-renewal", p: ["Paid plans renew automatically every month at the then-current price, charged to your payment method at the start of each period, until you cancel."] },
      { h: "Credits", p: ["Credits reset every day at 00:00 UTC to your plan's daily amount. Unused credits do not stack or roll over. Message cost depends on length and features (min 0.01, max 20 credits)."] },
      { h: "Price changes", p: ["We will give at least 30 days' notice of any price increase. You may cancel before it takes effect."] },
      { h: "Cancelling", p: ["Cancel anytime from the Subscription page. Cancelling takes effect at the end of the current period."] },
      { h: "Failed payments", p: ["If a payment fails your account may revert to the Free plan."] },
    ],
  },
  {
    slug: "withdrawal",
    title: "EU 14-Day Right of Withdrawal",
    summary: "Your right to withdraw from a purchase as an EU consumer.",
    sections: [
      { h: "Your right", p: ["If you are a consumer in the EU/EEA you may withdraw from a paid subscription within 14 days of the purchase without giving a reason."] },
      { h: "Immediate start and loss of right", p: ["Digital services start immediately. At checkout you are asked to expressly request immediate performance and acknowledge that you lose your right of withdrawal once the service has been fully performed. If you withdraw after using the service partially within 14 days, you pay a proportionate amount for the period used and receive the rest back."] },
      { h: "How to withdraw", p: [`Send a clear statement to ${L.email} (for example the model form below). We refund within 14 days using the original payment method.`] },
      { h: "Model withdrawal form", p: [`To: ${L.operator}, ${L.email} — I hereby give notice that I withdraw from my contract for the following service: Aurora [plan], ordered on [date]. Name: [ ]. Account email: [ ]. Date: [ ].`] },
    ],
  },
  {
    slug: "age",
    title: "Age Restrictions & Minors Policy",
    summary: "Who can use Aurora.",
    sections: [
      { h: "Minimum age", p: [`You must be at least ${L.minAge} years old (or the higher age of digital consent in your country) to use Aurora. Paid plans require you to be 18 or have a parent's or guardian's permission.`] },
      { h: "No children's data", p: [`We do not knowingly collect data from children under ${L.minAge}. If you believe a child has created an account, contact ${L.privacyEmail} and we will delete it.`] },
    ],
  },
  {
    slug: "copyright",
    title: "Copyright & Intellectual Property Policy",
    summary: "Ownership and reporting infringement.",
    sections: [
      { h: "Our IP", p: ["The Aurora name, logo, design and software are our property. You may not copy, modify or redistribute them without permission."] },
      { h: "Your content", p: ["You keep ownership of the content you upload. You confirm you have the rights to it."] },
      { h: "Reporting infringement (notice & takedown)", p: [`If you believe content on Aurora infringes your copyright, email ${L.email} with: your contact details, identification of the work, the location of the infringing material, a statement of good-faith belief, and a statement that your notice is accurate and you are authorised to act. We act under the EU Digital Services Act and may remove content and suspend repeat infringers.`] },
      { h: "Counter-notice", p: ["If your content was removed by mistake you may send a counter-notice explaining why."] },
    ],
  },
  {
    slug: "third-parties",
    title: "Third-Party Services Disclosure",
    summary: "The services that help run Aurora.",
    sections: [
      { h: "Processors we use", p: ["Hosting & edge delivery — Cloudflare (global).", "Database, authentication & file storage — Supabase (EU/US).", "AI models — Google (Gemini) and OpenAI via an AI gateway (US).", "Connected-app integrations — Composio (US), used only when you connect apps like Gmail or Google Calendar.", "Sign-in — Google and Apple, if you choose them.", "Payments — a payment processor (e.g. Stripe or Paddle) once paid plans are live."] },
      { h: "Your choice", p: ["Connected apps are optional and can be disconnected anytime. Each provider processes data under its own privacy policy."] },
    ],
  },
  {
    slug: "security",
    title: "Security & Data-Breach Procedures",
    summary: "How we protect data and respond to incidents.",
    sections: [
      { h: "Measures", p: ["Encryption in transit (HTTPS/TLS) and at rest; row-level access rules so users only access their own data; hashed passwords; least-privilege access to production; regular dependency and security scans; OAuth tokens for connected apps stored with the integration provider."] },
      { h: "Breach response", p: ["1. Detect & contain the incident.", "2. Assess the risk to individuals.", "3. Notify the competent supervisory authority within 72 hours of becoming aware, where required (Art. 33 GDPR).", "4. Notify affected users without undue delay when there is a high risk to their rights (Art. 34 GDPR).", "5. Document the incident and remedial actions."] },
      { h: "Report a vulnerability", p: [`Please report security issues to ${L.email}. Don't access other users' data or disrupt the Service while testing.`] },
    ],
  },
  {
    slug: "acceptable-use",
    title: "Acceptable Use & Abuse Policy",
    summary: "What you may not do with Aurora.",
    sections: [
      { h: "You must not", p: ["Break any law or infringe others' rights.", "Create or distribute child sexual abuse material, or sexual content involving minors.", "Harass, threaten, defame or incite violence or hatred.", "Generate malware, phishing, spam or fraudulent content, or impersonate others.", "Attempt to hack, overload, scrape or reverse-engineer the Service, or bypass credit limits.", "Use connected apps to send unsolicited bulk messages.", "Use output for high-risk decisions (medical, legal, credit, employment) without human review.", "Share accounts or resell access without permission."] },
      { h: "Enforcement", p: ["We may remove content, limit features, suspend or terminate accounts, and report illegal activity to authorities."] },
      { h: "Report abuse", p: [`Report abuse to ${L.email}.`] },
    ],
  },
  {
    slug: "imprint",
    title: "Company & Legal Information",
    summary: "Who operates Aurora.",
    sections: [
      { h: "Operator", p: [L.operator, L.address] },
      { h: "Contact", p: [`Support: ${L.email}`, `Privacy: ${L.privacyEmail}`] },
      { h: "Registration", p: ["Trade register number and VAT ID: not applicable yet — will be added once a business is registered."] },
      { h: "Online dispute resolution", p: ["EU consumers can use the European Commission's ODR platform: ec.europa.eu/consumers/odr."] },
    ],
  },
];

export const findDoc = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug);
