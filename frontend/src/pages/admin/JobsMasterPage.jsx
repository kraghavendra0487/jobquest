import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Input,
  Select,
  HStack,
  VStack,
  IconButton,
  Button,
  Flex,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Icon,
  useToast,
  Divider,
  Tag,
  Link,
  Tooltip,
  SimpleGrid,
  Card,
  CardBody,
  Spinner,
  Stack,
  ButtonGroup,
} from '@chakra-ui/react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  MapPin,
  Clock,
  Briefcase,
  Users,
  Repeat,
  Zap,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatRelative, formatIST } from '../../lib/relativeTime';

function MetaRow({ label, children }) {
  return (
    <Box>
      <Text fontSize="xs" textTransform="uppercase" color="gray.500" letterSpacing="wide" mb={0.5}>
        {label}
      </Text>
      {children}
    </Box>
  );
}

function MetadataPanel({ job }) {
  return (
    <Box bg="gray.50" borderRadius="lg" p={5}>
      <Heading size="xs" textTransform="uppercase" color="gray.500" letterSpacing="wider" mb={4}>
        Job Metadata
      </Heading>

      <Stack spacing={4}>
        {job.posted_at && (
          <MetaRow label="Posted">
            <Text fontWeight="semibold">{formatRelative(job.posted_at)}</Text>
            <Text fontSize="xs" color="gray.500">{formatIST(job.posted_at)} IST</Text>
          </MetaRow>
        )}

        {(job.applicant_count != null || job.applicant_signal) && (
          <MetaRow label="Applicants">
            <Text fontWeight="semibold">
              {job.applicant_count != null ? job.applicant_count.toLocaleString('en-IN') : job.applicant_signal}
            </Text>
          </MetaRow>
        )}

        <MetaRow label="LinkedIn ID">
          <Text fontFamily="mono" fontSize="sm">{job.linkedin_job_id}</Text>
        </MetaRow>

        <MetaRow label="Work Mode">
          <Text fontWeight="semibold">{job.work_mode || '—'}</Text>
        </MetaRow>

        <MetaRow label="Employment Type">
          <Text fontWeight="semibold">{job.employment_type || '—'}</Text>
        </MetaRow>

        <MetaRow label="Apply Type">
          <Text fontWeight="semibold">
            {job.apply_type}{job.apply_destination ? ` (${job.apply_destination})` : ''}
          </Text>
        </MetaRow>
      </Stack>

      {job.fetched_at && (
        <>
          <Divider my={4} />
          <Box fontSize="xs" color="gray.500">
            <Text>Fetched {formatIST(job.fetched_at)} IST</Text>
          </Box>
        </>
      )}
    </Box>
  );
}

