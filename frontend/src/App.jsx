import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useToast, Center, Spinner } from '@chakra-ui/react';

// Pages
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import AdminLayout from './pages/admin/AdminLayout';
import SchoolsPage from './pages/admin/SchoolsPage';
import ProgramsPage from './pages/admin/ProgramsPage';
import JobUploadsPage from './pages/admin/JobUploadsPage';
import JobsMasterPage from './pages/admin/JobsMasterPage';
import CompaniesPage from './pages/admin/CompaniesPage';
import RateCompanyPage from './pages/admin/RateCompanyPage';
import CategorizationPage from './pages/admin/CategorizationPage';
import ApprovalQueuePage from './pages/admin/ApprovalQueuePage';
import PromptsCRUDPage from './pages/admin/PromptsCRUDPage';
import AIPlaygroundPage from './pages/admin/AIPlaygroundPage';
import AIAnalyticsPage from './pages/admin/AIAnalyticsPage';
import AIBatchesPage from './pages/admin/AIBatchesPage';
import AIBatchDetailsPage from './pages/admin/AIBatchDetailsPage';

// Routes
import { RequireAuth } from './routes/RequireAuth';
import { RequireAdmin } from './routes/RequireAdmin';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkUserInDB(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserInDB(session.user);
      } else {
        setLoading(false);
        setUserData(null);
        setIsNewUser(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserInDB = async (user) => {
    if (!user.email.endsWith("@rvu.edu.in")) {
      toast({
        title: "Access Denied",
        description: "Only RVU emails allowed",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        setIsNewUser(true);
        navigate('/onboarding');
      } else if (data) {
        setUserData(data);
        setIsNewUser(false);
      }
    } catch (err) {
      console.error("Error checking user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = (data) => {
    setUserData(data);
    setIsNewUser(false);
    navigate('/');
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" color="blue.500" thickness="4px" />
      </Center>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!session ? <LoginPage /> : <Navigate to="/" replace />} 
      />
      
      <Route 
        path="/onboarding" 
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <OnboardingPage session={session} onComplete={handleOnboardingComplete} />
            ) : (
              <Navigate to="/" replace />
            )}
          </RequireAuth>
        } 
      />

      <Route 
        path="/" 
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <DashboardPage session={session} userData={userData} />
            )}
          </RequireAuth>
        } 
      />

      <Route 
        path="/admin" 
        element={
          <RequireAuth session={session}>
            <RequireAdmin userData={userData}>
              <AdminLayout />
            </RequireAdmin>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/admin/schools" replace />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="programs" element={<ProgramsPage />} />
        <Route path="job-uploads" element={<JobUploadsPage />} />
        <Route path="jobs" element={<JobsMasterPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:id/rate" element={<RateCompanyPage />} />
        <Route path="categorization" element={<CategorizationPage />} />
        <Route path="approval-queue" element={<ApprovalQueuePage />} />
        <Route path="prompts" element={<PromptsCRUDPage />} />
        <Route path="ai-playground" element={<AIPlaygroundPage />} />
        <Route path="ai-analytics" element={<AIAnalyticsPage />} />
        <Route path="ai-batches" element={<AIBatchesPage />} />
        <Route path="ai-batches/:id" element={<AIBatchDetailsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
