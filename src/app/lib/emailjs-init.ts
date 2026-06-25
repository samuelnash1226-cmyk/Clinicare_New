import { db } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// EmailJS Credentials
const EMAILJS_CONFIG = {
  publicKey: 'oS5baCpPMFDl1rgVA',
  serviceId: 'service_aip6vxq',
  templateId: 'template_sk6tt9j'
};

/**
 * Initialize EmailJS settings in Firestore
 * This will allow the system to send parent notifications via email
 */
export async function initializeEmailJS() {
  try {
    console.log('🔧 Initializing EmailJS configuration...');
    
    const settingsRef = doc(db, 'settings', 'emailjs');
    await setDoc(settingsRef, {
      serviceId: EMAILJS_CONFIG.serviceId,
      templateId: EMAILJS_CONFIG.templateId,
      publicKey: EMAILJS_CONFIG.publicKey,
      updatedAt: serverTimestamp(),
      initializedAt: serverTimestamp()
    });
    
    console.log('✅ EmailJS configuration initialized successfully!');
    console.log('📧 Service ID:', EMAILJS_CONFIG.serviceId);
    console.log('📧 Template ID:', EMAILJS_CONFIG.templateId);
    console.log('🔑 Public Key:', EMAILJS_CONFIG.publicKey);
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing EmailJS:', error);
    throw error;
  }
}
