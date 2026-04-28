const User = require('../models/userModel');

exports.registerUser = async (req, res) => {
  const { email, name, school, program, usn, role } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { data, error } = await User.create({ email, name, school, program, usn, role });
    
    if (error) {
      if (error.code === '23505') { // Supabase/Postgres unique constraint violation
        return res.status(400).json({ error: 'Email or USN already exists' });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.status(201).json({ message: 'User registered successfully', user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { data, error } = await User.findByEmail(email);
    
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ message: 'Login successful', user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
