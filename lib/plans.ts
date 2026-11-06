export const ORGANIZATION_PLANS = ["base", "premium", "business"] as const;

export type OrganizationPlan = (typeof ORGANIZATION_PLANS)[number];

export const organizationPlanOptions: Array<{
  value: OrganizationPlan;
  label: string;
  description: string;
}> = [
  {
    value: "base",
    label: "Base",
    description: "Dashboard, Conversations e Knowledge.",
  },
  {
    value: "premium",
    label: "Premium",
    description: "Todas as funcionalidades standard do Momo.",
  },
  {
    value: "business",
    label: "Business",
    description: "Premium + funcionalidades e integrações desenvolvidas por orçamento.",
  },
];

export function isOrganizationPlan(value: string): value is OrganizationPlan {
  return (ORGANIZATION_PLANS as readonly string[]).includes(value);
}

export function organizationPlanHasPremiumFeatures(plan: OrganizationPlan) {
  return plan === "premium" || plan === "business";
}

export function organizationPlanLabel(plan: OrganizationPlan) {
  switch (plan) {
    case "business":
      return "Business";
    case "premium":
      return "Premium";
    default:
      return "Base";
  }
}
