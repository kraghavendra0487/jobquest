import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Briefcase, Building, Upload, TrendingUp, Clock, Star, CheckCircle, ArrowRight, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Link } from "react-router-dom";

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-10 font-sans">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-100">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <Badge className="mb-4 bg-white/20 text-white border-none backdrop-blur-md px-4 py-1.5 text-[10px] tracking-[0.2em] uppercase font-black">
              Student Dashboard
            </Badge>
            <h1 className="text-5xl font-black mb-3 tracking-tight">
              Hello, {user?.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-indigo-100 text-lg font-medium opacity-90">
              Ready to find your next career opportunity?
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-xl px-8 py-6 rounded-3xl border border-white/20 shadow-2xl">
            <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-200 font-black mb-2">Academic Profile</p>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <Building className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-black leading-none">{user?.school || "Set School"}</p>
                <p className="text-xs text-indigo-200 font-bold mt-1 uppercase tracking-wider">Primary School</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border-none shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 rounded-[2rem] overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-600 transition-colors duration-500">
                <Briefcase className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <Badge variant="outline" className="font-bold border-indigo-100 text-indigo-600">Active</Badge>
            </div>
            <h3 className="text-5xl font-black text-gray-900 mb-1">--</h3>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Jobs for {user?.school}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-green-100/50 transition-all duration-500 rounded-[2rem] overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-green-50 p-4 rounded-2xl group-hover:bg-green-600 transition-colors duration-500">
                <CheckCircle className="w-8 h-8 text-green-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <Badge variant="outline" className="font-bold border-green-100 text-green-600">Tracked</Badge>
            </div>
            <h3 className="text-5xl font-black text-gray-900 mb-1">--</h3>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Applied Jobs</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-amber-100/50 transition-all duration-500 rounded-[2rem] overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-amber-50 p-4 rounded-2xl group-hover:bg-amber-600 transition-colors duration-500">
                <Star className="w-8 h-8 text-amber-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <Badge variant="outline" className="font-bold border-amber-100 text-amber-600">AI Score</Badge>
            </div>
            <h3 className="text-5xl font-black text-gray-900 mb-1">--</h3>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Avg. Match Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl shadow-gray-100/50">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center">
              <TrendingUp className="w-7 h-7 mr-3 text-indigo-600" />
              Explore Career Options
            </h2>
            <p className="text-gray-400 font-medium mt-1">Take the next step in your professional journey</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link to="/student/jobs" className="group">
            <div className="relative overflow-hidden flex items-center p-8 bg-gradient-to-br from-indigo-50/50 to-white rounded-[2rem] border-2 border-transparent hover:border-indigo-100 transition-all duration-500">
              <div className="bg-white p-5 rounded-2xl shadow-lg shadow-indigo-100/50 mr-6 group-hover:scale-110 transition-transform duration-500">
                <Briefcase className="w-10 h-10 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-gray-900 mb-1">Browse Opportunities</h3>
                <p className="text-sm text-gray-500 font-medium mb-3">View all jobs matching your school profile</p>
                <div className="flex items-center text-indigo-600 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                  <span>Open Job Board</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </div>
              </div>
            </div>
          </Link>

          <Link to="/student/profile" className="group">
            <div className="relative overflow-hidden flex items-center p-8 bg-gradient-to-br from-purple-50/50 to-white rounded-[2rem] border-2 border-transparent hover:border-purple-100 transition-all duration-500">
              <div className="bg-white p-5 rounded-2xl shadow-lg shadow-purple-100/50 mr-6 group-hover:scale-110 transition-transform duration-500">
                <UserIcon className="w-10 h-10 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-gray-900 mb-1">Academic Profile</h3>
                <p className="text-sm text-gray-500 font-medium mb-3">Keep your school and info up to date</p>
                <div className="flex items-center text-purple-600 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                  <span>Edit Profile</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
