import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Button,
  Code,
  Divider,
  Progress,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft, RefreshCcw } from 'lucide-react';

export default function AIBatchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatchData();
    // Poll for updates if batch is still processing
    const interval = setInterval(() => {
      if (batch && batch.status === 'processing') {
        fetchBatchData();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id, batch?.status]);

  const fetchBatchData = async () => {
    try {
      const { data: batchData, error: batchError } = await supabase
        .from('ai_batches')
        .select('*')
        .eq('id', id)
        .single();

      if (batchError) throw batchError;
      setBatch(batchData);

      const { data: logsData, error: logsError } = await supabase
        .from('ai_batch_logs')
        .select('*')
        .eq('batch_id', id)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      setLogs(logsData || []);
    } catch (err) {
      console.error('Error fetching batch details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !batch) {
    return (
      <Box textAlign="center" py={20}>
        <Spinner size="xl" />
        <Text mt={4}>Loading batch results...</Text>
      </Box>
    );
  }

  if (!batch) {
    return (
      <Box textAlign="center" py={20}>
        <Text color="red.500">Batch not found</Text>
        <Button mt={4} onClick={() => navigate('/admin/ai-batches')}>Back to Batches</Button>
      </Box>
    );
  }

  const progress = (batch.processed_count / batch.total_count) * 100;

  return (
    <Box>
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <Button 
            leftIcon={<ArrowLeft size={16} />} 
            variant="ghost" 
            onClick={() => navigate('/admin/ai-batches')}
          >
            Back to Batches
          </Button>
          <Button 
            leftIcon={<RefreshCcw size={16} />} 
            onClick={fetchBatchData}
            isLoading={loading}
            size="sm"
          >
            Refresh
          </Button>
        </HStack>

        <Box bg="white" p={6} borderRadius="lg" border="1px" borderColor="gray.200">
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between">
              <VStack align="start" spacing={1}>
                <Heading size="md">Batch Results</Heading>
                <Text color="gray.500" fontSize="sm">ID: {batch.id}</Text>
              </VStack>
              <Badge colorScheme={batch.status === 'completed' ? 'green' : 'blue'} p={2} borderRadius="md">
                {batch.status.toUpperCase()}
              </Badge>
            </HStack>

            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="bold" fontSize="sm">Overall Progress</Text>
                <Text fontSize="sm">{batch.processed_count} / {batch.total_count} processed</Text>
              </HStack>
              <Progress value={progress} size="sm" borderRadius="full" colorScheme="blue" />
            </Box>

            <Divider />

            <Heading size="sm">Detailed Logs & Output</Heading>
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Status</Th>
                    <Th>Item Details</Th>
                    <Th>AI Output</Th>
                    <Th>Time</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.length === 0 ? (
                    <Tr><Td colSpan={4} textAlign="center" py={10} color="gray.500">No logs available yet</Td></Tr>
                  ) : logs.map(log => (
                    <Tr key={log.id}>
                      <Td>
                        <Badge colorScheme={log.status === 'success' ? 'green' : 'red'}>
                          {log.status}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontWeight="bold">{log.item_name || 'N/A'}</Text>
                        <Text fontSize="xs" color="gray.500">ID: {log.item_id}</Text>
                      </Td>
                      <Td maxW="400px">
                        {log.output ? (
                          <Box maxH="100px" overflowY="auto">
                            <Code fontSize="xs" display="block" whiteSpace="pre-wrap" p={2}>
                              {typeof log.output === 'string' ? log.output : JSON.stringify(log.output, null, 2)}
                            </Code>
                          </Box>
                        ) : (
                          <Text color="gray.400" fontStyle="italic">No output</Text>
                        )}
                        {log.error && (
                          <Text color="red.500" fontSize="xs" mt={1}>Error: {log.error}</Text>
                        )}
                      </Td>
                      <Td fontSize="xs">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
