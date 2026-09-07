import { createFileRoute, Outlet } from "@tanstack/react-router";

// Admin sessions live in the browser, so this portal renders client-side.
export const Route = createFileRoute("/admin")({
  ssr: false,
  component: () => <Outlet />,
});
