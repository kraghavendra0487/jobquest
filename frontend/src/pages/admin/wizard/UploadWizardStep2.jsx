import {
  Box, VStack, HStack, Heading, Text, Button, useToast,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner, Center,
  Stat, StatLabel, StatNumber, SimpleGrid, Alert, AlertIcon
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import WizardShell from './WizardShell';

async function authedFetch(url, options = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, ...(options.headers || {}) },
  });
}

export default function UploadWizardStep2() {
  const { upload_id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch(`/api/admin/job-uploads/${upload_id}/preview-summary`);
        const data = await res.json();
        if (res.status === 410) {
          setExpired(true);
        } else if (!res.ok) {
          throw new Error(data.error);
        } else if (data.already_saved) {
          // skip ahead
          navigate(`/admin/upload-wizard/${upload_id}/rate`, { replace: true });
        } else {
          setSummary(data);
        }
      } catch (e) {
        toast({ title: 'Failed to load preview', description: e.message, status: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [upload_id, navigate, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authedFetch(`/api/admin/job-uploads/${upload_id}/save`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `Saved ${data.inserted} jobs`, status: 'success' });
      navigate(`/admin/upload-wizard/${upload_id}/rate`);
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <WizardShell activeStep={2}><Center py={20}><Spinner /></Center></WizardShell>;

  if (expired) {
    return (
      <WizardShell activeStep={2}>
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Preview expired</Text>
            <Text fontSize="sm">The server restarted or too much time passed. Please re-upload the file.</Text>
            <Button mt={3} size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/admin/upload-wizard')}>
              Back to upload
            </Button>
          </Box>
        </Alert>
      </WizardShell>
    );
  }

  return (
    <WizardShell activeStep={2}>
      <VStack align="stretch" spacing={6}>
        <Box bg="white" p={6} borderRadius="lg" border="1px" borderColor="gray.200">
          <Heading size="md" mb={4}>Preview summary</Heading>
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
            <Stat><StatLabel fontSize="xs">Total rows</StatLabel><StatNumber>{summary.total_rows}</StatNumber></Stat>
            <Stat><StatLabel fontSize="xs">Valid</StatLabel><StatNumber color="green.600">{summary.valid_rows}</StatNumber></Stat>
            <Stat><StatLabel fontSize="xs">New</StatLabel><StatNumber color="blue.600">{summary.new_rows}</StatNumber></Stat>
            <Stat><StatLabel fontSize="xs">Dup in file</StatLabel><StatNumber color="orange.600">{summary.duplicate_in_file}</StatNumber></Stat>
            <Stat><StatLabel fontSize="xs">Dup in DB</StatLabel><StatNumber color="gray.600">{summary.duplicate_in_db}</StatNumber></Stat>
          </SimpleGrid>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" border="1px" borderColor="gray.200">
          <Heading size="sm" mb={4}>Sample (first 10 normalized rows)</Heading>
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Title</Th>
                  <Th>Company</Th>
                  <Th>Location</Th>
                  <Th>Posted</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(summary.sample || []).map((row, i) => (
                  <Tr key={i}>
                    <Td fontSize="xs"><Text noOfLines={1}>{row.title}</Text></Td>
                    <Td fontSize="xs">{row.company}</Td>
                    <Td fontSize="xs">{row.location}</Td>
                    <Td fontSize="xs" color="gray.500">{row.posted_relative}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>

        <HStack justify="flex-end">
          <Button variant="ghost" onClick={() => navigate('/admin/upload-wizard')}>Cancel</Button>
          <Button 
            colorScheme="blue" 
            size="lg" 
            leftIcon={<Save size={18} />} 
            isLoading={saving}
            onClick={handleSave}
          >
            Save & Continue
          </Button>
        </HStack>
      </VStack>
    </WizardShell>
  );
}
