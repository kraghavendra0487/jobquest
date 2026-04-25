import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Search, Briefcase, MapPin, DollarSign, Building, Filter, ChevronDown, X, Trash2, Eye, Loader2, Calendar, Globe, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../components/ui/Table";
import { Select } from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import { cn } from "../../lib/utils";

const AdminJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [school, setSchool] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedJob, setSelectedJob] = useState(null);
  const limit = 20;

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

  useEffect(() => {
    fetchJobs();
  }, [page, school]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/jobs", {
        params: { search, school, page, limit }
      });
      setJobs(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const handleDelete = async (jobId) => {
    if (!confirm("Are you sure you want to delete this job posting? This action cannot be undone.")) return;
    try {
      await api.delete(`/admin/jobs/${jobId}`);
      fetchJobs();
    } catch (err) {
      console.error("Failed to delete job");
      alert(err.response?.data?.error || "Failed to delete job");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("WARNING: Are you sure you want to delete ALL jobs from the database? This action cannot be undone and will delete everything!")) return;
    
    const count = prompt(`Please type "DELETE ${total}" to confirm deleting all ${total} jobs:`);
    if (count !== `DELETE ${total}`) {
      alert("Confirmation failed. No jobs were deleted.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.delete("/admin/jobs");
      alert(res.data.message);
      setPage(1);
      fetchJobs();
    } catch (err) {
      console.error("Failed to delete all jobs");
      alert(err.response?.data?.error || "Failed to delete all jobs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Manage Jobs</h1>
          <p className="text-gray-500 mt-2 text-lg">Browse and manage all job postings in the system.</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleDeleteAll}
            disabled={total === 0 || loading}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold px-4 py-2 rounded-xl transition-all"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete All Jobs
          </Button>
          <Badge variant="outline" className="px-4 py-1.5 text-sm font-bold bg-indigo-50 border-indigo-100 text-indigo-600 self-start md:self-auto">
            {total} Active Listings
          </Badge>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-gray-100/50 rounded-[2rem] overflow-visible">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs, companies, keywords..."
                className="pl-12 h-14 bg-gray-50/50 border-gray-100 focus:bg-white transition-all rounded-2xl text-base"
              />
            </div>
            <div className="flex gap-4">
              <Select
                value={school}
                onChange={(e) => { setSchool(e.target.value); setPage(1); fetchJobs(); }}
                className="w-full md:w-48"
              >
                <option value="">All Schools</option>
                {schools.map((s) => (
                  <option key={s.code} value={s.code}>{s.code}</option>
                ))}
              </Select>
              <Button
                type="submit"
                className="h-14 px-8 rounded-2xl font-bold text-base shadow-lg shadow-indigo-100"
              >
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="bg-indigo-50 p-4 rounded-3xl">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          </div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Loading job data...</p>
        </div>
      ) : jobs.length === 0 ? (
        <Card className="border-none shadow-xl shadow-gray-100/50 rounded-[2.5rem] p-20 text-center">
          <div className="bg-gray-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <Briefcase className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-3">No jobs found</h3>
          <p className="text-gray-500 text-lg max-w-md mx-auto">We couldn't find any jobs matching your search criteria. Try using different keywords or filters.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border-none shadow-xl shadow-gray-100/50 rounded-[2.5rem] overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/50 border-b-0">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="px-8 py-6 font-bold text-gray-400 uppercase tracking-wider text-xs">Job Details</TableHead>
                  <TableHead className="px-8 py-6 font-bold text-gray-400 uppercase tracking-wider text-xs">Company</TableHead>
                  <TableHead className="px-8 py-6 font-bold text-gray-400 uppercase tracking-wider text-xs text-center">School</TableHead>
                  <TableHead className="px-8 py-6 font-bold text-gray-400 uppercase tracking-wider text-xs">Type & Salary</TableHead>
                  <TableHead className="px-8 py-6 font-bold text-gray-400 uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="group border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <TableCell className="px-8 py-6">
                      <div>
                        <p className="font-black text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{job.title}</p>
                        <div className="flex items-center text-gray-400 mt-1.5 font-medium">
                          <MapPin className="w-4 h-4 mr-1.5" />
                          {job.location || "Remote / Not specified"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <div>
                        <p className="font-bold text-gray-700">{job.company_name}</p>
                        {job.industry && (
                          <p className="text-sm text-gray-400 font-medium">{job.industry}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-center">
                      <Badge className="bg-indigo-50 text-indigo-600 border-none font-black px-3 py-1 rounded-lg">
                        {job.school}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center text-gray-600 font-bold text-sm">
                          <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                          {job.salary ? `${Number(job.salary).toLocaleString()}` : "Not disclosed"}
                        </div>
                        <div className="flex items-center text-gray-400 text-xs font-bold uppercase tracking-wide">
                          <Briefcase className="w-3.5 h-3.5 mr-1" />
                          {job.job_type || "Full Time"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                          className="rounded-xl font-bold text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(job.id)}
                          className="rounded-xl font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex items-center justify-between px-2">
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">
              Showing <span className="text-gray-900">{(page - 1) * limit + 1}</span> - <span className="text-gray-900">{Math.min(page * limit, total)}</span> of <span className="text-gray-900">{total}</span>
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl font-bold border-gray-200 hover:bg-gray-50"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="rounded-xl font-bold border-gray-200 hover:bg-gray-50"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.title}
      >
        {selectedJob && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Company Details</p>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white p-3 rounded-2xl shadow-sm">
                      <Building className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-lg leading-tight">{selectedJob.company_name}</p>
                      <p className="text-gray-500 font-medium">{selectedJob.industry || "General Industry"}</p>
                    </div>
                  </div>
                  {selectedJob.website && (
                    <div className="flex items-center space-x-3 text-indigo-600">
                      <Globe className="w-4 h-4" />
                      <a href={selectedJob.website} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Job Parameters</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Type</span>
                    <Badge variant="secondary" className="bg-white text-gray-900 border-none font-bold">
                      {selectedJob.job_type || "Full Time"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Salary</span>
                    <span className="font-black text-green-600">
                      {selectedJob.salary ? `$${Number(selectedJob.salary).toLocaleString()}` : "Disclosed on call"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Deadline</span>
                    <div className="flex items-center font-bold text-gray-900">
                      <Calendar className="w-4 h-4 mr-2 text-red-500" />
                      {selectedJob.deadline ? new Date(selectedJob.deadline).toLocaleDateString() : "No deadline"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Job Description</p>
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-inner min-h-[200px]">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedJob.description || "No description provided for this job listing."}
                </p>
              </div>
            </div>

            {selectedJob.eligibility && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Eligibility Requirements</p>
                <div className="bg-indigo-50/50 rounded-[2rem] p-6 border border-indigo-100 flex items-start space-x-4">
                  <UserCheck className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <p className="text-indigo-900 font-medium leading-relaxed">
                    {selectedJob.eligibility}
                  </p>
                </div>
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <Button 
                className="flex-1 h-14 rounded-2xl font-bold shadow-lg shadow-indigo-100"
                onClick={() => setSelectedJob(null)}
              >
                Done
              </Button>
              <Button 
                variant="ghost"
                className="h-14 px-8 rounded-2xl font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  const id = selectedJob.id;
                  setSelectedJob(null);
                  handleDelete(id);
                }}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Delete Job
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminJobs;
