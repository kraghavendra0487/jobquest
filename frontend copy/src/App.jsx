import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";

import StudentDashboard from "./pages/student/Dashboard";
import StudentJobs from "./pages/student/Jobs";
import StudentProfile from "./pages/student/Profile";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminUpload from "./pages/admin/Upload";
import AdminJobs from "./pages/admin/Jobs";
import AdminCompanies from "./pages/admin/Companies";
import UploadHistory from "./pages/admin/UploadHistory";
import ProcessedView from "./pages/admin/ProcessedView";
import Schools from "./pages/admin/Schools";

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin/dashboard" element={<PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/upload" element={<PrivateRoute adminOnly><AdminUpload /></PrivateRoute>} />
          <Route path="/admin/uploads/history" element={<PrivateRoute adminOnly><UploadHistory /></PrivateRoute>} />
          <Route path="/admin/uploads/:uploadId/processed" element={<PrivateRoute adminOnly><ProcessedView /></PrivateRoute>} />
          <Route path="/admin/schools" element={<PrivateRoute adminOnly><Schools /></PrivateRoute>} />
          <Route path="/admin/jobs" element={<PrivateRoute adminOnly><AdminJobs /></PrivateRoute>} />
          <Route path="/admin/companies" element={<PrivateRoute adminOnly><AdminCompanies /></PrivateRoute>} />

          <Route path="/student/dashboard" element={<PrivateRoute><StudentDashboard /></PrivateRoute>} />
          <Route path="/student/jobs" element={<PrivateRoute><StudentJobs /></PrivateRoute>} />
          <Route path="/student/profile" element={<PrivateRoute><StudentProfile /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
