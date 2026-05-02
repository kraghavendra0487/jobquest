import { useState, useEffect } from 'react';
import {
  Box, Container, Flex, Heading, Text, Avatar, IconButton, Menu, MenuButton,
  MenuList, MenuItem, Divider, Icon, Button, VStack, HStack, Table, Thead,
  Tbody, Tr, Th, Td, Spinner, useToast, Checkbox, Popover, PopoverTrigger,
  PopoverContent, PopoverHeader, PopoverBody, PopoverArrow, PopoverCloseButton,
  Stack, Input, InputGroup, InputLeftElement, Badge,
  Tabs, TabList, TabPanels, Tab, TabPanel, Tooltip,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  useDisclosure, SimpleGrid, RadioGroup, Radio, Stack as ChakraStack,
  FormControl, FormLabel, NumberInput, NumberInputField, 
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Textarea
} from '@chakra-ui/react';
import {
  RefreshCw, Building2, Search, ListFilter, ChevronRight, Star, 
  Download, CheckCircle2, ChevronLeft, LayoutList, MapPin, Globe, ExternalLink,
  Sparkles
} from "lucide-react";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import AdminShell from './admin/AdminShell';

const ALL_COLUMNS = [
  { id: 'company_name', label: 'Company Name' },
  { id: 'rating', label: 'Rating (0-10)' },
  { id: 'website', label: 'Website' },
  { id: 'industry', label: 'Industry' },
  { id: 'followers_count', label: 'Followers' },
  { id: 'employees_count', label: 'Employees' },
  { id: 'company_size', label: 'Size' },
  { id: 'location', label: 'Location' },
  { id: 'founded', label: 'Founded' },
  { id: 'company_type', label: 'Type' },
  { id: 'specialties', label: 'Specialties' },
  { id: 'about_us', label: 'About Us' },
  { id: 'status', label: 'Status' },
];

