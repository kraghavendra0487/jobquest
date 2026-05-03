import { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Icon, Button, VStack, HStack, Table, Thead,
  Tbody, Tr, Th, Td, Spinner, useToast, Checkbox,
  Input, InputGroup, InputLeftElement, Badge,
} from '@chakra-ui/react';
import {
  RefreshCw, Search, Star,
  Download, CheckCircle2,
  Sparkles
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import AdminShell from './admin/AdminShell';

const COMPANY_EXPORT_FIELDS = [
  ['id', 'ID'],
  ['company_name', 'Company Name'],
  ['company_link', 'Company Link'],
  ['status', 'Status'],
  ['rating', 'Rating (0-10)'],
  ['website', 'Website'],
  ['industry', 'Industry'],
  ['followers_count', 'Followers'],
  ['employees_count', 'Employees'],
  ['company_size', 'Size'],
  ['location', 'Location'],
  ['founded', 'Founded'],
  ['company_type', 'Type'],
  ['specialties', 'Specialties'],
  ['about_us', 'About Us'],
];

export default function AdminCompanyPage({ session, userData }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRated, setShowRated] = useState(true);
  const [showUnrated, setShowUnrated] = useState(true);
  const [isBulkAiRunning, setIsBulkAiRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

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

  const downloadExcel = () => {
    const exportData = companies.map((c) => {
      const row = {};
      COMPANY_EXPORT_FIELDS.forEach(([key, label]) => {
        const v = c[key];
        row[label] = v === null || v === undefined ? '' : v;
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Companies');
    XLSX.writeFile(wb, `Companies_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleBulkAiRate = async () => {
    const unrated = companies.filter(c => c.status === 'parsed' && (!c.rating || c.rating === 0));
    if (unrated.length === 0) {
      toast({ title: 'No unrated companies', status: 'info', duration: 3000 });
      return;
    }

    setIsBulkAiRunning(true);
    setBulkProgress({ current: 0, total: unrated.length });

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

        setCompanies(prev => prev.map(c =>
          c.id === company.id ? { ...c, rating: newRating } : c
        ));
      } catch (err) {
        console.error(`Failed to rate ${company.company_name}:`, err);
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

  const rateTabCompanies = companies.filter(c => {
    if (c.status !== 'parsed') return false;
    const isRated = c.rating > 0;

    let matchesTabs = false;
    if (showRated && showUnrated) matchesTabs = true;
    else if (showRated) matchesTabs = isRated;
    else if (showUnrated) matchesTabs = !isRated;

    return matchesTabs;
  }).filter(c =>
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.industry && String(c.industry).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const unratedCount = companies.filter(c => c.status === 'parsed' && (c.rating === 0 || !c.rating)).length;

  return (
    <AdminShell session={session} userData={userData}>
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align="end">
          <Box>
            <Heading size="lg" letterSpacing="tight">Company Management</Heading>
            <Text color="gray.500" fontSize="sm">Rate pipeline companies</Text>
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

            <Button leftIcon={<Download size={18} />} colorScheme="blue" borderRadius="xl" onClick={downloadExcel} px={6} isDisabled={companies.length === 0}>Export</Button>

            <Button
              aria-label="Refresh companies list"
              leftIcon={<RefreshCw size={18} />}
              variant="ghost"
              borderRadius="xl"
              onClick={fetchData}
              isLoading={loading}
            />
          </HStack>
        </Flex>

        <Box bg="white" borderRadius="2xl" border="1px" borderColor="gray.100" overflow="hidden">
          <Box p={4} borderBottom="1px" borderColor="gray.100" bg="gray.50">
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
              <HStack spacing={6} flexWrap="wrap">
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
        </Box>
      </VStack>
    </AdminShell>
  );
}
