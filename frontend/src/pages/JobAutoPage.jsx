import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import {
  Box, Container, Flex, Heading, Text, Avatar, IconButton, Menu, MenuButton, MenuList, MenuItem,
  Badge, VStack, HStack, Icon, Button, Divider, Table, Thead, Tbody, Tr, Th, Td, Input, Select,
  useToast, Spinner, Progress, Textarea, Center, InputGroup, InputLeftElement, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, Card, CardBody,
} from '@chakra-ui/react';
import {
  LogOut, User as UserIcon, GraduationCap, Bell, LayoutDashboard, School, Activity, Cpu,
  Settings,
  Upload as UploadIcon, FileSpreadsheet, CheckCircle2, Clock, Building2, Briefcase, Search,
  Star, RefreshCw, ArrowRight, Sparkles, Save, RotateCcw, Zap, BriefcaseBusiness,
} from "lucide-react";
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api, apiUpload } from '../lib/api';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Schools', icon: School, path: '/schools' },
  { name: 'All Jobs', icon: BriefcaseBusiness, path: '/admin-jobs' },
  { name: 'Job Process', icon: Activity, path: '/job-process' },
  { name: 'Job Auto', icon: Cpu, path: '/job-auto' },
];

const STEPS = [
  { key: 'upload', label: 'Upload', icon: UploadIcon },
  { key: 'preprocessing', label: 'Preprocess', icon: Cpu },
  { key: 'company-rating', label: 'Company Rating', icon: Building2 },
  { key: 'job-rating', label: 'Job Rating', icon: Briefcase },
  { key: 'results', label: 'Results', icon: CheckCircle2 },
];

