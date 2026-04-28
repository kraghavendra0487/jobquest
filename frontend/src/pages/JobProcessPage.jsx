import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Avatar,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  VStack,
  HStack,
  Icon,
  Button,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Tooltip,
  Tag,
  TagLabel,
  TagLeftIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  List,
  ListItem,
  ListIcon,
  Collapse,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Textarea,
  SimpleGrid,
  Center,
} from '@chakra-ui/react';
import {
  LogOut,
  User as UserIcon,
  GraduationCap,
  Settings,
  Bell,
  LayoutDashboard,
  School,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Briefcase,
  Search,
  ArrowUpDown,
  Filter,
  Eye,
  Download,
  MoreVertical,
  Upload as UploadIcon,
  Cpu,
  BarChart3,
  History,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Star,
  RefreshCw,
  Trash2,
  ExternalLink,
  MapPin,
  Users,
  BriefcaseBusiness,
} from "lucide-react";
import { supabase } from '../lib/supabaseClient';
import { api, apiUpload } from '../lib/api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { formatRelative, formatIST } from '../lib/relativeTime';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Schools', icon: School, path: '/schools' },
  { name: 'All Jobs', icon: BriefcaseBusiness, path: '/admin-jobs' },
  { name: 'Job Process', icon: Activity, path: '/job-process' },
  { name: 'Job Auto', icon: Cpu, path: '/job-auto' },
];

