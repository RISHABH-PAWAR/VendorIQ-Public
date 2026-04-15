'use strict';

/**
 * VendorIQ — AWS S3 Service
 * ==========================
 * Handles PDF upload to S3 and pre-signed URL generation.
 * Bucket: vendoriq-reports (eu-north-1)
 * Key pattern: reports/{client_id}/{report_id}.pdf
 * URL expiry: 7 days (604800 seconds)
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

const URL_EXPIRY_SECONDS = 7 * 24 * 3600; // 7 days

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || 'vendoriq-reports';

/**
 * Upload PDF buffer to S3.
 * @returns {{ url: string, expiresAt: Date }}
 */
async function uploadToS3(pdfBuffer, s3Key) {
  logger.info('Uploading PDF to S3', { key: s3Key, size_kb: Math.round(pdfBuffer.length / 1024) });

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         s3Key,
    Body:        pdfBuffer,
    ContentType: 'application/pdf',
    Metadata: {
      'uploaded-by':  'vendoriq-api',
      'uploaded-at':  new Date().toISOString(),
    },
    // Server-side encryption
    ServerSideEncryption: 'AES256',
    // Cache for 1 hour — pre-signed URLs are per-user anyway
    CacheControl: 'max-age=3600',
  }));

  // Generate pre-signed URL
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key:    s3Key,
      ResponseContentDisposition: `attachment; filename="VendorIQ-Report.pdf"`,
      ResponseContentType: 'application/pdf',
    }),
    { expiresIn: URL_EXPIRY_SECONDS }
  );

  const expiresAt = new Date(Date.now() + URL_EXPIRY_SECONDS * 1000);
  logger.info('PDF uploaded to S3', { key: s3Key, expires_at: expiresAt.toISOString() });

  return { url, expiresAt };
}

/**
 * Refresh an expired pre-signed URL for an existing S3 object.
 */
async function refreshSignedUrl(s3Key) {
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key:    s3Key,
      ResponseContentDisposition: `attachment; filename="VendorIQ-Report.pdf"`,
      ResponseContentType: 'application/pdf',
    }),
    { expiresIn: URL_EXPIRY_SECONDS }
  );

  const expiresAt = new Date(Date.now() + URL_EXPIRY_SECONDS * 1000);
  return { url, expiresAt };
}

/**
 * Delete a PDF from S3 (e.g. user deletes report).
 */
async function deleteFromS3(s3Key) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
    logger.info('PDF deleted from S3', { key: s3Key });
  } catch (err) {
    logger.warn('S3 delete failed', { key: s3Key, error: err.message });
  }
}

module.exports = { uploadToS3, refreshSignedUrl, deleteFromS3 };
