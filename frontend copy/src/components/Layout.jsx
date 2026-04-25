import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Briefcase, Building, Upload, User, Shield, ChevronRight, Settings, History, GraduationCap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/Button";
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "./ui/DropdownMenu";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";

  const adminLinks = [
    { label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Upload Jobs", path: "/admin/upload", icon: <Upload className="w-5 h-5" /> },
    { label: "Upload History", path: "/admin/uploads/history", icon: <History className="w-5 h-5" /> },
    { label: "Schools & Programs", path: "/admin/schools", icon: <GraduationCap className="w-5 h-5" /> },
    { label: "Manage Jobs", path: "/admin/jobs", icon: <Briefcase className="w-5 h-5" /> },
    { label: "Companies", path: "/admin/companies", icon: <Building className="w-5 h-5" /> },
  ];

  const studentLinks = [
    { label: "Dashboard", path: "/student/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Find Jobs", path: "/student/jobs", icon: <Briefcase className="w-5 h-5" /> },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <div className="flex h-screen bg-gray-50/50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col shadow-sm z-10">
        <div className="p-8 pb-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-black text-xl text-gray-900 tracking-tight block leading-none">RVU Portal</span>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1 block">Career Center</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Main Menu</p>
          {links.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <span className={`${isActive ? "text-white" : "text-gray-400 group-hover:text-indigo-600"} transition-colors`}>
                    {link.icon}
                  </span>
                  <span className="font-bold text-sm">{link.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-white/50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          <DropdownMenuRoot>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start space-x-3 h-auto p-3 text-gray-700 hover:bg-gray-100 rounded-2xl font-bold transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden text-left">
                  <p className="text-sm font-black text-gray-900 truncate">{user?.name}</p>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider truncate">
                    {user?.role === 'admin' ? 'Administrator' : user?.school || 'Student'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {!isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/student/profile")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuRoot>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Background blobs for aesthetics */}
        <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl" />
        
        <div className="p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
