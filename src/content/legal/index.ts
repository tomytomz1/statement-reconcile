import { contactPage } from "./contact";
import { privacyPolicy } from "./privacy";
import { refundPolicy } from "./refund-policy";
import { securityPolicy } from "./security";
import { termsOfService } from "./terms";
import type { LegalDocument } from "./types";

/** Every policy document, in the order the footer lists them. */
export const legalDocuments: readonly LegalDocument[] = [
  securityPolicy,
  privacyPolicy,
  termsOfService,
  refundPolicy,
  contactPage,
];

export { contactPage, privacyPolicy, refundPolicy, securityPolicy, termsOfService };
export type { LegalDocument } from "./types";
