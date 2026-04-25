import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, School, Save, CheckCircle, Loader2, Sparkles, ShieldCheck, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/utils";
import api from "../../lib/api";

const StudentProfile = () => {
  const { user, updateProfile } = useAuth();
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(user?.school || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get("/schools");
        setSchools(res.data.data);
      } catch (err) {
        console.error("Failed to fetch schools");
      }
    };
    fetchSchools();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ school: selectedSchool });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Profile Settings</h1>
          <p className="text-gray-500 mt-2 text-lg">Manage your academic profile and application preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* User Info Card */}
        <div className="md:col-span-4">
          <Card className="border-none shadow-2xl shadow-gray-100/50 rounded-[2.5rem] bg-white overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-700" />
            <CardContent className="p-8 -mt-16">
              <div className="space-y-6 text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-white rounded-[2.5rem] p-2 shadow-xl">
                    <div className="w-full h-full bg-indigo-50 rounded-[2rem] flex items-center justify-center">
                      <User className="w-16 h-16 text-indigo-600" />
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{user?.name}</h2>
                  <p className="text-gray-500 font-medium flex items-center justify-center mt-1">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {user?.email}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  <Badge className="bg-indigo-50 text-indigo-700 border-none font-black px-4 py-1 rounded-xl">
                    {user?.role?.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="border-gray-100 text-gray-400 font-black px-4 py-1 rounded-xl">
                    ID: {user?.id?.toString().slice(0, 8)}
                  </Badge>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-gray-50 space-y-4">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="bg-blue-50 p-2 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-gray-600 font-bold">Verified Account</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="bg-purple-50 p-2 rounded-xl">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-gray-600 font-bold">Priority Job Access</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Form */}
        <div className="md:col-span-8 space-y-8">
          <Card className="border-none shadow-2xl shadow-gray-100/50 rounded-[2.5rem] bg-white overflow-hidden">
            <CardHeader className="p-10 pb-0">
              <CardTitle className="text-2xl font-black text-gray-900 flex items-center">
                <School className="w-6 h-6 mr-3 text-indigo-600" />
                Academic Affiliation
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Selecting your correct school ensures you receive highly relevant job recommendations and campus placements.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-10 space-y-10">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {schools.map((school) => (
                  <button
                    key={school.code}
                    onClick={() => setSelectedSchool(school.code)}
                    title={school.name}
                    className={cn(
                      "p-6 rounded-3xl border-2 font-black transition-all duration-300 relative group overflow-hidden flex flex-col items-center justify-center text-center",
                      selectedSchool === school.code
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg shadow-indigo-100 scale-[1.05]"
                        : "border-gray-50 bg-gray-50/50 hover:border-gray-200 text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {selectedSchool === school.code && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-4 h-4 text-indigo-600" />
                      </div>
                    )}
                    <span className="text-xl tracking-tight mb-1">{school.code}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold line-clamp-1">
                      {school.name.replace("School of ", "").replace("School for ", "")}
                    </span>
                  </button>
                ))}
              </div>

              <div className="bg-indigo-50/50 rounded-[2rem] p-8 border border-indigo-100/50">
                <div className="flex items-start space-x-4">
                  <div className="bg-white p-3 rounded-2xl shadow-sm">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-indigo-900 mb-1">AI Personalization</h4>
                    <p className="text-indigo-800/70 text-sm font-medium leading-relaxed">
                      Changing your school will re-calculate your <span className="font-black">Job Match Score</span> across all listings. This may take a few seconds to reflect.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !selectedSchool || selectedSchool === user?.school}
                className={cn(
                  "w-full h-16 rounded-2xl font-black text-lg transition-all duration-500 shadow-xl",
                  saved 
                    ? "bg-green-600 hover:bg-green-700 shadow-green-100" 
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                )}
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-6 h-6 mr-2" />
                    <span>Profile Updated!</span>
                  </>
                ) : saving ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    <span>Synchronizing Profile...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6 mr-2" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="bg-amber-50 rounded-[2rem] p-8 border border-amber-100 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm">
                <ShieldCheck className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-black text-amber-900">Security Verification</h4>
                <p className="text-amber-800/70 text-sm font-medium">Your profile changes are logged for security audits.</p>
              </div>
            </div>
            <Button variant="ghost" className="text-amber-600 font-black hover:bg-amber-100 rounded-xl">
              View Log
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;

