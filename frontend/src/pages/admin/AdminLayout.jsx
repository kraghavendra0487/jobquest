import {
  Box,
  Flex,
  VStack,
  Button,
  Heading,
  Icon,
  Text,
} from '@chakra-ui/react';
import {
  School,
  Upload,
  Briefcase,
  Building2,
  ChevronLeft,
  Settings,
  Terminal,
  BarChart3,
  CheckCircle2,
  Tag,
  Sparkles,
} from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { name: 'Upload Wizard', icon: Sparkles, path: '/admin/upload-wizard', highlight: true },
  { name: 'Schools', icon: School, path: '/admin/schools' },
  { name: 'Job Uploads', icon: Upload, path: '/admin/job-uploads' },
  { name: 'Master Jobs', icon: Briefcase, path: '/admin/jobs' },
  { name: 'Companies', icon: Building2, path: '/admin/companies' },
];

const aiItems = [
  { name: 'Categorization', icon: Tag, path: '/admin/categorization' },
  { name: 'Approval Queue', icon: CheckCircle2, path: '/admin/approval-queue' },
  { name: 'AI Test', icon: Terminal, path: '/admin/ai-playground' },
  { name: 'Prompts', icon: Settings, path: '/admin/prompts' },
  { name: 'AI Batches', icon: Terminal, path: '/admin/ai-batches' },
  { name: 'AI Analytics', icon: BarChart3, path: '/admin/ai-analytics' },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <Flex minH="100vh">
      {/* Sidebar */}
      <Box
        w="240px"
        bg="white"
        borderRight="1px"
        borderColor="gray.200"
        py={8}
        px={4}
        position="fixed"
        h="full"
      >
        <VStack align="stretch" spacing={8}>
          <Box px={2}>
            <Heading size="md" color="blue.600">Admin Panel</Heading>
            <Text fontSize="xs" color="gray.500" mt={1}>Job Portal Management</Text>
          </Box>

          <VStack align="stretch" spacing={2}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                as={Link}
                to={item.path}
                variant={location.pathname.startsWith(item.path) ? 'solid' : item.highlight ? 'outline' : 'ghost'}
                colorScheme={location.pathname.startsWith(item.path) ? 'blue' : item.highlight ? 'blue' : 'gray'}
                justifyContent="flex-start"
                leftIcon={<Icon as={item.icon} />}
                size="md"
                borderRadius="lg"
                fontWeight={item.highlight ? 'bold' : 'normal'}
              >
                {item.name}
              </Button>
            ))}
          </VStack>

          <VStack align="stretch" spacing={2}>
            <Text px={2} fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase">AI Infrastructure</Text>
            {aiItems.map((item) => (
              <Button
                key={item.path}
                as={Link}
                to={item.path}
                variant={location.pathname === item.path ? 'solid' : 'ghost'}
                colorScheme={location.pathname === item.path ? 'blue' : 'gray'}
                justifyContent="flex-start"
                leftIcon={<Icon as={item.icon} />}
                size="sm"
                borderRadius="lg"
              >
                {item.name}
              </Button>
            ))}
          </VStack>

          <Box pt={8}>
            <Button
              as={Link}
              to="/"
              variant="link"
              leftIcon={<Icon as={ChevronLeft} />}
              size="sm"
              color="gray.500"
              px={2}
            >
              Back to Portal
            </Button>
          </Box>
        </VStack>
      </Box>

      {/* Main Content */}
      <Box flex="1" ml="240px" bg="gray.50" minH="100vh" p={8}>
        <Outlet />
      </Box>
    </Flex>
  );
}
