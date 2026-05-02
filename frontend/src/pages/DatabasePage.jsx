import { useState, useEffect } from 'react';
import {
  Box, Container, Flex, Heading, Text, Avatar, IconButton, Menu, MenuButton,
  MenuList, MenuItem, Divider, Icon, Button, VStack, HStack, Tabs, TabList,
  TabPanels, Tab, TabPanel, Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner,
  useToast, Stack, Card, CardBody
} from '@chakra-ui/react';
import {
  RefreshCw, AlertCircle, Database as DatabaseIcon
} from "lucide-react";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import AdminShell from './admin/AdminShell';

const PIPELINE_TABLES = [
  { id: 'pipeline_step1_output', label: 'Step 1: Scraper', apiPath: '/api/admin/database/step1-output' },
  { id: 'pipeline_job_links', label: 'Job Links', apiPath: '/api/admin/database/job-links' },
  { id: 'pipeline_companies', label: 'Companies', apiPath: '/api/admin/database/companies' },
  { id: 'pipeline_job_details', label: 'Job Details', apiPath: '/api/admin/database/job-details' },
  { id: 'pipeline_company_details', label: 'Company Details', apiPath: '/api/admin/database/company-details' },
];

export default function DatabasePage({ session, userData }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTable, setActiveTable] = useState(PIPELINE_TABLES[0].id);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTableData = async (tableMeta) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api(tableMeta.apiPath);
      setTableData(data || []);
    } catch (err) {
      console.error(`Error fetching ${tableMeta.id}:`, err);
      setError(err.message || 'Failed to fetch table data');
      toast({
        title: 'Fetch Error',
        description: err.message || 'Failed to fetch table data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const meta = PIPELINE_TABLES.find((t) => t.id === activeTable);
    if (meta) fetchTableData(meta);
  }, [activeTable]);

  const renderTable = () => {
    if (loading) {
      return (
        <Flex justify="center" align="center" py={20}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
        </Flex>
      );
    }

    if (error) {
      return (
        <Flex direction="column" align="center" py={20} color="red.500">
          <Icon as={AlertCircle} boxSize={12} mb={4} />
          <Text fontSize="lg" fontWeight="bold">{error}</Text>
          <Button mt={4} leftIcon={<RefreshCw size={16} />} onClick={() => {
            const meta = PIPELINE_TABLES.find((t) => t.id === activeTable);
            if (meta) fetchTableData(meta);
          }}>
            Retry
          </Button>
        </Flex>
      );
    }

    if (!tableData || tableData.length === 0) {
      return (
        <Flex direction="column" align="center" py={20} color="gray.400">
          <Icon as={DatabaseIcon} boxSize={12} mb={4} />
          <Text fontSize="lg">No data found in this table</Text>
        </Flex>
      );
    }

    const columns = Object.keys(tableData[0]);

    return (
      <Box overflowX="auto" borderRadius="xl" border="1px" borderColor="gray.200">
        <Table variant="simple" size="sm" bg="white">
          <Thead bg="gray.50">
            <Tr>
              {columns.map((col) => (
                <Th key={col} whiteSpace="nowrap" py={4}>{col.replace(/_/g, ' ').toUpperCase()}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {tableData.map((row, idx) => (
              <Tr key={row.id || idx} _hover={{ bg: 'gray.50' }}>
                {columns.map((col) => {
                  const val = row[col];
                  return (
                    <Td key={col} maxW="300px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" py={3}>
                      {val === null ? (
                        <Text color="gray.300" as="span">null</Text>
                      ) : typeof val === 'object' ? (
                        JSON.stringify(val)
                      ) : String(val).length > 50 ? (
                        <Box as="span" title={String(val)}>{String(val).substring(0, 50)}...</Box>
                      ) : (
                        String(val)
                      )}
                    </Td>
                  );
                })}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  };

  return (
    <AdminShell session={session} userData={userData}>
      <Stack spacing={6}>
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="lg">Pipeline Database</Heading>
            <Text color="gray.500">View raw data from LinkedIn scraper pipeline</Text>
          </Box>
          <Button 
            leftIcon={<RefreshCw size={16} />} 
            variant="outline" 
            size="sm" 
            borderRadius="lg"
            onClick={() => {
              const meta = PIPELINE_TABLES.find((t) => t.id === activeTable);
              if (meta) fetchTableData(meta);
            }}
            isLoading={loading}
          >
            Refresh Data
          </Button>
        </Flex>

        <Card shadow="sm" borderRadius="2xl" border="1px" borderColor="gray.100">
          <CardBody p={0}>
            <Tabs 
              variant="line" 
              colorScheme="blue" 
              onChange={(index) => setActiveTable(PIPELINE_TABLES[index].id)}
            >
              <TabList px={6} pt={2}>
                {PIPELINE_TABLES.map((table) => (
                  <Tab 
                    key={table.id} 
                    fontSize="sm" 
                    fontWeight="semibold"
                    _selected={{ color: 'blue.600', borderColor: 'blue.600' }}
                  >
                    {table.label}
                  </Tab>
                ))}
              </TabList>
              <TabPanels p={6}>
                {PIPELINE_TABLES.map((table) => (
                  <TabPanel key={table.id} p={0}>
                    {activeTable === table.id && renderTable()}
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </Stack>
    </AdminShell>
  );
}
