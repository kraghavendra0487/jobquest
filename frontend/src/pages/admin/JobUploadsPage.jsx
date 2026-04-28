import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Icon,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  Divider,
  Center,
  SimpleGrid,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Input,
  IconButton,
  List,
  ListItem,
  ListIcon,
  Select,
  Progress,
  Code,
} from '@chakra-ui/react';
import { 
  Upload, 
  CheckCircle, 
  X, 
  ArrowRight, 
  Edit2, 
  Building2, 
  Tags, 
  UserCheck, 
  Terminal,
  ChevronRight,
} from 'lucide-react';
import { apiUpload, api } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';

export default function JobUploadsPage() {
  const [stage, setStage] = useState('idle'); // idle | previewing | preview_ready | saving | company_rating | job_categorization | done
  const [previewData, setPreviewData] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isUpdatingFetchedAt, setIsUpdatingFetchedAt] = useState(false);
  
  // AI Flow States
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [batchId, setBatchId] = useState(null);
  const [batchStatus, setBatchStatus] = useState(null);
  const [batchLogs, setBatchLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [currentPromptPreview, setCurrentPromptPreview] = useState(null);
  
  // Counts
  const [counts, setCounts] = useState({
    totalCompanies: 0,
    ratedCompanies: 0,
    unratedCompanies: 0,
    totalJobs: 0,
    categorizedJobs: 0,
    pendingJobs: 0
  });

  const toast = useToast();

  useEffect(() => {
    if (stage === 'idle' || stage === 'done') {
      fetchHistory();
    }
  }, [stage]);

  // Fetch prompts when entering AI stages
  useEffect(() => {
    if (stage === 'company_rating' || stage === 'job_categorization') {
      fetchPrompts();
      fetchCounts();
    }
  }, [stage]);

  // Poll for batch progress
  useEffect(() => {
    let interval;
    if (batchId && isProcessing) {
      interval = setInterval(async () => {
        const { data: batch } = await supabase.from('ai_batches').select('*').eq('id', batchId).single();
        setBatchStatus(batch);
        
        const { data: logs } = await supabase
          .from('ai_batch_logs')
          .select('*')
          .eq('batch_id', batchId)
          .order('created_at', { ascending: false })
          .limit(10);
        setBatchLogs(logs || []);

        if (batch && (batch.status === 'completed' || batch.status === 'done' || batch.status === 'failed')) {
          setIsProcessing(false);
          fetchCounts(); // Update counts after batch finishes
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [batchId, isProcessing]);

  const fetchPrompts = async () => {
    const purpose = stage === 'company_rating' ? 'rate_company' : 'categorize_job';
    const { data } = await supabase
      .from('prompts')
      .select('*')
      .eq('purpose', purpose)
      .eq('is_archived', false);
    setPrompts(data || []);
    
    // Auto-select default prompt
    const defaultPrompt = data?.find(p => p.is_default);
    if (defaultPrompt) setSelectedPrompt(defaultPrompt.id);
  };

  const fetchCounts = async () => {
    if (!saveResult?.upload_id) return;
    
    if (stage === 'company_rating') {
      // Get companies from jobs in this upload
      const { data: jobs } = await supabase
        .from('jobs')
        .select('company')
        .eq('upload_id', saveResult.upload_id);
      
      const uniqueCompanyNames = [...new Set(jobs.map(j => (j.company || '').trim().toLowerCase()))];
      
      const { data: companies } = await supabase
        .from('companies')
        .select('id, rating')
        .in('name', uniqueCompanyNames);
      
      const rated = companies?.filter(c => c.rating !== null).length || 0;
      const unrated = companies?.filter(c => c.rating === null).length || 0;
      
      setCounts(prev => ({
        ...prev,
        totalCompanies: companies?.length || 0,
        ratedCompanies: rated,
        unratedCompanies: unrated
      }));
    } else if (stage === 'job_categorization') {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, status, companies(rating)')
        .eq('upload_id', saveResult.upload_id);
      
      // Filter jobs where company rating >= 4
      const eligibleJobs = jobs?.filter(j => j.companies?.rating >= 4) || [];
      const categorized = eligibleJobs.filter(j => j.status === 'categorized').length;
      const pending = eligibleJobs.length - categorized;
      
      setCounts(prev => ({
        ...prev,
        totalJobs: eligibleJobs.length,
        categorizedJobs: categorized,
        pendingJobs: pending
      }));
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api('/api/admin/job-uploads');
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStage('previewing');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await apiUpload('/api/admin/job-uploads/preview', formData);
      setPreviewData(data);
      setStage('preview_ready');
    } catch (err) {
      toast({ title: 'Upload Error', description: err.message, status: 'error' });
      setStage('idle');
    }
  };

  const handleSave = async () => {
    setStage('saving');
    try {
      const data = await api(`/api/admin/job-uploads/${previewData.upload_id}/save`, {
        method: 'POST'
      });
      setSaveResult(data);
      setStage('company_rating'); // Go to next step directly
      toast({ title: 'Success', description: `Saved ${data.inserted} jobs. Now rating companies...`, status: 'success' });
    } catch (err) {
      toast({ title: 'Save Error', description: err.message, status: 'error' });
      setStage('preview_ready');
    }
  };

  const handleStartRating = async () => {
    if (!selectedPrompt) return;
    
    // 1. Fetch unrated companies for this upload
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('company')
        .eq('upload_id', saveResult.upload_id);
      
      const uniqueNames = [...new Set(jobs.map(j => (j.company || '').trim()))];
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('name', uniqueNames)
        .is('rating', null);
      
      const companyIds = companies.map(c => c.id);
      
      if (companyIds.length === 0) {
        toast({ title: 'Info', description: 'No unrated companies found for this upload', status: 'info' });
        return;
      }

      // 2. Prepare prompt preview
      const prompt = prompts.find(p => p.id === selectedPrompt);
      const sampleChunk = companies.slice(0, 20); // sample batch
      
      // Simple mock of promptEngine.render for UI preview
      const renderPreview = (template, vars) => {
        return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => {
          return JSON.stringify(vars[key], null, 2);
        });
      };

      const userPayload = renderPreview(prompt.user_template, { 
        companies: sampleChunk.map(c => ({ name: c.name })) 
      });

      setCurrentPromptPreview({
        system: prompt.system_prompt,
        user: userPayload,
        targetIds: companyIds,
        type: 'company'
      });
      setShowPromptPreview(true);
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    }
  };

  const confirmStartRating = async () => {
    setIsProcessing(true);
    setShowPromptPreview(false);
    setBatchLogs([]);
    
    try {
      const res = await api('/api/admin/ai/companies/rate-batch', {
        method: 'POST',
        body: JSON.stringify({
          company_ids: currentPromptPreview.targetIds,
          prompt_id: selectedPrompt
        })
      });
      
      setBatchId(res.batch_id);
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
      setIsProcessing(false);
    }
  };

  const handleStartCategorizing = async () => {
    if (!selectedPrompt) return;
    
    try {
      // Get jobs for this upload where company rating >= 4
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, company, employment_type, description_compact, companies(rating)')
        .eq('upload_id', saveResult.upload_id);
      
      const eligibleJobs = jobs?.filter(j => j.companies?.rating >= 4) || [];
      const jobIds = eligibleJobs.map(j => j.id);
      
      if (jobIds.length === 0) {
        toast({ title: 'Info', description: 'No jobs found with company rating >= 4', status: 'info' });
        return;
      }

      // Prepare prompt preview
      const prompt = prompts.find(p => p.id === selectedPrompt);
      const sampleJob = eligibleJobs[0];
      
      const { data: schools } = await supabase.from('schools').select('id, name').limit(5);

      const renderPreview = (template, vars) => {
        return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => {
          return JSON.stringify(vars[key], null, 2);
        });
      };

      const userPayload = renderPreview(prompt.user_template, { 
        title: sampleJob.title,
        company: sampleJob.company,
        employment_type: sampleJob.employment_type,
        summary: sampleJob.description_compact,
        schools: schools.map(s => ({ id: s.id, name: s.name }))
      });

      setCurrentPromptPreview({
        system: prompt.system_prompt,
        user: userPayload,
        targetIds: jobIds,
        type: 'job'
      });
      setShowPromptPreview(true);
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    }
  };

  const confirmStartCategorizing = async () => {
    setIsProcessing(true);
    setShowPromptPreview(false);
    setBatchLogs([]);
    
    try {
      const res = await api('/api/admin/ai/jobs/categorize-batch', {
        method: 'POST',
        body: JSON.stringify({
          job_ids: currentPromptPreview.targetIds,
          prompt_id: selectedPrompt
        })
      });
      
      setBatchId(res.batch_id);
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setPreviewData(null);
    setSaveResult(null);
    setStage('idle');
    setBatchId(null);
    setIsProcessing(false);
  };

  const handleUpdateFetchedAt = async (newIso) => {
    if (!newIso) return;
    setIsUpdatingFetchedAt(true);
    try {
      await api(`/api/admin/job-uploads/${previewData.upload_id}/refetched-at`, {
        method: 'POST',
        body: JSON.stringify({ fetched_at: new Date(newIso).toISOString() })
      });
      setPreviewData(prev => ({
        ...prev,
        fetched_at: new Date(newIso).toISOString(),
        fetched_at_source: 'manual_override'
      }));
      toast({ title: 'Updated', description: 'Scrape time updated.', status: 'success' });
    } catch (err) {
      toast({ title: 'Update Error', description: err.message, status: 'error' });
    } finally {
      setIsUpdatingFetchedAt(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      new: { color: 'green', label: 'New' },
      duplicate_in_db: { color: 'yellow', label: 'Duplicate (DB)' },
      duplicate_in_file: { color: 'orange', label: 'Duplicate (File)' },
      invalid: { color: 'red', label: 'Invalid' },
    };
    const config = configs[status] || { color: 'gray', label: status };
    return <Badge colorScheme={config.color}>{config.label}</Badge>;
  };

  // --- RENDERING HELPERS ---

  if (stage === 'previewing') {
    return (
      <Center h="60vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.500" fontWeight="medium">Analyzing Excel file...</Text>
        </VStack>
      </Center>
    );
  }

  if (stage === 'saving') {
    return (
      <Center h="60vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="green.500" thickness="4px" />
          <Text color="gray.500" fontWeight="medium">Committing jobs to database...</Text>
        </VStack>
      </Center>
    );
  }

  if (stage === 'preview_ready') {
    const { summary, rows } = previewData;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const fetchedAtIST = new Date(new Date(previewData.fetched_at).getTime() + istOffset);
    const formattedFetchedAt = fetchedAtIST.toISOString().slice(0, 16);

    return (
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <VStack align="stretch" spacing={1}>
            <Heading size="lg">Preview Upload</Heading>
            <HStack>
              <Text color="gray.500">{previewData.filename}</Text>
              <Badge colorScheme={previewData.fetched_at_source === 'filename' ? 'green' : 'orange'}>
                {previewData.fetched_at_source === 'filename' ? 'from filename' : 'from upload time'}
              </Badge>
              <Popover placement="bottom-start">
                <PopoverTrigger>
                  <IconButton icon={<Edit2 size={12} />} size="xs" variant="ghost" isLoading={isUpdatingFetchedAt} />
                </PopoverTrigger>
                <PopoverContent borderRadius="xl" shadow="xl">
                  <PopoverArrow />
                  <PopoverCloseButton />
                  <PopoverHeader fontWeight="bold" fontSize="sm">Override Scrape Time</PopoverHeader>
                  <PopoverBody>
                    <Input size="sm" type="datetime-local" defaultValue={formattedFetchedAt} onChange={(e) => handleUpdateFetchedAt(e.target.value)} />
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </HStack>
          </VStack>
          <HStack spacing={4}>
            <Button variant="ghost" leftIcon={<X size={18} />} onClick={handleCancel}>Cancel</Button>
            <Button colorScheme="blue" size="lg" leftIcon={<CheckCircle size={18} />} disabled={summary.new === 0} onClick={handleSave}>
              Save & Continue
            </Button>
          </HStack>
        </HStack>

        <Card variant="outline" borderRadius="xl">
          <CardBody>
            <StatGroup>
              <Stat><StatLabel>Total</StatLabel><StatNumber>{previewData.total_rows}</StatNumber></Stat>
              <Stat><StatLabel color="green.600">New</StatLabel><StatNumber color="green.600">{summary.new}</StatNumber></Stat>
              <Stat><StatLabel color="yellow.600">Duplicates</StatLabel><StatNumber color="yellow.600">{summary.duplicate_in_db}</StatNumber></Stat>
            </StatGroup>
          </CardBody>
        </Card>

        <Tabs colorScheme="blue" variant="enclosed">
          <TabList>
            <Tab>All Rows</Tab>
            <Tab>New Only</Tab>
          </TabList>
          <TabPanels bg="white" border="1px solid" borderColor="gray.200" borderRadius="0 0 xl xl">
            {[null, 'new'].map((filter, i) => (
              <TabPanel key={i} p={0} maxH="400px" overflowY="auto">
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50"><Tr><Th>Status</Th><Th>Title & Company</Th><Th>Location</Th></Tr></Thead>
                  <Tbody>
                    {rows.filter(r => !filter || r.status === filter).map(row => (
                      <Tr key={row.row_index}>
                        <Td>{getStatusBadge(row.status)}</Td>
                        <Td><Text fontWeight="bold">{row.title}</Text><Text fontSize="xs" color="gray.500">{row.company}</Text></Td>
                        <Td fontSize="xs">{row.location}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </VStack>
    );
  }

  if (stage === 'company_rating' || stage === 'job_categorization') {
    const isCompanyStage = stage === 'company_rating';
    const progress = batchStatus ? (batchStatus.succeeded_calls + batchStatus.failed_calls) / batchStatus.total_calls * 100 : 0;

    return (
      <VStack spacing={8} align="stretch" maxW="4xl" mx="auto">
        <Box>
          <HStack mb={2}>
            <Badge colorScheme={isCompanyStage ? 'blue' : 'gray'}>Step 1: Company Rating</Badge>
            <Icon as={ChevronRight} size={14} color="gray.300" />
            <Badge colorScheme={!isCompanyStage ? 'blue' : 'gray'}>Step 2: Job Categorization</Badge>
          </HStack>
          <Heading size="lg">{isCompanyStage ? 'Rate New Companies' : 'Categorize Jobs'}</Heading>
          <Text color="gray.500">
            {isCompanyStage 
              ? 'Analyze company quality using AI before processing their jobs.' 
              : 'Map jobs from highly-rated companies (4★+) to their relevant schools.'}
          </Text>
        </Box>

        <SimpleGrid columns={3} spacing={6}>
          <Card variant="outline">
            <CardBody>
              <Stat>
                <StatLabel>{isCompanyStage ? 'Total Companies' : 'Eligible Jobs (4★+)'}</StatLabel>
                <StatNumber>{isCompanyStage ? counts.totalCompanies : counts.totalJobs}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card variant="outline" borderColor="green.100" bg="green.50">
            <CardBody>
              <Stat>
                <StatLabel color="green.700">{isCompanyStage ? 'Rated' : 'Categorized'}</StatLabel>
                <StatNumber color="green.700">{isCompanyStage ? counts.ratedCompanies : counts.categorizedJobs}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card variant="outline" borderColor="orange.100" bg="orange.50">
            <CardBody>
              <Stat>
                <StatLabel color="orange.700">Remaining</StatLabel>
                <StatNumber color="orange.700">{isCompanyStage ? counts.unratedCompanies : counts.pendingJobs}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Card shadow="sm" borderRadius="xl">
          <CardBody>
            <VStack align="stretch" spacing={6}>
              <Box>
                <Text fontWeight="bold" mb={2}>Select AI Prompt</Text>
                <Select value={selectedPrompt} onChange={(e) => setSelectedPrompt(e.target.value)} disabled={isProcessing}>
                  {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Box>

              {!isProcessing ? (
                <HStack justify="space-between">
                  <Button variant="ghost" onClick={handleCancel}>Cancel Upload</Button>
                  <HStack>
                    {(isCompanyStage && counts.unratedCompanies === 0) || (!isCompanyStage && counts.pendingJobs === 0) ? (
                      <Button colorScheme="blue" rightIcon={<ArrowRight size={16} />} onClick={() => isCompanyStage ? setStage('job_categorization') : setStage('done')}>
                        Continue to {isCompanyStage ? 'Categorization' : 'Final Summary'}
                      </Button>
                    ) : (
                      <Button colorScheme="blue" size="lg" leftIcon={<Terminal size={18} />} onClick={isCompanyStage ? handleStartRating : handleStartCategorizing}>
                        Start AI {isCompanyStage ? 'Rating' : 'Categorization'}
                      </Button>
                    )}
                  </HStack>
                </HStack>
              ) : (
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="bold" fontSize="sm">AI Processing...</Text>
                      <Text fontSize="sm">{batchStatus?.succeeded_calls || 0} / {batchStatus?.total_calls || 0} batches</Text>
                    </HStack>
                    <Progress value={progress} size="md" borderRadius="full" colorScheme="blue" isIndeterminate={!batchStatus} />
                  </Box>

                  <Box>
                    <Text fontWeight="bold" fontSize="sm" mb={2}>Live Output</Text>
                    <Box bg="gray.900" color="green.400" p={4} borderRadius="lg" fontFamily="mono" fontSize="xs" maxH="200px" overflowY="auto">
                      {batchLogs.length === 0 ? (
                        <Text color="gray.500 italic">Waiting for AI response...</Text>
                      ) : batchLogs.map(log => (
                        <Box key={log.id} mb={3} borderBottom="1px solid" borderColor="whiteAlpha.200" pb={2}>
                          <HStack justify="space-between" mb={1}>
                            <HStack>
                              <Badge colorScheme={log.status === 'success' ? 'green' : 'red'} variant="solid" fontSize="10px">
                                {log.status.toUpperCase()}
                              </Badge>
                              <Text fontWeight="bold" fontSize="xs" color="white">{log.item_name}</Text>
                            </HStack>
                            <HStack spacing={4}>
                              {log.tokens_used && (
                                <Text fontSize="10px" color="gray.400">Tokens: {log.tokens_used}</Text>
                              )}
                              <Text color="gray.500" fontSize="10px">{new Date(log.created_at).toLocaleTimeString()}</Text>
                            </HStack>
                          </HStack>
                          
                          {log.prompt_snapshot && (
                            <Box mb={2}>
                              <Text fontSize="10px" color="blue.300" fontWeight="bold">Input Prompt:</Text>
                              <Code bg="transparent" color="gray.400" fontSize="10px" display="block" whiteSpace="pre-wrap" fontStyle="italic">
                                {log.prompt_snapshot}
                              </Code>
                            </Box>
                          )}

                          <Box>
                            <Text fontSize="10px" color="green.300" fontWeight="bold">AI Output:</Text>
                            <Code bg="transparent" color="gray.300" fontSize="10px" display="block" whiteSpace="pre-wrap">
                              {typeof log.output === 'string' ? log.output : JSON.stringify(log.output, null, 2)}
                            </Code>
                          </Box>

                          {log.error && (
                            <Text color="red.300" fontSize="10px" mt={1}>Error: {log.error}</Text>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </VStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    );
  }

  if (stage === 'done') {
    return (
      <VStack spacing={8} align="stretch" maxW="4xl" mx="auto" py={8}>
        <Card shadow="xl" borderRadius="2xl" border="1px solid" borderColor="green.100" bg="white">
          <CardBody p={8}>
            <VStack spacing={8} align="stretch">
              <HStack spacing={6} align="start">
                <Box bg="green.50" p={4} borderRadius="2xl"><Icon as={CheckCircle} boxSize={10} color="green.500" /></Box>
                <VStack align="stretch" spacing={1}>
                  <Heading size="lg">Upload Complete!</Heading>
                  <Text color="gray.500">Processed <b>{previewData.filename}</b> successfully.</Text>
                </VStack>
              </HStack>

              <StatGroup bg="gray.50" p={6} borderRadius="xl" border="1px" borderColor="gray.100">
                <Stat><StatLabel>New Jobs</StatLabel><StatNumber color="green.600">+{saveResult.inserted}</StatNumber></Stat>
                <Stat><StatLabel>Categorized</StatLabel><StatNumber>{counts.categorizedJobs}</StatNumber></Stat>
                <Stat><StatLabel>Total Rows</StatLabel><StatNumber>{previewData.total_rows}</StatNumber></Stat>
              </StatGroup>

              <Divider />

              <VStack align="stretch" spacing={4}>
                <Heading size="md">Next Steps</Heading>
                <Button colorScheme="blue" size="lg" onClick={() => window.location.href='/admin/approval-queue'}>
                  Go to Approval Queue
                </Button>
                <Button variant="ghost" onClick={handleCancel}>Upload Another File</Button>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    );
  }

  return (
    <VStack spacing={8} align="stretch">
      <VStack align="stretch" spacing={1}>
        <Heading size="lg">Job Uploads</Heading>
        <Text color="gray.500">Upload LinkedIn job export Excel files to start the pipeline.</Text>
      </VStack>

      <Center 
        p={12} border="2px dashed" borderColor="gray.200" borderRadius="2xl" bg="gray.50" cursor="pointer"
        _hover={{ borderColor: 'blue.400', bg: 'blue.50' }} as="label"
      >
        <VStack spacing={4}>
          <Icon as={Upload} boxSize={10} color="blue.500" />
          <VStack spacing={1}>
            <Text fontWeight="bold" fontSize="lg">Click to upload or drag and drop</Text>
            <Text color="gray.500" fontSize="sm">Excel files (.xlsx, .xls) only</Text>
          </VStack>
          <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileChange} />
        </VStack>
      </Center>

      <VStack align="stretch" spacing={4}>
        <Heading size="md">Recent Uploads</Heading>
        <Box bg="white" borderRadius="xl" border="1px" borderColor="gray.200" overflow="hidden">
          <Table variant="simple" size="sm">
            <Thead bg="gray.50"><Tr><Th>Date</Th><Th>File</Th><Th>Rows</Th><Th>Status</Th></Tr></Thead>
            <Tbody>
              {loadingHistory ? (
                <Tr><Td colSpan={4} textAlign="center" py={4}><Spinner size="sm" /></Td></Tr>
              ) : history.map(h => (
                <Tr key={h.id}>
                  <Td fontSize="xs">{new Date(h.created_at).toLocaleString()}</Td>
                  <Td fontWeight="medium">{h.filename}</Td>
                  <Td>{h.total_rows}</Td>
                  <Td><Badge colorScheme={h.status === 'done' ? 'green' : 'blue'}>{h.status}</Badge></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </VStack>

      {/* Prompt Preview Modal */}
      <Modal isOpen={showPromptPreview} onClose={() => setShowPromptPreview(false)} size="4xl" scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent borderRadius="2xl">
          <ModalHeader borderBottom="1px solid" borderColor="gray.100">
            AI Prompt Preview: {currentPromptPreview?.type === 'company' ? 'Rating' : 'Categorization'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack align="stretch" spacing={6}>
              <Box>
                <Text fontWeight="bold" color="blue.600" mb={2} fontSize="sm" textTransform="uppercase">System Prompt</Text>
                <Box p={4} bg="gray.50" borderRadius="xl" border="1px solid" borderColor="gray.200">
                  <Text whiteSpace="pre-wrap" fontSize="sm" fontFamily="mono">{currentPromptPreview?.system}</Text>
                </Box>
              </Box>
              <Box>
                <Text fontWeight="bold" color="green.600" mb={2} fontSize="sm" textTransform="uppercase">User Payload (Sample Batch)</Text>
                <Box p={4} bg="gray.900" color="green.300" borderRadius="xl" border="1px solid" borderColor="gray.700">
                  <Code bg="transparent" color="inherit" fontSize="xs" display="block" whiteSpace="pre-wrap">
                    {currentPromptPreview?.user}
                  </Code>
                </Box>
              </Box>
              <Box>
                <Text fontSize="xs" color="gray.500">
                  * This is a preview of the first batch call. The actual run will process {currentPromptPreview?.targetIds?.length} items in multiple batches.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor="gray.100">
            <Button variant="ghost" mr={3} onClick={() => setShowPromptPreview(false)}>Cancel</Button>
            <Button 
              colorScheme="blue" 
              size="lg" 
              leftIcon={<Terminal size={18} />} 
              onClick={currentPromptPreview?.type === 'company' ? confirmStartRating : confirmStartCategorizing}
            >
              Confirm & Start AI
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
