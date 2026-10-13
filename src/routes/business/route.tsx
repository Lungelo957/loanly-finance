import { createFileRoute, Outlet } from "@tanstack/react-router";

// Sessions live in the browser, so the whole business portal renders client-side.
export const Route = createFileRoute("/business")({
  ssr: false,
  component: () => <Outlet />,
});