function JobsBatchPanel({ uploadId }) {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', work_mode: '', employment_type: '' });
  const [selectedJob, setSelectedJob] = useState(null);
  const [descMode, setDescMode] = useState('compact');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const limit = 20;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, upload_id: uploadId, ...filters });
      const data = await api(`/api/admin/job-uploads/master-jobs?${params}`);
      setJobs(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  }, [uploadId, page, filters, toast]);

  useEffect(() => { setPage(1); }, [uploadId]);

  useEffect(() => {
    if (!uploadId) { setJobs([]); setTotal(0); return; }
    fetchJobs();
  }, [uploadId, page, filters.work_mode, filters.employment_type, fetchJobs]);

  useEffect(() => {
    if (!uploadId) return;
    const t = setTimeout(() => { if (page === 1) fetchJobs(); else setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [filters.search, fetchJobs, page, uploadId]);

  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status) => {
    const map = { pending_rating: ['yellow','Pending'], rated: ['blue','Rated'], categorized: ['green','Categorized'], failed: ['red','Failed'] };
    const [color, label] = map[status] || ['gray', status];
    return <Badge colorScheme={color} variant="subtle">{label}</Badge>;
  };

  if (!uploadId) {
    return (
      <VStack h="full" justify="center" spacing={4} opacity={0.5} bg="white" borderRadius="2xl" border="1px" borderColor="gray.200">
        <Icon as={Briefcase} boxSize={10} />
        <Text fontSize="sm" color="gray.500">Select a batch from the left</Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={3} h="full">
      {/* Filters */}
      <Box bg="white" borderRadius="xl" border="1px" borderColor="gray.200" p={3} shadow="sm">
        <SimpleGrid columns={3} spacing={3}>
          <HStack bg="gray.50" px={3} borderRadius="md" border="1px solid" borderColor="gray.200">
            <Icon as={Search} color="gray.400" boxSize={4} />
            <Input variant="unstyled" placeholder="Search title or company..." py={2} fontSize="sm"
              value={filters.search} onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} />
          </HStack>
          <Select size="sm" value={filters.work_mode} onChange={(e) => setFilters(f => ({ ...f, work_mode: e.target.value }))}>
            <option value="">All Modes</option>
            <option value="On-site">On-site</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Remote">Remote</option>
          </Select>
          <Select size="sm" value={filters.employment_type} onChange={(e) => setFilters(f => ({ ...f, employment_type: e.target.value }))}>
            <option value="">All Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Internship">Internship</option>
            <option value="Contract">Contract</option>
          </Select>
        </SimpleGrid>
      </Box>

      {/* Table */}
      <Box bg="white" borderRadius="xl" border="1px" borderColor="gray.200" shadow="sm" overflow="hidden" flex="1" display="flex" flexDirection="column">
        <Box overflowY="auto" flex="1">
          <Table variant="simple">
            <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
              <Tr>
                <Th>Job Details</Th>
                <Th>Location & Mode</Th>
                <Th>Applicants</Th>
                <Th>Status</Th>
                <Th>Rating</Th>
                <Th>Schools</Th>
                <Th>Posted</Th>
                <Th textAlign="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={8} py={10} textAlign="center"><Spinner color="purple.500" /></Td></Tr>
              ) : jobs.length === 0 ? (
                <Tr><Td colSpan={8} py={10} textAlign="center" color="gray.500">No jobs found.</Td></Tr>
              ) : jobs.map((job) => (
                <Tr key={job.id} _hover={{ bg: 'gray.50' }}>
                  <Td maxW="220px">
                    <VStack align="stretch" spacing={1}>
                      <Text fontWeight="bold" noOfLines={1} fontSize="sm">{job.title}</Text>
                      <HStack spacing={1}>
                        <Icon as={Building2} boxSize={3} color="gray.400" />
                        <Text fontSize="xs" color="gray.600" noOfLines={1}>{job.company}</Text>
                      </HStack>
                    </VStack>
                  </Td>
                  <Td>
                    <VStack align="stretch" spacing={1}>
                      <HStack spacing={1}>
                        <Icon as={MapPin} boxSize={3} color="gray.400" />
                        <Text fontSize="xs" noOfLines={1}>{job.location}</Text>
                      </HStack>
                      <Badge variant="outline" w="fit-content" fontSize="10px" colorScheme="purple">{job.work_mode || 'Unknown'}</Badge>
                    </VStack>
                  </Td>
                  <Td><Text fontSize="xs">{job.applicant_count ?? '-'}</Text></Td>
                  <Td>{getStatusBadge(job.status)}</Td>
                  <Td>
                    {job.ai_score != null ? (
                      <HStack spacing={1}>
                        <Star size={12} style={{ color: '#805AD5', fill: '#805AD5' }} />
                        <Text fontSize="sm" fontWeight="bold" color="black">{job.ai_score}</Text>
                        <Text fontSize="xs" color="gray.400">/10</Text>
                      </HStack>
                    ) : (
                      <Text fontSize="xs" color="gray.300">-</Text>
                    )}
                  </Td>
                  <Td maxW="160px">
                    {job.assigned_schools?.length > 0 ? (
                      <VStack align="start" spacing={1}>
                        {job.assigned_schools.map((s, i) => (
                          <Badge key={i} colorScheme="blue" variant="subtle" fontSize="10px" noOfLines={1}>{s}</Badge>
                        ))}
                      </VStack>
                    ) : (
                      <Text fontSize="xs" color="gray.300">-</Text>
                    )}
                  </Td>
                  <Td>
                    <HStack spacing={1} color="gray.700">
                      <Icon as={Clock} boxSize={3} />
                      <Text fontSize="xs">{formatRelative(job.posted_at)}</Text>
                    </HStack>
                  </Td>
                  <Td textAlign="right">
                    <IconButton aria-label="View" icon={<Eye size={16} />} variant="ghost" size="sm"
                      onClick={() => { setSelectedJob(job); setDescMode('compact'); onOpen(); }} />
                    <Tooltip label="Open LinkedIn">
                      <IconButton as="a" href={job.job_link} target="_blank" aria-label="LinkedIn"
                        icon={<ExternalLink size={16} />} variant="ghost" size="sm" ml={1} />
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
        <Flex px={4} py={3} align="center" justify="space-between" borderTop="1px solid" borderColor="gray.100">
          <Text fontSize="sm" color="gray.500">
            {jobs.length > 0 ? (page-1)*limit+1 : 0}–{Math.min(page*limit, total)} of {total}
          </Text>
          <HStack spacing={2}>
            <Button size="sm" leftIcon={<ChevronLeft size={14} />} onClick={() => setPage(p => Math.max(1,p-1))} isDisabled={page===1}>Prev</Button>
            <Text fontSize="sm" fontWeight="bold">{page}/{totalPages||1}</Text>
            <Button size="sm" rightIcon={<ChevronRight size={14} />} onClick={() => setPage(p => Math.min(totalPages,p+1))} isDisabled={page>=totalPages}>Next</Button>
          </HStack>
        </Flex>
      </Box>

      {/* Job Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="2xl" mx={4}>
          <ModalHeader borderBottom="1px solid" borderColor="gray.100" pt={5} pb={4} pr={12}>
            <VStack align="stretch" spacing={1}>
              <HStack spacing={2} flexWrap="wrap" align="center">
                <Heading size="md" lineHeight="1.3">{selectedJob?.title}</Heading>
                {selectedJob && getStatusBadge(selectedJob.status)}
              </HStack>
              <HStack spacing={4} color="gray.500" fontSize="sm">
                <HStack spacing={1}>
                  <Icon as={Briefcase} boxSize={3.5} />
                  <Text fontWeight="medium" color="gray.700">{selectedJob?.company}</Text>
                  {selectedJob?.company_industry && <Text color="gray.400">· {selectedJob.company_industry}</Text>}
                </HStack>
                <HStack spacing={1}>
                  <Icon as={MapPin} boxSize={3.5} />
                  <Text>{selectedJob?.location}</Text>
                </HStack>
              </HStack>
            </VStack>
          </ModalHeader>
          <ModalCloseButton mt={3} />
          <ModalBody py={6} px={6} pb={8}>
            {/* Toggle — controls both job desc and company section */}
            <HStack mb={5} justify="space-between" align="center">
              <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="semibold">
                {descMode === 'compact' ? 'Compact View' : 'Original View'}
              </Text>
              <HStack spacing={1} bg="gray.100" p={1} borderRadius="lg">
                <Button size="xs" borderRadius="md"
                  colorScheme={descMode==='compact'?'blue':'gray'}
                  variant={descMode==='compact'?'solid':'ghost'}
                  onClick={() => setDescMode('compact')}>
                  Compact
                </Button>
                <Button size="xs" borderRadius="md"
                  colorScheme={descMode==='original'?'blue':'gray'}
                  variant={descMode==='original'?'solid':'ghost'}
                  onClick={() => setDescMode('original')}>
                  Original
                </Button>
              </HStack>
            </HStack>

            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6} templateColumns={{ base: '1fr', lg: '1fr 1fr 280px' }}>
              {/* Job Description */}
              <VStack align="stretch" spacing={3}>
                <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="semibold">
                  Job Description
                </Text>
                <Box>
                  {descMode === 'compact' && selectedJob?.description_compact ? (
                    selectedJob.description_compact.split('\n').filter(Boolean).map((line, i) => (
                      <HStack key={i} align="start" spacing={3} mb={2.5}>
                        <Box w="6px" h="6px" borderRadius="full" bg="purple.400" mt={1.5} flexShrink={0} />
                        <Text fontSize="sm" color="gray.800" lineHeight="1.6">{line.replace(/^-\s*/,'')}</Text>
                      </HStack>
                    ))
                  ) : (
                    <Text whiteSpace="pre-wrap" fontSize="sm" lineHeight="1.7" color="gray.800">
                      {selectedJob?.full_description || 'No description available.'}
                    </Text>
                  )}
                </Box>
              </VStack>

              {/* Company Details */}
              <VStack align="stretch" spacing={3}>
                <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="semibold">
                  About {selectedJob?.company}
                </Text>
                {(selectedJob?.company_industry || selectedJob?.company_size || selectedJob?.company_followers != null) && (
                  <HStack spacing={2} flexWrap="wrap">
                    {selectedJob?.company_industry && <Badge variant="subtle" colorScheme="blue" fontSize="xs">{selectedJob.company_industry}</Badge>}
                    {selectedJob?.company_size && <Badge variant="subtle" colorScheme="gray" fontSize="xs">{selectedJob.company_size}</Badge>}
                    {selectedJob?.company_followers != null && <Badge variant="subtle" colorScheme="gray" fontSize="xs">{selectedJob.company_followers.toLocaleString('en-IN')} followers</Badge>}
                  </HStack>
                )}
                <Box>
                  {descMode === 'compact' && selectedJob?.company_compact ? (
                    selectedJob.company_compact.split('\n').filter(Boolean).map((line, i) => (
                      <HStack key={i} align="start" spacing={3} mb={2.5}>
                        <Box w="6px" h="6px" borderRadius="full" bg="blue.400" mt={1.5} flexShrink={0} />
                        <Text fontSize="sm" color="gray.800" lineHeight="1.6">{line.replace(/^-\s*/,'')}</Text>
                      </HStack>
                    ))
                  ) : (
                    <Text whiteSpace="pre-wrap" fontSize="sm" lineHeight="1.7" color="gray.800">
                      {selectedJob?.company_details || selectedJob?.company_compact || 'No company info available.'}
                    </Text>
                  )}
                </Box>
              </VStack>

              {/* Metadata */}
              <Box bg="gray.50" borderRadius="xl" p={5} h="fit-content">
                <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="semibold" mb={4}>
                  Metadata
                </Text>
                <VStack align="stretch" spacing={3}>
                  {selectedJob?.posted_at && (
                    <Box>
                      <Text fontSize="xs" color="gray.400" mb={0.5}>POSTED</Text>
                      <Text fontWeight="semibold" fontSize="sm">{formatRelative(selectedJob.posted_at)}</Text>
                      <Text fontSize="xs" color="gray.400">{formatIST(selectedJob.posted_at)} IST</Text>
                    </Box>
                  )}
                  <Box>
                    <Text fontSize="xs" color="gray.400" mb={0.5}>WORK MODE</Text>
                    <Text fontWeight="semibold" fontSize="sm">{selectedJob?.work_mode || '—'}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.400" mb={0.5}>TYPE</Text>
                    <Text fontWeight="semibold" fontSize="sm">{selectedJob?.employment_type || '—'}</Text>
                  </Box>
                  {selectedJob?.applicant_count != null && (
                    <Box>
                      <Text fontSize="xs" color="gray.400" mb={0.5}>APPLICANTS</Text>
                      <Text fontWeight="semibold" fontSize="sm">{selectedJob.applicant_count}</Text>
                    </Box>
                  )}
                  <Box>
                    <Text fontSize="xs" color="gray.400" mb={0.5}>LINKEDIN ID</Text>
                    <Text fontFamily="mono" fontSize="xs" color="gray.600">{selectedJob?.linkedin_job_id}</Text>
                  </Box>
                  {selectedJob?.job_link && (
                    <Button as="a" href={selectedJob.job_link} target="_blank" size="sm" colorScheme="blue" variant="outline" leftIcon={<ExternalLink size={14} />} borderRadius="lg" mt={1}>
                      Open LinkedIn
                    </Button>
                  )}
                </VStack>
              </Box>
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}

function RateModal({ content, onClose, onSaved }) {
  const toast = useToast();
  const [prompt, setPrompt] = React.useState(
    `Rate the below companies on a scale of 1 to 5 based on employer quality/growth/reputation.\nUse the full range (1,2,3,4,5); do not give all companies the same score unless truly justified.\nReturn only CSV output with columns: Company,Rating\n\n${content}`
  );
  const [estimate, setEstimate] = React.useState(null);
  const [estimating, setEstimating] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [output, setOutput] = React.useState(null);
  const [saved, setSaved] = React.useState(false);

  // Parse company names from the original content (csv after the prompt text)
  const companyNames = React.useMemo(() => {
    return content.split(',').map(s => s.trim()).filter(Boolean);
  }, [content]);

  // Estimate tokens on mount and when prompt changes
  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (!prompt) return;
      setEstimating(true);
      try {
        const data = await api('/api/admin/ai/estimate', {
          method: 'POST',
          body: { system_prompt: '', user_input: prompt, expected_output_tokens: companyNames.length * 5 },
        });
        setEstimate(data);
      } catch (e) { /* silent */ } finally {
        setEstimating(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [prompt]);

  const handleSend = async () => {
    setRunning(true);
    setOutput(null);
    setSaved(false);
    try {
      const data = await api('/api/admin/ai/playground', {
        method: 'POST',
        body: { system_prompt: '', user_input: prompt, json_mode: false, wrap_input: false },
      });
      const rawOutput = data.response?.trim() || '';
      setOutput(rawOutput);

      // Parse "Company,Rating" CSV format
      // Skip header line if present
      const lines = rawOutput.split('\n').map(l => l.trim()).filter(Boolean);
      const updates = [];

      for (const line of lines) {
        // Skip header
        if (/^company[,\s]/i.test(line)) continue;
        const parts = line.split(',');
        if (parts.length >= 2) {
          const name = parts[0].trim().toLowerCase();
          const r = parseInt(parts[parts.length - 1].trim(), 10);
          if (name && [1,2,3,4,5].includes(r)) updates.push({ name, rating: r });
        }
      }

      if (updates.length === 0) {
        toast({ title: 'Could not parse ratings from output', status: 'warning' });
        return;
      }

      // Save each rating to DB
      let saved = 0;
      for (const u of updates) {
        const { error } = await supabase
          .from('companies')
          .update({ rating: u.rating, rated_by: 'ai', updated_at: new Date().toISOString() })
          .ilike('name', u.name);
        if (!error) saved++;
      }

      setSaved(true);
      toast({ title: `Saved ${saved}/${updates.length} ratings`, status: 'success' });
      onSaved?.();
    } catch (err) {
      toast({ title: 'Failed', description: err.message, status: 'error' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={8}
        fontFamily="mono"
        fontSize="sm"
        borderRadius="lg"
      />

      {/* Token / Cost estimate */}
      <HStack spacing={6} bg="gray.50" p={3} borderRadius="lg" fontSize="sm">
        <HStack spacing={1}>
          <Text color="gray.500">Input tokens:</Text>
          <Text fontWeight="bold">{estimating ? '...' : (estimate?.prompt_tokens ?? '-')}</Text>
        </HStack>
        <HStack spacing={1}>
          <Text color="gray.500">Output tokens:</Text>
          <Text fontWeight="bold">{estimating ? '...' : (estimate?.expected_completion_tokens ?? '-')}</Text>
        </HStack>
        <HStack spacing={1}>
          <Text color="gray.500">Est. cost:</Text>
          <Text fontWeight="bold" color="green.600">
            {estimating ? '...' : estimate ? `$${estimate.estimated_cost_usd.toFixed(6)}` : '-'}
          </Text>
        </HStack>
      </HStack>

      <Button colorScheme="orange" onClick={handleSend} isLoading={running} loadingText="Sending...">
        Send
      </Button>

      {output && (
        <Box>
          <Text fontSize="xs" color="gray.500" mb={1}>Output</Text>
          <Box bg="gray.50" p={3} borderRadius="lg" fontFamily="mono" fontSize="sm" whiteSpace="pre-wrap">
            {output}
          </Box>
          {saved && <Text fontSize="xs" color="green.500" mt={1}>Ratings saved to DB</Text>}
        </Box>
      )}
    </VStack>
  );
}

function parseOutputToUpdates(rawOutput, jobIdMap) {
  const lines = rawOutput.split('\n').map(l => l.trim()).filter(Boolean);
  const updates = [];
  for (const line of lines) {
    if (/^#[,\s]/i.test(line) || /^jobid[,\s]/i.test(line) || /^company[,\s]/i.test(line)) {
      console.log('[parse] skipping header:', line);
      continue;
    }
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
    console.log('[parse] line parts (' + parts.length + '):', parts);
    if (parts.length < 6) { console.warn('[parse] skipping line (< 6 parts):', line); continue; }
    const rowNum = parseInt(parts[0].trim(), 10);
    const score  = parseInt(parts[3].trim(), 10);
    const schoolsRaw = parts[4].trim();
    const salary = parseFloat(parts[5].trim());
    const jobId  = jobIdMap[rowNum];
    console.log('[parse] row=' + rowNum + ' score=' + score + ' jobId=' + jobId);
    if (!jobId) { console.warn('[parse] no jobId for row', rowNum, '� jobIdMap keys:', Object.keys(jobIdMap)); continue; }
    let assignedSchools = [];
    try { assignedSchools = JSON.parse(schoolsRaw.replace(/'/g, '"')); }
    catch { assignedSchools = schoolsRaw.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).filter(Boolean); }
    updates.push({
      jobId,
      ai_score: score >= 1 && score <= 10 ? score : null,
      assigned_schools: assignedSchools.length > 0 ? assignedSchools : null,
      estimated_salary_lpa: !isNaN(salary) && salary > 0 ? salary : null,
    });
  }
  return updates;
}

function JobRateModal({ content, jobs, onClose, onSaved }) {
  const toast = useToast();
  const [prompt, setPrompt] = React.useState('');
  const [estimate, setEstimate] = React.useState(null);
  const [estimating, setEstimating] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [output, setOutput] = React.useState(null);
  const [parsedUpdates, setParsedUpdates] = React.useState([]);
  const [saveLog, setSaveLog] = React.useState('');

  const jobIdMap = React.useMemo(() => {
    const map = {};
    jobs.forEach((j, i) => { map[i + 1] = j.id; });
    console.log('[JobRateModal] built jobIdMap, jobs.length:', jobs.length, 'map:', map);
    return map;
  }, [jobs]);

  const jobDetailsCsv = React.useMemo(() => {
    return jobs.map((j, i) => {
      const desc = (j.description_compact || j.full_description || 'No description available')
        .replace(/\n/g, ' ').replace(/"/g, "'").slice(0, 400);
      return (i + 1) + ',"' + j.company.replace(/"/g, "'") + '","' + j.title.replace(/"/g, "'") + '","' + desc + '"';
    }).join('\n');
  }, [jobs]);

  React.useEffect(() => {
    api('/api/schools').then(data => {
      const list = Array.isArray(data) ? data : (data.schools || []);
      const schoolList = list.map(s => s.name).join(', ');
      setPrompt(
        'Analyze the job using Company Name, Job Title and Job Description.\n' +
        'Give an Overall AI Job Score (1-10) based on job quality, growth potential and compensation.\n' +
        'Tasks:\n' +
        '- Assign relevant school(s) only from the provided school list\n' +
        '- Estimate salary in INR LPA (infer if not provided)\n\n' +
        'Return ONLY CSV with columns:\n' +
        '#,Company,JobTitle,OverallScore,AssignedSchool(array[string]),EstimatedSalaryLPA\n\n' +
        'Example AssignedSchool: ["School A","School B"]\n' +
        'IMPORTANT: The # column must match the row number from input exactly.\n\n' +
        'School List: [' + schoolList + ']\n\n' +
        'Job Details (#,Company,JobTitle,JobDescription):\n' +
        jobDetailsCsv
      );
    }).catch(e => console.error('[JobRateModal] schools fetch error:', e));
  }, [jobDetailsCsv]);

  React.useEffect(() => {
    if (!prompt) return;
    const t = setTimeout(async () => {
      setEstimating(true);
      try {
        const data = await api('/api/admin/ai/estimate', {
          method: 'POST',
          body: { system_prompt: '', user_input: prompt, expected_output_tokens: jobs.length * 20 },
        });
        setEstimate(data);
      } catch (e) { /* silent */ } finally { setEstimating(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [prompt]);

  const handleSend = async () => {
    setRunning(true);
    setOutput(null);
    setParsedUpdates([]);
    setSaveLog('');
    try {
      console.log('[JobRateModal] sending prompt, jobs.length:', jobs.length);
      const data = await api('/api/admin/ai/playground', {
        method: 'POST',
        body: { system_prompt: '', user_input: prompt, json_mode: false, wrap_input: false },
      });
      const rawOutput = data.response?.trim() || '';
      console.log('[JobRateModal] raw output:', rawOutput);
      setOutput(rawOutput);

      const updates = parseOutputToUpdates(rawOutput, jobIdMap);
      console.log('[JobRateModal] parsed updates:', updates);
      setParsedUpdates(updates);

      if (updates.length === 0) {
        toast({ title: 'Parsed 0 rows � check console', status: 'warning' });
      } else {
        toast({ title: 'Parsed ' + updates.length + ' rows. Click "Save to DB" to save.', status: 'info' });
      }
    } catch (err) {
      console.error('[JobRateModal] send error:', err);
      toast({ title: 'Failed', description: err.message, status: 'error' });
    } finally {
      setRunning(false);
    }
  };

  const handleSaveToDB = async () => {
    if (parsedUpdates.length === 0) {
      toast({ title: 'Nothing to save � send first', status: 'warning' });
      return;
    }
    setSaving(true);
    setSaveLog('');
    const logs = [];
    let savedCount = 0;

    for (const u of parsedUpdates) {
      const matched = jobs.find(j => j.id === u.jobId);
      if (!matched) {
        logs.push('? No job found for id: ' + u.jobId);
        console.warn('[save] no match for jobId:', u.jobId);
        continue;
      }

      const payload = { updated_at: new Date().toISOString() };
      if (u.ai_score != null) payload.ai_score = u.ai_score;
      if (u.assigned_schools) payload.assigned_schools = u.assigned_schools;
      if (u.estimated_salary_lpa != null) payload.estimated_salary_lpa = u.estimated_salary_lpa;

      console.log('[save] updating job:', matched.title, 'payload:', payload);
      let { error } = await supabase.from('jobs').update(payload).eq('id', matched.id);

      if (error) {
        console.error('[save] error:', error.message, 'code:', error.code);
        // Column missing � fall back to job_rating
        if (error.message?.includes('does not exist') || error.code === '42703') {
          console.warn('[save] columns missing, falling back to job_rating');
          logs.push('?? ' + matched.title + ': new columns missing, saving as job_rating');
          ({ error } = await supabase.from('jobs')
            .update({ job_rating: u.ai_score, updated_at: new Date().toISOString() })
            .eq('id', matched.id));
        }
      }

      if (error) {
        logs.push('? ' + matched.title + ': ' + error.message);
        console.error('[save] final error:', error.message);
      } else {
        logs.push('? ' + matched.title + ' ? score:' + u.ai_score + ' salary:' + u.estimated_salary_lpa);
        savedCount++;
      }
    }

    setSaveLog(logs.join('\n'));
    setSaving(false);
    toast({
      title: 'Saved ' + savedCount + '/' + parsedUpdates.length,
      status: savedCount > 0 ? 'success' : 'error',
    });
    if (savedCount > 0) onSaved?.();
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
        rows={10} fontFamily="mono" fontSize="xs" borderRadius="lg" bg="gray.50" />

      <HStack spacing={6} bg="gray.50" p={3} borderRadius="lg" fontSize="sm" flexWrap="wrap">
        <HStack spacing={1}><Text color="gray.500">Input tokens:</Text><Text fontWeight="bold">{estimating ? '...' : (estimate?.prompt_tokens ?? '-')}</Text></HStack>
        <HStack spacing={1}><Text color="gray.500">Output tokens:</Text><Text fontWeight="bold">{estimating ? '...' : (estimate?.expected_completion_tokens ?? '-')}</Text></HStack>
        <HStack spacing={1}><Text color="gray.500">Est. cost:</Text><Text fontWeight="bold" color="green.600">{estimating ? '...' : estimate ? '$' + estimate.estimated_cost_usd.toFixed(6) : '-'}</Text></HStack>
      </HStack>

      <Button colorScheme="purple" onClick={handleSend} isLoading={running} loadingText="Analysing..." isDisabled={!prompt}>
        Send
      </Button>

      {output && (
        <Box>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" color="gray.500">Output ({parsedUpdates.length} rows parsed)</Text>
          </HStack>
          <Box bg="gray.50" p={3} borderRadius="lg" fontFamily="mono" fontSize="xs" whiteSpace="pre-wrap" maxH="180px" overflowY="auto">
            {output}
          </Box>
        </Box>
      )}

      {saveLog && (
        <Box bg="gray.50" p={3} borderRadius="lg" fontFamily="mono" fontSize="xs" whiteSpace="pre-wrap" maxH="150px" overflowY="auto">
          {saveLog}
        </Box>
      )}

      {output && (
        <Flex justify="flex-end">
          <Button
            colorScheme="green"
            onClick={handleSaveToDB}
            isLoading={saving}
            loadingText="Saving..."
            isDisabled={parsedUpdates.length === 0}
          >
            Save to DB ({parsedUpdates.length} rows)
          </Button>
        </Flex>
      )}
    </VStack>
  );
}

export default function JobProcessPage({ session, userData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const fileInputRef = useRef(null);

  // Tab mapping for URL sync
  const tabs = ['track', 'upload', 'preprocessing', 'company-rating', 'job-rating'];
  
  // Get active tab from URL
  const currentPath = location.pathname.split('/').pop();
  const activeTabIndex = tabs.indexOf(currentPath) === -1 ? 0 : tabs.indexOf(currentPath);

  const handleTabChange = (index) => {
    navigate(`/job-process/${tabs[index]}`);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc'); // desc = newest first
  const [isUploading, setIsUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [preprocessingBatches, setPreprocessingBatches] = useState([]);
  const [extractedCompanies, setExtractedCompanies] = useState([]);
  const [jobsByUpload, setJobsByUpload] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const uploadsData = await api('/api/admin/job-uploads');
      
      const uploads = Array.isArray(uploadsData) ? uploadsData : (uploadsData.uploads || []);
      setUploadHistory(uploads);
      // For the Company Rating tab, we use the uploads which now include companies
      setExtractedCompanies(uploads);
      setPreprocessingBatches(uploads);

      // Fetch jobs for each upload to show job rating status in Track tab
      if (uploads.length > 0) {
        const uploadIds = uploads.map(u => u.id);
        const { data: jobsData, error: jobsErr } = await supabase
          .from('jobs')
          .select('upload_id, ai_score')
          .in('upload_id', uploadIds);
        if (!jobsErr && jobsData) {
          const grouped = {};
          uploadIds.forEach(id => { grouped[id] = []; });
          jobsData.forEach(j => {
            if (grouped[j.upload_id] != null) grouped[j.upload_id].push(j);
          });
          setJobsByUpload(grouped);
        }
      }

      // Keep selectedRatingBatch in sync with updated data
      if (selectedRatingBatch) {
        const updatedBatch = uploads.find(u => u.id === selectedRatingBatch.id);
        if (updatedBatch) {
          setSelectedRatingBatch(updatedBatch);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast({
        title: "Error fetching data",
        description: err.message,
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (['track', 'preprocessing', 'company-rating'].includes(tabs[activeTabIndex])) {
        fetchData();
      }
    }, 30000); // reduced from 10s to 30s
    return () => clearInterval(interval);
  }, [activeTabIndex]);

  const handleStartPreprocessing = async (uploadId) => {
    try {
      toast({ title: "Starting preprocessing...", status: "info" });
      await api(`/api/admin/job-uploads/${uploadId}/save`, { method: 'POST' });
      toast({ title: "Preprocessing started", status: "success" });
      fetchData();
    } catch (err) {
      toast({ title: "Preprocessing failed", description: err.message, status: "error" });
    }
  };

  const handlePurgeAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will DELETE ALL uploads, jobs, and companies forever!")) return;
    
    setIsLoading(true);
    try {
      await api('/api/admin/job-uploads/purge-all', { method: 'DELETE' });
      toast({
        title: "System Purged",
        description: "All data has been deleted.",
        status: "success",
      });
      fetchData();
      setSelectedRatingBatch(null);
    } catch (err) {
      toast({
        title: "Purge failed",
        description: err.message,
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const [expandedBatch, setExpandedBatch] = useState(null);
  const [selectedRatingBatch, setSelectedRatingBatch] = useState(null);
  const { isOpen: isRateOpen, onOpen: onRateOpen, onClose: onRateClose } = useDisclosure();
  const [rateModalContent, setRateModalContent] = useState('');

  // Job Rating tab state
  const [selectedJobBatch, setSelectedJobBatch] = useState(null);
  const [batchJobs, setBatchJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const { isOpen: isJobRateOpen, onOpen: onJobRateOpen, onClose: onJobRateClose } = useDisclosure();
  const [jobRateModalContent, setJobRateModalContent] = useState('');

  const fetchJobsForBatch = async (uploadId) => {
    setJobsLoading(true);
    try {
      // Try with new columns, fall back if they don't exist yet
      let { data, error } = await supabase
        .from('jobs')
        .select('id, title, company, location, job_rating, ai_score, assigned_schools, description_compact, full_description')
        .eq('upload_id', uploadId)
        .order('title', { ascending: true });

      if (error && error.message?.includes('does not exist')) {
        ({ data, error } = await supabase
          .from('jobs')
          .select('id, title, company, location, job_rating, description_compact, full_description')
          .eq('upload_id', uploadId)
          .order('title', { ascending: true }));
      }

      if (error) throw error;
      setBatchJobs(data || []);
    } catch (err) {
      toast({ title: 'Failed to load jobs', description: err.message, status: 'error' });
      setBatchJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedJobBatch) fetchJobsForBatch(selectedJobBatch.id);
    else setBatchJobs([]);
  }, [selectedJobBatch]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValid = allowedTypes.some(type => fileName.endsWith(type));

    if (!isValid) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel (.xlsx, .xls) file.",
        status: "error",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 1. Upload for preview
      const preview = await apiUpload('/api/admin/job-uploads/preview', formData);
      
      // 2. Save the upload
      await api(`/api/admin/job-uploads/${preview.upload_id}/save`, { method: 'POST' });

      toast({
        title: "Upload Successful",
        description: `${file.name} is being processed.`,
        status: "success",
      });
      
      fetchData();
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err.message,
        status: "error",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let data = [...uploadHistory];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(p => 
        p.filename?.toLowerCase().includes(q) || 
        p.id?.toString().toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'All') {
      data = data.filter(p => p.status === statusFilter.toLowerCase());
    }

    data.sort((a, b) => {
      const dateA = new Date(a.created_at || a.date);
      const dateB = new Date(b.created_at || b.date);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return data;
  }, [uploadHistory, searchQuery, statusFilter, sortOrder]);

  return (
    <>
    <Box minH="100vh" bg="gray.50">
      {/* Top Header */}
      <Box bg="white" borderBottom="1px" borderColor="gray.100" position="fixed" top={0} left={0} right={0} zIndex="sticky">
        <Container maxW="full" px={6}>
          <Flex h={16} align="center" justify="space-between">
            <HStack spacing={3}>
              <Box bg="blue.600" p={1.5} borderRadius="lg" color="white">
                <Icon as={GraduationCap} boxSize={6} />
              </Box>
              <Heading size="md" tracking="tight">RVU Portal</Heading>
            </HStack>

            <HStack spacing={4}>
              <IconButton
                variant="ghost"
                icon={<Icon as={Bell} boxSize={5} />}
                color="gray.500"
                aria-label="Notifications"
              />
              <Menu>
                <MenuButton>
                  <Avatar size="sm" src={session.user.user_metadata.avatar_url} />
                </MenuButton>
                <MenuList shadow="xl" borderRadius="xl">
                  <Box px={4} py={2}>
                    <Text fontWeight="bold" fontSize="sm">{userData?.name}</Text>
                    <Text fontSize="xs" color="gray.500">{userData?.email}</Text>
                  </Box>
                  <Divider />
                  <MenuItem icon={<Icon as={UserIcon} />}>My Profile</MenuItem>
                  <MenuItem icon={<Icon as={Settings} />}>Settings</MenuItem>
                  <Divider />
                  <MenuItem icon={<Icon as={LogOut} />} color="red.500" onClick={handleLogout}>
                    Log Out
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Flex pt={16}>
        {/* Sidebar */}
        <Box
          w="260px"
          bg="white"
          borderRight="1px"
          borderColor="gray.200"
          position="fixed"
          zIndex="docked"
          h="calc(100vh - 64px)"
          py={8}
          px={4}
          display={{ base: 'none', md: 'block' }}
        >
          <VStack align="stretch" spacing={2}>
            {sidebarItems.map((item) => (
              <Button
                key={item.path}
                as={Link}
                to={item.path}
                variant={location.pathname === item.path ? 'solid' : 'ghost'}
                colorScheme={location.pathname === item.path ? 'blue' : 'gray'}
                justifyContent="flex-start"
                leftIcon={<Icon as={item.icon} />}
                size="md"
                borderRadius="xl"
                fontSize="sm"
                fontWeight={location.pathname === item.path ? 'bold' : 'medium'}
                _hover={{
                  bg: location.pathname === item.path ? 'blue.600' : 'gray.100',
                }}
              >
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
                  <Heading size="lg">Job Processing Tracker</Heading>
                  <Text color="gray.500">Monitor and manage job extraction batches</Text>
                </Box>
                <HStack spacing={3}>
                  <Button 
                    leftIcon={<Icon as={Trash2} size={16} />} 
                    onClick={handlePurgeAll}
                    isLoading={isLoading}
                    variant="ghost"
                    colorScheme="red"
                    size="sm"
                    borderRadius="lg"
                  >
                    Purge All Data
                  </Button>
                  <Button 
                    leftIcon={<Icon as={RefreshCw} size={16} className={isLoading ? "spin-animation" : ""} />} 
                    onClick={fetchData}
                    isLoading={isLoading}
                    variant="outline"
                    size="sm"
                    borderRadius="lg"
                  >
                    Refresh Data
                  </Button>
                </HStack>
              </Flex>

              <Tabs variant="soft-rounded" colorScheme="blue" index={activeTabIndex} onChange={handleTabChange}>
                <TabList bg="white" p={2} borderRadius="2xl" border="1px" borderColor="gray.200" shadow="sm" gap={2} overflowX="auto">
                  <Tab _selected={{ color: 'white', bg: 'blue.600' }} fontSize="sm" fontWeight="bold">
                    <HStack spacing={2}>
                      <Icon as={Activity} size={16} />
                      <Text>Track</Text>
                    </HStack>
                  </Tab>
                  <Tab _selected={{ color: 'white', bg: 'blue.600' }} fontSize="sm" fontWeight="bold">
                    <HStack spacing={2}>
                      <Icon as={UploadIcon} size={16} />
                      <Text>Upload</Text>
                    </HStack>
                  </Tab>
                  <Tab _selected={{ color: 'white', bg: 'blue.600' }} fontSize="sm" fontWeight="bold">
                    <HStack spacing={2}>
                      <Icon as={Cpu} size={16} />
                      <Text>Preprocessing</Text>
                    </HStack>
                  </Tab>
                  <Tab _selected={{ color: 'white', bg: 'blue.600' }} fontSize="sm" fontWeight="bold">
                    <HStack spacing={2}>
                      <Icon as={Building2} size={16} />
                      <Text>Company Rating</Text>
                    </HStack>
                  </Tab>
                  <Tab _selected={{ color: 'white', bg: 'blue.600' }} fontSize="sm" fontWeight="bold">
                    <HStack spacing={2}>
                      <Icon as={Briefcase} size={16} />
                      <Text>Job Rating</Text>
                    </HStack>
                  </Tab>
                </TabList>

                <TabPanels mt={6}>
                  {/* Tab 1: Track — Step-by-step Pipeline Tracker */}
                  <TabPanel p={0}>
                    <VStack align="stretch" spacing={6}>
                      {/* Controls */}
                      <Flex gap={4} direction={{ base: 'column', md: 'row' }} bg="white" p={4} borderRadius="xl" border="1px" borderColor="gray.200" shadow="sm">
                        <InputGroup maxW={{ md: '300px' }}>
                          <InputLeftElement pointerEvents="none">
                            <Icon as={Search} color="gray.400" />
                          </InputLeftElement>
                          <Input
                            placeholder="Search by filename or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            borderRadius="lg"
                          />
                        </InputGroup>

                        <HStack spacing={4} flex="1" justify={{ md: 'flex-end' }}>
                          <HStack>
                            <Icon as={Filter} size={16} color="gray.400" />
                            <Select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              borderRadius="lg"
                              w="150px"
                            >
                              <option value="All">All Status</option>
                              <option value="Completed">Completed</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Failed">Failed</option>
                            </Select>
                          </HStack>

                          <HStack>
                            <Icon as={ArrowUpDown} size={16} color="gray.400" />
                            <Select
                              value={sortOrder}
                              onChange={(e) => setSortOrder(e.target.value)}
                              borderRadius="lg"
                              w="150px"
                            >
                              <option value="desc">Newest First</option>
                              <option value="asc">Oldest First</option>
                            </Select>
                          </HStack>
                        </HStack>
                      </Flex>

                      {/* Pipeline Cards */}
                      {filteredAndSortedData.length === 0 ? (
                        <Box py={20} textAlign="center" bg="white" borderRadius="2xl" border="2px dashed" borderColor="gray.200">
                          <VStack spacing={3}>
                            <Icon as={Search} boxSize={10} color="gray.300" />
                            <Text color="gray.500">No batches match your search or filters.</Text>
                          </VStack>
                        </Box>
                      ) : (
                        <VStack align="stretch" spacing={4}>
                          {filteredAndSortedData.map((p) => {
                            const companies = p.companies || [];
                            const ratedCompanies = companies.filter(c => c.rating != null);
                            const batchJobsForTrack = jobsByUpload[p.id] || [];
                            const ratedJobs = batchJobsForTrack.filter(j => j.ai_score != null);

                            const steps = [
                              {
                                label: 'Upload',
                                icon: UploadIcon,
                                tabIdx: 1,
                                done: !!p.created_at,
                                detail: p.filename,
                              },
                              {
                                label: 'Preprocess',
                                icon: Cpu,
                                tabIdx: 2,
                                done: p.status === 'saved' || p.status === 'completed',
                                detail: p.status === 'saved' || p.status === 'completed' ? `${p.total_rows || 0} rows processed` : 'Not started',
                              },
                              {
                                label: 'Company Rating',
                                icon: Building2,
                                tabIdx: 3,
                                done: companies.length > 0 && ratedCompanies.length === companies.length,
                                detail: companies.length === 0 ? 'No companies' : `${ratedCompanies.length}/${companies.length} rated`,
                              },
                              {
                                label: 'Job Rating',
                                icon: Briefcase,
                                tabIdx: 4,
                                done: batchJobsForTrack.length > 0 && ratedJobs.length === batchJobsForTrack.length,
                                detail: batchJobsForTrack.length === 0 ? 'No jobs' : `${ratedJobs.length}/${batchJobsForTrack.length} rated`,
                              },
                            ];

                            const completedSteps = steps.filter(s => s.done).length;
                            const allDone = completedSteps === 4;

                            return (
                              <Box
                                key={p.id}
                                bg="white"
                                border="1px solid"
                                borderColor={allDone ? 'green.200' : 'gray.200'}
                                borderRadius="2xl"
                                overflow="hidden"
                                transition="all 0.2s"
                                _hover={{ boxShadow: 'lg', borderColor: allDone ? 'green.300' : 'blue.200' }}
                              >
                                {/* Card Header */}
                                <Flex
                                  px={6}
                                  py={4}
                                  align="center"
                                  justify="space-between"
                                  borderBottom="1px solid"
                                  borderColor="gray.100"
                                  bg={allDone ? 'green.50' : 'gray.50'}
                                >
                                  <HStack spacing={4}>
                                    <Center
                                      w={10} h={10}
                                      bg={allDone ? 'green.100' : 'blue.100'}
                                      borderRadius="xl"
                                      color={allDone ? 'green.600' : 'blue.600'}
                                    >
                                      <Icon as={allDone ? CheckCircle2 : FileSpreadsheet} boxSize={5} />
                                    </Center>
                                    <Box>
                                      <Text fontWeight="bold" fontSize="md" color="gray.800">{p.filename}</Text>
                                      <HStack spacing={3} fontSize="xs" color="gray.500">
                                        <Text>{p.id}</Text>
                                        <Text>•</Text>
                                        <Text>{formatRelative(p.created_at || p.date)}</Text>
                                      </HStack>
                                    </Box>
                                  </HStack>
                                  <HStack spacing={3}>
                                    <Badge
                                      colorScheme={allDone ? 'green' : p.status === 'failed' ? 'red' : 'blue'}
                                      variant="subtle"
                                      px={3} py={1}
                                      borderRadius="lg"
                                      fontSize="xs"
                                      fontWeight="bold"
                                    >
                                      {allDone ? 'COMPLETE' : (p.status || 'pending').toUpperCase()}
                                    </Badge>
                                    <Text fontSize="sm" fontWeight="bold" color="gray.600">
                                      {completedSteps}/4
                                    </Text>
                                  </HStack>
                                </Flex>

                                {/* Steps Pipeline */}
                                <Box px={6} py={5}>
                                  <HStack spacing={0} align="start" w="full">
                                    {steps.map((step, idx) => {
                                      const StepIcon = step.icon;
                                      return (
                                        <React.Fragment key={step.label}>
                                          {/* Step */}
                                          <VStack
                                            flex="1"
                                            spacing={2}
                                            cursor="pointer"
                                            onClick={() => handleTabChange(step.tabIdx)}
                                            transition="all 0.2s"
                                            _hover={{ transform: 'translateY(-2px)' }}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleTabChange(step.tabIdx); }}
                                          >
                                            {/* Circle */}
                                            <Center
                                              w={10} h={10}
                                              borderRadius="full"
                                              bg={step.done ? 'green.500' : 'gray.200'}
                                              color="white"
                                              transition="all 0.3s"
                                              boxShadow={step.done ? '0 0 0 3px rgba(72,187,120,0.2)' : 'none'}
                                            >
                                              {step.done ? (
                                                <CheckCircle2 size={20} />
                                              ) : (
                                                <StepIcon size={18} color="gray.500" />
                                              )}
                                            </Center>
                                            {/* Label */}
                                            <Text
                                              fontSize="xs"
                                              fontWeight={step.done ? 'bold' : 'medium'}
                                              color={step.done ? 'green.700' : 'gray.500'}
                                              textAlign="center"
                                            >
                                              {step.label}
                                            </Text>
                                            {/* Detail */}
                                            <Text
                                              fontSize="2xs"
                                              color="gray.400"
                                              textAlign="center"
                                              noOfLines={1}
                                            >
                                              {step.detail}
                                            </Text>
                                          </VStack>
                                          {/* Connector line between steps */}
                                          {idx < steps.length - 1 && (
                                            <Box
n                                              flex="1"
                                              h="2px"
                                              bg={step.done && steps[idx + 1]?.done ? 'green.400' : 'gray.200'}
                                              mt={5}
                                              borderRadius="full"
                                              transition="all 0.3s"
                                            />
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </HStack>
                                </Box>

                                {/* Overall Progress Bar */}
                                <Box px={6} pb={5}>
                                  <Progress
                                    value={completedSteps * 25}
                                    size="xs"
                                    colorScheme={allDone ? 'green' : 'blue'}
                                    borderRadius="full"
                                    hasStripe={!allDone}
                                    isAnimated={!allDone}
                                  />
                                </Box>
                              </Box>
                            );
                          })}
                        </VStack>
                      )}
                    </VStack>
                  </TabPanel>

                  {/* Tab 2: Upload */}
                  <TabPanel p={0}>
                    <VStack spacing={8} align="stretch">
                      {/* Upload Area - TOP SIDE */}
                      <Box 
                        bg="white" 
                        p={10} 
                        borderRadius="2xl" 
                        border="2px dashed" 
                        borderColor={isUploading ? "blue.400" : "gray.300"}
                        // bg={isUploading ? "blue.50" : "white"}
                        textAlign="center"
                        transition="all 0.2s"
                        shadow="sm"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          style={{ display: 'none' }} 
                          onChange={handleFileUpload}
                          accept=".xlsx,.xls,.csv"
                        />
                        <VStack spacing={6}>
                          <Box p={4} bg="blue.50" borderRadius="full">
                            <Icon as={isUploading ? Spinner : UploadIcon} boxSize={10} color="blue.500" />
                          </Box>
                          <VStack spacing={2}>
                            <Heading size="md">
                              {isUploading ? "Processing Batch..." : "Upload New Batch"}
                            </Heading>
                            <Text color="gray.500">
                              {isUploading 
                                ? "Analyzing file structure and cleaning metadata..." 
                                : "Drag and drop your LinkedIn or Indeed export files here"}
                            </Text>
                          </VStack>
                          <Button 
                            colorScheme="blue" 
                            size="lg" 
                            borderRadius="xl" 
                            onClick={handleFileSelect}
                            isLoading={isUploading}
                            loadingText="Uploading"
                            leftIcon={!isUploading && <Icon as={UploadIcon} />}
                          >
                            Select Files
                          </Button>
                          <HStack spacing={4} color="gray.400" fontSize="xs">
                            <HStack><Icon as={FileSpreadsheet} size={14} /><Text>Excel (.xlsx, .xls)</Text></HStack>
                            <HStack><Icon as={Activity} size={14} /><Text>CSV Files</Text></HStack>
                          </HStack>
                        </VStack>
                      </Box>

                      {/* Stats Section - DOWN THE UPLOAD */}
                      <Box bg="white" p={6} borderRadius="2xl" border="1px" borderColor="gray.200" shadow="sm">
                        <StatGroup>
                          <Stat>
                            <StatLabel color="gray.500">Total Uploads</StatLabel>
                            <StatNumber fontSize="3xl" color="blue.600">{uploadHistory.length}</StatNumber>
                            <Text fontSize="xs" color="gray.400">Lifetime history</Text>
                          </Stat>
                          <Stat>
                            <StatLabel color="gray.500">Success Rate</StatLabel>
                            <StatNumber fontSize="3xl" color="green.500">98.2%</StatNumber>
                            <Text fontSize="xs" color="gray.400">Across all batches</Text>
                          </Stat>
                          <Stat>
                            <StatLabel color="gray.500">Storage Used</StatLabel>
                            <StatNumber fontSize="3xl" color="purple.500">11.5 MB</StatNumber>
                            <Text fontSize="xs" color="gray.400">Excel data only</Text>
                          </Stat>
                        </StatGroup>
                      </Box>

                      {/* Recent History - DOWN THE COUNTS */}
                      <Box bg="white" p={8} borderRadius="2xl" border="1px" borderColor="gray.200" shadow="sm">
                        <HStack mb={6} justify="space-between">
                          <HStack spacing={3}>
                            <Box p={2} bg="blue.50" borderRadius="lg">
                              <Icon as={History} color="blue.500" size={20} />
                            </Box>
                            <VStack align="start" spacing={0}>
                              <Heading size="sm">Upload History</Heading>
                              <Text fontSize="xs" color="gray.500">Recently processed files</Text>
                            </VStack>
                          </HStack>
                          <Badge colorScheme="blue" variant="subtle" px={3} py={1} borderRadius="lg">
                            {uploadHistory.length} Files
                          </Badge>
                        </HStack>
                        
                        <Box overflowX="auto">
                          <Table variant="simple">
                            <Thead>
                              <Tr>
                                <Th pl={0}>File Name</Th>
                                <Th>Upload Date</Th>
                                <Th>File Size</Th>
                                <Th>Status</Th>
                                <Th textAlign="right" pr={0}>Action</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {uploadHistory.map((item, idx) => (
                                <Tr key={item.id || idx}>
                                  <Td pl={0}>
                                    <HStack>
                                      <Icon as={FileSpreadsheet} color="gray.400" />
                                      <Text fontSize="sm" fontWeight="semibold">{item.filename}</Text>
                                    </HStack>
                                  </Td>
                                  <Td><Text fontSize="sm" color="gray.600">{formatRelative(item.created_at)}</Text></Td>
                                  <Td><Text fontSize="sm" color="gray.600">{item.total_rows} rows</Text></Td>
                                  <Td>
                                    <Badge 
                                      colorScheme={item.status === 'saved' || item.status === 'completed' ? 'green' : 'yellow'} 
                                      variant="subtle" 
                                      borderRadius="md"
                                    >
                                      <HStack spacing={1}>
                                        <Icon as={item.status === 'saved' || item.status === 'completed' ? CheckCircle2 : Clock} size={10} />
                                        <Text fontSize="xs">{item.status?.toUpperCase() || 'PENDING'}</Text>
                                      </HStack>
                                    </Badge>
                                  </Td>
                                  <Td textAlign="right" pr={0}>
                                    <Button
                                      size="xs"
                                      colorScheme="blue"
                                      leftIcon={<Icon as={Cpu} size={12} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTabChange(2); // Go to Preprocessing tab
                                      }}
                                    >
                                      Preprocess
                                    </Button>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </Box>
                        <Button variant="ghost" size="sm" w="full" mt={6} color="blue.500">View Full History</Button>
                      </Box>
                    </VStack>
                  </TabPanel>

                  {/* Tab 3: Preprocessing */}
                  <TabPanel p={0}>
                    <VStack align="stretch" spacing={6}>
                      <Box>
                        <Heading size="md" mb={2}>Preprocessing Pipeline</Heading>
                        <Text color="gray.500" fontSize="sm">Process uploaded files to clean data and extract company information.</Text>
                      </Box>

                      <Table variant="simple" bg="white" borderRadius="xl" overflow="hidden" boxShadow="sm">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th>Batch / File</Th>
                            <Th>Status</Th>
                            <Th>Progress</Th>
                            <Th>Date</Th>
                            <Th textAlign="right">Action</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {preprocessingBatches.map((batch) => (
                            <Tr key={batch.id}>
                              <Td>
                                <HStack spacing={3}>
                                  <Icon as={FileSpreadsheet} color="blue.500" />
                                  <VStack align="start" spacing={0}>
                                    <Text fontWeight="bold" fontSize="sm">{batch.filename}</Text>
                                    <Text fontSize="xs" color="gray.400">{batch.id}</Text>
                                  </VStack>
                                </HStack>
                              </Td>
                              <Td>
                                <Badge 
                                  colorScheme={batch.status === 'completed' ? 'green' : batch.status === 'processing' ? 'blue' : 'gray'}
                                  variant="subtle"
                                >
                                  {batch.status?.toUpperCase() || 'READY'}
                                </Badge>
                              </Td>
                              <Td w="200px">
                                <VStack align="stretch" spacing={1}>
                                  <Progress 
                                    value={batch.progress || (batch.status === 'completed' ? 100 : 0)} 
                                    size="xs" 
                                    colorScheme={batch.status === 'completed' ? 'green' : 'blue'} 
                                    borderRadius="full" 
                                    hasStripe={batch.status === 'processing'}
                                    isAnimated={batch.status === 'processing'}
                                  />
                                  <Text fontSize="2xs" color="gray.500" textAlign="right">
                                    {batch.progress || (batch.status === 'completed' ? 100 : 0)}%
                                  </Text>
                                </VStack>
                              </Td>
                              <Td fontSize="sm" color="gray.600">
                                {formatRelative(batch.created_at)}
                              </Td>
                              <Td textAlign="right">
                                <HStack spacing={2} justify="flex-end">
                                  <Button
                                    size="sm"
                                    colorScheme={batch.status === 'completed' ? 'green' : 'blue'}
                                    variant={batch.status === 'completed' ? 'outline' : 'solid'}
                                    leftIcon={<Icon as={batch.status === 'completed' ? CheckCircle2 : Cpu} size={14} />}
                                    isDisabled={batch.status === 'processing'}
                                    onClick={() => handleStartPreprocessing(batch.id)}
                                  >
                                    {batch.status === 'completed' ? 'Process Again' : 'Start Processing'}
                                  </Button>
                                </HStack>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </VStack>
                  </TabPanel>

                  {/* Tab 4: Company Rating */}
                  <TabPanel p={0}>
                    <Flex gap={6} align="stretch" h="calc(100vh - 280px)">
                      {/* Left Side: 30% - Company List */}
                      <Box 
                        w="30%" 
                        bg="white" 
                        borderRadius="2xl" 
                        border="1px" 
                        borderColor="gray.200" 
                        shadow="sm" 
                        overflow="hidden"
                        display="flex"
                        flexDirection="column"
                      >
                        <Box p={4} borderBottom="1px" borderColor="gray.100" bg="gray.50">
                          <Heading size="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                            Companies in Batch
                          </Heading>
                        </Box>
                        
                        <Box flex="1" overflowY="auto" p={2}>
                          {!selectedRatingBatch ? (
                            <VStack h="full" justify="center" spacing={4} opacity={0.5}>
                              <Icon as={Building2} size={40} />
                              <Text fontSize="sm" textAlign="center" px={8}>
                                Select an excel file from the right to view extracted companies
                              </Text>
                            </VStack>
                          ) : (
                            <VStack align="stretch" spacing={2}>
                              {selectedRatingBatch.companies.map((company) => (
                                <Box 
                                  key={company.id} 
                                  p={3} 
                                  borderRadius="xl" 
                                  _hover={{ bg: 'orange.50' }}
                                  transition="all 0.2s"
                                  border="1px solid transparent"
                                  _active={{ transform: 'scale(0.98)' }}
                                >
                                  <HStack spacing={3}>
                                    <Avatar 
                                      size="sm" 
                                      name={company.name} 
                                      src={`https://logo.clearbit.com/${company.domain}`}
                                      bg="orange.100" 
                                      color="orange.600" 
                                    />
                                    <VStack align="start" spacing={0} flex="1">
                                      <Text fontWeight="bold" fontSize="sm" noOfLines={1}>{company.name}</Text>
                                      <Text fontSize="xs" color="gray.400" noOfLines={1}>{company.domain}</Text>
                                    </VStack>
                                    {company.rating != null ? (
                                      <HStack spacing={1} flexShrink={0}>
                                        <Star size={12} style={{ color: '#ED8936', fill: '#ED8936' }} />
                                        <Text fontSize="xs" fontWeight="bold" color="black">{company.rating}</Text>
                                      </HStack>
                                    ) : (
                                      <Text fontSize="xs" color="gray.300" flexShrink={0}>-</Text>
                                    )}
                                  </HStack>
                                </Box>
                              ))}
                            </VStack>
                          )}
                        </Box>
                      </Box>

                      {/* Right Side: 70% - Excel Files List */}
                      <Box 
                        w="70%" 
                        bg="white" 
                        borderRadius="2xl" 
                        border="1px" 
                        borderColor="gray.200" 
                        shadow="sm" 
                        overflow="hidden"
                        display="flex"
                        flexDirection="column"
                      >
                        <Box p={6} borderBottom="1px" borderColor="gray.100" bg="gray.50">
                          <Flex justify="space-between" align="center">
                            <HStack spacing={4}>
                              <Box p={2} bg="orange.100" borderRadius="lg">
                                <Icon as={FileSpreadsheet} color="orange.600" size={24} />
                              </Box>
                              <VStack align="start" spacing={0}>
                                <Heading size="md">Excel Batches</Heading>
                                <Text fontSize="sm" color="gray.500">Select a batch to view extracted companies</Text>
                              </VStack>
                            </HStack>
                            <Badge colorScheme="blue" variant="subtle" px={3} py={1} borderRadius="lg">
                              {extractedCompanies.length} Batches Total
                            </Badge>
                          </Flex>
                        </Box>

                        <Box flex="1" overflowY="auto">
                          <Table variant="simple">
                            <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                              <Tr>
                                <Th>Excel Sheet Name</Th>
                                <Th>Status</Th>
                                <Th>Rating</Th>
                                <Th>Companies</Th>
                                <Th textAlign="right">Action</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {extractedCompanies.map((batch) => {
                                const companies = batch.companies || [];
                                const ratedCompanies = companies.filter(c => c.rating != null);
                                const avgRating = ratedCompanies.length > 0
                                  ? (ratedCompanies.reduce((sum, c) => sum + c.rating, 0) / ratedCompanies.length).toFixed(1)
                                  : null;
                                return (
                                <Tr 
                                  key={batch.id} 
                                  cursor="pointer" 
                                  _hover={{ bg: 'gray.50' }}
                                  bg={selectedRatingBatch?.id === batch.id ? 'orange.50' : 'transparent'}
                                  onClick={() => setSelectedRatingBatch(batch)}
                                  transition="all 0.2s"
                                >
                                  <Td>
                                    <HStack spacing={3}>
                                      <Icon as={FileSpreadsheet} size={20} color="green.500" />
                                      <VStack align="start" spacing={0}>
                                        <Text fontWeight="bold">{batch.filename}</Text>
                                        <Text fontSize="xs" color="gray.400">{batch.id}</Text>
                                      </VStack>
                                    </HStack>
                                  </Td>
                                  <Td>
                                    <Badge 
                                      colorScheme={batch.status === 'completed' ? 'green' : 'orange'}
                                      variant="subtle"
                                      px={2}
                                      borderRadius="full"
                                      fontSize="2xs"
                                    >
                                      {batch.status?.toUpperCase() || 'PENDING'}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    {avgRating ? (
                                      <HStack spacing={1}>
                                        <Icon as={Star} size={14} color="orange.400" fill="orange.400" />
                                        <Text fontSize="sm" fontWeight="medium" color="orange.600">
                                          {avgRating}
                                        </Text>
                                        <Text fontSize="xs" color="gray.400">
                                          ({ratedCompanies.length}/{companies.length})
                                        </Text>
                                      </HStack>
                                    ) : (
                                      <Text fontSize="sm" color="gray.400">-</Text>
                                    )}
                                  </Td>
                                  <Td>
                                    <Text fontSize="sm" fontWeight="medium">{companies.length} Extracted</Text>
                                  </Td>
                                  <Td textAlign="right" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      size="sm"
                                      colorScheme="orange"
                                      variant="solid"
                                      borderRadius="lg"
                                      isDisabled={companies.length === 0}
                                      onClick={() => {
                                        const csv = companies.map(c => c.name).join(', ');
                                        setRateModalContent(csv);
                                        onRateOpen();
                                      }}
                                    >
                                      Rate
                                    </Button>
                                  </Td>
                                </Tr>
                                );
                              })}
                            </Tbody>
                          </Table>
                        </Box>
                      </Box>
                    </Flex>
                  </TabPanel>

                  {/* Tab 5: Job Rating */}
                  <TabPanel p={0}>
                    <Flex gap={6} align="stretch" h="calc(100vh - 280px)">
                      {/* Left Side: 30% - Batch List */}
                      <Box w="30%" bg="white" borderRadius="2xl" border="1px" borderColor="gray.200" shadow="sm" overflow="hidden" display="flex" flexDirection="column">
                        <Box p={4} borderBottom="1px" borderColor="gray.100" bg="gray.50">
                          <Flex justify="space-between" align="center">
                            <Heading size="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                              Excel Batches
                            </Heading>
                            <Badge colorScheme="purple" variant="subtle" px={2} borderRadius="lg" fontSize="2xs">
                              {uploadHistory.length} Total
                            </Badge>
                          </Flex>
                        </Box>
                        <Box flex="1" overflowY="auto" p={2}>
                          <VStack align="stretch" spacing={2}>
                            {uploadHistory.map((batch) => {
                              const isSelected = selectedJobBatch?.id === batch.id;
                              return (
                                <Box
                                  key={batch.id}
                                  p={3}
                                  borderRadius="xl"
                                  cursor="pointer"
                                  bg={isSelected ? 'purple.50' : 'transparent'}
                                  border="1px solid"
                                  borderColor={isSelected ? 'purple.200' : 'transparent'}
                                  _hover={{ bg: 'purple.50' }}
                                  transition="all 0.2s"
                                  onClick={() => setSelectedJobBatch(batch)}
                                >
                                  <HStack spacing={3} align="start">
                                    <Icon as={FileSpreadsheet} size={16} color="purple.500" flexShrink={0} mt={0.5} />
                                    <VStack align="start" spacing={1} flex="1" minW={0}>
                                      <Text fontWeight="bold" fontSize="sm" wordBreak="break-all">{batch.filename}</Text>
                                      <Text fontSize="xs" color="gray.400">{batch.total_rows ?? '-'} jobs</Text>
                                    </VStack>
                                  </HStack>
                                  {isSelected && (
                                    <Box mt={2} onClick={(e) => e.stopPropagation()}>
                                      {(() => {
                                        const ratedCount = batchJobs.filter(j => j.ai_score != null).length;
                                        const isRated = batchJobs.length > 0 && ratedCount === batchJobs.length;
                                        return (
                                          <Button
                                            size="xs"
                                            colorScheme={isRated ? 'green' : 'orange'}
                                            w="full"
                                            isDisabled={batchJobs.length === 0}
                                            onClick={() => {
                                              const csv = batchJobs.map(j => `${j.title} at ${j.company}`).join(', ');
                                              setJobRateModalContent(csv);
                                              onJobRateOpen();
                                            }}
                                          >
                                            {isRated ? `Rated (${ratedCount}/${batchJobs.length})` : `Rate Jobs (${ratedCount}/${batchJobs.length} done)`}
                                          </Button>
                                        );
                                      })()}
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                          </VStack>
                        </Box>
                      </Box>

                      {/* Right Side: 70% - Jobs Table (same as /admin/jobs) */}
                      <Box w="70%" display="flex" flexDirection="column" overflow="hidden">
                        <JobsBatchPanel uploadId={selectedJobBatch?.id} onRateOpen={(csv) => { setJobRateModalContent(csv); onJobRateOpen(); }} />
                      </Box>
                    </Flex>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </VStack>
          </Container>
        </Box>
      </Flex>
    </Box>

    {/* Rate Modal */}
    <Modal isOpen={isRateOpen} onClose={onRateClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader fontSize="md" fontWeight="bold">Rate Companies</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <RateModal
            content={rateModalContent}
            onClose={onRateClose}
            onSaved={fetchData}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
    {/* Job Rate Modal */}
    <Modal isOpen={isJobRateOpen} onClose={onJobRateClose} size="xl" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl">
        <ModalHeader fontSize="md" fontWeight="bold">Rate Jobs</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <JobRateModal
            content={jobRateModalContent}
            jobs={batchJobs}
            onClose={onJobRateClose}
            onSaved={() => { fetchJobsForBatch(selectedJobBatch?.id); }}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
    </>
  );
}
