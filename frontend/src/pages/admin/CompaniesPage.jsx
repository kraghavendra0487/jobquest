import { 
  Box, 
  Heading, 
  Text, 
  VStack, 
  HStack, 
  Input, 
  Select, 
  Button, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Checkbox, 
  Badge, 
  IconButton, 
  Icon,
  useDisclosure, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  ModalCloseButton, 
  useToast, 
  Spinner, 
  Flex, 
  Tooltip, 
  Divider, 
  Menu, 
  MenuButton, 
  MenuList, 
  MenuItem, 
  MenuItemOption,
  MenuOptionGroup,
  Collapse,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Stack
} from '@chakra-ui/react'; 
import { useState, useEffect, useMemo } from 'react'; 
import {  
  Search,  
  RotateCcw,  
  Eye,  
  Settings2,  
  Download,  
  Upload as UploadIcon,  
  Filter,  
  CheckCircle2,  
  XCircle,  
  ArrowRight, 
  ChevronDown,
  ExternalLink,
  Sparkles
} from 'lucide-react'; 
import { supabase } from '../../lib/supabaseClient'; 
import { useNavigate, useSearchParams } from 'react-router-dom'; 
 
export default function CompaniesPage() { 
  const [companies, setCompanies] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [searchParams] = useSearchParams();
  const uploadId = searchParams.get('upload_id');
  const initialFilter = searchParams.get('filter');

  const [search, setSearch] = useState(''); 
  const [selectedRatings, setSelectedRatings] = useState([]); 
  const [selectedIds, setSelectedIds] = useState([]); 
  const [showTools, setShowTools] = useState(false); 
  const toast = useToast(); 
  const navigate = useNavigate(); 

  // Manual Rating Modal State
  const [editingCompany, setEditingCompany] = useState(null);
  const [manualRating, setManualRating] = useState('3');
  const [isSavingManual, setIsSavingManual] = useState(false);

  const [tabIndex, setTabIndex] = useState(initialFilter === 'unrated' ? 1 : 0);

  useEffect(() => { 
    fetchCompanies(); 
  }, [uploadId]); 

  const fetchCompanies = async () => { 
    setLoading(true); 
    try { 
      let query = supabase 
        .from('companies') 
        .select(` 
          *
        `);

      if (uploadId) {
        // Filter companies that have jobs in this upload
        const { data: uploadJobs } = await supabase
          .from('jobs')
          .select('company_id')
          .eq('upload_id', uploadId);
        
        const companyIds = [...new Set(uploadJobs?.map(j => j.company_id))].filter(Boolean);
        if (companyIds.length === 0) {
          setCompanies([]);
          setLoading(false);
          return;
        }
        query = query.in('id', companyIds);
      }

      const { data, error } = await query.order('name', { ascending: true }); 
 
      if (error) throw error; 

      // Fetch job counts separately to avoid relationship error
      const companyIds = (data || []).map(c => c.id);
      let countsMap = {};
      if (companyIds.length > 0) {
        const { data: counts, error: countErr } = await supabase
          .from('jobs')
          .select('company_id')
          .in('company_id', companyIds);
        
        if (!countErr && counts) {
          countsMap = counts.reduce((acc, curr) => {
            acc[curr.company_id] = (acc[curr.company_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      const companiesWithCounts = (data || []).map(c => ({
        ...c,
        job_count: [{ count: countsMap[c.id] || 0 }]
      }));

      setCompanies(companiesWithCounts); 
    } catch (err) { 
      toast({ title: 'Error fetching companies', description: err.message, status: 'error' }); 
    } finally { 
      setLoading(false); 
    } 
  }; 

  // Modals 
  const { isOpen: isBatchOpen, onOpen: onBatchOpen, onClose: onBatchClose } = useDisclosure(); 
  const { isOpen: isRatingOpen, onOpen: onRatingOpen, onClose: onRatingClose } = useDisclosure(); 
 
  // Batch State 
  const [batchPrompt, setBatchPrompt] = useState('default'); 
  const [prompts, setPrompts] = useState([]);
  const [batchSize, setBatchSize] = useState(20); 
  const [preflightStatus, setPreflightStatus] = useState(null); 
  const [isPreflighting, setIsPreflighting] = useState(false);

  useEffect(() => {
    const fetchPrompts = async () => {
      const { data } = await supabase
        .from('prompts')
        .select('id, name, purpose')
        .eq('purpose', 'company_rating')
        .eq('is_archived', false);
      setPrompts(data || []);
    };
    fetchPrompts();
  }, []);

  const handleManualRate = async () => {
    setIsSavingManual(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          rating: parseInt(manualRating),
          rated_by: 'manual'
        })
        .eq('id', editingCompany.id);

      if (error) throw error;
      toast({ title: 'Rating saved', status: 'success' });
      fetchCompanies();
      onRatingClose();
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, status: 'error' });
    } finally {
      setIsSavingManual(false);
    }
  };
 
  const filteredCompanies = useMemo(() => { 
    return companies.filter(c => { 
      const nameForSearch = (c.display_name || c.name || '').toLowerCase();
      const normalizedForSearch = (c.name || '').toLowerCase();
      const searchTerm = search.toLowerCase();

      const matchesSearch = nameForSearch.includes(searchTerm) ||  
                           normalizedForSearch.includes(searchTerm); 
      
      // Tab-based filtering
      const matchesTab = tabIndex === 0 ? c.rating !== null : c.rating === null;

      const matchesRating = selectedRatings.length === 0 ? true : 
                           selectedRatings.includes(c.rating?.toString());
      return matchesSearch && matchesRating && matchesTab; 
    }); 
  }, [companies, search, selectedRatings, tabIndex]); 
 
  const toggleSelect = (id) => { 
    setSelectedIds(prev =>  
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id] 
    ); 
  }; 
 
  const toggleSelectAll = () => { 
    if (selectedIds.length === filteredCompanies.length) { 
      setSelectedIds([]); 
    } else { 
      setSelectedIds(filteredCompanies.map(c => c.id)); 
    } 
  }; 
 
  const handlePreflight = async () => { 
    setIsPreflighting(true); 
    try { 
      const res = await fetch('/api/admin/ai/preflight', { 
        headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } 
      }); 
      const data = await res.json(); 
      setPreflightStatus(data.ok ? 'ok' : 'error'); 
    } catch { 
      setPreflightStatus('error'); 
    } finally { 
      setIsPreflighting(false); 
    } 
  }; 
 
  const startBatch = async () => { 
    try { 
      const res = await fetch('/api/admin/ai/companies/rate-batch', { 
        method: 'POST', 
        headers: {  
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`  
        }, 
        body: JSON.stringify({ 
          company_ids: selectedIds.filter(id => { 
            const c = companies.find(comp => comp.id === id); 
            return c && c.rating === null; 
          }), 
          batch_size: batchSize, 
          prompt_id: batchPrompt === 'default' ? null : batchPrompt 
        }) 
      }); 
      const data = await res.json(); 
      if (data.batch_id) { 
        navigate(`/admin/ai-batches/${data.batch_id}`); 
      } else { 
        throw new Error(data.error || 'Failed to start batch'); 
      } 
    } catch (err) { 
      toast({ title: 'Batch failed', description: err.message, status: 'error' }); 
    } 
  }; 
 
  const handleExportSelected = () => {
    const selectedCompanies = companies.filter(c => selectedIds.includes(c.id));
    if (selectedCompanies.length === 0) return;

    const headers = ['Name', 'Display Name', 'Rating', 'Job Count'];
    const csvContent = [
      headers.join(','),
      ...selectedCompanies.map(c => [
        `"${c.name}"`,
        `"${c.display_name || ''}"`,
        c.rating || 'Unrated',
        c.job_count?.[0]?.count || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `companies_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const unratedSelected = selectedIds.filter(id => { 
    const c = companies.find(comp => comp.id === id); 
    return c && c.rating === null; 
  }).length; 

  const renderTable = () => (
    <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden"> 
      <Table variant="simple"> 
        <Thead bg="gray.50"> 
          <Tr> 
            <Th w="40px"> 
              <Checkbox  
                isChecked={selectedIds.length === filteredCompanies.length && filteredCompanies.length > 0} 
                isIndeterminate={selectedIds.length > 0 && selectedIds.length < filteredCompanies.length} 
                onChange={toggleSelectAll} 
              /> 
            </Th> 
            <Th>Name</Th> 
            <Th>Rating</Th> 
            <Th># Jobs</Th> 
            <Th>Rated At</Th> 
            <Th textAlign="right">Actions</Th> 
          </Tr> 
        </Thead> 
        <Tbody> 
          {loading ? ( 
            <Tr><Td colSpan={7} textAlign="center" py={10}><Spinner color="blue.500" /></Td></Tr> 
          ) : filteredCompanies.length === 0 ? ( 
            <Tr><Td colSpan={7} textAlign="center" py={10} color="gray.500">No companies found matching filters</Td></Tr> 
          ) : filteredCompanies.map(c => ( 
            <Tr key={c.id}> 
              <Td> 
                <Checkbox  
                  isChecked={selectedIds.includes(c.id)}  
                  onChange={() => toggleSelect(c.id)} 
                /> 
              </Td> 
              <Td> 
                <VStack align="start" spacing={0}> 
                  <Text fontWeight="bold">{c.display_name || c.name}</Text> 
                </VStack> 
              </Td> 
              <Td> 
                {c.rating ? ( 
                  <Badge colorScheme={c.rating >= 4 ? 'green' : c.rating >= 3 ? 'blue' : 'gray'}> 
                    {c.rating} Stars 
                  </Badge> 
                ) : ( 
                  <Badge colorScheme="gray" variant="outline">Unrated</Badge> 
                )} 
              </Td> 
              <Td>{c.job_count?.[0]?.count || 0}</Td> 
              <Td fontSize="sm" color="gray.500"> 
                {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '-'} 
              </Td> 
              <Td textAlign="right"> 
                <HStack justify="end" spacing={2}> 
                  {tabIndex === 1 && (
                    <Button
                      size="xs"
                      leftIcon={<Sparkles size={12} />}
                      colorScheme="purple"
                      onClick={() => navigate(`/admin/companies/${c.id}/rate`)}
                    >
                      Rate
                    </Button>
                  )}
                  <IconButton  
                    size="sm"  
                    icon={<Eye size={14} />}  
                    variant="ghost"  
                    aria-label="View jobs"  
                    onClick={() => navigate(`/admin/jobs?company_id=${c.id}`)} 
                  /> 
                  <IconButton  
                    size="sm"  
                    icon={<Settings2 size={14} />}  
                    variant="ghost"  
                    aria-label="Edit rating"  
                    onClick={() => { setEditingCompany(c); setManualRating(c.rating?.toString() || '3'); onRatingOpen(); }} 
                  /> 
                </HStack> 
              </Td> 
            </Tr> 
          ))} 
        </Tbody> 
      </Table> 
    </Box>
  );

  return ( 
    <Box> 
      <HStack justify="space-between" mb={6}> 
        <VStack align="stretch" spacing={0}> 
          <Heading size="lg">Companies</Heading> 
          <Text color="gray.500" fontSize="sm">Manage ratings and AI insights for {companies.length} companies</Text> 
        </VStack> 
        <Button  
          variant="outline"  
          leftIcon={<Settings2 size={16} />}  
          onClick={() => setShowTools(!showTools)} 
          rightIcon={<ChevronDown size={16} style={{ transform: showTools ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />} 
        > 
          Tools 
        </Button> 
      </HStack> 
 
      <Collapse in={showTools}> 
        <Box p={4} bg="white" borderRadius="lg" border="1px" borderColor="gray.200" mb={6}> 
          <HStack spacing={4}> 
            <Button leftIcon={<Download size={16} />} variant="ghost" size="sm">Export All</Button> 
            <Button leftIcon={<UploadIcon size={16} />} variant="ghost" size="sm">Import Excel</Button> 
          </HStack> 
        </Box> 
      </Collapse> 
 
      {/* Section A: Filter Bar */} 
      <Box p={4} bg="white" borderRadius="lg" border="1px" borderColor="gray.200" mb={6}> 
        <HStack spacing={4}> 
          <HStack flex={1} bg="gray.50" px={3} borderRadius="md" border="1px" borderColor="gray.200"> 
            <Search size={16} color="gray" /> 
            <Input  
              variant="unstyled"  
              placeholder="Search by name..."  
              py={2} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            /> 
          </HStack> 
          <Menu closeOnSelect={false}>
            <MenuButton 
              as={Button} 
              variant="outline" 
              rightIcon={<ChevronDown size={16} />}
              w="180px"
              textAlign="left"
              fontWeight="normal"
            >
              {selectedRatings.length === 0 
                ? 'Rating: Any' 
                : `Rating: ${selectedRatings.sort().map(r => `${r}★`).join(', ')}`}
            </MenuButton>
            <MenuList zIndex={10}>
              <MenuOptionGroup 
                title="Select Ratings" 
                type="checkbox" 
                value={selectedRatings}
                onChange={(vals) => setSelectedRatings(vals)}
              >
                <MenuItemOption value="1">1 Star</MenuItemOption>
                <MenuItemOption value="2">2 Stars</MenuItemOption>
                <MenuItemOption value="3">3 Stars</MenuItemOption>
                <MenuItemOption value="4">4 Stars</MenuItemOption>
                <MenuItemOption value="5">5 Stars</MenuItemOption>
              </MenuOptionGroup>
            </MenuList>
          </Menu>
          <IconButton  
            icon={<RotateCcw size={18} />}  
            variant="ghost"  
            onClick={() => { setSearch(''); setSelectedRatings([]); }} 
            aria-label="Reset filters" 
          /> 
        </HStack> 
      </Box> 
 
      {/* Section B: Tabs and Companies Table */} 
      <Tabs variant="enclosed" colorScheme="blue" index={tabIndex} onChange={setTabIndex}>
        <TabList mb={4}>
          <Tab fontWeight="bold">Rated Companies ({companies.filter(c => c.rating !== null).length})</Tab>
          <Tab fontWeight="bold">Unrated Companies ({companies.filter(c => c.rating === null).length})</Tab>
        </TabList>

        <TabPanels>
          <TabPanel p={0}>
            {renderTable()}
          </TabPanel>
          <TabPanel p={0}>
            {renderTable()}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Manual Rating Modal */}
      <Modal isOpen={isRatingOpen} onClose={onRatingClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Rate {editingCompany?.display_name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} py={4}>
              <FormControl>
                <FormLabel>Manual Rating</FormLabel>
                <RadioGroup value={manualRating} onChange={setManualRating}>
                  <Stack direction="row" spacing={5}>
                    <Radio value="1">1 ★</Radio>
                    <Radio value="2">2 ★</Radio>
                    <Radio value="3">3 ★</Radio>
                    <Radio value="4">4 ★</Radio>
                    <Radio value="5">5 ★</Radio>
                  </Stack>
                </RadioGroup>
              </FormControl>
              <Box p={3} bg="blue.50" borderRadius="md" w="full">
                <Text fontSize="xs" color="blue.700">
                  Manual ratings are tagged as <b>manual</b> source.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRatingClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleManualRate} isLoading={isSavingManual}>Save Rating</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
 
      {/* Section C: Floating Action Bar */} 
      {selectedIds.length > 0 && ( 
        <Box  
          position="fixed"  
          bottom={8}  
          left="50%"  
          transform="translateX(-50%)"  
          bg="blue.600"  
          color="white"  
          px={6}  
          py={3}  
          borderRadius="full"  
          boxShadow="xl" 
          zIndex={10} 
        > 
          <HStack spacing={6}> 
            <Text fontWeight="bold"> 
              Selected: {selectedIds.length} ({unratedSelected} unrated) 
            </Text> 
            <Divider orientation="vertical" h="20px" borderColor="whiteAlpha.400" /> 
            <HStack spacing={2}> 
              <Button  
                size="sm"  
                colorScheme="whiteAlpha"  
                variant="solid" 
                leftIcon={<ArrowRight size={14} />} 
                isDisabled={unratedSelected === 0} 
                onClick={onBatchOpen} 
              > 
                Send unrated to AI 
              </Button> 
              <Menu> 
                <MenuButton as={Button} size="sm" colorScheme="whiteAlpha" variant="ghost" rightIcon={<ChevronDown size={14} />}> 
                  Export 
                </MenuButton> 
                <MenuList color="gray.800"> 
                  <MenuItem onClick={handleExportSelected}>Export Selected</MenuItem> 
                  <MenuItem onClick={() => {
                    const originalSelected = selectedIds;
                    setSelectedIds(companies.filter(c => c.rating === null).map(c => c.id));
                    handleExportSelected();
                    setSelectedIds(originalSelected);
                  }}>Export Unrated Only</MenuItem> 
                </MenuList> 
              </Menu> 
              <Button size="sm" variant="ghost" colorScheme="whiteAlpha" onClick={() => setSelectedIds([])}>Clear</Button> 
            </HStack> 
          </HStack> 
        </Box> 
      )} 
 
      {/* Batch Composer Modal */} 
      <Modal isOpen={isBatchOpen} onClose={onBatchClose} size="md"> 
        <ModalOverlay /> 
        <ModalContent> 
          <ModalHeader>Rate {unratedSelected} companies with AI</ModalHeader> 
          <ModalCloseButton /> 
          <ModalBody> 
            <VStack align="stretch" spacing={4}> 
              <Box> 
                <Text fontWeight="bold" mb={2} fontSize="sm">Prompt</Text> 
                <Select value={batchPrompt} onChange={(e) => setBatchPrompt(e.target.value)}> 
                  <option value="default">Default — Rate companies</option> 
                  {prompts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select> 
              </Box> 
              <Box> 
                <HStack justify="space-between" mb={2}> 
                  <Text fontWeight="bold" fontSize="sm">Batch size</Text> 
                  <Tooltip label="Companies per OpenAI call"> 
                    <Box><Settings2 size={12} /></Box> 
                  </Tooltip> 
                </HStack> 
                <Select value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value))}> 
                  <option value={10}>10</option> 
                  <option value={20}>20</option> 
                  <option value={50}>50</option> 
                </Select> 
              </Box> 
 
              <Box p={4} bg="gray.50" borderRadius="md" border="1px" borderColor="gray.200"> 
                <Text fontSize="xs" color="gray.500" fontWeight="bold" mb={2} textTransform="uppercase">Estimate (live)</Text> 
                <VStack align="stretch" spacing={1} fontSize="sm"> 
                  <HStack justify="space-between"> 
                    <Text>Calls:</Text> 
                    <Text fontWeight="mono">{Math.ceil(unratedSelected / batchSize)}</Text> 
                  </HStack> 
                  <HStack justify="space-between"> 
                    <Text>Est. tokens:</Text> 
                    <Text fontWeight="mono">~{unratedSelected * 120}</Text> 
                  </HStack> 
                  <HStack justify="space-between"> 
                    <Text>Est. cost:</Text> 
                    <Text fontWeight="mono" color="green.600">${((unratedSelected * 120 * 0.15) / 1000000).toFixed(5)}</Text> 
                  </HStack> 
                  <HStack justify="space-between"> 
                    <Text>Est. time:</Text> 
                    <Text fontWeight="mono">~{Math.ceil(unratedSelected / batchSize) * 3}s</Text> 
                  </HStack> 
                </VStack> 
              </Box> 
 
              <HStack> 
                <Button  
                  size="sm"  
                  variant="outline"  
                  leftIcon={preflightStatus === 'ok' ? <CheckCircle2 size={14} /> : preflightStatus === 'error' ? <XCircle size={14} /> : null} 
                  colorScheme={preflightStatus === 'ok' ? 'green' : preflightStatus === 'error' ? 'red' : 'gray'} 
                  onClick={handlePreflight} 
                  isLoading={isPreflighting} 
                > 
                  {preflightStatus === 'ok' ? 'Preflight Passed' : preflightStatus === 'error' ? 'Preflight Failed' : 'Run preflight'} 
                </Button> 
              </HStack> 
            </VStack> 
          </ModalBody> 
          <ModalFooter bg="gray.50" borderBottomRadius="md"> 
            <Button variant="ghost" mr={3} onClick={onBatchClose}>Cancel</Button> 
            <Button colorScheme="blue" rightIcon={<ArrowRight size={16} />} onClick={startBatch}>Go</Button> 
          </ModalFooter> 
        </ModalContent> 
      </Modal> 
    </Box> 
  ); 
} 
