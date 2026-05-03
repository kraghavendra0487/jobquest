import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Badge,
  Box,
  Card,
  CardBody,
  Container,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  VStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Button,
  IconButton,
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Divider,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import {
  Search,
  BriefcaseBusiness,
  Building2,
  MapPin,
  Star,
  ExternalLink,
  SlidersHorizontal,
  Award,
  ShieldCheck,
  Heart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatRelative } from '../lib/relativeTime';
import AdminShell from './admin/AdminShell';

const JOBS_PER_PAGE = 24;

const TABS = [
  { id: 'all', label: 'All Jobs' },
  { id: 'today', label: "Today's Jobs" },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'Past Week' },
  { id: 'premium', label: 'Premium', icon: Award },
];

export default function AdminAllJobsPage({ session, userData }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    school: '',
    jobRating: '0',
    companyRating: '7',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/all-jobs/merged-jobs?min_company_rating=7');
      console.log("Jobs data:", data);
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to fetch jobs',
        status: 'error',
        duration: 3000,
      });
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredJobs = useMemo(() => {
    // Calculate IST today and yesterday strings
    const getIstParts = (date) => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
    };

    const now = new Date();
    const p = getIstParts(now);
    const todayStr = `${p.find(x => x.type === 'year').value}-${p.find(x => x.type === 'month').value}-${p.find(x => x.type === 'day').value}`;

    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yp = getIstParts(yesterdayDate);
    const yesterdayStr = `${yp.find(x => x.type === 'year').value}-${yp.find(x => x.type === 'month').value}-${yp.find(x => x.type === 'day').value}`;
    
    const sevenDaysAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sp = getIstParts(sevenDaysAgoDate);
    const sevenDaysAgoStr = `${sp.find(x => x.type === 'year').value}-${sp.find(x => x.type === 'month').value}-${sp.find(x => x.type === 'day').value}`;

    return jobs.filter(job => {
      if (!job) return false;

      // Search filter
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        !filters.search ||
        (job.job_title?.toLowerCase() || '').includes(searchLower) || 
        (job.company_name?.toLowerCase() || '').includes(searchLower);
      
      // Tab filter
      let matchesTab = true;
      
      // Use created_at as the primary "posted time" reference for time-based classification
      const jobTimestamp = job.created_at || job.date;
      const jobIstDate = jobTimestamp ? (() => {
        const jp = getIstParts(new Date(jobTimestamp));
        return `${jp.find(x => x.type === 'year').value}-${jp.find(x => x.type === 'month').value}-${jp.find(x => x.type === 'day').value}`;
      })() : '';
      
      const jobRating = job.rating ?? 0;
      const companyRating = job.company_rating ?? 0;
      
      if (activeTab === 'today') {
        matchesTab = jobIstDate === todayStr;
      } else if (activeTab === 'yesterday') {
        matchesTab = jobIstDate === yesterdayStr;
      } else if (activeTab === 'week') {
        matchesTab = jobIstDate >= sevenDaysAgoStr;
      } else if (activeTab === 'premium') {
        matchesTab = jobRating >= 8 && companyRating >= 8;
      }

      // Select filters
      const matchesSchool = !filters.school || (job.assigned_schools && Array.isArray(job.assigned_schools) && job.assigned_schools.includes(filters.school));
      const matchesJobRating = jobRating >= parseFloat(filters.jobRating);
      const matchesCoRating = companyRating >= parseFloat(filters.companyRating);

      return matchesSearch && matchesTab && matchesSchool && matchesJobRating && matchesCoRating;
    });
  }, [jobs, filters, activeTab]);

  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const pagedJobs = useMemo(() => {
    const start = (page - 1) * JOBS_PER_PAGE;
    return filteredJobs.slice(start, start + JOBS_PER_PAGE);
  }, [filteredJobs, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters, activeTab]);

  const allSchools = useMemo(() => {
    const schools = new Set();
    jobs.forEach(job => {
      if (job?.assigned_schools && Array.isArray(job.assigned_schools)) {
        job.assigned_schools.forEach(school => {
          if (school) schools.add(school);
        });
      }
    });
    return Array.from(schools).sort();
  }, [jobs]);

  const handleOpenJob = (job) => {
    setSelectedJob(job);
    onOpen();
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      school: '',
      jobRating: '0',
      companyRating: '7',
    });
    setActiveTab('all');
  };

  return (
    <AdminShell session={session} userData={userData}>
      <Container maxW="7xl">
        <Stack spacing={8}>
          {/* Top part like Student Jobs Page */}
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
                  Admin View
                </Badge>
                <Heading size="lg">All Jobs Directory</Heading>
                <Text color="whiteAlpha.900" maxW="2xl">
                  Directory is loaded with companies rated 7+ only (API). Use filters to narrow further.
                </Text>
              </VStack>
              <Box
                bg="whiteAlpha.200"
                border="1px solid"
                borderColor="whiteAlpha.300"
                borderRadius="2xl"
                px={5}
                py={4}
              >
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="bold" color="whiteAlpha.800">
                    Total Jobs
                  </Text>
                  <Heading size="xl">{jobs.length}</Heading>
                </VStack>
              </Box>
            </HStack>
          </Box>

          {/* Tabs Section */}
          <Stack spacing={6}>
            <HStack spacing={1} overflowX="auto" pb={2} borderBottom="1px solid" borderColor="gray.100">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  px={5}
                  py={6}
                  borderRadius="none"
                  borderBottom="2px solid"
                  borderColor={activeTab === tab.id ? 'blue.600' : 'transparent'}
                  color={activeTab === tab.id ? 'blue.600' : 'gray.500'}
                  bg={activeTab === tab.id ? 'blue.50' : 'transparent'}
                  _hover={{ color: 'blue.600', bg: 'blue.50' }}
                  onClick={() => setActiveTab(tab.id)}
                  leftIcon={tab.icon ? <Icon as={tab.icon} /> : undefined}
                  fontWeight="bold"
                  fontSize="sm"
                >
                  {tab.label}
                </Button>
              ))}
            </HStack>
          </Stack>

          {/* Combined Search and Filters Section */}
          <Stack spacing={4}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 6 }} spacing={4} alignItems="center">
              <HStack bg="orange.50" color="orange.700" px={3} py={2} borderRadius="xl" fontWeight="bold" fontSize="xs">
                <Icon as={SlidersHorizontal} />
                <Text>FILTERS</Text>
              </HStack>

              <InputGroup size="md">
                <InputLeftElement pointerEvents="none">
                  <Icon as={Search} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search jobs..."
                  bg="white"
                  borderRadius="xl"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' }}
                />
              </InputGroup>

              <Select
                size="md"
                placeholder="All Schools"
                bg="white"
                borderRadius="xl"
                value={filters.school}
                onChange={(e) => setFilters({ ...filters, school: e.target.value })}
              >
                {allSchools.map(school => (
                  <option key={school} value={school}>{school}</option>
                ))}
              </Select>

              <Select
                size="md"
                placeholder="Job Rating: Any"
                bg="white"
                borderRadius="xl"
                value={filters.jobRating}
                onChange={(e) => setFilters({ ...filters, jobRating: e.target.value })}
              >
                <option value="4">4+ Stars</option>
                <option value="6">6+ Stars</option>
                <option value="8">8+ Stars</option>
              </Select>

              <Select
                size="md"
                placeholder="Company Rating: 7+"
                bg="white"
                borderRadius="xl"
                value={filters.companyRating}
                onChange={(e) => setFilters({ ...filters, companyRating: e.target.value })}
              >
                <option value="7">7+ Stars</option>
                <option value="8">8+ Stars</option>
                <option value="9">9+ Stars</option>
              </Select>

              <Button
                variant="ghost"
                colorScheme="orange"
                fontWeight="bold"
                fontSize="xs"
                onClick={resetFilters}
              >
                RESET
              </Button>
            </SimpleGrid>
          </Stack>

          {/* Job Grid */}
          <Box minH="400px">
            {loading ? (
              <Flex justify="center" align="center" h="400px">
                <VStack spacing={4}>
                  <Spinner size="xl" color="orange.500" thickness="4px" />
                  <Text color="gray.500" fontWeight="medium">Fetching real data...</Text>
                </VStack>
              </Flex>
            ) : (
              <>
                <HStack justify="space-between" mb={6} flexWrap="wrap" spacing={4}>
                  <VStack align="start" spacing={1}>
                    <Text color="gray.500" fontWeight="medium">Available Opportunities</Text>
                    <Heading size="md">{filteredJobs.length} Matches Found</Heading>
                  </VStack>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <HStack spacing={2}>
                      <IconButton
                        icon={<ChevronLeft size={20} />}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        isDisabled={page === 1}
                        variant="outline"
                        borderRadius="xl"
                        aria-label="Previous page"
                      />
                      <Text fontWeight="bold" fontSize="sm" minW="80px" textAlign="center">
                        Page {page} of {totalPages}
                      </Text>
                      <IconButton
                        icon={<ChevronRight size={20} />}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        isDisabled={page === totalPages}
                        variant="outline"
                        borderRadius="xl"
                        aria-label="Next page"
                      />
                    </HStack>
                  )}

                  <Text fontSize="xs" color="gray.400" fontWeight="bold" textTransform="uppercase" letterSpacing="widest">
                    Last updated: Just now
                  </Text>
                </HStack>

                {pagedJobs.length === 0 ? (
                  <Flex justify="center" align="center" h="200px" bg="gray.50" borderRadius="3xl">
                    <Text color="gray.500">No jobs found matching your criteria.</Text>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={6}>
                    {pagedJobs.map((job) => (
                      <Card
                        key={job.id}
                        borderRadius="3xl"
                        border="1px solid"
                        borderColor="gray.100"
                        boxShadow="sm"
                        _hover={{ transform: 'translateY(-6px)', boxShadow: 'xl' }}
                        transition="all 0.3s"
                        cursor="pointer"
                        onClick={() => handleOpenJob(job)}
                      >
                        <CardBody p={6}>
                          <VStack align="start" spacing={5} h="full">
                            <HStack w="full" justify="space-between">
                              <Box bgGradient="linear(to-br, blue.500, purple.600)" p={3} borderRadius="2xl" color="white" shadow="md">
                                <Icon as={Building2} boxSize={6} />
                              </Box>
                              <VStack align="end" spacing={1}>
                                <Text fontSize="10px" fontWeight="black" color="gray.400" textTransform="uppercase">
                                  {formatRelative(job.created_at || job.date) || 'N/A'}
                                </Text>
                                {Number(job.rating) >= 8 && Number(job.company_rating) >= 8 && (
                                  <Badge colorScheme="orange" variant="subtle" borderRadius="full" fontSize="10px" px={2} border="1px solid" borderColor="orange.100">
                                    <HStack spacing={1}>
                                      <Icon as={Award} boxSize={3} />
                                      <Text>PREMIUM</Text>
                                    </HStack>
                                  </Badge>
                                )}
                              </VStack>
                            </HStack>

                            <VStack align="start" spacing={1} w="full">
                              <Heading size="sm" noOfLines={2} color="gray.900" lineHeight="tight">
                                {job.job_title || 'Untitled Job'}
                              </Heading>
                              <HStack spacing={1}>
                                  <Text fontSize="sm" fontWeight="bold" color="gray.600" noOfLines={1}>{job.company_name || 'N/A'}</Text>
                                  <HStack spacing={0.5} color="orange.400">
                                    <Icon as={Star} fill={job.company_rating ? "currentColor" : "none"} boxSize={3} />
                                    <Text fontSize="xs" fontWeight="bold">{job.company_rating ?? "-"}</Text>
                                  </HStack>
                                </HStack>
                              </VStack>

                              <HStack wrap="wrap" spacing={1.5}>
                                {job.assigned_schools && Array.isArray(job.assigned_schools) && job.assigned_schools.slice(0, 2).map((school) => (
                                  <Badge key={`${job.id}-${school}`} colorScheme="blue" variant="subtle" fontSize="10px" px={2} borderRadius="md" border="1px solid" borderColor="blue.100">
                                    @{school}
                                  </Badge>
                                ))}
                                {job.assigned_schools && job.assigned_schools.length > 2 && (
                                  <Text fontSize="10px" fontWeight="bold" color="gray.400">+{job.assigned_schools.length - 2}</Text>
                                )}
                              </HStack>

                              <Stack spacing={2.5} w="full" mt="auto">
                                <HStack fontSize="xs" color="gray.500" fontWeight="medium">
                                  <Icon as={MapPin} boxSize={3.5} color="gray.400" />
                                  <Text noOfLines={1}>{job.location || 'N/A'}</Text>
                                </HStack>
                                <HStack fontSize="xs" color="gray.500" fontWeight="medium">
                                  <Icon as={Award} boxSize={3.5} color="gray.400" />
                                  <Text noOfLines={1}>{job.seniority_level || 'N/A'}</Text>
                                </HStack>
                              </Stack>

                              <Divider borderColor="gray.50" />

                              <HStack w="full" justify="space-between" align="center">
                              <Badge colorScheme={job.rating ? "green" : "gray"} variant="subtle" borderRadius="lg" px={2.5} py={1} fontSize="xs">
                                <HStack spacing={1}>
                                  <ShieldCheck size={14} />
                                  <Text>Job Score: {job.rating ?? "-"}</Text>
                                </HStack>
                              </Badge>
                              <Text fontSize="10px" color="gray.400" fontWeight="bold" textTransform="uppercase">
                                {job.applicant_count || 0} APPLIED
                              </Text>
                            </HStack>
                          </VStack>
                        </CardBody>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
                
                {/* Bottom Pagination */}
                {totalPages > 1 && (
                  <Flex justify="center" mt={10} pb={10}>
                    <HStack spacing={4}>
                      <Button
                        leftIcon={<ChevronLeft size={20} />}
                        onClick={() => {
                          setPage(p => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isDisabled={page === 1}
                        variant="ghost"
                        colorScheme="blue"
                        borderRadius="xl"
                      >
                        Previous
                      </Button>
                      <HStack spacing={2}>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (page <= 3) pageNum = i + 1;
                          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = page - 2 + i;
                          
                          return (
                            <Button
                              key={pageNum}
                              size="sm"
                              variant={page === pageNum ? "solid" : "outline"}
                              colorScheme="blue"
                              onClick={() => {
                                setPage(pageNum);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              borderRadius="lg"
                              w="40px"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </HStack>
                      <Button
                        rightIcon={<ChevronRight size={20} />}
                        onClick={() => {
                          setPage(p => Math.min(totalPages, p + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isDisabled={page === totalPages}
                        variant="ghost"
                        colorScheme="blue"
                        borderRadius="xl"
                      >
                        Next
                      </Button>
                    </HStack>
                  </Flex>
                )}
              </>
            )}
          </Box>
        </Stack>
      </Container>

      {/* Detail Slide-over Panel (Drawer) */}
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        size="md"
      >
        <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
        <DrawerContent borderRadius={{ base: "none", sm: "3xl 0 0 3xl" }}>
          <DrawerCloseButton 
            top={6} 
            right={6} 
            p={5} 
            borderRadius="xl" 
            bg="gray.100" 
            _hover={{ bg: 'gray.200' }}
          />
          <DrawerBody p={8} className="custom-scrollbar">
            {selectedJob && (
              <Box mt={10}>
                <VStack align="start" spacing={8}>
                  {/* Header */}
                  <HStack spacing={6} align="center">
                    <Box 
                      bgGradient="linear(to-br, blue.500, purple.600)" 
                      p={5} 
                      borderRadius="3xl" 
                      color="white" 
                      shadow="xl"
                    >
                      <Icon as={Building2} boxSize={10} />
                    </Box>
                    <VStack align="start" spacing={2}>
                      <Heading size="lg" fontWeight="black" color="gray.900" lineHeight="tight">
                        {selectedJob.job_title || 'Untitled Job'}
                      </Heading>
                      <HStack spacing={3}>
                        <Text color="blue.600" fontWeight="extrabold" fontSize="lg">
                          {selectedJob.company_name || 'N/A'}
                        </Text>
                        <HStack bg="orange.50" px={3} py={1} borderRadius="full" color="orange.400">
                          <Icon as={Star} fill="currentColor" boxSize={4} />
                          <Text fontWeight="black" fontSize="sm">{selectedJob.company_rating ?? "-"}</Text>
                        </HStack>
                      </HStack>
                      <Text fontSize="10px" color="gray.400" fontWeight="bold" textTransform="uppercase">
                        Posted {formatRelative(selectedJob.created_at || selectedJob.date)}
                      </Text>
                    </VStack>
                  </HStack>

                  {/* Quick Info Grid */}
                  <SimpleGrid columns={2} spacing={6} w="full" bg="gray.50" p={6} borderRadius="3xl">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="10px" color="gray.400" fontWeight="black" textTransform="uppercase" letterSpacing="widest">
                        Job Rating
                      </Text>
                      <HStack color="green.600" fontWeight="bold">
                        <Icon as={ShieldCheck} />
                        <Text>{selectedJob.rating ?? "-"}/10.0</Text>
                      </HStack>
                    </VStack>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="10px" color="gray.400" fontWeight="black" textTransform="uppercase" letterSpacing="widest">
                        Location
                      </Text>
                      <Text fontWeight="bold" color="gray.700">{selectedJob.location || 'N/A'}</Text>
                    </VStack>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="10px" color="gray.400" fontWeight="black" textTransform="uppercase" letterSpacing="widest">
                        Industry
                      </Text>
                      <Text fontWeight="bold" color="gray.700" noOfLines={1}>{selectedJob.industries || 'N/A'}</Text>
                    </VStack>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="10px" color="gray.400" fontWeight="black" textTransform="uppercase" letterSpacing="widest">
                        Seniority
                      </Text>
                      <Text fontWeight="bold" color="gray.700">{selectedJob.seniority_level || 'N/A'}</Text>
                    </VStack>
                  </SimpleGrid>

                  {/* Targeted Schools */}
                  <VStack align="start" spacing={4} w="full">
                    <Text fontSize="xs" color="gray.400" fontWeight="black" textTransform="uppercase" letterSpacing="widest">
                      Targeted Schools
                    </Text>
                    <HStack wrap="wrap" spacing={2}>
                      {selectedJob.assigned_schools && Array.isArray(selectedJob.assigned_schools) && selectedJob.assigned_schools.length > 0 ? (
                        selectedJob.assigned_schools.map((school) => (
                          <Box 
                            key={`${selectedJob.id}-detail-${school}`} 
                            px={4} 
                            py={2} 
                            bg="white" 
                            border="2px solid" 
                            borderColor="blue.50" 
                            color="blue.700" 
                            fontWeight="bold" 
                            borderRadius="2xl" 
                            fontSize="sm" 
                            shadow="sm"
                          >
                            {school}
                          </Box>
                        ))
                      ) : (
                        <Text color="gray.400" fontSize="sm">No schools assigned</Text>
                      )}
                    </HStack>
                  </VStack>

                  {/* Sections */}
                  <VStack align="start" spacing={8} w="full" pb={24}>
                    <VStack align="start" spacing={3}>
                      <HStack spacing={2}>
                        <Box w="1.5" h="6" bg="blue.600" borderRadius="full" />
                        <Heading size="md" fontWeight="black">Job Overview</Heading>
                      </HStack>
                      <Text color="gray.600" fontWeight="medium" lineHeight="relaxed">
                        {selectedJob.job_description || 'No description available.'}
                      </Text>
                    </VStack>

                    <VStack align="start" spacing={3}>
                      <HStack spacing={2}>
                        <Box w="1.5" h="6" bg="blue.600" borderRadius="full" />
                        <Heading size="md" fontWeight="black">About {selectedJob.company_name || 'the company'}</Heading>
                      </HStack>
                      <Text color="gray.600" fontWeight="medium" lineHeight="relaxed">
                        {selectedJob.pipeline_companies?.about_us || 'No company information available.'}
                      </Text>
                    </VStack>
                  </VStack>
                </VStack>
              </Box>
            )}
          </DrawerBody>

          {/* Fixed Footer */}
          <Box 
            position="absolute" 
            bottom={0} 
            left={0} 
            right={0} 
            p={6} 
            bg="whiteAlpha.800" 
            backdropFilter="blur(20px)" 
            borderTop="1px solid" 
            borderColor="gray.100"
          >
            <HStack spacing={4}>
              <Button 
                as="a"
                href={selectedJob?.job_link}
                target="_blank"
                rel="noopener noreferrer"
                flexGrow={1} 
                colorScheme="blue" 
                size="lg" 
                h={16} 
                borderRadius="2xl" 
                fontWeight="black" 
                shadow="xl"
                _active={{ transform: 'scale(0.98)' }}
                isDisabled={!selectedJob?.job_link}
              >
                APPLY NOW
              </Button>
              <IconButton
                aria-label="Favorite"
                icon={<Heart />}
                size="lg"
                h={16}
                w={16}
                borderRadius="2xl"
                variant="outline"
                borderColor="gray.100"
                _hover={{ bg: 'gray.50', color: 'red.500' }}
              />
            </HStack>
          </Box>
        </DrawerContent>
      </Drawer>
    </AdminShell>
  );
}
