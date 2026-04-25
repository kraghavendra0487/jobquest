import { useEffect, useState } from "react"; 
import { useNavigate } from "react-router-dom"; 
import api from "@/lib/api"; 
import { Badge } from "@/components/ui/badge"; 
import { Button } from "@/components/ui/button"; 
import { 
  FileSpreadsheet, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileDown, 
} from "lucide-react"; 

function StatusBadge({ status }) { 
  const map = { 
    processed: { label: "Processed", cls: "bg-green-100 text-green-700" }, 
    processing: { label: "Processing", cls: "bg-yellow-100 text-yellow-700" }, 
    pending: { label: "Pending", cls: "bg-gray-100 text-gray-600" }, 
    failed: { label: "Failed", cls: "bg-red-100 text-red-600" }, 
  }; 
  const s = map[status] || map.pending; 
  return ( 
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}> 
      {s.label} 
    </span> 
  ); 
} 

export default function UploadHistory() { 
  const [uploads, setUploads] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const navigate = useNavigate(); 

  useEffect(() => { 
    api.get("/admin/uploads") 
      .then((r) => setUploads(r.data.data)) 
      .finally(() => setLoading(false)); 
  }, []); 

  function handleDownloadRaw(uploadId, fileName) { 
    // Trigger browser download via window.open with auth header workaround 
    const token = localStorage.getItem("token"); 
    fetch(`http://localhost:5000/api/admin/uploads/${uploadId}/download-raw`, { 
      headers: { Authorization: `Bearer ${token}` }, 
    }) 
      .then((res) => { 
        if (!res.ok) throw new Error("File not available"); 
        return res.blob(); 
      }) 
      .then((blob) => { 
        const url = window.URL.createObjectURL(blob); 
        const a = document.createElement("a"); 
        a.href = url; 
        a.download = fileName; 
        a.click(); 
        window.URL.revokeObjectURL(url); 
      }) 
      .catch(() => 
        alert("Raw file not available") 
      ); 
  } 

  function handleDownloadProcessed(uploadId, fileName, format) { 
    const token = localStorage.getItem("token"); 
    const baseName = fileName.replace(/\.(xlsx|xls)$/i, ""); 
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

  if (loading) { 
    return ( 
      <div className="p-8 flex items-center justify-center"> 
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" /> 
      </div> 
    ); 
  } 

  return ( 
    <div className="p-8"> 
      {/* Header */} 
      <div className="flex justify-between items-start mb-8"> 
        <div> 
          <h1 className="text-2xl font-bold text-gray-900">Upload History</h1> 
          <p className="text-gray-500 text-sm mt-1"> 
            All Excel files you've uploaded. Download originals or view processed data. 
          </p> 
        </div> 
        <Button onClick={() => navigate("/admin/upload")}> 
          + New Upload 
        </Button> 
      </div> 

      {uploads.length === 0 ? ( 
        <div className="text-center py-20 text-gray-400"> 
          <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-30" /> 
          <p className="text-lg font-medium">No uploads yet</p> 
          <p className="text-sm mt-1">Upload your first Excel file to get started</p> 
        </div> 
      ) : ( 
        <div className="space-y-4"> 
          {uploads.map((upload) => ( 
            <div 
              key={upload.id} 
              className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow" 
            > 
              <div className="flex items-start justify-between gap-4"> 
                {/* Left: file info */} 
                <div className="flex items-start gap-4 flex-1 min-w-0"> 
                  <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center"> 
                    <FileSpreadsheet size={24} className="text-green-600" /> 
                  </div> 
                  <div className="min-w-0"> 
                    <p className="font-semibold text-gray-900 truncate">{upload.file_name}</p> 
                    <div className="flex items-center gap-3 mt-1 flex-wrap"> 
                      <StatusBadge status={upload.status} /> 
                      <span className="flex items-center gap-1 text-xs text-gray-400"> 
                        <Clock size={12} /> 
                        {new Date(upload.uploaded_at).toLocaleString()} 
                      </span> 
                      <span className="text-xs text-gray-400">by {upload.admin_name}</span> 
                    </div> 
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500"> 
                      <span className="flex items-center gap-1"> 
                        <CheckCircle size={13} className="text-green-500" /> 
                        {upload.successful_rows} saved 
                      </span> 
                      {upload.failed_rows > 0 && ( 
                         <span className="flex items-center gap-1"> 
                           <AlertCircle size={13} className="text-red-400" /> 
                           {upload.failed_rows} failed 
                         </span> 
                       )} 
                       <span className="text-gray-400"> 
                         {upload.total_rows} total rows 
                       </span> 
                     </div> 
                   </div> 
                 </div> 
 
                 {/* Right: action buttons */} 
                 <div className="flex flex-col gap-2 flex-shrink-0"> 
                   {/* Raw Excel download */} 
                   <Button 
                     variant="outline" 
                     size="sm" 
                     disabled={!upload.has_raw_file} 
                     onClick={() => handleDownloadRaw(upload.id, upload.file_name)} 
                     className="gap-2 text-xs" 
                   > 
                     <Download size={14} /> 
                     Download Raw Excel 
                   </Button> 
 
                   {/* View processed table */} 
                   <Button 
                     variant="outline" 
                     size="sm" 
                     disabled={!upload.has_processed_file} 
                     onClick={() => navigate(`/admin/uploads/${upload.id}/processed`)} 
                     className="gap-2 text-xs" 
                   > 
                     <Eye size={14} /> 
                     View Processed Table 
                   </Button> 
 
                   {/* Download processed */} 
                   {upload.has_processed_file && ( 
                     <div className="flex gap-1"> 
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => handleDownloadProcessed(upload.id, upload.file_name, "csv")} 
                         className="gap-1 text-xs flex-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50" 
                       > 
                         <FileDown size={13} /> 
                         CSV 
                       </Button> 
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => handleDownloadProcessed(upload.id, upload.file_name, "xlsx")} 
                         className="gap-1 text-xs flex-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50" 
                       > 
                         <FileDown size={13} /> 
                         XLSX 
                       </Button> 
                     </div> 
                   )} 
                 </div> 
               </div> 
             </div> 
           ))} 
         </div> 
       )} 
     </div> 
   ); 
 } 
