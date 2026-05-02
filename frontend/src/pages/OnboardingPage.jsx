import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Center,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Stack,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Icon,
  Select,
  Input,
  useToast,
} from '@chakra-ui/react';
import { User as UserIcon } from "lucide-react";
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

export default function OnboardingPage({ session, onComplete }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [usn, setUsn] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const fetchSchools = useCallback(async () => {
    try {
      const data = await api('/api/schools');
      if (Array.isArray(data)) {
        setSchools(data);
      } else {
        setSchools([]);
      }
    } catch (err) {
      toast({
        title: "Error fetching schools",
        description: err.message,
        status: "error",
        duration: 5000,
      });
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;

    const loadSchools = async () => {
      if (!isMounted) return;
      await fetchSchools();
    };

    loadSchools();

    return () => {
      isMounted = false;
    };
  }, [fetchSchools]);

  const handleSubmit = async () => {
    if (!selectedSchool || !usn) {
      toast({
        title: "Missing fields",
        description: "Please fill in all details",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      const profileData = {
        school_id: selectedSchool,
        usn,
        name: session.user.user_metadata.full_name,
      };

      const updatedUser = await api('/api/users/profile', {
        method: 'POST',
        body: profileData,
      });

      toast({
        title: "Profile saved",
        status: "success",
        duration: 3000,
      });
      
      if (onComplete) onComplete(updatedUser);
    } catch (err) {
      toast({
        title: "Error saving profile",
        description: err.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
              <Select
                placeholder={loading ? "Loading schools..." : "Select School"}
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                h={12}
                isDisabled={loading}
              >
                {Array.isArray(schools) && schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
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
          <Button colorScheme="blue" flex="2" onClick={handleSubmit} isLoading={submitting}>
            Finish Setup
          </Button>
        </CardFooter>
      </Card>
    </Center>
  );
}
