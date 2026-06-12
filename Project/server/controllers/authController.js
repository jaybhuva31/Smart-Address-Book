import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbOps } from "../models/db.js";

const generateToken = (id, username) => {
  return jwt.sign(
    { id, username },
    process.env.JWT_SECRET || "vyaparsetu_crm_secret_key_987654321",
    { expiresIn: "7d" }
  );
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  try {
    const admin = await dbOps.getAdminUser(username.trim());
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password.trim(), admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const token = generateToken(admin.id, admin.username);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.admin.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Current and new passwords are required" });
  }

  try {
    const adminUser = await dbOps.getAdminUser(req.admin.username);
    if (!adminUser) {
      return res.status(404).json({ success: false, message: "Admin user not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, adminUser.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await dbOps.updateAdminPassword(adminId, newHash);

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    return res.status(500).json({ success: false, message: "Server error updating password" });
  }
};
