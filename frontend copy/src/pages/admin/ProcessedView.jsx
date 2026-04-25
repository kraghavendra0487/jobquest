import { useEffect, useState } from "react"; 
import { useParams, useNavigate } from "react-router-dom"; 
import api from "@/lib/api"; 
import { Button } from "@/components/ui/Button"; 
import { Badge } from "@/components/ui/Badge"; 
import { 
  ArrowLeft, 
  FileDown, 
  Users, 
  CheckCircle, 
  ExternalLink, 
  Info,
  FileSpreadsheet,
  Bot,
  Settings,
  Sparkles,
  Code,
  X,
  Loader2
} from "lucide-react"; 
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/Table";

const workModeBadge = { 
  "Hybrid":  "bg-blue-100 text-blue-800 border-blue-200", 
  "On-site": "bg-gray-100 text-gray-700 border-gray-200", 
  "Remote":  "bg-green-100 text-green-800 border-green-200", 
}; 

const employmentBadge = { 
  "Full-time":  "bg-green-100 text-green-800 border-green-200", 
  "Internship": "bg-orange-100 text-orange-800 border-orange-200", 
  "Part-time":  "bg-yellow-100 text-yellow-800 border-yellow-200", 
  "Contract":   "bg-purple-100 text-purple-800 border-purple-200", 
}; 

