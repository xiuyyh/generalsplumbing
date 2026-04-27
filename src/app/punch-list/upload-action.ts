
'use server';
/**
 * @fileOverview Server Action for secure Cloudinary image uploads.
 */

import { v2 as cloudinary } from 'cloudinary';

// Hardcoded cloud name for Generals Plumbing based on project context
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'generalsplumbing';

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: '336887111739682',
  api_secret: '5lDl-LK1u_TvkohtLxnFRlQPwSs',
  secure: true
});

/**
 * Uploads a base64 encoded image to Cloudinary.
 * @param base64Image The data URI or base64 string of the image to upload.
 * @returns Object containing the secure URL of the uploaded asset.
 */
export async function uploadToCloudinary(base64Image: string) {
  try {
    // Cloudinary SDK automatically handles data URIs
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'generals-plumbing-punchlists',
      resource_type: 'image',
      transformation: [
        { width: 1200, crop: "limit", quality: "auto" }
      ]
    });

    if (!result.secure_url) {
      throw new Error('Upload succeeded but no secure URL was returned.');
    }

    return { url: result.secure_url };
  } catch (error) {
    console.error('Cloudinary upload failure:', error);
    const message = error instanceof Error ? error.message : 'Unknown synchronization error';
    throw new Error(`Image synchronization failed: ${message}`);
  }
}
