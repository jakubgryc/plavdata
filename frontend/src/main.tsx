import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "mantine-datatable/styles.css";
import "./index.css";
import App from "./App.tsx";
import { AdminGroupsPage } from "./pages/admin/groups";
import { AdminSwimmersPage } from "./pages/admin/SwimmersAdmin.tsx";
import ClubRecords from "./pages/clubRecords";
import CompareSwimmers from "./pages/compareSwimmers";
import Home from "./pages/home";
import Login from "./pages/login";
import NotFound from "./pages/notFound";
import PersonalBests from "./pages/personalBests";
import SwimmerProfile from "./pages/swimmerProfile";
import Utils from "./pages/utils";
import { theme } from "./theme";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "compare-swimmers",
        element: <CompareSwimmers />,
      },
      {
        path: "personal-bests",
        element: <PersonalBests />,
      },
      {
        path: "club-records",
        element: <ClubRecords />,
      },
      {
        path: "utils",
        element: <Utils />,
      },
      {
        path: "swimmer/:id",
        element: <SwimmerProfile />,
      },
      {
        path: "admin",
        element: <Login />,
      },
      {
        path: "admin/swimmers",
        element: <AdminSwimmersPage />,
      },
      {
        path: "admin/groups",
        element: <AdminGroupsPage />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);
const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <ColorSchemeScript defaultColorScheme="dark" />
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-right" zIndex={1000} />
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
