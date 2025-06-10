const adminAuth = (req, res, next) => {
  if (req.role !== 'admin') {
    console.log('Role:', req.role);
    return res.status(403).json({ success: false, message: 'Forbidden. Admins only' });
  }
  next();
};

export default adminAuth;