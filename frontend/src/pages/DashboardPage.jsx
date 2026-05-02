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
  BookOpen,
  School,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import { api } from '../lib/api';
import AdminShell from './admin/AdminShell';

export default function DashboardPage({ session, userData }) {
  return (
    <AdminShell session={session} userData={userData}>
      <Container maxW="7xl">
        <Stack spacing={8}>
          <Flex justify="space-between" align="flex-end">
            <Box>
              <Heading size="lg">Admin Dashboard</Heading>
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
                  <Avatar 
                    size="2xl" 
                    src={session.user.user_metadata.avatar_url || session.user.user_metadata.picture} 
                    border="4px solid white" 
                    name={userData?.name}
                  />
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
                        <Text fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase">USN</Text>
                      </HStack>
                      <Text fontWeight="bold">{userData?.usn}</Text>
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
    </AdminShell>
  );
}
