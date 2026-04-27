import { useState, useEffect, useRef } from 'react';
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
  Badge,
  Spinner,
  Center,
  VStack,
  HStack,
  Icon,
  Button,
  Divider,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  CloseButton,
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
  Plus,
  MoreVertical,
  PenLine,
  Trash2,
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
  const toast = useToast();
  const cancelRef = useRef();
  const isAdmin = userData?.role === 'admin';

  const [schools, setSchools] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  const { isOpen: isSchoolOpen, onOpen: onSchoolOpen, onClose: onSchoolClose } = useDisclosure();
  const { isOpen: isProgramOpen, onOpen: onProgramOpen, onClose: onProgramClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const [schoolForm, setSchoolForm] = useState({ name: '', code: '' });
  const [editingSchoolId, setEditingSchoolId] = useState(null);
  const [programForm, setProgramForm] = useState({ name: '', code: '', school_id: '' });
  const [deletingProgram, setDeletingProgram] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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
      toast({ title: 'Error', description: err.message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getProgramsForSchool = (schoolId) => {
    return programs.filter(p => p.school_id === schoolId);
  };

  const handleAddSchool = async () => {
    setSaving(true);
    try {
      await api('/api/schools/admin', {
        method: 'POST',
        body: schoolForm,
      });
      toast({ title: 'Success', description: 'School added', status: 'success' });
      setSchoolForm({ name: '', code: '' });
      onSchoolClose();
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSchool = async () => {
    setSaving(true);
    try {
      await api(`/api/schools/admin/${editingSchoolId}`, {
        method: 'PATCH',
        body: schoolForm,
      });
      toast({ title: 'Success', description: 'School updated', status: 'success' });
      setSchoolForm({ name: '', code: '' });
      setEditingSchoolId(null);
      onSchoolClose();
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openAddSchool = () => {
    setEditingSchoolId(null);
    setSchoolForm({ name: '', code: '' });
    onSchoolOpen();
  };

  const openEditSchool = (school) => {
    setEditingSchoolId(school.id);
    setSchoolForm({ name: school.name, code: school.code || '' });
    onSchoolOpen();
  };

  const handleDeleteSchool = async (school) => {
    if (!window.confirm('Delete this school?')) return;
    try {
      await api(`/api/schools/admin/${school.id}`, { method: 'DELETE' });
      toast({ title: 'Success', description: 'School deleted', status: 'success' });
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    }
  };

  const openAddProgram = (schoolId) => {
    setProgramForm({ name: '', code: '', school_id: schoolId });
    onProgramOpen();
  };

  const handleAddProgram = async () => {
    setSaving(true);
    try {
      await api('/api/programs/admin', {
        method: 'POST',
        body: programForm,
      });
      toast({ title: 'Success', description: 'Program added', status: 'success' });
      setProgramForm({ name: '', code: '', school_id: '' });
      onProgramClose();
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgramClick = (prog) => {
    setDeletingProgram(prog);
    onDeleteOpen();
  };

  const confirmDeleteProgram = async () => {
    try {
      await api(`/api/programs/admin/${deletingProgram.id}`, { method: 'DELETE' });
      toast({ title: 'Success', description: 'Program deleted', status: 'success' });
      onDeleteClose();
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    }
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
                  {isAdmin && (
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
        <Box flex="1" ml={{ base: 0, md: '260px' }} p={{ base: 4, md: 8 }}>
          <Container maxW="6xl">
            <VStack align="stretch" spacing={8}>
              {/* Header */}
              <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" align={{ base: 'start', sm: 'center' }} gap={4}>
                <Box>
                  <Heading size="lg" fontWeight="extrabold" letterSpacing="tight">Schools & Programs</Heading>
                  <Text color="gray.500" mt={1} fontWeight="medium">Manage your academic infrastructure seamlessly.</Text>
                </Box>
                {isAdmin && (
                  <Button
                    leftIcon={<Plus size={16} />}
                    colorScheme="indigo"
                    bg="indigo.600"
                    _hover={{ bg: 'indigo.700', transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                    px={6}
                    py={3}
                    h="auto"
                    borderRadius="2xl"
                    boxShadow="lg"
                    onClick={openAddSchool}
                  >
                    Add New School
                  </Button>
                )}
              </Flex>

              {/* Cards */}
              {loading ? (
                <Center py={20}>
                  <VStack spacing={4}>
                    <Spinner size="xl" color="indigo.500" thickness="4px" />
                    <Text color="gray.500">Loading academic data...</Text>
                  </VStack>
                </Center>
              ) : schools.length === 0 ? (
                <Box py={20} textAlign="center" bg="white" borderRadius="3xl" border="2px dashed" borderColor="gray.200">
                  <Center w={20} h={20} bg="gray.50" borderRadius="full" mx="auto" mb={4}>
                    <Icon as={School} boxSize={8} color="gray.300" />
                  </Center>
                  <Heading size="md" color="gray.700" mb={2}>No Schools Setup</Heading>
                  <Text color="gray.500" mb={6}>Create your first school to begin adding programs.</Text>
                  {isAdmin && (
                    <Button variant="link" colorScheme="indigo" onClick={openAddSchool}>Add School Now</Button>
                  )}
                </Box>
              ) : (
                <VStack align="stretch" spacing={4}>
                  {schools.map((school) => {
                    const schoolPrograms = getProgramsForSchool(school.id);
                    return (
                      <Box
                        key={school.id}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="3xl"
                        p={6}
                        display="flex"
                        flexDirection={{ base: 'column', md: 'row' }}
                        alignItems={{ base: 'start', md: 'center' }}
                        gap={6}
                        position="relative"
                        transition="all 0.2s"
                        _hover={{ borderColor: 'indigo.200', boxShadow: 'xl' }}
                      >
                        {/* Icon & Info */}
                        <HStack spacing={5} flex="1" minW={0} align="start">
                          <Center w={14} h={14} bg="indigo.50" borderRadius="2xl" flexShrink={0} color="indigo.500">
                            <Icon as={School} boxSize={6} />
                          </Center>
                          <Box minW={0}>
                            <HStack spacing={3} mb={1}>
                              <Text fontWeight="bold" fontSize="lg" color="gray.800" isTruncated>
                                {school.name}
                              </Text>
                              <Badge
                                bg="gray.100"
                                color="gray.500"
                                fontSize="10px"
                                fontWeight="black"
                                px={2}
                                py={0.5}
                                borderRadius="md"
                                flexShrink={0}
                              >
                                {school.code || 'N/A'}
                              </Badge>
                            </HStack>
                            {/* Programs Tags */}
                            <Flex wrap="wrap" gap={2}>
                              {schoolPrograms.length > 0 ? (
                                schoolPrograms.map((prog) => (
                                  <HStack
                                    key={prog.id}
                                    spacing={1}
                                    bg="gray.50"
                                    border="1px solid"
                                    borderColor="gray.100"
                                    borderRadius="full"
                                    px={3}
                                    py={1}
                                    fontSize="sm"
                                    color="gray.600"
                                    fontWeight="medium"
                                    transition="all 0.2s"
                                    _hover={{ bg: 'white', borderColor: 'indigo.200' }}
                                  >
                                    <Text>{prog.name}</Text>
                                    {isAdmin && (
                                      <CloseButton
                                        size="sm"
                                        color="gray.300"
                                        _hover={{ color: 'red.500' }}
                                        onClick={() => handleDeleteProgramClick(prog)}
                                      />
                                    )}
                                  </HStack>
                                ))
                              ) : (
                                <Text fontSize="sm" color="gray.400" fontStyle="italic">No programs added yet</Text>
                              )}
                            </Flex>
                          </Box>
                        </HStack>

                        {/* Actions Dropdown */}
                        {isAdmin && (
                          <Box alignSelf={{ base: 'flex-end', md: 'center' }} ml="auto">
                            <Menu placement="bottom-end">
                              <MenuButton
                                as={IconButton}
                                icon={<MoreVertical size={18} />}
                                variant="ghost"
                                color="gray.400"
                                _hover={{ color: 'gray.600', bg: 'gray.100' }}
                                borderRadius="2xl"
                                aria-label="Actions"
                              />
                              <MenuList shadow="xl" borderRadius="xl" py={1}>
                                <MenuItem
                                  icon={<Plus size={16} />}
                                  color="indigo.600"
                                  fontWeight="semibold"
                                  borderBottom="1px solid"
                                  borderColor="gray.50"
                                  onClick={() => openAddProgram(school.id)}
                                >
                                  Add Program
                                </MenuItem>
                                <MenuItem
                                  icon={<PenLine size={16} />}
                                  color="gray.600"
                                  onClick={() => openEditSchool(school)}
                                >
                                  Edit Details
                                </MenuItem>
                                <MenuItem
                                  icon={<Trash2 size={16} />}
                                  color="red.500"
                                  onClick={() => handleDeleteSchool(school)}
                                >
                                  Delete School
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </VStack>
          </Container>
        </Box>
      </Flex>

      {/* School Modal */}
      <Modal isOpen={isSchoolOpen} onClose={onSchoolClose} isCentered>
        <ModalOverlay bg="rgba(15, 23, 42, 0.3)" backdropFilter="blur(8px)" />
        <ModalContent borderRadius="3xl" overflow="hidden" boxShadow="2xl">
          <ModalBody p={8}>
            <ModalHeader p={0} fontSize="2xl" fontWeight="bold" color="gray.800" mb={6}>
              {editingSchoolId ? 'Edit School' : 'Add School'}
            </ModalHeader>
            <VStack spacing={5} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400">School Name</FormLabel>
                <Input
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  placeholder="e.g. School of Business"
                  bg="gray.50"
                  border="none"
                  borderRadius="xl"
                  py={3}
                  px={5}
                  _focus={{ ring: '2px', ringColor: 'indigo.500' }}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400">Internal Code</FormLabel>
                <Input
                  value={schoolForm.code}
                  onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value })}
                  placeholder="e.g. SOB"
                  bg="gray.50"
                  border="none"
                  borderRadius="xl"
                  py={3}
                  px={5}
                  _focus={{ ring: '2px', ringColor: 'indigo.500' }}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter bg="gray.50" p={6}>
            <Button variant="ghost" mr={3} onClick={onSchoolClose} fontWeight="bold" color="gray.500">
              Cancel
            </Button>
            <Button
              bg="indigo.600"
              color="white"
              px={8}
              py={2.5}
              h="auto"
              borderRadius="xl"
              fontWeight="bold"
              _hover={{ bg: 'indigo.700' }}
              onClick={editingSchoolId ? handleUpdateSchool : handleAddSchool}
              isLoading={saving}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Program Modal */}
      <Modal isOpen={isProgramOpen} onClose={onProgramClose} isCentered>
        <ModalOverlay bg="rgba(15, 23, 42, 0.3)" backdropFilter="blur(8px)" />
        <ModalContent borderRadius="3xl" overflow="hidden" boxShadow="2xl">
          <ModalBody p={8}>
            <ModalHeader p={0} fontSize="2xl" fontWeight="bold" color="gray.800" mb={6}>
              Add Program
            </ModalHeader>
            <VStack spacing={5} align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400">School</FormLabel>
                <Select
                  placeholder="Select School"
                  value={programForm.school_id}
                  onChange={(e) => setProgramForm({ ...programForm, school_id: e.target.value })}
                  bg="gray.50"
                  border="none"
                  borderRadius="xl"
                  py={3}
                  px={5}
                  _focus={{ ring: '2px', ringColor: 'indigo.500' }}
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400">Program Title</FormLabel>
                <Input
                  value={programForm.name}
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science"
                  bg="gray.50"
                  border="none"
                  borderRadius="xl"
                  py={3}
                  px={5}
                  _focus={{ ring: '2px', ringColor: 'indigo.500' }}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400">Code</FormLabel>
                <Input
                  value={programForm.code}
                  onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                  placeholder="e.g. BTCS"
                  bg="gray.50"
                  border="none"
                  borderRadius="xl"
                  py={3}
                  px={5}
                  _focus={{ ring: '2px', ringColor: 'indigo.500' }}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter bg="gray.50" p={6}>
            <Button variant="ghost" mr={3} onClick={onProgramClose} fontWeight="bold" color="gray.500">
              Cancel
            </Button>
            <Button
              bg="indigo.600"
              color="white"
              px={8}
              py={2.5}
              h="auto"
              borderRadius="xl"
              fontWeight="bold"
              _hover={{ bg: 'indigo.700' }}
              onClick={handleAddProgram}
              isLoading={saving}
            >
              Add Program
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Program Dialog */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose} isCentered>
        <AlertDialogOverlay bg="rgba(15, 23, 42, 0.3)" backdropFilter="blur(8px)">
          <AlertDialogContent borderRadius="3xl" overflow="hidden" boxShadow="2xl">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Program
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete <b>{deletingProgram?.name}</b>? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose} borderRadius="xl">Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteProgram} ml={3} borderRadius="xl">Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
