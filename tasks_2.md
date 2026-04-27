# Trae prompt — Phase 4.8: Upload wizard (3 resumable steps + sidebar entry)

> Goal: replace the scattered "click Job Uploads → click Companies → click Categorization" flow with **one guided wizard** at `/admin/upload-wizard` that walks the admin through Upload → Preview → Rate Companies as 3 numbered steps. Existing pages (Companies, Categorization, Approval Queue, Job Uploads) stay where they are in the sidebar — they're for one-off work. The wizard is the new happy path.

> **What's already done** (verified from latest zip): `companies` table auto-populates on save (Phase 4.7 migration 009 ran), Vite proxy works, `RateCompanyPage` exists for per-company rating, `/api/admin/ai/playground` and `/api/admin/ai/estimate` work, `/api/admin/ai/companies/rate-batch` exists. Use what's there. Do not rebuild.

---

## 0. Decisions locked in (don't second-guess these)

- **Refresh mid-flow → land back on Step 1 (upload screen)** as if starting over. **But** the Upload History list (also on Step 1) gets a "Resume" button per row that jumps to the correct step based on `job_uploads.status`. So no progress is ever lost — you just have to click Resume to pick it up.
- **Step 3 left panel** = companies from THIS upload only. Not all companies ever. Not joined with history.
- **AI ratings auto-apply** to the DB on batch completion, but the UI shows them inline-editable. Admin can override any rating before clicking "Next".
- **No new backend endpoints.** Reuse `/api/admin/job-uploads/preview`, `/save`, `/api/admin/ai/companies/rate-batch`, `/api/admin/ai/batches/:id`. The wizard is purely a frontend reorganization.
- **State machine is already in `job_uploads.status`**: `previewed | saved | rating | rated | categorizing | done | failed`. Wizard reads this to determine which step to resume at.

---

## 1. Add wizard entry to sidebar

Edit `frontend/src/pages/admin/AdminLayout.jsx`. At the top of `navItems`, prepend a new item that becomes the most prominent button:

```js
import { Sparkles } from 'lucide-react';  // already imported other lucide icons, add this

const navItems = [
  { name: 'Upload Wizard', icon: Sparkles, path: '/admin/upload-wizard', highlight: true },
  { name: 'Schools', icon: School, path: '/admin/schools' },
  { name: 'Programs', icon: BookOpen, path: '/admin/programs' },
  { name: 'Job Uploads', icon: Upload, path: '/admin/job-uploads' },
  { name: 'Master Jobs', icon: Briefcase, path: '/admin/jobs' },
  { name: 'Companies', icon: Building2, path: '/admin/companies' },
];
```

In the `navItems.map(...)` render, special-case `item.highlight`:

```jsx
{navItems.map((item) => (
  <Button
    key={item.path}
    as={Link}
    to={item.path}
    variant={location.pathname.startsWith(item.path) ? 'solid' : item.highlight ? 'outline' : 'ghost'}
    colorScheme={location.pathname.startsWith(item.path) ? 'blue' : item.highlight ? 'blue' : 'gray'}
    justifyContent="flex-start"
    leftIcon={<Icon as={item.icon} />}
    size="md"
    borderRadius="lg"
    fontWeight={item.highlight ? 'bold' : 'normal'}
  >
    {item.name}
  </Button>
))}
```

Note `startsWith` — the wizard has nested routes (`/admin/upload-wizard`, `/admin/upload-wizard/:upload_id/preview`, etc.) and the sidebar should highlight for all of them.

### Acceptance — 1
- [ ] "Upload Wizard" appears as the first item in the sidebar with an outlined button (stands out)
- [ ] Clicking it navigates to `/admin/upload-wizard`

---

## 2. Routes — add to `frontend/src/App.jsx`

Inside the `/admin` Route children, add these THREE new routes near the top (above `schools`):

```jsx
<Route path="upload-wizard" element={<UploadWizardStep1 />} />
<Route path="upload-wizard/:upload_id/preview" element={<UploadWizardStep2 />} />
<Route path="upload-wizard/:upload_id/rate" element={<UploadWizardStep3 />} />
```

And the imports:

```jsx
import UploadWizardStep1 from './pages/admin/wizard/UploadWizardStep1';
import UploadWizardStep2 from './pages/admin/wizard/UploadWizardStep2';
import UploadWizardStep3 from './pages/admin/wizard/UploadWizardStep3';
```

