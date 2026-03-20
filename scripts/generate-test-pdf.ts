/**
 * Generate a sample SOAP note PDF for testing/preview
 * Run: npx tsx scripts/generate-test-pdf.ts
 */

import { jsPDF } from 'jspdf';
import fs from 'node:fs';
import path from 'node:path';

// Sample data
const sampleData = {
  clientName: 'Jane Smith',
  accountNumber: 'FF-202603-0001',
  sessionDate: '2026-03-20',
  therapistName: 'Dr. Sarah Johnson',
  therapistCredentials: 'LMT, NCTMB',
  duration: '60 minutes',
  chiefComplaint: 'Chronic lower back pain and neck tension from desk work',
  painBefore: '7/10',
  painAfter: '3/10',
  musclesTreated: [
    'Upper Trapezius (L)', 'Upper Trapezius (R)',
    'Levator Scapulae (L)', 'Levator Scapulae (R)',
    'Erector Spinae (L)', 'Erector Spinae (R)',
    'Quadratus Lumborum (L)', 'Quadratus Lumborum (R)',
    'Gluteus Medius (L)', 'Gluteus Medius (R)'
  ],
  techniques: ['Deep Tissue', 'Trigger Point Therapy', 'Myofascial Release', 'Stretching / PNF'],
  soapNote: {
    subjective: 'Patient reports chronic lower back pain rated 7/10 NRS, with intermittent neck stiffness. Symptoms aggravated by prolonged sitting at computer workstation. Reports difficulty sleeping due to discomfort. Goals include pain reduction and improved mobility for daily activities.',
    objective: 'Palpation revealed hypertonicity and trigger points bilaterally in upper trapezius and levator scapulae. Erector spinae demonstrated ropey texture with multiple adhesions at L3-L5 levels. ROM testing showed limited cervical rotation (40° bilaterally vs. normal 80°) and lumbar flexion (60° vs. normal 90°). Postural assessment indicates forward head position and mild thoracic kyphosis.',
    assessment: 'Patient presenting with myofascial pain syndrome affecting cervical and lumbar regions, likely secondary to prolonged static posturing. Tissue responded well to treatment with notable reduction in hypertonicity post-session. Progress toward goals is positive with 4-point reduction in pain scale.',
    plan: 'Recommend weekly sessions for 4-6 weeks to address chronic tension patterns. Home care: gentle neck stretches every 2 hours during work, ergonomic workstation assessment, heat application to lower back before bed. Follow-up areas: continue focus on erector spinae and QL, introduce thoracic mobility work next session.',
    therapistNotes: 'Patient tolerates deep pressure well. Avoided prone positioning due to reported sinus congestion. Used side-lying for lumbar work. Consider referral to physical therapy if no improvement in ROM after 4 sessions.'
  }
};

function generatePDF(): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 20;

  // Helper function to add wrapped text
  const addWrappedText = (text: string, x: number, yPos: number, maxWidth: number, lineHeight: number = 6): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, yPos);
    return yPos + (lines.length * lineHeight);
  };

  // Header
  doc.setFillColor(27, 58, 107); // Primary navy
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SOAP Note', margin, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Flexion & Flow Massage Therapy', margin, 23);
  doc.text(`Session Date: ${sampleData.sessionDate}`, pageWidth - margin - 45, 23);

  y = 45;
  doc.setTextColor(0, 0, 0);

  // Client Info Box
  doc.setFillColor(238, 244, 251); // Light blue bg
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', margin + 5, y + 7);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${sampleData.clientName}`, margin + 5, y + 14);
  doc.text(`Account: ${sampleData.accountNumber}`, margin + 70, y + 14);
  doc.text(`Duration: ${sampleData.duration}`, margin + 130, y + 14);
  doc.text(`Chief Complaint: ${sampleData.chiefComplaint}`, margin + 5, y + 21);
  
  y += 35;

  // Pain Levels
  doc.setFillColor(230, 247, 237); // Light green
  doc.roundedRect(margin, y, contentWidth / 2 - 5, 15, 2, 2, 'F');
  doc.setFontSize(9);
  doc.text(`Pain Before: ${sampleData.painBefore}`, margin + 5, y + 10);
  
  doc.setFillColor(230, 247, 237);
  doc.roundedRect(margin + contentWidth / 2 + 5, y, contentWidth / 2 - 5, 15, 2, 2, 'F');
  doc.text(`Pain After: ${sampleData.painAfter}`, margin + contentWidth / 2 + 10, y + 10);
  
  y += 22;

  // Muscles Treated
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 58, 107);
  doc.text('Muscles Treated:', margin, y);
  y += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const musclesText = sampleData.musclesTreated.join(', ');
  y = addWrappedText(musclesText, margin, y, contentWidth, 4);
  y += 5;

  // Techniques
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 58, 107);
  doc.text('Techniques Used:', margin, y);
  y += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(sampleData.techniques.join(', '), margin, y);
  y += 10;

  // SOAP Sections
  const sections = [
    { letter: 'S', title: 'Subjective', content: sampleData.soapNote.subjective, color: [91, 163, 217] },
    { letter: 'O', title: 'Objective', content: sampleData.soapNote.objective, color: [56, 161, 105] },
    { letter: 'A', title: 'Assessment', content: sampleData.soapNote.assessment, color: [214, 158, 46] },
    { letter: 'P', title: 'Plan', content: sampleData.soapNote.plan, color: [128, 90, 213] },
  ];

  for (const section of sections) {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Section header
    doc.setFillColor(section.color[0], section.color[1], section.color[2]);
    doc.roundedRect(margin, y, 8, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(section.letter, margin + 2.5, y + 6);
    
    doc.setTextColor(section.color[0], section.color[1], section.color[2]);
    doc.text(section.title, margin + 12, y + 6);
    y += 12;

    // Section content
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y = addWrappedText(section.content, margin, y, contentWidth, 5);
    y += 8;
  }

  // Therapist Notes
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(113, 128, 150);
  doc.text('Therapist Notes:', margin + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  addWrappedText(sampleData.soapNote.therapistNotes, margin + 3, y + 12, contentWidth - 6, 4);
  y += 30;

  // Footer
  doc.setFillColor(27, 58, 107);
  doc.rect(0, 282, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`Therapist: ${sampleData.therapistName}, ${sampleData.therapistCredentials}`, margin, 289);
  doc.text('Generated by Flexion & Flow SOAP Notes', pageWidth - margin - 55, 289);

  return Buffer.from(doc.output('arraybuffer'));
}

// Generate and save
const outputDir = path.join(process.cwd(), 'public', 'static', 'samples');
fs.mkdirSync(outputDir, { recursive: true });

const pdfBuffer = generatePDF();
const outputPath = path.join(outputDir, 'sample-soap-note.pdf');
fs.writeFileSync(outputPath, pdfBuffer);

console.log(`✓ Sample PDF generated: ${outputPath}`);
console.log(`  Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
