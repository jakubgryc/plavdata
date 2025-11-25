import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTheme, MantineProvider, SegmentedControl } from "@mantine/core";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import "@mantine/core/styles.css";
import "mantine-datatable/styles.css";
import "./index.css";
import App from "./App.tsx";
import Home from "./pages/home";
import CompareSwimmers from "./pages/compareSwimmers";
import PersonalBests from "./pages/personalBests";

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
        path: "osobaky",
        element: <PersonalBests />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>,
);
