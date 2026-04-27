const { supabase } = require('./config/supabase');

async function test() {
  console.log('Testing companies table schema...');
  const { data, error } = await supabase
    .from('companies')
    .insert({ name: 'test-company-' + Date.now() })
    .select();
  
  if (error) {
    console.error('Insert failed:', error.message);
  } else {
    console.log('Insert succeeded! Row:', data[0]);
    console.log('Columns present:', Object.keys(data[0]));
    
    // Clean up
    await supabase.from('companies').delete().eq('id', data[0].id);
  }
}

test();