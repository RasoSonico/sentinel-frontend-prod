import React, { useEffect } from "react";
import { useAppSelector } from "src/redux/hooks";
import { selectUser } from "src/redux/selectors/authSelectors";
import { telemetry } from "src/services/telemetry";

export function TelemetryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAppSelector(selectUser);

  useEffect(() => {
    if (user?.id && user?.roles?.[0]) {
      telemetry.init(user.id, user.roles[0]);
    }
  }, [user?.id, user?.roles]);

  return <>{children}</>;
}
