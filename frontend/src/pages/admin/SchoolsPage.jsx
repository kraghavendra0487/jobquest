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
  HStack,
  Spinner,
  Badge,
} from '@chakra-ui/react';
import { Plus, Edit2, Trash2, Search, RotateCcw, Check, X } from 'lucide-react';
import { api } from '../../lib/api';

export default function SchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', code: '' });
  const [savingId, setSavingId] = useState(null);
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

  const filteredSchools = schools.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(term) ||
      (s.code || '').toLowerCase().includes(term)
    );
  });

  const handleAdd = () => {
    setFormData({ name: '', code: '' });
    onFormOpen();
  };

  const handleSaveNew = async () => {
    try {
      await api('/api/schools/admin', {
        method: 'POST',
        body: formData,
      });
      toast({ title: 'Success', description: 'School created', status: 'success' });
      onFormClose();
      fetchSchools();
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    }
  };

  const startInlineEdit = (school) => {
    setEditingRowId(school.id);
    setEditForm({ name: school.name || '', code: school.code || '' });
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setEditForm({ name: '', code: '' });
  };

  const commitInlineEdit = async (school) => {
    setSavingId(school.id);
    try {
      const payload = {};
      if (editForm.name !== school.name) payload.name = editForm.name.trim();
      if (editForm.code !== (school.code || '')) payload.code = editForm.code.trim() || null;

      if (Object.keys(payload).length === 0) {
        setEditingRowId(null);
        return;
      }

      await api(`/api/schools/admin/${school.id}`, {
        method: 'PATCH',
        body: payload,
      });
      toast({ title: 'Success', description: 'School updated', status: 'success' });
      setEditingRowId(null);
      fetchSchools();
    } catch (err) {
      toast({ title: 'Error', description: err.message, status: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteClick = (school) => {
    setDeletingSchool(school);
    setDeleteError(null);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    try {
      await api(`/api/schools/admin/${deletingSchool.id}`, { method: 'DELETE' });
      toast({ title: 'Success', description: 'School deleted', status: 'success' });
      onDeleteClose();
      fetchSchools();
    } catch (err) {
      if (err.message.includes('existing users or programs')) {
        setDeleteError(err.message);
      } else {
        toast({ title: 'Error', description: err.message, status: 'error' });
      }
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="stretch" spacing={1}>
          <Heading size="lg">Schools</Heading>
          <Text color="gray.500" fontSize="sm">
            Manage schools and their codes
          </Text>
        </VStack>
        <Button leftIcon={<Plus size={16} />} colorScheme="blue" onClick={handleAdd}>
          Add School
        </Button>
      </Flex>

      {/* Filter Bar */}
      <Box p={4} bg="white" borderRadius="lg" border="1px" borderColor="gray.200" mb={6}>
        <HStack spacing={4}>
          <HStack flex={1} bg="gray.50" px={3} borderRadius="md" border="1px" borderColor="gray.200">
            <Search size={16} color="gray" />
            <Input
              variant="unstyled"
              placeholder="Search by name or code..."
              py={2}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </HStack>
          <IconButton
            icon={<RotateCcw size={18} />}
            variant="ghost"
            onClick={() => setSearchTerm('')}
            aria-label="Reset filters"
          />
        </HStack>
      </Box>

      {/* Table */}
      <Box bg="white" borderRadius="lg" border="1px" borderColor="gray.200" overflow="hidden">
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
            {loading ? (
              <Tr>
                <Td colSpan={4} textAlign="center" py={10}>
                  <Spinner color="blue.500" />
                </Td>
              </Tr>
            ) : filteredSchools.length === 0 ? (
              <Tr>
                <Td colSpan={4} textAlign="center" py={10} color="gray.500">
                  {searchTerm ? 'No schools match your search.' : 'No schools found.'}
                </Td>
              </Tr>
            ) : (
              filteredSchools.map((school) => (
                <Tr key={school.id} _hover={{ bg: 'gray.50' }}>
                  {editingRowId === school.id ? (
                    <>
                      <Td>
                        <Input
                          size="sm"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitInlineEdit(school);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                          autoFocus
                        />
                      </Td>
                      <Td>
                        <Input
                          size="sm"
                          value={editForm.code}
                          onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitInlineEdit(school);
                            if (e.key === 'Escape') cancelInlineEdit();
                          }}
                        />
                      </Td>
                      <Td fontSize="sm" color="gray.500">
                        {new Date(school.created_at).toLocaleDateString()}
                      </Td>
                      <Td textAlign="right">
                        <HStack justify="end" spacing={2}>
                          <IconButton
                            size="sm"
                            colorScheme="green"
                            icon={<Check size={16} />}
                            onClick={() => commitInlineEdit(school)}
                            isLoading={savingId === school.id}
                            aria-label="Save"
                          />
                          <IconButton
                            size="sm"
                            variant="ghost"
                            icon={<X size={16} />}
                            onClick={cancelInlineEdit}
                            aria-label="Cancel"
                          />
                        </HStack>
                      </Td>
                    </>
                  ) : (
                    <>
                      <Td>
                        <Text fontWeight="semibold">{school.name}</Text>
                      </Td>
                      <Td>
                        {school.code ? (
                          <Badge variant="subtle" colorScheme="blue">{school.code}</Badge>
                        ) : (
                          <Text color="gray.400" fontSize="sm">—</Text>
                        )}
                      </Td>
                      <Td fontSize="sm" color="gray.500">
                        {new Date(school.created_at).toLocaleDateString()}
                      </Td>
                      <Td textAlign="right">
                        <HStack justify="end" spacing={2}>
                          <IconButton
                            size="sm"
                            variant="ghost"
                            icon={<Edit2 size={16} />}
                            onClick={() => startInlineEdit(school)}
                            aria-label="Edit"
                          />
                          <IconButton
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            icon={<Trash2 size={16} />}
                            onClick={() => handleDeleteClick(school)}
                            aria-label="Delete"
                          />
                        </HStack>
                      </Td>
                    </>
                  )}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Add Modal */}
      <Modal isOpen={isFormOpen} onClose={onFormClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add School</ModalHeader>
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
            <Button variant="ghost" mr={3} onClick={onFormClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveNew}>
              Save
            </Button>
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
                    <AlertDescription fontSize="sm">{deleteError}</AlertDescription>
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
