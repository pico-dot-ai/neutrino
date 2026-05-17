import type { IdentityPrincipal } from "@neutrino/contracts";
import {
  REQUIRED_ADMIN_ROLE,
  REQUIRED_EMAIL_DOMAIN,
  REQUIRED_ORG_MEMBERSHIP
} from "./constants";

export function isEligibleAdminPrincipal(principal: IdentityPrincipal) {
  const hasRole = principal.roles.includes(REQUIRED_ADMIN_ROLE);
  const hasOrgMembership = principal.orgMemberships.includes(REQUIRED_ORG_MEMBERSHIP);
  const hasDomain = principal.email.toLowerCase().endsWith(REQUIRED_EMAIL_DOMAIN);

  return hasRole && hasOrgMembership && hasDomain;
}
