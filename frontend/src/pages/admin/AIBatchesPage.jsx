import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Button,
  Spinner,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Eye, Clock } from 'lucide-react';

export default function AIBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green';
      case 'processing': return 'blue';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box>
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <Box>
            <Heading size="lg">AI Batches</Heading>
            <Text color="gray.500">Monitor and view results of AI rating and categorization tasks</Text>
          </Box>
          <Button leftIcon={<Clock size={16} />} onClick={fetchBatches} size="sm" variant="outline">
            Refresh
          </Button>
        </HStack>

        <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
          <Table variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th>Started At</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Progress</Th>
                <Th textAlign="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={5} textAlign="center" py={10}><Spinner /></Td></Tr>
              ) : batches.length === 0 ? (
                <Tr><Td colSpan={5} textAlign="center" py={10} color="gray.500">No batches found</Td></Tr>
              ) : batches.map(b => (
                <Tr key={b.id}>
                  <Td fontSize="sm">
                    {new Date(b.created_at).toLocaleString()}
                  </Td>
                  <Td>
                    <Badge variant="outline" colorScheme="purple">{b.batch_type}</Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(b.status)}>{b.status}</Badge>
                  </Td>
                  <Td>
                    <Text fontSize="sm" fontWeight="bold">
                      {b.processed_count} / {b.total_count}
                    </Text>
                  </Td>
                  <Td textAlign="right">
                    <Button 
                      size="sm" 
                      leftIcon={<Eye size={14} />} 
                      onClick={() => navigate(`/admin/ai-batches/${b.id}`)}
                      variant="ghost"
                    >
                      View Results
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </VStack>
    </Box>
  );
}
