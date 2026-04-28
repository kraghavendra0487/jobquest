import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Center,
  Image,
  VStack,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { LayoutDashboard, Bell } from "lucide-react";
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

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
  );
}
