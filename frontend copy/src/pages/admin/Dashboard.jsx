import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Sparkles, TrendingUp, Building, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ uploads: 0, jobs: 0, companies: 0 });

  useEffect(() => {
    api.get("/admin/uploads").then((res) => {
      setStats((prev) => ({ ...prev, uploads: res.data.data.length }));
    });
    api.get("/admin/jobs", { params: { limit: 100 } }).then((res) => {
      setStats((prev) => ({ ...prev, jobs: res.data.total }));
    });
  }, []);

  return (
    <div className="space-y-10 font-sans">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200">
        <div className="relative z-10">
          <Badge className="mb-4 bg-white/20 text-white border-none backdrop-blur-md px-4 py-1.5 text-[10px] tracking-widest uppercase font-black">
            Administrator Portal
          </Badge>
          <h1 className="text-5xl font-black mb-3 tracking-tight">Admin Dashboard</h1>
          <p className="text-indigo-100 text-lg max-w-xl font-medium leading-relaxed opacity-90">
            Welcome back! You have full control over job postings, company data, and AI-powered insights.
          </p>
        </div>
        {/* Abstract background shapes */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-none shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 rounded-[2rem] overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-600 transition-colors duration-500">
                <FileSpreadsheet className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <Badge variant="success" className="font-bold">+12%</Badge>
            </div>
            <h3 className="text-5xl font-black text-gray-900 mb-1">{stats.uploads}</h3>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Total Uploads</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-green-100/50 transition-all duration-500 rounded-[2rem] overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-green-50 p-4 rounded-2xl group-hover:bg-green-600 transition-colors duration-500">
                <TrendingUp className="w-8 h-8 text-green-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <Badge variant="success" className="font-bold">+5 new</Badge>
            </div>
            <h3 className="text-5xl font-black text-gray-900 mb-1">{stats.jobs}</h3>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Active Jobs</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-amber-100/50 transition-all duration-500 rounded-[2rem] overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-amber-50 p-4 rounded-2xl group-hover:bg-amber-600 transition-colors duration-500">
                <Sparkles className="w-8 h-8 text-amber-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <Badge variant="warning" className="font-bold">Pending</Badge>
            </div>
            <h3 className="text-5xl font-black text-gray-900 mb-1">--</h3>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">AI Analyses</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Link to="/admin/upload" className="group">
          <Card className="border-2 border-transparent hover:border-indigo-100 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-indigo-100/30 transition-all duration-500 rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center p-10 bg-gradient-to-br from-indigo-50/50 to-white h-full">
                <div className="bg-white p-6 rounded-[2rem] shadow-lg shadow-indigo-100/50 mr-8 group-hover:scale-110 transition-transform duration-500">
                  <Upload className="w-12 h-12 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Import New Jobs</h3>
                  <p className="text-gray-500 font-medium leading-relaxed mb-4">Upload an Excel spreadsheet to bulk import job listings and company data.</p>
                  <div className="flex items-center text-indigo-600 font-black text-sm uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/admin/jobs" className="group">
          <Card className="border-2 border-transparent hover:border-green-100 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-green-100/30 transition-all duration-500 rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center p-10 bg-gradient-to-br from-green-50/50 to-white h-full">
                <div className="bg-white p-6 rounded-[2rem] shadow-lg shadow-green-100/50 mr-8 group-hover:scale-110 transition-transform duration-500">
                  <FileSpreadsheet className="w-12 h-12 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Manage Listings</h3>
                  <p className="text-gray-500 font-medium leading-relaxed mb-4">View, edit, or delete existing job postings and monitor AI analysis status.</p>
                  <div className="flex items-center text-green-600 font-black text-sm uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                    <span>View Jobs</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
