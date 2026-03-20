/**
 * Massage Therapy Techniques List
 */
export const TECHNIQUES = [
  'Swedish Massage', 'Deep Tissue', 'Trigger Point Therapy',
  'Myofascial Release', 'Neuromuscular Therapy', 'Sports Massage',
  'Hot Stone', 'Lymphatic Drainage', 'Stretching / PNF', 'Cupping',
  'Instrument-Assisted (IASTM)', 'Craniosacral'
];

/**
 * Muscle Map Data
 * 
 * Images: 890x1024 (male), 862x1024 (female)
 * Each image: LEFT HALF = anterior, RIGHT HALF = posterior
 * SVG viewBox per half = 445x1024 (male) / 431x1024 (female)
 * Muscles mapped as polygons in the HALF-IMAGE coordinate space
 * 
 * We use a normalised 400x920 viewBox for both, scaled to fit
 */
export const MUSCLES = [
  // ─── ANTERIOR ────────────────────────────────────────────────────

  // NECK
  { id:'scm_l', name:'Sternocleidomastoid (L)', group:'Neck', view:'anterior',
    points:'178,92 172,104 166,118 164,132 167,144 174,150 182,145 186,132 184,118 181,104' },
  { id:'scm_r', name:'Sternocleidomastoid (R)', group:'Neck', view:'anterior',
    points:'222,92 228,104 234,118 236,132 233,144 226,150 218,145 214,132 216,118 219,104' },

  // SHOULDER — ANTERIOR DELTOID
  { id:'deltoid_ant_l', name:'Anterior Deltoid (L)', group:'Shoulder', view:'anterior',
    points:'150,148 138,152 124,160 110,170 100,182 96,198 98,214 107,222 120,226 134,222 144,212 150,198 154,182 153,165' },
  { id:'deltoid_ant_r', name:'Anterior Deltoid (R)', group:'Shoulder', view:'anterior',
    points:'250,148 262,152 276,160 290,170 300,182 304,198 302,214 293,222 280,226 266,222 256,212 250,198 246,182 247,165' },

  // CHEST
  { id:'pec_major_l', name:'Pectoralis Major (L)', group:'Chest', view:'anterior',
    points:'200,172 194,168 182,166 168,168 152,174 138,184 126,198 120,215 118,234 124,252 135,264 150,272 166,274 180,270 192,260 198,246 200,228' },
  { id:'pec_major_r', name:'Pectoralis Major (R)', group:'Chest', view:'anterior',
    points:'200,172 206,168 218,166 232,168 248,174 262,184 274,198 280,215 282,234 276,252 265,264 250,272 234,274 220,270 208,260 202,246 200,228' },

  // SERRATUS ANTERIOR
  { id:'serratus_l', name:'Serratus Anterior (L)', group:'Core', view:'anterior',
    points:'152,220 145,238 142,258 146,272 155,278 164,272 167,254 164,236 158,220' },
  { id:'serratus_r', name:'Serratus Anterior (R)', group:'Core', view:'anterior',
    points:'248,220 255,238 258,258 254,272 245,278 236,272 233,254 236,236 242,220' },

  // BICEPS BRACHII
  { id:'biceps_l', name:'Biceps Brachii (L)', group:'Upper Arm', view:'anterior',
    points:'138,228 126,238 114,256 104,276 97,302 95,330 97,356 106,372 120,376 132,366 140,344 142,314 140,284 138,256' },
  { id:'biceps_r', name:'Biceps Brachii (R)', group:'Upper Arm', view:'anterior',
    points:'262,228 274,238 286,256 296,276 303,302 305,330 303,356 294,372 280,376 268,366 260,344 258,314 260,284 262,256' },

  // FOREARM FLEXORS
  { id:'forearm_flex_l', name:'Forearm Flexors (L)', group:'Forearm', view:'anterior',
    points:'118,374 106,388 94,406 82,426 75,446 74,462 79,472 93,474 108,462 118,444 126,422 128,400' },
  { id:'forearm_flex_r', name:'Forearm Flexors (R)', group:'Forearm', view:'anterior',
    points:'282,374 294,388 306,406 318,426 325,446 326,462 321,472 307,474 292,462 282,444 274,422 272,400' },

  // CORE — RECTUS ABDOMINIS
  { id:'rectus_abdominis', name:'Rectus Abdominis', group:'Core', view:'anterior',
    points:'187,272 184,298 183,326 183,356 184,386 188,412 194,428 200,431 206,428 212,412 216,386 217,356 217,326 216,298 213,272 200,266' },

  // CORE — EXTERNAL OBLIQUES
  { id:'oblique_l', name:'External Oblique (L)', group:'Core', view:'anterior',
    points:'185,272 176,285 168,310 160,338 152,366 148,392 151,415 162,424 175,418 180,400 183,374 183,342 183,308 184,280' },
  { id:'oblique_r', name:'External Oblique (R)', group:'Core', view:'anterior',
    points:'215,272 224,285 232,310 240,338 248,366 252,392 249,415 238,424 225,418 220,400 217,374 217,342 217,308 216,280' },

  // HIP — ILIOPSOAS
  { id:'iliopsoas_l', name:'Iliopsoas / Hip Flexor (L)', group:'Hip', view:'anterior',
    points:'182,440 174,455 170,472 173,488 181,498 191,500 199,492 200,474 196,456 189,441' },
  { id:'iliopsoas_r', name:'Iliopsoas / Hip Flexor (R)', group:'Hip', view:'anterior',
    points:'218,440 226,455 230,472 227,488 219,498 209,500 201,492 200,474 204,456 211,441' },

  // HIP — TENSOR FASCIA LATAE
  { id:'tfl_l', name:'Tensor Fascia Latae (L)', group:'Hip', view:'anterior',
    points:'153,440 144,454 136,472 132,490 135,506 145,514 156,510 162,494 162,474 158,454' },
  { id:'tfl_r', name:'Tensor Fascia Latae (R)', group:'Hip', view:'anterior',
    points:'247,440 256,454 264,472 268,490 265,506 255,514 244,510 238,494 238,474 242,454' },

  // THIGH — QUADRICEPS
  { id:'quad_l', name:'Quadriceps (L)', group:'Thigh', view:'anterior',
    points:'158,508 146,526 134,554 124,582 120,612 122,644 129,664 144,674 159,674 170,663 176,644 177,612 172,582 163,554 157,526' },
  { id:'quad_r', name:'Quadriceps (R)', group:'Thigh', view:'anterior',
    points:'242,508 254,526 266,554 276,582 280,612 278,644 271,664 256,674 241,674 230,663 223,644 223,612 228,582 237,554 243,526' },

  // THIGH — ADDUCTORS
  { id:'adductors_l', name:'Adductors (L)', group:'Thigh', view:'anterior',
    points:'186,510 180,530 176,558 174,586 174,614 177,634 186,642 196,638 200,620 200,590 200,560 198,532 192,512' },
  { id:'adductors_r', name:'Adductors (R)', group:'Thigh', view:'anterior',
    points:'214,510 220,530 224,558 226,586 226,614 223,634 214,642 204,638 200,620 200,590 200,560 202,532 208,512' },

  // THIGH — SARTORIUS
  { id:'sartorius_l', name:'Sartorius (L)', group:'Thigh', view:'anterior',
    points:'162,506 157,528 155,554 156,582 160,612 166,640 171,662 178,662 176,640 170,612 166,582 165,554 165,528 167,506' },
  { id:'sartorius_r', name:'Sartorius (R)', group:'Thigh', view:'anterior',
    points:'238,506 243,528 245,554 244,582 240,612 234,640 229,662 222,662 224,640 230,612 234,582 235,554 235,528 233,506' },

  // LOWER LEG — TIBIALIS ANTERIOR
  { id:'tibialis_ant_l', name:'Tibialis Anterior (L)', group:'Lower Leg', view:'anterior',
    points:'168,682 160,700 155,724 154,750 158,774 165,788 175,790 184,784 188,768 185,742 179,718 172,698' },
  { id:'tibialis_ant_r', name:'Tibialis Anterior (R)', group:'Lower Leg', view:'anterior',
    points:'232,682 240,700 245,724 246,750 242,774 235,788 225,790 216,784 212,768 215,742 221,718 228,698' },

  // LOWER LEG — PERONEALS
  { id:'peroneals_l', name:'Peroneals (L)', group:'Lower Leg', view:'anterior',
    points:'151,690 144,708 140,733 141,758 146,776 154,780 160,773 159,748 156,724 153,706' },
  { id:'peroneals_r', name:'Peroneals (R)', group:'Lower Leg', view:'anterior',
    points:'249,690 256,708 260,733 259,758 254,776 246,780 240,773 241,748 244,724 247,706' },

  // ─── POSTERIOR ────────────────────────────────────────────────────

  // NECK — UPPER TRAPEZIUS
  { id:'upper_trap_l', name:'Upper Trapezius (L)', group:'Neck/Shoulder', view:'posterior',
    points:'200,90 191,100 178,118 162,140 146,160 130,180 118,200 112,220 120,230 140,230 162,222 182,208 197,190 200,164' },
  { id:'upper_trap_r', name:'Upper Trapezius (R)', group:'Neck/Shoulder', view:'posterior',
    points:'200,90 209,100 222,118 238,140 254,160 270,180 282,200 288,220 280,230 260,230 238,222 218,208 203,190 200,164' },

  // NECK — LEVATOR SCAPULAE
  { id:'levator_scap_l', name:'Levator Scapulae (L)', group:'Neck', view:'posterior',
    points:'192,90 186,103 183,118 186,130 193,135 199,130 199,114 196,99' },
  { id:'levator_scap_r', name:'Levator Scapulae (R)', group:'Neck', view:'posterior',
    points:'208,90 214,103 217,118 214,130 207,135 201,130 201,114 204,99' },

  // SHOULDER — POSTERIOR DELTOID
  { id:'deltoid_post_l', name:'Posterior Deltoid (L)', group:'Shoulder', view:'posterior',
    points:'120,196 106,210 93,228 88,248 93,268 108,276 126,270 140,254 145,230 136,212' },
  { id:'deltoid_post_r', name:'Posterior Deltoid (R)', group:'Shoulder', view:'posterior',
    points:'280,196 294,210 307,228 312,248 307,268 292,276 274,270 260,254 255,230 264,212' },

  // ROTATOR CUFF — INFRASPINATUS
  { id:'infraspinatus_l', name:'Infraspinatus (L)', group:'Rotator Cuff', view:'posterior',
    points:'148,192 135,210 130,232 135,254 149,266 166,270 184,264 197,248 198,226 191,204 174,192' },
  { id:'infraspinatus_r', name:'Infraspinatus (R)', group:'Rotator Cuff', view:'posterior',
    points:'252,192 265,210 270,232 265,254 251,266 234,270 216,264 203,248 202,226 209,204 226,192' },

  // ROTATOR CUFF — TERES MAJOR / MINOR
  { id:'teres_l', name:'Teres Major / Minor (L)', group:'Rotator Cuff', view:'posterior',
    points:'133,255 126,272 126,293 134,308 147,312 160,302 163,282 154,262' },
  { id:'teres_r', name:'Teres Major / Minor (R)', group:'Rotator Cuff', view:'posterior',
    points:'267,255 274,272 274,293 266,308 253,312 240,302 237,282 246,262' },

  // UPPER BACK — RHOMBOIDS
  { id:'rhomboids_l', name:'Rhomboids (L)', group:'Upper Back', view:'posterior',
    points:'200,164 191,176 180,195 176,216 179,234 190,240 200,235 200,210 200,184' },
  { id:'rhomboids_r', name:'Rhomboids (R)', group:'Upper Back', view:'posterior',
    points:'200,164 209,176 220,195 224,216 221,234 210,240 200,235 200,210 200,184' },

  // UPPER ARM — TRICEPS BRACHII
  { id:'triceps_l', name:'Triceps Brachii (L)', group:'Upper Arm', view:'posterior',
    points:'114,224 102,240 90,262 82,290 80,320 84,350 95,368 110,372 124,362 133,338 136,306 133,274 122,246' },
  { id:'triceps_r', name:'Triceps Brachii (R)', group:'Upper Arm', view:'posterior',
    points:'286,224 298,240 310,262 318,290 320,320 316,350 305,368 290,372 276,362 267,338 264,306 267,274 278,246' },

  // FOREARM — EXTENSORS
  { id:'forearm_ext_l', name:'Forearm Extensors (L)', group:'Forearm', view:'posterior',
    points:'100,374 86,392 72,412 62,434 60,454 65,466 80,470 94,460 107,440 117,418 120,396' },
  { id:'forearm_ext_r', name:'Forearm Extensors (R)', group:'Forearm', view:'posterior',
    points:'300,374 314,392 328,412 338,434 340,454 335,466 320,470 306,460 293,440 283,418 280,396' },

  // MID/LOWER BACK — LATISSIMUS DORSI
  { id:'lats_l', name:'Latissimus Dorsi (L)', group:'Mid/Lower Back', view:'posterior',
    points:'142,234 130,260 118,292 110,325 108,358 112,388 123,408 140,416 157,412 170,396 175,372 168,340 157,308 148,276 146,250' },
  { id:'lats_r', name:'Latissimus Dorsi (R)', group:'Mid/Lower Back', view:'posterior',
    points:'258,234 270,260 282,292 290,325 292,358 288,388 277,408 260,416 243,412 230,396 225,372 232,340 243,308 252,276 254,250' },

  // LOWER BACK — ERECTOR SPINAE
  { id:'erector_l', name:'Erector Spinae (L)', group:'Lower Back', view:'posterior',
    points:'186,252 181,274 177,305 175,336 175,368 177,398 182,416 192,418 200,410 200,380 200,350 198,318 195,286 191,260' },
  { id:'erector_r', name:'Erector Spinae (R)', group:'Lower Back', view:'posterior',
    points:'214,252 219,274 223,305 225,336 225,368 223,398 218,416 208,418 200,410 200,380 200,350 202,318 205,286 209,260' },

  // LOWER BACK — QUADRATUS LUMBORUM
  { id:'ql_l', name:'Quadratus Lumborum (L)', group:'Lower Back', view:'posterior',
    points:'180,390 172,406 170,426 176,440 187,445 198,437 200,416 196,398' },
  { id:'ql_r', name:'Quadratus Lumborum (R)', group:'Lower Back', view:'posterior',
    points:'220,390 228,406 230,426 224,440 213,445 202,437 200,416 204,398' },

  // GLUTES
  { id:'glut_max_l', name:'Gluteus Maximus (L)', group:'Glutes', view:'posterior',
    points:'158,442 143,460 131,483 128,508 132,536 143,554 160,560 178,556 193,542 200,522 200,494 198,466 188,448 173,442' },
  { id:'glut_max_r', name:'Gluteus Maximus (R)', group:'Glutes', view:'posterior',
    points:'245,442 260,460 272,483 275,508 270,536 260,554 243,560 225,556 210,542 202,522 200,494 202,466 215,448 230,442' },
  { id:'glut_med_l', name:'Gluteus Medius (L)', group:'Glutes', view:'posterior',
    points:'150,413 138,428 132,446 136,464 147,474 161,476 173,465 178,446 174,428 163,415' },
  { id:'glut_med_r', name:'Gluteus Medius (R)', group:'Glutes', view:'posterior',
    points:'253,413 265,428 272,446 268,464 257,474 243,476 230,465 226,446 230,428 241,415' },

  // GLUTES/HIP — PIRIFORMIS
  { id:'piriformis_l', name:'Piriformis (L)', group:'Glutes/Hip', view:'posterior',
    points:'180,478 171,492 171,508 180,518 194,521 202,510 202,492 192,480' },
  { id:'piriformis_r', name:'Piriformis (R)', group:'Glutes/Hip', view:'posterior',
    points:'222,478 232,492 232,508 224,518 210,521 200,510 200,492 210,480' },

  // HAMSTRINGS — BICEPS FEMORIS
  { id:'biceps_fem_l', name:'Biceps Femoris (L)', group:'Hamstrings', view:'posterior',
    points:'160,562 148,583 138,615 130,648 128,678 132,702 143,714 158,716 170,706 177,679 176,648 170,616 162,584' },
  { id:'biceps_fem_r', name:'Biceps Femoris (R)', group:'Hamstrings', view:'posterior',
    points:'243,562 255,583 265,615 272,648 275,678 270,702 260,714 245,716 234,706 226,679 226,648 232,616 242,584' },

  // HAMSTRINGS — SEMIMEMBRANOSUS / SEMITENDINOSUS
  { id:'semimem_l', name:'Semimembranosus / Semitendinosus (L)', group:'Hamstrings', view:'posterior',
    points:'195,562 184,584 177,616 173,648 173,678 177,704 188,716 202,718 212,707 214,678 212,646 207,614 200,582' },
  { id:'semimem_r', name:'Semimembranosus / Semitendinosus (R)', group:'Hamstrings', view:'posterior',
    points:'208,562 219,584 226,616 230,648 230,678 226,704 218,716 204,718 194,707 190,678 191,646 196,614 204,582' },

  // CALF — GASTROCNEMIUS
  { id:'gastroc_l', name:'Gastrocnemius (L)', group:'Calf', view:'posterior',
    points:'150,718 138,738 130,764 128,792 133,815 143,828 157,832 170,824 177,806 177,778 172,751 160,728' },
  { id:'gastroc_r', name:'Gastrocnemius (R)', group:'Calf', view:'posterior',
    points:'253,718 265,738 273,764 275,792 270,815 260,828 246,832 233,824 226,806 226,778 231,751 242,728' },

  // CALF — SOLEUS
  { id:'soleus_l', name:'Soleus (L)', group:'Calf', view:'posterior',
    points:'157,810 146,828 140,851 142,872 151,881 164,883 174,876 179,858 178,832 168,814' },
  { id:'soleus_r', name:'Soleus (R)', group:'Calf', view:'posterior',
    points:'246,810 258,828 263,851 262,872 253,881 240,883 230,876 224,858 226,832 238,814' },
];

