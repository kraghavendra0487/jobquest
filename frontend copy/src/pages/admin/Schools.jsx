import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { 
  GraduationCap, 
  ChevronDown, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Loader2, 
  School as SchoolIcon,
  BookOpen,
  Settings2
} from "lucide-react";

function SchoolRow({ school, index, onDeleteSchool }) {
  const [expanded, setExpanded] = useState(false);
  const [programs, setPrograms] = useState(school.programs || []);
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [newProgram, setNewProgram] = useState({ program_name: "", description: "" });
  const [editingProgram, setEditingProgram] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await api.get(`/schools/${school.school_code}`);
      setPrograms(res.data.data.programs || []);
    } catch (err) {
      console.error("Failed to fetch programs");
    }
  };

  const handleAddProgram = async (e) => {
    e.preventDefault();
    if (!newProgram.program_name.trim()) return;
    setSaving(true);
    try {
      await api.post(`/schools/${school.school_code}/programs`, newProgram);
      setNewProgram({ program_name: "", description: "" });
      setShowAddProgram(false);
      fetchPrograms();
    } catch (err) {
      console.error("Failed to add program");
    } finally {
      setSaving(false);
    }
  };

  const handleEditProgram = async (e) => {
    e.preventDefault();
    if (!editingProgram.program_name.trim()) return;
    setSaving(true);
    try {
      await api.put(`/schools/${school.school_code}/programs/${editingProgram.id}`, {
        program_name: editingProgram.program_name,
        description: editingProgram.description,
      });
      setEditingProgram(null);
      fetchPrograms();
    } catch (err) {
      console.error("Failed to edit program");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgram = async (programId) => {
    if (!confirm("Delete this program?")) return;
    try {
      await api.delete(`/schools/${school.school_code}/programs/${programId}`);
      fetchPrograms();
    } catch (err) {
      console.error("Failed to delete program");
    }
  };

  return (
    <>
      <TableRow 
        className={`group transition-colors cursor-pointer ${expanded ? 'bg-indigo-50/50' : 'hover:bg-indigo-50/30'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="text-center font-mono text-xs text-gray-400">
          {index + 1}
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="font-bold bg-purple-50 text-purple-700 border-purple-100">
            {school.school_code}
          </Badge>
        </TableCell>
        <TableCell className="font-bold text-gray-900">
          {school.full_name}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">{programs.length} Programs</span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
              onClick={() => onDeleteSchool(school.school_code)}
            >
              <Trash2 size={16} />
            </Button>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-300 ${expanded ? "rotate-180 text-indigo-600" : ""}`}
            />
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-gray-50/30 hover:bg-gray-50/30 border-none">
          <TableCell colSpan={5} className="p-0">
            <div className="px-12 py-6 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50/80">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-gray-400 py-3">Program Name</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-gray-400 py-3">Description</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-gray-400 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((p) => (
                      <TableRow key={p.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-bold text-gray-800 py-3">{p.program_name}</TableCell>
                        <TableCell className="text-xs text-gray-500 max-w-md py-3">{p.description || "No description provided."}</TableCell>
                        <TableCell className="text-right py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-indigo-600"
                              onClick={() => setEditingProgram(p)}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-600"
                              onClick={() => handleDeleteProgram(p.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {programs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-gray-400 italic text-xs">
                          No programs found for this school.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                <div className="p-4 bg-gray-50/50 border-t">
                  {!showAddProgram ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-indigo-600 font-bold hover:bg-indigo-50"
                      onClick={() => setShowAddProgram(true)}
                    >
                      <Plus size={14} className="mr-1" /> Add New Program
                    </Button>
                  ) : (
                    <form onSubmit={handleAddProgram} className="space-y-3 p-2 bg-white rounded-xl border border-indigo-100 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Program Name (e.g. B.Tech CSE)"
                          value={newProgram.program_name}
                          onChange={(e) => setNewProgram({ ...newProgram, program_name: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Short Description"
                          value={newProgram.description}
                          onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowAddProgram(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          size="sm" 
                          disabled={saving}
                          className="font-bold"
                        >
                          {saving ? <Loader2 size={14} className="animate-spin" /> : "Save Program"}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}

      {editingProgram && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <Settings2 size={20} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900">Edit Program</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingProgram(null)} className="rounded-full">
                <X size={20} />
              </Button>
            </div>
            <form onSubmit={handleEditProgram} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Program Name</label>
                <input
                  type="text"
                  value={editingProgram.program_name}
                  onChange={(e) => setEditingProgram({ ...editingProgram, program_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  value={editingProgram.description}
                  onChange={(e) => setEditingProgram({ ...editingProgram, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProgram(null)}
                  className="flex-1 rounded-2xl font-bold h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl font-black h-12 shadow-lg shadow-indigo-100"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [newSchool, setNewSchool] = useState({ school_code: "", full_name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const res = await api.get("/schools");
      setSchools(res.data.data);
    } catch (err) {
      console.error("Failed to fetch schools");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    if (!newSchool.school_code.trim() || !newSchool.full_name.trim()) return;
    setSaving(true);
    try {
      await api.post("/schools", newSchool);
      setNewSchool({ school_code: "", full_name: "" });
      setShowAddSchool(false);
      fetchSchools();
    } catch (err) {
      console.error("Failed to add school");
      alert(err.response?.data?.error || "Failed to add school");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchool = async (schoolCode) => {
    if (!confirm(`Delete school "${schoolCode}"? All programs under this school will also be deleted.`)) return;
    try {
      await api.delete(`/schools/${schoolCode}`);
      fetchSchools();
    } catch (err) {
      console.error("Failed to delete school");
      alert(err.response?.data?.error || "Failed to delete school");
    }
  };

  return (
    <div className="max-w-[95%] mx-auto py-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Schools & Programs</h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">Manage RVU schools and their academic programs.</p>
        </div>
        <Button onClick={() => setShowAddSchool(true)} className="px-8 h-14 rounded-2xl font-black shadow-lg shadow-indigo-100 gap-2">
          <Plus size={20} />
          Add New School
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border shadow-sm">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-gray-400 font-bold">Loading academic data...</p>
        </div>
      ) : schools.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[3rem] border shadow-sm">
          <div className="bg-gray-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <SchoolIcon className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-3">No schools configured</h3>
          <p className="text-gray-500 text-lg max-w-md mx-auto">Start by adding your first academic school to the portal.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16 text-center py-6 font-black text-gray-400 text-[10px] uppercase tracking-widest">#</TableHead>
                  <TableHead className="w-32 font-black text-gray-900 text-sm uppercase tracking-tight">Abbreviation</TableHead>
                  <TableHead className="min-w-[400px] font-black text-gray-900 text-sm uppercase tracking-tight">Full School Name</TableHead>
                  <TableHead className="w-48 font-black text-gray-900 text-sm uppercase tracking-tight">Academic Units</TableHead>
                  <TableHead className="w-32 text-right pr-8 font-black text-gray-900 text-sm uppercase tracking-tight">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school, idx) => (
                  <SchoolRow
                    key={school.school_code}
                    school={school}
                    index={idx}
                    onDeleteSchool={handleDeleteSchool}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {showAddSchool && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-100 p-3 rounded-2xl">
                  <SchoolIcon size={24} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Add New School</h3>
                  <p className="text-gray-500 text-sm font-medium">Create a new academic division</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAddSchool(false)} className="rounded-full">
                <X size={24} />
              </Button>
            </div>
            <form onSubmit={handleAddSchool} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">School Abbreviation</label>
                <input
                  type="text"
                  placeholder="e.g. SOCSE"
                  value={newSchool.school_code}
                  onChange={(e) => setNewSchool({ ...newSchool, school_code: e.target.value.toUpperCase() })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full School Name</label>
                <input
                  type="text"
                  placeholder="e.g. School of Computer Science..."
                  value={newSchool.full_name}
                  onChange={(e) => setNewSchool({ ...newSchool, full_name: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowAddSchool(false); setNewSchool({ school_code: "", full_name: "" }); }}
                  className="flex-1 h-14 rounded-2xl font-bold text-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-14 rounded-2xl font-black text-lg shadow-lg shadow-indigo-100"
                >
                  {saving ? <Loader2 className="animate-spin" /> : "Create School"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
