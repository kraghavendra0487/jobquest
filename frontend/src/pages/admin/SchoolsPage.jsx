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
} from '@chakra-ui/react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function SchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSchool, setEditingSchool] = useState(null);
  const [deletingSchool, setDeletingSchool] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();

  const [formData, setFormData] = useState({ name: '', code: '' });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const data = await api('/api/schools');
      console.log('Fetched schools:', data);
      if (Array.isArray(data)) {
        setSchools(data);
      } else {
        console.error('Expected array of schools, got:', data);
        setSchools([]);
      }
    } catch (err) {
      console.error('Failed to fetch schools:', err);
      toast({ title: 'Error', description: err.message, status: 'error' });
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSchool(null);
    setFormData({ name: '', code: '' });
    onFormOpen();
  };

  const handleEdit = (school) => {
    setEditingSchool(school);
    setFormData({ name: school.name, code: school.code || '' });
    onFormOpen();
  };

  const handleDeleteClick = (school) => {
    setDeletingSchool(school);
    setDeleteError(null);
    onDeleteOpen();
  };

  const handleSave = async () => {
    try {
      if (editingSchool) {
        await api(`/api/schools/admin/${editingSchool.id}`, {
          method: 'PATCH',
          body: formData,
        });
        toast({ title: 'Success', description: 'School updated', status: 'success' });
      } else {
        await api('/api/schools/admin', {
          method: 'POST',
          body: formData,
        });
        toast({ title: 'Success', description: 'School created', status: 'success' });
      }
      onFormClose();
      fetchSchools();
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    }
  };

  const confirmDelete = async () => {
    try {
      await api(`/api/schools/admin/${deletingSchool.id}`, { method: 'DELETE' });
      toast({ title: 'Success', description: 'School deleted', status: 'success' });
      onDeleteClose();
      fetchSchools();
    } catch (err) {
      if (err.message.includes('existing users or programs')) {
        // We'll parse the error from the backend if possible, or just show the generic message
        setDeleteError(err.message);
      } else {
        toast({ title: 'Error', description: err.message, status: 'error' });
      }
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size="lg">Schools</Heading>
        <Button leftIcon={<Plus />} colorScheme="blue" onClick={handleAdd}>
          Add School
        </Button>
      </Flex>

      <Box bg="white" shadow="sm" borderRadius="xl" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>Name</Th>
              <Th>Code</Th>
              <Th>Created</Th>
              <Th textAlign="right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Array.isArray(schools) && schools.map((school) => (
              <Tr key={school.id}>
                <Td fontWeight="medium">{school.name}</Td>
                <Td><Text color="gray.500">{school.code || '-'}</Text></Td>
                <Td fontSize="sm" color="gray.500">
                  {new Date(school.created_at).toLocaleDateString()}
                </Td>
                <Td textAlign="right">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={<Edit2 size={16} />}
                    onClick={() => handleEdit(school)}
                    aria-label="Edit"
                    mr={2}
                  />
                  <IconButton
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    icon={<Trash2 size={16} />}
                    onClick={() => handleDeleteClick(school)}
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
          <ModalHeader>{editingSchool ? 'Edit School' : 'Add School'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>School Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. School of Business"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Code</FormLabel>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. SOB"
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
              Delete School
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
