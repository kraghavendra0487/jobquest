import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Icon,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  Divider,
  Center,
  SimpleGrid,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Input,
  IconButton,
} from '@chakra-ui/react';
import { Upload, CheckCircle, AlertCircle, X, ArrowRight, Clock, FileText, User, Edit2 } from 'lucide-react';
import { apiUpload, api } from '../../lib/api';

export default function JobUploadsPage() {
  const [stage, setStage] = useState('idle'); // idle | previewing | preview_ready | saving | done
  const [previewData, setPreviewData] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isUpdatingFetchedAt, setIsUpdatingFetchedAt] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (stage === 'idle' || stage === 'done') {
      fetchHistory();
    }
  }, [stage]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api('/api/admin/job-uploads');
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStage('previewing');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await apiUpload('/api/admin/job-uploads/preview', formData);
      setPreviewData(data);
      setStage('preview_ready');
    } catch (err) {
      toast({ title: 'Upload Error', description: err.message, status: 'error' });
      setStage('idle');
    }
  };

  const handleSave = async () => {
    setStage('saving');
    try {
      const data = await api(`/api/admin/job-uploads/${previewData.upload_id}/save`, {
        method: 'POST'
      });
      setSaveResult(data);
      setStage('done');
      toast({ title: 'Success', description: `Saved ${data.inserted} jobs`, status: 'success' });
    } catch (err) {
      toast({ title: 'Save Error', description: err.message, status: 'error' });
      setStage('preview_ready');
    }
  };

  const handleCancel = () => {
    setPreviewData(null);
    setStage('idle');
  };

  const handleUpdateFetchedAt = async (newIso) => {
    if (!newIso) return;
    setIsUpdatingFetchedAt(true);
    try {
      await api(`/api/admin/job-uploads/${previewData.upload_id}/refetched-at`, {
        method: 'POST',
        body: JSON.stringify({ fetched_at: new Date(newIso).toISOString() })
      });
      
      // Update local state to reflect the change (UI only, since we didn't re-run normalize on client)
      setPreviewData(prev => ({
        ...prev,
        fetched_at: new Date(newIso).toISOString(),
        fetched_at_source: 'manual_override'
      }));

      toast({ title: 'Updated', description: 'Scrape time updated. Posted dates will be recomputed on save.', status: 'success' });
    } catch (err) {
      toast({ title: 'Update Error', description: err.message, status: 'error' });
    } finally {
      setIsUpdatingFetchedAt(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      new: { color: 'green', label: 'New' },
      duplicate_in_db: { color: 'yellow', label: 'Duplicate (DB)' },
      duplicate_in_file: { color: 'orange', label: 'Duplicate (File)' },
      invalid: { color: 'red', label: 'Invalid' },
    };
    const config = configs[status] || { color: 'gray', label: status };
    return <Badge colorScheme={config.color}>{config.label}</Badge>;
  };

  if (stage === 'previewing') {
    return (
      <Center h="60vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.500" fontWeight="medium">Analyzing Excel file...</Text>
        </VStack>
      </Center>
    );
  }

  if (stage === 'saving') {
    return (
      <Center h="60vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="green.500" thickness="4px" />
          <Text color="gray.500" fontWeight="medium">Committing jobs to database...</Text>
        </VStack>
      </Center>
    );
  }

  if (stage === 'done') {
    return (
      <VStack spacing={8} align="stretch" maxW="3xl" mx="auto" py={8}>
        <Card shadow="xl" borderRadius="2xl" border="1px solid" borderColor="green.100" bg="green.50">
          <CardBody>
            <VStack spacing={6}>
              <Icon as={CheckCircle} boxSize={12} color="green.500" />
              <VStack spacing={2}>
                <Heading size="lg">Upload Successful!</Heading>
                <Text color="gray.600" textAlign="center">
                  Successfully processed <b>{previewData.filename}</b>.
                </Text>
              </VStack>
              <StatGroup w="full" textAlign="center">
                <Stat>
                  <StatLabel>Inserted</StatLabel>
                  <StatNumber color="green.600">{saveResult.inserted}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Total Rows</StatLabel>
                  <StatNumber>{previewData.total_rows}</StatNumber>
                </Stat>
              </StatGroup>
              <Divider borderColor="green.200" />
              <VStack align="stretch" w="full" spacing={3}>
                <HStack color="green.700" fontSize="sm">
                  <Icon as={ArrowRight} size={14} />
                  <Text>Jobs are currently in <b>pending_rating</b> status.</Text>
                </HStack>
                <HStack color="green.700" fontSize="sm">
                  <Icon as={ArrowRight} size={14} />
                  <Text>AI rating and categorization pipeline has been started.</Text>
                </HStack>
              </VStack>
              <Button colorScheme="green" size="lg" w="full" onClick={handleCancel}>
                Upload Another File
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    );
  }

  if (stage === 'preview_ready') {
    const { summary, rows } = previewData;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const fetchedAtIST = new Date(new Date(previewData.fetched_at).getTime() + istOffset);
    const formattedFetchedAt = fetchedAtIST.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm for datetime-local

    return (
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <VStack align="stretch" spacing={1}>
            <Heading size="lg">Preview Upload</Heading>
            <HStack>
              <Text color="gray.500">{previewData.filename}</Text>
              <Box w={1} h={1} borderRadius="full" bg="gray.300" />
              <HStack spacing={1}>
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                  Scraped at: {new Date(previewData.fetched_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </Text>
                <Badge variant="subtle" fontSize="9px" colorScheme={previewData.fetched_at_source === 'filename' ? 'green' : 'orange'}>
                  {previewData.fetched_at_source === 'filename' ? 'from filename' : 'from upload time'}
                </Badge>
                
                <Popover placement="bottom-start">
                  <PopoverTrigger>
                    <IconButton 
                      icon={<Edit2 size={12} />} 
                      size="xs" 
                      variant="ghost" 
                      aria-label="Override scrape time"
                      isLoading={isUpdatingFetchedAt}
                    />
                  </PopoverTrigger>
                  <PopoverContent borderRadius="xl" shadow="xl">
                    <PopoverArrow />
                    <PopoverCloseButton />
                    <PopoverHeader fontWeight="bold" fontSize="sm">Override Scrape Time</PopoverHeader>
                    <PopoverBody>
                      <VStack align="stretch" spacing={3}>
                        <Text fontSize="xs" color="gray.500">
                          Adjust this if the filename date is incorrect. This affects "posted at" calculations.
                        </Text>
                        <Input 
                          size="sm" 
                          type="datetime-local" 
                          defaultValue={formattedFetchedAt}
                          onChange={(e) => handleUpdateFetchedAt(e.target.value)}
                        />
                      </VStack>
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
              </HStack>
            </HStack>
          </VStack>
          <HStack spacing={4}>
            <Button variant="ghost" leftIcon={<X size={18} />} onClick={handleCancel}>Cancel</Button>
            <Button 
              colorScheme="blue" 
              size="lg" 
              leftIcon={<CheckCircle size={18} />}
              disabled={summary.new === 0}
              onClick={handleSave}
            >
              Save {summary.new} New Jobs
            </Button>
          </HStack>
        </HStack>

        <Card variant="outline" borderRadius="xl">
          <CardBody>
            <StatGroup>
              <Stat>
                <StatLabel>Total Rows</StatLabel>
                <StatNumber>{previewData.total_rows}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="green.600">New</StatLabel>
                <StatNumber color="green.600">{summary.new}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="yellow.600">DB Duplicates</StatLabel>
                <StatNumber color="yellow.600">{summary.duplicate_in_db}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="orange.600">File Duplicates</StatLabel>
                <StatNumber color="orange.600">{summary.duplicate_in_file}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="red.600">Invalid</StatLabel>
                <StatNumber color="red.600">{summary.invalid}</StatNumber>
              </Stat>
            </StatGroup>
          </CardBody>
        </Card>

        <Tabs colorScheme="blue" variant="enclosed">
          <TabList>
            <Tab>All Rows</Tab>
            <Tab>New Only</Tab>
            <Tab>Duplicates</Tab>
            <Tab>Invalid</Tab>
          </TabList>
          <TabPanels bg="white" border="1px solid" borderColor="gray.200" borderTop="none" borderRadius="0 0 xl xl">
            {[null, 'new', 'duplicate', 'invalid'].map((filter, i) => (
              <TabPanel key={i} p={0} maxH="600px" overflowY="auto">
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50" sticky="top" top={0} zIndex={1}>
                    <Tr>
                      <Th w="50px">#</Th>
                      <Th w="120px">Status</Th>
                      <Th>Title & Company</Th>
                      <Th>Location & Mode</Th>
                      <Th>Type</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {rows
                      .filter(r => {
                        if (filter === null) return true;
                        if (filter === 'duplicate') return r.status.startsWith('duplicate');
                        return r.status === filter;
                      })
                      .map((row) => (
                        <Tr key={row.row_index}>
                          <Td color="gray.400">{row.row_index + 1}</Td>
                          <Td>{getStatusBadge(row.status)}</Td>
                          <Td>
                            <VStack align="stretch" spacing={0}>
                              <Text fontWeight="bold" noOfLines={1}>{row.title}</Text>
                              <Text fontSize="xs" color="gray.500">{row.company}</Text>
                            </VStack>
                          </Td>
                          <Td>
                            <VStack align="stretch" spacing={0}>
                              <Text fontSize="xs">{row.location}</Text>
                              <Badge variant="subtle" w="fit-content" fontSize="10px">
                                {row.work_mode || 'Unknown'}
                              </Badge>
                            </VStack>
                          </Td>
                          <Td fontSize="xs">{row.employment_type || '-'}</Td>
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </VStack>
    );
  }

  return (
    <VStack spacing={8} align="stretch">
      <VStack align="stretch" spacing={1}>
        <Heading size="lg">Job Uploads</Heading>
        <Text color="gray.500">Upload LinkedIn job export Excel files to the master table.</Text>
      </VStack>

      <Center 
        p={12} 
        border="2px dashed" 
        borderColor="gray.200" 
        borderRadius="2xl" 
        bg="gray.50"
        transition="all 0.2s"
        _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
        as="label"
        cursor="pointer"
      >
        <VStack spacing={4}>
          <Icon as={Upload} boxSize={10} color="blue.500" />
          <VStack spacing={1}>
            <Text fontWeight="bold" fontSize="lg">Click to upload or drag and drop</Text>
            <Text color="gray.500" fontSize="sm">Excel files (.xlsx, .xls) only</Text>
          </VStack>
          <input 
            type="file" 
            accept=".xlsx,.xls" 
            hidden 
            onChange={handleFileChange} 
          />
        </VStack>
      </Center>

      <VStack align="stretch" spacing={4}>
        <Heading size="md">Requirements</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <HStack align="start" p={4} bg="white" borderRadius="xl" shadow="sm">
            <Icon as={AlertCircle} color="blue.500" mt={1} />
            <VStack align="stretch" spacing={0}>
              <Text fontWeight="bold">Format</Text>
              <Text fontSize="sm" color="gray.500">LinkedIn Standard Export with all columns (title, company, job_link, etc.)</Text>
            </VStack>
          </HStack>
          <HStack align="start" p={4} bg="white" borderRadius="xl" shadow="sm">
            <Icon as={AlertCircle} color="blue.500" mt={1} />
            <VStack align="stretch" spacing={0}>
              <Text fontWeight="bold">Deduplication</Text>
              <Text fontSize="sm" color="gray.500">Automatically skips jobs already in the database based on LinkedIn Job ID.</Text>
            </VStack>
          </HStack>
        </SimpleGrid>
      </VStack>

      <VStack align="stretch" spacing={4} pt={4}>
        <Heading size="md">Upload History</Heading>
        <Box bg="white" shadow="sm" borderRadius="xl" border="1px solid" borderColor="gray.200" overflow="hidden">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>File Name</Th>
                <Th>Stats</Th>
                <Th>Status</Th>
                <Th>Uploaded By</Th>
                <Th>Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loadingHistory ? (
                <Tr><Td colSpan={5} textAlign="center" py={8}><Spinner size="sm" mr={2} /> Loading history...</Td></Tr>
              ) : history.length === 0 ? (
                <Tr><Td colSpan={5} textAlign="center" py={8} color="gray.500">No previous uploads found.</Td></Tr>
              ) : (
                history.map((h) => (
                  <Tr key={h.id}>
                    <Td>
                      <HStack>
                        <Icon as={FileText} size={16} color="blue.500" />
                        <Text fontWeight="medium" fontSize="sm">{h.filename}</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <Tooltip label={`Total: ${h.total_rows} | Valid: ${h.valid_rows} | New: ${h.inserted_rows}`}>
                        <HStack spacing={2}>
                          <Badge colorScheme="green" variant="subtle">+{h.inserted_rows}</Badge>
                          <Badge colorScheme="gray" variant="subtle">{h.total_rows} total</Badge>
                        </HStack>
                      </Tooltip>
                    </Td>
                    <Td>
                      <Badge 
                        colorScheme={h.status === 'saved' || h.status === 'done' ? 'green' : h.status === 'failed' ? 'red' : 'blue'}
                        variant="solid"
                        fontSize="10px"
                      >
                        {h.status.toUpperCase()}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <Icon as={User} size={14} color="gray.400" />
                        <Text fontSize="xs">{h.uploader?.name || 'Unknown'}</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack spacing={1} color="gray.500">
                        <Icon as={Clock} size={14} />
                        <Text fontSize="xs">{new Date(h.created_at).toLocaleDateString()}</Text>
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      </VStack>
    </VStack>
  );
}
