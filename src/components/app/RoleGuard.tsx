import type { ReactNode } from "react";
import { useAppStore, type AppRole } from "@/store";
import RestrictedAccess from "@/components/app/RestrictedAccess";

interface RoleGuardProps {
  allowedRoles: Exclude<AppRole, null>[];
  children: ReactNode;
  description?: string;
}

export default function RoleGuard({ allowedRoles, children, description }: RoleGuardProps) {
  const role = useAppStore((state) => state.selectedRole) || "Lawyer";

  if (!allowedRoles.includes(role)) {
    return <RestrictedAccess description={description} />;
  }

  return <>{children}</>;
}
