import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ecosysteme")({ component: EcosystemeLayout });

function EcosystemeLayout() {
  return <Outlet />;
}