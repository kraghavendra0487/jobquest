import { useState, useEffect } from 'react';
import {
  Box, Container, Flex, Heading, Text, Avatar, IconButton, Menu, MenuButton,
  MenuList, MenuItem, Divider, Icon, Button, VStack, HStack, Spinner, 
  useToast, Badge, Card, CardBody, Grid, GridItem, Link as ChakraLink,
  FormControl, FormLabel, Popover, PopoverTrigger, Input,
  PopoverContent, PopoverHeader, PopoverBody, PopoverArrow, PopoverCloseButton
} from '@chakra-ui/react';
import {
  Settings, GraduationCap,
  Building2, ArrowLeft, ExternalLink, Globe, Users, MapPin, Calendar, 
  Briefcase, Info, Star, Save, Sparkles, Pencil, LayoutList
} from "lucide-react";
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import AdminShell from './admin/AdminShell';

export default function CompanyDetailPage({ session, userData }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [isUpdatingRating, setIsUpdatingRating] = useState(false);
  const [isAiRating, setIsAiRating] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await api(`/api/admin/companies/company/${id}`);
        setCompany(data);
        setRating(data.rating || 0);
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to fetch company details',
          status: 'error',
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleUpdateRating = async () => {
    setIsUpdatingRating(true);
    try {
      await api(`/api/admin/companies/company/${id}/rating`, {
        method: 'PATCH',
        body: { rating: parseFloat(rating) }
      });
      toast({
        title: 'Rating Updated',
        status: 'success',
        duration: 2000,
      });
      setCompany(prev => ({ ...prev, rating }));
    } catch (err) {
      toast({
        title: 'Error updating rating',
        description: err.message,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsUpdatingRating(false);
    }
  };

  const handleAiRate = async () => {
    setIsAiRating(true);
    try {
      const prompt = `Company Data context:

Name: ${company.company_name}
Website: ${details.website || 'N/A'}
Industry: ${details.industry || 'N/A'}
Location: ${details.location || 'N/A'}
Size: ${details.company_size || 'N/A'}
Employees: ${details.employees_count || 'N/A'}
Followers: ${details.followers_count || 'N/A'}
Founded: ${details.founded || 'N/A'}
Type: ${details.company_type || 'N/A'}
Specialties: ${details.specialties || 'N/A'}
LinkedIn: ${company.company_link || 'N/A'}

About: ${details.about_us || 'No description available.'}

rate this company for 0 to 10.0 , give me output in decimal only [ eg 7.4 ]`;

      const result = await api(`/api/admin/companies/company/${id}/rate-with-ai`, {
        method: 'POST',
        body: { prompt }
      });
      
      const newRating = result.rating;
      setRating(newRating);
      setCompany(prev => ({ ...prev, rating: newRating }));
      
      toast({
        title: 'AI Rating Complete',
        description: `Company rated: ${newRating}/10`,
        status: 'success',
        duration: 3000
      });
    } catch (err) {
      toast({
        title: 'AI Rating Failed',
        description: err.message,
        status: 'error',
      });
    } finally {
      setIsAiRating(false);
    }
  };

  if (loading) {
    return (
      <Flex h="100vh" align="center" justify="center">
        <Spinner size="xl" color="blue.500" thickness="4px" />
      </Flex>
    );
  }

  if (!company) return null;

  const details = Array.isArray(company.pipeline_company_details) 
    ? (company.pipeline_company_details[0] || {}) 
    : (company.pipeline_company_details || {});

  console.log('Company Details Object:', details);

  return (
    <AdminShell session={session} userData={userData}>
      <VStack align="stretch" spacing={8}>
        <Button 
          leftIcon={<ArrowLeft size={16} />} 
          variant="ghost" 
          alignSelf="flex-start" 
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>

        <Card shadow="sm" borderRadius="2xl" border="1px" borderColor="gray.100" bg="white">
          <CardBody p={8}>
            <Flex justify="space-between" align="start" direction={{ base: 'column', md: 'row' }} gap={6}>
              <HStack spacing={6} align="start">
                <Box p={5} bg="blue.50" borderRadius="2xl" border="1px" borderColor="blue.100">
                  <Icon as={Building2} boxSize={14} color="blue.600" />
                </Box>
                <VStack align="start" spacing={2}>
                  <Heading size="xl" letterSpacing="tight">{company.company_name}</Heading>
                  <HStack spacing={3} wrap="wrap">
                    <Badge colorScheme="blue" borderRadius="lg" px={3} py={1} fontSize="xs">{details.industry || 'Unknown Industry'}</Badge>
                    <HStack spacing={1} color="gray.500">
                      <Icon as={MapPin} size={14} />
                      <Text fontSize="sm" fontWeight="medium">{details.location || 'N/A'}</Text>
                    </HStack>
                    <Box h="4px" w="4px" bg="gray.300" borderRadius="full" display={{ base: 'none', sm: 'block' }} />
                    <HStack spacing={1} color="orange.500" fontWeight="bold" bg="orange.50" px={2} py={0.5} borderRadius="md">
                      <HStack spacing={0.5}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon 
                            key={star}
                            as={Star} 
                            size={14} 
                            fill={star <= (company.rating / 2) ? "currentColor" : "none"} 
                          />
                        ))}
                      </HStack>
                      <Text fontSize="sm" ml={1}>{company.rating || 0}/10</Text>
                    </HStack>
                  </HStack>
                </VStack>
              </HStack>
              <HStack spacing={3}>
                <Popover placement="bottom-end" closeOnBlur={false}>
                  <PopoverTrigger>
                    <Button 
                      leftIcon={<Icon as={Pencil} size={14} />} 
                      rightIcon={<Icon as={Star} size={14} />}
                      colorScheme={company.rating > 0 ? "blue" : "orange"}
                      variant={company.rating > 0 ? "outline" : "solid"}
                      borderRadius="xl"
                      px={6}
                    >
                      {company.rating > 0 ? "" : "Rate Now"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent p={0} borderRadius="2xl" shadow="2xl" border="none" overflow="hidden" w="320px">
                    <PopoverHeader bg="gray.50" borderBottom="1px" borderColor="gray.100" py={4} fontWeight="bold">
                      <HStack spacing={2}>
                        <Icon as={Star} color="orange.400" />
                        <Text>Company Rating</Text>
                      </HStack>
                    </PopoverHeader>
                    <PopoverArrow bg="gray.50" />
                    <PopoverCloseButton mt={2} />
                    <PopoverBody p={6}>
                      <VStack align="stretch" spacing={6}>
                        {/* Manual Rating Section */}
                        <Box>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={3}>Manual Rating (0-10)</Text>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="Enter score (e.g. 7.4)"
                              value={rating} 
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (!isNaN(val) && parseFloat(val) >= 0 && parseFloat(val) <= 10)) {
                                  setRating(val);
                                }
                              }}
                              borderRadius="xl" 
                              bg="white" 
                              h="48px"
                              _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px blue.400' }}
                            />
                          </FormControl>
                          <Button 
                            mt={3}
                            w="full"
                            colorScheme="blue" 
                            leftIcon={<Save size={16} />} 
                            onClick={handleUpdateRating}
                            isLoading={isUpdatingRating}
                            isDisabled={rating === ''}
                            borderRadius="xl"
                            h="48px"
                          >
                            Save Manual
                          </Button>
                        </Box>

                        <Divider />

                        {/* AI Rating Section */}
                        <Box>
                          <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={3}>AI Assistant</Text>
                          <Button 
                            w="full"
                            colorScheme="purple" 
                            variant="solid"
                            leftIcon={<Sparkles size={16} />} 
                            onClick={handleAiRate}
                            isLoading={isAiRating}
                            loadingText="AI Thinking..."
                            borderRadius="xl"
                            h="48px"
                          >
                            AI Rating
                          </Button>
                          <Text fontSize="xs" color="gray.400" mt={2} textAlign="center">Auto-generate score from data</Text>
                        </Box>
                      </VStack>
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
                {details.website && details.website !== 'N/A' && (
                  <Button 
                    as="a" 
                    href={details.website} 
                    target="_blank"
                    rel="noopener noreferrer"
                    leftIcon={<Globe size={16} />} 
                    colorScheme="blue" 
                    variant="outline"
                    borderRadius="xl"
                  >
                    Website
                  </Button>
                )}
                <Button 
                  as="a" 
                  href={company.company_link} 
                  target="_blank"
                  rel="noopener noreferrer"
                  leftIcon={<ExternalLink size={16} />} 
                  colorScheme="blue"
                  borderRadius="xl"
                >
                  LinkedIn
                </Button>
              </HStack>
            </Flex>

            <Divider my={8} />

            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} gap={8}>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Users} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Followers</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{details.followers_count || 'N/A'}</Text>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Briefcase} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Employees</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{details.employees_count || 'N/A'}</Text>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Info} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Size</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{details.company_size || 'N/A'}</Text>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Calendar} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Founded</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{details.founded || 'N/A'}</Text>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Building2} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Type</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{details.company_type || 'N/A'}</Text>
                </VStack>
              </GridItem>
            </Grid>
          </CardBody>
        </Card>

        <Card shadow="sm" borderRadius="2xl" border="1px" borderColor="gray.100">
          <CardBody p={8}>
            <VStack align="start" spacing={6}>
              <Box w="full">
                <Heading size="md" mb={4}>About Us</Heading>
                <Text color="gray.700" lineHeight="tall" whiteSpace="pre-wrap">
                  {details.about_us || 'No description available.'}
                </Text>
              </Box>
              
              {details.specialties && details.specialties !== 'N/A' && (
                <Box w="full">
                  <Heading size="md" mb={4}>Specialties</Heading>
                  <Flex wrap="wrap" gap={2}>
                    {details.specialties.split(',').map((spec, i) => (
                      <Badge key={i} colorScheme="gray" px={3} py={1} borderRadius="lg">
                        {spec.trim()}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </AdminShell>
  );
}