Create the directory `frontend/src/pages/admin/wizard/` and put the three files there.

---

## 3. Shared wizard shell — `frontend/src/pages/admin/wizard/WizardShell.jsx`

This is the stepper bar shown at the top of every wizard step. Reused by all 3 step pages.

```jsx
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
```

---

## 4. Step 1 — `wizard/UploadWizardStep1.jsx`

Two sections: "Upload new Excel" on top, "Upload History (resumable)" below. The Resume button per history row reads `status` and routes to the right step.

```jsx
import {
  Box, VStack, HStack, Heading, Text, Button, Input, useToast,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner, Center, IconButton, Icon
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Play, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import WizardShell from './WizardShell';

async function authedFetch(url, options = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, ...(options.headers || {}) },
  });
}

// Map status -> {step, label, color}
const STATUS_MAP = {
  previewed:    { step: 2, label: 'Awaiting save',     color: 'orange' },
  saved:        { step: 3, label: 'Ready to rate',     color: 'blue'   },
  rating:       { step: 3, label: 'Rating in progress', color: 'purple' },
  rated:        { step: 3, label: 'Rated',             color: 'green'  },
  categorizing: { step: 3, label: 'Categorizing',      color: 'purple' },
  done:         { step: 3, label: 'Done',              color: 'gray'   },
  failed:       { step: 1, label: 'Failed',            color: 'red'    },
};

export default function UploadWizardStep1() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInput = useRef();

  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('job_uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error) setHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => { loadHistory(); }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authedFetch('/api/admin/job-uploads/preview', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast({ title: 'Preview generated', status: 'success', duration: 1500 });
      navigate(`/admin/upload-wizard/${data.upload_id}/preview`);
    } catch (e) {
      toast({ title: 'Upload failed', description: e.message, status: 'error' });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const resumeUpload = (upload) => {
    const map = STATUS_MAP[upload.status] || STATUS_MAP.previewed;
    if (map.step === 1) {
      toast({ title: 'This upload failed — please re-upload', status: 'warning' });
      return;
    }
    if (map.step === 2) {
      // status='previewed' but cache is gone after server restart → must re-upload
      toast({
        title: 'Preview expired',
        description: 'Re-upload the file to re-generate the preview.',
        status: 'warning',
      });
      return;
    }
    navigate(`/admin/upload-wizard/${upload.id}/rate`);
  };

  return (
    <WizardShell activeStep={1}>
      <Box bg="white" p={8} borderRadius="lg" border="1px" borderColor="gray.200" mb={6}>
        <VStack align="stretch" spacing={4}>
          <Heading size="md">Upload Excel file</Heading>
          <Text color="gray.600" fontSize="sm">
            LinkedIn job export (.xlsx). Companies and jobs are auto-deduped by canonical IDs.
          </Text>
          <HStack>
            <Input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFile(e.target.files?.[0])}
              isDisabled={uploading}
              p={1}
            />
            <Button
              leftIcon={<Upload size={16} />}
              colorScheme="blue"
              isLoading={uploading}
              loadingText="Parsing..."
              onClick={() => fileInput.current?.click()}
            >
              Choose file
            </Button>
          </HStack>
        </VStack>
      </Box>

      <Box bg="white" p={6} borderRadius="lg" border="1px" borderColor="gray.200">
        <HStack justify="space-between" mb={4}>
          <Heading size="md">Upload History</Heading>
          <IconButton
            icon={<RefreshCw size={16} />}
            onClick={loadHistory}
            isLoading={loadingHistory}
            size="sm"
            variant="ghost"
            aria-label="Refresh"
          />
        </HStack>
        {loadingHistory ? (
          <Center py={8}><Spinner /></Center>
        ) : history.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={8}>No uploads yet</Text>
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>File</Th>
                <Th isNumeric>Rows</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {history.map((u) => {
                const m = STATUS_MAP[u.status] || STATUS_MAP.failed;
                return (
                  <Tr key={u.id}>
                    <Td>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>{u.filename}</Text>
                    </Td>
                    <Td isNumeric fontSize="sm">{u.inserted_rows || u.valid_rows}</Td>
                    <Td><Badge colorScheme={m.color}>{m.label}</Badge></Td>
                    <Td fontSize="xs" color="gray.500">
                      {new Date(u.created_at).toLocaleString()}
                    </Td>
                    <Td>
                      <Button
                        size="xs"
                        colorScheme="blue"
                        leftIcon={<Play size={12} />}
                        onClick={() => resumeUpload(u)}
                        isDisabled={u.status === 'failed'}
                      >
                        Resume
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>
    </WizardShell>
  );
}
```

