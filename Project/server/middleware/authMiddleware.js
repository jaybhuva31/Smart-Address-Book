import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Authorization token is missing. Access denied." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "vyaparsetu_crm_secret_key_987654321");
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token. Access denied." });
  }
};
