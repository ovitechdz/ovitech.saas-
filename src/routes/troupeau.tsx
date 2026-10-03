import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/troupeau")({ component: TroupeauLayout });

function TroupeauLayout() {
  return <Outlet />;
}