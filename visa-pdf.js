// ============================================================
// visa-pdf.js — Generates a 2-page "Visa Approval" PDF
// SANDBOX / DEMO DOCUMENT — see disclaimers baked into every page.
// Uses jsPDF (loaded via CDN by the page that includes this file).
//
// Page 2 is built from a flexible array of admin-placed "elements"
// (fields bound to applicant data, or free custom text, or the photo),
// plus an optional low-opacity background image. The background must
// already have a "SAMPLE" pattern baked into its pixels by the upload
// pipeline in index.html — this file does not re-check that, so don't
// call generateVisaPDF with an unprocessed backgroundUrl.
// The watermark, header banner, and disclaimer box are NOT part of
// that editable array — they always render on top, fixed, regardless
// of what elements or background are placed underneath.
// ============================================================

async function loadImageAsDataURL(url){
  try{
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = ()=> resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch(e){ return null; }
}

function tileWatermark(docPdf, text){
  const pageWidth = docPdf.internal.pageSize.getWidth();
  const pageHeight = docPdf.internal.pageSize.getHeight();
  docPdf.setFont('helvetica','bold');
  docPdf.setFontSize(13);
  docPdf.setTextColor(185,185,185); // light gray — visible but doesn't block underlying content
  const stepX = 210, stepY = 95;
  for(let y = 50; y < pageHeight + 40; y += stepY){
    for(let x = -80; x < pageWidth + 80; x += stepX){
      docPdf.text(text, x, y, { angle: 32 });
    }
  }
}

function disclaimerBlock(docPdf, y){
  const pageWidth = docPdf.internal.pageSize.getWidth();
  docPdf.setFillColor(255,243,205);
  docPdf.rect(40, y, pageWidth-80, 46, 'F');
  docPdf.setDrawColor(201,168,76);
  docPdf.setLineWidth(1);
  docPdf.rect(40, y, pageWidth-80, 46, 'S');
  docPdf.setFont('helvetica','bold');
  docPdf.setFontSize(9);
  docPdf.setTextColor(120,80,0);
  docPdf.text('SANDBOX DOCUMENT — NOT FOR REAL USE', 50, y+16);
  docPdf.setFont('helvetica','normal');
  docPdf.setFontSize(8);
  docPdf.text('This is a demonstration document created for a student web development contest. It is not an official', 50, y+28);
  docPdf.text('immigration or travel document, confers no legal status, and must not be used for travel or identification.', 50, y+38);
}

function headerBanner(docPdf){
  const pageWidth = docPdf.internal.pageSize.getWidth();
  docPdf.setFillColor(191,10,48);
  docPdf.rect(0, 0, pageWidth, 22, 'F');
  docPdf.setFont('helvetica','bold');
  docPdf.setFontSize(9);
  docPdf.setTextColor(255,255,255);
  docPdf.text('SANDBOX CONTEST PROJECT — NOT AN OFFICIAL U.S. GOVERNMENT DOCUMENT', pageWidth/2, 14, {align:'center'});
}

// Fields admin can bind a placed element to. Values are pulled live from
// the applicant's data at PDF-generation time, so one saved layout works
// for every applicant.
window.VISA_FIELD_DEFS = [
  {key:'firstName', label:'First Name'},
  {key:'lastName', label:'Last Name'},
  {key:'middleName', label:'Middle Name'},
  {key:'fullName', label:'Full Name'},
  {key:'passportNum', label:'Passport No.'},
  {key:'citizenship', label:'Nationality'},
  {key:'dob', label:'Date of Birth'},
  {key:'visaType', label:'Visa Type/Class'},
  {key:'ref', label:'Control Number'},
  {key:'issueDate', label:'Issue Date'},
  {key:'validUntil', label:'Valid Until'},
  {key:'entries', label:'Entries'},
  {key:'deliveryAddress', label:'Delivery Address'}
];

function getFieldValue(d, key){
  switch(key){
    case 'firstName': return d.firstName || (d.fullName||'').split(' ')[0] || '—';
    case 'lastName': return d.lastName || (d.fullName||'').split(' ').slice(-1)[0] || '—';
    case 'middleName': return d.middleName || '—';
    case 'fullName': return d.fullName || '—';
    case 'passportNum': return d.passportNum || '—';
    case 'citizenship': return d.citizenship || '—';
    case 'dob': return d.dob || '—';
    case 'visaType': return d.visaType || '—';
    case 'ref': return d.ref || '—';
    case 'issueDate': return new Date().toLocaleDateString('en-US');
    case 'validUntil': return new Date(Date.now()+365*24*60*60*1000).toLocaleDateString('en-US')+' (illustrative)';
    case 'entries': return 'Multiple (sandbox)';
    case 'deliveryAddress': return d.deliveryAddress || '—';
    default: return '';
  }
}

// Default page-2 layout if admin hasn't customized one yet in the Layout Editor.
window.DEFAULT_VISA_ELEMENTS = [
  { id:'el_photo', type:'photo', x:60,  y:130, w:110, h:130 },
  { id:'el_1', type:'field', fieldKey:'fullName',     x:190, y:145, fontSize:10 },
  { id:'el_2', type:'field', fieldKey:'passportNum',  x:190, y:165, fontSize:10 },
  { id:'el_3', type:'field', fieldKey:'citizenship',  x:190, y:185, fontSize:10 },
  { id:'el_4', type:'field', fieldKey:'dob',          x:190, y:205, fontSize:10 },
  { id:'el_5', type:'field', fieldKey:'visaType',     x:190, y:225, fontSize:10 },
  { id:'el_6', type:'field', fieldKey:'ref',          x:190, y:245, fontSize:10 },
  { id:'el_7', type:'field', fieldKey:'entries',      x:190, y:265, fontSize:10 },
  { id:'el_8', type:'field', fieldKey:'issueDate',    x:60,  y:300, fontSize:10 },
  { id:'el_9', type:'field', fieldKey:'validUntil',   x:60,  y:320, fontSize:10 },
  { id:'el_10', type:'text', content:'DOCUMENT REFERENCE (plain — not machine-readable):', x:60, y:450, fontSize:8 },
  { id:'el_11', type:'field', fieldKey:'ref', x:60, y:464, fontSize:11, mono:true }
];

async function renderPhotoElement(docPdf, el, d){
  docPdf.setDrawColor(0,40,104);
  docPdf.setLineWidth(1);
  docPdf.rect(el.x, el.y, el.w, el.h);
  // Manually-uploaded admin photo takes priority over the applicant's biometric capture
  const photoUrl = d.manualPhotoUrl || (d.biometricPhotos && d.biometricPhotos.front);
  if(photoUrl){
    const dataUrl = await loadImageAsDataURL(photoUrl);
    if(dataUrl){
      try{ docPdf.addImage(dataUrl, 'JPEG', el.x+2, el.y+2, el.w-4, el.h-4); }
      catch(e){
        docPdf.setFontSize(9);
        docPdf.text('Photo unavailable', el.x+12, el.y+el.h/2);
      }
    } else {
      docPdf.setFontSize(9);
      docPdf.text('Photo unavailable', el.x+12, el.y+el.h/2);
    }
  } else {
    docPdf.setFontSize(9);
    docPdf.text('No photo on file', el.x+15, el.y+el.h/2);
  }
}

function renderTextLikeElement(docPdf, el, d){
  let text = '';
  if(el.type === 'field'){
    const def = window.VISA_FIELD_DEFS.find(f=>f.key===el.fieldKey);
    const label = def ? def.label : el.fieldKey;
    text = `${label}: ${getFieldValue(d, el.fieldKey)}`;
  } else if(el.type === 'text'){
    text = el.content || '';
  }
  docPdf.setFont(el.mono ? 'courier' : 'helvetica', 'normal');
  docPdf.setFontSize(el.fontSize || 10);
  docPdf.setTextColor(30,30,46);
  docPdf.text(text, el.x, el.y);
}

// Draws an admin-supplied background image inside the details-page border, at
// reduced opacity. The image itself is pre-processed client-side (see
// processBackgroundImage in index.html) to bake a "SAMPLE" pattern into the
// pixel data before it's ever uploaded, so this can't be used to smuggle in
// something that reads as a real document background. This function only
// places whatever was already uploaded — it does not skip or undo that
// pre-processing step.
async function renderBackgroundImage(docPdf, url, rect, opacity){
  const dataUrl = await loadImageAsDataURL(url);
  if(!dataUrl) return;
  const safeOpacity = Math.max(0.1, Math.min(0.7, typeof opacity === 'number' ? opacity : 0.32));
  try{
    let usedGState = false;
    try{
      docPdf.saveGraphicsState();
      docPdf.setGState(new docPdf.GState({opacity:safeOpacity}));
      usedGState = true;
    } catch(e){ /* GState not available in this jsPDF build — draw at full opacity, the baked-in SAMPLE pattern still applies */ }
    docPdf.addImage(dataUrl, 'JPEG', rect.x, rect.y, rect.w, rect.h, undefined, 'FAST');
    if(usedGState) docPdf.restoreGraphicsState();
  } catch(e){ /* if the image fails to embed, just skip it — never block PDF generation */ }
}

window.generateVisaPDF = async function(d, elementsOverride, backgroundUrl, backgroundOpacity){
  const elements = (elementsOverride && elementsOverride.length) ? elementsOverride : window.DEFAULT_VISA_ELEMENTS;
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF({ unit:'pt', format:'letter' });
  const pageWidth = docPdf.internal.pageSize.getWidth();

  // ===== PAGE 1: Approval cover letter =====
  headerBanner(docPdf);
  docPdf.setFont('helvetica','bold');
  docPdf.setFontSize(20);
  docPdf.setTextColor(0,40,104);
  docPdf.text('Visa Application — Approval Confirmation', 50, 70);

  docPdf.setDrawColor(201,168,76);
  docPdf.setLineWidth(1.5);
  docPdf.line(50, 82, pageWidth-50, 82);

  docPdf.setFont('helvetica','normal');
  docPdf.setFontSize(11);
  docPdf.setTextColor(30,30,46);
  const rows = [
    ['Reference Number', d.ref || '—'],
    ['Applicant Name', d.fullName || '—'],
    ['Visa Category', d.visaType || '—'],
    ['Citizenship', d.citizenship || '—'],
    ['Passport Number', d.passportNum || '—'],
    ['Approval Date', new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})],
    ['Delivery Address', d.deliveryAddress || '—']
  ];
  let y = 115;
  rows.forEach(([label, value])=>{
    docPdf.setFont('helvetica','bold');
    docPdf.text(label+':', 50, y);
    docPdf.setFont('helvetica','normal');
    const lines = docPdf.splitTextToSize(value, pageWidth-220);
    docPdf.text(lines, 210, y);
    y += 22 * Math.max(1, lines.length);
  });

  docPdf.setFontSize(10);
  docPdf.setTextColor(90,100,128);
  const introLines = docPdf.splitTextToSize(
    'Congratulations — your visa application has been approved. The visa page that follows is a sandbox demonstration only, included for portfolio/contest evaluation purposes.',
    pageWidth-100
  );
  docPdf.text(introLines, 50, y+20);

  tileWatermark(docPdf, 'SANDBOX — NOT FOR REAL USE');
  disclaimerBlock(docPdf, docPdf.internal.pageSize.getHeight()-90);

  // ===== PAGE 2: admin-customizable details page =====
  docPdf.addPage();
  headerBanner(docPdf);

  // Single simple border. No real visa security-pattern artwork is ever drawn here —
  // an admin may optionally place a background image (see renderBackgroundImage above),
  // but that image is required to already carry a baked-in SAMPLE pattern from the
  // upload pipeline, so it can't function as a convincing security background.
  docPdf.setDrawColor(0,40,104);
  docPdf.setLineWidth(1.5);
  docPdf.rect(36, 40, pageWidth-72, 520);

  if(backgroundUrl){
    await renderBackgroundImage(docPdf, backgroundUrl, { x:36, y:40, w:pageWidth-72, h:520 }, backgroundOpacity);
  }

  docPdf.setFont('helvetica','bold');
  docPdf.setFontSize(16);
  docPdf.setTextColor(0,40,104);
  docPdf.text('SANDBOX — NOT REAL', pageWidth/2, 78, {align:'center'});
  docPdf.setFontSize(10);
  docPdf.setTextColor(191,10,48);
  docPdf.text('(SANDBOX DEMO — NOT VALID FOR TRAVEL OR ENTRY)', pageWidth/2, 94, {align:'center'});
  docPdf.setFont('helvetica','normal');
  docPdf.setFontSize(11);
  docPdf.setTextColor(60,60,70);
  docPdf.text('Nonimmigrant Visa', pageWidth/2, 110, {align:'center'});

  // Render admin-placed elements (fields, custom text, photo) — fully positioned by admin
  for(const el of elements){
    if(el.type === 'photo') await renderPhotoElement(docPdf, el, d);
    else renderTextLikeElement(docPdf, el, d);
  }

  // Annotation — fixed, not part of the editable elements
  docPdf.setFont('helvetica','italic');
  docPdf.setFontSize(8.5);
  docPdf.setTextColor(90,100,128);
  docPdf.text('Annotation: Issued for demonstration purposes as part of a student web development contest submission.', 60, 500, {maxWidth: pageWidth-160});

  // Fixed safety backstop — always renders on top, not editable via the Layout Editor,
  // regardless of what elements admin has placed underneath.
  tileWatermark(docPdf, 'SANDBOX — NOT FOR REAL USE');
  disclaimerBlock(docPdf, 580);

  docPdf.save(`Visa_Approval_${d.ref || 'sandbox'}.pdf`);
};
