import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Search, Building, Globe, Briefcase, ChevronRight, Loader2, ArrowUpRight, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { cn } from "../../lib/utils";

const AdminCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/companies");
      setCompanies(res.data.data);
    } catch (err) {
      console.error("Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const name = c.name || c.company_name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Companies</h1>
          <p className="text-gray-500 mt-2 text-lg">Manage all partner companies and their profiles.</p>
        </div>
        <Badge variant="outline" className="px-4 py-1.5 text-sm font-bold bg-indigo-50 border-indigo-100 text-indigo-600 self-start md:self-auto">
          {companies.length} Registered Partners
        </Badge>
      </div>

      <Card className="border-none shadow-xl shadow-gray-100/50 rounded-[2rem] overflow-visible">
        <CardContent className="p-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies by name, industry, or location..."
              className="pl-12 h-14 bg-gray-50/50 border-gray-100 focus:bg-white transition-all rounded-2xl text-base"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="bg-indigo-50 p-4 rounded-3xl">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          </div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Fetching company list...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <Card className="border-none shadow-xl shadow-gray-100/50 rounded-[2.5rem] p-20 text-center">
          <div className="bg-gray-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <Building className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-3">No companies found</h3>
          <p className="text-gray-500 text-lg max-w-md mx-auto">We couldn't find any companies matching "{search}". Companies appear here automatically when you upload jobs.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <Card
              key={company.id}
              className="border-none shadow-lg shadow-gray-100/50 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 rounded-[2rem] overflow-hidden group cursor-pointer"
            >
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-600 transition-colors duration-500">
                    <Building className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors duration-500" />
                  </div>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </a>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                      {company.name || company.company_name || "Unknown Company"}
                    </h3>
                    {company.industry && (
                      <div className="flex items-center text-gray-400 mt-1 font-bold text-xs uppercase tracking-wider">
                        <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                        {company.industry}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center text-gray-500 font-medium text-sm">
                      <MapPin className="w-4 h-4 mr-1.5 text-gray-300" />
                      {company.location || "Global"}
                    </div>
                    <Badge variant="secondary" className="bg-gray-50 text-gray-500 border-none font-bold">
                      Partner
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCompanies;

