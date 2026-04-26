import { 
  Box, 
  SimpleGrid, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText, 
  Heading, 
  Text, 
  VStack, 
  HStack, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Badge, 
  Spinner, 
  Flex, 
  Select, 
  Input, 
  IconButton, 
  Divider, 
  Tooltip 
} from '@chakra-ui/react'; 
import { useState, useEffect } from 'react'; 
import {  
  BarChart,  
  Bar,  
  XAxis,  
  YAxis,  
  CartesianGrid,  
  Tooltip as ChartTooltip,  
  ResponsiveContainer,  
  LineChart,  
  Line,  
  Legend, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts'; 
import { Search, RotateCcw, Filter, ExternalLink, Info } from 'lucide-react'; 
import { supabase } from '../../lib/supabaseClient'; 
import { Link } from 'react-router-dom'; 
 
export default function AIAnalyticsPage() { 
  const [logs, setLogs] = useState([]); 
  const [stats, setStats] = useState({ today: {}, month: {}, allTime: {} }); 
  const [chartData, setChartData] = useState([]); 
  const [loading, setLoading] = useState(true); 
  const [filterPurpose, setFilterPurpose] = useState('all'); 
  const [filterStatus, setFilterStatus] = useState('all'); 
 
  const COLORS = ['#3182CE', '#38A169', '#E53E3E', '#805AD5', '#DD6B20']; 
 
  useEffect(() => { 
    fetchData(); 
  }, [filterPurpose, filterStatus]); 
 
  const fetchData = async () => { 
    setLoading(true); 
    try { 
      // 1. Fetch Logs 
      let query = supabase 
        .from('ai_usage_log') 
        .select('*') 
        .order('created_at', { ascending: false }) 
        .limit(100); 
 
      if (filterPurpose !== 'all') query = query.eq('purpose', filterPurpose); 
      if (filterStatus !== 'all') query = query.eq('status', filterStatus); 
 
      const { data: logData } = await query; 
      setLogs(logData || []); 
 
      // 2. Fetch Aggregates (Simplified for frontend) 
      const { data: allLogs } = await supabase 
        .from('ai_usage_log') 
        .select('cost_usd, prompt_tokens, completion_tokens, status, purpose, created_at'); 
 
      const now = new Date(); 
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(); 
      const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); 
 
      const aggregate = (items) => ({ 
        calls: items.length, 
        tokens: items.reduce((s, i) => s + (i.prompt_tokens || 0) + (i.completion_tokens || 0), 0), 
        cost: items.reduce((s, i) => s + Number(i.cost_usd || 0), 0), 
        failures: items.filter(i => i.status === 'failed').length 
      }); 
 
      setStats({ 
        today: aggregate(allLogs.filter(l => l.created_at >= today)), 
        month: aggregate(allLogs.filter(l => l.created_at >= month)), 
        allTime: aggregate(allLogs) 
      }); 
 
      // 3. Prepare Chart Data (Last 30 days) 
      const last30Days = [...Array(30)].map((_, i) => { 
        const d = new Date(); 
        d.setDate(d.getDate() - (29 - i)); 
        const dateStr = d.toISOString().split('T')[0]; 
        const dayLogs = allLogs.filter(l => l.created_at.startsWith(dateStr)); 
        return { 
          date: dateStr.split('-').slice(1).join('/'), 
          rating: dayLogs.filter(l => l.purpose === 'rate_company').reduce((s, l) => s + Number(l.cost_usd || 0), 0), 
          categorization: dayLogs.filter(l => l.purpose === 'categorize_job').reduce((s, l) => s + Number(l.cost_usd || 0), 0), 
          failures: dayLogs.filter(l => l.status === 'failed').length 
        }; 
      }); 
      setChartData(last30Days); 
 
    } catch (err) { 
      console.error('Error fetching analytics:', err); 
    } finally { 
      setLoading(false); 
    } 
  }; 
 
  const StatCard = ({ label, data }) => ( 
    <Stat p={5} bg="white" borderRadius="xl" border="1px" borderColor="gray.200" boxShadow="sm"> 
      <StatLabel color="gray.500" fontWeight="bold">{label}</StatLabel> 
      <StatNumber fontSize="2xl">${(data.cost || 0).toFixed(4)}</StatNumber> 
      <StatHelpText mb={0}> 
        <HStack spacing={2}> 
          <Badge variant="subtle">{data.calls || 0} calls</Badge> 
          <Badge colorScheme={data.failures > 0 ? 'red' : 'green'} variant="subtle"> 
            {data.calls ? ((data.failures / data.calls) * 100).toFixed(1) : 0}% fail 
          </Badge> 
        </HStack> 
      </StatHelpText> 
    </Stat> 
  ); 
 
  return ( 
    <Box> 
      <VStack align="stretch" spacing={8}> 
        <VStack align="stretch" spacing={0}> 
          <Heading size="lg">AI Analytics</Heading> 
          <Text color="gray.500">Usage tracking, cost analysis, and system health</Text> 
        </VStack> 
 
        {/* Top Stats */} 
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}> 
          <StatCard label="TODAY" data={stats.today} /> 
          <StatCard label="THIS MONTH" data={stats.month} /> 
          <StatCard label="ALL TIME" data={stats.allTime} /> 
        </SimpleGrid> 
 
        {/* Charts */} 
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}> 
          <Box bg="white" p={6} borderRadius="xl" border="1px" borderColor="gray.200"> 
            <Heading size="xs" mb={6} textTransform="uppercase" color="gray.500">Spend per Day (Last 30d)</Heading> 
            <Box h="300px"> 
              <ResponsiveContainer width="100%" height="100%"> 
                <LineChart data={chartData}> 
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /> 
                  <XAxis dataKey="date" fontSize={10} /> 
                  <YAxis fontSize={10} tickFormatter={(v) => `$${v.toFixed(3)}`} /> 
                  <ChartTooltip /> 
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} /> 
                  <Line type="monotone" dataKey="rating" stroke="#3182CE" strokeWidth={2} dot={false} name="Company Rating" /> 
                  <Line type="monotone" dataKey="categorization" stroke="#38A169" strokeWidth={2} dot={false} name="Categorization" /> 
                </LineChart> 
              </ResponsiveContainer> 
            </Box> 
          </Box> 
 
          <Box bg="white" p={6} borderRadius="xl" border="1px" borderColor="gray.200"> 
            <Heading size="xs" mb={6} textTransform="uppercase" color="gray.500">Daily Failures</Heading> 
            <Box h="300px"> 
              <ResponsiveContainer width="100%" height="100%"> 
                <BarChart data={chartData}> 
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /> 
                  <XAxis dataKey="date" fontSize={10} /> 
                  <YAxis fontSize={10} /> 
                  <ChartTooltip /> 
                  <Bar dataKey="failures" fill="#E53E3E" radius={[4, 4, 0, 0]} name="Failed Calls" /> 
                </BarChart> 
              </ResponsiveContainer> 
            </Box> 
          </Box> 
        </SimpleGrid> 
 
        {/* Recent Logs Table */} 
        <Box bg="white" borderRadius="xl" border="1px" borderColor="gray.200" overflow="hidden"> 
          <Box p={4} borderBottom="1px" borderColor="gray.100"> 
            <HStack justify="space-between"> 
              <Heading size="xs" textTransform="uppercase" color="gray.500">Recent API Calls</Heading> 
              <HStack spacing={4}> 
                <Select size="sm" w="150px" value={filterPurpose} onChange={(e) => setFilterPurpose(e.target.value)}> 
                  <option value="all">All Purposes</option> 
                  <option value="rate_company">Rating</option> 
                  <option value="categorize_job">Categorization</option> 
                  <option value="playground">Playground</option> 
                </Select> 
                <Select size="sm" w="120px" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}> 
                  <option value="all">All Status</option> 
                  <option value="success">Success</option> 
                  <option value="failed">Failed</option> 
                </Select> 
                <IconButton size="sm" icon={<RotateCcw size={14} />} onClick={fetchData} aria-label="Refresh" /> 
              </HStack> 
            </HStack> 
          </Box> 
          <Table variant="simple" size="sm"> 
            <Thead bg="gray.50"> 
              <Tr> 
                <Th>Time</Th> 
                <Th>Purpose</Th> 
                <Th>Status</Th> 
                <Th isNumeric>Tokens</Th> 
                <Th isNumeric>Cost</Th> 
                <Th isNumeric>Duration</Th> 
                <Th>Batch</Th> 
              </Tr> 
            </Thead> 
            <Tbody> 
              {loading ? ( 
                <Tr><Td colSpan={7} textAlign="center" py={10}><Spinner size="sm" /></Td></Tr> 
              ) : logs.map(log => ( 
                <Tr key={log.id}> 
                  <Td fontSize="xs" color="gray.500"> 
                    {new Date(log.created_at).toLocaleTimeString()} 
                  </Td> 
                  <Td> 
                    <Badge variant="outline" fontSize="9px">{log.purpose}</Badge> 
                  </Td> 
                  <Td> 
                    <Badge colorScheme={log.status === 'success' ? 'green' : 'red'} variant="subtle"> 
                      {log.status} 
                    </Badge> 
                  </Td> 
                  <Td isNumeric fontSize="xs">{(log.prompt_tokens || 0) + (log.completion_tokens || 0)}</Td> 
                  <Td isNumeric fontSize="xs" color="green.600">${Number(log.cost_usd || 0).toFixed(5)}</Td> 
                  <Td isNumeric fontSize="xs">{log.duration_ms}ms</Td> 
                  <Td> 
                    {log.batch_id ? ( 
                      <IconButton  
                        as={Link}  
                        to={`/admin/ai-batches/${log.batch_id}`} 
                        size="xs"  
                        icon={<ExternalLink size={10} />}  
                        variant="ghost" 
                      /> 
                    ) : '-'} 
                  </Td> 
                </Tr> 
              ))} 
            </Tbody> 
          </Table> 
        </Box> 
 
        {/* Pricing Reference Card */} 
        <Box p={4} borderRadius="xl" bg="blue.50" border="1px" borderColor="blue.100"> 
          <HStack spacing={3} align="start"> 
            <Info size={18} color="#3182CE" style={{ marginTop: '2px' }} /> 
            <VStack align="start" spacing={1}> 
              <Text fontSize="sm" fontWeight="bold" color="blue.800">Pricing Reference</Text> 
              <Text fontSize="xs" color="blue.700"> 
                Current Model: <strong>gpt-4o-mini</strong>.  
                Input: $0.150 / 1M tokens | Output: $0.600 / 1M tokens. 
                Pricing last verified: 2026-04-26. Run <code>node scripts/verify_pricing.js</code> to update. 
              </Text> 
            </VStack> 
          </HStack> 
        </Box> 
      </VStack> 
    </Box> 
  ); 
} 
