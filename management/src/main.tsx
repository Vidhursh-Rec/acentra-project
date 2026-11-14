import "./index.css";
import "leaflet/dist/leaflet.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";

import { Fox } from "@/components/Fox";
import { Layout } from "@/components/Layout";
import { SplashGate } from "@/components/Splash";
import { getAdmin } from "@/lib/api";
import Doctors from "@/pages/Doctors";
import Login from "@/pages/Login";
import MapPage from "@/pages/MapPage";
import PatientDetail from "@/pages/PatientDetail";
import Patients from "@/pages/Patients";

function RequireAdmin() {
  return getAdmin() ? <Outlet /> : <Navigate to="/login" replace />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SplashGate>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route element={<Layout />}>
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/map" element={<MapPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/patients" replace />} />
      </Routes>
      <Fox />
    </BrowserRouter>
    </SplashGate>
  </StrictMode>,
);
