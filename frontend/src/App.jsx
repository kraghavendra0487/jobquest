import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useToast, Center, Spinner } from '@chakra-ui/react';

// Pages
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import UserSchoolsPage from './pages/UserSchoolsPage';
import JobProcessPage from './pages/JobProcessPage';
import JobAutoPage from './pages/JobAutoPage';
// Routes
import { RequireAuth } from './routes/RequireAuth';

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
  }, [toast, navigate]);

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
  }, [checkUserInDB]);

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
        path="/schools" 
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <UserSchoolsPage session={session} userData={userData} />
            )}
          </RequireAuth>
        } 
      />

      <Route 
        path="/job-process/*" 
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <JobProcessPage session={session} userData={userData} />
            )}
          </RequireAuth>
        } 
      />

      <Route 
        path="/job-auto" 
        element={
          <RequireAuth session={session}>
            {isNewUser ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <JobAutoPage session={session} userData={userData} />
            )}
          </RequireAuth>
        } 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
