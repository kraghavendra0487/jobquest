import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Clock, 
  Star, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Building,
  Sparkles,
  Calendar,
  Briefcase,
  Loader2,
  ArrowRight,
  UserCheck,
  GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";

const StudentJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [school, setSchool] = useState(user?.school || "");
  const [schools, setSchools] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [school]);

  const fetchSchools = async () => {
    try {
      const res = await api.get("/schools");
      setSchools(res.data.data);
    } catch (err) {
      console.error("Failed to fetch schools");
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/student/jobs", { params: { search, school } });
      setJobs(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedJob(res.data.data[0]);
      } else {
        setSelectedJob(null);
      }
    } catch (err) {
      console.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Recommended Jobs</h1>
          <p className="text-gray-500 mt-2 text-lg">Opportunities specifically selected for your school and profile.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group w-full sm:w-64">
            <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white shadow-xl shadow-gray-100/50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl text-base font-bold appearance-none cursor-pointer"
            >
              <option value="">All Schools</option>
              {schools.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSearch} className="relative w-full md:w-[400px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              type="text"
              placeholder="Search roles, companies, keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 bg-white shadow-xl shadow-gray-100/50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl text-base"
            />
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Job List */}
        <div className="lg:col-span-4 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="border-none shadow-sm animate-pulse rounded-2xl h-32 bg-gray-50" />
            ))
          ) : jobs.length === 0 ? (
            <Card className="border-none shadow-xl shadow-gray-100/50 rounded-[2rem] p-12 text-center bg-white">
              <div className="bg-gray-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your search filters.</p>
            </Card>
          ) : (
            jobs.map((job) => (
              <Card
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={cn(
                  "border-none transition-all duration-300 cursor-pointer rounded-2xl group relative overflow-hidden",
                  selectedJob?.id === job.id 
                    ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02]" 
                    : "bg-white hover:bg-indigo-50/50 shadow-lg shadow-gray-100/50"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-black text-lg leading-tight truncate mb-1",
                        selectedJob?.id === job.id ? "text-white" : "text-gray-900"
                      )}>
                        {job.title}
                      </h3>
                      <p className={cn(
                        "font-bold text-sm",
                        selectedJob?.id === job.id ? "text-indigo-100" : "text-indigo-600"
                      )}>
                        {job.company_name}
                      </p>
                    </div>
                    {job.ai_rating && (
                      <div className={cn(
                        "flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-black shadow-sm",
                        selectedJob?.id === job.id 
                          ? "bg-white/20 text-white backdrop-blur-md" 
                          : "bg-amber-50 text-amber-600"
                      )}>
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{job.ai_rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 flex flex-wrap gap-3">
                    <div className={cn(
                      "flex items-center text-xs font-bold",
                      selectedJob?.id === job.id ? "text-indigo-100" : "text-gray-400"
                    )}>
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      {job.location || "Remote"}
                    </div>
                    <div className={cn(
                      "flex items-center text-xs font-bold",
                      selectedJob?.id === job.id ? "text-indigo-100" : "text-gray-400"
                    )}>
                      <DollarSign className="w-3.5 h-3.5 mr-1 text-green-500" />
                      {job.salary ? `${Number(job.salary).toLocaleString()}` : "Not disclosed"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Job Detail */}
        <div className="lg:col-span-8">
          {selectedJob ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <Card className="border-none shadow-2xl shadow-gray-200/50 rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-10 space-y-10">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-indigo-50 p-3 rounded-2xl">
                          <Building className="w-8 h-8 text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="text-4xl font-black text-gray-900 tracking-tight">{selectedJob.title}</h2>
                          <div className="flex items-center space-x-3 mt-1">
                            <p className="text-xl text-indigo-600 font-bold">{selectedJob.company_name}</p>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-none font-bold px-3 py-1">
                              {selectedJob.job_type || "Full-time"}
                            </Badge>
                            {selectedJob.school && (
                              <Badge className="bg-indigo-50 text-indigo-600 border-none font-black px-3 py-1 rounded-lg">
                                {selectedJob.school}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full md:w-auto h-16 px-12 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:scale-105 transition-all">
                      Apply Now <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>

                  {/* AI Analysis Section */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2.2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-gradient-to-br from-indigo-700 to-purple-800 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Sparkles className="w-48 h-48" />
                      </div>
                      
                      <div className="flex items-center space-x-3 mb-8">
                        <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md">
                          <Sparkles className="w-6 h-6 text-yellow-300 fill-current" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">AI Career Insights</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        <div className="md:col-span-7 space-y-6">
                          <p className="text-indigo-50 leading-relaxed text-lg font-medium italic">
                            "{selectedJob.ai_summary || "Our AI engine is currently synthesizing the core attributes of this role to provide you with a high-level summary..."}"
                          </p>
                          <div className="flex flex-wrap gap-4">
                            <div className="bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-md border border-white/10 flex-1">
                              <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-black mb-1">Job Match Score</p>
                              <p className="text-3xl font-black">{selectedJob.ai_rating || "?"}<span className="text-lg text-indigo-300">/10</span></p>
                            </div>
                            <div className="bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-md border border-white/10 flex-1">
                              <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-black mb-1">Company Rating</p>
                              <p className="text-3xl font-black">{selectedJob.company_rating_ai || "?"}<span className="text-lg text-indigo-300">/10</span></p>
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-5 space-y-6">
                          <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200 mb-4 flex items-center">
                              <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" /> Competitive Advantages
                            </h4>
                            <ul className="space-y-3">
                              {(selectedJob.pros || ["High growth potential", "Modern tech stack", "Competitive salary"]).map((pro, idx) => (
                                <li key={idx} className="text-sm font-bold flex items-start space-x-3 text-white/90">
                                  <span className="w-2 h-2 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                                  <span>{pro}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    <div className="md:col-span-7 space-y-10">
                      <section>
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center">
                          <Info className="w-6 h-6 mr-3 text-indigo-600" />
                          Job Overview
                        </h3>
                        <div className="bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100 shadow-inner">
                          <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                            {selectedJob.description || "Detailed job description is being processed. Please check back shortly or apply to learn more directly from the company."}
                          </p>
                        </div>
                      </section>

                      {selectedJob.eligibility && (
                        <section>
                          <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center">
                            <UserCheck className="w-6 h-6 mr-3 text-indigo-600" />
                            Eligibility & Requirements
                          </h3>
                          <div className="bg-indigo-50/30 rounded-[2rem] p-8 border border-indigo-100/50">
                            <p className="text-indigo-900 font-bold leading-relaxed">
                              {selectedJob.eligibility}
                            </p>
                          </div>
                        </section>
                      )}
                    </div>
                    
                    <div className="md:col-span-5 space-y-8">
                      <Card className="border-none bg-gray-50/50 rounded-[2rem] p-8">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Role Particulars</h3>
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-gray-500 font-bold">
                              <MapPin className="w-5 h-5 text-indigo-600" />
                              <span>Location</span>
                            </div>
                            <span className="text-gray-900 font-black">{selectedJob.location || "Remote"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-gray-500 font-bold">
                              <DollarSign className="w-5 h-5 text-green-500" />
                              <span>Salary</span>
                            </div>
                            <span className="text-gray-900 font-black">
                              {selectedJob.salary ? `$${Number(selectedJob.salary).toLocaleString()}` : "Not Disclosed"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-gray-500 font-bold">
                              <Clock className="w-5 h-5 text-amber-500" />
                              <span>Posted</span>
                            </div>
                            <span className="text-gray-900 font-black">3 days ago</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-gray-500 font-bold">
                              <Calendar className="w-5 h-5 text-red-500" />
                              <span>Deadline</span>
                            </div>
                            <span className="text-red-600 font-black">
                              {selectedJob.deadline ? new Date(selectedJob.deadline).toLocaleDateString() : "Open"}
                            </span>
                          </div>
                        </div>
                      </Card>

                      <div className="bg-amber-50 rounded-[2rem] p-8 border border-amber-100">
                        <div className="flex items-center space-x-3 mb-4">
                          <AlertTriangle className="w-6 h-6 text-amber-600" />
                          <h4 className="text-lg font-black text-amber-900">Application Advice</h4>
                        </div>
                        <p className="text-amber-800 font-medium text-sm leading-relaxed">
                          Your profile shows a <span className="font-black">85% match</span> for this role based on your school's curriculum. We recommend highlighting your recent project work in your application.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-32 space-y-6 text-center">
              <div className="bg-gray-50 w-32 h-32 rounded-[3rem] flex items-center justify-center shadow-inner">
                <Briefcase className="w-16 h-16 text-gray-200" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Select a job to view details</h3>
                <p className="text-gray-500 max-w-xs mx-auto">Click on any job listing from the sidebar to see AI insights and full role description.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentJobs;
