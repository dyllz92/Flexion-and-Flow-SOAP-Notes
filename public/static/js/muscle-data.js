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
 * Muscle Map Data - CORRECTED ALIGNMENT
 * 
 * Images: 890x1024 (male), 862x1024 (female)
 * Each image: LEFT HALF = anterior, RIGHT HALF = posterior
 * SVG viewBox per half = 445x1024 (male) / 431x1024 (female)
 * Muscles mapped as polygons in the HALF-IMAGE coordinate space
 * 
 * ViewBox: 400x920 for male, scales proportionally for female
 * Body center: x=200, body spans approximately x=90-310 (torso), y=75-900
 * 
 * COORDINATE NOTES:
 * - All Y values shifted UP by ~12-15px to better align with actual muscle image
 * - Polygon shapes refined for better anatomical accuracy
 */
export const MUSCLES = [
  // ─── ANTERIOR ────────────────────────────────────────────────────

  // NECK - Sternocleidomastoid (runs from mastoid to sternum/clavicle)
  { id:'scm_l', name:'Sternocleidomastoid (L)', group:'Neck', view:'anterior',
    points:'180,78 174,88 168,102 165,118 166,132 172,140 180,136 185,122 184,106 182,90' },
  { id:'scm_r', name:'Sternocleidomastoid (R)', group:'Neck', view:'anterior',
    points:'220,78 226,88 232,102 235,118 234,132 228,140 220,136 215,122 216,106 218,90' },

  // SHOULDER — ANTERIOR DELTOID (cap of shoulder, front portion)
  { id:'deltoid_ant_l', name:'Anterior Deltoid (L)', group:'Shoulder', view:'anterior',
    points:'152,136 140,142 126,152 112,164 102,178 98,194 100,210 110,218 124,220 138,214 148,202 152,186 154,168 153,150' },
  { id:'deltoid_ant_r', name:'Anterior Deltoid (R)', group:'Shoulder', view:'anterior',
    points:'248,136 260,142 274,152 288,164 298,178 302,194 300,210 290,218 276,220 262,214 252,202 248,186 246,168 247,150' },

  // CHEST - Pectoralis Major (fan-shaped chest muscle)
  { id:'pec_major_l', name:'Pectoralis Major (L)', group:'Chest', view:'anterior',
    points:'200,156 194,154 180,154 164,158 148,168 134,182 124,200 120,220 124,240 136,256 152,264 170,266 186,260 196,248 200,230 200,210' },
  { id:'pec_major_r', name:'Pectoralis Major (R)', group:'Chest', view:'anterior',
    points:'200,156 206,154 220,154 236,158 252,168 266,182 276,200 280,220 276,240 264,256 248,264 230,266 214,260 204,248 200,230 200,210' },

  // SERRATUS ANTERIOR (finger-like projections on side of ribcage)
  { id:'serratus_l', name:'Serratus Anterior (L)', group:'Core', view:'anterior',
    points:'148,210 140,228 138,250 142,268 152,274 162,266 165,246 160,226 154,212' },
  { id:'serratus_r', name:'Serratus Anterior (R)', group:'Core', view:'anterior',
    points:'252,210 260,228 262,250 258,268 248,274 238,266 235,246 240,226 246,212' },

  // BICEPS BRACHII (front of upper arm)
  { id:'biceps_l', name:'Biceps Brachii (L)', group:'Upper Arm', view:'anterior',
    points:'134,216 122,228 110,248 100,272 94,300 92,330 96,358 106,374 122,376 134,364 142,340 144,308 140,276 134,248' },
  { id:'biceps_r', name:'Biceps Brachii (R)', group:'Upper Arm', view:'anterior',
    points:'266,216 278,228 290,248 300,272 306,300 308,330 304,358 294,374 278,376 266,364 258,340 256,308 260,276 266,248' },

  // FOREARM FLEXORS (inner forearm)
  { id:'forearm_flex_l', name:'Forearm Flexors (L)', group:'Forearm', view:'anterior',
    points:'114,372 100,388 88,410 78,434 72,458 74,476 82,484 98,480 114,464 124,438 130,410 128,386' },
  { id:'forearm_flex_r', name:'Forearm Flexors (R)', group:'Forearm', view:'anterior',
    points:'286,372 300,388 312,410 322,434 328,458 326,476 318,484 302,480 286,464 276,438 270,410 272,386' },

  // CORE — RECTUS ABDOMINIS (six-pack area)
  { id:'rectus_abdominis', name:'Rectus Abdominis', group:'Core', view:'anterior',
    points:'188,262 184,290 182,322 182,356 184,388 188,416 196,432 200,434 204,432 212,416 216,388 218,356 218,322 216,290 212,262 200,258' },

  // CORE — EXTERNAL OBLIQUES (sides of abdomen)
  { id:'oblique_l', name:'External Oblique (L)', group:'Core', view:'anterior',
    points:'184,262 174,278 164,306 156,338 150,370 148,400 152,424 164,432 178,424 182,404 184,374 184,340 184,304 184,274' },
  { id:'oblique_r', name:'External Oblique (R)', group:'Core', view:'anterior',
    points:'216,262 226,278 236,306 244,338 250,370 252,400 248,424 236,432 222,424 218,404 216,374 216,340 216,304 216,274' },

  // HIP — ILIOPSOAS / HIP FLEXOR (deep hip flexor)
  { id:'iliopsoas_l', name:'Iliopsoas / Hip Flexor (L)', group:'Hip', view:'anterior',
    points:'182,438 174,456 170,476 174,494 182,504 194,504 200,494 200,474 194,454 188,440' },
  { id:'iliopsoas_r', name:'Iliopsoas / Hip Flexor (R)', group:'Hip', view:'anterior',
    points:'218,438 226,456 230,476 226,494 218,504 206,504 200,494 200,474 206,454 212,440' },

  // HIP — TENSOR FASCIA LATAE (outer hip)
  { id:'tfl_l', name:'Tensor Fascia Latae (L)', group:'Hip', view:'anterior',
    points:'152,438 142,456 136,478 134,500 138,518 150,524 162,516 166,496 164,474 158,452' },
  { id:'tfl_r', name:'Tensor Fascia Latae (R)', group:'Hip', view:'anterior',
    points:'248,438 258,456 264,478 266,500 262,518 250,524 238,516 234,496 236,474 242,452' },

  // THIGH — QUADRICEPS (front of thigh)
  { id:'quad_l', name:'Quadriceps (L)', group:'Thigh', view:'anterior',
    points:'156,518 144,540 132,572 122,608 118,648 122,682 132,704 150,712 168,706 178,688 182,656 180,620 172,582 162,548 156,528' },
  { id:'quad_r', name:'Quadriceps (R)', group:'Thigh', view:'anterior',
    points:'244,518 256,540 268,572 278,608 282,648 278,682 268,704 250,712 232,706 222,688 218,656 220,620 228,582 238,548 244,528' },

  // THIGH — ADDUCTORS (inner thigh)
  { id:'adductors_l', name:'Adductors (L)', group:'Thigh', view:'anterior',
    points:'186,516 180,538 176,572 174,608 174,644 178,672 188,682 198,676 200,648 200,612 200,576 198,542 192,520' },
  { id:'adductors_r', name:'Adductors (R)', group:'Thigh', view:'anterior',
    points:'214,516 220,538 224,572 226,608 226,644 222,672 212,682 202,676 200,648 200,612 200,576 202,542 208,520' },

  // THIGH — SARTORIUS (diagonal across thigh)
  { id:'sartorius_l', name:'Sartorius (L)', group:'Thigh', view:'anterior',
    points:'160,514 154,540 152,572 154,606 160,644 168,678 176,702 184,700 180,672 172,638 166,600 164,564 166,532 168,516' },
  { id:'sartorius_r', name:'Sartorius (R)', group:'Thigh', view:'anterior',
    points:'240,514 246,540 248,572 246,606 240,644 232,678 224,702 216,700 220,672 228,638 234,600 236,564 234,532 232,516' },

  // LOWER LEG — TIBIALIS ANTERIOR (shin muscle)
  { id:'tibialis_ant_l', name:'Tibialis Anterior (L)', group:'Lower Leg', view:'anterior',
    points:'166,714 158,736 152,764 150,796 154,826 164,844 176,846 188,836 192,812 188,778 180,746 172,724' },
  { id:'tibialis_ant_r', name:'Tibialis Anterior (R)', group:'Lower Leg', view:'anterior',
    points:'234,714 242,736 248,764 250,796 246,826 236,844 224,846 212,836 208,812 212,778 220,746 228,724' },

  // LOWER LEG — PERONEALS (outer lower leg)
  { id:'peroneals_l', name:'Peroneals (L)', group:'Lower Leg', view:'anterior',
    points:'148,720 140,744 136,774 138,804 144,828 154,834 162,824 162,794 158,762 152,736' },
  { id:'peroneals_r', name:'Peroneals (R)', group:'Lower Leg', view:'anterior',
    points:'252,720 260,744 264,774 262,804 256,828 246,834 238,824 238,794 242,762 248,736' },

  // ─── POSTERIOR ────────────────────────────────────────────────────

  // NECK — UPPER TRAPEZIUS (upper back to neck)
  { id:'upper_trap_l', name:'Upper Trapezius (L)', group:'Neck/Shoulder', view:'posterior',
    points:'200,76 190,88 176,108 158,132 140,156 122,180 110,202 106,224 116,232 138,228 162,216 184,198 198,176 200,150' },
  { id:'upper_trap_r', name:'Upper Trapezius (R)', group:'Neck/Shoulder', view:'posterior',
    points:'200,76 210,88 224,108 242,132 260,156 278,180 290,202 294,224 284,232 262,228 238,216 216,198 202,176 200,150' },

  // NECK — LEVATOR SCAPULAE (neck to scapula)
  { id:'levator_scap_l', name:'Levator Scapulae (L)', group:'Neck', view:'posterior',
    points:'192,76 184,92 180,110 184,124 192,130 200,124 200,106 196,88' },
  { id:'levator_scap_r', name:'Levator Scapulae (R)', group:'Neck', view:'posterior',
    points:'208,76 216,92 220,110 216,124 208,130 200,124 200,106 204,88' },

  // SHOULDER — POSTERIOR DELTOID (back of shoulder cap)
  { id:'deltoid_post_l', name:'Posterior Deltoid (L)', group:'Shoulder', view:'posterior',
    points:'118,188 104,204 92,226 88,248 94,270 110,278 130,270 144,252 148,228 138,206' },
  { id:'deltoid_post_r', name:'Posterior Deltoid (R)', group:'Shoulder', view:'posterior',
    points:'282,188 296,204 308,226 312,248 306,270 290,278 270,270 256,252 252,228 262,206' },

  // ROTATOR CUFF — INFRASPINATUS (below spine of scapula)
  { id:'infraspinatus_l', name:'Infraspinatus (L)', group:'Rotator Cuff', view:'posterior',
    points:'148,180 134,200 128,224 134,250 150,264 168,268 188,260 200,242 200,218 192,194 174,180' },
  { id:'infraspinatus_r', name:'Infraspinatus (R)', group:'Rotator Cuff', view:'posterior',
    points:'252,180 266,200 272,224 266,250 250,264 232,268 212,260 200,242 200,218 208,194 226,180' },

  // ROTATOR CUFF — TERES MAJOR / MINOR (lateral scapula)
  { id:'teres_l', name:'Teres Major / Minor (L)', group:'Rotator Cuff', view:'posterior',
    points:'132,250 124,268 124,292 134,308 150,312 164,300 168,278 156,256' },
  { id:'teres_r', name:'Teres Major / Minor (R)', group:'Rotator Cuff', view:'posterior',
    points:'268,250 276,268 276,292 266,308 250,312 236,300 232,278 244,256' },

  // UPPER BACK — RHOMBOIDS (between spine and scapula)
  { id:'rhomboids_l', name:'Rhomboids (L)', group:'Upper Back', view:'posterior',
    points:'200,152 190,166 178,188 174,212 178,232 190,240 200,234 200,206 200,176' },
  { id:'rhomboids_r', name:'Rhomboids (R)', group:'Upper Back', view:'posterior',
    points:'200,152 210,166 222,188 226,212 222,232 210,240 200,234 200,206 200,176' },

  // UPPER ARM — TRICEPS BRACHII (back of upper arm)
  { id:'triceps_l', name:'Triceps Brachii (L)', group:'Upper Arm', view:'posterior',
    points:'112,220 100,238 88,264 80,296 78,330 84,362 96,380 114,382 130,370 140,342 142,306 138,270 124,242' },
  { id:'triceps_r', name:'Triceps Brachii (R)', group:'Upper Arm', view:'posterior',
    points:'288,220 300,238 312,264 320,296 322,330 316,362 304,380 286,382 270,370 260,342 258,306 262,270 276,242' },

  // FOREARM — EXTENSORS (outer forearm)
  { id:'forearm_ext_l', name:'Forearm Extensors (L)', group:'Forearm', view:'posterior',
    points:'98,380 84,400 70,424 60,452 58,478 66,492 84,494 102,480 118,454 128,424 128,398' },
  { id:'forearm_ext_r', name:'Forearm Extensors (R)', group:'Forearm', view:'posterior',
    points:'302,380 316,400 330,424 340,452 342,478 334,492 316,494 298,480 282,454 272,424 272,398' },

  // MID/LOWER BACK — LATISSIMUS DORSI (large back muscle)
  { id:'lats_l', name:'Latissimus Dorsi (L)', group:'Mid/Lower Back', view:'posterior',
    points:'142,228 128,258 116,296 108,336 106,376 112,410 126,432 146,438 166,430 180,408 186,374 178,336 166,298 154,264 148,240' },
  { id:'lats_r', name:'Latissimus Dorsi (R)', group:'Mid/Lower Back', view:'posterior',
    points:'258,228 272,258 284,296 292,336 294,376 288,410 274,432 254,438 234,430 220,408 214,374 222,336 234,298 246,264 252,240' },

  // LOWER BACK — ERECTOR SPINAE (spinal muscles)
  { id:'erector_l', name:'Erector Spinae (L)', group:'Lower Back', view:'posterior',
    points:'186,244 180,270 176,304 174,342 174,382 178,416 184,436 196,438 200,426 200,390 200,352 198,314 194,276 190,252' },
  { id:'erector_r', name:'Erector Spinae (R)', group:'Lower Back', view:'posterior',
    points:'214,244 220,270 224,304 226,342 226,382 222,416 216,436 204,438 200,426 200,390 200,352 202,314 206,276 210,252' },

  // LOWER BACK — QUADRATUS LUMBORUM (deep lower back)
  { id:'ql_l', name:'Quadratus Lumborum (L)', group:'Lower Back', view:'posterior',
    points:'180,402 172,420 170,444 176,460 190,466 200,456 200,432 196,414' },
  { id:'ql_r', name:'Quadratus Lumborum (R)', group:'Lower Back', view:'posterior',
    points:'220,402 228,420 230,444 224,460 210,466 200,456 200,432 204,414' },

  // GLUTES - Gluteus Maximus (main buttock muscle)
  { id:'glut_max_l', name:'Gluteus Maximus (L)', group:'Glutes', view:'posterior',
    points:'156,460 140,482 128,510 124,542 130,574 144,596 164,602 186,596 200,576 200,544 198,510 190,480 174,462' },
  { id:'glut_max_r', name:'Gluteus Maximus (R)', group:'Glutes', view:'posterior',
    points:'244,460 260,482 272,510 276,542 270,574 256,596 236,602 214,596 200,576 200,544 202,510 210,480 226,462' },
  
  // GLUTES - Gluteus Medius (upper outer glute)
  { id:'glut_med_l', name:'Gluteus Medius (L)', group:'Glutes', view:'posterior',
    points:'150,430 136,448 130,470 136,492 150,502 168,502 182,488 186,468 180,448 166,432' },
  { id:'glut_med_r', name:'Gluteus Medius (R)', group:'Glutes', view:'posterior',
    points:'250,430 264,448 270,470 264,492 250,502 232,502 218,488 214,468 220,448 234,432' },

  // GLUTES/HIP — PIRIFORMIS (deep hip rotator)
  { id:'piriformis_l', name:'Piriformis (L)', group:'Glutes/Hip', view:'posterior',
    points:'180,500 170,518 170,540 180,552 196,556 204,542 204,520 194,504' },
  { id:'piriformis_r', name:'Piriformis (R)', group:'Glutes/Hip', view:'posterior',
    points:'220,500 230,518 230,540 220,552 204,556 196,542 196,520 206,504' },

  // HAMSTRINGS — BICEPS FEMORIS (outer hamstring)
  { id:'biceps_fem_l', name:'Biceps Femoris (L)', group:'Hamstrings', view:'posterior',
    points:'158,598 144,624 134,662 126,702 124,740 130,770 144,784 162,784 176,770 184,738 182,700 174,660 164,622' },
  { id:'biceps_fem_r', name:'Biceps Femoris (R)', group:'Hamstrings', view:'posterior',
    points:'242,598 256,624 266,662 274,702 276,740 270,770 256,784 238,784 224,770 216,738 218,700 226,660 236,622' },

  // HAMSTRINGS — SEMIMEMBRANOSUS / SEMITENDINOSUS (inner hamstrings)
  { id:'semimem_l', name:'Semimembranosus / Semitendinosus (L)', group:'Hamstrings', view:'posterior',
    points:'194,598 182,622 174,660 170,700 170,740 176,770 190,784 206,786 218,772 220,740 218,698 212,658 204,620' },
  { id:'semimem_r', name:'Semimembranosus / Semitendinosus (R)', group:'Hamstrings', view:'posterior',
    points:'206,598 218,622 226,660 230,700 230,740 224,770 210,784 194,786 182,772 180,740 182,698 188,658 196,620' },

  // CALF — GASTROCNEMIUS (main calf muscle)
  { id:'gastroc_l', name:'Gastrocnemius (L)', group:'Calf', view:'posterior',
    points:'148,784 134,808 126,840 124,876 132,904 146,920 164,922 180,912 188,888 188,852 180,818 166,794' },
  { id:'gastroc_r', name:'Gastrocnemius (R)', group:'Calf', view:'posterior',
    points:'252,784 266,808 274,840 276,876 268,904 254,920 236,922 220,912 212,888 212,852 220,818 234,794' },

  // CALF — SOLEUS (deep calf, below gastrocnemius)
  { id:'soleus_l', name:'Soleus (L)', group:'Calf', view:'posterior',
    points:'158,900 146,920 140,948 144,974 156,986 172,988 186,978 192,954 190,924 176,904' },
  { id:'soleus_r', name:'Soleus (R)', group:'Calf', view:'posterior',
    points:'242,900 254,920 260,948 256,974 244,986 228,988 214,978 208,954 210,924 224,904' },
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

  // Female body proportions differ by region
  // Scale X coordinates toward the center, scale Y proportionally
  let sx, cx;
  if      (y < 130) { sx = 0.60; cx = 214; }
  else if (y < 220) { sx = 0.69; cx = 215; }
  else if (y < 360) { sx = 0.80; cx = 215; }
  else if (y < 470) { sx = 0.91; cx = 215; }
  else if (y < 535) { sx = 1.08; cx = 214; } // hips wider
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