### Acceptance — 2
- [ ] Sidebar → "Upload Wizard" → see Step 1 highlighted in stepper, upload area on top, history below
- [ ] Pick a file → preview generated → auto-navigates to `/admin/upload-wizard/:id/preview`
- [ ] Refresh → land back on Step 1 (per the decision), see the in-progress upload in history with status badge
- [ ] Click Resume on a `saved`/`rated`/`done` row → jumps to Step 3
- [ ] Click Resume on a `previewed` row → toast "Preview expired, re-upload"
- [ ] Click Resume on `failed` row → button is disabled

---

## 5. Step 2 — `wizard/UploadWizardStep2.jsx`

Pure preview confirmation. The preview data is in the `uploadCache` server-side, returned by the `/preview` call from Step 1 — but we navigated away. We need to refetch the preview summary from the server.

**Backend gap:** there's no GET endpoint for previewed-but-not-saved uploads. Add one.

### 5.1 Backend addition: `GET /api/admin/job-uploads/:id/preview-summary`

In `backend/controllers/jobUploadController.js`, add:

```js
/**
 * GET /api/admin/job-uploads/:upload_id/preview-summary
 * Returns the cached preview summary if still in cache.
 * If cache expired (server restart), returns 410.
 */
async getPreviewSummary(req, res) {
  const { upload_id } = req.params;
  try {
    const cached = uploadCache.get(upload_id);
    if (!cached) {
      // Check if it was already saved
      const upload = await jobUploadModel.findById(upload_id);
      if (upload && upload.status !== 'previewed') {
        return res.json({
          upload_id,
          already_saved: true,
          status: upload.status,
          inserted_rows: upload.inserted_rows,
        });
      }
      return res.status(410).json({ error: 'Preview expired. Please re-upload.' });
    }
    return res.json({
      upload_id,
      already_saved: false,
      total_rows: cached.summary.total_rows,
      valid_rows: cached.summary.valid_rows,
      invalid_rows: cached.summary.invalid_rows,
      duplicate_in_file: cached.summary.duplicate_in_file,
      duplicate_in_db: cached.summary.duplicate_in_db,
      new_rows: cached.summary.new_rows,
      sample: cached.jobs.slice(0, 10),  // first 10 for visual inspection
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
},
```

In `backend/routers/jobUploadRouter.js`, add (above the save route):

```js
router.get('/:upload_id/preview-summary', jobUploadController.getPreviewSummary);
```

> **Required:** confirm `cached.summary` actually contains those fields. If your `uploadCache.set` shape is different, adapt the mapping. Run a quick `console.log(cached)` once to verify.

### 5.2 Frontend: `wizard/UploadWizardStep2.jsx`

