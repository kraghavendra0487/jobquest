import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import {
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  Search,
  Star,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatIST, formatRelative } from '../lib/relativeTime';
import StudentShell from './student/StudentShell';

const TABS = [
  { label: "Today's Jobs", date_filter: 'today', min_score: '' },
  { label: "Yesterday's Jobs", date_filter: 'yesterday', min_score: '' },
  { label: 'Last 7 Days', date_filter: 'week', min_score: '' },
  { label: 'Premium Jobs', date_filter: '', min_score: '8' },
  { label: 'All Jobs', date_filter: '', min_score: '' },
];

export default function StudentJobsPage({ session, userData }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobViewMode, setJobViewMode] = useState('compact');
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tabIndex, setTabIndex] = useState(4);
  const [filters, setFilters] = useState({ search: '', work_mode: '' });
  const [schoolLabel, setSchoolLabel] = useState(userData?.school || 'Your school');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const searchDebounce = useRef(null);
  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchJobs = useCallback(async (currentPage, currentFilters, currentTab) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const tab = TABS[currentTab];
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
        sort: 'ai_score',
        order: 'desc',
      });
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.work_mode) params.set('work_mode', currentFilters.work_mode);
      if (tab.date_filter) params.set('date_filter', tab.date_filter);
      if (tab.min_score) params.set('min_score', tab.min_score);

      const response = await api(`/api/student/jobs?${params.toString()}`);
      setJobs(response.data || []);
      setTotal(response.total || 0);
      setSchoolLabel(response.school || userData?.school || 'Your school');
    } catch (err) {
      setJobs([]);
      setTotal(0);
      setErrorMessage(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [userData?.school]);

  useEffect(() => {
    fetchJobs(page, filters, tabIndex);
  }, [page, tabIndex]); // eslint-disable-line

  const handleSearchChange = (value) => {
    setFilters((prev) => ({ ...prev, search: value }));
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      fetchJobs(1, { ...filters, search: value }, tabIndex);
    }, 350);
  };

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    fetchJobs(1, next, tabIndex);
  };

  const handleTabChange = (index) => {
    setTabIndex(index);
    setPage(1);
    fetchJobs(1, filters, index);
  };

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
        sort: 'ai_score',
        order: 'desc',
      });
      const response = await api(`/api/student/jobs?${params.toString()}`);
      const latestJob = response?.data?.[0];
      if (latestJob) {
        setSelectedJob(latestJob);
      }
    } catch {
      // Keep the selected list-row data if the refresh fails.
    } finally {
      setJobDetailsLoading(false);
    }
  }, [onOpen]);

  const scopeLabel = useMemo(() => schoolLabel || userData?.school || 'Your school', [schoolLabel, userData?.school]);

  return (
    <StudentShell session={session} userData={userData}>
      <Container maxW="7xl">
        <Stack spacing={8}>
          <Box
            bgGradient="linear(to-r, orange.500, pink.500)"
            color="white"
            borderRadius="3xl"
            px={{ base: 6, md: 10 }}
            py={{ base: 8, md: 10 }}
            boxShadow="xl"
          >
            <HStack justify="space-between" align={{ base: 'start', md: 'center' }} flexWrap="wrap" spacing={4}>
              <VStack align="start" spacing={2}>
                <Badge bg="whiteAlpha.300" color="white" px={3} py={1} borderRadius="full">
                  Student Jobs
                </Badge>
                <Heading size="lg">Explore approved jobs</Heading>
                <Text color="whiteAlpha.900" maxW="2xl">
                  This works like the main jobs view, but only shows jobs approved for your school.
                </Text>
              </VStack>
              <Box
                bg="whiteAlpha.200"
                border="1px solid"
                borderColor="whiteAlpha.300"
                borderRadius="2xl"
                px={5}
                py={4}
                minW="220px"
              >
                <Text fontSize="xs" textTransform="uppercase" color="whiteAlpha.700" mb={1}>Current Scope</Text>
                <Heading size="md">{scopeLabel}</Heading>
              </Box>
            </HStack>
          </Box>

          <Flex wrap="wrap" gap={2}>
            {TABS.map((tab, index) => (
              <Button
                key={tab.label}
                size="sm"
                borderRadius="xl"
                fontWeight="semibold"
                leftIcon={tab.min_score ? <Icon as={Star} boxSize={3} /> : undefined}
                colorScheme={tabIndex === index ? 'orange' : 'gray'}
                variant={tabIndex === index ? 'solid' : 'outline'}
                onClick={() => handleTabChange(index)}
              >
                {tab.label}
              </Button>
            ))}
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <InputGroup size="lg" gridColumn={{ md: 'span 2' }}>
              <InputLeftElement pointerEvents="none">
                <Icon as={Search} color="orange.400" />
              </InputLeftElement>
              <Input
                bg="white"
                borderColor="orange.100"
                borderRadius="2xl"
                placeholder="Search by title, company, or location"
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </InputGroup>
            <Select
              size="lg"
              bg="white"
              borderColor="orange.100"
              borderRadius="2xl"
              value={filters.work_mode}
              onChange={(e) => handleFilterChange('work_mode', e.target.value)}
            >
              <option value="">All work modes</option>
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </Select>
          </SimpleGrid>

          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} wrap="wrap">
            <HStack spacing={3}>
              <Badge colorScheme="orange" px={3} py={1} borderRadius="full">{total} jobs</Badge>
              <Badge colorScheme="pink" px={3} py={1} borderRadius="full">{scopeLabel}</Badge>
            </HStack>
          </Flex>

          {loading ? (
            <Flex justify="center" py={16}>
              <Spinner size="xl" color="orange.500" thickness="4px" />
            </Flex>
          ) : jobs.length === 0 ? (
            <Card borderRadius="3xl" border="1px solid" borderColor="orange.100">
              <CardBody py={16}>
                <VStack spacing={4}>
                  <Icon as={BriefcaseBusiness} boxSize={10} color="orange.300" />
                  <Heading size="md">No jobs found</Heading>
                  <Text color="gray.500" textAlign="center">
                    {errorMessage || 'Try adjusting the filters or search term.'}
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          ) : (
            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
              {jobs.map((job) => (
                <Card
                  key={job.id}
                  borderRadius="3xl"
                  border="1px solid"
                  borderColor="orange.100"
                  bg="white"
                  shadow="sm"
                  _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                >
                  <CardBody>
                    <Stack spacing={4}>
                      <HStack justify="space-between" align="start" spacing={4}>
                        <VStack align="start" spacing={1} flex="1">
                          <Heading size="md" lineHeight="1.35">{job.title}</Heading>
                          <HStack spacing={2} color="gray.600" flexWrap="wrap">
                            <HStack spacing={1}>
                              <Icon as={Building2} boxSize={4} />
                              <Text fontSize="sm">{job.company || 'Unknown company'}</Text>
                            </HStack>
                            <HStack spacing={1}>
                              <Icon as={MapPin} boxSize={4} />
                              <Text fontSize="sm">{job.location || 'Location not listed'}</Text>
                            </HStack>
                          </HStack>
                        </VStack>
                        {job.ai_score != null && (
                          <Badge colorScheme={job.ai_score >= 8 ? 'orange' : 'yellow'} borderRadius="full" px={3} py={1}>
                            {job.ai_score}/10
                          </Badge>
                        )}
                      </HStack>

                      <HStack spacing={2} flexWrap="wrap">
                        {job.work_mode && <Badge colorScheme="pink">{job.work_mode}</Badge>}
                        {job.employment_type && <Badge colorScheme="purple">{job.employment_type}</Badge>}
                        {job.company_industry && <Badge colorScheme="blue">{job.company_industry}</Badge>}
                      </HStack>

                      <Text color="gray.600" noOfLines={3}>
                        {job.description_compact?.replace(/-\s*/g, '').replace(/\n/g, ' ') ||
                          job.full_description ||
                          'No description available.'}
                      </Text>

                      <HStack justify="space-between" align="center" flexWrap="wrap" spacing={3}>
                        <HStack spacing={1} color="gray.500">
                          <Icon as={Clock3} boxSize={4} />
                          <Text fontSize="sm">{formatRelative(job.posted_at) || job.posted_relative || 'Recently added'}</Text>
                        </HStack>
                        <Button
                          colorScheme="orange"
                          borderRadius="xl"
                          rightIcon={<ExternalLink size={16} />}
                          onClick={() => openJob(job)}
                        >
                          View Details
                        </Button>
                      </HStack>
                    </Stack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          )}

          <Flex justify="space-between" align="center">
            <Text color="gray.500" fontSize="sm">Page {page} of {totalPages}</Text>
            <HStack spacing={3}>
              <Button
                leftIcon={<ChevronLeft size={14} />}
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                isDisabled={page === 1}
              >
                Prev
              </Button>
              <Button
                rightIcon={<ChevronRight size={14} />}
                size="sm"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                isDisabled={page >= totalPages}
              >
                Next
              </Button>
            </HStack>
          </Flex>
        </Stack>
      </Container>

      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="3xl" mx={4}>
          <ModalHeader borderBottom="1px solid" borderColor="orange.100" pr={12}>
            <VStack align="start" spacing={1}>
              <Heading size="md">{selectedJob?.title}</Heading>
              <HStack spacing={3} color="gray.500" fontSize="sm" flexWrap="wrap">
                <HStack spacing={1}>
                  <Icon as={Building2} boxSize={4} />
                  <Text>{selectedJob?.company}</Text>
                </HStack>
                <HStack spacing={1}>
                  <Icon as={MapPin} boxSize={4} />
                  <Text>{selectedJob?.location || 'Location not listed'}</Text>
                </HStack>
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
                  colorScheme={jobViewMode === 'compact' ? 'orange' : 'gray'}
                  variant={jobViewMode === 'compact' ? 'solid' : 'ghost'}
                  onClick={() => setJobViewMode('compact')}
                >
                  Compact
                </Button>
                <Button
                  size="xs"
                  borderRadius="md"
                  colorScheme={jobViewMode === 'original' ? 'orange' : 'gray'}
                  variant={jobViewMode === 'original' ? 'solid' : 'ghost'}
                  onClick={() => setJobViewMode('original')}
                >
                  Original
                </Button>
              </HStack>
            </HStack>

            {jobDetailsLoading && (
              <HStack mb={5} spacing={3} color="orange.600">
                <Spinner size="sm" thickness="3px" />
                <Text fontSize="sm">Loading the latest job details...</Text>
              </HStack>
            )}

            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
              <VStack align="stretch" spacing={4} gridColumn={{ lg: 'span 2' }}>
                <Box>
                  <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="bold" mb={2}>
                    Job Description
                  </Text>
                  {jobViewMode === 'compact' && selectedJob?.description_compact ? (
                    <VStack align="stretch" spacing={2}>
                      {selectedJob.description_compact.split('\n').filter(Boolean).map((line, index) => (
                        <HStack key={index} align="start" spacing={3}>
                          <Box w="6px" h="6px" borderRadius="full" bg="orange.400" mt={2} flexShrink={0} />
                          <Text color="gray.700">{line.replace(/^-\s*/, '')}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Text whiteSpace="pre-wrap" color="gray.700">
                      {selectedJob?.full_description || 'No description available.'}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="bold" mb={2}>
                    About the Company
                  </Text>
                  {jobViewMode === 'compact' && selectedJob?.company_compact ? (
                    <VStack align="stretch" spacing={2}>
                      {selectedJob.company_compact.split('\n').filter(Boolean).map((line, index) => (
                        <HStack key={index} align="start" spacing={3}>
                          <Box w="6px" h="6px" borderRadius="full" bg="pink.400" mt={2} flexShrink={0} />
                          <Text color="gray.700">{line.replace(/^-\s*/, '')}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Text whiteSpace="pre-wrap" color="gray.700">
                      {selectedJob?.company_details || selectedJob?.company_compact || 'No company details available.'}
                    </Text>
                  )}
                </Box>
              </VStack>

              <Box bg="orange.50" borderRadius="2xl" p={5} h="fit-content">
                <Text fontSize="xs" textTransform="uppercase" color="orange.600" letterSpacing="wider" fontWeight="bold" mb={4}>
                  Quick Info
                </Text>
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Posted</Text>
                    <Text fontWeight="semibold">{formatRelative(selectedJob?.posted_at) || selectedJob?.posted_relative || '-'}</Text>
                    {selectedJob?.posted_at && (
                      <Text fontSize="xs" color="gray.500">{formatIST(selectedJob.posted_at)} IST</Text>
                    )}
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Work Mode</Text>
                    <Text fontWeight="semibold">{selectedJob?.work_mode || '-'}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Employment Type</Text>
                    <Text fontWeight="semibold">{selectedJob?.employment_type || '-'}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500" mb={1}>Applicants</Text>
                    <Text fontWeight="semibold">{selectedJob?.applicant_count ?? '-'}</Text>
                  </Box>
                  {selectedJob?.company_industry && (
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>Industry</Text>
                      <Text fontWeight="semibold">{selectedJob.company_industry}</Text>
                    </Box>
                  )}
                  <Button
                    as="a"
                    href={selectedJob?.job_link || '#'}
                    target="_blank"
                    rel="noreferrer"
                    colorScheme="orange"
                    borderRadius="xl"
                    leftIcon={<ExternalLink size={16} />}
                    isDisabled={!selectedJob?.job_link}
                  >
                    Apply for this Job
                  </Button>
                </VStack>
              </Box>
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </StudentShell>
  );
}
