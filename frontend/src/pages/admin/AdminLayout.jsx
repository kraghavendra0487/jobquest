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
  BookOpen,
  Upload,
  Briefcase,
  Building2,
  ChevronLeft,
} from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { name: 'Schools', icon: School, path: '/admin/schools' },
  { name: 'Programs', icon: BookOpen, path: '/admin/programs' },
  { name: 'Job Uploads', icon: Upload, path: '/admin/job-uploads' },
  { name: 'Master Jobs', icon: Briefcase, path: '/admin/jobs' },
  { name: 'Companies', icon: Building2, path: '/admin/companies' },
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
                variant={location.pathname === item.path ? 'solid' : 'ghost'}
                colorScheme={location.pathname === item.path ? 'blue' : 'gray'}
                justifyContent="flex-start"
                leftIcon={<Icon as={item.icon} />}
                size="md"
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
