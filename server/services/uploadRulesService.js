const AdminSetting = require('../models/AdminSetting');

const DEFAULT_UPLOAD_RULES = {
  minImages: 1,
  maxImages: 8,
  maxFileSizeMb: 10,
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  allowedDocFormats: ['pdf'],
  pdfAllowed: true,
  galleryAllowed: true,
  deviceFileAllowed: true,
  cameraAllowed: true,
  requiredTitle: true,
  requiredCategory: true,
  requiredCondition: true,
  requiredDescription: true,
  requiredLocation: true,
  requiredPrimaryImage: true,
  requiredSpecifications: false,
  customerUploadAllowed: true,
  customerApprovalRequired: true,
  adminAutoPublish: true
};

exports.DEFAULT_UPLOAD_RULES = DEFAULT_UPLOAD_RULES;

const mongoose = require('mongoose');
const { query: pgQuery } = require('../config/postgres');

/**
 * Get product upload rules dynamically from DB or default
 */
exports.getUploadRules = async () => {
  // 1. Check PostgreSQL first
  try {
    const pgRes = await pgQuery("SELECT value FROM admin_settings WHERE key = 'product_upload_rules' LIMIT 1;");
    if (pgRes?.rows?.[0]?.value) {
      const val = typeof pgRes.rows[0].value === 'string' ? JSON.parse(pgRes.rows[0].value) : pgRes.rows[0].value;
      return {
        ...DEFAULT_UPLOAD_RULES,
        ...val
      };
    }
  } catch {}

  // 2. Check MongoDB only if connected (prevent 10s command buffering timeout)
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      const settingDoc = await AdminSetting.findOne({ key: 'product_upload_rules' }).lean();
      if (settingDoc && settingDoc.value) {
        return {
          ...DEFAULT_UPLOAD_RULES,
          ...settingDoc.value
        };
      }
    } catch (err) {
      console.error('[UploadRulesService] Error fetching upload rules:', err.message);
    }
  }

  return { ...DEFAULT_UPLOAD_RULES };
};

/**
 * Update product upload rules (Admin ONLY)
 */
exports.updateUploadRules = async (updates, adminId) => {
  const currentRules = await exports.getUploadRules();

  const nextRules = {
    ...currentRules,
    minImages: updates.minImages !== undefined ? Math.max(1, parseInt(updates.minImages, 10) || 1) : currentRules.minImages,
    maxImages: updates.maxImages !== undefined ? Math.min(20, Math.max(1, parseInt(updates.maxImages, 10) || 8)) : currentRules.maxImages,
    maxFileSizeMb: updates.maxFileSizeMb !== undefined ? Math.max(1, Math.min(50, parseInt(updates.maxFileSizeMb, 10) || 10)) : currentRules.maxFileSizeMb,
    allowedFormats: Array.isArray(updates.allowedFormats) ? updates.allowedFormats.map(f => String(f).toLowerCase().replace('.', '')) : currentRules.allowedFormats,
    allowedDocFormats: Array.isArray(updates.allowedDocFormats) ? updates.allowedDocFormats.map(f => String(f).toLowerCase().replace('.', '')) : currentRules.allowedDocFormats,
    pdfAllowed: updates.pdfAllowed !== undefined ? Boolean(updates.pdfAllowed) : currentRules.pdfAllowed,
    galleryAllowed: updates.galleryAllowed !== undefined ? Boolean(updates.galleryAllowed) : currentRules.galleryAllowed,
    deviceFileAllowed: updates.deviceFileAllowed !== undefined ? Boolean(updates.deviceFileAllowed) : currentRules.deviceFileAllowed,
    cameraAllowed: updates.cameraAllowed !== undefined ? Boolean(updates.cameraAllowed) : currentRules.cameraAllowed,
    requiredTitle: updates.requiredTitle !== undefined ? Boolean(updates.requiredTitle) : currentRules.requiredTitle,
    requiredCategory: updates.requiredCategory !== undefined ? Boolean(updates.requiredCategory) : currentRules.requiredCategory,
    requiredCondition: updates.requiredCondition !== undefined ? Boolean(updates.requiredCondition) : currentRules.requiredCondition,
    requiredDescription: updates.requiredDescription !== undefined ? Boolean(updates.requiredDescription) : currentRules.requiredDescription,
    requiredLocation: updates.requiredLocation !== undefined ? Boolean(updates.requiredLocation) : currentRules.requiredLocation,
    requiredPrimaryImage: updates.requiredPrimaryImage !== undefined ? Boolean(updates.requiredPrimaryImage) : currentRules.requiredPrimaryImage,
    requiredSpecifications: updates.requiredSpecifications !== undefined ? Boolean(updates.requiredSpecifications) : currentRules.requiredSpecifications,
    customerUploadAllowed: updates.customerUploadAllowed !== undefined ? Boolean(updates.customerUploadAllowed) : currentRules.customerUploadAllowed,
    customerApprovalRequired: updates.customerApprovalRequired !== undefined ? Boolean(updates.customerApprovalRequired) : currentRules.customerApprovalRequired,
    adminAutoPublish: updates.adminAutoPublish !== undefined ? Boolean(updates.adminAutoPublish) : currentRules.adminAutoPublish
  };

  // Ensure minImages <= maxImages
  if (nextRules.minImages > nextRules.maxImages) {
    nextRules.minImages = nextRules.maxImages;
  }

  const updatedSetting = await AdminSetting.findOneAndUpdate(
    { key: 'product_upload_rules' },
    {
      key: 'product_upload_rules',
      value: nextRules,
      label: 'Product Upload & Moderation Rules',
      description: 'Admin configuration for product photo limits, file sizes, formats, and moderation workflows',
      category: 'UPLOAD_RULES',
      updatedBy: adminId || null
    },
    { upsert: true, new: true }
  );

  return updatedSetting.value;
};