function SummaryBar({ jobs }) { 
  const workModes = {}; 
  const empTypes = {}; 
  let easyApply = 0, externalApply = 0, promoted = 0; 

  jobs.forEach((j) => { 
    workModes[j.work_mode] = (workModes[j.work_mode] || 0) + 1; 
    empTypes[j.employment_type] = (empTypes[j.employment_type] || 0) + 1; 
    if (j.apply_type === 'Easy Apply') easyApply++; else externalApply++; 
    if (j.is_promoted) promoted++; 
  }); 

  return ( 
    <div className="bg-white rounded-xl border shadow-sm p-6 mb-8 flex flex-wrap gap-8 items-center"> 
      <div className="flex flex-col">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Overview</span>
        <span className="text-2xl font-black text-gray-900">{jobs.length} <span className="text-sm font-medium text-gray-500">Jobs</span></span>
      </div>

      <div className="h-12 w-px bg-gray-100 hidden md:block" />

      <div className="flex flex-col">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Work Modes</span>
        <div className="flex gap-3">
          {Object.entries(workModes).map(([mode, count]) => (
            <div key={mode} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${mode === 'Hybrid' ? 'bg-blue-500' : mode === 'Remote' ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-bold text-gray-700">{mode}: {count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-12 w-px bg-gray-100 hidden md:block" />

      <div className="flex flex-col">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Application Types</span>
        <div className="flex gap-4">
          <span className="text-sm font-bold text-indigo-600">Easy Apply: {easyApply}</span>
          <span className="text-sm font-bold text-gray-600">External: {externalApply}</span>
        </div>
      </div>

      <div className="h-12 w-px bg-gray-100 hidden md:block" />

      <div className="flex flex-col">
        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Promoted</span>
        <span className="text-sm font-bold text-gray-700">{promoted} Featured</span>
      </div>
    </div> 
  ); 
} 

function SettingsModal({ isOpen, onClose }) {
  const samples = [
    {
      title: "Standard Job Analysis",
      input: "Full job description text...",
      output: "{ \"rating\": 85, \"summary\": \"Clean concise summary...\", \"pros\": [...], \"red_flags\": [...] }"
    },
    {
      title: "School Matching",
      input: "Description + List of Schools",
      output: "{ \"primary_school\": \"SOCSE\", \"relevance_score\": 0.92 }"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-2xl">
              <Settings size={24} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900">AI Prompt Settings</h3>
              <p className="text-gray-500 text-sm font-medium">Sample inputs and expected structured outputs</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X size={24} />
          </Button>
        </div>

        <div className="space-y-8">
          {samples.map((s, i) => (
            <div key={i} className="space-y-4">
              <h4 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" /> {s.title}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Input Sample</label>
                  <div className="bg-gray-50 p-4 rounded-2xl text-xs font-mono text-gray-600 border border-gray-100">
                    {s.input}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Expected Output (JSON)</label>
                  <div className="bg-indigo-50/50 p-4 rounded-2xl text-xs font-mono text-indigo-900 border border-indigo-100">
                    <pre className="whitespace-pre-wrap">{s.output}</pre>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t flex justify-end">
          <Button onClick={onClose} className="px-8 h-12 rounded-2xl font-black">
            Close Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProcessedView() { 
  const { uploadId } = useParams(); 
  const navigate = useNavigate(); 
  const [jobs, setJobs] = useState([]); 
  const [meta, setMeta] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    api.get(`/admin/uploads/${uploadId}/processed`)
      .then((res) => {
        setJobs(res.data.data);
        setMeta({
          fileName: res.data.fileName,
          uploadedAt: res.data.uploadedAt
        });
      })
      .catch((err) => {
        alert("Failed to load processed data: " + (err.response?.data?.error || err.message));
        navigate("/admin/uploads/history");
      })
      .finally(() => setLoading(false));
  }, [uploadId, navigate]);

  function handleDownloadProcessed(format) { 
    const token = localStorage.getItem("token"); 
    const baseName = meta.fileName.replace(/\.(xlsx|xls)$/i, ""); 
    const outName = `${baseName}_processed.${format}`; 

    fetch( 
      `http://localhost:5000/api/admin/uploads/${uploadId}/download-processed?format=${format}`, 
      { headers: { Authorization: `Bearer ${token}` } } 
    ) 
      .then((res) => { 
        if (!res.ok) throw new Error("Not available"); 
        return res.blob(); 
      }) 
      .then((blob) => { 
        const url = window.URL.createObjectURL(blob); 
        const a = document.createElement("a"); 
        a.href = url; 
        a.download = outName; 
        a.click(); 
        window.URL.revokeObjectURL(url); 
      }) 
      .catch(() => 
        alert("Processed file not available") 
      ); 
  }

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/admin/uploads/${uploadId}/ai-analyze`);
      alert("AI Analysis complete!");
      navigate("/admin/jobs");
    } catch (err) {
      console.error(err);
      alert("Analysis failed: " + (err.response?.data?.error || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) { 
    return ( 
      <div className="p-8 flex items-center justify-center min-h-[400px]"> 
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" /> 
      </div> 
    ); 
  }

  return (
    <div className="w-full max-w-[95%] mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/uploads/history")}>
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-black text-gray-900">{meta?.fileName}</h1>
            <p className="text-gray-500 font-medium">
              Uploaded on {new Date(meta?.uploadedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowSettings(true)} 
            className="gap-2 text-gray-600 border-gray-200 hover:bg-gray-50"
          >
            <Settings size={16} /> Settings
          </Button>
          <Button 
            onClick={handleAnalyze} 
            disabled={analyzing}
            className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-bold"
          >
            {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />} 
            {analyzing ? "Analyzing..." : "Run AI Analysis"}
          </Button>
          <div className="w-px h-10 bg-gray-100 mx-2" />
          <Button 
            variant="outline" 
            onClick={() => handleDownloadProcessed("csv")} 
            className="gap-2 text-indigo-600 border-indigo-100 hover:bg-indigo-50"
          >
            <FileDown size={16} /> Download CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDownloadProcessed("xlsx")} 
            className="gap-2 text-green-600 border-green-100 hover:bg-green-50"
          >
            <FileSpreadsheet size={16} /> Download XLSX
          </Button>
        </div>
      </div>

      <SummaryBar jobs={jobs} />

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-12 text-center py-5 font-bold text-gray-400">#</TableHead>
                <TableHead className="min-w-[200px] font-black text-gray-900">Job Title</TableHead>
                <TableHead className="min-w-[150px] font-black text-gray-900">Company</TableHead>
                <TableHead className="min-w-[120px] font-black text-gray-900">Work Mode</TableHead>
                <TableHead className="min-w-[150px] font-black text-gray-900">Employment</TableHead>
                <TableHead className="min-w-[180px] font-black text-gray-900">Location</TableHead>
                <TableHead className="min-w-[130px] font-black text-gray-900">Posted</TableHead>
                <TableHead className="min-w-[100px] font-black text-gray-900 text-center">Applicants</TableHead>
                <TableHead className="w-24 font-black text-gray-900 text-center">Apply Type</TableHead>
                <TableHead className="w-24 font-black text-gray-900 text-center">Promoted</TableHead>
                <TableHead className="min-w-[180px] font-black text-gray-900">Industry</TableHead>
                <TableHead className="min-w-[130px] font-black text-gray-900">Size</TableHead>
                <TableHead className="min-w-[200px] font-black text-gray-900">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job, idx) => (
                <TableRow key={idx} className="group hover:bg-indigo-50/30 transition-colors">
                  <TableCell className="text-center font-mono text-xs text-gray-400">{job.row_number || idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 leading-tight">{job.job_title}</span>
                      <a href={job.job_link} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:underline flex items-center mt-1">
                        View Link <ExternalLink size={10} className="ml-1" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-gray-700">{job.company_name}</TableCell>
                  <TableCell>
                    <Badge className={workModeBadge[job.work_mode] || "bg-gray-100 text-gray-700"}>
                      {job.work_mode || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={employmentBadge[job.employment_type] || "bg-gray-100 text-gray-700"}>
                      {job.employment_type || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-600">{job.meta_location}</TableCell>
                  <TableCell className="text-sm font-bold text-indigo-600">{job.posted_time}</TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-full border border-gray-100">
                      <Users size={12} className="text-gray-400" />
                      <span className="text-xs font-black text-gray-700">{job.applicant_count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {job.apply_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {job.is_promoted ? <CheckCircle size={18} className="text-green-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 italic">{job.company_industry}</TableCell>
                  <TableCell className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{job.company_size}</TableCell>
                  <TableCell>
                    <div className="text-xs text-gray-600 max-w-[200px] truncate" title={job.full_description}>
                      {job.full_description}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
