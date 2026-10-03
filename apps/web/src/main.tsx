import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import "./index.css";
import { Layout } from "./components/Layout";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Dates from "./pages/Dates";
import DateView from "./pages/DateView";
import Rankings from "./pages/Rankings";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/people/:id" element={<Profile />} />
              <Route path="/dates" element={<Dates />} />
              <Route path="/dates/:id" element={<DateView />} />
              <Route path="/rankings" element={<Rankings />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
