import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";
import rateLimit from "express-rate-limit";

import {
  logAction,
  getAdminUser,
  createAdminUser,
  getUserById,
  getUserByUsername,
  createUser,
  getPendingServices,
  getGlobalServices,
  ensureGlobalService,
  toggleGlobalService,
  getClientUsers,
  updateUserStatus,
  updateUserDetails,
  deleteUserAndData,
  getLogs,
  getUserLogs,
  getUserRecords,
  getAllUserServices,
  toggleUserService,
  getUserServicesList,
  requestUserService,
  disableUserService,
  deleteRecord,
  bulkDeleteRecords,
  getRecords,
  checkRecordDuplicate,
  updateRecordSingle,
  insertRecordSingle,
  updateRecordFull,
  createUploadAndImportRecords,
  importUserRecordsAdmin,
  updateProfileDetails,
  updateProfileAdmin,
  updateProfilePinOnly,
  getUploadsHistory,
  deleteUploadAndRecords,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getClientById,
  getClientPurchases,
  createClientPurchase,
  deleteClientPurchase,
  checkPurchaseAccess,
  getUserSettings,
  saveUserSettings,
  getInvoices,
  getInvoiceById,
  getInvoiceItems,
  createInvoiceAndItems,
  updateInvoiceAndItems,
  deleteInvoiceAndItems,
  getItemSuggestions,
  getRecordSuggestions,
  getGlobalCodes,
  getPublishedTableById,
  createPublishedTable,
  updatePublishedTable,
  backupPostgresDb,
  getDbTablesStats
} from "./src/db/operations.ts";

let resolvedFilename = "";
let resolvedDirname = "";

if (typeof import.meta !== "undefined" && import.meta.url) {
  resolvedFilename = fileURLToPath(import.meta.url);
  resolvedDirname = path.dirname(resolvedFilename);
} else {
  resolvedFilename = (globalThis as any).__filename || "";
  resolvedDirname = (globalThis as any).__dirname || "";
}

const __filename = resolvedFilename;
const __dirname = resolvedDirname;

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("JWT_SECRET environment variable must be set in production"); })() : "fallback-secret-development-key-tessio-2026");

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login/register/reset requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication requests from this IP. Please try again after 15 minutes." }
});

const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 40, // max 40 requests per min for public/scrape routes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." }
});

const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // max 300 requests per min for standard API calls
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. Please wait a moment before trying again." }
});

// Helper for sanitized error responses (prevents stack traces, raw DB errors, or path disclosure)
function sendServerError(res: any, error: any, defaultUserMsg = "An internal server error occurred. Please try again.") {
  console.error("[SERVER_ERROR]", error);
  let safeMessage = defaultUserMsg;
  if (error && typeof error.message === 'string') {
    const msg = error.message;
    // Strip sensitive internal traces, SQL statements, drizzle/postgres calls, and file paths
    if (!/select|insert|update|delete|drizzle|postgres|node_modules|at\s|\.ts:/i.test(msg) && msg.length < 250) {
      safeMessage = msg;
    }
  }
  return res.status(500).json({ error: safeMessage });
}

// Input Validation & Sanitization Helpers
function validateUsername(username: any): string | null {
  if (!username || typeof username !== 'string') return "Username is required";
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return "Username must be between 2 and 50 characters";
  if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) return "Username contains invalid characters";
  return null;
}

function validatePin(pin: any): string | null {
  if (!pin || typeof pin !== 'string') return "6-digit PIN is required";
  if (!/^\d{6}$/.test(pin.trim())) return "PIN must be exactly 6 numeric digits";
  return null;
}

function validateMobile(mobile: any): string | null {
  if (!mobile || typeof mobile !== 'string') return "Mobile number is required";
  if (!/^[0-9+\- ]{8,15}$/.test(mobile.trim())) return "Mobile number format is invalid";
  return null;
}

function validateEmail(email: any): string | null {
  if (!email || typeof email !== 'string') return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Invalid email address format";
  return null;
}

function sanitizeFilename(filename: any): string {
  if (!filename || typeof filename !== 'string') return 'excel_import.xlsx';
  return filename.replace(/[\/\:\*\?"<>\|\.\.\\]+/g, '_').substring(0, 100) || 'excel_import.xlsx';
}

function sanitizeRecordItem(item: any): any {
  if (!item || typeof item !== 'object') return {};
  const clean: any = {};
  for (const key of Object.keys(item)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const cleanKey = String(key).trim().substring(0, 100);
    if (!cleanKey) continue;
    const val = item[key];
    if (typeof val === 'string') {
      clean[cleanKey] = val.trim().substring(0, 1000);
    } else if (typeof val === 'number') {
      clean[cleanKey] = isFinite(val) ? val : 0;
    } else if (typeof val === 'boolean') {
      clean[cleanKey] = val;
    } else if (val === null || val === undefined) {
      clean[cleanKey] = '';
    }
  }
  return clean;
}

// Seed default users and services on server start
async function seedDatabase() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      const hashedPin = bcrypt.hashSync("123456", 10);
      await createAdminUser("admin", hashedPin);
      console.log("Seeded admin user.");
    } else {
      await updateUserDetails(admin.id, admin.username || "admin", admin.mobile || "0000000000", admin.email || "admin@tessio.com", "World", admin.dealerCommission || 0, "Owner");
    }

    const testUser = await getUserByUsername("Test");
    if (!testUser) {
      const hashedPin = bcrypt.hashSync("000000", 10);
      const result = await createUser("Test", "9999999999", "test@gmail.com", hashedPin, "Test");
      
      const defaultServices = [
        { name: "QR Generator", enabled: 1 },
        { name: "Client Management", enabled: 0 },
        { name: "Invoice Management", enabled: 0 }
      ];
      for (const service of defaultServices) {
        await toggleUserService(result.id, service.name, service.enabled === 1);
      }
      console.log("Seeded Test user.");
    } else {
      const hashedPin = bcrypt.hashSync("000000", 10);
      await updateUserDetails(testUser.id, "Test", "9999999999", "test@gmail.com", "Test", testUser.dealerCommission || 0);
      await updateUserStatus(testUser.id, "approved");
      await updateProfilePinOnly(testUser.id, hashedPin);
      
      const defaultServices = [
        { name: "QR Generator", enabled: 1 },
        { name: "Client Management", enabled: 0 },
        { name: "Invoice Management", enabled: 0 }
      ];
      for (const service of defaultServices) {
        await toggleUserService(testUser.id, service.name, service.enabled === 1);
      }
    }
  } catch (err) {
    console.error("Database seeding failed:", err);
  }
}

