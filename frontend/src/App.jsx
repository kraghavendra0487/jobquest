import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useToast, Center, Spinner } from '@chakra-ui/react';

// Pages
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentJobsPage from './pages/StudentJobsPage';
import DatabasePage from './pages/DatabasePage';
import AdminCompanyPage from './pages/AdminCompanyPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import AdminPipelineJobsPage from './pages/AdminPipelineJobsPage';
import AdminJobDetailPage from './pages/AdminJobDetailPage';
import AdminAllJobsPage from './pages/AdminAllJobsPage';
// Routes
import { RequireAuth } from './routes/RequireAuth';

function normalizeUserData(profile) {
  if (!profile) return null;

  const resolvedSchool =
    profile.school ||
    profile.schools?.name ||
    profile.schools?.[0]?.name ||
    null;

  return {
    ...profile,
    school: resolvedSchool,
  };
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const checkUserInDB = useCallback(async (user) => {
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
        .select("*, schools(name)")
        .eq("id", user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        setIsNewUser(true);
        navigate('/onboarding');
      } else if (data) {
        setUserData(normalizeUserData(data));
        setIsNewUser(false);
      }
    } catch (err) {
      console.error("Error checking user:", err);
    } finally {
      setLoading(false);
    }
  }, [toast, navigate]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      if (session) {
        checkUserInDB(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      if (session) {
        checkUserInDB(session.user);
      } else {
        setLoading(false);
        setUserData(null);
        setIsNewUser(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkUserInDB]);

  const handleOnboardingComplete = (data) => {
    setUserData(normalizeUserData(data));
    setIsNewUser(false);
    navigate('/');
  };

  const role = userData?.role || 'student';
  const isAdmin = role === 'admin';

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
              isAdmin ? (
                <DashboardPage session={session} userData={userData} />
              ) : (
                <StudentDashboardPage session={session} userData={userData} />
              )
            )}
          </RequireAuth>
        } 
      />

      <Route
        path="/admin-pipeline-jobs"
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              isAdmin ? (
                <AdminPipelineJobsPage session={session} userData={userData} />
              ) : (
                <Navigate to="/" replace />
              )
            )}
          </RequireAuth>
        }
      />

      <Route
        path="/admin-all-jobs"
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              isAdmin ? (
                <AdminAllJobsPage session={session} userData={userData} />
              ) : (
                <Navigate to="/" replace />
              )
            )}
          </RequireAuth>
        }
      />

      <Route
        path="/admin-database"
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              isAdmin ? (
                <DatabasePage session={session} userData={userData} />
              ) : (
                <Navigate to="/" replace />
              )
            )}
          </RequireAuth>
        }
      />

      <Route
        path="/admin-job-detail/:id"
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              isAdmin ? (
                <AdminJobDetailPage session={session} userData={userData} />
              ) : (
                <Navigate to="/" replace />
              )
            )}
          </RequireAuth>
        }
      />

      <Route
        path="/admin-company"
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              isAdmin ? (
                <AdminCompanyPage session={session} userData={userData} />
              ) : (
                <Navigate to="/" replace />
              )
            )}
          </RequireAuth>
        }
      />

      <Route
        path="/admin-company-detail/:id"
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              isAdmin ? (
                <CompanyDetailPage session={session} userData={userData} />
              ) : (
                <Navigate to="/" replace />
              )
            )}
          </RequireAuth>
        }
      />

      <Route
        path="/jobs"
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              isAdmin ? (
                <Navigate to="/" replace />
              ) : (
                <StudentJobsPage session={session} userData={userData} />
              )
            )}
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
