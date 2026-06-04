const Joi = require('joi');

const clientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  department: Joi.string().trim().max(255).optional().allow(''),
  email: Joi.string().trim().email().max(255).optional().allow(''),
  billingAddress: Joi.string().trim().max(2000).optional().allow(''),
  hourlyRate: Joi.number().positive().precision(2).max(99999999.99).optional().allow(null),
  currency: Joi.string().trim().length(3).uppercase().optional().allow('')
});

const workEntrySchema = Joi.object({
  clientId: Joi.number().integer().positive().required(),
  hours: Joi.number().positive().max(24).precision(2).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  date: Joi.date().iso().required()
});

const updateWorkEntrySchema = Joi.object({
  clientId: Joi.number().integer().positive().optional(),
  hours: Joi.number().positive().max(24).precision(2).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  date: Joi.date().iso().optional()
}).min(1); // At least one field must be provided

const updateClientSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  department: Joi.string().trim().max(255).optional().allow(''),
  email: Joi.string().trim().email().max(255).optional().allow(''),
  billingAddress: Joi.string().trim().max(2000).optional().allow(''),
  hourlyRate: Joi.number().positive().precision(2).max(99999999.99).optional().allow(null),
  currency: Joi.string().trim().length(3).uppercase().optional().allow('')
}).min(1);

const emailSchema = Joi.object({
  email: Joi.string().email().required()
});

const manualLineItemSchema = Joi.object({
  description: Joi.string().trim().min(1).max(1000).required(),
  hours: Joi.number().min(0).precision(2).required(),
  rate: Joi.number().min(0).precision(2).required(),
  amount: Joi.number().precision(2).required()
});

const createInvoiceSchema = Joi.object({
  clientId: Joi.number().integer().positive().required(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  paymentTermsDays: Joi.number().integer().min(0).max(365).optional(),
  taxRate: Joi.number().min(0).max(1).precision(4).optional(),
  notes: Joi.string().trim().max(5000).optional().allow(''),
  rateOverride: Joi.number().positive().precision(2).max(99999999.99).optional().allow(null),
  includeWorkEntryIds: Joi.array().items(Joi.number().integer().positive()).optional(),
  manualLineItems: Joi.array().items(manualLineItemSchema).optional()
});

const updateInvoiceSchema = Joi.object({
  paymentTermsDays: Joi.number().integer().min(0).max(365).optional(),
  dueDate: Joi.date().iso().optional(),
  taxRate: Joi.number().min(0).max(1).precision(4).optional(),
  notes: Joi.string().trim().max(5000).optional().allow(''),
  lineItems: Joi.array().items(Joi.object({
    id: Joi.number().integer().positive().optional(),
    workEntryId: Joi.number().integer().positive().optional().allow(null),
    description: Joi.string().trim().min(1).max(1000).required(),
    date: Joi.date().iso().optional().allow(null),
    hours: Joi.number().min(0).precision(2).required(),
    rate: Joi.number().min(0).precision(2).required(),
    amount: Joi.number().precision(2).required(),
    sortOrder: Joi.number().integer().min(0).optional()
  })).optional()
}).min(1);

const statusTransitionSchema = Joi.object({
  status: Joi.string().valid('sent', 'paid', 'overdue', 'void').required()
});

const billingProfileSchema = Joi.object({
  companyName: Joi.string().trim().max(255).optional().allow(''),
  billingAddress: Joi.string().trim().max(2000).optional().allow(''),
  phone: Joi.string().trim().max(50).optional().allow(''),
  defaultPaymentTermsDays: Joi.number().integer().min(0).max(365).optional(),
  defaultTaxRate: Joi.number().min(0).max(1).precision(4).optional(),
  defaultCurrency: Joi.string().trim().length(3).uppercase().optional().allow(''),
  invoicePrefix: Joi.string().trim().min(1).max(10).optional()
});

module.exports = {
  clientSchema,
  workEntrySchema,
  updateWorkEntrySchema,
  updateClientSchema,
  emailSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  statusTransitionSchema,
  billingProfileSchema
};
