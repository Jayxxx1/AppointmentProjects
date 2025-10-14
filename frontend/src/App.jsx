import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Navigation/Layout";
import MainContent from "./components/Maincontent.jsx";
import LoginPage from "./pages/Auth/LoginPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import AppointmentsPages from "./pages/Appointment/AppointmentsPages.jsx";
import CreateAppointment from "./pages/Appointment/CreateAppointments.jsx";
import ProtectedRoute from "./components/Navigation/ProtectedRoute";
import MeetSumPage from "./pages/Main/MeetSumPage.jsx";
import MeetSummaryDetail from "./pages/Main/MeetSummaryDetail.jsx";
import ProjectsPage from "./pages/Project/ProjectPage.jsx";
import AboutPages from "./pages/Main/AboutPage.jsx";
import CreateProject from "./pages/Project/CreateProject.jsx";
import AdminUsersPage from "./pages/Admin/AdminUsersPage.jsx";
import AdminRoute from "./components/Admin/AdminRoutes.jsx";
import AdminLayout from "./components/Admin/AdminLayout.jsx";
import AdminDashboard from "./components/Admin/AdminDashboard.jsx";
import AdminAppointmentsPage from "./pages/Admin/AdminAppointmentsPage.jsx";
import AdminProjectsPage from "./pages/Admin/AdminProjectsPage.jsx";
import ProjectDetail from "./components/ProjectDetail.jsx";
import AppointmentDetail from "./components/AppointmentDetail.jsx";
import LandingPage from "./pages/Main/LandingPage.jsx"; // **[REFACTOR]** Import LandingPage
import { useAuth } from "./contexts/AuthContext.jsx";
import ReschedulePage from "./pages/Appointment/ReschedulePage.jsx";

const AppLayout = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div>Loading...</div>; 
  return isAuthenticated ? <Layout /> : <Navigate to="/landing" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* **[REFACTOR]** ปรับ Route ของ AboutPage ให้อยู่ภายใต้ Layout หลัก */}
      <Route path="/about" element={<Layout><AboutPages/></Layout>}/>

      {/* Admin area: separate layout and routes for administrators */}
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="appointments" element={<AdminAppointmentsPage />} />
        <Route path="projects" element={<AdminProjectsPage />} />
      </Route>

      {/* app under Layout (ทุกอย่างยกเว้น landing, login, register) */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<MainContent />} />
        <Route path="appointments" element={<AppointmentsPages />} />
        <Route path="appointments/create" element={<CreateAppointment />} />
        <Route path="appointments/:id" element={<AppointmentDetail />} />
        <Route path="appointments/:id/reschedule" element={<ReschedulePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/create" element={<CreateProject />} />
        <Route path="projects/details/:id" element={<ProjectDetail />} />
        <Route path="meetsummary" element={<MeetSumPage />} />
  <Route path="meetsummary/:id" element={<MeetSummaryDetail />} />
      </Route>
    </Routes>
  );
}