// Convenience lookups
export const ANTERIOR_MUSCLES = MUSCLES.filter(m => m.view === 'anterior');
export const POSTERIOR_MUSCLES = MUSCLES.filter(m => m.view === 'posterior');

// ═══════════════════════════════════════════════════════════════
// Geometry Helpers
// ═══════════════════════════════════════════════════════════════

export const VIEWBOX_WIDTH = 400;
export const MALE_VIEWBOX_HEIGHT = 920;

export function getViewBoxHeight(gender) {
  if (gender === 'male') return 920;
  // Female half image width = 431 (862 / 2)
  return Math.round(1024 / (431 / VIEWBOX_WIDTH));
}

export function scalePointForGender(x, y, gender, vbH) {
  const targetHeight = vbH || getViewBoxHeight(gender);

  if (gender !== 'female') {
    return { x: x, y: y };
  }

  let sx, cx;
  if      (y < 130) { sx = 0.60; cx = 214; }
  else if (y < 220) { sx = 0.69; cx = 215; }
  else if (y < 360) { sx = 0.80; cx = 215; }
  else if (y < 470) { sx = 0.91; cx = 215; }
  else if (y < 535) { sx = 1.08; cx = 214; }
  else if (y < 680) { sx = 0.86; cx = 215; }
  else if (y < 780) { sx = 0.69; cx = 216; }
  else              { sx = 0.75; cx = 215; }

  return {
    x: Math.round((x - 205) * sx + cx),
    y: Math.round(y * (targetHeight / MALE_VIEWBOX_HEIGHT))
  };
}

