import { useState, useRef } from "react"; 
import { useNavigate, Link } from "react-router-dom"; 
import api from "@/lib/api"; 
import { Button } from "@/components/ui/Button"; 
import { Badge } from "@/components/ui/Badge"; 
import { 
  Upload as UploadIcon, 
  FileSpreadsheet, 
  CheckCircle, 
  Users, 
  Bot, 
  Eye, 
  X, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react"; 
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/Table";
// import { Tooltip } from "@chakra-ui/react";

// Badge color maps 
const workModeBadge = { 
  "Hybrid": "bg-blue-100 text-blue-800 border-blue-200", 
  "On-site": "bg-gray-100 text-gray-700 border-gray-200", 
  "Remote": "bg-green-100 text-green-800 border-green-200", 
}; 
 
const employmentBadge = { 
  "Full-time": "bg-green-100 text-green-800 border-green-200", 
  "Internship": "bg-orange-100 text-orange-800 border-orange-200", 
  "Part-time": "bg-yellow-100 text-yellow-800 border-yellow-200", 
  "Contract": "bg-purple-100 text-purple-800 border-purple-200", 
}; 

function SummaryBar({ jobs }) { 
  const workModes = {}; 
  const empTypes = {}; 
  let easyApply = 0, externalApply = 0, promoted = 0; 
 
  jobs.forEach(j => { 
    workModes[j.work_mode] = (workModes[j.work_mode] || 0) + 1; 
    empTypes[j.employment_type] = (empTypes[j.employment_type] || 0) + 1; 
    if (j.apply_type === 'Easy Apply') easyApply++; else externalApply++; 
    if (j.is_promoted) promoted++; 
  }); 
 
  return ( 
    <div className="bg-white rounded-xl border shadow-sm p-6 mb-8 flex flex-wrap gap-8 items-center animate-in fade-in slide-in-from-top-4 duration-500"> 
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

export default function Upload() {
  const [stage, setStage] = useState(1); // 1: Drop, 2: Preview, 3: Success
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadData, setUploadData] = useState(null); // { uploadId, preview }
  const [results, setResults] = useState(null); // { successfulRows, failedRows }
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/admin/uploads", formData);
      setUploadData(res.data);
      setStage(2);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!uploadData?.uploadId) return;
    setLoading(true);
    try {
      const res = await api.post(`/admin/uploads/${uploadData.uploadId}/confirm`);
      setResults(res.data);
      // Directly go to the processed data table after saving
      navigate(`/admin/uploads/${uploadData.uploadId}/processed`);
    } catch (err) {
      console.error("Confirmation Error:", err);
      const errorMsg = err.response?.data?.error || err.message || "Confirmation failed";
      alert(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadData?.uploadId) return;
    setLoading(true);
    try {
      await api.post(`/admin/uploads/${uploadData.uploadId}/ai-analyze`);
      navigate("/admin/jobs");
    } catch (err) {
      console.error(err);
      alert("Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // Stage 1: File Drop
  if (stage === 1) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Import Job Listings</h1>
          <p className="text-lg text-gray-500">Upload your LinkedIn scraper export to clean and analyze.</p>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative group cursor-pointer
            border-4 border-dashed rounded-3xl p-16
            transition-all duration-300 ease-in-out
            ${file ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50'}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept=".xlsx,.xls"
          />
          
          <div className="flex flex-col items-center">
            <div className={`
              w-24 h-24 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110
              ${file ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-gray-100 text-gray-400'}
            `}>
              {file ? <FileSpreadsheet size={40} /> : <UploadIcon size={40} />}
            </div>
            
            {file ? (
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900 mb-1">{file.name}</p>
                <p className="text-sm font-medium text-gray-400">{(file.size / 1024).toFixed(1)} KB • Ready to parse</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-4 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X size={16} className="mr-2" /> Remove
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900 mb-2">Drag and drop your Excel file</p>
                <p className="text-gray-400">or click to browse from your computer</p>
                <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-widest">
                  <AlertCircle size={14} /> Only .xlsx or .xls files
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Button 
            size="xl"
            disabled={!file || loading}
            onClick={handleUpload}
            className="px-12 py-7 text-lg font-black rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-2xl hover:shadow-indigo-200 transition-all active:scale-95"
          >
            {loading ? "Parsing Data..." : "Upload & Preview"}
            {!loading && <ChevronRight size={20} className="ml-2" />}
          </Button>
        </div>
      </div>
    );
  }

  // Stage 2: Data Preview Table
  if (stage === 2 && uploadData) {
    return (
      <div className="w-full max-w-[95%] mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Data Preview</h1>
            <p className="text-gray-500 font-medium">Verify the cleaned data before saving to the database.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStage(1)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading} className="px-8 font-bold">
              {loading ? "Saving..." : "Confirm & Save to Database"}
            </Button>
          </div>
        </div>

        <SummaryBar jobs={uploadData.preview} />

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
                {uploadData.preview.map((job, idx) => (
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

        <div className="mt-8 flex justify-center gap-4">
          <Button variant="outline" size="lg" onClick={() => setStage(1)} disabled={loading} className="px-10 h-14 rounded-2xl font-bold">
            Cancel & Start Over
          </Button>
          <Button size="lg" onClick={handleConfirm} disabled={loading} className="px-12 h-14 rounded-2xl font-black shadow-lg shadow-indigo-100">
            {loading ? "Processing..." : "Confirm & Save Data"}
          </Button>
        </div>
      </div>
    );
  }

  // Stage 3: Success
  if (stage === 3 && results) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-in zoom-in duration-500">
          <CheckCircle size={48} />
        </div>
        
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Import Complete!</h1>
        <p className="text-xl text-gray-500 mb-10">
          Successfully processed <span className="font-black text-indigo-600">{results.successfulRows}</span> jobs. 
          {results.failedRows > 0 && <span className="text-red-500 block mt-2 text-sm font-bold">{results.failedRows} rows failed to import.</span>}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button 
            size="xl" 
            onClick={handleAnalyze} 
            disabled={loading}
            className="h-20 text-lg font-black rounded-3xl bg-indigo-600 shadow-xl shadow-indigo-100 hover:scale-105 transition-transform"
          >
            {loading ? "Analyzing..." : "Run AI Analysis"}
            <Bot size={24} className="ml-3" />
          </Button>
          
          <Link to="/admin/jobs">
            <Button 
              variant="outline" 
              size="xl" 
              className="w-full h-20 text-lg font-black rounded-3xl border-2 hover:bg-gray-50 hover:scale-105 transition-transform"
            >
              View All Jobs
              <Eye size={24} className="ml-3" />
            </Button>
          </Link>
        </div>

        <Button 
          variant="ghost" 
          className="mt-12 font-bold text-gray-400 hover:text-indigo-500"
          onClick={() => {
            setStage(1);
            setFile(null);
            setUploadData(null);
            setResults(null);
          }}
        >
          Upload another file
        </Button>
      </div>
    );
  }

  return null;
}