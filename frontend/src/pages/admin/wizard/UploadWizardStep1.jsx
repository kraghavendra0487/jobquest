import {
  Box, VStack, HStack, Heading, Text, Button, Input, useToast,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner, Center, IconButton, Icon
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Play, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import WizardShell from './WizardShell';

async function authedFetch(url, options = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, ...(options.headers || {}) },
  });
}

// Map status -> {step, label, color}
const STATUS_MAP = {
  previewed:    { step: 2, label: 'Awaiting save',     color: 'orange' },
  saved:        { step: 3, label: 'Ready to rate',     color: 'blue'   },
  rating:       { step: 3, label: 'Rating in progress', color: 'purple' },
  rated:        { step: 3, label: 'Rated',             color: 'green'  },
  categorizing: { step: 3, label: 'Categorizing',      color: 'purple' },
  done:         { step: 3, label: 'Done',              color: 'gray'   },
  failed:       { step: 1, label: 'Failed',            color: 'red'    },
};

export default function UploadWizardStep1() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInput = useRef();

  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('job_uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error) setHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => { loadHistory(); }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authedFetch('/api/admin/job-uploads/preview', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast({ title: 'Preview generated', status: 'success', duration: 1500 });
      navigate(`/admin/upload-wizard/${data.upload_id}/preview`);
    } catch (e) {
      toast({ title: 'Upload failed', description: e.message, status: 'error' });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const resumeUpload = (upload) => {
    const map = STATUS_MAP[upload.status] || STATUS_MAP.failed;
    if (map.step === 1) {
      toast({ title: 'This upload failed — please re-upload', status: 'warning' });
      return;
    }
    if (map.step === 2) {
      // status='previewed' but cache is gone after server restart → must re-upload
      toast({
        title: 'Preview expired',
        description: 'Re-upload the file to re-generate the preview.',
        status: 'warning',
      });
      return;
    }
    navigate(`/admin/upload-wizard/${upload.id}/rate`);
  };

  return (
    <WizardShell activeStep={1}>
      <Box bg="white" p={8} borderRadius="lg" border="1px" borderColor="gray.200" mb={6}>
        <VStack align="stretch" spacing={4}>
          <Heading size="md">Upload Excel file</Heading>
          <Text color="gray.600" fontSize="sm">
            LinkedIn job export (.xlsx). Companies and jobs are auto-deduped by canonical IDs.
          </Text>
          <HStack>
            <Input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFile(e.target.files?.[0])}
              isDisabled={uploading}
              p={1}
              display="none"
            />
            <Button
              leftIcon={<Upload size={16} />}
              colorScheme="blue"
              isLoading={uploading}
              loadingText="Parsing..."
              onClick={() => fileInput.current?.click()}
            >
              Choose file
            </Button>
          </HStack>
        </VStack>
      </Box>

      <Box bg="white" p={6} borderRadius="lg" border="1px" borderColor="gray.200">
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Upload History</Heading>
          <IconButton
            icon={<RefreshCw size={16} />}
            onClick={loadHistory}
            isLoading={loadingHistory}
            size="sm"
            variant="ghost"
            aria-label="Refresh"
          />
        </HStack>
        {loadingHistory ? (
          <Center py={8}><Spinner /></Center>
        ) : history.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={8}>No uploads yet</Text>
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>File</Th>
                <Th isNumeric>Rows</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {history.map((u) => {
                const m = STATUS_MAP[u.status] || STATUS_MAP.failed;
                return (
                  <Tr key={u.id}>
                    <Td>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{u.filename}</Text>
                    </Td>
                    <Td isNumeric fontSize="sm">{u.inserted_rows || u.valid_rows}</Td>
                    <Td><Badge colorScheme={m.color}>{m.label}</Badge></Td>
                    <Td fontSize="xs" color="gray.500">
                      {new Date(u.created_at).toLocaleString()}
                    </Td>
                    <Td>
                      <Button
                        size="xs"
                        colorScheme="blue"
                        leftIcon={<Play size={12} />}
                        onClick={() => resumeUpload(u)}
                        isDisabled={u.status === 'failed'}
                      >
                        Resume
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>
    </WizardShell>
  );
}
