import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  VStack,
  Text,
  Flex,
  HStack,
} from '@chakra-ui/react';
import { Plus, Edit2, Trash2, Filter } from 'lucide-react';
import { api } from '../../lib/api';

export default function ProgramsPage() {
  const [programs, setPrograms] = useState([]);
  const [schools, setSchools] = useState([]);
  const [filterSchoolId, setFilterSchoolId] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingProgram, setEditingProgram] = useState(null);
  const [deletingProgram, setDeletingProgram] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();

  const [formData, setFormData] = useState({ name: '', code: '', school_id: '' });

  useEffect(() => {
    fetchSchools();
    fetchPrograms();
  }, [filterSchoolId]);

  const fetchSchools = async () => {
    try {
      const data = await api('/api/schools');
      if (Array.isArray(data)) {
        setSchools(data);
      } else {
        setSchools([]);
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
      setSchools([]);
    }
  };

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const url = filterSchoolId ? `/api/programs?school_id=${filterSchoolId}` : '/api/programs';
      const data = await api(url);
      if (Array.isArray(data)) {
        setPrograms(data);
      } else {
        setPrograms([]);
      }
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProgram(null);
    setFormData({ name: '', code: '', school_id: filterSchoolId || '' });
    onFormOpen();
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData({ 
      name: program.name, 
      code: program.code || '', 
      school_id: program.school_id 
    });
    onFormOpen();
  };

  const handleDeleteClick = (program) => {
    setDeletingProgram(program);
    setDeleteError(null);
    onDeleteOpen();
  };

  const handleSave = async () => {
    try {
      if (editingProgram) {
        await api(`/api/programs/admin/${editingProgram.id}`, {
          method: 'PATCH',
          body: formData,
        });
        toast({ title: 'Success', description: 'Program updated', status: 'success' });
      } else {
        await api('/api/programs/admin', {
          method: 'POST',
          body: formData,
        });
        toast({ title: 'Success', description: 'Program created', status: 'success' });
      }
      onFormClose();
      fetchPrograms();
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    }
  };

  const confirmDelete = async () => {
    try {
      await api(`/api/programs/admin/${deletingProgram.id}`, { method: 'DELETE' });
      toast({ title: 'Success', description: 'Program deleted', status: 'success' });
      onDeleteClose();
      fetchPrograms();
    } catch (err) {
      if (err.message.includes('existing users')) {
        setDeleteError(err.message);
      } else {
        toast({ title: 'Error', description: err.message, status: 'error' });
      }
    }
  };

  const getSchoolName = (schoolId) => {
    return schools.find(s => s.id === schoolId)?.name || 'Unknown';
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={8}>
        <VStack align="stretch" spacing={1}>
          <Heading size="lg">Programs</Heading>
          <HStack color="gray.500" spacing={2}>
            <Filter size={14} />
            <Select 
              variant="unstyled" 
              size="sm" 
              placeholder="All Schools"
              value={filterSchoolId}
              onChange={(e) => setFilterSchoolId(e.target.value)}
              w="fit-content"
            >
              {Array.isArray(schools) && schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </HStack>
        </VStack>
        <Button leftIcon={<Plus />} colorScheme="blue" onClick={handleAdd}>
          Add Program
        </Button>
      </Flex>

      <Box bg="white" shadow="sm" borderRadius="xl" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>Name</Th>
              <Th>Code</Th>
              <Th>School</Th>
              <Th textAlign="right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Array.isArray(programs) && programs.map((program) => (
              <Tr key={program.id}>
                <Td fontWeight="medium">{program.name}</Td>
                <Td><Text color="gray.500">{program.code || '-'}</Text></Td>
                <Td fontSize="sm" color="gray.600">
                  {getSchoolName(program.school_id)}
                </Td>
                <Td textAlign="right">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={<Edit2 size={16} />}
                    onClick={() => handleEdit(program)}
                    aria-label="Edit"
                    mr={2}
                  />
                  <IconButton
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    icon={<Trash2 size={16} />}
                    onClick={() => handleDeleteClick(program)}
                    aria-label="Delete"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Add/Edit Modal */}
      <Modal isOpen={isFormOpen} onClose={onFormClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingProgram ? 'Edit Program' : 'Add Program'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>School</FormLabel>
                <Select
                  placeholder="Select School"
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                >
                  {Array.isArray(schools) && schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Program Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Code</FormLabel>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. BTCS"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFormClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleSave}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Program
            </AlertDialogHeader>

            <AlertDialogBody>
              {deleteError ? (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Cannot Delete!</AlertTitle>
                    <AlertDescription fontSize="sm">
                      {deleteError}
                    </AlertDescription>
                  </Box>
                </Alert>
              ) : (
                <Text>Are you sure? This action cannot be undone.</Text>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                {deleteError ? 'Close' : 'Cancel'}
              </Button>
              {!deleteError && (
                <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                  Delete
                </Button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
