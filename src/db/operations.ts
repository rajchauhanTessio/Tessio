import { db } from './index.ts';
import { users, records, uploads, publishedTables, logs, userServices, globalServices, clients, clientPurchases, userSettings, invoices, invoiceItems } from './schema.ts';
import { eq, and, or, like, desc, inArray, sql } from 'drizzle-orm';

// Logger helper
export async function logAction(userId: number | null, action: string, details: string) {
  try {
    await db.insert(logs).values({
      userId,
      action,
      details,
    });
  } catch (err) {
    console.error("Failed to log action:", err);
  }
}

// User-related queries
export async function getAdminUser() {
  const adminList = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  return adminList[0];
}

export async function createAdminUser(username: string, hashedPin: string) {
  return db.insert(users).values({
    username,
    pin: hashedPin,
    shopName: "World",
    role: "admin",
    userType: "Owner",
    status: "approved",
  });
}

export async function getUserById(id: number) {
  const userList = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return userList[0];
}

export async function getUserByUsername(username: string) {
  const userList = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return userList[0];
}

export async function getOwnerByShopName(shopName: string) {
  if (!shopName) return null;
  const list = await db.select()
    .from(users)
    .where(and(
      sql`LOWER(${users.shopName}) = LOWER(${shopName.trim()})`,
      or(eq(users.userType, 'Owner'), eq(users.role, 'owner'))
    ))
    .limit(1);
  return list[0] || null;
}

export async function createUser(username: string, mobile: string, email: string, hashedPin: string, shopName: string, userType: string = 'Owner') {
  const normalizedType = userType && userType.toLowerCase() === 'user' ? 'User' : 'Owner';

  if (normalizedType === 'Owner') {
    const existingOwner = await getOwnerByShopName(shopName);
    if (existingOwner) {
      throw new Error(`Shop "${shopName}" already has an Owner registered (${existingOwner.username}). A shop can have only 1 Owner. Please sign up as a User (Staff) for this shop, or enter a different Shop Name.`);
    }
  }

  const result = await db.insert(users).values({
    username,
    mobile,
    email,
    pin: hashedPin,
    shopName: shopName.trim(),
    userType: normalizedType,
    role: 'client',
    status: 'pending'
  }).returning({ id: users.id });
  return result[0];
}

