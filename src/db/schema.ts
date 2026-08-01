import { pgTable, serial, text, doublePrecision, timestamp, integer, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique(),
  mobile: text('mobile').unique(),
  email: text('email'),
  pin: text('pin'),
  shopName: text('shop_name'),
  dealerCommission: doublePrecision('dealer_commission').default(0),
  status: text('status').default('pending'),
  role: text('role').default('client'),
  userType: text('user_type').default('Owner'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const uploads = pgTable('uploads', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  filename: text('filename'),
  recordCount: integer('record_count'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const records = pgTable('records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  uploadId: integer('upload_id').references(() => uploads.id),
  dealerCode: text('dealer_code'),
  companyCode: text('company_code'),
  costPrice: doublePrecision('cost_price').default(0),
  dealerCommission: doublePrecision('dealer_commission').default(0),
  source: text('source').default('Manual'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const publishedTables = pgTable('published_tables', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  title: text('title'),
  data: text('data'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const logs = pgTable('logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  action: text('action'),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const userServices = pgTable('user_services', {
  userId: integer('user_id').references(() => users.id).notNull(),
  serviceName: text('service_name').notNull(),
  isEnabled: integer('is_enabled').default(0),
}, (table) => [
  primaryKey({ columns: [table.userId, table.serviceName] }),
]);

export const globalServices = pgTable('global_services', {
  name: text('name').primaryKey(),
  isPublished: integer('is_published').default(0),
});

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  contactNumber: text('contact_number'),
  address: text('address'),
  interestedDealerCode: text('interested_dealer_code'),
  enquiryDate: text('enquiry_date'), // stored as YYYY-MM-DD
  boughtDealerCode: text('bought_dealer_code'),
  boughtDate: text('bought_date'), // stored as YYYY-MM-DD
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const clientPurchases = pgTable('client_purchases', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id),
  itemDetails: text('item_details'),
  amount: doublePrecision('amount'),
  purchaseDate: text('purchase_date'), // stored as YYYY-MM-DD
  dealerCode: text('dealer_code'),
});

export const userSettings = pgTable('user_settings', {
  userId: integer('user_id').primaryKey().references(() => users.id),
  reminderDays: integer('reminder_days').default(7),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  clientId: integer('client_id').references(() => clients.id),
  invoiceNumber: text('invoice_number'),
  customerName: text('customer_name'),
  customerMobile: text('customer_mobile'),
  date: text('date'), // stored as YYYY-MM-DD
  totalAmount: doublePrecision('total_amount').default(0),
  status: text('status').default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => invoices.id),
  description: text('description'),
  quantity: doublePrecision('quantity').default(1),
  unitPrice: doublePrecision('unit_price').default(0),
  amount: doublePrecision('amount').default(0),
});
