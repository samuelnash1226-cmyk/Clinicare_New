import { useState, useRef } from 'react';
import { X, Download, FileText, Printer, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const srbLogo = 'figma:asset/4a75b62a01df7e8cfb0ca5e95cb4075dd831b41b.png';
// Using SRB logo for both since NDKC logo asset is not provided
const ndkcLogo = 'figma:asset/4a75b62a01df7e8cfb0ca5e95cb4075dd831b41b.png';

interface MedicalCertificateModalProps {
  visitData: {
    visitId: string;
    studentName: string;
    grade: string;
    symptoms: string;
    treatment: string;
    notes?: string;
    nurseName: string;
    timestamp: Date;
  };
  onClose: () => void;
}

type CertificateType = 'clinic_proof' | 'medical_cert' | 'excuse_slip';

export function MedicalCertificateModal({ visitData, onClose }: MedicalCertificateModalProps) {
  const [certificateType, setCertificateType] = useState<CertificateType>('clinic_proof');
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const getCertificateTitle = () => {
    switch (certificateType) {
      case 'medical_cert':
        return 'MEDICAL CERTIFICATE';
      case 'excuse_slip':
        return 'EXCUSE SLIP';
      default:
        return 'CLINIC VISIT PROOF';
    }
  };

  const getCertificateBody = () => {
    const date = visitData.timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const time = visitData.timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    switch (certificateType) {
      case 'medical_cert':
        return (
          <div className="space-y-6" style={{ color: '#1e293b' }}>
            <p className="text-base leading-relaxed text-justify" style={{ color: '#1e293b' }}>
              This is to certify that{' '}
              <span className="font-bold" style={{ color: '#0f172a', borderBottom: '2px solid #1C7C54' }}>
                {visitData.studentName}
              </span>
              , a student of{' '}
              <span className="font-semibold" style={{ color: '#0f172a' }}>{visitData.grade}</span>, visited the
              school clinic on{' '}
              <span className="font-semibold" style={{ color: '#0f172a' }}>{date}</span> at{' '}
              <span className="font-semibold" style={{ color: '#0f172a' }}>{time}</span>.
            </p>
            <div className="space-y-4 pl-4" style={{ borderLeft: '4px solid #1C7C54' }}>
              <p className="text-base" style={{ color: '#1e293b' }}>
                <span className="font-bold uppercase tracking-wide" style={{ color: '#0f172a' }}>Chief Complaint:</span><br/>
                <span className="ml-4" style={{ color: '#1e293b' }}>{visitData.symptoms}</span>
              </p>
              <p className="text-base" style={{ color: '#1e293b' }}>
                <span className="font-bold uppercase tracking-wide" style={{ color: '#0f172a' }}>Treatment Rendered:</span><br/>
                <span className="ml-4" style={{ color: '#1e293b' }}>{visitData.treatment}</span>
              </p>
              {visitData.notes && (
                <p className="text-base" style={{ color: '#1e293b' }}>
                  <span className="font-bold uppercase tracking-wide" style={{ color: '#0f172a' }}>Recommendations:</span><br/>
                  <span className="ml-4" style={{ color: '#1e293b' }}>{visitData.notes}</span>
                </p>
              )}
            </div>
            <p className="text-base leading-relaxed text-justify pt-4 italic" style={{ color: '#1e293b' }}>
              This certificate is issued upon request for whatever legal purpose it may serve.
            </p>
          </div>
        );
      case 'excuse_slip':
        return (
          <div className="space-y-6" style={{ color: '#1e293b' }}>
            <p className="text-base leading-relaxed text-justify" style={{ color: '#1e293b' }}>
              Please be informed that{' '}
              <span className="font-bold" style={{ color: '#0f172a', borderBottom: '2px solid #1C7C54' }}>
                {visitData.studentName}
              </span>{' '}
              from{' '}
              <span className="font-semibold">{visitData.grade}</span> was excused
              from class activities on{' '}
              <span className="font-semibold">{date}</span> at{' '}
              <span className="font-semibold">{time}</span> due to medical reasons.
            </p>
            <div className="space-y-4 pl-4" style={{ borderLeft: '4px solid #1C7C54' }}>
              <p className="text-base" style={{ color: '#1e293b' }}>
                <span className="font-bold uppercase tracking-wide" style={{ color: '#0f172a' }}>Reason:</span><br/>
                <span className="ml-4" style={{ color: '#1e293b' }}>{visitData.symptoms}</span>
              </p>
              <p className="text-base" style={{ color: '#1e293b' }}>
                <span className="font-bold uppercase tracking-wide" style={{ color: '#0f172a' }}>Action Taken:</span><br/>
                <span className="ml-4" style={{ color: '#1e293b' }}>{visitData.treatment}</span>
              </p>
            </div>
            <p className="text-base leading-relaxed text-justify pt-4 italic" style={{ color: '#1e293b' }}>
              Thank you for your understanding and consideration.
            </p>
          </div>
        );
      default:
        return (
          <div className="space-y-4" style={{ color: '#1e293b' }}>
            <p className="text-base leading-relaxed text-justify" style={{ color: '#1e293b' }}>
              This document certifies that{' '}
              <span className="font-bold" style={{ color: '#0f172a', borderBottom: '2px solid #1C7C54' }}>
                {visitData.studentName}
              </span>
              , enrolled in{' '}
              <span className="font-semibold" style={{ color: '#0f172a' }}>{visitData.grade}</span>, was attended
              to at the SRB ClinicCare facility.
            </p>
            <div className="rounded-lg p-6 space-y-4" style={{ backgroundColor: '#ffffff', border: '2px solid #cbd5e1' }}>
              <div className="grid grid-cols-2 gap-4 pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <p className="text-sm font-bold mb-1 uppercase tracking-wide" style={{ color: '#475569' }}>Visit Date</p>
                  <p className="font-semibold text-lg" style={{ color: '#0f172a' }}>{date}</p>
                </div>
                <div>
                  <p className="text-sm font-bold mb-1 uppercase tracking-wide" style={{ color: '#475569' }}>Visit Time</p>
                  <p className="font-semibold text-lg" style={{ color: '#0f172a' }}>{time}</p>
                </div>
              </div>
              <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <p className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>Symptoms Reported</p>
                <p className="text-base" style={{ color: '#0f172a' }}>{visitData.symptoms}</p>
              </div>
              <div className="pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <p className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>Treatment Provided</p>
                <p className="text-base" style={{ color: '#0f172a' }}>{visitData.treatment}</p>
              </div>
              {visitData.notes && (
                <div>
                  <p className="text-sm font-bold mb-2 uppercase tracking-wide" style={{ color: '#475569' }}>Additional Notes</p>
                  <p className="text-base" style={{ color: '#0f172a' }}>{visitData.notes}</p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  const downloadAsPDF = async () => {
    if (!certificateRef.current) {
      toast.error('Certificate not ready');
      return;
    }
    setDownloading(true);
    toast.loading('Generating high-quality PDF...', { id: 'pdf-download' });

    try {
      // Wait for images to fully load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clone the element
      const clone = certificateRef.current.cloneNode(true) as HTMLElement;

      // Force white background and safe text color on root
      clone.style.color = '#1e293b';
      clone.style.backgroundColor = '#ffffff';

      // Append clone temporarily to document for rendering (off-screen)
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);

      // Capture the certificate with high quality
      const canvas = await html2canvas(clone, {
        scale: 3, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        onclone: (clonedDoc) => {
          // Additional safety: ensure all elements have explicit colors
          const clonedElements = clonedDoc.querySelectorAll('*');
          clonedElements.forEach((el: Element) => {
            const htmlEl = el as HTMLElement;
            if (!htmlEl.style.color || htmlEl.style.color === '') {
              htmlEl.style.color = '#1e293b';
            }
            // Force white background on the root
            if (htmlEl === clonedDoc.body || htmlEl.parentElement === clonedDoc.body) {
              htmlEl.style.backgroundColor = '#ffffff';
            }
          });
        },
      });

      // Remove clone
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png', 1.0);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calculate dimensions to fit page with margins
      const margin = 10;
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(availableWidth / (imgWidth / 3.779528), availableHeight / (imgHeight / 3.779528));

      const finalWidth = (imgWidth / 3.779528) * ratio;
      const finalHeight = (imgHeight / 3.779528) * ratio;

      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');

      const fileName = `${getCertificateTitle().replace(/\s+/g, '_')}_${visitData.studentName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);

      toast.success('PDF downloaded successfully! ✅', { id: 'pdf-download' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: 'pdf-download' });
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsImage = async (format: 'png' | 'jpeg') => {
    if (!certificateRef.current) {
      toast.error('Certificate not ready');
      return;
    }
    setDownloading(true);
    toast.loading(`Generating high-quality ${format.toUpperCase()} image...`, { id: 'image-download' });

    try {
      // Wait for images to fully load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Clone the element
      const clone = certificateRef.current.cloneNode(true) as HTMLElement;

      // Force white background and safe text color on root
      clone.style.color = '#1e293b';
      clone.style.backgroundColor = '#ffffff';

      // Append clone temporarily to document for rendering (off-screen)
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);

      // Capture with high quality
      const canvas = await html2canvas(clone, {
        scale: 4, // Very high resolution for images
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        onclone: (clonedDoc) => {
          // Additional safety: ensure all elements have explicit colors
          const clonedElements = clonedDoc.querySelectorAll('*');
          clonedElements.forEach((el: Element) => {
            const htmlEl = el as HTMLElement;
            if (!htmlEl.style.color || htmlEl.style.color === '') {
              htmlEl.style.color = '#1e293b';
            }
            // Force white background on the root
            if (htmlEl === clonedDoc.body || htmlEl.parentElement === clonedDoc.body) {
              htmlEl.style.backgroundColor = '#ffffff';
            }
          });
        },
      });

      // Remove clone
      document.body.removeChild(clone);

      // Convert to desired format
      const quality = format === 'jpeg' ? 0.98 : 1.0;
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(mimeType, quality);

      // Download
      const link = document.createElement('a');
      const fileName = `${getCertificateTitle().replace(/\s+/g, '_')}_${visitData.studentName.replace(/\s+/g, '_')}.${format}`;
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${format.toUpperCase()} downloaded successfully! ✅`, { id: 'image-download' });
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error(`Failed to generate ${format.toUpperCase()}. Please try again.`, { id: 'image-download' });
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl animate-scaleIn">
        {/* Header - Non-printable */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-lg p-6 print:hidden">
          <div>
            <h2 className="text-slate-900">Medical Certificate</h2>
            <p className="mt-1 text-sm text-slate-600">
              Download or print this official clinic document
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Certificate Type Selector - Non-printable */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 print:hidden">
          <Label className="text-sm font-medium text-slate-700 mb-2 block">
            Certificate Type
          </Label>
          <Select value={certificateType} onValueChange={(value: CertificateType) => setCertificateType(value)}>
            <SelectTrigger className="h-12 max-w-sm border-slate-200 bg-white shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clinic_proof">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-ndkc-green" />
                  <span>Clinic Visit Proof</span>
                </div>
              </SelectItem>
              <SelectItem value="medical_cert">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Medical Certificate</span>
                </div>
              </SelectItem>
              <SelectItem value="excuse_slip">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span>Excuse Slip</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Certificate Content - Printable */}
        <div className="p-8 lg:p-12 bg-slate-50">
          <div
            ref={certificateRef}
            className="bg-white p-12 shadow-xl"
            style={{
              minHeight: '800px',
              maxWidth: '210mm',
              margin: '0 auto',
              color: '#1e293b',
              backgroundColor: '#ffffff'
            }}
          >
            {/* Header with Logos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', paddingBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img src={ndkcLogo} alt="NDKC Logo" style={{ height: '80px', width: '80px', objectFit: 'contain' }} />
                <div style={{ height: '80px', width: '1px', backgroundColor: '#cbd5e1' }}></div>
                <img src={srbLogo} alt="SRB Logo" style={{ height: '64px', width: '64px', objectFit: 'contain' }} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>Notre Dame of Kidapawan College</h3>
                <p style={{ fontSize: '12px', marginTop: '4px', color: '#475569' }}>SRB ClinicCare Health Services</p>
              </div>
            </div>

            {/* Certificate Title */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h1 style={{ fontSize: '30px', fontWeight: 'bold', letterSpacing: '0.025em', textTransform: 'uppercase', display: 'inline-block', paddingBottom: '8px', paddingLeft: '32px', paddingRight: '32px', color: '#0f172a', borderBottom: '4px solid #1C7C54' }}>
                  {getCertificateTitle()}
                </h1>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="mb-12">
              {getCertificateBody()}
            </div>

            {/* Signature Section */}
            <div style={{ marginTop: '80px', paddingTop: '32px', borderTop: '2px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issued by:</div>
                  <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '4px', marginBottom: '8px', maxWidth: '300px' }}>
                    <p style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '20px' }}>{visitData.nurseName}</p>
                  </div>
                  <p style={{ fontSize: '14px', color: '#334155', fontWeight: '600' }}>School Nurse</p>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Notre Dame of Kidapawan College</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Issued:</div>
                  <p style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '16px', borderBottom: '2px solid #0f172a', paddingBottom: '4px', display: 'inline-block' }}>
                    {visitData.timestamp.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Visit ID Footer */}
            <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
                <p>Visit ID: {visitData.visitId}</p>
                <p>Generated by SRB ClinicCare System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Non-printable */}
        <div className="border-t border-slate-200 bg-slate-50 p-6 print:hidden">
          <p className="text-sm text-slate-600 mb-4 text-center">
            Download the {getCertificateTitle().toLowerCase()} in your preferred format
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={downloadAsPDF}
              disabled={downloading}
              className="flex-1 min-w-[200px] h-12 bg-gradient-to-r from-ndkc-green to-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  PDF Document
                </>
              )}
            </Button>
            <Button
              onClick={() => downloadAsImage('png')}
              disabled={downloading}
              variant="outline"
              className="flex-1 min-w-[200px] h-12 border-2 border-slate-200 hover:border-ndkc-green hover:bg-emerald-50 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  PNG Image
                </>
              )}
            </Button>
            <Button
              onClick={() => downloadAsImage('jpeg')}
              disabled={downloading}
              variant="outline"
              className="flex-1 min-w-[200px] h-12 border-2 border-slate-200 hover:border-ndkc-green hover:bg-emerald-50 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  JPEG Image
                </>
              )}
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 min-w-[200px] h-12 border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50"
            >
              <Printer className="mr-2 h-5 w-5" />
              Print Certificate
            </Button>
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
            All downloads are high-quality and suitable for official documentation
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper Label component if not imported
function Label({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}