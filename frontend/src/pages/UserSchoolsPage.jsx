import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Avatar,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Center,
  VStack,
  HStack,
  Icon,
  Button,
  Divider,
} from '@chakra-ui/react';
import {
  LogOut,
  User as UserIcon,
  GraduationCap,
  Settings,
  Bell,
  LayoutDashboard,
  School,
  Activity,
  BookOpen,
} from "lucide-react";
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Schools', icon: School, path: '/schools' },
  { name: 'Job Process', icon: Activity, path: '/job-process' },
];

export default function UserSchoolsPage({ session, userData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [schoolsData, programsData] = await Promise.all([
          api('/api/schools'),
          api('/api/programs'),
        ]);
        setSchools(Array.isArray(schoolsData) ? schoolsData : []);
        setPrograms(Array.isArray(programsData) ? programsData : []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Helper to get programs for a school
  const getProgramsForSchool = (schoolId) => {
    return programs.filter(p => p.school_id === schoolId);
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Top Header */}
      <Box bg="white" borderBottom="1px" borderColor="gray.100" position="fixed" top={0} left={0} right={0} zIndex="sticky">
        <Container maxW="full" px={6}>
          <Flex h={16} align="center" justify="space-between">
            <HStack spacing={3}>
              <Box bg="blue.600" p={1.5} borderRadius="lg" color="white">
                <Icon as={GraduationCap} boxSize={6} />
              </Box>
              <Heading size="md" tracking="tight">RVU Portal</Heading>
            </HStack>

            <HStack spacing={4}>
              <IconButton
                variant="ghost"
                icon={<Icon as={Bell} boxSize={5} />}
                color="gray.500"
                aria-label="Notifications"
              />
              <Menu>
                <MenuButton>
                  <Avatar size="sm" src={session.user.user_metadata.avatar_url} />
                </MenuButton>
                <MenuList shadow="xl" borderRadius="xl">
                  <Box px={4} py={2}>
                    <Text fontWeight="bold" fontSize="sm">{userData?.name}</Text>
                    <Text fontSize="xs" color="gray.500">{userData?.email}</Text>
                  </Box>
                  <Divider />
                  {userData?.role === 'admin' && (
                    <MenuItem as={Link} to="/admin" icon={<Icon as={Settings} />}>Admin Panel</MenuItem>
                  )}
                  <MenuItem icon={<Icon as={UserIcon} />}>My Profile</MenuItem>
                  <MenuItem icon={<Icon as={Settings} />}>Settings</MenuItem>
                  <Divider />
                  <MenuItem icon={<Icon as={LogOut} />} color="red.500" onClick={handleLogout}>
                    Log Out
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Flex pt={16}>
        {/* Sidebar */}
        <Box
          w="260px"
          bg="white"
          borderRight="1px"
          borderColor="gray.200"
          position="fixed"
          h="calc(100vh - 64px)"
          py={8}
          px={4}
          display={{ base: 'none', md: 'block' }}
        >
          <VStack align="stretch" spacing={2}>
            {sidebarItems.map((item) => (
              <Button
                key={item.path}
                as={Link}
                to={item.path}
                variant={location.pathname === item.path ? 'solid' : 'ghost'}
                colorScheme={location.pathname === item.path ? 'blue' : 'gray'}
                justifyContent="flex-start"
                leftIcon={<Icon as={item.icon} />}
                size="md"
                borderRadius="xl"
                fontSize="sm"
                fontWeight={location.pathname === item.path ? 'bold' : 'medium'}
                _hover={{
                  bg: location.pathname === item.path ? 'blue.600' : 'gray.100',
                }}
              >
                {item.name}
              </Button>
            ))}
          </VStack>
        </Box>

        {/* Main Content */}
        <Box flex="1" ml={{ base: 0, md: '260px' }} p={8}>
          <Container maxW="7xl">
            <VStack align="stretch" spacing={6}>
              <Box>
                <Heading size="lg">Schools & Programs</Heading>
                <Text color="gray.500">Overview of all schools and their academic offerings</Text>
              </Box>

              <Box bg="white" shadow="sm" borderRadius="xl" border="1px" borderColor="gray.200" overflow="hidden">
                {loading ? (
                  <Center py={20}>
                    <VStack spacing={4}>
                      <Spinner size="xl" color="blue.500" thickness="4px" />
                      <Text color="gray.500">Loading academic data...</Text>
                    </VStack>
                  </Center>
                ) : (
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th width="200px">School Name</Th>
                        <Th width="100px">Code</Th>
                        <Th>Programs</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {schools.map((school) => {
                        const schoolPrograms = getProgramsForSchool(school.id);
                        return (
                          <Tr key={school.id}>
                            <Td>
                              <HStack spacing={3}>
                                <Icon as={School} color="blue.500" />
                                <Text fontWeight="bold">{school.name}</Text>
                              </HStack>
                            </Td>
                            <Td>
                              <Badge colorScheme="blue" variant="subtle">
                                {school.code || 'N/A'}
                              </Badge>
                            </Td>
                            <Td>
                              <Flex wrap="wrap" gap={2}>
                                {schoolPrograms.length > 0 ? (
                                  schoolPrograms.map((prog) => (
                                    <Badge
                                      key={prog.id}
                                      variant="outline"
                                      colorScheme="gray"
                                      px={2}
                                      py={1}
                                      borderRadius="md"
                                      fontSize="xs"
                                    >
                                      {prog.name}
                                    </Badge>
                                  ))
                                ) : (
                                  <Text fontSize="xs" color="gray.400">No programs listed</Text>
                                )}
                              </Flex>
                            </Td>
                          </Tr>
                        );
                      })}
                      {schools.length === 0 && (
                        <Tr>
                          <Td colSpan={3} textAlign="center" py={10}>
                            <Text color="gray.500">No schools found in the system.</Text>
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                )}
              </Box>
            </VStack>
          </Container>
        </Box>
      </Flex>
    </Box>
  );
}