```jsx
import {
  Box, VStack, HStack, Heading, Text, Button, useToast,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner, Center,
  Stat, StatLabel, StatNumber, SimpleGrid, Alert, AlertIcon
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import WizardShell from './WizardShell';

async function authedFetch(url, options = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, ...(options.headers || {}) },
  });
}

export default function UploadWizardStep2() {
  const { upload_id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch(`/api/admin/job-uploads/${upload_id}/preview-summary`);
        const data = await res.json();
        if (res.status === 410) {
          setExpired(true);
        } else if (!res.ok) {
          throw new Error(data.error);
        } else if (data.already_saved) {
          // skip ahead
          navigate(`/admin/upload-wizard/${upload_id}/rate`, { replace: true });
        } else {
          setSummary(data);
        }
      } catch (e) {
        toast({ title: 'Failed to load preview', description: e.message, status: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [upload_id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authedFetch(`/api/admin/job-uploads/${upload_id}/save`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `Saved ${data.inserted} jobs`, status: 'success' });
      navigate(`/admin/upload-wizard/${upload_id}/rate`);
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <WizardShell activeStep={2}><Center py={20}><Spinner /></Center></WizardShell>;

  if (expired) {
    return (
      <WizardShell activeStep={2}>
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Preview expired</Text>
            <Text fontSize="sm">The server restarted or too much time passed. Please re-upload the file.</Text>
            <Button mt={3} size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/admin/upload-wizard')}>
              Back to upload
            </Button>
          </Box>
        </Alert>
      </WizardShell>
    );
  }

  return (
    <WizardShell activeStep={2}>
      <VStack align="stretch" spacing={6}>
        <Box bg="white" p={6} borderRadius="lg" border="1px" borderColor="gray.200">
          <Heading size="md" mb={4}>Preview summary</Heading>
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
            <Stat><StatLabel fontSize="xs">Total rows</StatLabel><StatNumber>{summary.total_rows}</StatNumber></Stat>
            <Stat><StatLabel fontSize="xs">Valid</StatLabel><StatNumber color="green.600">{summary.valid_rows}</StatNumber></Stat>
            <Stat><StatLabel fontSize="xs">New</StatLabel><StatNumber color="blue.600">{summary.new_rows}</StatNumber></Stat>
            <Stat><StatLabel fontSize="xs">Dup in file</StatLabel><StatNumber color="orange.600">{summary.duplicate_in_file}</StatNumber></Stat>
            <Stat><StatLabel fontSize="xs">Dup in DB</StatLabel><StatNumber color="gray.600">{summary.duplicate_in_db}</StatNumber></Stat>
          </SimpleGrid>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" border="1px" borderColor="gray.200">
          <Heading size="sm" mb={4}>Sample (first 10 normalized rows)</Heading>
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Title</Th>
                  <Th>Company</Th>
                  <Th>Location</Th>
                  <Th>Posted</Th>
                </Tr>
              </Thead>
              <Tbody>
                {(summary.sample || []).map((row, i) => (
                  <Tr key={i}>
                    <Td fontSize="xs"><Text noOfLines={1}>{row.title}</Text></Td>
                    <Td fontSize="xs">{row.company}</Td>
                    <Td fontSize="xs">{row.location}</Td>
                    <Td fontSize="xs" color="gray.500">{row.posted_relative}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>

        <HStack justify="space-between">
          <Button leftIcon={<ArrowLeft size={16} />} variant="ghost"
            onClick={() => navigate('/admin/upload-wizard')}>
            Back to upload
          </Button>
          <Button rightIcon={<Save size={16} />} colorScheme="blue" size="lg"
            isLoading={saving} loadingText="Saving..." onClick={handleSave}>
            Save & continue to rating
          </Button>
        </HStack>
      </VStack>
    </WizardShell>
  );
}
```

### Acceptance — 3
- [ ] After uploading on Step 1, lands on Step 2 with summary stats + 10-row sample
- [ ] Refresh → if cache still alive: still on Step 2. If expired: warning + button back to Step 1.
- [ ] Click Save → success toast, jumps to Step 3
- [ ] If you navigate to `/admin/upload-wizard/:id/preview` for an upload that's already `saved`+ → auto-redirects to Step 3 (no re-save)

---

## 6. Step 3 — `wizard/UploadWizardStep3.jsx`

The big one. **40/60 split**: left = companies-from-this-upload, right = prompt + run + insights.

### Layout requirements

LEFT (40%):
- List of companies for this upload, fetched via:
  ```sql
  -- conceptually:
  SELECT DISTINCT c.* FROM companies c
  JOIN jobs j ON j.company_id = c.id
  WHERE j.upload_id = $1
  ORDER BY c.rating DESC NULLS LAST, c.name;
  ```
  In supabase-js this is two queries: get distinct `company_id`s from `jobs WHERE upload_id`, then `companies WHERE id IN (...)`.
- Each row shows: company name, rating badge (or "—" if unrated), inline-editable rating select (1–5 dropdown), and a small reason tooltip if rated.
- Edit dropdown writes directly to `companies.rating` via supabase, optimistic update.

RIGHT (60%):
- Top: counts (rated / unrated) — big bold numbers
- Middle: prompt selector + system prompt textarea + user template textarea (read from `prompts` where `purpose = 'rate_company'`)
- Below that: token + cost estimate (live, calls `/api/admin/ai/estimate`)
- Big "Run AI Rating" button
- Below button: when running, show progress; when done, show batch result summary + `Next →` button

### Polling for running batches

