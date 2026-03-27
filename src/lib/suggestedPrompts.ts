export const SUGGESTED_PROMPT_FACT_MARKER = "[Legacy fill-in template]";

export const SUGGESTED_CASE_PROMPTS = [
  {
    label: "Contract breach full analysis",
    prompt:
      "ABC Components Pvt Ltd entered into a supply agreement with Zenith Industrial Traders on January 12, 2026 for delivery of machine parts worth Rs. 8,40,000. The supplier was required to complete delivery by January 30, 2026, but only part of the material was delivered and the rest was delayed despite repeated follow-up. ABC sent reminder emails on February 2 and February 10, 2026. The agreement includes payment, termination, and arbitration clauses. ABC has the signed agreement, purchase order, invoices, and email trail. ABC wants to understand the dispute timeline, key issues, evidence position, and the next legal step for notice or recovery.",
  },
  {
    label: "Payment default recovery",
    prompt:
      "Mira Foods supplied packaged goods to RKS Retail under three invoices issued between November 4, 2025 and December 18, 2025. The total invoice value was Rs. 3,26,000, out of which only Rs. 80,000 was paid. The balance amount remains unpaid even after repeated WhatsApp reminders and email follow-ups. RKS Retail acknowledged the dues in one message and promised payment by January 15, 2026, but no payment was made. Mira Foods has the invoices, ledger, bank entries, and chat history. Mira Foods wants the payment default dispute structured properly for a recovery notice.",
  },
  {
    label: "Vendor agreement dispute",
    prompt:
      "Nova Infra Solutions hired Delta Tech Services under a work order dated August 8, 2025 for installation and maintenance of access-control systems across three office sites. Delta Tech was supposed to complete the work by September 30, 2025, but major parts of the installation remained incomplete and several systems were not functioning properly. Nova Infra has already paid 70 percent of the total contract value and is disputing the remaining amount. The parties exchanged multiple emails about delay, performance defects, and rectification. Nova Infra has the work order, invoices, payment proof, inspection notes, and email records. Nova Infra wants the matter organized into chronology, breach points, disputed obligations, and likely next action.",
  },
  {
    label: "Pre-notice readiness",
    prompt:
      "Riya Sharma rented a flat in Bengaluru and paid a security deposit of Rs. 1,50,000 at the start of the tenancy. She vacated the flat on December 31, 2025 after informing the landlord in advance, but the landlord has not returned the deposit and is claiming repair deductions without bills or invoices. Riya has the rent agreement, move-out photographs, WhatsApp chats, and bank transfer proof for the deposit. No formal legal notice has been sent yet. Riya wants the dispute facts, dates, supporting documents, and evidence gaps structured clearly before preparing a legal notice.",
  },
] as const;

export function isUnfilledSuggestedPrompt(text: string) {
  const normalized = String(text || "").trim();
  if (!normalized) return false;
  return normalized.includes(SUGGESTED_PROMPT_FACT_MARKER);
}
