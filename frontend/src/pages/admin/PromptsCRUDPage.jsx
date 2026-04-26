import { 
  Box, 
  VStack, 
  HStack, 
  Heading, 
  Text, 
  Button, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel, 
  SimpleGrid, 
  Badge, 
  useDisclosure, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  ModalCloseButton, 
  FormControl, 
  FormLabel, 
  Input, 
  Textarea, 
  useToast, 
  Spinner, 
  IconButton, 
  Flex, 
  Code 
} from '@chakra-ui/react'; 
import { useState, useEffect } from 'react'; 
import { Plus, Edit2, Archive, CheckCircle2, Save, Eye } from 'lucide-react'; 
import { supabase } from '../../lib/supabaseClient'; 
 
export default function PromptsCRUDPage() { 
  const [prompts, setPrompts] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [activeTab, setActiveTab] = useState(0); 
  const toast = useToast(); 
  const { isOpen, onOpen, onClose } = useDisclosure(); 
 
  // Form State 
  const [editingPrompt, setEditingPrompt] = useState(null); 
  const [formName, setFormName] = useState(''); 
  const [formSystem, setFormSystem] = useState(''); 
  const [formUser, setFormUser] = useState(''); 
  const [testVars, setTestVars] = useState('{\n  "companies": [\n    { "name": "Google" },\n    { "name": "Stripe" }\n  ]\n}'); 
 
  const purposes = ['rate_company', 'categorize_job', 'general']; 
 
  useEffect(() => { 
    fetchPrompts(); 
  }, []); 
 
  const fetchPrompts = async () => { 
    setLoading(true); 
    try { 
      const { data, error } = await supabase 
        .from('prompts') 
        .select('*') 
        .eq('is_archived', false) 
        .order('version', { ascending: false }); 
 
      if (error) throw error; 
      setPrompts(data || []); 
    } catch (err) { 
      toast({ title: 'Error', description: err.message, status: 'error' }); 
    } finally { 
      setLoading(false); 
    } 
  }; 
 
  const handleEdit = (prompt) => { 
    setEditingPrompt(prompt); 
    setFormName(prompt.name); 
    setFormSystem(prompt.system_prompt); 
    setFormUser(prompt.user_template); 
    onOpen(); 
  }; 
 
  const handleSave = async () => { 
    try { 
      const newVersion = (editingPrompt?.version || 0) + 1; 
      const payload = { 
        name: formName, 
        purpose: editingPrompt?.purpose || purposes[activeTab], 
        system_prompt: formSystem, 
        user_template: formUser, 
        version: newVersion, 
        is_default: false, // New versions aren't default by default 
        created_by: (await supabase.auth.getUser()).data.user?.id 
      }; 
 
      const { error } = await supabase.from('prompts').insert(payload); 
      if (error) throw error; 
 
      toast({ title: 'Prompt saved', status: 'success' }); 
      fetchPrompts(); 
      onClose(); 
    } catch (err) { 
      toast({ title: 'Save failed', description: err.message, status: 'error' }); 
    } 
  }; 
 
  const setDefault = async (prompt) => { 
    try { 
      // 1. Unset existing default for this purpose 
      await supabase 
        .from('prompts') 
        .update({ is_default: false }) 
        .eq('purpose', prompt.purpose); 
       
      // 2. Set this one as default 
      const { error } = await supabase 
        .from('prompts') 
        .update({ is_default: true }) 
        .eq('id', prompt.id); 
 
      if (error) throw error; 
      toast({ title: 'Default updated', status: 'success' }); 
      fetchPrompts(); 
    } catch (err) { 
      toast({ title: 'Error', description: err.message, status: 'error' }); 
    } 
  }; 
 
  const renderPreview = (template, vars) => { 
    try { 
      const parsedVars = JSON.parse(vars); 
      return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => { 
        const v = parsedVars[key]; 
        return v ? (typeof v === 'string' ? v : JSON.stringify(v, null, 2)) : _m; 
      }); 
    } catch { 
      return 'Invalid test variables JSON'; 
    } 
  }; 
 
  return ( 
    <Box> 
      <HStack justify="space-between" mb={8}> 
        <VStack align="stretch" spacing={0}> 
          <Heading size="lg">Prompt Management</Heading> 
          <Text color="gray.500">Versioned system and user prompts for AI operations</Text> 
        </VStack> 
        <Button leftIcon={<Plus size={18} />} colorScheme="blue" onClick={() => { setEditingPrompt(null); onOpen(); }}> 
          New Prompt 
        </Button> 
      </HStack> 
 
      <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)}> 
        <TabList> 
          <Tab>Rate Company</Tab> 
          <Tab>Categorize Job</Tab> 
          <Tab>General</Tab> 
        </TabList> 
 
        <TabPanels> 
          {purposes.map(purpose => ( 
            <TabPanel key={purpose} px={0} py={6}> 
              {loading ? ( 
                <Flex justify="center" py={10}><Spinner /></Flex> 
              ) : ( 
                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}> 
                  {prompts.filter(p => p.purpose === purpose).map(prompt => ( 
                    <Box  
                      key={prompt.id}  
                      p={5}  
                      bg="white"  
                      borderRadius="xl"  
                      border="1px"  
                      borderColor={prompt.is_default ? 'blue.200' : 'gray.200'} 
                      boxShadow={prompt.is_default ? 'sm' : 'none'} 
                    > 
                      <HStack justify="space-between" mb={4}> 
                        <VStack align="start" spacing={1}> 
                          <HStack> 
                            <Text fontWeight="bold" fontSize="lg">{prompt.name}</Text> 
                            <Badge variant="subtle">v{prompt.version}</Badge> 
                            {prompt.is_default && <Badge colorScheme="blue">Default</Badge>} 
                          </HStack> 
                          <Text fontSize="xs" color="gray.400"> 
                            Last edited: {new Date(prompt.created_at).toLocaleString()} 
                          </Text> 
                        </VStack> 
                        <HStack spacing={2}> 
                          {!prompt.is_default && ( 
                            <Button size="xs" variant="ghost" leftIcon={<CheckCircle2 size={12} />} onClick={() => setDefault(prompt)}> 
                              Set Default 
                            </Button> 
                          )} 
                          <IconButton size="sm" icon={<Edit2 size={14} />} onClick={() => handleEdit(prompt)} aria-label="Edit" /> 
                          <IconButton size="sm" icon={<Archive size={14} />} variant="ghost" colorScheme="red" aria-label="Archive" /> 
                        </HStack> 
                      </HStack> 
                      <Box bg="gray.50" p={3} borderRadius="md" fontSize="xs"> 
                        <Text fontWeight="bold" color="gray.500" mb={1} textTransform="uppercase">System Prompt Snippet</Text> 
                        <Text noOfLines={3} color="gray.700" fontFamily="mono"> 
                          {prompt.system_prompt} 
                        </Text> 
                      </Box> 
                    </Box> 
                  ))} 
                </SimpleGrid> 
              )} 
            </TabPanel> 
          ))} 
        </TabPanels> 
      </Tabs> 
 
      {/* Edit Modal */} 
      <Modal isOpen={isOpen} onClose={onClose} size="6xl"> 
        <ModalOverlay /> 
        <ModalContent> 
          <ModalHeader>{editingPrompt ? `Edit ${editingPrompt.name}` : 'Create New Prompt'}</ModalHeader> 
          <ModalCloseButton /> 
          <ModalBody pb={6}> 
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}> 
              <VStack align="stretch" spacing={4}> 
                <FormControl isRequired> 
                  <FormLabel fontSize="sm" fontWeight="bold">Name</FormLabel> 
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Concise Rating v2" /> 
                </FormControl> 
 
                <FormControl isRequired> 
                  <FormLabel fontSize="sm" fontWeight="bold">System Prompt</FormLabel> 
                  <Textarea  
                    value={formSystem}  
                    onChange={(e) => setFormSystem(e.target.value)}  
                    rows={10}  
                    fontFamily="mono"  
                    fontSize="sm" 
                    placeholder="You are an expert recruiter..." 
                  /> 
                </FormControl> 
 
                <FormControl isRequired> 
                  <FormLabel fontSize="sm" fontWeight="bold">User Template</FormLabel> 
                  <Textarea  
                    value={formUser}  
                    onChange={(e) => setFormUser(e.target.value)}  
                    rows={6}  
                    fontFamily="mono"  
                    fontSize="sm" 
                    placeholder='{ "companies": {{companies}} }' 
                  /> 
                  <Text fontSize="xs" color="gray.500" mt={1}>Available placeholders: {activeTab === 0 ? '{{companies}}' : '{{job}}'}</Text> 
                </FormControl> 
              </VStack> 
 
              <VStack align="stretch" spacing={4}> 
                <Box border="1px" borderColor="gray.200" borderRadius="lg" p={4} bg="gray.50"> 
                  <HStack justify="space-between" mb={4}> 
                    <Heading size="xs" textTransform="uppercase" color="gray.500">Live Preview</Heading> 
                    <Badge colorScheme="blue">Rendered Output</Badge> 
                  </HStack> 
                   
                  <VStack align="stretch" spacing={4}> 
                    <Box> 
                      <Text fontWeight="bold" fontSize="xs" mb={1} color="gray.500">SYSTEM:</Text> 
                      <Box p={3} bg="white" border="1px" borderColor="gray.200" borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" fontFamily="mono"> 
                        {formSystem || '—'} 
                      </Box> 
                    </Box> 
                    <Box> 
                      <Text fontWeight="bold" fontSize="xs" mb={1} color="gray.500">USER PAYLOAD:</Text> 
                      <Box p={3} bg="white" border="1px" borderColor="gray.200" borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" fontFamily="mono"> 
                        {renderPreview(formUser, testVars)} 
                      </Box> 
                    </Box> 
 
                    <Divider /> 
 
                    <Box> 
                      <FormLabel fontSize="xs" fontWeight="bold" color="gray.500">TEST VARIABLES (JSON):</FormLabel> 
                      <Textarea  
                        value={testVars}  
                        onChange={(e) => setTestVars(e.target.value)}  
                        rows={5}  
                        fontSize="xs"  
                        fontFamily="mono" 
                        bg="white" 
                      /> 
                    </Box> 
 
                    <HStack justify="space-between" fontSize="xs" color="gray.500"> 
                      <Text>Estimated tokens: ~{Math.ceil((formSystem.length + formUser.length) / 4)}</Text> 
                    </HStack> 
                  </VStack> 
                </Box> 
              </VStack> 
            </SimpleGrid> 
          </ModalBody> 
          <ModalFooter borderTop="1px" borderColor="gray.100"> 
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button> 
            <Button colorScheme="blue" leftIcon={<Save size={18} />} onClick={handleSave}> 
              Save as Version {editingPrompt ? editingPrompt.version + 1 : 1} 
            </Button> 
          </ModalFooter> 
        </ModalContent> 
      </Modal> 
    </Box> 
  ); 
} 
