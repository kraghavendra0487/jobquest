// backend/services/promptEngine.js 

function render(template, vars) { 
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => { 
    if (!(key in vars)) return _m;  // leave untouched if missing 
    const v = vars[key]; 
    return typeof v === 'string' ? v : JSON.stringify(v); 
  }); 
} 
 
async function loadDefault(purpose) { 
  const { supabase } = require('../config/supabase'); 
  const { data, error } = await supabase 
    .from('prompts') 
    .select('id, name, system_prompt, user_template') 
    .eq('purpose', purpose) 
    .eq('is_default', true) 
    .eq('is_archived', false) 
    .single(); 
  if (error) throw new Error(`No default prompt for purpose '${purpose}'`); 
  return data; 
} 
 
module.exports = { render, loadDefault }; 