// Shop Data Segregation Helper
export async function getShopUserIds(userId: number): Promise<number[]> {
  const currentUser = await getUserById(userId);
  if (!currentUser) return [userId];

  // Admin sees their own or full system if needed
  if (currentUser.shopName) {
    const shopUsers = await db.select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.shopName}) = LOWER(${currentUser.shopName.trim()})`);
    if (shopUsers.length > 0) {
      return shopUsers.map(u => u.id);
    }
  }
  return [userId];
}

// Admin Operations
export async function getPendingServices() {
  return db.select({
    userId: userServices.userId,
    serviceName: userServices.serviceName,
    email: users.email,
    shopName: users.shopName,
  })
  .from(userServices)
  .innerJoin(users, eq(userServices.userId, users.id))
  .where(eq(userServices.isEnabled, 2));
}

export async function getGlobalServices() {
  return db.select().from(globalServices);
}

export async function ensureGlobalService(name: string) {
  const existing = await db.select().from(globalServices).where(eq(globalServices.name, name)).limit(1);
  if (existing.length === 0) {
    await db.insert(globalServices).values({ name, isPublished: 0 });
  }
}

export async function toggleGlobalService(name: string, isPublished: boolean) {
  return db.update(globalServices).set({ isPublished: isPublished ? 1 : 0 }).where(eq(globalServices.name, name));
}

export async function getClientUsers() {
  return db.select({
    id: users.id,
    username: users.username,
    mobile: users.mobile,
    email: users.email,
    shop_name: users.shopName,
    user_type: users.userType,
    dealer_commission: users.dealerCommission,
    status: users.status,
    created_at: users.createdAt,
  }).from(users).where(or(eq(users.role, 'client'), eq(users.role, 'owner'), eq(users.role, 'user'))).orderBy(desc(users.createdAt));
}

export async function updateUserStatus(id: number, status: string) {
  return db.update(users).set({ status }).where(eq(users.id, id));
}

export async function updateUserDetails(id: number, username: string, mobile: string, email: string, shop_name: string, dealer_commission: number, user_type?: string) {
  const payload: any = {
    username,
    mobile,
    email,
    shopName: shop_name,
    dealerCommission: dealer_commission,
  };
  if (user_type) {
    payload.userType = user_type;
  }
  return db.update(users).set(payload).where(eq(users.id, id));
}

export async function deleteUserAndData(id: number) {
  return db.transaction(async (tx) => {
    // Delete invoice items first
    const userInvoices = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.userId, id));
    const invoiceIds = userInvoices.map(inv => inv.id);
    if (invoiceIds.length > 0) {
      await tx.delete(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceIds));
    }
    await tx.delete(invoices).where(eq(invoices.userId, id));

    // Clients & purchases
    const userClients = await tx.select({ id: clients.id }).from(clients).where(eq(clients.userId, id));
    const clientIds = userClients.map(c => c.id);
    if (clientIds.length > 0) {
      await tx.delete(clientPurchases).where(inArray(clientPurchases.clientId, clientIds));
    }
    await tx.delete(clients).where(eq(clients.userId, id));

    await tx.delete(userSettings).where(eq(userSettings.userId, id));
    await tx.delete(userServices).where(eq(userServices.userId, id));
    await tx.delete(records).where(eq(records.userId, id));
    await tx.delete(uploads).where(eq(uploads.userId, id));
    await tx.delete(publishedTables).where(eq(publishedTables.userId, id));
    await tx.delete(logs).where(eq(logs.userId, id));
    await tx.delete(users).where(eq(users.id, id));
  });
}

export async function getLogs() {
  return db.select({
    id: logs.id,
    user_id: logs.userId,
    action: logs.action,
    details: logs.details,
    timestamp: logs.timestamp,
    username: users.username,
  })
  .from(logs)
  .leftJoin(users, eq(logs.userId, users.id))
  .orderBy(desc(logs.timestamp))
  .limit(100);
}

export async function getUserLogs(userId: number) {
  return db.select({
    id: logs.id,
    user_id: logs.userId,
    action: logs.action,
    details: logs.details,
    timestamp: logs.timestamp,
    username: users.username,
  })
  .from(logs)
  .leftJoin(users, eq(logs.userId, users.id))
  .where(eq(logs.userId, userId))
  .orderBy(desc(logs.timestamp))
  .limit(100);
}

export async function getUserRecords(userId: number) {
  return db.select().from(records).where(eq(records.userId, userId)).orderBy(desc(records.updatedAt));
}

export async function getAllUserServices() {
  return db.select().from(userServices);
}

export async function toggleUserService(userId: number, serviceName: string, isEnabled: boolean) {
  return db.insert(userServices).values({
    userId,
    serviceName,
    isEnabled: isEnabled ? 1 : 0
  }).onConflictDoUpdate({
    target: [userServices.userId, userServices.serviceName],
    set: { isEnabled: isEnabled ? 1 : 0 }
  });
}

// Client services queries
export async function getUserServicesList(userId: number) {
  const shopUserIds = await getShopUserIds(userId);
  return db.select({
    service_name: userServices.serviceName,
    is_enabled: userServices.isEnabled
  }).from(userServices).where(inArray(userServices.userId, shopUserIds));
}

export async function requestUserService(userId: number, serviceName: string) {
  return db.insert(userServices).values({
    userId,
    serviceName,
    isEnabled: 2
  }).onConflictDoUpdate({
    target: [userServices.userId, userServices.serviceName],
    set: { isEnabled: 2 }
  });
}

export async function disableUserService(userId: number, serviceName: string) {
  return db.update(userServices).set({ isEnabled: 0 }).where(and(eq(userServices.userId, userId), eq(userServices.serviceName, serviceName)));
}

// Client Records Queries
export async function deleteRecord(recordId: number, userId: number) {
  return db.delete(records).where(and(eq(records.id, recordId), eq(records.userId, userId)));
}

export async function bulkDeleteRecords(ids: number[], userId: number) {
  return db.delete(records).where(and(
    inArray(records.id, ids),
    eq(records.userId, userId)
  ));
}

export async function getRecords(userId: number) {
  const shopUserIds = await getShopUserIds(userId);
  return db.select({
    id: records.id,
    user_id: records.userId,
    upload_id: records.uploadId,
    dealer_code: records.dealerCode,
    company_code: records.companyCode,
    cost_price: records.costPrice,
    dealer_commission: records.dealerCommission,
    source: records.source,
    created_at: records.createdAt,
    updated_at: records.updatedAt,
    filename: uploads.filename,
  })
  .from(records)
  .leftJoin(uploads, eq(records.uploadId, uploads.id))
  .where(inArray(records.userId, shopUserIds))
  .orderBy(desc(records.updatedAt));
}

export async function checkRecordDuplicate(userId: number, companyCode: string) {
  const shopUserIds = await getShopUserIds(userId);
  const result = await db.select({ id: records.id }).from(records).where(and(inArray(records.userId, shopUserIds), eq(records.companyCode, companyCode))).limit(1);
  return result[0];
}

export async function updateRecordSingle(recordId: number, dealerCode: string, costPrice: number, commission: number) {
  return db.update(records).set({
    dealerCode,
    costPrice,
    dealerCommission: commission,
    source: 'Manual',
    updatedAt: new Date()
  }).where(eq(records.id, recordId));
}

export async function insertRecordSingle(userId: number, dealerCode: string, companyCode: string, costPrice: number, commission: number) {
  const result = await db.insert(records).values({
    userId,
    dealerCode,
    companyCode,
    costPrice,
    dealerCommission: commission,
    source: 'Manual'
  }).returning({ id: records.id });
  return result[0];
}

export async function updateRecordFull(recordId: number, userId: number, dealerCode: string, companyCode: string, costPrice: number) {
  return db.update(records).set({
    dealerCode,
    companyCode,
    costPrice,
    updatedAt: new Date()
  }).where(and(eq(records.id, recordId), eq(records.userId, userId)));
}

export async function createUploadAndImportRecords(userId: number, filename: string, recordCount: number, recordsInput: any[], strategy: string, overwriteCodes: string[]) {
  const uploadResult = await db.insert(uploads).values({
    userId,
    filename,
    recordCount
  }).returning({ id: uploads.id });
  const uploadId = uploadResult[0].id;

  const userList = await db.select({ dealerCommission: users.dealerCommission }).from(users).where(eq(users.id, userId)).limit(1);
  const commission = userList[0]?.dealerCommission || 0;

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  await db.transaction(async (tx) => {
    for (const record of recordsInput) {
      const existingList = await tx.select({ id: records.id }).from(records).where(and(eq(records.userId, userId), eq(records.companyCode, record.company_code))).limit(1);
      const existing = existingList[0];
      
      if (existing) {
        const shouldOverwrite = strategy === 'overwrite' || (Array.isArray(overwriteCodes) && overwriteCodes.includes(record.company_code));
        
        if (shouldOverwrite) {
          await tx.update(records).set({
            uploadId,
            dealerCode: record.dealer_code,
            costPrice: record.cost_price || 0,
            dealerCommission: commission,
            source: filename,
            updatedAt: new Date()
          }).where(eq(records.id, existing.id));
          updated++;
        } else {
          skipped++;
        }
      } else {
        await tx.insert(records).values({
          userId,
          uploadId,
          dealerCode: record.dealer_code,
          companyCode: record.company_code,
          costPrice: record.cost_price || 0,
          dealerCommission: commission,
          source: filename
        });
        imported++;
      }
    }
  });

  return { uploadId, imported, updated, skipped };
}

export async function importUserRecordsAdmin(targetUserId: number, recordsInput: any[], strategy: string) {
  const userList = await db.select({ dealerCommission: users.dealerCommission }).from(users).where(eq(users.id, targetUserId)).limit(1);
  const commission = userList[0]?.dealerCommission || 0;

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  await db.transaction(async (tx) => {
    for (const record of recordsInput) {
      const existingList = await tx.select({ id: records.id }).from(records).where(and(eq(records.userId, targetUserId), eq(records.companyCode, record.company_code))).limit(1);
      const existing = existingList[0];
      
      if (existing) {
        if (strategy === 'overwrite') {
          await tx.update(records).set({
            dealerCode: record.dealer_code,
            costPrice: record.cost_price || 0,
            dealerCommission: commission,
            source: 'Admin Import',
            updatedAt: new Date()
          }).where(eq(records.id, existing.id));
          updated++;
        } else {
          skipped++;
        }
      } else {
        await tx.insert(records).values({
          userId: targetUserId,
          dealerCode: record.dealer_code,
          companyCode: record.company_code,
          costPrice: record.cost_price || 0,
          dealerCommission: commission,
          source: 'Admin Import'
        });
        imported++;
      }
    }
  });

  return { imported, updated, skipped };
}

export async function updateProfileDetails(userId: number, mobile?: string, dealerCommission?: number) {
  await db.transaction(async (tx) => {
    if (mobile !== undefined) {
      await tx.update(users).set({ mobile }).where(eq(users.id, userId));
    }
    if (dealerCommission !== undefined) {
      await tx.update(users).set({ dealerCommission }).where(eq(users.id, userId));
      await tx.update(records).set({ dealerCommission, updatedAt: new Date() }).where(eq(records.userId, userId));
    }
  });
}

export async function updateProfileAdmin(userId: number, username: string, email: string, pin?: string) {
  if (pin) {
    return db.update(users).set({ username, email, pin }).where(eq(users.id, userId));
  } else {
    return db.update(users).set({ username, email }).where(eq(users.id, userId));
  }
}

export async function updateProfilePinOnly(userId: number, hashedPin: string) {
  return db.update(users).set({ pin: hashedPin }).where(eq(users.id, userId));
}

export async function getUploadsHistory(userId: number) {
  const shopUserIds = await getShopUserIds(userId);
  return db.select().from(uploads).where(inArray(uploads.userId, shopUserIds)).orderBy(desc(uploads.timestamp));
}

export async function deleteUploadAndRecords(userId: number, uploadId: number) {
  const shopUserIds = await getShopUserIds(userId);
  return db.transaction(async (tx) => {
    const deletedRows = await tx.delete(records)
      .where(and(inArray(records.userId, shopUserIds), eq(records.uploadId, uploadId)))
      .returning({ id: records.id });
    await tx.delete(uploads).where(and(eq(uploads.id, uploadId), inArray(uploads.userId, shopUserIds)));
    return deletedRows.length;
  });
}

// Client Management Queries
export async function getClients(userId: number) {
  const shopUserIds = await getShopUserIds(userId);
  return db.select().from(clients).where(inArray(clients.userId, shopUserIds)).orderBy(desc(clients.createdAt));
}

export async function createClient(userId: number, name: string, contactNumber: string, address: string, interestedDealerCode: string, enquiryDate: string, boughtDealerCode: string, boughtDate: string, notes: string) {
  const result = await db.insert(clients).values({
    userId,
    name,
    contactNumber,
    address,
    interestedDealerCode,
    enquiryDate,
    boughtDealerCode,
    boughtDate,
    notes,
  }).returning({ id: clients.id });
  return result[0];
}

export async function updateClient(clientId: number, userId: number, name: string, contactNumber: string, address: string, interestedDealerCode: string, enquiryDate: string, boughtDealerCode: string, boughtDate: string, notes: string) {
  return db.update(clients).set({
    name,
    contactNumber,
    address,
    interestedDealerCode,
    enquiryDate,
    boughtDealerCode,
    boughtDate,
    notes,
  }).where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
}

export async function deleteClient(clientId: number, userId: number) {
  return db.transaction(async (tx) => {
    await tx.delete(clientPurchases).where(eq(clientPurchases.clientId, clientId));
    await tx.delete(clients).where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
  });
}

export async function getClientById(clientId: number) {
  const result = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  return result[0];
}

export async function getClientPurchases(clientId: number) {
  return db.select().from(clientPurchases).where(eq(clientPurchases.clientId, clientId)).orderBy(desc(clientPurchases.purchaseDate));
}

export async function createClientPurchase(clientId: number, itemDetails: string, amount: number, purchaseDate: string, dealerCode: string) {
  const result = await db.insert(clientPurchases).values({
    clientId,
    itemDetails,
    amount,
    purchaseDate,
    dealerCode,
  }).returning({ id: clientPurchases.id });
  return result[0];
}

export async function deleteClientPurchase(purchaseId: number) {
  return db.delete(clientPurchases).where(eq(clientPurchases.id, purchaseId));
}

export async function checkPurchaseAccess(purchaseId: number) {
  const list = await db.select({ userId: clients.userId })
    .from(clientPurchases)
    .innerJoin(clients, eq(clientPurchases.clientId, clients.id))
    .where(eq(clientPurchases.id, purchaseId))
    .limit(1);
  return list[0];
}

// User Settings
export async function getUserSettings(userId: number) {
  const list = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return list[0];
}

export async function saveUserSettings(userId: number, reminderDays: number) {
  return db.insert(userSettings).values({
    userId,
    reminderDays
  }).onConflictDoUpdate({
    target: userSettings.userId,
    set: { reminderDays }
  });
}

// Invoices
export async function getInvoices(userId: number) {
  const shopUserIds = await getShopUserIds(userId);
  return db.select().from(invoices).where(inArray(invoices.userId, shopUserIds)).orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(invoiceId: number, userId: number) {
  const shopUserIds = await getShopUserIds(userId);
  const list = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), inArray(invoices.userId, shopUserIds))).limit(1);
  return list[0];
}

export async function getInvoiceItems(invoiceId: number) {
  return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
}

export async function createInvoiceAndItems(userId: number, clientId: number | null, customerName: string, customerMobile: string, date: string, status: string, notes: string, items: any[]) {
  return db.transaction(async (tx) => {
    const total_amount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    const invoice_number = `INV-${Date.now()}`;
    
    const result = await tx.insert(invoices).values({
      userId,
      clientId,
      invoiceNumber: invoice_number,
      customerName,
      customerMobile,
      date,
      totalAmount: total_amount,
      status,
      notes,
    }).returning({ id: invoices.id });
    
    const id = result[0].id;
    
    for (const item of items) {
      await tx.insert(invoiceItems).values({
        invoiceId: id,
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unit_price || 0,
        amount: (item.quantity || 1) * (item.unit_price || 0),
      });
    }
    
    return id;
  });
}

export async function updateInvoiceAndItems(invoiceId: number, userId: number, clientId: number | null, customerName: string, customerMobile: string, date: string, status: string, notes: string, items: any[]) {
  return db.transaction(async (tx) => {
    const total_amount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
    
    await tx.update(invoices).set({
      customerName,
      customerMobile,
      date,
      status,
      notes,
      totalAmount: total_amount,
      clientId,
    }).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));
    
    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    
    for (const item of items) {
      await tx.insert(invoiceItems).values({
        invoiceId,
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unit_price || 0,
        amount: (item.quantity || 1) * (item.unit_price || 0),
      });
    }
  });
}

export async function deleteInvoiceAndItems(invoiceId: number, userId: number) {
  return db.transaction(async (tx) => {
    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    await tx.delete(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));
  });
}

// Invoice item suggestion from previous purchases
export async function getItemSuggestions(userId: number, q: string) {
  const shopUserIds = await getShopUserIds(userId);
  return db.select({
    name: clientPurchases.itemDetails,
    price: clientPurchases.amount,
  })
  .from(clientPurchases)
  .innerJoin(clients, eq(clientPurchases.clientId, clients.id))
  .where(and(
    inArray(clients.userId, shopUserIds),
    or(
      like(clientPurchases.itemDetails, `%${q}%`),
      like(clientPurchases.dealerCode, `%${q}%`)
    )
  ))
  .groupBy(clientPurchases.itemDetails, clientPurchases.amount)
  .limit(8);
}

// Record suggestions
export async function getRecordSuggestions(userId: number, q: string) {
  const shopUserIds = await getShopUserIds(userId);
  return db.select({
    id: records.id,
    dealer_code: records.dealerCode,
    company_code: records.companyCode,
    cost_price: records.costPrice,
    dealer_commission: records.dealerCommission,
    source: records.source,
    updated_at: records.updatedAt,
  })
  .from(records)
  .where(and(
    inArray(records.userId, shopUserIds),
    or(
      like(records.dealerCode, `%${q}%`),
      like(records.companyCode, `%${q}%`)
    )
  ))
  .limit(10);
}

// Global Dialer Code Search
export async function getGlobalCodes(userId: number, q: string) {
  const shopUserIds = await getShopUserIds(userId);
  return db.select({
    dealer_code: records.dealerCode,
    count: sql<number>`count(*)`
  })
  .from(records)
  .where(and(
    inArray(records.userId, shopUserIds),
    like(records.dealerCode, `%${q}%`)
  ))
  .groupBy(records.dealerCode)
  .orderBy(desc(sql`count(*)`))
  .limit(10);
}

// Published Tables
export async function getPublishedTableById(id: string) {
  const list = await db.select().from(publishedTables).where(eq(publishedTables.id, id)).limit(1);
  return list[0];
}

export async function createPublishedTable(id: string, userId: number, title: string, data: string) {
  return db.insert(publishedTables).values({
    id,
    userId,
    title,
    data,
  });
}

export async function updatePublishedTable(id: string, title: string, data: string) {
  return db.update(publishedTables).set({ title, data }).where(eq(publishedTables.id, id));
}

// Backup all postgres tables
export async function backupPostgresDb() {
  const backup: any = {};
  const tableNames = [
    'users', 'records', 'uploads', 'published_tables', 
    'logs', 'user_services', 'global_services', 
    'clients', 'client_purchases', 'user_settings', 
    'invoices', 'invoice_items'
  ];
  
  for (const table of tableNames) {
    const queryResult = await db.execute(sql.raw(`SELECT * FROM "${table}"`));
    backup[table] = queryResult.rows;
  }
  
  return backup;
}

// Retrieve DB Tables stats
export async function getDbTablesStats() {
  const result = [];
  const tableNames = [
    'users', 'records', 'uploads', 'published_tables', 
    'logs', 'user_services', 'global_services', 
    'clients', 'client_purchases', 'user_settings', 
    'invoices', 'invoice_items'
  ];

  for (const name of tableNames) {
    const countRes = await db.execute(sql`SELECT COUNT(*) AS count FROM ${sql.raw(`"${name}"`)}`);
    const count = parseInt((countRes.rows[0] as any).count);
    
    const columnsRes = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${name}
    `);
    
    const pkRes = await db.execute(sql`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = ${name}
    `);
    const pks = pkRes.rows.map((r: any) => r.column_name);
    
    result.push({
      name,
      rowCount: count,
      columns: columnsRes.rows.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        pk: pks.includes(col.column_name),
        notnull: col.is_nullable === 'NO'
      }))
    });
  }

  return result;
}