export function getPolygonPoints(muscle, gender, vbH) {
  const targetHeight = vbH || getViewBoxHeight(gender);
  return muscle.points.split(' ').map(function(pair) {
    const nums = pair.split(',').map(Number);
    return scalePointForGender(nums[0], nums[1], gender, targetHeight);
  });
}

export function polygonToString(points) {
  return points.map(function(p) {
    return p.x + ',' + p.y;
  }).join(' ');
}

export function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

export function polygonArea(points) {
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j].x * points[i].y) - (points[i].x * points[j].y);
  }
  return Math.abs(area / 2);
}

export function polygonCentroid(points) {
  let x = 0;
  let y = 0;
  let areaFactor = 0;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const cross = (points[j].x * points[i].y) - (points[i].x * points[j].y);
    areaFactor += cross;
    x += (points[j].x + points[i].x) * cross;
    y += (points[j].y + points[i].y) * cross;
  }

  const area = areaFactor / 2;
  if (Math.abs(area) < 1e-9) {
    return {
      x: points.reduce(function(sum, p) { return sum + p.x; }, 0) / points.length,
      y: points.reduce(function(sum, p) { return sum + p.y; }, 0) / points.length
    };
  }

  return {
    x: x / (6 * area),
    y: y / (6 * area)
  };
}

/**
 * Find muscle at given coordinates
 */
export function findMuscleAtPoint(x, y, muscles, gender) {
  let best = null;
  let bestArea = Infinity;

  for (const muscle of muscles) {
    const points = getPolygonPoints(muscle, gender);
    if (pointInPolygon(x, y, points)) {
      const area = polygonArea(points);
      if (area < bestArea) {
        bestArea = area;
        best = muscle;
      }
    }
  }

  return best;
}

/**
 * Get muscle by ID
 */
export function getMuscleById(id) {
  return MUSCLES.find(m => m.id === id);
}

/**
 * Get muscles by view
 */
export function getMusclesByView(view) {
  return view === 'anterior' ? ANTERIOR_MUSCLES : POSTERIOR_MUSCLES;
}
