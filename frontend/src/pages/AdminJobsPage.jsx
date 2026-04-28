import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar, Badge, Box, Button, Card, CardBody, Container, Divider, Flex,
  Heading, HStack, Icon, IconButton, Input, InputGroup, InputLeftElement,
  Menu, MenuButton, MenuItem, MenuList, Modal, ModalBody, ModalCloseButton,
  ModalContent, ModalHeader, ModalOverlay, Select, SimpleGrid, Spinner,
  Stack, Text, useDisclosure, VStack,
} from '@chakra-ui/react';
import {
  Bell, BriefcaseBusiness, Building2, ChevronLeft, ChevronRight, Clock3,
  Cpu, ExternalLink, GraduationCap, LayoutDashboard, LogOut, MapPin,
  School, Search, Settings, Activity, Star, User as UserIcon,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatIST, formatRelative } from '../lib/relativeTime';
import { supabase } from '../lib/supabaseClient';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Schools', icon: School, path: '/schools' },
  { name: 'All Jobs', icon: BriefcaseBusiness, path: '/admin-jobs' },
  { name: 'Job Process', icon: Activity, path: '/job-process' },
  { name: 'Job Auto', icon: Cpu, path: '/job-auto' },
];

const TABS = [
  { label: "Today's Jobs",     date_filter: 'today',     min_score: '' },
  { label: "Yesterday's Jobs", date_filter: 'yesterday', min_score: '' },
  { label: 'Last 7 Days',      date_filter: 'week',      min_score: '' },
  { label: 'Premium Jobs',     date_filter: '',          min_score: '8' },
  { label: 'All Jobs',         date_filter: '',          min_score: '' },
];

