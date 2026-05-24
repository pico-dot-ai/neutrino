import type { AuthenticatedActor } from "@neutrino/schema";
import {
  REQUIRED_ADMIN_GROUP,
  REQUIRED_EMAIL_DOMAIN,
  REQUIRED_ORG_GROUP
} from "./constants";

export function isEligibleAdminActor(actor: AuthenticatedActor) {
  const hasAdminGroup = actor.groups.includes(REQUIRED_ADMIN_GROUP);
  const hasOrgGroup = actor.groups.includes(REQUIRED_ORG_GROUP);
  const hasDomain = actor.email.toLowerCase().endsWith(REQUIRED_EMAIL_DOMAIN);

  return hasAdminGroup && hasOrgGroup && hasDomain;
}
