import { useState, useEffect, useMemo } from 'react';
import {
  Box, Flex, Heading, Text, IconButton, Menu, MenuButton,
  MenuList, MenuItem, Icon, Button, VStack, HStack, Table, Thead,
  Tbody, Tr, Th, Td, Spinner, useToast, Checkbox,
  Input, InputGroup, InputLeftElement, Badge,
  MenuDivider
} from '@chakra-ui/react';
import {
  RefreshCw, Search, Star,
  CheckCircle2,
  Sparkles, Filter, Download
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import AdminShell from './admin/AdminShell';

export default function AdminPipelineJobsPage({ session, userData }) {
  const navigate = useNavigate();
  const toast = useToast();
  
  // State
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRated, setShowRated] = useState(true);
  const [showUnrated, setShowUnrated] = useState(true);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [isBulkAiRunning, setIsBulkAiRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/jobs/merged-jobs');
      setJobs(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch jobs', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleBulkAiRate = async () => {
    const unrated = jobs.filter(j => (!j.rating || j.rating === 0));
    if (unrated.length === 0) {
      toast({ title: 'No unrated jobs', status: 'info', duration: 3000 });
      return;
    }

    setIsBulkAiRunning(true);
    setBulkProgress({ current: 0, total: unrated.length });

    for (let i = 0; i < unrated.length; i++) {
      const job = unrated[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      const prompt = `Job Details context:

Title: ${job.job_title}
Company: ${job.company_name}
Location: ${job.location || 'N/A'}
Posted: ${job.posted_time || 'N/A'}
Applicants: ${job.applicant_count || 'N/A'}
Seniority: ${job.seniority_level || 'N/A'}
Employment Type: ${job.employment_type || 'N/A'}
Job Function: ${job.job_function || 'N/A'}
Industries: ${job.industries || 'N/A'}

Description: ${job.job_description || 'No description available.'}`;

      try {
        const result = await api(`/api/admin/jobs/job/${job.id}/rate-with-ai`, {
          method: 'POST',
          body: { prompt }
        });
        
        const newRating = result.rating;

        setJobs(prev => prev.map(j => 
          j.id === job.id ? { ...j, rating: newRating } : j
        ));
      } catch (err) {
        console.error(`Failed to rate job ${job.job_title}:`, err);
      }
    }

    setIsBulkAiRunning(false);
    toast({
      title: 'Bulk Rating Complete',
      description: `Processed ${unrated.length} jobs.`,
      status: 'success',
      duration: 5000,
      isClosable: true
    });
  };

  const allSchools = useMemo(() => {
    const schools = new Set();
    jobs.forEach(job => {
      if (job.assigned_schools && Array.isArray(job.assigned_schools)) {
        job.assigned_schools.forEach(school => schools.add(school));
      }
    });
    return Array.from(schools).sort();
  }, [jobs]);

  const rateTabJobs = jobs.filter(j => {
    const isRated = j.rating > 0;
    
    let matchesTabs = false;
    if (showRated && showUnrated) matchesTabs = true;
    else if (showRated) matchesTabs = isRated;
    else if (showUnrated) matchesTabs = !isRated;

    const matchesSchools = 
      selectedSchools.length === 0 || 
      (j.assigned_schools && j.assigned_schools.some(s => selectedSchools.includes(s)));

    return matchesTabs && matchesSchools;
  }).filter(j => 
    j.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unratedCount = jobs.filter(j => (j.rating === 0 || !j.rating)).length;

  const jobRowForExport = (j) => {
    const row = {};
    for (const [k, v] of Object.entries(j)) {
      if (k === 'pipeline_companies') continue;
      if (v === null || v === undefined) {
        row[k] = '';
      } else if (Array.isArray(v)) {
        row[k] = v.join(', ');
      } else if (typeof v === 'object') {
        row[k] = JSON.stringify(v);
      } else {
        row[k] = v;
      }
    }
    const pc = j.pipeline_companies && typeof j.pipeline_companies === 'object' ? j.pipeline_companies : null;
    if (pc) {
      for (const [k, val] of Object.entries(pc)) {
        const key = `company_${k}`;
        if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
          row[key] = JSON.stringify(val);
        } else if (Array.isArray(val)) {
          row[key] = val.join(', ');
        } else {
          row[key] = val === null || val === undefined ? '' : val;
        }
      }
    }
    return row;
  };

  const downloadExcel = () => {
    const rows = jobs.map(jobRowForExport);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jobs');
    XLSX.writeFile(wb, `Pipeline_Jobs_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <AdminShell session={session} userData={userData}>
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align="end">
          <Box>
            <HStack spacing={3} align="center">
              <Heading size="lg" letterSpacing="tight">Job Rating</Heading>
              <Badge colorScheme="orange" borderRadius="full" px={2} fontSize="xs">
                {unratedCount} unrated
              </Badge>
            </HStack>
            <Text color="gray.500" fontSize="sm">Manage pipeline job search results and ratings</Text>
          </Box>
          
          <HStack spacing={2}>
            <InputGroup size="md" w="300px">
              <InputLeftElement pointerEvents="none"><Search size={18} color="gray" /></InputLeftElement>
              <Input 
                placeholder="Search title, company..." 
                bg="white" 
                border="1px solid" 
                borderColor="gray.200" 
                _focus={{ borderColor: 'blue.400', boxShadow: 'none' }}
                borderRadius="xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>

            <Button
              leftIcon={<Download size={18} />}
              colorScheme="blue"
              variant="outline"
              borderRadius="xl"
              bg="white"
              onClick={downloadExcel}
              isDisabled={jobs.length === 0}
            >
              Export
            </Button>

            <Menu closeOnSelect={false}>
              <MenuButton 
                as={Button} 
                leftIcon={<Icon as={Filter} size={18} />} 
                variant="outline" 
                borderRadius="xl"
                bg="white"
              >
                Filters {selectedSchools.length > 0 && `(${selectedSchools.length})`}
              </MenuButton>
              <MenuList borderRadius="xl" shadow="xl" p={2} minW="240px">
                <Box px={3} py={2}>
                  <Text fontWeight="bold" fontSize="xs" color="gray.500" textTransform="uppercase" mb={2}>Schools</Text>
                  <VStack align="stretch" spacing={1} maxH="200px" overflowY="auto">
                    {allSchools.map(school => (
                      <Checkbox 
                        key={school} 
                        isChecked={selectedSchools.includes(school)}
                        onChange={() => {
                          setSelectedSchools(prev => 
                            prev.includes(school) 
                              ? prev.filter(s => s !== school) 
                              : [...prev, school]
                          );
                        }}
                        colorScheme="blue"
                      >
                        <Text fontSize="sm">{school}</Text>
                      </Checkbox>
                    ))}
                  </VStack>
                </Box>
                {selectedSchools.length > 0 && (
                  <>
                    <MenuDivider />
                    <MenuItem 
                      justifyContent="center" 
                      fontSize="xs" 
                      fontWeight="bold" 
                      color="blue.600"
                      onClick={() => setSelectedSchools([])}
                    >
                      Clear School Filters
                    </MenuItem>
                  </>
                )}
              </MenuList>
            </Menu>

            <IconButton 
              aria-label="Refresh" 
              icon={<RefreshCw size={18} />} 
              variant="ghost" 
              borderRadius="xl" 
              onClick={fetchData} 
              isLoading={loading}
            />
          </HStack>
        </Flex>

        <Box bg="white" borderRadius="2xl" border="1px" borderColor="gray.100" overflow="hidden">
              <Box p={4} borderBottom="1px" borderColor="gray.100" bg="gray.50">
                <Flex justify="space-between" align="center">
                  <HStack spacing={6}>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">Filters:</Text>
                    <Checkbox 
                      colorScheme="blue" 
                      isChecked={showRated} 
                      onChange={(e) => setShowRated(e.target.checked)}
                    >
                      <Text fontSize="sm">Rated</Text>
                    </Checkbox>
                    <Checkbox 
                      colorScheme="blue" 
                      isChecked={showUnrated} 
                      onChange={(e) => setShowUnrated(e.target.checked)}
                    >
                      <Text fontSize="sm">Unrated</Text>
                    </Checkbox>
                  </HStack>

                  <HStack spacing={4}>
                    {isBulkAiRunning && (
                      <HStack spacing={3} bg="purple.50" px={4} py={2} borderRadius="xl" border="1px" borderColor="purple.100">
                        <Spinner size="xs" color="purple.500" />
                        <Text fontSize="xs" fontWeight="bold" color="purple.700">
                          AI Rating Progress: {bulkProgress.current} / {bulkProgress.total}
                        </Text>
                      </HStack>
                    )}
                    <Button 
                      leftIcon={<Sparkles size={18} />} 
                      colorScheme="purple" 
                      size="sm" 
                      borderRadius="xl"
                      onClick={handleBulkAiRate}
                      isLoading={isBulkAiRunning}
                      loadingText="Rating..."
                      isDisabled={unratedCount === 0}
                    >
                      Rate All with AI
                    </Button>
                  </HStack>
                </Flex>
              </Box>
              {loading ? (
                <Flex justify="center" py={20}><Spinner color="blue.500" /></Flex>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th py={4}>Job Title</Th>
                        <Th py={4}>Company Rating</Th>
                        <Th py={4}>Schools</Th>
                        <Th py={4}>Job Rating</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rateTabJobs.map(job => (
                        <Tr key={job.id} _hover={{ bg: 'orange.50' }}>
                          <Td maxW="220px">
                            <VStack align="start" spacing={0.5}>
                              <Text fontWeight="bold" color="blue.600" cursor="pointer" onClick={() => navigate(`/admin-job-detail/${job.id}`)} _hover={{ textDecoration: 'underline' }} isTruncated w="full">{job.job_title}</Text>
                              <Text fontSize="xs" color="gray.500" isTruncated w="full" title={job.company_name}>{job.company_name}</Text>
                            </VStack>
                          </Td>
                          <Td>
                            {job.company_rating > 0 ? (
                              <HStack
                                bg="green.500"
                                color="white"
                                px={1.5}
                                py={0.5}
                                borderRadius="md"
                                spacing={0.5}
                                fontSize="10px"
                                fontWeight="black"
                                w="fit-content"
                              >
                                <Text>{job.company_rating}</Text>
                                <Icon as={Star} size={8} fill="white" />
                              </HStack>
                            ) : (
                              <Text fontSize="xs" color="gray.400">—</Text>
                            )}
                          </Td>
                          <Td>
                            <HStack spacing={1} wrap="wrap">
                              {job.assigned_schools && job.assigned_schools.length > 0 ? (
                                job.assigned_schools.map(code => (
                                  <Badge key={code} colorScheme="blue" variant="solid" fontSize="10px">
                                    {code}
                                  </Badge>
                                ))
                              ) : (
                                <Text fontSize="xs" color="gray.400">-</Text>
                              )}
                            </HStack>
                          </Td>
                          <Td>
                            {job.rating > 0 ? (
                              <HStack spacing={1}>
                                <HStack spacing={0.5}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Icon 
                                      key={star}
                                      as={Star} 
                                      size={12} 
                                      color={star <= (job.rating / 2) ? "orange.400" : "gray.200"} 
                                      fill={star <= (job.rating / 2) ? "orange.400" : "none"} 
                                    />
                                  ))}
                                </HStack>
                                <Text fontSize="xs" fontWeight="bold" color="gray.600">{job.rating}</Text>
                              </HStack>
                            ) : (
                              <Badge colorScheme="gray" variant="subtle">Not Rated</Badge>
                            )}
                          </Td>
                        </Tr>
                      ))}
                      {rateTabJobs.length === 0 && (
                        <Tr><Td colSpan={4} textAlign="center" py={20} color="gray.400"><VStack spacing={2}><Icon as={CheckCircle2} size={40} color="green.400" /><Text fontWeight="bold">No jobs matching filters!</Text></VStack></Td></Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              )}
        </Box>
      </VStack>
    </AdminShell>
  );
}