export default function AdminJobsPage({ session, userData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [jobs, setJobs] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobViewMode, setJobViewMode] = useState('compact');
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tabIndex, setTabIndex] = useState(4); // default: All Jobs
  const [filters, setFilters] = useState({ search: '', school: '', work_mode: '' });

  const searchDebounce = useRef(null);
  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  useEffect(() => {
    api('/api/schools')
      .then((data) => setSchools(Array.isArray(data) ? data : []))
      .catch(() => setSchools([]));
  }, []);

  const fetchJobs = useCallback(async (currentPage, currentFilters, currentTab) => {
    setLoading(true);
    try {
      const tab = TABS[currentTab];
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        sort: 'ai_score',
        order: 'desc',
      });
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.school) params.set('school', currentFilters.school);
      if (currentFilters.work_mode) params.set('work_mode', currentFilters.work_mode);
      if (tab.date_filter) params.set('date_filter', tab.date_filter);
      if (tab.min_score) params.set('min_score', tab.min_score);

      const data = await api(`/api/admin/job-uploads/master-jobs?${params.toString()}`);
      setJobs(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when page or tab changes (non-search triggers)
  useEffect(() => {
    fetchJobs(page, filters, tabIndex);
  }, [page, tabIndex]); // eslint-disable-line

  // Debounce search + reset page
  const handleSearchChange = (value) => {
    setFilters((prev) => ({ ...prev, search: value }));
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchJobs(1, { ...filters, search: value }, tabIndex);
    }, 350);
  };

  // Reset page + fetch on school/work_mode filter change
  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    fetchJobs(1, next, tabIndex);
  };

  // Reset page + fetch on tab change
  const handleTabChange = (index) => {
    setTabIndex(index);
    setPage(1);
    fetchJobs(1, filters, index);
  };

  const schoolCountLabel = useMemo(() => filters.school || 'All schools', [filters.school]);

  const openJob = useCallback(async (job) => {
    setSelectedJob(job);
    setJobViewMode('compact');
    setJobDetailsLoading(true);
    onOpen();

    try {
      const params = new URLSearchParams({
        job_id: String(job.id),
        page: '1',
        limit: '1',
      });
      const data = await api(`/api/admin/job-uploads/master-jobs?${params.toString()}`);
      const latestJob = data?.data?.[0];
      if (latestJob) {
        setSelectedJob(latestJob);
      }
    } catch {
      // Keep the already selected card data if the detail refresh fails.
    } finally {
      setJobDetailsLoading(false);
    }
  }, [onOpen]);

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Navbar */}
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
              <IconButton variant="ghost" icon={<Icon as={Bell} boxSize={5} />} color="gray.500" aria-label="Notifications" />
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
              <Button
                key={item.path} as={Link} to={item.path}
                variant={location.pathname === item.path ? 'solid' : 'ghost'}
                colorScheme={location.pathname === item.path ? 'blue' : 'gray'}
                justifyContent="flex-start" leftIcon={<Icon as={item.icon} />}
                size="md" borderRadius="xl" fontSize="sm"
                fontWeight={location.pathname === item.path ? 'bold' : 'medium'}
                _hover={{ bg: location.pathname === item.path ? 'blue.600' : 'gray.100' }}
              >
                {item.name}
              </Button>
            ))}
          </VStack>
        </Box>

        <Box flex="1" ml={{ base: 0, md: '260px' }} p={8}>
          <Container maxW="7xl">
            <Stack spacing={8}>
              {/* Hero */}
              <Box bgGradient="linear(to-r, blue.600, cyan.500)" color="white" borderRadius="3xl" px={{ base: 6, md: 10 }} py={{ base: 8, md: 10 }} boxShadow="xl">
                <HStack justify="space-between" align={{ base: 'start', md: 'center' }} flexWrap="wrap" spacing={4}>
                  <VStack align="start" spacing={2}>
                    <Badge bg="whiteAlpha.300" color="white" px={3} py={1} borderRadius="full">Admin Jobs</Badge>
                    <Heading size="lg">View all jobs</Heading>
                    <Text color="whiteAlpha.900" maxW="2xl">Browse every uploaded job in one place and narrow the list by school, search text, or work mode.</Text>
                  </VStack>
                  <Box bg="whiteAlpha.200" border="1px solid" borderColor="whiteAlpha.300" borderRadius="2xl" px={5} py={4} minW="220px">
                    <Text fontSize="xs" textTransform="uppercase" color="whiteAlpha.700" mb={1}>Current Scope</Text>
                    <Heading size="md">{schoolCountLabel}</Heading>
                  </Box>
                </HStack>
              </Box>

              <Flex wrap="wrap" gap={2}>
                {TABS.map((t, i) => (
                  <Button
                    key={t.label}
                    size="sm"
                    borderRadius="xl"
                    fontWeight="semibold"
                    leftIcon={t.min_score ? <Icon as={Star} boxSize={3} /> : undefined}
                    colorScheme={tabIndex === i ? 'blue' : 'gray'}
                    variant={tabIndex === i ? 'solid' : 'outline'}
                    onClick={() => handleTabChange(i)}
                  >
                    {t.label}
                  </Button>
                ))}
              </Flex>

              {/* Filters */}
              <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
                <InputGroup size="lg" gridColumn={{ lg: 'span 2' }}>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={Search} color="blue.400" />
                  </InputLeftElement>
                  <Input
                    bg="white" borderColor="blue.100" borderRadius="2xl"
                    placeholder="Search by title or company"
                    value={filters.search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </InputGroup>
                <Select size="lg" bg="white" borderColor="blue.100" borderRadius="2xl"
                  value={filters.school}
                  onChange={(e) => handleFilterChange('school', e.target.value)}
                >
                  <option value="">All schools</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.name}>{school.name}</option>
                  ))}
                </Select>
              </SimpleGrid>

              <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} wrap="wrap">
                <HStack spacing={3}>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="full">{total} jobs</Badge>
                  <Badge colorScheme="gray" px={3} py={1} borderRadius="full">{schoolCountLabel}</Badge>
                </HStack>
                <Select maxW="220px" bg="white" borderColor="blue.100" borderRadius="xl"
                  value={filters.work_mode}
                  onChange={(e) => handleFilterChange('work_mode', e.target.value)}
                >
                  <option value="">All work modes</option>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </Select>
              </Flex>

              {/* Job list */}
              {loading ? (
                <Flex justify="center" py={16}><Spinner size="xl" color="blue.500" thickness="4px" /></Flex>
              ) : jobs.length === 0 ? (
                <Card borderRadius="3xl" border="1px solid" borderColor="blue.100">
                  <CardBody py={16}>
                    <VStack spacing={4}>
                      <Icon as={BriefcaseBusiness} boxSize={10} color="blue.300" />
                      <Heading size="md">No jobs found</Heading>
                      <Text color="gray.500" textAlign="center">Try adjusting the filters or search term.</Text>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
                  {jobs.map((job) => (
                    <Card key={job.id} borderRadius="3xl" border="1px solid" borderColor="blue.100" bg="white" shadow="sm"
                      _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }} transition="all 0.2s"
                    >
                      <CardBody>
                        <Stack spacing={4}>
                          <HStack justify="space-between" align="start" spacing={4}>
                            <VStack align="start" spacing={1} flex="1">
                              <Heading size="md" lineHeight="1.35">{job.title}</Heading>
                              <HStack spacing={2} color="gray.600" flexWrap="wrap">
                                <HStack spacing={1}><Icon as={Building2} boxSize={4} /><Text fontSize="sm">{job.company || 'Unknown company'}</Text></HStack>
                                <HStack spacing={1}><Icon as={MapPin} boxSize={4} /><Text fontSize="sm">{job.location || 'Location not listed'}</Text></HStack>
                              </HStack>
                            </VStack>
                            {job.ai_score != null && (
                              <Badge colorScheme={job.ai_score >= 9 ? 'yellow' : 'blue'} borderRadius="full" px={3} py={1}>
                                {job.ai_score}/10
                              </Badge>
                            )}
                          </HStack>
                          <HStack spacing={2} flexWrap="wrap">
                            {job.work_mode && <Badge colorScheme="purple">{job.work_mode}</Badge>}
                            {job.employment_type && <Badge colorScheme="cyan">{job.employment_type}</Badge>}
                            {(job.assigned_schools || []).slice(0, 2).map((school) => (
                              <Badge key={school} colorScheme="green">{school}</Badge>
                            ))}
                          </HStack>
                          <Text color="gray.600" noOfLines={3}>
                            {job.description_compact?.replace(/-\s*/g, '').replace(/\n/g, ' ') || job.full_description || 'No description available.'}
                          </Text>
                          <HStack justify="space-between" align="center" flexWrap="wrap" spacing={3}>
                            <HStack spacing={1} color="gray.500">
                              <Icon as={Clock3} boxSize={4} />
                              <Text fontSize="sm">{formatRelative(job.posted_at) || 'Recently added'}</Text>
                            </HStack>
                            <Button colorScheme="blue" borderRadius="xl" rightIcon={<ExternalLink size={16} />} onClick={() => openJob(job)}>
                              View Details
                            </Button>
                          </HStack>
                        </Stack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              )}

              {/* Pagination */}
              <Flex justify="space-between" align="center">
                <Text color="gray.500" fontSize="sm">Page {page} of {totalPages}</Text>
                <HStack spacing={3}>
                  <Button leftIcon={<ChevronLeft size={14} />} size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))} isDisabled={page === 1}>
                    Prev
                  </Button>
                  <Button rightIcon={<ChevronRight size={14} />} size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))} isDisabled={page >= totalPages}>
                    Next
                  </Button>
                </HStack>
              </Flex>
            </Stack>
          </Container>
        </Box>
      </Flex>

      {/* Job Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="3xl" mx={4}>
          <ModalHeader borderBottom="1px solid" borderColor="blue.100" pr={12}>
            <VStack align="start" spacing={1}>
              <Heading size="md">{selectedJob?.title}</Heading>
              <HStack spacing={3} color="gray.500" fontSize="sm" flexWrap="wrap">
                <HStack spacing={1}><Icon as={Building2} boxSize={4} /><Text>{selectedJob?.company}</Text></HStack>
                <HStack spacing={1}><Icon as={MapPin} boxSize={4} /><Text>{selectedJob?.location || 'Location not listed'}</Text></HStack>
              </HStack>
            </VStack>
          </ModalHeader>
          <ModalCloseButton mt={3} />
          <ModalBody py={6}>
            <HStack mb={5} justify="space-between" align="center" flexWrap="wrap" spacing={3}>
              <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="bold">
                {jobViewMode === 'compact' ? 'Compact View' : 'Original View'}
              </Text>
              <HStack spacing={1} bg="gray.100" p={1} borderRadius="lg">
                <Button
                  size="xs"
                  borderRadius="md"
                  colorScheme={jobViewMode === 'compact' ? 'blue' : 'gray'}
                  variant={jobViewMode === 'compact' ? 'solid' : 'ghost'}
                  onClick={() => setJobViewMode('compact')}
                >
                  Compact
                </Button>
                <Button
                  size="xs"
                  borderRadius="md"
                  colorScheme={jobViewMode === 'original' ? 'blue' : 'gray'}
                  variant={jobViewMode === 'original' ? 'solid' : 'ghost'}
                  onClick={() => setJobViewMode('original')}
                >
                  Original
                </Button>
              </HStack>
            </HStack>

            {jobDetailsLoading && (
              <HStack mb={5} spacing={3} color="blue.600">
                <Spinner size="sm" thickness="3px" />
                <Text fontSize="sm">Loading the latest processed job details...</Text>
              </HStack>
            )}

            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
              <VStack align="stretch" spacing={4} gridColumn={{ lg: 'span 2' }}>
                <Box>
                  <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="bold" mb={2}>Job Description</Text>
                  {jobViewMode === 'compact' && selectedJob?.description_compact ? (
                    <VStack align="stretch" spacing={2}>
                      {selectedJob.description_compact.split('\n').filter(Boolean).map((line, index) => (
                        <HStack key={index} align="start" spacing={3}>
                          <Box w="6px" h="6px" borderRadius="full" bg="blue.400" mt={2} flexShrink={0} />
                          <Text color="gray.700">{line.replace(/^-\s*/, '')}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Text whiteSpace="pre-wrap" color="gray.700">{selectedJob?.full_description || 'No description available.'}</Text>
                  )}
                </Box>
                <Box>
                  <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="bold" mb={2}>About the Company</Text>
                  {jobViewMode === 'compact' && selectedJob?.company_compact ? (
                    <VStack align="stretch" spacing={2}>
                      {selectedJob.company_compact.split('\n').filter(Boolean).map((line, index) => (
                        <HStack key={index} align="start" spacing={3}>
                          <Box w="6px" h="6px" borderRadius="full" bg="cyan.400" mt={2} flexShrink={0} />
                          <Text color="gray.700">{line.replace(/^-\s*/, '')}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Text whiteSpace="pre-wrap" color="gray.700">{selectedJob?.company_details || selectedJob?.company_compact || 'No company details available.'}</Text>
                  )}
                </Box>
              </VStack>
              <Box bg="blue.50" borderRadius="2xl" p={5} h="fit-content">
                <Text fontSize="xs" textTransform="uppercase" color="blue.600" letterSpacing="wider" fontWeight="bold" mb={4}>Quick Info</Text>
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Posted</Text>
                    <Text fontWeight="semibold">{formatRelative(selectedJob?.posted_at) || '-'}</Text>
                    {selectedJob?.posted_at && <Text fontSize="xs" color="gray.500">{formatIST(selectedJob.posted_at)} IST</Text>}
                  </Box>
                  <Box><Text fontSize="xs" color="gray.500" mb={1}>Work Mode</Text><Text fontWeight="semibold">{selectedJob?.work_mode || '-'}</Text></Box>
                  <Box><Text fontSize="xs" color="gray.500" mb={1}>Employment Type</Text><Text fontWeight="semibold">{selectedJob?.employment_type || '-'}</Text></Box>
                  <Box><Text fontSize="xs" color="gray.500" mb={1}>Applicants</Text><Text fontWeight="semibold">{selectedJob?.applicant_count ?? '-'}</Text></Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Schools</Text>
                    <VStack align="stretch" spacing={1}>
                      {(selectedJob?.assigned_schools || []).length > 0 ? (
                        selectedJob.assigned_schools.map((school) => (
                          <Badge key={school} colorScheme="green" width="fit-content">{school}</Badge>
                        ))
                      ) : (
                        <Text fontSize="sm" color="gray.500">No school tags</Text>
                      )}
                    </VStack>
                  </Box>
                  <Button as="a" href={selectedJob?.job_link || '#'} target="_blank" rel="noreferrer"
                    colorScheme="blue" borderRadius="xl" leftIcon={<ExternalLink size={16} />}
                    isDisabled={!selectedJob?.job_link}>
                    Open Apply Link
                  </Button>
                </VStack>
              </Box>
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
