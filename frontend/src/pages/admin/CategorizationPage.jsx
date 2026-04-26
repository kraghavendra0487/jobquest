import { 
  Box, 
  Heading, 
  Text, 
  VStack, 
  HStack, 
  Input, 
  Select, 
  Button, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Checkbox, 
  Badge, 
  IconButton, 
  useDisclosure, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  ModalCloseButton, 
  useToast, 
  Spinner, 
  Flex, 
  Tooltip, 
  Divider, 
  Menu, 
  MenuButton, 
  MenuList, 
  MenuItem 
} from '@chakra-ui/react'; 
import { useState, useEffect, useMemo } from 'react'; 
import {  
  Search,  
  RotateCcw,  
  Settings2,  
  ArrowRight,  
  CheckCircle2,  
  XCircle, 
  ChevronDown, 
  Building2 
} from 'lucide-react'; 
import { supabase } from '../../lib/supabaseClient'; 
import { useNavigate, useSearchParams } from 'react-router-dom'; 
 
export default function CategorizationPage() { 
  const [jobs, setJobs] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [searchParams] = useSearchParams(); 
  const uploadId = searchParams.get('upload_id'); 
 
  // Filters 
  const [search, setSearch] = useState(''); 
  const [statusFilter, setStatusFilter] = useState('pending_categorization'); 
  const [modeFilter, setModeFilter] = useState('all'); 
  const [selectedIds, setSelectedIds] = useState([]); 
  const toast = useToast(); 
  const navigate = useNavigate(); 
 
  const { isOpen, onOpen, onClose } = useDisclosure(); 
 
  // Batch State 
  const [batchSize, setBatchSize] = useState(5); 
  const [isDryRun, setIsDryRun] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [preflightStatus, setPreflightStatus] = useState(null); 
  const [isPreflighting, setIsPreflighting] = useState(false); 
  const [dryRunData, setDryRunData] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [schools, setSchools] = useState([]);
  const [schoolFilter, setSchoolFilter] = useState('all');

  useEffect(() => { 
    fetchJobs(); 
    fetchPrompts();
    fetchSchools();
  }, [uploadId]); 

  const fetchPrompts = async () => {
    const { data } = await supabase
      .from('prompts')
      .select('id, name')
      .eq('purpose', 'categorize_job')
      .order('is_default', { ascending: false });
    setPrompts(data || []);
    if (data?.length) setSelectedPromptId(data[0].id);
  };

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name').order('name');
    setSchools(data || []);
  }; 
 
  const fetchJobs = async () => { 
    setLoading(true); 
    try { 
      let query = supabase 
        .from('jobs') 
        .select(` 
          id, title, status, work_mode, employment_type,  
          companies(name, display_name, rating), 
          visibility_count:job_school_visibility(count) 
        `); 
 
      if (uploadId) query = query.eq('upload_id', uploadId); 
 
      const { data, error } = await query.order('created_at', { ascending: false }); 
      if (error) throw error; 
      setJobs(data || []); 
    } catch (err) { 
      toast({ title: 'Fetch failed', description: err.message, status: 'error' }); 
    } finally { 
      setLoading(false); 
    } 
  }; 
 
  const filteredJobs = useMemo(() => { 
    return jobs.filter(j => { 
      const companyName = j.companies?.display_name || j.companies?.name || '';
      const matchesSearch = j.title?.toLowerCase().includes(search.toLowerCase()) ||  
                           companyName.toLowerCase().includes(search.toLowerCase()); 
      const matchesStatus = statusFilter === 'all' ? true :  
                           statusFilter === 'pending_categorization' ? j.status === 'rated' : 
                           j.status === statusFilter; 
      const matchesMode = modeFilter === 'all' ? true : j.work_mode === modeFilter; 
      const matchesSchool = schoolFilter === 'all' ? true :  
                           j.job_school_visibility?.some(v => v.school_id === schoolFilter);
      return matchesSearch && matchesStatus && matchesMode && matchesSchool; 
    }); 
  }, [jobs, search, statusFilter, modeFilter, schoolFilter]); 
 
  const handlePreflight = async () => { 
    setIsPreflighting(true); 
    try { 
      const res = await fetch('/api/admin/ai/preflight', { 
        headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } 
      }); 
      const data = await res.json(); 
      setPreflightStatus(data.ok ? 'ok' : 'error'); 
    } catch { 
      setPreflightStatus('error'); 
    } finally { 
      setIsPreflighting(false); 
    } 
  }; 
 
  const handleDryRun = async () => {
    setIsEstimating(true);
    try {
      const res = await fetch('/api/admin/jobs/categorize-batch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` 
        },
        body: JSON.stringify({
          job_ids: selectedIds,
          prompt_id: selectedPromptId,
          dry_run: true
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDryRunData(data);
    } catch (err) {
      toast({ title: 'Estimation failed', description: err.message, status: 'error' });
    } finally {
      setIsEstimating(false);
    }
  };

  const startBatch = async () => { 
    try { 
      const res = await fetch('/api/admin/jobs/categorize-batch', { 
        method: 'POST', 
        headers: {  
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`  
        }, 
        body: JSON.stringify({ 
          job_ids: selectedIds, 
          batch_size: batchSize,
          prompt_id: selectedPromptId,
          dry_run: isDryRun
        }) 
      }); 
      const data = await res.json(); 
      if (data.dry_run) {
        toast({ title: 'Dry run successful', description: 'Check console for details', status: 'success' });
        onClose();
        return;
      }
      if (data.batch_id) { 
        navigate(`/admin/ai-batches/${data.batch_id}`); 
      } else { 
        throw new Error(data.error || 'Failed to start batch'); 
      } 
    } catch (err) { 
      toast({ title: 'Batch failed', description: err.message, status: 'error' }); 
    } 
  }; 
 
  return ( 
    <Box> 
      <HStack justify="space-between" mb={6}> 
        <VStack align="stretch" spacing={0}> 
          <Heading size="lg">Job Categorization</Heading> 
          <Text color="gray.500" fontSize="sm">Map jobs to university schools using AI</Text> 
        </VStack> 
      </HStack> 
 
      {/* Filters */} 
      <Box p={4} bg="white" borderRadius="lg" border="1px" borderColor="gray.200" mb={6}> 
        <HStack spacing={4}> 
          <HStack flex={1} bg="gray.50" px={3} borderRadius="md" border="1px" borderColor="gray.200"> 
            <Search size={16} color="gray" /> 
            <Input  
              variant="unstyled"  
              placeholder="Search jobs or companies..."  
              py={2} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            /> 
          </HStack> 
          <Select w="200px" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}> 
            <option value="all">Status: All</option> 
            <option value="pending_categorization">Pending (Rated ≥4)</option> 
            <option value="categorized">Categorized</option> 
            <option value="failed">Failed</option> 
          </Select> 
          <Select w="200px" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
            <option value="all">School: All</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select w="150px" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}> 
            <option value="all">Mode: Any</option> 
            <option value="on-site">On-site</option> 
            <option value="remote">Remote</option> 
            <option value="hybrid">Hybrid</option> 
          </Select> 
          <IconButton  
            icon={<RotateCcw size={18} />}  
            variant="ghost"  
            onClick={() => { setSearch(''); setStatusFilter('pending_categorization'); setModeFilter('all'); }} 
            aria-label="Reset filters" 
          /> 
        </HStack> 
      </Box> 
 
      {/* Table */} 
      <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden"> 
        <Table variant="simple"> 
          <Thead bg="gray.50"> 
            <Tr> 
              <Th w="40px"> 
                <Checkbox  
                  isChecked={selectedIds.length === filteredJobs.length && filteredJobs.length > 0} 
                  onChange={() => setSelectedIds(selectedIds.length === filteredJobs.length ? [] : filteredJobs.map(j => j.id))} 
                /> 
              </Th> 
              <Th>Job Title</Th> 
              <Th>Company</Th> 
              <Th>Status</Th> 
              <Th>Visibility Tags</Th> 
              <Th textAlign="right">Actions</Th> 
            </Tr> 
          </Thead> 
          <Tbody> 
            {loading ? ( 
              <Tr><Td colSpan={6} textAlign="center" py={10}><Spinner color="blue.500" /></Td></Tr> 
            ) : filteredJobs.length === 0 ? ( 
              <Tr><Td colSpan={6} textAlign="center" py={10} color="gray.500">No jobs matching criteria</Td></Tr> 
            ) : filteredJobs.map(j => ( 
              <Tr key={j.id}> 
                <Td> 
                  <Checkbox  
                    isChecked={selectedIds.includes(j.id)}  
                    onChange={() => setSelectedIds(prev => prev.includes(j.id) ? prev.filter(i => i !== j.id) : [...prev, j.id])} 
                  /> 
                </Td> 
                <Td> 
                  <Text fontWeight="bold" fontSize="sm">{j.title}</Text> 
                  <HStack spacing={2} mt={1}> 
                    <Badge variant="outline" fontSize="9px">{j.work_mode}</Badge> 
                    <Badge variant="outline" fontSize="9px">{j.employment_type}</Badge> 
                  </HStack> 
                </Td> 
                <Td> 
                  <HStack> 
                    <Building2 size={14} color="gray" /> 
                    <Text fontSize="sm">{j.companies?.display_name || j.companies?.name || 'Unknown Company'}</Text> 
                    <Badge colorScheme={j.companies?.rating >= 4 ? 'green' : 'gray'} size="xs"> 
                      {j.companies?.rating || 'Unrated'} ★ 
                    </Badge> 
                  </HStack> 
                </Td> 
                <Td> 
                  <Badge colorScheme={j.status === 'categorized' ? 'green' : j.status === 'failed' ? 'red' : 'gray'}> 
                    {j.status} 
                  </Badge> 
                </Td> 
                <Td> 
                  <Badge variant="subtle" colorScheme="blue"> 
                    {j.visibility_count?.[0]?.count || 0} Schools 
                  </Badge> 
                </Td> 
                <Td textAlign="right"> 
                  <Button size="xs" variant="ghost">View Details</Button> 
                </Td> 
              </Tr> 
            ))} 
          </Tbody> 
        </Table> 
      </Box> 
 
      {/* Floating Action Bar */} 
      {selectedIds.length > 0 && ( 
        <Box  
          position="fixed"  
          bottom={8}  
          left="50%"  
          transform="translateX(-50%)"  
          bg="blue.600"  
          color="white"  
          px={6}  
          py={3}  
          borderRadius="full"  
          boxShadow="xl" 
          zIndex={10} 
        > 
          <HStack spacing={6}> 
            <Text fontWeight="bold">Selected: {selectedIds.length} jobs</Text> 
            <Divider orientation="vertical" h="20px" borderColor="whiteAlpha.400" /> 
            <Button  
              size="sm"  
              colorScheme="whiteAlpha"  
              variant="solid" 
              leftIcon={<ArrowRight size={14} />} 
              onClick={onOpen} 
            > 
              Send selected to AI 
            </Button> 
            <Button size="sm" variant="ghost" colorScheme="whiteAlpha" onClick={() => setSelectedIds([])}>Clear</Button> 
          </HStack> 
        </Box> 
      )} 
 
      {/* Batch Modal */} 
      <Modal isOpen={isOpen} onClose={onClose} size="md"> 
        <ModalOverlay /> 
        <ModalContent> 
          <ModalHeader>Categorize {selectedIds.length} jobs</ModalHeader> 
          <ModalCloseButton /> 
          <ModalBody> 
            <VStack align="stretch" spacing={4}> 
              <Box>
                <Text fontWeight="bold" mb={2} fontSize="sm">Select Prompt</Text>
                <Select value={selectedPromptId} onChange={(e) => setSelectedPromptId(e.target.value)}>
                  {prompts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </Box>

              <Box> 
                <Text fontWeight="bold" mb={2} fontSize="sm">Concurrency</Text> 
                <Select value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value))}> 
                  <option value={1}>1 (Safe)</option> 
                  <option value={5}>5 (Fast)</option> 
                  <option value={10}>10 (Max)</option> 
                </Select> 
              </Box> 

              <HStack justify="space-between">
                <Text fontWeight="bold" fontSize="sm">Dry Run Only</Text>
                <Checkbox isChecked={isDryRun} onChange={(e) => setIsDryRun(e.target.checked)} />
              </HStack>

              <Box p={4} bg="gray.50" borderRadius="md" border="1px" borderColor="gray.200"> 
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="gray.500" fontWeight="bold" textTransform="uppercase">Estimate</Text> 
                  <Button size="xs" variant="ghost" colorScheme="blue" onClick={handleDryRun} isLoading={isEstimating}>
                    Recalculate
                  </Button>
                </HStack>
                <VStack align="stretch" spacing={1} fontSize="sm"> 
                  <HStack justify="space-between">
                    <Text>Calls:</Text>
                    <Text fontWeight="mono">{dryRunData?.eligible || selectedIds.length}</Text>
                  </HStack> 
                  <HStack justify="space-between">
                    <Text>Est. tokens:</Text>
                    <Text fontWeight="mono">~{dryRunData?.estimated_tokens || (selectedIds.length * 1200)}</Text>
                  </HStack> 
                  <HStack justify="space-between">
                    <Text>Est. cost:</Text>
                    <Text fontWeight="mono" color="green.600">
                      ${dryRunData?.estimated_cost_usd?.toFixed(4) || ((selectedIds.length * 1200 * 0.15) / 1000000).toFixed(4)}
                    </Text>
                  </HStack> 
                </VStack> 
              </Box> 

              <Button  
                size="sm"  
                variant="outline"  
                leftIcon={preflightStatus === 'ok' ? <CheckCircle2 size={14} /> : preflightStatus === 'error' ? <XCircle size={14} /> : null} 
                colorScheme={preflightStatus === 'ok' ? 'green' : preflightStatus === 'error' ? 'red' : 'gray'} 
                onClick={handlePreflight} 
                isLoading={isPreflighting} 
              > 
                {preflightStatus === 'ok' ? 'Preflight Passed' : preflightStatus === 'error' ? 'Preflight Failed' : 'Run connectivity preflight'} 
              </Button> 
            </VStack> 
          </ModalBody> 
          <ModalFooter> 
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button> 
            <Button  
              colorScheme={isDryRun ? "orange" : "blue"}  
              rightIcon={<ArrowRight size={16} />}  
              onClick={startBatch}
              isDisabled={preflightStatus !== 'ok'}
            >
              {isDryRun ? 'Dry Run' : 'Go'}
            </Button> 
          </ModalFooter> 
        </ModalContent> 
      </Modal> 
    </Box> 
  ); 
} 
