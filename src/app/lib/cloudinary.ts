/**
 * Cloudinary Upload Service for NDKC ClinicCare
 * Uploads prescription images and PDF documents directly using unsigned upload preset
 */

const CLOUDINARY_CLOUD_NAME = 'xbqb1aku';
const CLOUDINARY_UPLOAD_PRESET = 'clinicdoctor';

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  originalFilename: string;
  format: string;
  bytes: number;
  resourceType: string;
}

/**
 * Upload a prescription file (image or PDF) directly to Cloudinary
 */
export async function uploadPrescriptionToCloudinary(
  file: File,
  studentId?: string
): Promise<CloudinaryUploadResult> {
  if (!file) {
    throw new Error('No file selected for upload.');
  }

  // Max 10MB limit for clinic documents
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('File size exceeds the 10MB limit. Please upload a smaller image or PDF.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  
  // Custom prefix for organization
  if (studentId) {
    const sanitizedId = studentId.replace(/[^a-zA-Z0-9_-]/g, '_');
    formData.append('context', `studentId=${sanitizedId}`);
  }

  // Cloudinary auto resource endpoint handles both images and raw/pdf files
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Upload failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        errorMsg = errorData.error.message;
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(`Cloudinary upload failed: ${errorMsg}`);
  }

  const data = await response.json();

  return {
    url: data.url,
    secureUrl: data.secure_url || data.url,
    publicId: data.public_id,
    originalFilename: data.original_filename || file.name,
    format: data.format || file.type.split('/')[1] || 'pdf',
    bytes: data.bytes || file.size,
    resourceType: data.resource_type || 'image',
  };
}

