import {
  Box, VStack, HStack, Heading, Text, Textarea, Button, Select, Badge,
  useToast, Stat, StatLabel, StatNumber, SimpleGrid, FormControl, FormLabel,
  Divider, Code, IconButton, Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  Spinner, Center
} from '@chakra-ui/react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Sparkles, ChevronLeft, Save } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

async function authedFetch(url, options = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export default function RateCompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userInput, setUserInput] = useState('');
  
  const [estimate, setEstimate] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  // Load company and prompts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [companyRes, promptsRes] = await Promise.all([
          supabase.from('companies').select('*').eq('id', id).single(),
          supabase.from('prompts').select('*').eq('purpose', 'rate_company').eq('is_archived', false)
        ]);

        if (companyRes.error) throw companyRes.error;
        setCompany(companyRes.data);
        setPrompts(promptsRes.data || []);

        // Load default prompt
        const defaultPrompt = promptsRes.data?.find(p => p.is_default) || promptsRes.data?.[0];
        if (defaultPrompt) {
          setSelectedPromptId(defaultPrompt.id);
          setSystemPrompt(defaultPrompt.system_prompt);
          
          // Render template
          const template = defaultPrompt.user_template;
          // Simple replacement since we don't have the full engine on frontend
          // The backend usually does this, but for the "playground" feel we do it here
          const rendered = template.replace('{{companies}}', JSON.stringify([{ name: companyRes.data.name }], null, 2));
          setUserInput(rendered);
        }
      } catch (err) {
        toast({ title: 'Error loading data', description: err.message, status: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Compute estimate
  const computeEstimate = useCallback(async () => {
    if (!systemPrompt && !userInput) { setEstimate(null); return; }
    setEstimateLoading(true);
    try {
      const res = await authedFetch('/api/admin/ai/estimate', {
        method: 'POST',
        body: JSON.stringify({ 
          system_prompt: systemPrompt, 
          user_input: userInput, 
          expected_output_tokens: 200 
        }),
      });
      const data = await res.json();
      if (res.ok) setEstimate(data);
    } catch (e) {
    } finally {
      setEstimateLoading(false);
    }
  }, [systemPrompt, userInput]);

  useEffect(() => {
    const t = setTimeout(computeEstimate, 500);
    return () => clearTimeout(t);
  }, [computeEstimate]);

  const handlePromptSelect = (promptId) => {
    const p = prompts.find(x => x.id === promptId);
    if (p) {
      setSelectedPromptId(p.id);
      setSystemPrompt(p.system_prompt);
      const rendered = p.user_template.replace('{{companies}}', JSON.stringify([{ name: company.name }], null, 2));
      setUserInput(rendered);
    }
  };

  const handleRunAndSave = async () => {
    setRunning(true);
    try {
      // 1. Run AI
      const res = await authedFetch(`/api/admin/ai/companies/${id}/rate-ai`, {
        method: 'POST',
        body: JSON.stringify({
          prompt_id: selectedPromptId,
          system_prompt: systemPrompt,
          user_input: userInput
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rate company');

      setResult(data.result);
      toast({ title: 'Company rated and updated!', status: 'success' });
      
      // Redirect back after a short delay
      setTimeout(() => navigate('/admin/companies?filter=unrated'), 2000);
    } catch (err) {
      toast({ title: 'Rating failed', description: err.message, status: 'error' });
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <Center h="60vh"><Spinner size="xl" /></Center>;

  return (
    <Box maxW="1200px" mx="auto" p={6}>
      <HStack mb={4} justify="space-between">
        <VStack align="start" spacing={1}>
          <Breadcrumb fontSize="sm" color="gray.500">
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} to="/admin/companies">Companies</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <Text>Rate {company.display_name || company.name}</Text>
            </BreadcrumbItem>
          </Breadcrumb>
          <Heading size="lg">Rate Company</Heading>
        </VStack>
        <Button leftIcon={<ChevronLeft size={16} />} variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
        <VStack align="stretch" spacing={6}>
          <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel fontWeight="bold">Template</FormLabel>
                <Select value={selectedPromptId} onChange={(e) => handlePromptSelect(e.target.value)}>
                  {prompts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="bold">System Prompt</FormLabel>
                <Textarea 
                  value={systemPrompt} 
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={10}
                  fontFamily="mono"
                  fontSize="sm"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="bold">User Input (JSON)</FormLabel>
                <Textarea 
                  value={userInput} 
                  onChange={(e) => setUserInput(e.target.value)}
                  rows={6}
                  fontFamily="mono"
                  fontSize="sm"
                />
              </FormControl>
            </VStack>
          </Box>
        </VStack>

        <VStack align="stretch" spacing={6}>
          <Box bg="blue.50" p={5} borderRadius="lg" border="1px" borderColor="blue.200">
            <HStack justify="space-between" mb={3}>
              <Heading size="sm" color="blue.800">Cost Estimate</Heading>
              {estimateLoading && <Sparkles size={14} />}
            </HStack>
            {estimate ? (
              <SimpleGrid columns={2} spacing={3}>
                <Stat>
                  <StatLabel fontSize="xs">Tokens</StatLabel>
                  <StatNumber fontSize="lg">{estimate.prompt_tokens + estimate.expected_completion_tokens}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel fontSize="xs">Est. Cost</StatLabel>
                  <StatNumber fontSize="lg" color="green.700">
                    ${estimate.estimated_cost_usd.toFixed(6)}
                  </StatNumber>
                </Stat>
              </SimpleGrid>
            ) : (
              <Text fontSize="sm" color="gray.500">Estimating...</Text>
            )}
          </Box>

          <Button 
            colorScheme="purple" 
            size="lg" 
            leftIcon={<Sparkles size={18} />} 
            isLoading={running}
            onClick={handleRunAndSave}
          >
            Generate & Update DB
          </Button>

          {result && (
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
              <Heading size="sm" mb={3}>AI Result</Heading>
              <Code as="pre" p={3} fontSize="xs" w="full" whiteSpace="pre-wrap" bg="gray.50" borderRadius="md">
                {result.response}
              </Code>
            </Box>
          )}
        </VStack>
      </SimpleGrid>
    </Box>
  );
}