export default function JobsMasterPage() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    work_mode: '',
    employment_type: '',
    is_promoted: '',
    is_reposted: '',
  });
  const [selectedJob, setSelectedJob] = useState(null);
  const [descMode, setDescMode] = useState('compact'); // compact | original
  const [showFullCompany, setShowFullCompany] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const limit = 20;

  useEffect(() => {
    fetchJobs();
  }, [page, filters.status, filters.work_mode, filters.employment_type, filters.is_promoted, filters.is_reposted]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) fetchJobs();
      else setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
        ...filters
      });
      const data = await api(`/api/admin/job-uploads/master-jobs?${params}`);
      setJobs(data.data);
      setTotal(data.total);
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setDescMode('compact');
    setShowFullCompany(false);
    onOpen();
  };

  const getStatusBadge = (status, variant = 'subtle') => {
    const configs = {
      pending_rating: { color: 'yellow', label: 'Pending Rating' },
      rated: { color: 'blue', label: 'Rated' },
      categorized: { color: 'green', label: 'Categorized' },
      failed: { color: 'red', label: 'Failed' },
    };
    const config = configs[status] || { color: 'gray', label: status };
    return <Badge colorScheme={config.color} variant={variant}>{config.label}</Badge>;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Box>
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <VStack align="stretch" spacing={1}>
            <Heading size="lg">Master Jobs</Heading>
            <Text color="gray.500">Global repository of all LinkedIn jobs.</Text>
          </VStack>
          <Tag size="lg" colorScheme="blue" borderRadius="full">
            {total} Total Jobs
          </Tag>
        </HStack>

        <Card variant="outline" borderRadius="xl" bg="white">
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <HStack bg="gray.50" px={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Icon as={Search} color="gray.400" />
                <Input 
                  variant="unstyled" 
                  placeholder="Search title or company..." 
                  py={2}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </HStack>
              <Select 
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="pending_rating">Pending Rating</option>
                <option value="rated">Rated</option>
                <option value="categorized">Categorized</option>
              </Select>
              <Select
                value={filters.work_mode}
                onChange={(e) => setFilters({ ...filters, work_mode: e.target.value })}
              >
                <option value="">All Modes</option>
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </Select>
              <Select
                value={filters.employment_type}
                onChange={(e) => setFilters({ ...filters, employment_type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </Select>
            </SimpleGrid>
            
            <HStack spacing={4} mt={4}>
              <Button 
                size="xs" 
                variant={filters.is_promoted === 'true' ? 'solid' : 'outline'}
                colorScheme={filters.is_promoted === 'true' ? 'orange' : 'gray'}
                leftIcon={<Zap size={12} />}
                onClick={() => setFilters(f => ({ ...f, is_promoted: f.is_promoted === 'true' ? '' : 'true' }))}
              >
                Promoted
              </Button>
              <Button 
                size="xs" 
                variant={filters.is_reposted === 'true' ? 'solid' : 'outline'}
                colorScheme={filters.is_reposted === 'true' ? 'blue' : 'gray'}
                leftIcon={<Repeat size={12} />}
                onClick={() => setFilters(f => ({ ...f, is_reposted: f.is_reposted === 'true' ? '' : 'true' }))}
              >
                Reposted
              </Button>
            </HStack>
          </CardBody>
        </Card>

        <Box bg="white" shadow="sm" borderRadius="xl" border="1px solid" borderColor="gray.200" overflow="hidden">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Job Details</Th>
                <Th>Location & Mode</Th>
                <Th>Applicants</Th>
                <Th>Status</Th>
                <Th>Posted</Th>
                <Th textAlign="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={6} py={10} textAlign="center">
                    <Spinner color="blue.500" />
                  </Td>
                </Tr>
              ) : jobs.length === 0 ? (
                <Tr>
                  <Td colSpan={6} py={10} textAlign="center" color="gray.500">
                    No jobs found matching filters.
                  </Td>
                </Tr>
              ) : (
                jobs.map((job) => (
                  <Tr key={job.id} _hover={{ bg: 'gray.50' }}>
                    <Td maxW="300px">
                      <VStack align="stretch" spacing={1}>
                        <HStack spacing={2}>
                          <Text fontWeight="bold" noOfLines={1} fontSize="sm">{job.title}</Text>
                          {job.is_promoted && <Icon as={Zap} size={10} color="orange.400" />}
                          {job.is_reposted && <Icon as={Repeat} size={10} color="blue.400" />}
                        </HStack>
                        <HStack spacing={2}>
                          <Icon as={Building2} size={12} color="gray.400" />
                          <Text fontSize="xs" color="gray.600" noOfLines={1}>{job.company}</Text>
                        </HStack>
                      </VStack>
                    </Td>
                    <Td>
                      <VStack align="stretch" spacing={1}>
                        <HStack spacing={1}>
                          <Icon as={MapPin} size={12} color="gray.400" />
                          <Text fontSize="xs" noOfLines={1}>{job.location}</Text>
                        </HStack>
                        <Badge variant="outline" w="fit-content" fontSize="10px" colorScheme="purple">
                          {job.work_mode || 'Unknown'}
                        </Badge>
                      </VStack>
                    </Td>
                    <Td>
                      <VStack align="stretch" spacing={1}>
                        <HStack spacing={1}>
                          <Icon as={Users} size={12} color="gray.400" />
                          <Text fontSize="xs">{job.applicant_count ?? '-'}</Text>
                        </HStack>
                        {job.response_signal && (
                          <Text fontSize="10px" color="gray.500" noOfLines={1}>{job.response_signal}</Text>
                        )}
                      </VStack>
                    </Td>
                    <Td>{getStatusBadge(job.status)}</Td>
                    <Td>
                      <VStack align="stretch" spacing={0}>
                        <HStack spacing={1} color="gray.700">
                          <Icon as={Clock} size={12} />
                          <Text fontSize="xs" fontWeight="medium">{formatRelative(job.posted_at)}</Text>
                        </HStack>
                        <Text fontSize="10px" color="gray.400">
                          {job.posted_relative}
                        </Text>
                      </VStack>
                    </Td>
                    <Td textAlign="right">
                      <IconButton
                        aria-label="View Details"
                        icon={<Eye size={18} />}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewJob(job)}
                      />
                      <Tooltip label="Open LinkedIn">
                        <IconButton
                          as="a"
                          href={job.job_link}
                          target="_blank"
                          aria-label="LinkedIn Link"
                          icon={<ExternalLink size={18} />}
                          variant="ghost"
                          size="sm"
                          ml={1}
                        />
                      </Tooltip>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
          
          <Flex px={6} py={4} align="center" justify="space-between" borderTop="1px solid" borderColor="gray.100">
            <Text fontSize="sm" color="gray.500">
              Showing {jobs.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} jobs
            </Text>
            <HStack spacing={2}>
              <Button 
                size="sm" 
                leftIcon={<ChevronLeft size={16} />} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Text fontSize="sm" fontWeight="bold" px={2}>{page} / {totalPages || 1}</Text>
              <Button 
                size="sm" 
                rightIcon={<ChevronRight size={16} />} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </HStack>
          </Flex>
        </Box>
      </VStack>

      {/* Job Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="2xl">
          <ModalHeader borderBottom="1px solid" borderColor="gray.100" pt={6} pb={4}>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between" align="start">
                <VStack align="stretch" spacing={2} flex="1">
                  <HStack spacing={2} flexWrap="wrap">
                    <Heading size="md">{selectedJob?.title}</Heading>
                    {selectedJob?.is_promoted && <Badge colorScheme="orange">Promoted</Badge>}
                    {selectedJob?.is_reposted && <Badge colorScheme="purple">Reposted</Badge>}
                    {selectedJob && getStatusBadge(selectedJob.status)}
                  </HStack>
                  <HStack spacing={4} color="gray.600" fontSize="sm">
                    <HStack spacing={1}>
                      <Icon as={Briefcase} boxSize={4} />
                      <Text fontWeight="medium">{selectedJob?.company}</Text>
                      {selectedJob?.company_industry && (
                        <Text color="gray.400">· {selectedJob.company_industry}</Text>
                      )}
                    </HStack>
                    <HStack spacing={1}>
                      <Icon as={MapPin} boxSize={4} />
                      <Text>{selectedJob?.location}</Text>
                    </HStack>
                  </HStack>
                </VStack>
              </HStack>
            </VStack>
          </ModalHeader>
          <ModalCloseButton mt={2} />
          <ModalBody py={6} px={6} pb={8}>
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8} templateColumns={{ base: '1fr', lg: '2fr 1fr' }}>
              <VStack align="stretch" spacing={8}>
                <Box>
                  <HStack justify="space-between" mb={4}>
                    <Heading size="xs" textTransform="uppercase" color="gray.500" letterSpacing="wider">
                      {descMode === 'compact' ? 'Compact Description' : 'Full Description'}
                    </Heading>
                    <ButtonGroup size="xs" isAttached variant="outline">
                      <Button 
                        colorScheme={descMode === 'compact' ? 'blue' : 'gray'}
                        variant={descMode === 'compact' ? 'solid' : 'outline'}
                        onClick={() => setDescMode('compact')}
                      >
                        Compact
                      </Button>
                      <Button 
                        colorScheme={descMode === 'original' ? 'blue' : 'gray'}
                        variant={descMode === 'original' ? 'solid' : 'outline'}
                        onClick={() => setDescMode('original')}
                      >
                        Original
                      </Button>
                    </ButtonGroup>
                  </HStack>
                  
                  <Box>
                    {descMode === 'compact' && selectedJob?.description_compact ? (
                      selectedJob.description_compact.split('\n').filter(Boolean).map((line, i) => {
                        const text = line.replace(/^-\s*/, '');
                        return (
                          <HStack key={i} align="start" spacing={3} mb={2.5}>
                            <Box w="6px" h="6px" borderRadius="full" bg="blue.500" mt={2} flexShrink={0} />
                            <Text fontSize="sm" color="gray.800" lineHeight="1.6">{text}</Text>
                          </HStack>
                        );
                      })
                    ) : (
                      <Text whiteSpace="pre-wrap" fontSize="sm" lineHeight="1.6" color="gray.800">
                        {selectedJob?.full_description || 'No description available.'}
                      </Text>
                    )}
                  </Box>
                </Box>

                {selectedJob?.company_compact && (
                  <Box borderTop="1px solid" borderColor="gray.100" pt={6}>
                    <Heading size="xs" textTransform="uppercase" color="gray.500" letterSpacing="wider" mb={4}>
                      About {selectedJob.company}
                    </Heading>

                    {(selectedJob.company_industry || selectedJob.company_size || selectedJob.company_followers != null) && (
                      <HStack spacing={2} mb={4} flexWrap="wrap">
                        {selectedJob.company_industry && (
                          <Badge variant="subtle" colorScheme="blue">{selectedJob.company_industry}</Badge>
                        )}
                        {selectedJob.company_size && (
                          <Badge variant="subtle" colorScheme="gray">{selectedJob.company_size}</Badge>
                        )}
                        {selectedJob.company_followers != null && (
                          <Badge variant="subtle" colorScheme="gray">
                            {selectedJob.company_followers.toLocaleString('en-IN')} followers
                          </Badge>
                        )}
                      </HStack>
                    )}

                    <Box 
                      whiteSpace="pre-wrap" 
                      fontSize="sm" 
                      color="gray.700" 
                      lineHeight="1.6"
                      sx={{ '& > div + div': { mt: 1 } }}
                    >
                      {selectedJob.company_compact.split('\n').map((line, i) => (
                        <Box key={i}>{line}</Box>
                      ))}
                    </Box>

                    {selectedJob.company_details && (
                      <Button size="xs" variant="link" mt={3} colorScheme="blue" onClick={() => setShowFullCompany(s => !s)}>
                        {showFullCompany ? 'Hide full description' : 'Read full company description'}
                      </Button>
                    )}
                    {showFullCompany && (
                      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
                        <Text fontSize="xs" color="gray.500" whiteSpace="pre-wrap" lineHeight="relaxed">
                          {selectedJob.company_details}
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}
              </VStack>

              <Box>
                {selectedJob && <MetadataPanel job={selectedJob} />}
              </Box>
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