When user clicks Run, the call returns a `batch_id`. Poll `GET /api/admin/ai/batches/:id` every 2s until `status` is `done | failed | cancelled`. While polling, show progress bar. On `done`, refetch the company list (which now has updated ratings).

### File: `frontend/src/pages/admin/wizard/UploadWizardStep3.jsx`

```jsx
import {
  Box, Grid, GridItem, VStack, HStack, Heading, Text, Button, Select,
  Textarea, useToast, Badge, Spinner, Center, Stat, StatLabel, StatNumber,
  SimpleGrid, Progress, Alert, AlertIcon, Tooltip, IconButton, Divider
} from '@chakra-ui/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import WizardShell from './WizardShell';

async function authedFetch(url, options = {}) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export default function UploadWizardStep3() {
  const { upload_id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userTemplate, setUserTemplate] = useState('');

  const [estimate, setEstimate] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeBatch, setActiveBatch] = useState(null);
  const pollRef = useRef(null);

  const ratedCount = companies.filter(c => c.rating != null).length;
  const unratedCount = companies.length - ratedCount;
  const unratedIds = companies.filter(c => c.rating == null && !c.rating_locked).map(c => c.id);

  // Load companies for this upload
  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      // Get distinct company_ids in this upload
      const { data: jobs, error: je } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('upload_id', upload_id)
        .not('company_id', 'is', null);
      if (je) throw je;
      const ids = [...new Set(jobs.map(j => j.company_id))];
      if (ids.length === 0) { setCompanies([]); return; }
      const { data: cos, error: ce } = await supabase
        .from('companies')
        .select('id, name, display_name, rating, reason, rating_locked, rated_by, rated_by_model')
        .in('id', ids)
        .order('rating', { ascending: false, nullsLast: true })
        .order('name');
      if (ce) throw ce;
      setCompanies(cos || []);
    } catch (e) {
      toast({ title: 'Failed to load companies', description: e.message, status: 'error' });
    } finally { setLoading(false); }
  }, [upload_id, toast]);

  // Load prompts (rate_company purpose only)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('prompts')
        .select('id, name, system_prompt, user_template, is_default, version')
        .eq('purpose', 'rate_company')
        .eq('is_archived', false)
        .order('is_default', { ascending: false });
      const list = data || [];
      setPrompts(list);
      const def = list.find(p => p.is_default) || list[0];
      if (def) {
        setSelectedPromptId(def.id);
        setSystemPrompt(def.system_prompt || '');
        setUserTemplate(def.user_template || '');
      }
    })();
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  // Live estimate
  useEffect(() => {
    if (unratedIds.length === 0 || !systemPrompt) { setEstimate(null); return; }
    const t = setTimeout(async () => {
      try {
        const sampleNames = companies.filter(c => c.rating == null).slice(0, 20).map(c => ({ name: c.name }));
        const renderedUser = userTemplate.replace('{{companies}}', JSON.stringify(sampleNames));
        const res = await authedFetch('/api/admin/ai/estimate', {
          method: 'POST',
          body: JSON.stringify({ system_prompt: systemPrompt, user_input: renderedUser, expected_output_tokens: 400 }),
        });
        const data = await res.json();
        if (res.ok) {
          // Multiply by number of batches
          const batches = Math.ceil(unratedIds.length / 20);
          setEstimate({
            ...data,
            batches,
            total_cost_usd: data.estimated_cost_usd * batches,
          });
        }
      } catch {/* non-fatal */}
    }, 400);
    return () => clearTimeout(t);
  }, [systemPrompt, userTemplate, unratedIds.length, companies]);

  // Poll batch status
  const pollBatch = (batchId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await authedFetch(`/api/admin/ai/batches/${batchId}`);
      const data = await res.json();
      if (!res.ok) {
        clearInterval(pollRef.current);
        setRunning(false);
        toast({ title: 'Batch poll failed', description: data.error, status: 'error' });
        return;
      }
      setActiveBatch(data);
      if (['done', 'failed', 'cancelled'].includes(data.status)) {
        clearInterval(pollRef.current);
        setRunning(false);
        loadCompanies();
        toast({
          title: `Batch ${data.status}`,
          description: data.status === 'done' ? `Rated ${data.processed_count} companies` : data.error_message || '',
          status: data.status === 'done' ? 'success' : 'warning',
          duration: 4000,
        });
      }
    }, 2000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleRunAI = async () => {
    if (unratedIds.length === 0) {
      toast({ title: 'Nothing to rate', description: 'All companies in this upload are already rated.', status: 'info' });
      return;
    }
    setRunning(true);
    try {
      const res = await authedFetch('/api/admin/ai/companies/rate-batch', {
        method: 'POST',
        body: JSON.stringify({
          company_ids: unratedIds,
          batch_size: 20,
          prompt_id: selectedPromptId,
          upload_id,  // backend should associate batch -> upload, see Section 7
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Batch started', status: 'info', duration: 1500 });
      pollBatch(data.batch_id);
    } catch (e) {
      setRunning(false);
      toast({ title: 'Failed to start batch', description: e.message, status: 'error' });
    }
  };

  // Inline rating edit
  const updateRating = async (companyId, newRating) => {
    const old = companies.find(c => c.id === companyId)?.rating;
    setCompanies(cs => cs.map(c => c.id === companyId ? { ...c, rating: newRating } : c));
    const { error } = await supabase
      .from('companies')
      .update({ rating: newRating, rated_by: 'human' })
      .eq('id', companyId);
    if (error) {
      // revert
      setCompanies(cs => cs.map(c => c.id === companyId ? { ...c, rating: old } : c));
      toast({ title: 'Update failed', description: error.message, status: 'error' });
    }
  };

  const handlePromptChange = (id) => {
    setSelectedPromptId(id);
    const p = prompts.find(x => x.id === id);
    if (p) { setSystemPrompt(p.system_prompt); setUserTemplate(p.user_template); }
  };

  return (
    <WizardShell activeStep={3}>
      <Grid templateColumns={{ base: '1fr', lg: '40% 60%' }} gap={6}>
        {/* LEFT — companies */}
        <GridItem>
          <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200" position="sticky" top={4}>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Companies in this upload</Heading>
              <IconButton icon={<RefreshCw size={14} />} size="xs" variant="ghost"
                onClick={loadCompanies} aria-label="Refresh" />
            </HStack>
            {loading ? (
              <Center py={8}><Spinner /></Center>
            ) : companies.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={8}>No companies yet</Text>
            ) : (
              <VStack align="stretch" spacing={2} maxH="70vh" overflowY="auto">
                {companies.map(c => (
                  <HStack key={c.id} p={3} bg="gray.50" borderRadius="md" justify="space-between">
                    <VStack align="stretch" spacing={0} flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {c.display_name || c.name}
                      </Text>
                      {c.reason && (
                        <Tooltip label={c.reason} placement="bottom-start" hasArrow>
                          <Text fontSize="xs" color="gray.500" noOfLines={1}>{c.reason}</Text>
                        </Tooltip>
                      )}
                    </VStack>
                    <HStack spacing={2}>
                      <Select
                        size="xs" w="65px"
                        value={c.rating || ''}
                        onChange={(e) => updateRating(c.id, e.target.value ? Number(e.target.value) : null)}
                        isDisabled={c.rating_locked}
                      >
                        <option value="">—</option>
                        {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                      </Select>
                      {c.rated_by === 'ai' && (
                        <Tooltip label={`Rated by AI (${c.rated_by_model || 'model'})`}><Badge colorScheme="purple" fontSize="2xs">AI</Badge></Tooltip>
                      )}
                      {c.rated_by === 'human' && <Badge colorScheme="green" fontSize="2xs">HUM</Badge>}
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>
        </GridItem>

        {/* RIGHT — prompt + run + insights */}
        <GridItem>
          <VStack align="stretch" spacing={4}>
            {/* Counts */}
            <SimpleGrid columns={2} spacing={4}>
              <Stat bg="white" p={4} borderRadius="lg" border="1px" borderColor="green.200">
                <StatLabel>Rated</StatLabel>
                <StatNumber color="green.600">{ratedCount}</StatNumber>
              </Stat>
              <Stat bg="white" p={4} borderRadius="lg" border="1px" borderColor="orange.200">
                <StatLabel>Unrated</StatLabel>
                <StatNumber color="orange.600">{unratedCount}</StatNumber>
              </Stat>
            </SimpleGrid>

            {/* Prompt picker */}
            <Box bg="white" p={5} borderRadius="lg" border="1px" borderColor="gray.200">
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <Heading size="sm">Rating prompt</Heading>
                  <Select size="sm" w="auto" value={selectedPromptId} onChange={(e) => handlePromptChange(e.target.value)}>
                    {prompts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} v{p.version}{p.is_default ? ' (default)' : ''}</option>
                    ))}
                  </Select>
                </HStack>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>SYSTEM</Text>
                  <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={5} fontFamily="mono" fontSize="xs" />
                </Box>
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>USER TEMPLATE (use <code>{`{{companies}}`}</code>)</Text>
                  <Textarea value={userTemplate} onChange={(e) => setUserTemplate(e.target.value)} rows={3} fontFamily="mono" fontSize="xs" />
                </Box>
              </VStack>
            </Box>

            {/* Estimate */}
            <Box bg="blue.50" p={5} borderRadius="lg" border="1px" borderColor="blue.200">
              <Heading size="sm" mb={3} color="blue.800">Cost estimate (no API call)</Heading>
              {estimate ? (
                <SimpleGrid columns={3} spacing={3}>
                  <Stat><StatLabel fontSize="xs">Batches</StatLabel><StatNumber fontSize="lg">{estimate.batches}</StatNumber></Stat>
                  <Stat><StatLabel fontSize="xs">Per-batch tokens</StatLabel><StatNumber fontSize="lg">{estimate.prompt_tokens}</StatNumber></Stat>
                  <Stat>
                    <StatLabel fontSize="xs">Total est. cost</StatLabel>
                    <StatNumber fontSize="lg" color="green.700">${estimate.total_cost_usd.toFixed(5)}</StatNumber>
                  </Stat>
                </SimpleGrid>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  {unratedIds.length === 0 ? 'All companies rated.' : 'Adjust prompt to see estimate.'}
                </Text>
              )}
            </Box>

            {/* Run */}
            <Button
              colorScheme="blue" size="lg" leftIcon={<Sparkles size={16} />}
              onClick={handleRunAI} isLoading={running}
              loadingText={activeBatch ? `Running... ${activeBatch.processed_count || 0}/${activeBatch.total_count || unratedIds.length}` : 'Starting...'}
              isDisabled={unratedIds.length === 0}
            >
              Run AI rating ({unratedIds.length} unrated)
            </Button>

            {activeBatch && (
              <Box bg="white" p={4} borderRadius="lg" border="1px" borderColor="gray.200">
                <Text fontSize="sm" fontWeight="bold" mb={2}>Batch progress</Text>
                <Progress
                  value={activeBatch.total_count ? (activeBatch.processed_count / activeBatch.total_count * 100) : 0}
                  size="sm" colorScheme={activeBatch.status === 'done' ? 'green' : 'blue'} mb={2}
                />
                <HStack justify="space-between" fontSize="xs" color="gray.600">
                  <Text>Status: <Badge>{activeBatch.status}</Badge></Text>
                  <Text>Cost so far: ${(activeBatch.cost_usd || 0).toFixed(5)}</Text>
                </HStack>
              </Box>
            )}

            {/* Next */}
            <HStack justify="flex-end" pt={4}>
              <Button
                colorScheme="green" rightIcon={<ArrowRight size={16} />}
                onClick={() => navigate(`/admin/categorization?upload_id=${upload_id}`)}
                isDisabled={ratedCount === 0}
              >
                Next: categorize jobs ({companies.filter(c => (c.rating || 0) >= 4).length} qualifying companies)
              </Button>
            </HStack>
          </VStack>
        </GridItem>
      </Grid>
    </WizardShell>
  );
}
```