export default function AdminCompanyPage({ session, userData }) {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    isOpen: isAiOpen,
    onOpen: onAiOpen,
    onClose: onAiClose
  } = useDisclosure();
  
  // State
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRated, setShowRated] = useState(true);
  const [showUnrated, setShowUnrated] = useState(true);
  const [showLowRatedOnly, setShowLowRatedOnly] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [localRating, setLocalRating] = useState(0);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isBulkAiRunning, setIsBulkAiRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('pipeline_company_columns');
    return saved ? JSON.parse(saved) : ['company_name', 'rating', 'website', 'industry', 'status'];
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/companies/merged-companies');
      setCompanies(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch companies', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleColumn = (colId) => {
    let newCols = visibleColumns.includes(colId) 
      ? visibleColumns.filter(id => id !== colId) 
      : [...visibleColumns, colId];
    if (newCols.length === 0) return;
    setVisibleColumns(newCols);
    localStorage.setItem('pipeline_company_columns', JSON.stringify(newCols));
  };

  const downloadExcel = () => {
    const exportData = companies.map(c => ({
      'Company Name': c.company_name,
      'Rating': c.rating || 0,
      'Website': c.website,
      'Industry': c.industry,
      'Location': c.location,
      'About Us': c.about_us,
      'LinkedIn': c.company_link
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Companies");
    XLSX.writeFile(wb, `Companies_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAiRate = async () => {
    if (!selectedCompany) return;
    setIsAiLoading(true);
    try {
      const result = await api(`/api/admin/companies/company/${selectedCompany.id}/rate-with-ai`, {
        method: 'POST',
        body: { prompt: aiPrompt }
      });
      
      const newRating = result.rating;

      // Update local state
      setCompanies(prev => prev.map(c => 
        c.id === selectedCompany.id ? { ...c, rating: newRating } : c
      ));

      setSaveSuccess(true);
      
      toast({
        title: 'AI Rating Complete',
        description: `Company rated: ${newRating}/10`,
        status: 'success',
        duration: 3000
      });

      setTimeout(() => {
        onAiClose();
        setIsAiLoading(false);
        setSaveSuccess(false);
      }, 1500);

    } catch (err) {
      toast({
        title: 'AI Rating Failed',
        description: err.message,
        status: 'error',
      });
      setIsAiLoading(false);
    }
  };

  const handleBulkAiRate = async () => {
    const unrated = companies.filter(c => c.status === 'parsed' && (!c.rating || c.rating === 0));
    if (unrated.length === 0) {
      toast({ title: 'No unrated companies', status: 'info', duration: 3000 });
      return;
    }

    setIsBulkAiRunning(true);
    setBulkProgress({ current: 0, total: unrated.length });

    // Process one by one
    for (let i = 0; i < unrated.length; i++) {
      const company = unrated[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      const prompt = `Company Data context:

Name: ${company.company_name}
Website: ${company.website || 'N/A'}
Industry: ${company.industry || 'N/A'}
Location: ${company.location || 'N/A'}
Size: ${company.company_size || 'N/A'}
Employees: ${company.employees_count || 'N/A'}
Followers: ${company.followers_count || 'N/A'}
Founded: ${company.founded || 'N/A'}
Type: ${company.company_type || 'N/A'}
Specialties: ${company.specialties || 'N/A'}
LinkedIn: ${company.company_link || 'N/A'}

About: ${company.about_us || 'No description available.'}

rate this company for 0 to 10.0 , give me output in decimal only [ eg 7.4 ]`;

      try {
        const result = await api(`/api/admin/companies/company/${company.id}/rate-with-ai`, {
          method: 'POST',
          body: { prompt }
        });
        
        const newRating = result.rating;

        // Update local state dynamically
        setCompanies(prev => prev.map(c => 
          c.id === company.id ? { ...c, rating: newRating } : c
        ));
      } catch (err) {
        console.error(`Failed to rate ${company.company_name}:`, err);
        // Continue to next company
      }
    }

    setIsBulkAiRunning(false);
    toast({
      title: 'Bulk Rating Complete',
      description: `Processed ${unrated.length} companies.`,
      status: 'success',
      duration: 5000,
      isClosable: true
    });
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = 
      c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRating = !showLowRatedOnly || (c.rating > 0 && c.rating < 7);
    
    return matchesSearch && matchesRating;
  });

  const rateTabCompanies = companies.filter(c => {
    if (c.status !== 'parsed') return false;
    const isRated = c.rating > 0;
    
    let matchesTabs = false;
    if (showRated && showUnrated) matchesTabs = true;
    else if (showRated) matchesTabs = isRated;
    else if (showUnrated) matchesTabs = !isRated;

    const matchesRating = !showLowRatedOnly || (c.rating > 0 && c.rating < 7);

    return matchesTabs && matchesRating;
  }).filter(c => 
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unratedCount = companies.filter(c => c.status === 'parsed' && (c.rating === 0 || !c.rating)).length;

  return (
    <AdminShell session={session} userData={userData}>
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align="end">
          <Box>
            <Heading size="lg" letterSpacing="tight">Company Management</Heading>
            <Text color="gray.500" fontSize="sm">Manage pipeline companies and ratings</Text>
          </Box>
          
          <HStack spacing={2}>
            <InputGroup size="md" w="300px">
              <InputLeftElement pointerEvents="none"><Search size={18} color="gray" /></InputLeftElement>
              <Input 
                placeholder="Search name, industry..." 
                bg="white" 
                border="1px solid" 
                borderColor="gray.200" 
                _focus={{ borderColor: 'blue.400', boxShadow: 'none' }}
                borderRadius="xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>

            <Popover closeOnBlur={false} placement="bottom-end">
              <PopoverTrigger>
                <Button leftIcon={<ListFilter size={18} />} variant="outline" borderRadius="xl" bg="white">Columns</Button>
              </PopoverTrigger>
              <PopoverContent borderRadius="2xl" shadow="2xl" p={2} w="200px">
                <PopoverHeader border="none" fontWeight="bold">Show Columns</PopoverHeader>
                <PopoverBody>
                  <VStack align="start" spacing={1}>
                    {ALL_COLUMNS.map(col => (
                      <Checkbox key={col.id} isChecked={visibleColumns.includes(col.id)} onChange={() => toggleColumn(col.id)} colorScheme="blue" w="full" p={1} _hover={{ bg: 'gray.50', borderRadius: 'md' }}>
                        <Text fontSize="sm">{col.label}</Text>
                      </Checkbox>
                    ))}
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>

            <Button leftIcon={<Download size={18} />} colorScheme="blue" borderRadius="xl" onClick={downloadExcel} px={6}>Export</Button>
            
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

        <Tabs colorScheme="blue" variant="enclosed" bg="white" borderRadius="2xl" border="1px" borderColor="gray.100" overflow="hidden">
          <TabList px={4} pt={4} borderBottom="1px" borderColor="gray.100">
            <Tab fontWeight="bold" fontSize="sm" _selected={{ color: 'blue.600', borderBottom: '2px solid' }}>
              Overview
            </Tab>
            <Tab fontWeight="bold" fontSize="sm" _selected={{ color: 'blue.600', borderBottom: '2px solid' }}>
              Rate Companies
              <Badge ml={2} colorScheme="orange" borderRadius="full" px={2}>{unratedCount}</Badge>
            </Tab>
          </TabList>

          <TabPanels>
            {/* OVERVIEW TAB */}
            <TabPanel p={0}>
              {loading ? (
                <Flex justify="center" py={20}><Spinner color="blue.500" /></Flex>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        {ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)).map(col => (
                          <Th key={col.id} color="gray.600" fontSize="xs" py={4}>{col.label}</Th>
                        ))}
                        <Th w="50px"></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredCompanies.map(company => (
                        <Tr key={company.id} _hover={{ bg: 'blue.50' }}>
                          {visibleColumns.includes('company_name') && (
                            <Td><Text fontWeight="bold" color="blue.600" cursor="pointer" onClick={() => navigate(`/admin-company-detail/${company.id}`)} _hover={{ textDecoration: 'underline' }}>{company.company_name}</Text></Td>
                          )}
                          {visibleColumns.includes('rating') && (
                            <Td>
                              <HStack spacing={1}>
                                <HStack spacing={0.5}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Icon 
                                      key={star}
                                      as={Star} 
                                      size={12} 
                                      color={star <= (company.rating / 2) ? "orange.400" : "gray.200"} 
                                      fill={star <= (company.rating / 2) ? "orange.400" : "none"} 
                                    />
                                  ))}
                                </HStack>
                                <Text fontSize="xs" fontWeight="bold" color="gray.600">{company.rating || 0}</Text>
                              </HStack>
                            </Td>
                          )}
                          {visibleColumns.includes('website') && <Td isTruncated maxW="200px"><Text fontSize="sm">{company.website}</Text></Td>}
                          {visibleColumns.includes('industry') && <Td><Badge variant="subtle" colorScheme="blue" borderRadius="md">{company.industry}</Badge></Td>}
                          {visibleColumns.includes('followers_count') && <Td fontSize="sm">{company.followers_count}</Td>}
                          {visibleColumns.includes('employees_count') && <Td fontSize="sm">{company.employees_count}</Td>}
                          {visibleColumns.includes('company_size') && <Td fontSize="sm">{company.company_size}</Td>}
                          {visibleColumns.includes('location') && <Td isTruncated maxW="150px" fontSize="sm">{company.location}</Td>}
                          {visibleColumns.includes('founded') && <Td fontSize="sm">{company.founded}</Td>}
                          {visibleColumns.includes('company_type') && <Td fontSize="sm">{company.company_type}</Td>}
                          {visibleColumns.includes('specialties') && <Td isTruncated maxW="150px" fontSize="xs">{company.specialties}</Td>}
                          {visibleColumns.includes('about_us') && <Td isTruncated maxW="200px" fontSize="xs">{company.about_us}</Td>}
                          {visibleColumns.includes('status') && <Td><Badge colorScheme={company.status === 'parsed' ? 'green' : 'gray'}>{company.status}</Badge></Td>}
                          <Td><IconButton aria-label="Details" icon={<ChevronRight size={18} />} variant="ghost" size="sm" onClick={() => navigate(`/admin-company-detail/${company.id}`)} /></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </TabPanel>

            {/* RATE TAB */}
            <TabPanel p={0}>
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
                    <Checkbox 
                      colorScheme="orange" 
                      isChecked={showLowRatedOnly} 
                      onChange={(e) => setShowLowRatedOnly(e.target.checked)}
                    >
                      <Text fontSize="sm">7 below rated</Text>
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
                        <Th py={4}>Company</Th>
                        <Th py={4}>Industry</Th>
                        <Th py={4}>Rating</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {rateTabCompanies.map(company => (
                        <Tr key={company.id} _hover={{ bg: 'orange.50' }}>
                          <Td><Text fontWeight="bold" color="blue.600" cursor="pointer" onClick={() => navigate(`/admin-company-detail/${company.id}`)}>{company.company_name}</Text></Td>
                          <Td><Badge variant="outline">{company.industry}</Badge></Td>
                          <Td>
                            {company.rating > 0 ? (
                              <HStack spacing={1}>
                                <HStack spacing={0.5}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Icon 
                                      key={star}
                                      as={Star} 
                                      size={12} 
                                      color={star <= (company.rating / 2) ? "orange.400" : "gray.200"} 
                                      fill={star <= (company.rating / 2) ? "orange.400" : "none"} 
                                    />
                                  ))}
                                </HStack>
                                <Text fontSize="xs" fontWeight="bold" color="gray.600">{company.rating}</Text>
                              </HStack>
                            ) : (
                              <Badge colorScheme="gray" variant="subtle">Not Rated</Badge>
                            )}
                          </Td>
                        </Tr>
                      ))}
                      {rateTabCompanies.length === 0 && (
                        <Tr><Td colSpan={3} textAlign="center" py={20} color="gray.400"><VStack spacing={2}><Icon as={CheckCircle2} size={40} color="green.400" /><Text fontWeight="bold">No companies matching filters!</Text></VStack></Td></Tr>
                      )}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* AI RATING PROMPT MODAL */}
      <Modal isOpen={isAiOpen} onClose={onAiClose} size="2xl" isCentered scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(8px)" />
        <ModalContent borderRadius="2xl" shadow="2xl">
          <ModalHeader borderBottom="1px" borderColor="gray.100" py={4}>
            <HStack spacing={3}>
              <Icon as={Sparkles} color="purple.500" />
              <Text>AI Rating Prompt</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={8}>
            {selectedCompany && (
              <VStack align="stretch" spacing={6}>
                <Box>
                  <Text fontWeight="bold" color="purple.700" mb={2}>AI Input Prompt:</Text>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={15}
                    fontSize="sm"
                    bg="purple.50"
                    borderColor="purple.100"
                    borderRadius="xl"
                    _focus={{ borderColor: 'purple.400', bg: 'white' }}
                  />
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter bg="gray.50" borderBottomRadius="2xl" py={4}>
            <Flex w="full" justify="space-between">
              <Button variant="ghost" onClick={onAiClose}>Back</Button>
              <Button 
                colorScheme="purple" 
                leftIcon={<Sparkles size={18} />} 
                borderRadius="xl"
                px={8}
                onClick={handleAiRate}
                isLoading={isAiLoading}
              >
                Send Now
              </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AdminShell>
  );
}
