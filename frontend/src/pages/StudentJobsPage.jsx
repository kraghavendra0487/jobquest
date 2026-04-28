import { useEffect, useMemo, useState } from 'react';
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
  ExternalLink,
  MapPin,
  Search,
  Clock3,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatRelative, formatIST } from '../lib/relativeTime';
import StudentShell from './student/StudentShell';

export default function StudentJobsPage({ session, userData }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    let ignore = false;

    const fetchJobs = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const response = await api('/api/student/jobs');

        if (!ignore) {
          setJobs(response.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setJobs([]);
          setErrorMessage(err.message || 'Failed to load jobs');
          setLoading(false);
        }
      }
    };

    fetchJobs();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesQuery =
        !query ||
        job.title?.toLowerCase().includes(query) ||
        job.company?.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query);

      const matchesMode = !workMode || job.work_mode === workMode;
      return matchesQuery && matchesMode;
    });
  }, [jobs, search, workMode]);

  const openJob = (job) => {
    setSelectedJob(job);
    onOpen();
  };

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
                  Browse the jobs available for your school, open any title to view the details, and use the apply link directly.
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
                <Text fontSize="xs" textTransform="uppercase" color="whiteAlpha.700" mb={1}>Visible Jobs</Text>
                <Heading size="md">{filteredJobs.length}</Heading>
              </Box>
            </HStack>
          </Box>

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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
            <Select
              size="lg"
              bg="white"
              borderColor="orange.100"
              borderRadius="2xl"
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
            >
              <option value="">All work modes</option>
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </Select>
          </SimpleGrid>

          {loading ? (
            <Flex justify="center" py={16}>
              <Spinner size="xl" color="orange.500" thickness="4px" />
            </Flex>
          ) : filteredJobs.length === 0 ? (
            <Card borderRadius="3xl" border="1px solid" borderColor="orange.100">
              <CardBody py={16}>
                <VStack spacing={4}>
                  <Icon as={BriefcaseBusiness} boxSize={10} color="orange.300" />
                  <Heading size="md">No jobs found</Heading>
                  <Text color="gray.500" textAlign="center">
                    {errorMessage || 'Try changing the search or filter. If jobs were tagged for your school, they will show up here.'}
                  </Text>
                </VStack>
              </CardBody>
            </Card>
          ) : (
            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
              {filteredJobs.map((job) => (
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
                          <Badge colorScheme="orange" borderRadius="full" px={3} py={1}>
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
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
              <VStack align="stretch" spacing={4} gridColumn={{ lg: 'span 2' }}>
                <Box>
                  <Text fontSize="xs" textTransform="uppercase" color="gray.400" letterSpacing="wider" fontWeight="bold" mb={2}>
                    Job Description
                  </Text>
                  {selectedJob?.description_compact ? (
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
                  <Text whiteSpace="pre-wrap" color="gray.700">
                    {selectedJob?.company_compact || selectedJob?.company_details || 'No company details available.'}
                  </Text>
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
                  {!selectedJob?.job_link && (
                    <Text fontSize="xs" color="gray.500">
                      Apply link is not available for this listing.
                    </Text>
                  )}
                </VStack>
              </Box>
            </SimpleGrid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </StudentShell>
  );
}
