import { 
  Box, 
  VStack, 
  HStack, 
  Heading, 
  Text, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Checkbox, 
  Badge, 
  Button, 
  IconButton, 
  Accordion, 
  AccordionItem, 
  AccordionButton, 
  AccordionPanel, 
  AccordionIcon, 
  useToast, 
  Spinner, 
  Flex, 
  Divider, 
  Popover, 
  PopoverTrigger, 
  PopoverContent, 
  PopoverHeader, 
  PopoverBody, 
  PopoverArrow, 
  PopoverCloseButton, 
  Input, 
  ButtonGroup,
  Tooltip
} from '@chakra-ui/react'; 
import { useState, useEffect, useMemo } from 'react'; 
import { Check, X, AlertCircle, Building2, ExternalLink } from 'lucide-react'; 
import { supabase } from '../../lib/supabaseClient'; 
 
export default function ApprovalQueuePage() { 
  const [items, setItems] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [selectedIds, setSelectedIds] = useState([]); 
  const [rejectReason, setRejectReason] = useState(''); 
  const toast = useToast(); 
 
  useEffect(() => { 
    fetchQueue(); 
  }, []); 
 
  const fetchQueue = async () => { 
    setLoading(true); 
    try { 
      const { data, error } = await supabase 
        .from('job_school_visibility') 
        .select(` 
          id, job_id, school_id, ai_reason, created_at, 
          jobs(title, companies(name, display_name)), 
          schools(name) 
        `) 
        .eq('is_approved', false) 
        .is('rejected_at', null) 
        .order('created_at', { ascending: false }); 
 
      if (error) throw error; 
      setItems(data || []); 
    } catch (err) { 
      toast({ title: 'Fetch failed', description: err.message, status: 'error' }); 
    } finally { 
      setLoading(false); 
    } 
  }; 
 
  const groupedItems = useMemo(() => { 
    const groups = {}; 
    items.forEach(item => { 
      const schoolName = item.schools?.name || 'Unknown School'; 
      if (!groups[schoolName]) groups[schoolName] = []; 
      groups[schoolName].push(item); 
    }); 
    return groups; 
  }, [items]); 
 
  const handleApprove = async (ids) => { 
    const idArray = Array.isArray(ids) ? ids : [ids]; 
    try { 
      const { error } = await supabase 
        .from('job_school_visibility') 
        .update({  
          is_approved: true,  
          approved_at: new Date().toISOString(), 
          approved_by: (await supabase.auth.getUser()).data.user?.id 
        }) 
        .in('id', idArray); 
 
      if (error) throw error; 
      toast({ title: `Approved ${idArray.length} items`, status: 'success' }); 
      fetchQueue(); 
      setSelectedIds([]); 
    } catch (err) { 
      toast({ title: 'Approval failed', description: err.message, status: 'error' }); 
    } 
  }; 
 
  const handleReject = async (ids) => { 
    const idArray = Array.isArray(ids) ? ids : [ids]; 
    try { 
      const { error } = await supabase 
        .from('job_school_visibility') 
        .update({  
          rejected_at: new Date().toISOString(), 
          reject_reason: rejectReason || null 
        }) 
        .in('id', idArray); 
 
      if (error) throw error; 
      toast({ title: `Rejected ${idArray.length} items`, status: 'info' }); 
      fetchQueue(); 
      setSelectedIds([]); 
      setRejectReason(''); 
    } catch (err) { 
      toast({ title: 'Rejection failed', description: err.message, status: 'error' }); 
    } 
  }; 
 
  if (loading && items.length === 0) { 
    return ( 
      <Flex h="60vh" align="center" justify="center"> 
        <Spinner size="xl" color="blue.500" thickness="4px" /> 
      </Flex> 
    ); 
  } 
 
  return ( 
    <Box> 
      <VStack align="stretch" spacing={6}> 
        <VStack align="stretch" spacing={0}> 
          <Heading size="lg">Approval Queue</Heading> 
          <Text color="gray.500" fontSize="sm">Review AI-generated visibility tags before they go live</Text> 
        </VStack> 
 
        {items.length === 0 ? ( 
          <Box p={10} bg="white" borderRadius="xl" border="1px" borderColor="gray.200" textAlign="center"> 
            <Check size={48} color="#38A169" style={{ margin: '0 auto 16px' }} /> 
            <Heading size="md" mb={2}>Queue Clear!</Heading> 
            <Text color="gray.500">All tags have been reviewed.</Text> 
          </Box> 
        ) : ( 
          <Accordion allowMultiple defaultIndex={[0]}>
            {Object.entries(groupedItems).map(([schoolName, schoolItems]) => ( 
              <AccordionItem key={schoolName} bg="white" border="1px" borderColor="gray.200" borderRadius="lg" mb={4} overflow="hidden"> 
                <AccordionButton py={4} _hover={{ bg: 'gray.50' }}> 
                  <HStack flex="1" spacing={4}> 
                    <Text fontWeight="bold">{schoolName}</Text> 
                    <Badge colorScheme="blue" variant="subtle">{schoolItems.length} pending</Badge> 
                  </HStack> 
                  <AccordionIcon /> 
                </AccordionButton> 
                <AccordionPanel p={0} borderTop="1px" borderColor="gray.100"> 
                  <Table variant="simple" size="sm"> 
                    <Thead bg="gray.50"> 
                      <Tr> 
                        <Th w="40px"> 
                          <Checkbox  
                            isChecked={schoolItems.length > 0 && schoolItems.every(i => selectedIds.includes(i.id))} 
                            onChange={() => { 
                              const itemIds = schoolItems.map(i => i.id); 
                              const allSelected = itemIds.every(id => selectedIds.includes(id)); 
                              if (allSelected) { 
                                setSelectedIds(prev => prev.filter(id => !itemIds.includes(id))); 
                              } else { 
                                setSelectedIds(prev => [...new Set([...prev, ...itemIds])]); 
                              } 
                            }} 
                          /> 
                        </Th> 
                        <Th>Job & Company</Th> 
                        <Th>AI Reasoning</Th> 
                        <Th textAlign="right">Actions</Th> 
                      </Tr> 
                    </Thead> 
                    <Tbody> 
                      {schoolItems.map(item => ( 
                        <Tr key={item.id}> 
                          <Td> 
                            <Checkbox  
                              isChecked={selectedIds.includes(item.id)}  
                              onChange={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])} 
                            /> 
                          </Td> 
                          <Td> 
                            <Text fontWeight="bold" fontSize="sm">{item.jobs?.title}</Text> 
                            <HStack spacing={1} color="gray.500" fontSize="xs"> 
                              <Building2 size={12} /> 
                              <Text>{item.jobs?.companies?.display_name || item.jobs?.companies?.name || 'Unknown Company'}</Text> 
                            </HStack> 
                          </Td> 
                          <Td> 
                            <Tooltip label={item.ai_reason}> 
                              <Text fontSize="xs" color="gray.600" noOfLines={2} maxW="400px"> 
                                {item.ai_reason} 
                              </Text> 
                            </Tooltip> 
                          </Td> 
                          <Td textAlign="right"> 
                            <HStack justify="flex-end" spacing={2}> 
                              <IconButton  
                                size="xs"  
                                icon={<Check size={14} />}  
                                colorScheme="green"  
                                variant="ghost"  
                                onClick={() => handleApprove(item.id)} 
                                aria-label="Approve" 
                              /> 
                              <Popover placement="left"> 
                                <PopoverTrigger> 
                                  <IconButton  
                                    size="xs"  
                                    icon={<X size={14} />}  
                                    colorScheme="red"  
                                    variant="ghost"  
                                    aria-label="Reject" 
                                  /> 
                                </PopoverTrigger> 
                                <PopoverContent> 
                                  <PopoverHeader fontWeight="bold" fontSize="sm">Reject Tag</PopoverHeader> 
                                  <PopoverArrow /> 
                                  <PopoverCloseButton /> 
                                  <PopoverBody> 
                                    <VStack spacing={3}> 
                                      <Input  
                                        size="sm"  
                                        placeholder="Reason (optional)"  
                                        value={rejectReason}  
                                        onChange={(e) => setRejectReason(e.target.value)} 
                                      /> 
                                      <Button size="xs" colorScheme="red" w="full" onClick={() => handleReject(item.id)}> 
                                        Confirm Rejection 
                                      </Button> 
                                    </VStack> 
                                  </PopoverBody> 
                                </PopoverContent> 
                              </Popover> 
                            </HStack> 
                          </Td> 
                        </Tr> 
                      ))} 
                    </Tbody> 
                  </Table> 
                </AccordionPanel> 
              </AccordionItem> 
            ))} 
          </Accordion> 
        )} 
      </VStack> 
 
      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <Box  
          position="fixed"  
          bottom={8}  
          left="50%"  
          transform="translateX(-50%)"  
          bg="gray.800"  
          color="white"  
          px={6}  
          py={3}  
          borderRadius="full"  
          boxShadow="xl" 
          zIndex={10} 
        > 
          <HStack spacing={6}> 
            <Text fontWeight="bold">Selected: {selectedIds.length}</Text> 
            <Divider orientation="vertical" h="20px" borderColor="whiteAlpha.400" /> 
            <ButtonGroup size="sm" variant="solid"> 
              <Button  
                colorScheme="green"  
                leftIcon={<Check size={14} />} 
                onClick={() => handleApprove(selectedIds)} 
              > 
                Approve all 
              </Button> 
              <Popover placement="top"> 
                <PopoverTrigger> 
                  <Button  
                    colorScheme="red"  
                    leftIcon={<X size={14} />} 
                  > 
                    Reject all 
                  </Button> 
                </PopoverTrigger> 
                <PopoverContent bg="white" color="gray.800"> 
                  <PopoverHeader fontWeight="bold" fontSize="sm">Reject Selected</PopoverHeader> 
                  <PopoverArrow /> 
                  <PopoverCloseButton /> 
                  <PopoverBody> 
                    <VStack spacing={3}> 
                      <Input  
                        size="sm"  
                        placeholder="Reason (optional)"  
                        value={rejectReason}  
                        onChange={(e) => setRejectReason(e.target.value)} 
                      /> 
                      <Button size="xs" colorScheme="red" w="full" onClick={() => handleReject(selectedIds)}> 
                        Confirm Rejection 
                      </Button> 
                    </VStack> 
                  </PopoverBody> 
                </PopoverContent> 
              </Popover> 
            </ButtonGroup> 
            <Button size="sm" variant="ghost" colorScheme="whiteAlpha" onClick={() => setSelectedIds([])}>Clear</Button> 
          </HStack> 
        </Box> 
      )} 
    </Box> 
  ); 
} 
