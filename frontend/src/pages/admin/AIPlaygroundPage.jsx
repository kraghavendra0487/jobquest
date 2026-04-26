import { 
  Box, 
  VStack, 
  HStack, 
  Heading, 
  Text, 
  Textarea, 
  Button, 
  Select, 
  Divider, 
  Badge, 
  useToast, 
  Spinner, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText, 
  SimpleGrid, 
  Flex, 
  FormControl, 
  FormLabel, 
  Progress 
} from '@chakra-ui/react'; 
import { useState, useEffect } from 'react'; 
import { Play, Sparkles, AlertCircle, History } from 'lucide-react'; 
import { supabase } from '../../lib/supabaseClient'; 
 
export default function AIPlaygroundPage() { 
  const [prompts, setPrompts] = useState([]); 
  const [selectedPromptId, setSelectedPromptId] = useState(''); 
  const [systemPrompt, setSystemPrompt] = useState(''); 
  const [userInput, setUserInput] = useState(''); 
  const [loading, setLoading] = useState(false); 
  const [result, setResult] = useState(null); 
  const [spendInfo, setSpendInfo] = useState({ spent: 0, limit: 1.0 }); 
  const toast = useToast(); 
 
  useEffect(() => { 
    fetchPrompts(); 
    fetchSpend(); 
  }, []); 
 
  const fetchPrompts = async () => { 
    const { data } = await supabase 
      .from('prompts') 
      .select('id, name, system_prompt, user_template') 
      .eq('is_archived', false) 
      .order('name'); 
    setPrompts(data || []); 
  }; 
 
  const fetchSpend = async () => { 
    try { 
      const res = await fetch('/api/admin/ai/playground/spend', { // Note: need to implement this endpoint or compute here 
        headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } 
      }); 
      // Fallback to manual computation if endpoint not ready 
      const since = new Date(); 
      since.setHours(0,0,0,0); 
      const { data } = await supabase 
        .from('ai_usage_log') 
        .select('cost_usd') 
        .eq('purpose', 'playground') 
        .gte('created_at', since.toISOString()); 
      const spent = (data || []).reduce((sum, row) => sum + Number(row.cost_usd || 0), 0); 
      setSpendInfo({ spent, limit: 1.0 }); 
    } catch (err) { 
      console.error('Failed to fetch spend:', err); 
    } 
  }; 
 
  const handlePromptSelect = (id) => { 
    setSelectedPromptId(id); 
    if (id === 'custom') { 
      setSystemPrompt(''); 
      setUserInput(''); 
    } else { 
      const p = prompts.find(p => p.id === id); 
      setSystemPrompt(p.system_prompt); 
      setUserInput(p.user_template); 
    } 
  }; 
 
  const runPlayground = async () => { 
    setLoading(true); 
    setResult(null); 
    try { 
      const res = await fetch('/api/admin/ai/playground', { 
        method: 'POST', 
        headers: {  
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`  
        }, 
        body: JSON.stringify({ system_prompt: systemPrompt, user_input: userInput }) 
      }); 
       
      const data = await res.json(); 
      if (!res.ok) throw new Error(data.error || 'Playground run failed'); 
 
      setResult(data); 
      fetchSpend(); 
      toast({ title: 'Success', status: 'success', duration: 2000 }); 
    } catch (err) { 
      toast({ title: 'Run failed', description: err.message, status: 'error' }); 
    } finally { 
      setLoading(false); 
    } 
  }; 
 
  return ( 
    <Box maxW="1200px" mx="auto"> 
      <HStack justify="space-between" mb={8}> 
        <VStack align="stretch" spacing={0}> 
          <Heading size="lg">AI Playground</Heading> 
          <Text color="gray.500">Test prompts and preview model responses</Text> 
        </VStack> 
        <Box textAlign="right"> 
          <HStack spacing={4} mb={1}> 
            <Text fontSize="xs" fontWeight="bold" color="gray.500">DAILY SPEND LIMIT</Text> 
            <Badge colorScheme={spendInfo.spent > 0.8 ? 'orange' : 'green'}> 
              ${spendInfo.spent.toFixed(3)} / ${spendInfo.limit.toFixed(2)} 
            </Badge> 
          </HStack> 
          <Progress  
            value={(spendInfo.spent / spendInfo.limit) * 100}  
            size="xs"  
            borderRadius="full"  
            colorScheme={spendInfo.spent > 0.8 ? 'orange' : 'blue'} 
            w="200px" 
          /> 
        </Box> 
      </HStack> 
 
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}> 
        <VStack align="stretch" spacing={6}> 
          <Box bg="white" p={6} borderRadius="xl" border="1px" borderColor="gray.200"> 
            <VStack align="stretch" spacing={4}> 
              <FormControl> 
                <FormLabel fontSize="sm" fontWeight="bold">Load Saved Prompt</FormLabel> 
                <Select  
                  placeholder="Select a prompt template..."  
                  value={selectedPromptId}  
                  onChange={(e) => handlePromptSelect(e.target.value)} 
                > 
                  <option value="custom">-- Custom / Blank --</option> 
                  {prompts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} 
                </Select> 
              </FormControl> 
 
              <FormControl> 
                <FormLabel fontSize="sm" fontWeight="bold">System Prompt</FormLabel> 
                <Textarea  
                  value={systemPrompt}  
                  onChange={(e) => setSystemPrompt(e.target.value)} 
                  placeholder="e.g. You are a helpful assistant..." 
                  rows={8} 
                  fontFamily="mono" 
                  fontSize="sm" 
                /> 
              </FormControl> 
 
              <FormControl> 
                <FormLabel fontSize="sm" fontWeight="bold">User Input</FormLabel> 
                <Textarea  
                  value={userInput}  
                  onChange={(e) => setUserInput(e.target.value)} 
                  placeholder="JSON or text input..." 
                  rows={6} 
                  fontFamily="mono" 
                  fontSize="sm" 
                /> 
              </FormControl> 
 
              <Button  
                colorScheme="blue"  
                size="lg"  
                leftIcon={<Play size={18} />}  
                isLoading={loading} 
                onClick={runPlayground} 
                isDisabled={!systemPrompt || !userInput} 
              > 
                Run Prompt 
              </Button> 
            </VStack> 
          </Box> 
        </VStack> 
 
        <VStack align="stretch" spacing={6}> 
          <Box  
            bg={result ? 'white' : 'gray.50'}  
            p={6}  
            borderRadius="xl"  
            border="1px"  
            borderColor="gray.200"  
            minH="400px" 
            position="relative" 
          > 
            {!result && !loading && ( 
              <Flex direction="column" align="center" justify="center" h="400px" color="gray.400"> 
                <Sparkles size={48} /> 
                <Text mt={4} fontWeight="medium">Response will appear here</Text> 
              </Flex> 
            )} 
 
            {loading && ( 
              <Flex direction="column" align="center" justify="center" h="400px"> 
                <Spinner size="xl" color="blue.500" thickness="4px" /> 
                <Text mt={4} color="gray.500" fontWeight="medium">AI is thinking...</Text> 
              </Flex> 
            )} 
 
            {result && ( 
              <VStack align="stretch" spacing={6}> 
                <Box> 
                  <HStack justify="space-between" mb={3}> 
                    <Heading size="xs" textTransform="uppercase" color="gray.500">Response</Heading> 
                    <Badge colorScheme="green">Success</Badge> 
                  </HStack> 
                  <Box  
                    p={4}  
                    bg="gray.900"  
                    color="green.400"  
                    borderRadius="lg"  
                    fontFamily="mono"  
                    fontSize="sm"  
                    whiteSpace="pre-wrap" 
                    overflowY="auto" 
                    maxH="400px" 
                  > 
                    {result.response} 
                  </Box> 
                </Box> 
 
                <SimpleGrid columns={2} spacing={4}> 
                  <Stat size="sm" p={3} border="1px" borderColor="gray.100" borderRadius="md"> 
                    <StatLabel color="gray.500">Tokens</StatLabel> 
                    <StatNumber fontSize="md">{result.prompt_tokens} + {result.completion_tokens}</StatNumber> 
                    <StatHelpText mb={0}>{result.prompt_tokens + result.completion_tokens} total</StatHelpText> 
                  </Stat> 
                  <Stat size="sm" p={3} border="1px" borderColor="gray.100" borderRadius="md"> 
                    <StatLabel color="gray.500">Cost</StatLabel> 
                    <StatNumber fontSize="md" color="green.600">${result.cost_usd.toFixed(5)}</StatNumber> 
                    <StatHelpText mb={0}>{result.model}</StatHelpText> 
                  </Stat> 
                  <Stat size="sm" p={3} border="1px" borderColor="gray.100" borderRadius="md"> 
                    <StatLabel color="gray.500">Duration</StatLabel> 
                    <StatNumber fontSize="md">{result.duration_ms} ms</StatNumber> 
                  </Stat> 
                </SimpleGrid> 
              </VStack> 
            )} 
          </Box> 
 
          <Box p={4} borderRadius="lg" bg="orange.50" border="1px" borderColor="orange.100"> 
            <HStack spacing={3} align="start"> 
              <AlertCircle size={18} color="#DD6B20" style={{ marginTop: '2px' }} /> 
              <VStack align="start" spacing={1}> 
                <Text fontSize="sm" fontWeight="bold" color="orange.800">Safety & Limits</Text> 
                <Text fontSize="xs" color="orange.700"> 
                  Playground calls are logged to <code>ai_usage_log</code> under purpose <code>playground</code>.  
                  Large prompts may be truncated. Avoid sending sensitive production keys or PII. 
                </Text> 
              </VStack> 
            </HStack> 
          </Box> 
        </VStack> 
      </SimpleGrid> 
    </Box> 
  ); 
} 
