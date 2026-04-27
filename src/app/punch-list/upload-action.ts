
'use server';
/**
 * @fileOverview Server Action for secure Cloudinary image uploads.
 */

import { v2 as cloudinary } from 'cloudinary';

// Configuration using user-provided credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'generalsplumbing', // Default placeholder
  api_key: '336887111739682',
  api_secret: '5lDl-LK1u_TvkohtLxnFRlQPwSs',
});

/**
 * Uploads a base64 encoded image to Cloudinary.
 * @param base64Image The data URI of the image to upload.
 * @returns Object containing the secure URL of the uploaded asset.
 */
export async function uploadToCloudinary(base64Image: string) {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'generals-plumbing-punchlists',
      resource_type: 'image',
    });

    return { url: result.secure_url };
  } catch (error) {
    console.error('Cloudinary upload failure:', error);
    throw new Error('Image synchronization failed. Please check credentials and cloud name.');
  }
}