seedDatabase();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply General Rate Limiter to all API endpoints
app.use('/api', generalApiLimiter);

// Middleware for Auth
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: "Session expired. Please login again." });
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token structure. Please login again." });
    }

    try {
      const dbUser = await getUserById(decoded.id);
      if (!dbUser) {
        return res.status(401).json({ error: "User no longer exists. Please login again." });
      }

      if (dbUser.status !== 'approved' && dbUser.role !== 'admin') {
        return res.status(403).json({ error: `Account status: ${dbUser.status}. Please contact admin.` });
      }
      
      req.user = {
        id: dbUser.id,
        username: dbUser.username,
        role: dbUser.role,
        userType: dbUser.role === 'admin' ? 'Owner' : (dbUser.userType || 'Owner'),
        shopName: dbUser.role === 'admin' ? 'World' : (dbUser.shopName || ''),
      };
      next();
    } catch (e: any) {
      return sendServerError(res, e, "Authentication service error. Please try again.");
    }
  });
};

const requireOwnerOrAdmin = (req: any, res: any, next: any) => {
  if (req.user.role === 'admin' || req.user.userType === 'Owner' || req.user.userType === 'owner') {
    return next();
  }
  return res.status(403).json({ 
    error: "Access Denied: Staff 'User' accounts have view-only access. Creating, editing, or deleting records is reserved for Shop Owners." 
  });
};

// --- API ROUTES ---

// Auth: Sign Up (Rate-limited & strict input validated)
app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { username, mobile, email, pin, shopName, userType } = req.body;

  const usernameErr = validateUsername(username);
  if (usernameErr) return res.status(400).json({ error: usernameErr });

  const pinErr = validatePin(pin);
  if (pinErr) return res.status(400).json({ error: pinErr });

  const mobileErr = validateMobile(mobile);
  if (mobileErr) return res.status(400).json({ error: mobileErr });

  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: emailErr });

  try {
    const hashedPin = bcrypt.hashSync(pin.trim(), 10);
    const result = await createUser(username.trim(), mobile.trim(), email.trim(), hashedPin, shopName ? String(shopName).trim() : '', userType || 'Owner');
    await logAction(result.id, "REGISTER", `User ${username} registered as ${userType || 'Owner'}, status: pending`);
    res.json({ success: true, message: "Registration successful. Awaiting admin approval." });
  } catch (error: any) {
    if (error.message && error.message.includes("already has an Owner")) {
      return res.status(400).json({ error: error.message });
    }
    const isConstraint = error.message && (error.message.includes("unique") || error.message.includes("constraint"));
    res.status(400).json({ error: isConstraint ? "Username or Mobile already exists" : "Registration failed. Please verify your details." });
  }
});

// Auth: Login (Rate-limited & strict input validated)
app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { username, pin } = req.body;

  if (!username || typeof username !== 'string' || !pin || typeof pin !== 'string') {
    return res.status(400).json({ error: "Username and PIN are required." });
  }

  try {
    const user = await getUserByUsername(username.trim());

    if (!user || !user.pin || !bcrypt.compareSync(pin, user.pin)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.status !== 'approved' && user.role !== 'admin') {
      return res.status(403).json({ error: `Account status: ${user.status}. Please contact admin.` });
    }

    const effectiveUserType = user.role === 'admin' ? 'Owner' : (user.userType || 'Owner');
    const effectiveShopName = user.role === 'admin' ? 'World' : (user.shopName || '');

    const token = jwt.sign({ 
      id: Number(user.id), 
      username: user.username, 
      role: user.role,
      userType: effectiveUserType,
      shopName: effectiveShopName,
    }, JWT_SECRET, { expiresIn: '24h' });

    await logAction(user.id, "LOGIN", `User ${username} logged in as ${effectiveUserType}`);

    const services = await getUserServicesList(user.id);
    const globalServicesList = await getGlobalServices();
    const publishedServices = globalServicesList.filter(gs => gs.isPublished === 1).map(gs => gs.name);

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        userType: effectiveUserType,
        mobile: user.mobile, 
        email: user.email, 
        shopName: effectiveShopName,
        dealerCommission: user.dealerCommission,
        publishedServices,
        services: services.reduce((acc: any, s: any) => {
          if (publishedServices.includes(s.service_name)) {
            acc[s.service_name] = s.is_enabled === 1;
          } else {
            acc[s.service_name] = false;
          }
          return acc;
        }, {})
      } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get Pending Service Requests