### Acceptance — 4
- [ ] Lands on Step 3 after Step 2 save. Left shows all companies from this upload, right shows prompt + estimate
- [ ] Counts (rated/unrated) match LEFT panel reality
- [ ] Estimate updates as you type in prompt
- [ ] Click Run → batch starts, polling shows live progress, button shows count
- [ ] When batch finishes, LEFT panel auto-refreshes with new ratings + AI badges
- [ ] Inline edit any rating dropdown → DB updated, badge changes to HUM
- [ ] Refresh page mid-batch → companies list reloads with whatever's been rated so far. Polling stops on refresh (acceptable — admin can re-trigger or wait).
- [ ] "Next: categorize jobs" → navigates to existing `/admin/categorization` with `?upload_id=` query (categorization page can use this to pre-filter; if it ignores the param, that's fine for now)

---

## 7. Backend tweak — accept `upload_id` on rate-batch (5 line change)

In `backend/controllers/aiCompanyController.js`, find `rateBatch`. The current signature destructures `{ company_ids, batch_size, prompt_id, dry_run }`. Add `upload_id`:

```js
const { company_ids, batch_size = 20, prompt_id, dry_run = false, upload_id } = req.body;
```

Then when creating the `ai_batches` row (or wherever the batch metadata is stored), pass `upload_id` through. Look at how other batch-creators do it. If `ai_batches` doesn't have an `upload_id` column, add it via migration 010:

```sql
-- backend/db/migrations/010_ai_batches_upload_link.sql
alter table public.ai_batches add column if not exists upload_id uuid references public.job_uploads(id) on delete set null;
create index if not exists ai_batches_upload_id_idx on public.ai_batches (upload_id);
```

This lets us later show "which batches ran for this upload" on the wizard if needed. **Don't write that UI now — just thread the column.**

Also: when a batch finishes successfully, update the upload status:

```js
// at end of batch processing, in batchScheduler
if (upload_id) {
  await supabase.from('job_uploads').update({ status: 'rated', rating_completed_at: new Date().toISOString() }).eq('id', upload_id);
}
```

This makes the Step 1 history badge accurate and Resume routing correct.

---

## 8. Cleanup — what to remove from sidebar

The wizard subsumes this manual flow. Consider hiding these sidebar items behind a "Power tools" section (collapsed by default) so the main nav stays clean:

- Job Uploads (still useful for raw debugging — keep)
- AI Batches, AI Analytics, Prompts, AI Test (for power users — group under "AI Infrastructure" as already done)

**Don't actually remove anything.** Just visually demote. The wizard is the new headline; the rest is on standby.

---

## 9. End-to-end smoke test

1. Sidebar → Upload Wizard. Step 1.
2. Upload an Excel. Step 2 appears with summary.
3. Click Save. Step 3 appears, left shows ~50 companies (all unrated), counts say 0 rated / 50 unrated.
4. Verify estimate shows ~3 batches, total cost ~$0.0008.
5. Click Run. Watch progress bar tick up, count update.
6. When done: left panel refreshes, ratings appear with AI badges. Counts: ~50 rated / 0 unrated.
7. Manually change one company's rating dropdown from 3 → 5. Badge changes to HUM. Refresh → still 5.
8. Click Next → lands on /admin/categorization.
9. Go back to Step 1. The upload's row in History now shows "Rated" badge.
10. Click Resume on that row → jumps right back to Step 3 with all ratings intact.

---

## 10. House rules

1. **No new pages outside the wizard directory.** All wizard files live in `frontend/src/pages/admin/wizard/`.
2. **Reuse existing endpoints** — no new AI endpoints, no new batch endpoints. Only the 1 new GET preview-summary in Section 5.1 and the 1 column add in Section 7.
3. Chakra v2 only.
4. **Don't touch existing pages** (CompaniesPage, RateCompanyPage, JobUploadsPage, CategorizationPage). They keep working as-is for one-off use. The wizard is additive.
5. The wizard doesn't replace anything — it's a new path that uses existing primitives in a guided sequence.

---

## What this fixes (mapped to your message)

| You said | Fixed by |
|---|---|
| "looks clumsy clumsy" | Stepper bar + 40/60 split + numbered flow |
| "side nav bar" | Sidebar exists; added prominent Upload Wizard entry |
| "upload + history → trackable to upcoming pages" | Step 1 with Resume button reading upload status |
| "preprocessed one → save it will save to db and continue" | Step 2 with summary + Save button → Step 3 |
| "if not saved also I shd be able to comeback via history to the same page" | Resume button on history rows routes by status |
| "all companies on the left bar with updated rating" | Step 3 left panel auto-refreshes after batch |
| "right side count: rated, unrated" | Top of right panel, two big stats |
| "below that prompt, input, insights, button" | Prompt selector → estimate → Run button (in that order) |
| "40:60 split" | `Grid templateColumns="40% 60%"` |
| "next page display all jobs with 4+ rated companies" | "Next" button shows the count, navigates to existing categorization page (it can filter on `?upload_id=` if you wire that next phase) |

Begin with **Section 1 (sidebar entry + routes)**, then build the 3 step files in order. Don't skip the `getPreviewSummary` backend addition in 5.1 — Step 2 won't work without it.