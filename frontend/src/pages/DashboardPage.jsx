import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Avatar,
  Badge,
  Divider,
  SimpleGrid,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Card,
  CardHeader,
  CardBody,
  Stack,
  VStack,
  HStack,
  Icon,
  Button,
} from '@chakra-ui/react';
import {
  LogOut,
  User as UserIcon,
  BookOpen,
  School,
  GraduationCap,
  Settings,
  Bell,
  CheckCircle2,
  LayoutDashboard,
  Activity,
  Cpu,
} from "lucide-react";
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { name: 'Schools', icon: School, path: '/schools' },
  { name: 'Job Process', icon: Activity, path: '/job-process' },
  { name: 'Job Auto', icon: Cpu, path: '/job-auto' },
];

export default function DashboardPage({ session, userData }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
            <Stack spacing={8}>
              <Flex justify="space-between" align="flex-end">
                <Box>
                  <Heading size="lg">Student Dashboard</Heading>
                  <Text color="gray.500">Academic year 2024-25</Text>
                </Box>
                <HStack>
                  <Badge colorScheme="blue" p={1} px={3} borderRadius="full">{userData?.role}</Badge>
                  <Badge colorScheme="green" p={1} px={3} borderRadius="full">Active</Badge>
                </HStack>
              </Flex>

              <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
                <Card shadow="lg" borderRadius="2xl" border="none" overflow="hidden">
                  <Box h={20} bgGradient="linear(to-r, blue.400, blue.600)" />
                  <CardBody pt={0}>
                    <VStack spacing={4} mt={-10}>
                      <Avatar size="2xl" src={session.user.user_metadata.avatar_url} border="4px solid white" />
                      <VStack spacing={0}>
                        <Heading size="md">{userData?.name}</Heading>
                        <Text color="gray.500" fontSize="sm">{userData?.usn}</Text>
                      </VStack>
                      <Divider />
                      <VStack w="full" align="stretch" spacing={3}>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.400">Email</Text>
                          <Text fontWeight="semibold">{userData?.email}</Text>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.400">Joined</Text>
                          <Text fontWeight="semibold">{new Date(userData?.created_at).toLocaleDateString()}</Text>
                        </Flex>
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>

                <Stack spacing={8} gridColumn={{ lg: 'span 2' }}>
                  <Card shadow="lg" borderRadius="2xl" border="none">
                    <CardHeader>
                      <HStack justify="space-between">
                        <Heading size="md">Academic Details</Heading>
                        <Icon as={BookOpen} color="blue.200" boxSize={6} />
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                        <Box p={4} bg="gray.50" borderRadius="xl" border="1px solid" borderColor="gray.100">
                          <HStack mb={1}>
                            <Icon as={School} color="blue.500" />
                            <Text fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase">School</Text>
                          </HStack>
                          <Text fontWeight="bold">{userData?.school}</Text>
                        </Box>
                        <Box p={4} bg="gray.50" borderRadius="xl" border="1px solid" borderColor="gray.100">
                          <HStack mb={1}>
                            <Icon as={GraduationCap} color="blue.500" />
                            <Text fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase">Program</Text>
                          </HStack>
                          <Text fontWeight="bold">{userData?.program}</Text>
                        </Box>
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                    <Card variant="outline" borderRadius="xl" p={4} _hover={{ shadow: 'md', borderColor: 'blue.200' }} transition="all 0.2s">
                      <Text fontSize="sm" color="gray.500" mb={1}>Applications</Text>
                      <Heading size="lg">12</Heading>
                      <HStack color="green.500" fontSize="xs" mt={1}>
                        <Icon as={CheckCircle2} />
                        <Text>+2 this week</Text>
                      </HStack>
                    </Card>
                    <Card variant="outline" borderRadius="xl" p={4} _hover={{ shadow: 'md', borderColor: 'blue.200' }} transition="all 0.2s">
                      <Text fontSize="sm" color="gray.500" mb={1}>Interviews</Text>
                      <Heading size="lg">4</Heading>
                      <Text color="gray.400" fontSize="xs" mt={1}>Next: Tomorrow</Text>
                    </Card>
                    <Card variant="outline" borderRadius="xl" p={4} _hover={{ shadow: 'md', borderColor: 'blue.200' }} transition="all 0.2s">
                      <Text fontSize="sm" color="gray.500" mb={1}>Saved Jobs</Text>
                      <Heading size="lg">28</Heading>
                      <Text color="gray.400" fontSize="xs" mt={1}>Updated 2h ago</Text>
                    </Card>
                  </SimpleGrid>
                </Stack>
              </SimpleGrid>
            </Stack>

            <Box py={8} textAlign="center" borderTop="1px" borderColor="gray.100" mt={12}>
              <Text color="gray.400" fontSize="sm">© 2024 RV University Job Portal</Text>
            </Box>
          </Container>
        </Box>
      </Flex>
    </Box>
  );
}
