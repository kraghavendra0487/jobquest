import { 
  Box, VStack, HStack, Heading, Text, Textarea, Button, Select, Badge, Switch,
  useToast, Stat, StatLabel, StatNumber, SimpleGrid, FormControl, FormLabel, 
  Progress, Code, Divider, Alert, AlertIcon, NumberInput, NumberInputField
} from '@chakra-ui/react';
import { useState, useEffect, useCallback } from 'react';
import { Play, Sparkles } from 'lucide-react';
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

export default function AIPlaygroundPage() {
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userInput, setUserInput] = useState('');
  const [jsonMode, setJsonMode] = useState(true);
  const [wrapInput, setWrapInput] = useState(false);
  const [expectedOutputTokens, setExpectedOutputTokens] = useState(200);

  const [estimate, setEstimate] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [spendToday, setSpendToday] = useState(0);
  const toast = useToast();

  // Load prompts on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('prompts')
        .select('id, name, purpose, system_prompt, user_template')
        .eq('is_archived', false)
        .order('name');
      setPrompts(data || []);
    })();
  }, []);

  // Compute estimate (debounced)
  const computeEstimate = useCallback(async () => {
    if (!systemPrompt && !userInput) { setEstimate(null); return; }
    setEstimateLoading(true);
    try {
      const res = await authedFetch('/api/admin/ai/estimate', {
        method: 'POST',
        body: JSON.stringify({ 
          system_prompt: systemPrompt, 
          user_input: userInput, 
          expected_output_tokens: expectedOutputTokens 
        }),
      });
      const data = await res.json();
      if (res.ok) setEstimate(data);
    } catch (e) {
      // estimate failures are non-fatal
    } finally {
      setEstimateLoading(false);
    }
  }, [systemPrompt, userInput, expectedOutputTokens]);

  useEffect(() => {
    const t = setTimeout(computeEstimate, 400);
    return () => clearTimeout(t);
  }, [computeEstimate]);

  const handlePromptSelect = (id) => {
    setSelectedPromptId(id);
    if (id === 'custom' || !id) {
      setSystemPrompt(''); setUserInput('');
    } else {
      const p = prompts.find(x => x.id === id);
      if (p) { setSystemPrompt(p.system_prompt || ''); setUserInput(p.user_template || ''); }
    }
  };

  const runPlayground = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await authedFetch('/api/admin/ai/playground', {
        method: 'POST',
        body: JSON.stringify({ 
          system_prompt: systemPrompt, 
          user_input: userInput, 
          json_mode: jsonMode,
          wrap_input: wrapInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
      if (data.spent_today) setSpendToday(data.spent_today);
      toast({ title: 'Run complete', status: 'success', duration: 2000 });
    } catch (err) {
      toast({ title: 'Run failed', description: err.message, status: 'error', duration: 5000 });
    } finally {
      setRunning(false);
    }
  };

  const overBudget = estimate && estimate.estimated_cost_usd > 1.0;
  const warnBudget = estimate && estimate.estimated_cost_usd > 0.50 && !overBudget;

  return (
    <Box maxW="1200px" mx="auto" p={6}>
      <HStack justify="space-between" mb={6}>
        <VStack align="stretch" spacing={0}>
          <Heading size="lg">AI Playground</Heading>
          <Text color="gray.500" fontSize="sm">
            Test prompts. See token + cost estimate before sending. Daily spend cap: $1.
          </Text>
        </VStack>
        <Box textAlign="right">
          <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>TODAY</Text>
          <Badge colorScheme={spendToday > 0.8 ? 'red' : spendToday > 0.5 ? 'orange' : 'green'} fontSize="sm">
            ${spendToday.toFixed(4)} / $1.00
          </Badge>
          <Progress value={spendToday * 100} size="xs" mt={1} w="160px"
            colorScheme={spendToday > 0.8 ? 'red' : 'blue'} />
        </Box>
      </HStack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* LEFT: input */}
        <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
          <VStack align="stretch" spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="bold">Load saved prompt</FormLabel>
              <Select placeholder="Select template..." value={selectedPromptId}
                onChange={(e) => handlePromptSelect(e.target.value)}>
                <option value="custom">— Custom / Blank —</option>
                {prompts.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.purpose}] {p.name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="bold">System prompt</FormLabel>
              <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant..." rows={8}
                fontFamily="mono" fontSize="sm" />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="bold">User input</FormLabel>
              <Textarea value={userInput} onChange={(e) => setUserInput(e.target.value)}
                placeholder="Plain text or JSON..." rows={6}
                fontFamily="mono" fontSize="sm" />
            </FormControl>

            <HStack spacing={6}>
              <FormControl display="flex" alignItems="center">
                <Switch id="json-mode" isChecked={jsonMode}
                  onChange={(e) => setJsonMode(e.target.checked)} mr={2} />
                <FormLabel htmlFor="json-mode" fontSize="sm" mb={0}>Request JSON response</FormLabel>
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <Switch id="wrap" isChecked={wrapInput}
                  onChange={(e) => setWrapInput(e.target.checked)} mr={2} />
                <FormLabel htmlFor="wrap" fontSize="sm" mb={0}>
                  Wrap as {`{"input":...}`}
                </FormLabel>
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel fontSize="xs" color="gray.500">Expected output tokens (for estimate only)</FormLabel>
              <NumberInput value={expectedOutputTokens} min={10} max={4000}
                onChange={(_, n) => setExpectedOutputTokens(n || 200)} size="sm" maxW="120px">
                <NumberInputField />
              </NumberInput>
            </FormControl>
          </VStack>
        </Box>

        {/* RIGHT: estimate + result */}
        <VStack align="stretch" spacing={4}>
          <Box bg="blue.50" p={5} borderRadius="lg" border="1px" borderColor="blue.200">
            <HStack justify="space-between" mb={3}>
              <Heading size="sm" color="blue.800">Estimate (no API call)</Heading>
              {estimateLoading && <Sparkles size={14} />}
            </HStack>
            {estimate ? (
              <SimpleGrid columns={2} spacing={3}>
                <Stat>
                  <StatLabel fontSize="xs">Prompt tokens</StatLabel>
                  <StatNumber fontSize="lg">{estimate.prompt_tokens}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel fontSize="xs">Expected output</StatLabel>
                  <StatNumber fontSize="lg">{estimate.expected_completion_tokens}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel fontSize="xs">Est. cost</StatLabel>
                  <StatNumber fontSize="lg" color={overBudget ? 'red.600' : warnBudget ? 'orange.600' : 'green.700'}>
                    ${estimate.estimated_cost_usd.toFixed(6)}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel fontSize="xs">Model</StatLabel>
                  <StatNumber fontSize="md">{estimate.model}</StatNumber>
                </Stat>
              </SimpleGrid>
            ) : (
              <Text fontSize="sm" color="gray.500">Type to see estimate</Text>
            )}
            {warnBudget && (
              <Alert status="warning" mt={3} fontSize="sm" borderRadius="md">
                <AlertIcon /> Estimate is &gt;$0.50 — double-check before running
              </Alert>
            )}
            {overBudget && (
              <Alert status="error" mt={3} fontSize="sm" borderRadius="md">
                <AlertIcon /> Estimate exceeds $1 — Run is disabled. Shorten the prompt.
              </Alert>
            )}
          </Box>

          <Button colorScheme="blue" leftIcon={<Play size={16} />}
            onClick={runPlayground} isLoading={running} loadingText="Calling OpenAI..."
            isDisabled={overBudget || (!systemPrompt && !userInput)} size="lg">
            Run for real
          </Button>

          {result && (
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
              <Heading size="sm" mb={3}>Actual result</Heading>
              <SimpleGrid columns={2} spacing={3} mb={4}>
                <Stat><StatLabel fontSize="xs">Prompt</StatLabel><StatNumber fontSize="md">{result.prompt_tokens}</StatNumber></Stat>
                <Stat><StatLabel fontSize="xs">Completion</StatLabel><StatNumber fontSize="md">{result.completion_tokens}</StatNumber></Stat>
                <Stat><StatLabel fontSize="xs">Cost</StatLabel><StatNumber fontSize="md">${result.cost_usd.toFixed(6)}</StatNumber></Stat>
                <Stat><StatLabel fontSize="xs">Time</StatLabel><StatNumber fontSize="md">{result.duration_ms}ms</StatNumber></Stat>
              </SimpleGrid>
              <Divider mb={3} />
              <Text fontSize="xs" fontWeight="bold" mb={2}>RESPONSE</Text>
              <Code as="pre" p={3} fontSize="xs" w="full" whiteSpace="pre-wrap" overflowX="auto"
                bg="gray.50" borderRadius="md">{result.response}</Code>
            </Box>
          )}
        </VStack>
      </SimpleGrid>
    </Box>
  );
}
