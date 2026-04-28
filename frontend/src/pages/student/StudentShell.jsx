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
  Divider,
  VStack,
  HStack,
  Icon,
  Button,
} from '@chakra-ui/react';
import {
  LogOut,
  User as UserIcon,
  GraduationCap,
  Settings,
  Bell,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { studentSidebarItems } from './studentNavigation';

export default function StudentShell({ session, userData, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Box minH="100vh" bg="orange.50">
      <Box
        bg="whiteAlpha.900"
        backdropFilter="blur(12px)"
        borderBottom="1px"
        borderColor="orange.100"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex="sticky"
      >
        <Container maxW="full" px={6}>
          <Flex h={16} align="center" justify="space-between">
            <HStack spacing={3}>
              <Box bg="orange.500" p={1.5} borderRadius="lg" color="white">
                <Icon as={GraduationCap} boxSize={6} />
              </Box>
              <Box>
                <Heading size="md" tracking="tight">RVU Student Portal</Heading>
                <Text fontSize="xs" color="gray.500">Student access</Text>
              </Box>
            </HStack>

            <HStack spacing={4}>
              <IconButton
                variant="ghost"
                icon={<Icon as={Bell} boxSize={5} />}
                color="orange.500"
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
        <Box
          w="260px"
          bg="white"
          borderRight="1px"
          borderColor="orange.100"
          position="fixed"
          h="calc(100vh - 64px)"
          py={8}
          px={4}
          display={{ base: 'none', md: 'block' }}
        >
          <VStack align="stretch" spacing={2}>
            {studentSidebarItems.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

              return (
                <Button
                  key={item.path}
                  as={Link}
                  to={item.path}
                  variant={isActive ? 'solid' : 'ghost'}
                  colorScheme={isActive ? 'orange' : 'gray'}
                  justifyContent="flex-start"
                  leftIcon={<Icon as={item.icon} />}
                  size="md"
                  borderRadius="xl"
                  fontSize="sm"
                  fontWeight={isActive ? 'bold' : 'medium'}
                >
                  {item.name}
                </Button>
              );
            })}
          </VStack>
        </Box>

        <Box flex="1" ml={{ base: 0, md: '260px' }} p={8}>
          {children}
        </Box>
      </Flex>
    </Box>
  );
}
