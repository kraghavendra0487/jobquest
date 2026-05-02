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
  ArrowLeft, ExternalLink, Globe, Users, MapPin, Calendar, 
  Briefcase, Info, Star, Save, Sparkles, Pencil, Clock3, Briefcase as BriefcaseIcon,
  LayoutList, Building2, ChevronRight
} from "lucide-react";
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import AdminShell from './admin/AdminShell';

export default function AdminJobDetailPage({ session, userData }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [isUpdatingRating, setIsUpdatingRating] = useState(false);
  const [isAiRating, setIsAiRating] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await api(`/api/admin/jobs/job/${id}`);
        setJob(data);
        setRating(data.rating || 0);
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to fetch job details',
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
      await api(`/api/admin/jobs/job/${id}/rating`, {
        method: 'PATCH',
        body: { rating: parseFloat(rating) }
      });
      toast({
        title: 'Rating Updated',
        status: 'success',
        duration: 2000,
      });
      setJob(prev => ({ ...prev, rating }));
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
      const prompt = `Job Details context:

Title: ${job.job_title}
Company: ${job.pipeline_companies?.company_name || 'N/A'}
Location: ${job.location || 'N/A'}
Posted: ${job.posted_time || 'N/A'}
Applicants: ${job.applicant_count || 'N/A'}
Seniority: ${job.seniority_level || 'N/A'}
Employment Type: ${job.employment_type || 'N/A'}
Job Function: ${job.job_function || 'N/A'}
Industries: ${job.industries || 'N/A'}

Description: ${job.job_description || 'No description available.'}`;

      const result = await api(`/api/admin/jobs/job/${id}/rate-with-ai`, {
        method: 'POST',
        body: { prompt }
      });
      
      const newRating = result.rating;
      const newSchools = result.assigned_schools || [];
      
      setRating(newRating);
      setJob(prev => ({ 
        ...prev, 
        rating: newRating,
        assigned_schools: newSchools 
      }));
      
      toast({
        title: 'AI Rating Complete',
        description: `Job rated: ${newRating}/10`,
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

  if (!job) return null;

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
                <Box p={5} bg="purple.50" borderRadius="2xl" border="1px" borderColor="purple.100">
                  <Icon as={BriefcaseIcon} boxSize={14} color="purple.600" />
                </Box>
                <VStack align="start" spacing={2}>
                  <Heading size="xl" letterSpacing="tight">{job.job_title}</Heading>
                  <HStack spacing={3} wrap="wrap">
                    <Badge colorScheme="purple" borderRadius="lg" px={3} py={1} fontSize="xs">
                      {job.pipeline_companies?.company_name || 'N/A'}
                    </Badge>
                    {job.assigned_schools && job.assigned_schools.length > 0 && (
                      <HStack spacing={1}>
                        {job.assigned_schools.map(code => (
                          <Badge key={code} colorScheme="blue" variant="solid" borderRadius="lg" px={2} py={0.5} fontSize="10px">
                            {code}
                          </Badge>
                        ))}
                      </HStack>
                    )}
                    <HStack spacing={1} color="gray.500">
                      <Icon as={MapPin} size={14} />
                      <Text fontSize="sm" fontWeight="medium">{job.location || 'N/A'}</Text>
                    </HStack>
                    <Box h="4px" w="4px" bg="gray.300" borderRadius="full" display={{ base: 'none', sm: 'block' }} />
                    <HStack spacing={1} color="orange.500" fontWeight="bold" bg="orange.50" px={2} py={0.5} borderRadius="md">
                      <HStack spacing={0.5}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon 
                            key={star}
                            as={Star} 
                            size={14} 
                            fill={star <= (job.rating / 2) ? "currentColor" : "none"} 
                          />
                        ))}
                      </HStack>
                      <Text fontSize="sm" ml={1}>{job.rating || 0}/10</Text>
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
                      colorScheme={job.rating > 0 ? "blue" : "orange"}
                      variant={job.rating > 0 ? "outline" : "solid"}
                      borderRadius="xl"
                      px={6}
                    >
                      {job.rating > 0 ? "" : "Rate Now"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent p={0} borderRadius="2xl" shadow="2xl" border="none" overflow="hidden" w="320px">
                    <PopoverHeader bg="gray.50" borderBottom="1px" borderColor="gray.100" py={4} fontWeight="bold">
                      <HStack spacing={2}>
                        <Icon as={Star} color="orange.400" />
                        <Text>Job Rating</Text>
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
                {job.job_link && (
                  <Button 
                    as="a" 
                    href={job.job_link} 
                    target="_blank"
                    rel="noopener noreferrer"
                    leftIcon={<ExternalLink size={16} />} 
                    colorScheme="blue"
                    borderRadius="xl"
                  >
                    View Original
                  </Button>
                )}
              </HStack>
            </Flex>

            <Divider my={8} />

            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} gap={8}>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Clock3} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Posted</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{job.posted_time || 'N/A'}</Text>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Users} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Applicants</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{job.applicant_count || 'N/A'}</Text>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Info} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Seniority</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{job.seniority_level || 'N/A'}</Text>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={BriefcaseIcon} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Employment Type</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{job.employment_type || 'N/A'}</Text>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Settings} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Function</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800">{job.job_function || 'N/A'}</Text>
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={1}>
                  <HStack color="gray.400" spacing={1.5}>
                    <Icon as={Building2} size={14} />
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">Industries</Text>
                  </HStack>
                  <Text fontWeight="bold" fontSize="lg" color="gray.800" isTruncated maxW="full">{job.industries || 'N/A'}</Text>
                </VStack>
              </GridItem>
            </Grid>
          </CardBody>
        </Card>

        <Card shadow="sm" borderRadius="2xl" border="1px" borderColor="gray.100">
          <CardBody p={8}>
            <VStack align="start" spacing={6}>
              <Box w="full">
                <Heading size="md" mb={4}>Job Description</Heading>
                <Text color="gray.700" lineHeight="tall" whiteSpace="pre-wrap">
                  {job.job_description || 'No description available.'}
                </Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {job.pipeline_companies && (
          <Card shadow="sm" borderRadius="2xl" border="1px" borderColor="gray.100" bg="blue.50">
            <CardBody p={8}>
              <VStack align="start" spacing={6}>
                <Flex justify="space-between" align="center" w="full">
                  <HStack spacing={4}>
                    <Box p={3} bg="white" borderRadius="xl" border="1px" borderColor="blue.100">
                      <Icon as={Building2} boxSize={8} color="blue.600" />
                    </Box>
                    <Box>
                      <Heading size="md">About {job.pipeline_companies.company_name}</Heading>
                      <Text fontSize="sm" color="gray.600">{job.pipeline_companies.industry || 'Industry not specified'}</Text>
                    </Box>
                  </HStack>
                  <Button
                    as={Link}
                    to={`/admin-company-detail/${job.pipeline_companies.id}`}
                    rightIcon={<ChevronRight size={16} />}
                    variant="outline"
                    colorScheme="blue"
                    bg="white"
                    borderRadius="xl"
                  >
                    View Full Profile
                  </Button>
                </Flex>

                <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6} w="full">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">Location</Text>
                    <Text fontWeight="semibold">{job.pipeline_companies.location || 'N/A'}</Text>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">Size</Text>
                    <Text fontWeight="semibold">{job.pipeline_companies.company_size || 'N/A'}</Text>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">Website</Text>
                    {job.pipeline_companies.website ? (
                      <ChakraLink href={job.pipeline_companies.website} isExternal color="blue.600" fontWeight="semibold" noOfLines={1}>
                        {job.pipeline_companies.website}
                      </ChakraLink>
                    ) : (
                      <Text fontWeight="semibold">N/A</Text>
                    )}
                  </VStack>
                </Grid>

                {job.pipeline_companies.about_us && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={2}>Company Overview</Text>
                    <Text color="gray.700" fontSize="sm" noOfLines={4}>
                      {job.pipeline_companies.about_us}
                    </Text>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </AdminShell>
  );
}
