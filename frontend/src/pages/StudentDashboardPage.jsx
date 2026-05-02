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
  Card,
  CardHeader,
  CardBody,
  Stack,
  VStack,
  HStack,
  Icon,
} from '@chakra-ui/react';
import {
  GraduationCap,
  Sparkles,
  BookOpenCheck,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react';
import StudentShell from './student/StudentShell';

export default function StudentDashboardPage({ session, userData }) {
  return (
    <StudentShell session={session} userData={userData}>
      <Container maxW="7xl">
        <Stack spacing={8}>
              <Box
                bgGradient="linear(to-r, orange.500, pink.500)"
                color="white"
                borderRadius="3xl"
                px={{ base: 6, md: 10 }}
                py={{ base: 8, md: 10 }}
                boxShadow="xl"
              >
                <HStack justify="space-between" align={{ base: 'start', md: 'center' }} flexWrap="wrap" spacing={4}>
                  <VStack align="start" spacing={2}>
                    <Badge bg="whiteAlpha.300" color="white" px={3} py={1} borderRadius="full">
                      Student Dashboard
                    </Badge>
                    <Heading size="lg">Welcome back, {userData?.name?.split(' ')[0] || 'Student'}</Heading>
                    <Text color="whiteAlpha.900" maxW="2xl">
                      This space is dedicated to students. You have access only to your dashboard after Google sign-in.
                    </Text>
                  </VStack>
                  <Box
                    bg="whiteAlpha.200"
                    border="1px solid"
                    borderColor="whiteAlpha.300"
                    borderRadius="2xl"
                    px={5}
                    py={4}
                    minW="220px"
                  >
                    <Text fontSize="xs" textTransform="uppercase" color="whiteAlpha.700" mb={1}>Role</Text>
                    <Heading size="md" textTransform="capitalize">{userData?.role || 'student'}</Heading>
                  </Box>
                </HStack>
              </Box>

              <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
                <Card shadow="lg" borderRadius="3xl" border="1px solid" borderColor="orange.100" overflow="hidden">
                  <Box h={24} bgGradient="linear(to-r, orange.300, yellow.300)" />
                  <CardBody pt={0}>
                    <VStack spacing={4} mt={-12}>
                      <Avatar
                        size="2xl"
                        src={session.user.user_metadata.avatar_url || session.user.user_metadata.picture}
                        border="5px solid white"
                        name={userData?.name}
                      />
                      <VStack spacing={0}>
                        <Heading size="md">{userData?.name}</Heading>
                        <Text color="gray.500" fontSize="sm">{userData?.usn || 'USN pending'}</Text>
                      </VStack>
                      <Divider />
                      <VStack w="full" align="stretch" spacing={3}>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.400">Email</Text>
                          <Text fontWeight="semibold">{userData?.email}</Text>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.400">School</Text>
                          <Text fontWeight="semibold">{userData?.school || 'Not set'}</Text>
                        </Flex>
                        <Flex justify="space-between" fontSize="sm">
                          <Text color="gray.400">Joined</Text>
                          <Text fontWeight="semibold">
                            {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : '-'}
                          </Text>
                        </Flex>
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>

                <Stack spacing={6} gridColumn={{ lg: 'span 2' }}>
                  <Card shadow="lg" borderRadius="3xl" border="1px solid" borderColor="orange.100">
                    <CardHeader>
                      <HStack justify="space-between">
                        <Heading size="md">Student Access Overview</Heading>
                        <Icon as={ShieldCheck} color="orange.400" boxSize={6} />
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                        <Box p={5} bg="orange.50" borderRadius="2xl">
                          <HStack mb={2}>
                            <Icon as={Sparkles} color="orange.500" />
                            <Text fontSize="xs" fontWeight="bold" color="orange.600" textTransform="uppercase">
                              Access Level
                            </Text>
                          </HStack>
                          <Text fontWeight="bold" fontSize="lg">Dashboard + Jobs</Text>
                          <Text color="gray.600" mt={1}>
                            Student accounts can browse their dashboard and approved jobs, without any admin tools.
                          </Text>
                        </Box>
                        <Box p={5} bg="pink.50" borderRadius="2xl">
                          <HStack mb={2}>
                            <Icon as={BookOpenCheck} color="pink.500" />
                            <Text fontSize="xs" fontWeight="bold" color="pink.600" textTransform="uppercase">
                              Profile Status
                            </Text>
                          </HStack>
                          <Text fontWeight="bold" fontSize="lg">Active</Text>
                          <Text color="gray.600" mt={1}>
                            Your profile is ready for student access with Google login.
                          </Text>
                        </Box>
                      </SimpleGrid>
                    </CardBody>
                  </Card>

                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                    <Card borderRadius="2xl" border="1px solid" borderColor="orange.100" bg="white">
                      <CardBody>
                        <HStack justify="space-between" mb={3}>
                          <Text fontSize="sm" color="gray.500">Role</Text>
                          <Icon as={ShieldCheck} color="orange.400" />
                        </HStack>
                        <Heading size="md" textTransform="capitalize">{userData?.role || 'student'}</Heading>
                      </CardBody>
                    </Card>
                    <Card borderRadius="2xl" border="1px solid" borderColor="pink.100" bg="white">
                      <CardBody>
                        <HStack justify="space-between" mb={3}>
                          <Text fontSize="sm" color="gray.500">School</Text>
                          <Icon as={GraduationCap} color="pink.400" />
                        </HStack>
                        <Heading size="md">{userData?.school || '-'}</Heading>
                      </CardBody>
                    </Card>
                    <Card borderRadius="2xl" border="1px solid" borderColor="yellow.100" bg="white">
                      <CardBody>
                        <HStack justify="space-between" mb={3}>
                          <Text fontSize="sm" color="gray.500">Student View</Text>
                          <Icon as={CalendarClock} color="yellow.500" />
                        </HStack>
                        <Heading size="md">Jobs Enabled</Heading>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </Stack>
              </SimpleGrid>
        </Stack>
      </Container>
    </StudentShell>
  );
}
