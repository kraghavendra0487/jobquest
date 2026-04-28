import {
  Box, Grid, GridItem, VStack, HStack, Heading, Text, Button, Select,
  Textarea, useToast, Badge, Spinner, Center, Stat, StatLabel, StatNumber,
  SimpleGrid, Progress, Tooltip, IconButton
} from '@chakra-ui/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import WizardShell from './WizardShell';

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

export default function UploadWizardStep3() {
  const { upload_id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userTemplate, setUserTemplate] = useState('');

  const [estimate, setEstimate] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeBatch, setActiveBatch] = useState(null);
  const pollRef = useRef(null);

  const ratedCount = companies.filter(c => c.rating != null).length;
  const unratedCount = companies.length - ratedCount;
  const unratedIds = companies.filter(c => c.rating == null && !c.rating_locked).map(c => c.id);

  // Load companies for this upload
  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      // Get distinct company_ids in this upload
      const { data: jobs, error: je } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('upload_id', upload_id)
        .not('company_id', 'is', null);
      if (je) throw je;
      const ids = [...new Set(jobs.map(j => j.company_id))];
      if (ids.length === 0) { setCompanies([]); return; }
      const { data: cos, error: ce } = await supabase
        .from('companies')
        .select('id, name, display_name, rating, reason, rating_locked, rated_by, rated_by_model')
        .in('id', ids)
        .order('rating', { ascending: false, nullsLast: true })
        .order('name');
      if (ce) throw ce;
      setCompanies(cos || []);
    } catch (e) {
      toast({ title: 'Failed to load companies', description: e.message, status: 'error' });
    } finally { setLoading(false); }
  }, [upload_id, toast]);

  // Load prompts (rate_company purpose only)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('prompts')
        .select('id, name, system_prompt, user_template, is_default, version')
        .eq('purpose', 'rate_company')
        .eq('is_archived', false)
        .order('is_default', { ascending: false });
      const list = data || [];
      setPrompts(list);
      const def = list.find(p => p.is_default) || list[0];
      if (def) {
        setSelectedPromptId(def.id);
        setSystemPrompt(def.system_prompt || '');
        setUserTemplate(def.user_template || '');
      }
    })();
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  // Live estimate
  useEffect(() => {
    if (unratedIds.length === 0 || !systemPrompt) { setEstimate(null); return; }
    const t = setTimeout(async () => {
      try {
        const sampleNames = companies.filter(c => c.rating == null).slice(0, 20).map(c => ({ name: c.name }));
        const renderedUser = userTemplate.replace('{{companies}}', JSON.stringify(sampleNames));
        const res = await authedFetch('/api/admin/ai/estimate', {
          method: 'POST',
          body: JSON.stringify({ system_prompt: systemPrompt, user_input: renderedUser, expected_output_tokens: 400 }),
        });
        const data = await res.json();
        if (res.ok) {
          // Multiply by number of batches
          const batches = Math.ceil(unratedIds.length / 20);
          setEstimate({
            ...data,
            batches,
            total_cost_usd: data.estimated_cost_usd * batches,
          });
        }
      } catch {/* non-fatal */}
    }, 400);
    return () => clearTimeout(t);
  }, [systemPrompt, userTemplate, unratedIds.length, companies]);

  // Poll batch status
  const pollBatch = useCallback((batchId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await authedFetch(`/api/admin/ai/batches/${batchId}`);
        const data = await res.json();
        if (!res.ok) {
          clearInterval(pollRef.current);
          setRunning(false);
          toast({ title: 'Batch poll failed', description: data.error, status: 'error' });
          return;
        }
        setActiveBatch(data);
        if (['done', 'failed', 'cancelled'].includes(data.status)) {
          clearInterval(pollRef.current);
          setRunning(false);
          loadCompanies();
          toast({
            title: `Batch ${data.status}`,
            description: data.status === 'done' ? `Rated ${data.processed_count} companies` : data.error_message || '',
            status: data.status === 'done' ? 'success' : 'warning',
            duration: 4000,
          });
        }
      } catch (e) {
        clearInterval(pollRef.current);
        setRunning(false);
        toast({ title: 'Batch poll failed', description: e.message, status: 'error' });
      }
    }, 2000);
  }, [loadCompanies, toast]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleRunAI = async () => {
    if (unratedIds.length === 0) {
      toast({ title: 'Nothing to rate', description: 'All companies in this upload are already rated.', status: 'info' });
      return;
    }
    setRunning(true);
    try {
      const res = await authedFetch('/api/admin/ai/companies/rate-batch', {
        method: 'POST',
        body: JSON.stringify({
          company_ids: unratedIds,
          batch_size: 20,
          prompt_id: selectedPromptId,
          upload_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Batch started', status: 'info', duration: 1500 });
      pollBatch(data.batch_id);
    } catch (e) {
      setRunning(false);
      toast({ title: 'Failed to start batch', description: e.message, status: 'error' });
    }
  };

  // Inline rating edit
  const updateRating = async (companyId, newRating) => {
    const old = companies.find(c => c.id === companyId)?.rating;
    setCompanies(cs => cs.map(c => c.id === companyId ? { ...c, rating: newRating } : c));
    const { error } = await supabase
      .from('companies')
      .update({ rating: newRating, rated_by: 'human' })
      .eq('id', companyId);
    if (error) {
      // revert
      setCompanies(cs => cs.map(c => c.id === companyId ? { ...c, rating: old } : c));
      toast({ title: 'Update failed', description: error.message, status: 'error' });
    }
  };

  const handlePromptChange = (id) => {
    setSelectedPromptId(id);
    const p = prompts.find(x => x.id === id);
    if (p) { setSystemPrompt(p.system_prompt); setUserTemplate(p.user_template); }
  };

  return (
    <WizardShell activeStep={3}>
      <Grid templateColumns={{ base: '1fr', lg: '40% 60%' }} gap={6}>
        {/* LEFT — companies */}
        <GridItem>
          <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200" position="sticky" top={4}>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Companies in this upload</Heading>
              <IconButton icon={<RefreshCw size={14} />} size="xs" variant="ghost"
                onClick={loadCompanies} aria-label="Refresh" />
            </HStack>
            {loading ? (
              <Center py={8}><Spinner /></Center>
            ) : companies.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>No companies yet</Text>
            ) : (
              <VStack align="stretch" spacing={2} maxH="70vh" overflowY="auto">
                {companies.map(c => (
                  <HStack key={c.id} p={3} bg="gray.50" borderRadius="md" justify="space-between">
                    <VStack align="stretch" spacing={0} flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {c.display_name || c.name}
                      </Text>
                      {c.reason && (
                        <Tooltip label={c.reason} placement="bottom-start" hasArrow>
                          <Text fontSize="xs" color="gray.500" noOfLines={1}>{c.reason}</Text>
                        </Tooltip>
                      )}
                    </VStack>
                    <HStack spacing={2}>
                      <Select
                        size="xs" w="65px"
                        value={c.rating || ''}
                        onChange={(e) => updateRating(c.id, e.target.value ? Number(e.target.value) : null)}
                        isDisabled={c.rating_locked}
                      >
                        <option value="">—</option>
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                      </Select>
                      {c.rated_by === 'ai' && (
                        <Tooltip label={`Rated by AI (${c.rated_by_model || 'model'})`}><Badge colorScheme="purple" fontSize="2xs">AI</Badge></Tooltip>
                      )}
                      {c.rated_by === 'human' && <Badge colorScheme="green" fontSize="2xs">HUM</Badge>}
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>
        </GridItem>

        {/* RIGHT — prompt + run + insights */}
        <GridItem>
          <VStack align="stretch" spacing={4}>
            {/* Counts */}
            <SimpleGrid columns={2} spacing={4}>
              <Stat bg="white" p={4} borderRadius="lg" border="1px" borderColor="green.200">
                <StatLabel>Rated</StatLabel>
                <StatNumber color="green.600">{ratedCount}</StatNumber>
              </Stat>
              <Stat bg="white" p={4} borderRadius="lg" border="1px" borderColor="orange.200">
                <StatLabel>Unrated</StatLabel>
                <StatNumber color="orange.600">{unratedCount}</StatNumber>
              </Stat>
            </SimpleGrid>

            {/* Prompt picker */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <Heading size="sm">Rating prompt</Heading>
                  <Select size="sm" w="auto" value={selectedPromptId} onChange={(e) => handlePromptChange(e.target.value)}>
                    {prompts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} v{p.version}{p.is_default ? ' (default)' : ''}</option>
                    ))}
                  </Select>
                </HStack>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>SYSTEM</Text>
                  <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={5} fontFamily="mono" fontSize="xs" />
                </Box>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>USER TEMPLATE (use <code>{`{{companies}}`}</code>)</Text>
                  <Textarea value={userTemplate} onChange={(e) => setUserTemplate(e.target.value)} rows={3} fontFamily="mono" fontSize="xs" />
                </Box>
              </VStack>
            </Box>

            {/* Estimate */}
            <Box bg="blue.50" p={5} borderRadius="lg" border="1px" borderColor="blue.200">
              <Heading size="sm" mb={3} color="blue.800">Cost estimate (no API call)</Heading>
              {estimate ? (
                <SimpleGrid columns={3} spacing={3}>
                  <Stat><StatLabel fontSize="xs">Batches</StatLabel><StatNumber fontSize="lg">{estimate.batches}</StatNumber></Stat>
                  <Stat><StatLabel fontSize="xs">Per-batch tokens</StatLabel><StatNumber fontSize="lg">{estimate.prompt_tokens}</StatNumber></Stat>
                  <Stat>
                    <StatLabel fontSize="xs">Total est. cost</StatLabel>
                    <StatNumber fontSize="lg" color="green.700">${estimate.total_cost_usd.toFixed(5)}</StatNumber>
                  </Stat>
                </SimpleGrid>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  {unratedIds.length === 0 ? 'All companies rated.' : 'Adjust prompt to see estimate.'}
                </Text>
              )}
            </Box>

            {/* Run */}
            <Button
              colorScheme="blue" size="lg" leftIcon={<Sparkles size={16} />}
              onClick={handleRunAI} isLoading={running}
              loadingText={activeBatch ? `Running... ${activeBatch.processed_count || 0}/${activeBatch.total_count || unratedIds.length}` : 'Starting...'}
              isDisabled={unratedIds.length === 0}
            >
              Run AI rating ({unratedIds.length} unrated)
            </Button>

            {activeBatch && (
              <Box bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="bold" mb={2}>Batch progress</Text>
                <Progress
                  value={activeBatch.total_count ? (activeBatch.processed_count / activeBatch.total_count * 100) : 0}
                  size="sm" colorScheme={activeBatch.status === 'done' ? 'green' : 'blue'} mb={2}
                />
                <HStack justify="space-between" fontSize="xs" color="gray.600">
                  <Text>Status: <Badge>{activeBatch.status}</Badge></Text>
                  <Text>Cost so far: ${(activeBatch.cost_usd || 0).toFixed(5)}</Text>
                </HStack>
              </Box>
            )}

            {/* Next */}
            <HStack justify="flex-end" pt={4}>
              <Button
                colorScheme="green" rightIcon={<ArrowRight size={16} />}
                onClick={() => navigate(`/admin/categorization?upload_id=${upload_id}`)}
                isDisabled={ratedCount === 0}
              >
                Next: categorize jobs ({companies.filter(c => (c.rating || 0) >= 4).length} qualifying companies)
              </Button>
            </HStack>
          </VStack>
        </GridItem>
      </Grid>
    </WizardShell>
  );
}
