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
import { adminSidebarItems } from './adminNavigation';

export default function AdminShell({ session, userData, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Top Header */}
      <Box 
        bg="white" 
        borderBottom="1px" 
        borderColor="gray.100" 
        position="fixed" 
        top={0} 
        left={0} 
        right={0} 
        zIndex="sticky"
      >
        <Container maxW="full" px={6}>
          <Flex h={16} align="center" justify="space-between">
            <HStack spacing={3}>
              <Box bg="blue.600" p={1.5} borderRadius="lg" color="white">
                <Icon as={GraduationCap} boxSize={6} />
              </Box>
              <Box>
                <Heading size="md" tracking="tight">RVU Portal</Heading>
                <Text fontSize="xs" color="gray.500">Admin access</Text>
              </Box>
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
                  <Avatar 
                    size="sm" 
                    src={session.user.user_metadata.avatar_url || session.user.user_metadata.picture} 
                    name={userData?.name}
                  />
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
          zIndex="docked"
        >
          <VStack align="stretch" spacing={2}>
            {adminSidebarItems.map((item) => {
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
                  colorScheme={isActive ? 'blue' : 'gray'}
                  justifyContent="flex-start"
                  leftIcon={<Icon as={item.icon} />}
                  size="md"
                  borderRadius="xl"
                  fontSize="sm"
                  fontWeight={isActive ? 'bold' : 'medium'}
                  _hover={{
                    bg: isActive ? 'blue.600' : 'gray.100',
                  }}
                >
                  {item.name}
                </Button>
              );
            })}
          </VStack>
        </Box>

        {/* Main Content */}
        <Box flex="1" ml={{ base: 0, md: '260px' }} p={8}>
          {children}
        </Box>
      </Flex>
    </Box>
  );
}
