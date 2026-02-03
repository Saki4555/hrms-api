import { getConnection } from "../config/db.js";
import oracledb from "oracledb";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/auth-token.js";
import { v4 as uuidv4 } from "uuid";

const register = async (req, res) => {
  let connection;
  
  try {
    const { name, email, password } = req.body;

    connection = await getConnection();

    // Check if user already exists
    const userExists = await connection.execute(
      `SELECT id FROM users WHERE email = :email`,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (userExists.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    const userId = uuidv4();
    
    await connection.execute(
      `INSERT INTO users (id, name, email, password, created_at) 
       VALUES (:id, :name, :email, :password, CURRENT_TIMESTAMP)`,
      {
        id: userId,
        name: name || null,
        email,
        password: hashedPassword,
      },
      { autoCommit: true }
    );

    // Generate JWT Token
    const token = generateToken(userId, res);

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: userId,
          name: name,
          email: email,
        },
        token,
      },
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
};

const login = async (req, res) => {
  let connection;
  
  try {
    console.log(req.body, "login");
    const { email, password } = req.body;

    connection = await getConnection();

    // Check if user email exists in the table
    const result = await connection.execute(
      `SELECT id, email, password FROM users WHERE email = :email`,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.PASSWORD);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT Token
    const token = generateToken(user.ID, res);

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: user.ID,
          email: user.EMAIL,
        },
        token,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Login failed" });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
};

const logout = async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};

export { register, login, logout };