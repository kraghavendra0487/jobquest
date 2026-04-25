import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Shield, Mail, Lock, User, AlertCircle, Loader2, GraduationCap } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import api from "../lib/api";

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [schools, setSchools] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    try {
      if (isRegistering) {
        if (!school) {
          setError("Please select your school");
          setLoading(false);
          return;
        }
        await register(trimmedName, trimmedEmail, password, school);
      } else {
        await login(trimmedEmail, password);
      }
      navigate("/");
    } catch (err) {
      console.error("Auth error:", err);
      const message = err.response?.data?.error || 
                     (err.code === "ERR_NETWORK" ? "Network error. Please check if the backend is running and reachable." : "Authentication failed. Please try again.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 backdrop-blur-sm">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-center text-gray-900 mb-2">
            {isRegistering ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-center text-gray-500 mb-8 font-medium">
            {isRegistering ? "Join the RVU Job Portal" : "Login to access your dashboard"}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-700 animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-12"
                  />
                </div>
                <div className="relative group">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <select
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    required
                    className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value="" disabled>Select your School</option>
                    {schools.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input
                type="email"
                placeholder="RVU Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-bold shadow-lg shadow-indigo-100 mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                isRegistering ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-indigo-600 font-bold hover:text-indigo-700 transition-all hover:underline underline-offset-4"
            >
              {isRegistering 
                ? "Already have an account? Sign In" 
                : "New student? Create an account"}
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50/50 p-6 border-t text-center">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
            Exclusive to RVU Students & Admin
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
