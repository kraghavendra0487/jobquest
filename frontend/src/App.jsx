import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Input,
  FormControl,
  FormLabel,
  Stack,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Avatar,
  Badge,
  Divider,
  SimpleGrid,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Center,
  Spinner,
  Image,
  VStack,
  HStack,
  Icon,
} from '@chakra-ui/react'
import {
  LogOut,
  User as UserIcon,
  BookOpen,
  School,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Bell,
  CheckCircle2,
} from "lucide-react"

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const toast = useToast()

  // Profile form state
  const [school, setSchool] = useState('')
  const [program, setProgram] = useState('')
  const [usn, setUsn] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        checkUserInDB(session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        checkUserInDB(session.user)
      } else {
        setLoading(false)
        setUserData(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUserInDB = async (user) => {
    setLoading(true)
    if (!user.email.endsWith("@rvu.edu.in")) {
      toast({
        title: "Access Denied",
        description: "Only RVU emails allowed",
        status: "error",
        duration: 5000,
        isClosable: true,
      })
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        setIsNewUser(true)
      } else if (data) {
        setUserData(data)
        setIsNewUser(false)
      }
    } catch (err) {
      console.error("Error checking user:", err)
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const saveUser = async () => {
    if (!school || !program || !usn) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        status: "warning",
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setFormSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase.from("users").insert([
      {
        id: user.id,
        email: user.email,
        name: user.user_metadata.full_name,
        school,
        program,
        usn,
        role: "student"
      }
    ]).select().single()

    if (error) {
      toast({
        title: "Error saving profile",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      })
      setFormSubmitting(false)
      return
    }

    setUserData(data)
    setIsNewUser(false)
    setFormSubmitting(false)
    toast({
      title: "Success",
      description: "Profile saved successfully!",
      status: "success",
      duration: 3000,
      isClosable: true,
    })
  }

  if (loading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" color="blue.500" thickness="4px" />
      </Center>
    )
  }

  // 1. Login Page
  if (!session) {
    return (
      <Box minH="100vh" bg="gray.50">
        <Flex direction={{ base: 'column', md: 'row' }} minH="100vh">
          <Box
            flex="1"
            bg="blue.600"
            p={12}
            display={{ base: 'none', md: 'flex' }}
            flexDirection="column"
            justifyContent="space-between"
            color="white"
            position="relative"
            overflow="hidden"
          >
            <Box zIndex="1">
              <Heading size="2xl" mb={6}>RV University</Heading>
              <Text fontSize="xl" opacity="0.9">
                Your career journey starts here. Connect with recruiters and explore top job opportunities tailored for RVU students.
              </Text>
            </Box>
            <VStack align="stretch" spacing={6} zIndex="1">
              <HStack bg="whiteAlpha.200" p={4} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.300">
                <Icon as={LayoutDashboard} boxSize={6} />
                <Box>
                  <Text fontWeight="bold">Professional Dashboard</Text>
                  <Text fontSize="sm" opacity="0.8">Track all your applications in one view.</Text>
                </Box>
              </HStack>
              <HStack bg="whiteAlpha.200" p={4} borderRadius="xl" border="1px solid" borderColor="whiteAlpha.300">
                <Icon as={Bell} boxSize={6} />
                <Box>
                  <Text fontWeight="bold">Smart Notifications</Text>
                  <Text fontSize="sm" opacity="0.8">Never miss a deadline or interview request.</Text>
                </Box>
              </HStack>
            </VStack>
          </Box>

          <Center flex="1" p={8}>
            <VStack spacing={8} w="full" maxW="md" align="stretch">
              <Box>
                <Heading size="lg" mb={2}>Student Login</Heading>
                <Text color="gray.500">Sign in with your university Google account</Text>
              </Box>
              <Button
                size="lg"
                variant="outline"
                h={14}
                fontSize="md"
                onClick={loginWithGoogle}
                leftIcon={<Image src="https://www.google.com/favicon.ico" boxSize="20px" />}
                _hover={{ bg: 'gray.50' }}
              >
                Continue with Google
              </Button>
              <Text fontSize="xs" color="gray.400" textAlign="center">
                Authorized access for <Text as="span" fontWeight="bold" color="blue.500">@rvu.edu.in</Text> domains only.
              </Text>
            </VStack>
          </Center>
        </Flex>
      </Box>
    )
  }

  // 2. Profile Form
  if (isNewUser) {
    return (
      <Center minH="100vh" bg="gray.50" p={4}>
        <Card w="full" maxW="md" shadow="xl" borderRadius="2xl">
          <CardHeader textAlign="center" pt={8}>
            <Center bg="blue.50" p={4} borderRadius="full" w="fit-content" mx="auto" mb={4}>
              <Icon as={UserIcon} boxSize={8} color="blue.600" />
            </Center>
            <Heading size="md">Complete Your Profile</Heading>
            <Text color="gray.500">Welcome {session.user.user_metadata.full_name}!</Text>
          </CardHeader>
          <CardBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontWeight="semibold">School</FormLabel>
                <Input
                  placeholder="e.g. School of Computer Science"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  h={12}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontWeight="semibold">Program</FormLabel>
                <Input
                  placeholder="e.g. B.Tech CSE"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  h={12}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontWeight="semibold">USN</FormLabel>
                <Input
                  placeholder="RVU23BCE000"
                  value={usn}
                  onChange={(e) => setUsn(e.target.value.toUpperCase())}
                  h={12}
                />
              </FormControl>
            </Stack>
          </CardBody>
          <CardFooter display="flex" gap={4}>
            <Button variant="ghost" flex="1" onClick={handleLogout}>Cancel</Button>
            <Button colorScheme="blue" flex="2" onClick={saveUser} isLoading={formSubmitting}>
              Finish Setup
            </Button>
          </CardFooter>
        </Card>
      </Center>
    )
  }

  // 3. Dashboard
  return (
    <Box minH="100vh" bg="gray.50">
      <Box bg="white" borderBottom="1px" borderColor="gray.100" sticky="top" zIndex="sticky">
        <Container maxW="7xl">
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

      <Container maxW="7xl" py={8}>
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
      </Container>

      <Box py={8} textAlign="center" borderTop="1px" borderColor="gray.100" mt="auto">
        <Text color="gray.400" fontSize="sm">© 2024 RV University Job Portal</Text>
      </Box>
    </Box>
  )
}

export default App