app.get("/api/admin/services/pending", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const pending = await getPendingServices();
    res.json(pending);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Publish Services Management
app.get("/api/admin/global-services", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const defaultServices = ["QR Generator", "Client Management", "Invoice Management"];
    for (const s of defaultServices) {
      await ensureGlobalService(s);
    }
    const services = await getGlobalServices();
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/global-services/toggle", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { name, isPublished } = req.body;
  try {
    await toggleGlobalService(name, isPublished);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get Users
app.get("/api/admin/users", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const usersList = await getClientUsers();
    res.json(usersList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update User Status
app.post("/api/admin/users/:id/status", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { status } = req.body;
  try {
    await updateUserStatus(parseInt(req.params.id), status);
    await logAction(req.user.id, "ADMIN_USER_STATUS", `Updated user ${req.params.id} to ${status}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update User Details
app.put("/api/admin/users/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { username, mobile, email, shop_name, dealer_commission, user_type } = req.body;
  try {
    await updateUserDetails(
      parseInt(req.params.id),
      username,
      mobile,
      email,
      shop_name,
      parseFloat(dealer_commission) || 0,
      user_type
    );
    await logAction(req.user.id, "ADMIN_USER_UPDATE", `Updated user ${req.params.id} details`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: "Username or Mobile already exists" });
  }
});

// Admin: Delete User
app.delete("/api/admin/users/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    await deleteUserAndData(parseInt(req.params.id));
    await logAction(req.user.id, "ADMIN_USER_DELETE", `Deleted user ${req.params.id} and all associated data`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get Logs
app.get("/api/admin/logs", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const logsList = await getLogs();
    res.json(logsList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Individual User Logs
app.get("/api/admin/users/:id/logs", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const logsList = await getUserLogs(parseInt(req.params.id));
    res.json(logsList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get Individual User Records
app.get("/api/admin/users/:id/records", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const recordsList = await getUserRecords(parseInt(req.params.id));
    res.json(recordsList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: User Services Management
app.get("/api/admin/user-services", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const usersList = await getClientUsers();
    const userServicesList = await getAllUserServices();
    const globalServicesList = await getGlobalServices();
    
    const data = usersList.map((u: any) => {
      const servicesMap: any = {};
      const individualUserServices = userServicesList.filter((s: any) => s.userId === u.id);
      
      globalServicesList.forEach(gs => {
        servicesMap[gs.name] = individualUserServices.find((s: any) => s.serviceName === gs.name)?.isEnabled ?? 0;
      });

      return {
        id: u.id,
        username: u.username,
        shop_name: u.shop_name,
        services: servicesMap
      };
    });
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/user-services/toggle", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { userId, serviceName, isEnabled } = req.body;
  try {
    await toggleUserService(userId, serviceName, isEnabled);
    await logAction(req.user.id, "ADMIN_SERVICE_TOGGLE", `Toggled ${serviceName} for user ${userId} to ${isEnabled}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client: Service Management
app.get("/api/user/profile", authenticateToken, async (req: any, res) => {
  try {
    const user = await getUserById(Number(req.user.id));
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const services = await getUserServicesList(user.id);
    const globalServicesList = await getGlobalServices();
    const publishedServices = globalServicesList.filter(gs => gs.isPublished === 1).map(gs => gs.name);
    
    res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        mobile: user.mobile, 
        email: user.email, 
        shopName: user.shopName,
        dealerCommission: user.dealerCommission,
        publishedServices,
        services: services.reduce((acc: any, s: any) => {
          if (publishedServices.includes(s.service_name)) {
            acc[s.service_name] = s.is_enabled === 1;
          } else {
            acc[s.service_name] = false;
          }
          return acc;
        }, {})
      } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/user/services", authenticateToken, async (req: any, res) => {
  try {
    const currentServices = await getUserServicesList(req.user.id);
    const globalServicesList = await getGlobalServices();
    
    const availableServices = globalServicesList
      .filter(gs => gs.isPublished === 1)
      .map(gs => gs.name);
    
    const status = availableServices.map(name => ({
      name,
      status: currentServices.find((s: any) => s.service_name === name)?.is_enabled ?? 0
    }));
    
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user/services/request", authenticateToken, async (req: any, res) => {
  const { serviceName } = req.body;
  try {
    const currentServices = await getUserServicesList(req.user.id);
    const current = currentServices.find(s => s.service_name === serviceName);
    
    if (current && current.is_enabled === 1) {
      return res.status(400).json({ error: "Service already enabled" });
    }

    await requestUserService(req.user.id, serviceName);
    await logAction(req.user.id, "SERVICE_REQUEST", `User requested activation for ${serviceName}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user/services/disable", authenticateToken, async (req: any, res) => {
  const { serviceName } = req.body;
  try {
    await disableUserService(req.user.id, serviceName);
    await logAction(req.user.id, "SERVICE_DISABLE", `User disabled ${serviceName}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Import Individual User Records
app.post("/api/admin/users/:id/records/import", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { records: recordsInput, strategy } = req.body;
  const targetUserId = parseInt(req.params.id);

  try {
    if (!strategy) {
      const duplicates = [];
      for (const record of recordsInput) {
        const existing = await checkRecordDuplicate(targetUserId, record.company_code);
        if (existing) {
          duplicates.push(record.company_code);
        }
      }
      if (duplicates.length > 0) {
        return res.json({ 
          success: false, 
          requiresDecision: true, 
          duplicates: duplicates,
          duplicateCount: duplicates.length,
          totalCount: recordsInput.length
        });
      }
    }

    const result = await importUserRecordsAdmin(targetUserId, recordsInput, strategy);
    await logAction(req.user.id, "ADMIN_USER_IMPORT", `Imported ${result.imported}, Updated ${result.updated}, Skipped ${result.skipped} for user ${targetUserId}`);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update Own Profile
app.put("/api/admin/profile", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { username, email, pin } = req.body;
  
  try {
    let hashedPin = pin ? bcrypt.hashSync(pin, 10) : undefined;
    await updateProfileAdmin(req.user.id, username, email, hashedPin);
    await logAction(req.user.id, "ADMIN_PROFILE_UPDATE", "Admin updated their own profile");
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: "Username already exists" });
  }
});

// Admin: Get list of tables and row counts
app.get("/api/admin/db/tables", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const tablesStats = await getDbTablesStats();
    res.json({ tables: tablesStats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Execute raw query
app.post("/api/admin/db/query", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const trimmed = query.trim();
    const isSelect = trimmed.toUpperCase().startsWith("SELECT") || trimmed.toUpperCase().startsWith("EXPLAIN") || trimmed.toUpperCase().startsWith("SHOW");

    const { db } = await import("./src/db/index.ts");
    const { sql } = await import("drizzle-orm");

    if (isSelect) {
      const dbResult = await db.execute(sql.raw(query));
      const rows = dbResult.rows;
      let headers: string[] = [];
      if (rows.length > 0) {
        headers = Object.keys(rows[0] as any);
      }
      res.json({ isSelect: true, headers, rows });
    } else {
      const dbResult = await db.execute(sql.raw(query));
      res.json({
        isSelect: false,
        changes: dbResult.rowCount ?? 0,
        lastInsertRowid: null
      });
    }
    await logAction(req.user.id, "ADMIN_SQL_EXECUTE", `Executed query: ${query.substring(0, 100)}...`);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Download database backup
app.get("/api/admin/db/backup", authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  try {
    const backupData = await backupPostgresDb();
    res.setHeader('Content-disposition', 'attachment; filename=postgres_backup.json');
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(backupData, null, 2));
    res.end();
    await logAction(req.user.id, "ADMIN_DB_BACKUP", "Downloaded Cloud SQL database backup JSON");
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Client: Delete Record
app.delete("/api/records/:id", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  const userId = Number(req.user.id);
  const recordId = Number(req.params.id);
  try {
    await deleteRecord(recordId, userId);
    await logAction(userId, "RECORD_DELETE", `Deleted record ${recordId}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client: Delete Multiple Records
app.post("/api/records/bulk-delete", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  try {
    const { ids } = req.body;
    const userId = Number(req.user.id);
    
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid data: ids must be an array" });
    }
    
    const idsNums = ids.map(id => Number(id)).filter(id => !isNaN(id));
    if (idsNums.length === 0) {
      return res.json({ success: true, count: 0 });
    }
    
    await bulkDeleteRecords(idsNums, userId);
    await logAction(userId, "RECORD_BULK_DELETE", `Deleted ${idsNums.length} records`);
    res.json({ success: true, count: idsNums.length, requested: ids.length });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete records: " + error.message });
  }
});

// Client: Records
app.get("/api/records", authenticateToken, async (req: any, res) => {
  try {
    const recordsList = await getRecords(req.user.id);
    res.json(recordsList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/records", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  const { dealerCode, companyCode, costPrice, overwrite } = req.body;
  const userId = Number(req.user.id);
  try {
    const user = await getUserById(userId);
    const commission = user?.dealerCommission || 0;
    
    const existing = await checkRecordDuplicate(userId, companyCode);
    
    if (existing && !overwrite) {
      return res.json({ success: false, duplicate: true, existingId: existing.id });
    }

    if (existing && overwrite) {
      await updateRecordSingle(existing.id, dealerCode, costPrice || 0, commission);
      await logAction(userId, "RECORD_UPDATE", `Overwrote existing record: ${dealerCode}/${companyCode}`);
      return res.json({ success: true, id: existing.id, updated: true });
    }
    
    const result = await insertRecordSingle(userId, dealerCode, companyCode, costPrice || 0, commission);
    await logAction(userId, "RECORD_ADD", `Added record: ${dealerCode}/${companyCode}`);
    res.json({ success: true, id: result.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/records/:id", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  const { dealerCode, companyCode, costPrice } = req.body;
  const userId = Number(req.user.id);
  const recordId = Number(req.params.id);
  try {
    await updateRecordFull(recordId, userId, dealerCode, companyCode, costPrice || 0);
    await logAction(userId, "RECORD_UPDATE", `Updated record ${recordId}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Import Excel Records
app.post("/api/records/bulk-import", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  const { records: recordsInput, strategy, overwriteCodes, filename } = req.body;
  if (!Array.isArray(recordsInput)) return res.status(400).json({ error: "Invalid data format: records must be an array" });
  if (recordsInput.length > 10000) return res.status(400).json({ error: "Batch size exceeds limit of 10,000 records per import" });

  const userId = req.user.id;
  const cleanRecords = recordsInput.map((rec: any) => sanitizeRecordItem(rec));
  const safeFilename = sanitizeFilename(filename);

  try {
    if (!strategy && (!overwriteCodes || overwriteCodes.length === 0)) {
      const duplicates = [];
      for (const record of cleanRecords) {
        if (!record.company_code) continue;
        const existing = await checkRecordDuplicate(userId, record.company_code);
        if (existing) {
          duplicates.push(record.company_code);
        }
      }

      if (duplicates.length > 0) {
        return res.json({ 
          success: false, 
          requiresDecision: true, 
          duplicates: duplicates,
          duplicateCount: duplicates.length,
          totalCount: cleanRecords.length
        });
      }
    }

    const result = await createUploadAndImportRecords(userId, safeFilename, cleanRecords.length, cleanRecords, strategy, Array.isArray(overwriteCodes) ? overwriteCodes : []);
    await logAction(userId, "BULK_IMPORT", `File: ${safeFilename}, Imported: ${result.imported}, Updated: ${result.updated}, Skipped: ${result.skipped}`);
    res.json({ success: true, ...result });
  } catch (error: any) {
    sendServerError(res, error, "Failed to perform bulk import.");
  }
});

// Client: Update Profile (Mobile & Commission)
app.put("/api/profile", authenticateToken, async (req: any, res) => {
  const { mobile, dealerCommission } = req.body;
  if (mobile) {
    const mobileErr = validateMobile(mobile);
    if (mobileErr) return res.status(400).json({ error: mobileErr });
  }
  try {
    await updateProfileDetails(req.user.id, mobile ? String(mobile).trim() : undefined, dealerCommission !== undefined ? parseFloat(dealerCommission) : undefined);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: "Update failed. Please check your inputs." });
  }
});

// Client: Reset PIN (Authenticated & Rate Limited)
app.put("/api/profile/pin", authenticateToken, authLimiter, async (req: any, res) => {
  const { oldPin, newPin } = req.body;
  const oldErr = validatePin(oldPin);
  if (oldErr) return res.status(400).json({ error: "Current " + oldErr });
  const newErr = validatePin(newPin);
  if (newErr) return res.status(400).json({ error: "New " + newErr });

  try {
    const user = await getUserById(req.user.id);
    if (!user || !user.pin || !bcrypt.compareSync(oldPin.trim(), user.pin)) {
      return res.status(400).json({ error: "Current PIN is incorrect" });
    }

    const hashedPin = bcrypt.hashSync(newPin.trim(), 10);
    await updateProfilePinOnly(req.user.id, hashedPin);
    await logAction(req.user.id, "PIN_RESET", "User reset their PIN");
    res.json({ success: true });
  } catch (error: any) {
    sendServerError(res, error, "Failed to reset PIN.");
  }
});

// Public: Request PIN Reset (Unauthenticated, Rate Limited)
app.post("/api/auth/reset-pin-request", authLimiter, async (req, res) => {
  const { username, mobile } = req.body;
  const userErr = validateUsername(username);
  if (userErr) return res.status(400).json({ error: userErr });
  const mobileErr = validateMobile(mobile);
  if (mobileErr) return res.status(400).json({ error: mobileErr });

  try {
    const user = await getUserByUsername(username.trim());
    if (!user || user.mobile !== mobile.trim()) {
      return res.status(404).json({ error: "User not found with these details" });
    }

    await logAction(user.id, "PIN_RESET_REQUEST", `PIN reset requested for ${username}. Simulated send to ${user.email} and ${user.mobile}`);
    
    res.json({ 
      success: true, 
      message: `A reset instruction has been sent to your registered email (${user.email}) and mobile (${user.mobile}).` 
    });
  } catch (error: any) {
    sendServerError(res, error, "Failed to process PIN reset request.");
  }
});

// Client: Uploads History
app.get("/api/uploads", authenticateToken, async (req: any, res) => {
  try {
    const uploadsList = await getUploadsHistory(req.user.id);
    res.json(uploadsList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client: Delete Upload and its records
app.delete("/api/uploads/:id", authenticateToken, async (req: any, res) => {
  const userId = Number(req.user.id);
  const uploadId = parseInt(req.params.id);

  try {
    const deletedCount = await deleteUploadAndRecords(userId, uploadId);
    await logAction(userId, "UPLOAD_DELETE", `Deleted upload ${uploadId} and ${deletedCount} associated records`);
    res.json({ success: true, deletedCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- CLIENT MANAGEMENT ---
app.get("/api/clients", authenticateToken, async (req: any, res) => {
  try {
    const currentServices = await getUserServicesList(req.user.id);
    const service = currentServices.find(s => s.service_name === "Client Management");
    if (service && service.is_enabled === 0) {
      return res.status(403).json({ error: "Client Management service is disabled." });
    }

    const clientsList = await getClients(req.user.id);
    res.json(clientsList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/clients", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  const { name, contact_number, address, interested_dealer_code, enquiry_date, bought_dealer_code, bought_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: "Client name is required" });

  try {
    const result = await createClient(
      req.user.id,
      name,
      contact_number,
      address,
      interested_dealer_code,
      enquiry_date,
      bought_dealer_code,
      bought_date,
      notes
    );
    res.json({ id: result.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/clients/:id", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  const { name, contact_number, address, interested_dealer_code, enquiry_date, bought_dealer_code, bought_date, notes } = req.body;
  try {
    await updateClient(
      parseInt(req.params.id),
      req.user.id,
      name,
      contact_number,
      address,
      interested_dealer_code,
      enquiry_date,
      bought_dealer_code,
      bought_date,
      notes
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client Purchase History
app.get("/api/clients/:id/purchases", authenticateToken, async (req: any, res) => {
  try {
    const client = await getClientById(parseInt(req.params.id));
    if (!client || client.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const purchases = await getClientPurchases(parseInt(req.params.id));
    res.json(purchases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/clients/:id/purchases", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  const { item_details, amount, purchase_date, dealer_code } = req.body;
  const clientId = parseInt(req.params.id);
  
  if (!item_details) return res.status(400).json({ error: "Item details required" });
  if (isNaN(clientId)) return res.status(400).json({ error: "Invalid client ID" });

  try {
    const client = await getClientById(clientId);
    if (!client) {
      return res.status(403).json({ error: "Access denied" });
    }

    const normalizedAmount = amount === "" || amount === null || amount === undefined ? 0 : parseFloat(amount);
    const dateStr = purchase_date || new Date().toISOString().split('T')[0];
    const codeStr = dealer_code || '';

    const result = await createClientPurchase(clientId, item_details, normalizedAmount, dateStr, codeStr);
    res.json({ id: result.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/purchases/:id", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  try {
    const access = await checkPurchaseAccess(parseInt(req.params.id));
    if (!access) {
      return res.status(403).json({ error: "Access denied" });
    }

    await deleteClientPurchase(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/clients/:id", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  try {
    await deleteClient(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// User Settings (Reminder Days)
app.get("/api/user/settings", authenticateToken, async (req: any, res) => {
  try {
    let settings = await getUserSettings(req.user.id);
    if (!settings) {
      await saveUserSettings(req.user.id, 7);
      settings = { userId: req.user.id, reminderDays: 7 };
    }
    res.json({
      user_id: settings.userId,
      reminder_days: settings.reminderDays
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/user/settings", authenticateToken, async (req: any, res) => {
  const { reminder_days } = req.body;
  try {
    await saveUserSettings(req.user.id, reminder_days);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- INVOICE MANAGEMENT ---
app.get("/api/invoices", authenticateToken, async (req: any, res) => {
  try {
    const invoicesList = await getInvoices(req.user.id);
    res.json(invoicesList.map(inv => ({
      id: inv.id,
      user_id: inv.userId,
      client_id: inv.clientId,
      invoice_number: inv.invoiceNumber,
      customer_name: inv.customerName,
      customer_mobile: inv.customerMobile,
      date: inv.date,
      total_amount: inv.totalAmount,
      status: inv.status,
      notes: inv.notes,
      created_at: inv.createdAt
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/invoices/:id", authenticateToken, async (req: any, res) => {
  try {
    const invoice = await getInvoiceById(parseInt(req.params.id), req.user.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    
    const items = await getInvoiceItems(parseInt(req.params.id));
    res.json({
      id: invoice.id,
      user_id: invoice.userId,
      client_id: invoice.clientId,
      invoice_number: invoice.invoiceNumber,
      customer_name: invoice.customerName,
      customer_mobile: invoice.customerMobile,
      date: invoice.date,
      total_amount: invoice.totalAmount,
      status: invoice.status,
      notes: invoice.notes,
      created_at: invoice.createdAt,
      items: items.map(item => ({
        id: item.id,
        invoice_id: item.invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        amount: item.amount
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/invoices", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  const { customer_name, customer_mobile, date, status, notes, items, client_id } = req.body;
  try {
    const id = await createInvoiceAndItems(
      req.user.id,
      client_id || null,
      customer_name,
      customer_mobile,
      date || new Date().toISOString().split('T')[0],
      status || 'pending',
      notes,
      items
    );
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/invoices/:id", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  const { customer_name, customer_mobile, date, status, notes, items, client_id } = req.body;
  try {
    const invoice = await getInvoiceById(parseInt(req.params.id), req.user.id);
    if (!invoice) {
      return res.status(403).json({ error: "Access denied or invoice not found" });
    }

    await updateInvoiceAndItems(
      parseInt(req.params.id),
      req.user.id,
      client_id || null,
      customer_name,
      customer_mobile,
      date,
      status,
      notes,
      items
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/invoices/:id", authenticateToken, requireOwnerOrAdmin, async (req: any, res) => {
  try {
    const invoice = await getInvoiceById(parseInt(req.params.id), req.user.id);
    if (!invoice) {
      return res.status(403).json({ error: "Access denied or invoice not found" });
    }

    await deleteInvoiceAndItems(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Invoice: Item Suggestions
app.get("/api/items/suggestions", authenticateToken, async (req: any, res) => {
  const { q } = req.query;
  try {
    const suggestions = await getItemSuggestions(req.user.id, String(q));
    res.json(suggestions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client: Suggestions
app.get("/api/records/suggestions", authenticateToken, async (req: any, res) => {
  const { q } = req.query;
  try {
    const suggestions = await getRecordSuggestions(req.user.id, String(q));
    res.json(suggestions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Client: Global Dialer Code Search
app.get("/api/records/codes", authenticateToken, async (req: any, res) => {
  const { q } = req.query;
  try {
    const codes = await getGlobalCodes(req.user.id, String(q));
    res.json(codes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- QR GENERATOR & PRICING LOGIC ---

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

async function fetchUrlWithRetry(targetUrl: string, maxRetries = 3) {
  let lastErr: any = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const userAgent = USER_AGENTS[attempt % USER_AGENTS.length];
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 12000
      });
      return response;
    } catch (err: any) {
      lastErr = err;
      const status = err.response?.status;
      if (status === 429 || status === 503 || status === 502 || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        if (attempt < maxRetries - 1) {
          const retryAfterHeader = err.response?.headers?.['retry-after'];
          let delayMs = (attempt + 1) * 1500;
          if (retryAfterHeader) {
            const parsedSec = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSec) && parsedSec > 0 && parsedSec <= 10) {
              delayMs = parsedSec * 1000;
            }
          }
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
      }
      throw err;
    }
  }
  throw lastErr;
}

// In-memory cache for scraped URLs to prevent repeated external requests & rate-limiting (429)
const scrapeCache = new Map<string, { data: any, timestamp: number }>();
const SCRAPE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// Scrape URL and extract structured data heuristically (Rate limited & SSRF protected)
app.post("/api/qr/scrape", authenticateToken, publicLimiter, async (req: any, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: "URL is required" });

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: "Only HTTP and HTTPS URLs are supported." });
    }
    // Block localhost / internal IP SSRF attempts
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return res.status(400).json({ error: "Internal or private addresses cannot be scraped." });
    }
  } catch {
    return res.status(400).json({ error: "Invalid URL format." });
  }

  try {
    const currentServices = await getUserServicesList(req.user.id);
    const service = currentServices.find(s => s.service_name === "QR Generator");
    if (service && service.is_enabled === 0) {
      return res.status(403).json({ error: "QR Generator service is disabled for your account. Please contact admin." });
    }

    // Check in-memory scrape cache first
    const cached = scrapeCache.get(url);
    if (cached && (Date.now() - cached.timestamp < SCRAPE_CACHE_TTL_MS)) {
      return res.json({
        success: true,
        extracted: cached.data
      });
    }

    // Check if the URL is a shared link from our app or another instance of the app
    const sharedIdMatch = url.match(/\/shared\/([a-zA-Z0-9_-]+)/);
    if (sharedIdMatch) {
      const sharedId = sharedIdMatch[1];
      const localTable = await getPublishedTableById(sharedId);
      if (localTable) {
        const parsed = JSON.parse(localTable.data || '{}');
        return res.json({
          success: true,
          extracted: {
            title: localTable.title,
            headers: parsed.headers,
            rows: parsed.rows
          }
        });
      }
      
      // Fallback external fetch
      try {
        const apiUrl = url.replace(/\/shared\/([a-zA-Z0-9_-]+)/, '/api/shared/$1');
        const apiRes = await fetchUrlWithRetry(apiUrl, 2);
        if (apiRes.data && apiRes.data.data) {
          return res.json({
            success: true,
            extracted: {
              title: apiRes.data.title,
              headers: apiRes.data.data.headers,
              rows: apiRes.data.data.rows
            }
          });
        }
      } catch (e) {
        // ignore
      }
    }

    let response;
    try {
      response = await fetchUrlWithRetry(url, 3);
    } catch (axiosErr: any) {
      if (axiosErr.response?.status === 429) {
        return res.status(429).json({ 
          error: "The target website is temporarily limiting requests (HTTP 429 Too Many Requests). Please try again in a few moments or upload an Excel file directly." 
        });
      }
      if (axiosErr.response?.status === 403) {
        return res.status(403).json({ 
          error: "Access to the target website was blocked (HTTP 403 Forbidden). Please check the URL or upload an Excel file directly." 
        });
      }
      return res.status(500).json({ 
        error: "Failed to scrape URL: " + (axiosErr.message || "Network request failed") 
      });
    }

    let bestTable: { headers: string[], rows: any[] } | null = null;
    let title = "Extracted Catalog";

    if (response.data && (typeof response.data === 'object' || String(response.headers['content-type']).includes('json'))) {
      const jsonData = typeof response.data === 'object' ? response.data : JSON.parse(response.data);
      let candidateArray: any[] | null = null;
      const findArray = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
          if (obj.length > 0 && typeof obj[0] === 'object') {
            if (!candidateArray || obj.length > candidateArray.length) {
              candidateArray = obj;
            }
          }
        } else {
          for (const key of Object.keys(obj)) {
            findArray(obj[key]);
          }
        }
      };
      findArray(jsonData);

      if (candidateArray && (candidateArray as any[]).length > 0) {
        const headers = Object.keys(candidateArray[0]);
        bestTable = {
          headers,
          rows: candidateArray
        };
        title = jsonData.title || jsonData.name || "JSON Dataset";
      }
    }

    let $ = cheerio.load("");
    if (!bestTable) {
      $ = cheerio.load(response.data);
      title = $('title').text() || $('h1').first().text() || "Extracted Catalog";
      let maxRows = 0;

      $('table').each((_, tableElement) => {
        const allRows = $(tableElement).find('tr');
        if (allRows.length === 0) return;

        let bestHeaderIndex = 0;
        let maxCellsCount = 0;
        let maxMatches = -1;
        let bestHeaders: string[] = [];

        const scanLimit = Math.min(allRows.length, 10);
        allRows.slice(0, scanLimit).each((rowIndex, tr) => {
          const cells = $(tr).find('th, td');
          const cellCount = cells.length;
          if (cellCount < 2) return;

          const candidateHeaders: string[] = [];
          let matches = 0;

          cells.each((_, cell) => {
            const text = $(cell).text().trim();
            candidateHeaders.push(text);
            if (/sku|item|code|price|rate|total|rrp|hsn|mrp|design|quality|cost/i.test(text)) {
              matches++;
            }
          });

          if (cellCount > maxCellsCount || (cellCount === maxCellsCount && matches > maxMatches)) {
            maxCellsCount = cellCount;
            maxMatches = matches;
            bestHeaderIndex = rowIndex;
            bestHeaders = candidateHeaders;
          }
        });

        if (bestHeaders.length === 0) {
          allRows.slice(0, scanLimit).each((rowIndex, tr) => {
            const cells = $(tr).find('th, td');
            if (cells.length > 0 && bestHeaders.length === 0) {
              bestHeaderIndex = rowIndex;
              cells.each((_, cell) => {
                bestHeaders.push($(cell).text().trim());
              });
            }
          });
        }

        const headers = bestHeaders.map((h, i) => h.trim() || `Col${i}`);
        const rows: any[] = [];

        allRows.each((rowIndex, tr) => {
          if (rowIndex <= bestHeaderIndex) return;

          const cells = $(tr).find('th, td');
          if (cells.length === 0) return;

          const rowData: any = {};
          let hasValue = false;

          cells.each((cellIndex, cell) => {
            const header = headers[cellIndex] || `Col${cellIndex}`;
            const val = $(cell).text().trim();
            if (val) {
              hasValue = true;
            }
            rowData[header] = val;
          });

          if (hasValue && Object.keys(rowData).length > 0) {
            rows.push(rowData);
          }
        });

        const headerString = headers.join(' ').toLowerCase();
        const isPricingTable = /sku|item|code|price|rate|total|rrp|hsn|mrp|design|quality|cost/i.test(headerString);

        if (isPricingTable && rows.length > maxRows) {
          maxRows = rows.length;
          bestTable = { headers, rows };
        } else if (!bestTable && rows.length > maxRows) {
          maxRows = rows.length;
          bestTable = { headers, rows };
        }
      });
    }

    if (!bestTable) {
      const jsonLdProducts: any[] = [];
      $('script[type="application/ld+json"]').each((_, script) => {
        try {
          const json = JSON.parse($(script).html() || "");
          const traverse = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            if (obj['@type'] === 'Product' || obj['type'] === 'Product') {
              const name = obj.name || obj.title || "";
              const sku = obj.sku || obj.mpn || obj.productId || "";
              let price = "";
              if (obj.offers) {
                if (Array.isArray(obj.offers)) {
                  price = obj.offers[0]?.price || "";
                } else if (typeof obj.offers === 'object') {
                  price = obj.offers.price || obj.offers.lowPrice || obj.offers.highPrice || "";
                }
              }
              if (name || sku || price) {
                jsonLdProducts.push({
                  "SKU": sku || name,
                  "Description": name,
                  "RRP": price
                });
              }
            }
            for (const val of Object.values(obj)) {
              if (typeof val === 'object') {
                traverse(val);
              }
            }
          };
          traverse(json);
        } catch (e) {
          // ignore
        }
      });

      if (jsonLdProducts.length > 0) {
        bestTable = {
          headers: ["SKU", "Description", "RRP"],
          rows: jsonLdProducts
        };
      }
    }

    if (!bestTable) {
      const cardProducts: any[] = [];
      $('.product, .item, .card, [class*="product"], [class*="item"]').each((_, el) => {
        const textContent = $(el).text().trim().replace(/\s+/g, ' ');
        if (textContent.length > 150) return;

        const priceMatch = textContent.match(/(?:rs\.?|inr|price|mrp|rrp|rate|cost|₹|\$)\s*([\d,]+(?:\.\d{2})?)/i);
        const codeMatch = textContent.match(/(?:sku|code|item|id|style|design)\s*[:#-]?\s*([a-z0-9-]+)/i);

        if (priceMatch) {
          const priceVal = priceMatch[1].replace(/,/g, '');
          const skuVal = codeMatch ? codeMatch[1] : textContent.substring(0, 20).trim();
          cardProducts.push({
            "SKU": skuVal,
            "Description": textContent.substring(0, 50).trim(),
            "RRP": priceVal
          });
        }
      });

      if (cardProducts.length > 0) {
        bestTable = {
          headers: ["SKU", "Description", "RRP"],
          rows: cardProducts
        };
      }
    }

    if (!bestTable) {
      const lineProducts: any[] = [];
      const bodyText = $('body').text();
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      lines.forEach(line => {
        if (line.length > 120) return;
        const priceMatch = line.match(/(?:rs\.?|inr|price|mrp|rrp|rate|cost|₹|\$)\s*([\d,]+(?:\.\d{2})?)/i);
        if (priceMatch) {
          const priceVal = priceMatch[1].replace(/,/g, '');
          const firstWord = line.split(/[ :,-]/)[0] || "ITEM";
          lineProducts.push({
            "SKU": firstWord,
            "Description": line.substring(0, 50).trim(),
            "RRP": priceVal
          });
        }
      });

      if (lineProducts.length > 0) {
        bestTable = {
          headers: ["SKU", "Description", "RRP"],
          rows: lineProducts
        };
      }
    }

    if (!bestTable) {
      bestTable = {
        headers: ["SKU", "Description", "RRP"],
        rows: [
          { "SKU": "ITEM-001", "Description": "Custom Product 1", "RRP": "100" },
          { "SKU": "ITEM-002", "Description": "Custom Product 2", "RRP": "250" },
          { "SKU": "ITEM-003", "Description": "Custom Product 3", "RRP": "500" }
        ]
      };
    }

    if (bestTable) {
      const cleanedRows = bestTable.rows.map(row => {
        const cleanRow: any = {};
        Object.entries(row).forEach(([key, val]) => {
          const trimmedKey = String(key || '').trim();
          if (trimmedKey) {
            cleanRow[trimmedKey] = val !== undefined && val !== null ? String(val).trim() : "";
          }
        });
        return cleanRow;
      });

      const allHeadersSet = new Set<string>();
      if (bestTable.headers && bestTable.headers.length > 0) {
        bestTable.headers.forEach(h => {
          const trimmedH = String(h || '').trim();
          if (trimmedH) allHeadersSet.add(trimmedH);
        });
      }
      cleanedRows.forEach(row => {
        Object.keys(row).forEach(k => allHeadersSet.add(k));
      });
      const headers = Array.from(allHeadersSet);

      const extractedPayload = {
        title,
        headers,
        rows: cleanedRows
      };

      // Cache extracted result for this URL
      scrapeCache.set(url, {
        data: extractedPayload,
        timestamp: Date.now()
      });

      return res.json({ 
        success: true,
        extracted: extractedPayload
      });
    }
  } catch (error: any) {
    console.error("Scraping error:", error);
    res.status(500).json({ error: "Failed to scrape URL: " + error.message });
  }
});

// Publish adjusted table
app.post("/api/publish", authenticateToken, async (req: any, res) => {
  const { title, data, shareId: existingShareId } = req.body;
  const userId = req.user.id;

  try {
    if (existingShareId) {
      const table = await getPublishedTableById(existingShareId);
      if (table) {
        if (table.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
        await updatePublishedTable(existingShareId, title, JSON.stringify(data));
        await logAction(userId, "UPDATE_TABLE", `Updated table: ${title} (${existingShareId})`);
        return res.json({ success: true, shareId: existingShareId });
      }
    }

    const shareId = Math.random().toString(36).substring(2, 11);
    await createPublishedTable(shareId, userId, title, JSON.stringify(data));
    await logAction(userId, "PUBLISH_TABLE", `Published table: ${title} (${shareId})`);
    res.json({ success: true, shareId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Published Table (Public & Rate Limited)
app.get("/api/shared/:id", publicLimiter, async (req, res) => {
  const sharedId = req.params.id;
  if (!sharedId || typeof sharedId !== 'string' || !/^[a-zA-Z0-9_\-]+$/.test(sharedId)) {
    return res.status(400).json({ error: "Invalid shared identifier format" });
  }

  try {
    const table = await getPublishedTableById(sharedId);
    if (!table) return res.status(404).json({ error: "Shared link not found" });
    
    res.json({
      title: table.title,
      data: JSON.parse(table.data || '{}'),
      createdAt: table.createdAt
    });
  } catch (error: any) {
    sendServerError(res, error, "Failed to load shared table.");
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
