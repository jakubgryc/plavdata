import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, ColorSchemeScript } from "@mantine/core";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "@mantine/core/styles.css";
import "mantine-datatable/styles.css";
import "./index.css";
import { theme } from "./theme";
import App from "./App.tsx";
import Home from "./pages/home";
import CompareSwimmers from "./pages/compareSwimmers";
import PersonalBests from "./pages/personalBests";
import ClubRecords from "./pages/clubRecords";
import NotFound from "./pages/notFound";
import Utils from "./pages/utils";

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
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ColorSchemeScript defaultColorScheme="light" />
    <MantineProvider theme={theme} defaultColorScheme="light">
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