function parseOutputToUpdates(rawOutput, jobIdMap) {
  const lines = rawOutput.split('\n').map(l => l.trim()).filter(Boolean);
  const updates = [];
  for (const line of lines) {
    if (/^#[,\s]/i.test(line) || /^jobid[,\s]/i.test(line) || /^company[,\s]/i.test(line)) continue;
    const parts = [];
    let cur = '', inQuote = false, inBracket = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === '[') { inBracket = true; cur += ch; continue; }
      if (ch === ']') { inBracket = false; cur += ch; continue; }
      if (ch === ',' && !inQuote && !inBracket) { parts.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    parts.push(cur.trim());
    if (parts.length < 6) continue;
    const rowNum = parseInt(parts[0].trim(), 10);
    const score = parseInt(parts[3].trim(), 10);
    const schoolsRaw = parts[4].trim();
    const salary = parseFloat(parts[5].trim());
    const jobId = jobIdMap[rowNum];
    if (!jobId) continue;
    let assignedSchools = [];
    try { assignedSchools = JSON.parse(schoolsRaw.replace(/'/g, '"')); }
    catch { assignedSchools = schoolsRaw.replace(/[[]"]/g, '').split(',').map(s => s.trim()).filter(Boolean); }
    updates.push({ jobId, ai_score: score >= 1 && score <= 10 ? score : null, assigned_schools: assignedSchools.length > 0 ? assignedSchools : null, estimated_salary_lpa: !isNaN(salary) && salary > 0 ? salary : null });
  }
  return updates;
}

export default function JobAutoPage({ session, userData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [wizardStep, setWizardStep] = useState('upload');
  const [currentUpload, setCurrentUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);

  // Company rating state
  const [companies, setCompanies] = useState([]);
  const [companyPrompt, setCompanyPrompt] = useState('');
  const [companyOutput, setCompanyOutput] = useState('');
  const [companyRunning, setCompanyRunning] = useState(false);

  // Job rating state
  const [jobs, setJobs] = useState([]);
  const [jobPrompt, setJobPrompt] = useState('');
  const [jobOutput, setJobOutput] = useState('');
  const [parsedJobUpdates, setParsedJobUpdates] = useState([]);
  const [jobRunning, setJobRunning] = useState(false);
  const [jobSaving, setJobSaving] = useState(false);
  const [usingAllJobs, setUsingAllJobs] = useState(false);

  // Results state
  const [resultSearch, setResultSearch] = useState('');
  const [resultFilterSchool, setResultFilterSchool] = useState('');
  const [resultSort, setResultSort] = useState('ai_score_desc');
  const [schoolsList, setSchoolsList] = useState([]);

  const { isOpen: isCompanyAIOpen, onOpen: onCompanyAIOpen, onClose: onCompanyAIClose } = useDisclosure();

  useEffect(() => {
    api('/api/schools').then(d => setSchoolsList(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollInterval) clearInterval(pollInterval); }, [pollInterval]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const allowedTypes = ['.xlsx', '.xls'];
    if (!allowedTypes.some(t => file.name.toLowerCase().endsWith(t))) {
      toast({ title: 'Invalid file type', description: 'Please upload an Excel file.', status: 'error' });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const preview = await apiUpload('/api/admin/job-uploads/preview', formData);
      await api(`/api/admin/job-uploads/${preview.upload_id}/save`, { method: 'POST' });
      toast({ title: 'Upload successful', description: 'Preprocessing started...', status: 'success' });
      setCurrentUpload({ id: preview.upload_id, filename: file.name, status: 'processing', progress: 10 });
      setWizardStep('preprocessing');
      startPolling(preview.upload_id);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, status: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startPolling = (uploadId) => {
    if (pollInterval) clearInterval(pollInterval);
    const interval = setInterval(async () => {
      try {
        const data = await api('/api/admin/job-uploads');
        const uploads = Array.isArray(data) ? data : (data.uploads || []);
        const upload = uploads.find(u => u.id === uploadId);
        if (upload) {
          setCurrentUpload(prev => ({ ...prev, ...upload }));
          if (upload.status === 'saved' || upload.status === 'completed') {
            clearInterval(interval);
            setPollInterval(null);
            setWizardStep('company-rating');
            loadCompaniesForUpload(upload);
          }
        }
      } catch (_e) { /* silent poll failure */ }
    }, 4000);
    setPollInterval(interval);
  };

  const loadCompaniesForUpload = async (upload) => {
    setIsLoading(true);
    try {
      // Companies are embedded in upload object
      const comps = (upload.companies || []).map(c => ({ ...c, _localRating: c.rating }));
      setCompanies(comps);
    } catch (err) {
      toast({ title: 'Error loading companies', description: err.message, status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveManualCompanyRating = async (companyId, rating) => {
    try {
      const { error } = await supabase.from('companies').update({ rating, rated_by: 'manual', updated_at: new Date().toISOString() }).eq('id', companyId);
      if (error) throw error;
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, rating, _localRating: rating } : c));
      toast({ title: 'Rating saved', status: 'success' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, status: 'error' });
    }
  };

  const unratedCompanies = companies.filter(c => c.rating == null);
  const ratedCount = companies.filter(c => c.rating != null).length;

  const openCompanyAI = () => {
    const names = unratedCompanies.map(c => c.name).join(', ');
    setCompanyPrompt(
      `Rate the below companies on a scale of 1 to 5 based on employer quality/growth/reputation.\nUse the full range (1,2,3,4,5); do not give all companies the same score unless truly justified.\nReturn only CSV output with columns: Company,Rating\n\n${names}`
    );
    setCompanyOutput('');
    onCompanyAIOpen();
  };

  const sendCompanyAI = async () => {
    setCompanyRunning(true);
    setCompanyOutput('');
    try {
      const data = await api('/api/admin/ai/playground', {
        method: 'POST',
        body: { system_prompt: '', user_input: companyPrompt, json_mode: false, wrap_input: false },
      });
      const raw = data.response?.trim() || '';
      setCompanyOutput(raw);
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      let saved = 0;
      for (const line of lines) {
        if (/^company[,\s]/i.test(line)) continue;
        const parts = line.split(',');
        if (parts.length >= 2) {
          const name = parts[0].trim().toLowerCase();
          const r = parseInt(parts[parts.length - 1].trim(), 10);
          if (name && [1,2,3,4,5].includes(r)) {
            const { error } = await supabase.from('companies').update({ rating: r, rated_by: 'ai', updated_at: new Date().toISOString() }).ilike('name', name);
            if (!error) saved++;
          }
        }
      }
      toast({ title: `Saved ${saved} company ratings`, status: 'success' });
      // Refresh companies
      const { data: refreshed } = await supabase.from('companies').select('*').in('id', companies.map(c => c.id));
      if (refreshed) {
        setCompanies(prev => prev.map(c => {
          const updated = refreshed.find(r => r.id === c.id);
          return updated ? { ...updated, _localRating: updated.rating } : c;
        }));
      }
    } catch (err) {
      toast({ title: 'AI request failed', description: err.message, status: 'error' });
    } finally {
      setCompanyRunning(false);
    }
  };

  const proceedToJobRating = async () => {
    setIsLoading(true);
    try {
      // Ensure schools are loaded
      let schools = schoolsList;
      if (schools.length === 0) {
        try {
          const d = await api('/api/schools');
          schools = Array.isArray(d) ? d : [];
          setSchoolsList(schools);
      } catch (_e) { /* ignore */ }
      }

      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select('id, title, company, location, description_compact, full_description, ai_score, assigned_schools, estimated_salary_lpa, company_id, upload_id')
        .eq('upload_id', currentUpload.id);
      if (error) throw error;
      const allJobs = jobsData || [];
      // Filter to companies rated 4+
      const goodCompanyIds = new Set(companies.filter(c => c.rating >= 4).map(c => c.id));
      let filteredJobs = allJobs.filter(j => goodCompanyIds.has(j.company_id));
      let fallbackToAll = false;
      if (filteredJobs.length === 0 && allJobs.length > 0) {
        filteredJobs = allJobs;
        fallbackToAll = true;
      }
      setJobs(filteredJobs);
      setUsingAllJobs(fallbackToAll);

      // Build prompt
      const schoolNames = schools.map(s => s.name).join(', ');
      const jobCsv = filteredJobs.map((j, i) => {
        const desc = (j.description_compact || j.full_description || 'No description').replace(/\n/g, ' ').replace(/"/g, "'").slice(0, 400);
        return (i + 1) + ',"' + (j.company || 'Unknown').replace(/"/g, "'") + '","' + (j.title || 'Untitled').replace(/"/g, "'") + '","' + desc + '"';
      }).join('\n');

      setJobPrompt(
        'Analyze the job using Company Name, Job Title and Job Description.\n' +
        'Give an Overall AI Job Score (1-10) based on job quality, growth potential and compensation.\n' +
        'Tasks:\n' +
        '- Assign relevant school(s) only from the provided school list\n' +
        '- Estimate salary in INR LPA (infer if not provided)\n\n' +
        'Return ONLY CSV with columns:\n' +
        '#,Company,JobTitle,OverallScore,AssignedSchool(array[string]),EstimatedSalaryLPA\n\n' +
        'Example AssignedSchool: ["School A","School B"]\n' +
        'IMPORTANT: The # column must match the row number from input exactly.\n\n' +
        'School List: [' + schoolNames + ']\n\n' +
        'Job Details (#,Company,JobTitle,JobDescription):\n' + jobCsv
      );
      setWizardStep('job-rating');
      if (fallbackToAll) {
        toast({ title: 'No 4+ rated companies', description: 'Showing all jobs instead.', status: 'warning' });
      }
    } catch (err) {
      toast({ title: 'Error loading jobs', description: err.message, status: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const sendJobAI = async () => {
    setJobRunning(true);
    setJobOutput('');
    setParsedJobUpdates([]);
    try {
      const data = await api('/api/admin/ai/playground', {
        method: 'POST',
        body: { system_prompt: '', user_input: jobPrompt, json_mode: false, wrap_input: false },
      });
      const raw = data.response?.trim() || '';
      setJobOutput(raw);
      const jobIdMap = {};
      jobs.forEach((j, i) => { jobIdMap[i + 1] = j.id; });
      const updates = parseOutputToUpdates(raw, jobIdMap);
      setParsedJobUpdates(updates);
      toast({ title: `Parsed ${updates.length} job ratings`, status: 'info' });
    } catch (err) {
      toast({ title: 'AI request failed', description: err.message, status: 'error' });
    } finally {
      setJobRunning(false);
    }
  };

  const saveJobRatings = async () => {
    if (parsedJobUpdates.length === 0) return;
    setJobSaving(true);
    try {
      let savedCount = 0;
      for (const u of parsedJobUpdates) {
        const payload = { updated_at: new Date().toISOString() };
        if (u.ai_score != null) payload.ai_score = u.ai_score;
        if (u.assigned_schools) payload.assigned_schools = u.assigned_schools;
        if (u.estimated_salary_lpa != null) payload.estimated_salary_lpa = u.estimated_salary_lpa;
        const { error } = await supabase.from('jobs').update(payload).eq('id', u.jobId);
        if (!error) savedCount++;
      }
      toast({ title: `Saved ${savedCount}/${parsedJobUpdates.length} job ratings`, status: 'success' });
      // Refresh all jobs for results
      const { data: refreshedJobs } = await supabase
        .from('jobs')
        .select('id, title, company, location, description_compact, full_description, ai_score, assigned_schools, estimated_salary_lpa, company_id, upload_id')
        .eq('upload_id', currentUpload.id);
      setJobs(refreshedJobs || []);
      setWizardStep('results');
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, status: 'error' });
    } finally {
      setJobSaving(false);
    }
  };

  const resetWizard = () => {
    if (pollInterval) clearInterval(pollInterval);
    setPollInterval(null);
    setWizardStep('upload');
    setCurrentUpload(null);
    setCompanies([]);
    setJobs([]);
    setCompanyOutput('');
    setJobOutput('');
    setParsedJobUpdates([]);
    setResultSearch('');
  };

  const currentStepIndex = STEPS.findIndex(s => s.key === wizardStep);
  const progressPercent = ((currentStepIndex) / (STEPS.length - 1)) * 100;

  // Results filtering
  const filteredResults = useMemo(() => {
    let data = [...jobs];
    if (resultSearch) {
      const q = resultSearch.toLowerCase();
      data = data.filter(j => (j.title || '').toLowerCase().includes(q) || (j.company || '').toLowerCase().includes(q));
    }
    if (resultFilterSchool) {
      data = data.filter(j => (j.assigned_schools || []).includes(resultFilterSchool));
    }
    const [sortField, sortDir] = resultSort.split('_');
    data.sort((a, b) => {
      let av = a[sortField] || 0;
      let bv = b[sortField] || 0;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av > bv ? -1 : 1);
    });
    return data;
  }, [jobs, resultSearch, resultFilterSchool, resultSort]);

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" borderBottom="1px" borderColor="gray.100" position="fixed" top={0} left={0} right={0} zIndex="sticky">
        <Container maxW="full" px={6}>
          <Flex h={16} align="center" justify="space-between">
            <HStack spacing={3}>
              <Box bg="blue.600" p={1.5} borderRadius="lg" color="white"><Icon as={GraduationCap} boxSize={6} /></Box>
              <Heading size="md" tracking="tight">RVU Portal</Heading>
            </HStack>
            <HStack spacing={4}>
              <IconButton variant="ghost" icon={<Icon as={Bell} boxSize={5} />} color="gray.500" aria-label="Notifications" />
              <Menu>
                <MenuButton><Avatar size="sm" src={session.user.user_metadata.avatar_url} /></MenuButton>
                <MenuList shadow="xl" borderRadius="xl">
                  <Box px={4} py={2}><Text fontWeight="bold" fontSize="sm">{userData?.name}</Text><Text fontSize="xs" color="gray.500">{userData?.email}</Text></Box>
                  <Divider />
                  <MenuItem icon={<Icon as={UserIcon} />}>My Profile</MenuItem>
                  <MenuItem icon={<Icon as={Settings} />}>Settings</MenuItem>
                  <Divider />
                  <MenuItem icon={<Icon as={LogOut} />} color="red.500" onClick={handleLogout}>Log Out</MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Flex pt={16}>
        {/* Sidebar */}
        <Box w="260px" bg="white" borderRight="1px" borderColor="gray.200" position="fixed" zIndex="docked" h="calc(100vh - 64px)" py={8} px={4} display={{ base: 'none', md: 'block' }}>
          <VStack align="stretch" spacing={2}>
            {sidebarItems.map((item) => (
              <Button key={item.path} as={Link} to={item.path}
                variant={location.pathname === item.path ? 'solid' : 'ghost'}
                colorScheme={location.pathname === item.path ? 'blue' : 'gray'}
                justifyContent="flex-start" leftIcon={<Icon as={item.icon} />} size="md" borderRadius="xl" fontSize="sm"
                fontWeight={location.pathname === item.path ? 'bold' : 'medium'}
                _hover={{ bg: location.pathname === item.path ? 'blue.600' : 'gray.100' }}>
                {item.name}
              </Button>
            ))}
          </VStack>
        </Box>

        {/* Main Content */}
        <Box flex="1" ml={{ base: 0, md: '260px' }} p={8}>
          <Container maxW="7xl">
            <VStack align="stretch" spacing={6}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Heading size="lg">Job Auto Wizard</Heading>
                  <Text color="gray.500">Upload, preprocess, rate companies, rate jobs — all in one flow</Text>
                </Box>
                {wizardStep !== 'upload' && (
                  <Button leftIcon={<RotateCcw size={16} />} variant="outline" onClick={resetWizard}>Start New</Button>
                )}
              </Flex>

              {/* Step Indicators */}
              <Card bg="white" borderRadius="2xl" shadow="sm" border="1px" borderColor="gray.200">
                <CardBody>
                  <VStack spacing={3}>
                    <HStack spacing={0} w="full" justify="space-between">
                      {STEPS.map((step, idx) => (
                        <Fragment key={step.key}>
                          <VStack spacing={1} flex={1} align="center">
                            <Center w={8} h={8} borderRadius="full" bg={idx <= currentStepIndex ? 'blue.500' : 'gray.200'} color="white" fontSize="xs" fontWeight="bold">
                              {idx < currentStepIndex ? <CheckCircle2 size={16} /> : idx + 1}
                            </Center>
                            <Text fontSize="xs" fontWeight={idx === currentStepIndex ? 'bold' : 'medium'} color={idx === currentStepIndex ? 'blue.600' : 'gray.400'}>{step.label}</Text>
                          </VStack>
                          {idx < STEPS.length - 1 && (
                            <Box flex={1} h="2px" bg={idx < currentStepIndex ? 'blue.400' : 'gray.200'} mt={4} mx={2} borderRadius="full" />
                          )}
                        </Fragment>
                      ))}
                    </HStack>
                    <Progress value={progressPercent} size="xs" colorScheme="blue" borderRadius="full" w="full" />
                  </VStack>
                </CardBody>
              </Card>

              {/* Upload Section */}
              {wizardStep === 'upload' && (
                <Box bg="white" p={10} borderRadius="2xl" border="2px dashed" borderColor="blue.300" textAlign="center" shadow="sm">
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept=".xlsx,.xls" />
                  <VStack spacing={6}>
                    <Box p={4} bg="blue.50" borderRadius="full"><Icon as={isUploading ? Spinner : UploadIcon} boxSize={10} color="blue.500" /></Box>
                    <VStack spacing={2}>
                      <Heading size="md">{isUploading ? 'Processing...' : 'Upload Excel File'}</Heading>
                      <Text color="gray.500">Drag and drop or select your LinkedIn export</Text>
                    </VStack>
                    <Button colorScheme="blue" size="lg" borderRadius="xl" onClick={handleFileSelect} isLoading={isUploading} loadingText="Uploading" leftIcon={!isUploading && <Icon as={UploadIcon} />}>
                      Select File
                    </Button>
                    <HStack spacing={4} color="gray.400" fontSize="xs">
                      <HStack><Icon as={FileSpreadsheet} size={14} /><Text>.xlsx / .xls</Text></HStack>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Preprocessing Section */}
              {wizardStep === 'preprocessing' && currentUpload && (
                <Card bg="white" borderRadius="2xl" shadow="sm" border="1px" borderColor="gray.200">
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <HStack spacing={4}>
                        <Icon as={Cpu} boxSize={8} color="blue.500" />
                        <Box flex={1}>
                          <Text fontWeight="bold">{currentUpload.filename}</Text>
                          <Text fontSize="sm" color="gray.500">Preprocessing in progress...</Text>
                        </Box>
                        <Spinner color="blue.500" />
                      </HStack>
                      <Progress value={currentUpload.progress || 30} size="sm" colorScheme="blue" borderRadius="full" isAnimated hasStripe />
                      <Text fontSize="xs" color="gray.400">Extracting companies and cleaning data. This may take a moment.</Text>
                    </VStack>
                  </CardBody>
                </Card>
              )}

              {/* Company Rating Section */}
              {wizardStep === 'company-rating' && (
                <VStack align="stretch" spacing={4}>
                  <Flex justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Icon as={Building2} color="orange.500" />
                      <Text fontWeight="bold" fontSize="lg">Company Rating</Text>
                      <Badge colorScheme="orange" variant="subtle" borderRadius="full">{ratedCount}/{companies.length} rated</Badge>
                    </HStack>
                    <HStack spacing={3}>
                      {unratedCompanies.length > 0 && (
                        <Button leftIcon={<Sparkles size={16} />} colorScheme="purple" onClick={openCompanyAI} size="sm" borderRadius="lg">
                          Send AI Prompt
                        </Button>
                      )}
                      <Button leftIcon={<ArrowRight size={16} />} colorScheme="blue" onClick={proceedToJobRating} size="sm" borderRadius="lg" isLoading={isLoading}>
                        Proceed to Job Rating
                      </Button>
                    </HStack>
                  </Flex>

                  {isLoading ? (
                    <Center py={10}><Spinner color="blue.500" /></Center>
                  ) : companies.length === 0 ? (
                    <Text color="gray.500" textAlign="center" py={10}>No companies found.</Text>
                  ) : (
                    <Box bg="white" borderRadius="xl" border="1px" borderColor="gray.200" overflow="hidden" shadow="sm">
                      <Table variant="simple" size="sm">
                        <Thead bg="gray.50">
                          <Tr><Th>Company</Th><Th>Domain</Th><Th>Rating</Th><Th>Action</Th></Tr>
                        </Thead>
                        <Tbody>
                          {companies.map((c) => (
                            <Tr key={c.id} _hover={{ bg: 'gray.50' }}>
                              <Td fontWeight="semibold">{c.name}</Td>
                              <Td fontSize="sm" color="gray.500">{c.domain || '-'}</Td>
                              <Td>
                                <HStack spacing={1}>
                                  {[1,2,3,4,5].map(star => (
                                    <IconButton key={star} size="xs" variant="ghost"
                                      icon={<Star size={14} style={{ color: (c._localRating || c.rating || 0) >= star ? '#ED8936' : '#CBD5E0', fill: (c._localRating || c.rating || 0) >= star ? '#ED8936' : 'none' }} />}
                                      aria-label={`Rate ${star}`}
                                      onClick={() => saveManualCompanyRating(c.id, star)}
                                    />
                                  ))}
                                  <Text fontSize="xs" fontWeight="bold" ml={2} color="orange.600">{c.rating || '-'}</Text>
                                </HStack>
                              </Td>
                              <Td>
                                <Select size="xs" w="80px" value={c._localRating || c.rating || ''}
                                  onChange={(e) => { const val = parseInt(e.target.value); setCompanies(prev => prev.map(x => x.id === c.id ? { ...x, _localRating: val } : x)); }}>
                                  <option value="">Rate</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="4">4</option>
                                  <option value="5">5</option>
                                </Select>
                                <Button size="xs" ml={2} colorScheme="blue" onClick={() => saveManualCompanyRating(c.id, c._localRating || c.rating)} isDisabled={!(c._localRating || c.rating)}>
                                  Save
                                </Button>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  )}
                </VStack>
              )}

              {/* Job Rating Section */}
              {wizardStep === 'job-rating' && (
                <VStack align="stretch" spacing={4}>
                  <Flex justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Icon as={Briefcase} color="purple.500" />
                      <Text fontWeight="bold" fontSize="lg">Job Rating</Text>
                      <Badge colorScheme="purple" variant="subtle" borderRadius="full">{jobs.length} jobs {usingAllJobs ? '(all companies)' : 'from 4+ rated companies'}</Badge>
                    </HStack>
                  </Flex>

                  <Textarea value={jobPrompt} onChange={(e) => setJobPrompt(e.target.value)} rows={8} fontFamily="mono" fontSize="xs" bg="gray.50" borderRadius="lg" />

                  <HStack justify="flex-end" spacing={3}>
                    <Button leftIcon={<Zap size={16} />} colorScheme="purple" onClick={sendJobAI} isLoading={jobRunning} loadingText="Analyzing...">
                      Send Prompt
                    </Button>
                  </HStack>

                  {jobOutput && (
                    <Box bg="white" p={4} borderRadius="xl" border="1px" borderColor="gray.200" shadow="sm">
                      <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2}>AI Output ({parsedJobUpdates.length} parsed)</Text>
                      <Box bg="gray.50" p={3} borderRadius="lg" fontFamily="mono" fontSize="xs" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                        {jobOutput}
                      </Box>
                      <Flex justify="flex-end" mt={3}>
                        <Button colorScheme="green" leftIcon={<Save size={16} />} onClick={saveJobRatings} isLoading={jobSaving} isDisabled={parsedJobUpdates.length === 0}>
                          Save to DB ({parsedJobUpdates.length})
                        </Button>
                      </Flex>
                    </Box>
                  )}
                </VStack>
              )}

              {/* Results Section */}
              {wizardStep === 'results' && (
                <VStack align="stretch" spacing={4}>
                  <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                    <HStack spacing={3}>
                      <Icon as={CheckCircle2} color="green.500" />
                      <Text fontWeight="bold" fontSize="lg">Results Preview</Text>
                      <Badge colorScheme="green" variant="subtle" borderRadius="full">{filteredResults.length} jobs</Badge>
                    </HStack>
                    <HStack spacing={3}>
                      <InputGroup maxW="250px" size="sm">
                        <InputLeftElement pointerEvents="none"><Icon as={Search} color="gray.400" size={14} /></InputLeftElement>
                        <Input placeholder="Search title or company..." value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} borderRadius="lg" />
                      </InputGroup>
                      <Select size="sm" w="160px" value={resultFilterSchool} onChange={(e) => setResultFilterSchool(e.target.value)} borderRadius="lg">
                        <option value="">All Schools</option>
                        {schoolsList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </Select>
                      <Select size="sm" w="160px" value={resultSort} onChange={(e) => setResultSort(e.target.value)} borderRadius="lg">
                        <option value="ai_score_desc">Score: High to Low</option>
                        <option value="ai_score_asc">Score: Low to High</option>
                        <option value="title_asc">Title A-Z</option>
                        <option value="company_asc">Company A-Z</option>
                      </Select>
                    </HStack>
                  </Flex>

                  <Box bg="white" borderRadius="xl" border="1px" borderColor="gray.200" overflow="hidden" shadow="sm">
                    <Table variant="simple" size="sm">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Job Title</Th>
                          <Th>Company</Th>
                          <Th>AI Score</Th>
                          <Th>Schools</Th>
                          <Th>Salary (LPA)</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredResults.map(j => (
                          <Tr key={j.id} _hover={{ bg: 'gray.50' }}>
                            <Td fontWeight="semibold" maxW="300px" isTruncated>{j.title}</Td>
                            <Td color="gray.600">{j.company}</Td>
                            <Td>
                              <Badge colorScheme={j.ai_score >= 7 ? 'green' : j.ai_score >= 4 ? 'blue' : 'gray'} variant="subtle" borderRadius="full">
                                {j.ai_score || '-'}
                              </Badge>
                            </Td>
                            <Td>
                              <HStack spacing={1} wrap="wrap">
                                {(j.assigned_schools || []).map(s => (
                                  <Badge key={s} size="xs" colorScheme="teal" variant="outline" borderRadius="md">{s}</Badge>
                                ))}
                              </HStack>
                            </Td>
                            <Td fontWeight="medium" color="green.600">{j.estimated_salary_lpa || '-'}</Td>
                          </Tr>
                        ))}
                        {filteredResults.length === 0 && (
                          <Tr><Td colSpan={5} textAlign="center" py={10} color="gray.500">No results match your filters.</Td></Tr>
                        )}
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              )}
            </VStack>
          </Container>
        </Box>
      </Flex>

      {/* Company AI Modal */}
      <Modal isOpen={isCompanyAIOpen} onClose={onCompanyAIClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="2xl">
          <ModalHeader fontSize="md" fontWeight="bold">AI Company Rating</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={4}>
              <Textarea value={companyPrompt} onChange={(e) => setCompanyPrompt(e.target.value)} rows={8} fontFamily="mono" fontSize="sm" bg="gray.50" borderRadius="lg" />
              <Button colorScheme="orange" leftIcon={<Zap size={16} />} onClick={sendCompanyAI} isLoading={companyRunning} loadingText="Sending...">
                Send
              </Button>
              {companyOutput && (
                <Box bg="gray.50" p={3} borderRadius="lg" fontFamily="mono" fontSize="xs" whiteSpace="pre-wrap" maxH="200px" overflowY="auto">
                  {companyOutput}
                </Box>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
