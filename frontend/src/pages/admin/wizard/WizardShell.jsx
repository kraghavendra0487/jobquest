import { Box, HStack, VStack, Text, Icon, Flex } from '@chakra-ui/react';
import { Check, Upload, FileSpreadsheet, Sparkles } from 'lucide-react';

const STEPS = [
  { num: 1, name: 'Upload', icon: Upload, key: 'upload' },
  { num: 2, name: 'Preview & Save', icon: FileSpreadsheet, key: 'preview' },
  { num: 3, name: 'Rate Companies', icon: Sparkles, key: 'rate' },
];

export default function WizardShell({ activeStep, children }) {
  return (
    <Box maxW="1400px" mx="auto">
      <Box bg="white" borderRadius="lg" p={6} mb={6} border="1px" borderColor="gray.200">
        <HStack spacing={0} align="stretch">
          {STEPS.map((s, idx) => {
            const isActive = activeStep === s.num;
            const isDone = activeStep > s.num;
            const isPending = activeStep < s.num;
            return (
              <Flex key={s.num} flex={1} align="center">
                <VStack spacing={1} flex={1}>
                  <Flex
                    w="40px" h="40px" borderRadius="full"
                    bg={isDone ? 'green.500' : isActive ? 'blue.500' : 'gray.200'}
                    color={isPending ? 'gray.500' : 'white'}
                    align="center" justify="center"
                    border="3px solid"
                    borderColor={isActive ? 'blue.200' : 'transparent'}
                  >
                    {isDone ? <Check size={20} /> : <Icon as={s.icon} boxSize={5} />}
                  </Flex>
                  <Text fontSize="xs" fontWeight={isActive ? 'bold' : 'normal'} color={isPending ? 'gray.500' : 'gray.800'}>
                    Step {s.num}: {s.name}
                  </Text>
                </VStack>
                {idx < STEPS.length - 1 && (
                  <Box flex={0.5} h="2px" bg={isDone ? 'green.500' : 'gray.200'} mt="-22px" />
                )}
              </Flex>
            );
          })}
        </HStack>
      </Box>
      {children}
    </Box>
  );
}
