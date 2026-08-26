import { CatalogCategory, CatalogTaskTemplate, UnitTaskTemplate } from '../types';
import { detectAttentionIndicators } from '../services/attention';

export const ALBERTA_STARTER_CATEGORIES: CatalogCategory[] = [
  { id: 'cat-am-care', name: 'AM Care', description: 'Morning routines, hygiene, dressing and preparation', displayOrder: 1 },
  { id: 'cat-pm-care', name: 'PM Care', description: 'Afternoon and evening personal care, hydration and comfort', displayOrder: 2 },
  { id: 'cat-hs-care', name: 'HS Care', description: 'Bedtime / Hour of Sleep routines, nightwear, toileting, settling and safety', displayOrder: 3 },
  { id: 'cat-bathing', name: 'Bathing', description: 'Showers, tub baths, bed baths and hygiene', displayOrder: 4 },
  { id: 'cat-med-assist', name: 'Medication Assistance', description: 'TaskSheet MAP1, MAP2, and MAP3 supportive procedures', displayOrder: 5 },
  { id: 'cat-nutrition', name: 'Nutrition & Hydration', description: 'Meal assistance, hydration rounds and feeding support', displayOrder: 6 },
  { id: 'cat-continence', name: 'Continence & Toileting', description: 'Toileting assistance, brief changes and drainage observation', displayOrder: 7 },
  { id: 'cat-mobility', name: 'Mobility & Transfers', description: 'Transfers, mechanical lifts, ambulation and positioning', displayOrder: 8 },
  { id: 'cat-positioning-skin', name: 'Positioning & Skin Care', description: 'Repositioning, pressure relief, barrier creams and observation', displayOrder: 9 },
  { id: 'cat-health-monitoring', name: 'Health Monitoring', description: 'Vital signs, clinical assessments and observation', displayOrder: 10 },
  { id: 'cat-diabetes', name: 'Diabetes Care', description: 'Glucose monitoring, insulin and glycemic follow-up', displayOrder: 11 },
  { id: 'cat-med-treatment', name: 'Medication / Treatment', description: 'Nursing medication administration and clinical treatments', displayOrder: 12 },
  { id: 'cat-injection', name: 'Injection', description: 'Scheduled subcutaneous and intramuscular injections', displayOrder: 13 },
  { id: 'cat-wound-care', name: 'Wound Care', description: 'Dressing changes, wound treatments and assessments', displayOrder: 14 },
  { id: 'cat-catheter-urinary', name: 'Catheter / Urinary Care', description: 'Catheter assessment, site care and urinary procedures', displayOrder: 15 },
  { id: 'cat-ostomy', name: 'Ostomy Care', description: 'Ostomy assessment, appliance changes and skin care', displayOrder: 16 },
  { id: 'cat-respiratory', name: 'Respiratory Care', description: 'Oxygen therapy, nebulizers, CPAP and respiratory monitoring', displayOrder: 17 },
  { id: 'cat-lab-specimen', name: 'Lab / Specimen', description: 'Specimen collection, swabs and lab follow-ups', displayOrder: 18 },
  { id: 'cat-pain-symptom', name: 'Pain / Symptom Management', description: 'Pain evaluation, symptom follow-up and comfort care', displayOrder: 19 },
  { id: 'cat-clinical-followup', name: 'Clinical Follow-up', description: 'Post-fall reviews, provider orders, physician notifications', displayOrder: 20 },
  { id: 'cat-safety-obs', name: 'Safety & Observation', description: 'Safety rounds, falls prevention and condition reporting', displayOrder: 21 },
  { id: 'cat-overnight', name: 'Overnight Care', description: 'Night rounds, overnight continence and sleep support', displayOrder: 22 },
  { id: 'cat-palliative', name: 'Palliative / Comfort Care', description: 'Comfort measures, mouth care and end-of-life support', displayOrder: 23 },
  { id: 'cat-education', name: 'Resident / Family Education', description: 'Teaching, clinical reinforcement and family guidance', displayOrder: 24 },
  { id: 'cat-other', name: 'Other', description: 'Facility-defined and custom care assignments', displayOrder: 25 }
];

const RAW_ALBERTA_TASK_TEMPLATES: CatalogTaskTemplate[] = [
  // ==========================================
  // 1. HCA — AM CARE
  // ==========================================
  {
    slug: 'hca.am.morning_care',
    title: 'Morning Personal Care',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with face/hands wash, oral care, hair grooming, and dressing.',
    synonyms: ['am care', 'morning routine', 'grooming', 'wash'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.am_care_complete',
    title: 'AM Care — Complete',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Complete full morning routine: wash, teeth/dentures, dressing, toileting, and bed prep.',
    synonyms: ['am complete', 'complete am care', 'morning full'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.morning_washup',
    title: 'Morning Wash-Up',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0745',
    defaultFrequency: 'daily',
    defaultInstructions: 'Provide warm water and assist with face and hand washing.',
    synonyms: ['washup', 'face wash', 'hands'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.face_hand_care',
    title: 'Face / Hand Care',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist resident to wash face and hands.',
    synonyms: ['face', 'hands', 'hygiene'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.oral_care',
    title: 'Oral Care',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0815',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with toothbrushing and oral rinse.',
    synonyms: ['teeth', 'brush teeth', 'mouth care'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.denture_care',
    title: 'Denture Care',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0815',
    defaultFrequency: 'daily',
    defaultInstructions: 'Clean dentures with designated brush and place for resident.',
    synonyms: ['dentures', 'teeth', 'false teeth'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.hair_grooming',
    title: 'Hair / Grooming',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0820',
    defaultFrequency: 'daily',
    defaultInstructions: 'Brush/comb hair per resident preference.',
    synonyms: ['hair', 'comb', 'brush'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.shaving_assist',
    title: 'Shaving Assistance',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with electric razor shaving as planned.',
    synonyms: ['shave', 'razor', 'beard'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.dressing_assist',
    title: 'Dressing Assistance',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with selecting and putting on clean daytime clothing and appropriate footwear.',
    synonyms: ['dress', 'clothes', 'dressing'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.morning_toileting',
    title: 'Morning Toileting',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0730',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist to toilet upon waking.',
    synonyms: ['toilet', 'bathroom', 'urinate'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.morning_continence',
    title: 'Morning Continence Care',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0745',
    defaultFrequency: 'daily',
    defaultInstructions: 'Check and replace continence product, provide peri wash and barrier cream.',
    synonyms: ['brief change', 'pad', 'incontinence'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.routine_skincare',
    title: 'Apply Routine Skin Care / Moisturizer as Care Planned',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0815',
    defaultFrequency: 'daily',
    defaultInstructions: 'Apply care-planned moisturizing lotion to intact skin.',
    synonyms: ['lotion', 'moisturizer', 'cream'],
    carePlanDependent: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.make_bed',
    title: 'Make / Straighten Bed',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0845',
    defaultFrequency: 'daily',
    defaultInstructions: 'Straighten bed linens and ensure clean pillowcase.',
    synonyms: ['bed', 'linens'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.comfort_check',
    title: 'Morning Comfort Check',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Ensure resident is comfortable and positioned properly.',
    synonyms: ['comfort', 'check'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.safety_check',
    title: 'Morning Safety Check',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Verify call bell within reach, brakes locked, clear pathway.',
    synonyms: ['safety', 'call bell'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.am.prep_breakfast',
    title: 'Prepare Resident for Breakfast',
    categoryId: 'cat-am-care',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with hand hygiene, upright positioning, and eyeglasses/dentures.',
    synonyms: ['breakfast prep', 'meal prep'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 2. HCA — PM CARE (Afternoon & Evening)
  // ==========================================
  {
    slug: 'hca.pm.evening_care',
    title: 'Evening Personal Care',
    categoryId: 'cat-pm-care',
    roleCode: 'HCA',
    defaultTime: '1730',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with afternoon/dinner preparation, face wash, and comfort.',
    synonyms: ['pm care', 'evening routine', 'afternoon care'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.pm.pm_care_complete',
    title: 'PM Care — Complete',
    categoryId: 'cat-pm-care',
    roleCode: 'HCA',
    defaultTime: '1800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Complete evening routines: wash, oral care, dinnertime assist, and comfort check.',
    synonyms: ['pm complete', 'complete pm care'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.pm.evening_washup',
    title: 'Evening Wash-Up',
    categoryId: 'cat-pm-care',
    roleCode: 'HCA',
    defaultTime: '1815',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with evening face and hand wash before/after dinner.',
    synonyms: ['pm wash', 'evening wash'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 3. HCA — HS CARE (Hour of Sleep / Bedtime)
  // ==========================================
  {
    slug: 'hca.hs.hs_care_complete',
    title: 'HS Care — Complete',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '2000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Complete full bedtime routine: wash, teeth/dentures, undress to nightwear, toileting/brief, repositioning, and call bell safety.',
    synonyms: ['hs care', 'hs complete', 'bedtime care', 'hs', 'hour of sleep', 'bedtime routine'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.hs_personal_care',
    title: 'HS Personal Care',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '2000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with bedtime face wash, oral/denture care, changing into nightwear, and toileting.',
    synonyms: ['hs routine', 'bedtime personal care', 'hs wash', 'bedtime'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.hs_washup',
    title: 'HS Wash-Up',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '1945',
    defaultFrequency: 'daily',
    defaultInstructions: 'Provide warm water and washcloth for bedtime face and hand washing.',
    synonyms: ['bedtime wash', 'hs wash up'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.hs_oral_care',
    title: 'HS Oral / Denture Care',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '2000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with bedtime tooth brushing or soaking dentures in labeled container.',
    synonyms: ['hs teeth', 'bedtime dentures', 'hs oral'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.hs_toileting',
    title: 'HS Toileting Before Bed',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '2000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Offer toileting assist before settling resident for sleep.',
    synonyms: ['bedtime toilet', 'hs toilet', 'hs bathroom'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.hs_continence',
    title: 'HS Continence Care & Night Brief Change',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '2015',
    defaultFrequency: 'daily',
    defaultInstructions: 'Check and apply overnight continence product; apply barrier cream per care plan.',
    synonyms: ['hs brief', 'night pad', 'overnight brief'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.hs_nightwear',
    title: 'HS Undressing / Nightwear Assistance',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '1945',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist resident to remove daytime clothing and put on clean nightwear.',
    synonyms: ['pajamas', 'nightwear', 'undress for bed', 'nightgown'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.hs_bed_prep',
    title: 'HS Bed Preparation & Repositioning',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '2015',
    defaultFrequency: 'daily',
    defaultInstructions: 'Position resident comfortably in bed with pillows and offload heels/pressure points.',
    synonyms: ['tuck in', 'bed prep', 'settle for sleep'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.ensure_call_bell',
    title: 'Ensure Call Bell Within Reach',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '2030',
    defaultFrequency: 'daily',
    defaultInstructions: 'Place call bell within easy hand reach; verify bed in lowest position and brakes locked.',
    synonyms: ['call bell', 'night safety', 'bed safety'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.hs_snack_hydration',
    title: 'HS Snack & Hydration Offer',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '1930',
    defaultFrequency: 'daily',
    defaultInstructions: 'Offer bedtime snack, warm milk/tea, or water as care planned.',
    synonyms: ['bedtime snack', 'hs snack', 'hs drink'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.hs.hs_skin_obs',
    title: 'HS Skin Observation',
    categoryId: 'cat-hs-care',
    roleCode: 'HCA',
    defaultTime: '2000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Observe skin and pressure points during bedtime care; report concerns to nurse.',
    synonyms: ['bedtime skin', 'hs skin check'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 4. HCA — BATHING
  // ==========================================
  {
    slug: 'hca.bathing.shower_assistance',
    title: 'Shower Assistance',
    categoryId: 'cat-bathing',
    roleCode: 'HCA',
    defaultTime: '0930',
    defaultFrequency: 'selected_days',
    defaultInstructions: 'Provide shower assist per care plan using shower chair and non-slip footwear.',
    synonyms: ['shower', 'bath', 'wash'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.bathing.tub_bath',
    title: 'Tub Bath Assistance',
    categoryId: 'cat-bathing',
    roleCode: 'HCA',
    defaultTime: '1000',
    defaultFrequency: 'weekly',
    defaultInstructions: 'Assist with mechanical tub bath per care plan.',
    synonyms: ['tub bath', 'soak'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.bathing.bed_bath',
    title: 'Bed Bath',
    categoryId: 'cat-bathing',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Complete bed bath with skin inspection; apply barrier cream as care planned.',
    synonyms: ['sponge bath', 'complete bed bath'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.bathing.partial_bath',
    title: 'Partial Bath',
    categoryId: 'cat-bathing',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with washing face, hands, axillae, and perineum.',
    synonyms: ['partial', 'wash'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.bathing.hair_wash',
    title: 'Hair Wash',
    categoryId: 'cat-bathing',
    roleCode: 'HCA',
    defaultTime: '1000',
    defaultFrequency: 'selected_days',
    defaultInstructions: 'Shampoo and rinse hair during bath or shower.',
    synonyms: ['shampoo', 'hair wash'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.bathing.skin_observation',
    title: 'Bathing Skin Observation',
    categoryId: 'cat-bathing',
    roleCode: 'HCA',
    defaultTime: '0945',
    defaultFrequency: 'selected_days',
    defaultInstructions: 'Observe skin integrity during bathing and report any concerns to nurse.',
    synonyms: ['bath skin', 'skin observation'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 5. HCA — MEDICATION ASSISTANCE (MAP1, MAP2, MAP3)
  // ==========================================
  {
    slug: 'hca.medication.map1',
    title: 'MAP1 — Medication Reminder',
    categoryId: 'cat-med-assist',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Reminder only. Resident performs medication activity independently after being reminded.',
    description: 'Reminder only. Resident performs medication activity independently after being reminded.',
    synonyms: ['map1', 'map 1', 'medication reminder', 'reminder', 'map'],
    carePlanDependent: true,
    authorizationDependent: true,
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.medication.map2',
    title: 'MAP2 — Partial Medication Assistance',
    categoryId: 'cat-med-assist',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Partial assistance. Resident participates but requires some assistance according to their care plan.',
    description: 'Partial assistance. Resident participates but requires some assistance according to their care plan.',
    synonyms: ['map2', 'map 2', 'partial med assist', 'blister pack', 'map'],
    carePlanDependent: true,
    authorizationDependent: true,
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.medication.map3',
    title: 'MAP3 — Full Medication Assistance',
    categoryId: 'cat-med-assist',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Full assistance. Resident requires full medication assistance according to their care plan and facility-authorized workflow.',
    description: 'Full assistance. Resident requires full medication assistance according to their care plan and facility-authorized workflow.',
    synonyms: ['map3', 'map 3', 'full med assist', 'medication assist', 'map'],
    carePlanDependent: true,
    authorizationDependent: true,
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.medication.refusal',
    title: 'Report Medication Refusal',
    categoryId: 'cat-med-assist',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Promptly inform nurse if resident declines or refuses medication assistance.',
    synonyms: ['refusal', 'med refusal', 'declined'],
    carePlanDependent: true,
    authorizationDependent: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.medication.followup',
    title: 'Medication Assistance Follow-up',
    categoryId: 'cat-med-assist',
    roleCode: 'HCA',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Follow up on resident hydration after medication assistance.',
    synonyms: ['med follow-up'],
    carePlanDependent: true,
    authorizationDependent: true,
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 6. HCA — NUTRITION & HYDRATION
  // ==========================================
  {
    slug: 'hca.nutrition.meal_setup',
    title: 'Meal Setup',
    categoryId: 'cat-nutrition',
    roleCode: 'HCA',
    defaultTime: '0815',
    defaultFrequency: 'daily',
    defaultInstructions: 'Set up tray, open packages, position cutlery and condiments.',
    synonyms: ['tray setup', 'open cartons'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.nutrition.meal_assist',
    title: 'Meal Assistance',
    categoryId: 'cat-nutrition',
    roleCode: 'HCA',
    defaultTime: '0815',
    defaultFrequency: 'daily',
    defaultInstructions: 'Provide meal assistance and cueing per care plan.',
    synonyms: ['feed', 'eating', 'meal'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.nutrition.feeding_assist',
    title: 'Feeding Assistance',
    categoryId: 'cat-nutrition',
    roleCode: 'HCA',
    defaultTime: '1200',
    defaultFrequency: 'daily',
    defaultInstructions: 'Full feeding assistance according to texture modification plan.',
    synonyms: ['feeding', 'spoon feed'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.nutrition.hydration_round',
    title: 'Hydration Round',
    categoryId: 'cat-nutrition',
    roleCode: 'HCA',
    defaultTime: '1030',
    defaultFrequency: 'daily',
    defaultInstructions: 'Offer fresh fluids and encourage at least 150ml intake.',
    synonyms: ['water', 'fluids', 'drinks', 'hydration'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.nutrition.encourage_fluids',
    title: 'Encourage Fluids',
    categoryId: 'cat-nutrition',
    roleCode: 'HCA',
    defaultTime: '1430',
    defaultFrequency: 'daily',
    defaultInstructions: 'Offer preferred beverages (juice, water, tea) and encourage regular sips.',
    synonyms: ['fluids', 'water', 'hydration'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.nutrition.record_intake',
    title: 'Record / Observe Meal Intake',
    categoryId: 'cat-nutrition',
    roleCode: 'HCA',
    defaultTime: '1300',
    defaultFrequency: 'daily',
    defaultInstructions: 'Observe percentage of meal consumed (e.g. 75%) and report poor intake.',
    synonyms: ['meal intake', 'food intake', 'intake'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 7. HCA — CONTINENCE & TOILETING
  // ==========================================
  {
    slug: 'hca.continence.toileting_assist',
    title: 'Toileting Assistance',
    categoryId: 'cat-continence',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Provide scheduled toileting assist; report changes in bowel/urinary patterns.',
    synonyms: ['toilet', 'bathroom', 'commode'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.continence.scheduled_toileting',
    title: 'Scheduled Toileting',
    categoryId: 'cat-continence',
    roleCode: 'HCA',
    defaultTime: '1000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Take resident to toilet per scheduled continence routine.',
    synonyms: ['routine toilet', 'toilet schedule'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.continence.brief_change',
    title: 'Brief / Incontinence Product Change',
    categoryId: 'cat-continence',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Check and replace continence product; provide peri care and barrier cream.',
    synonyms: ['brief', 'pad change', 'incontinence product'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.continence.catheter_bag_empty',
    title: 'Catheter Bag Emptying',
    categoryId: 'cat-continence',
    roleCode: 'HCA',
    defaultTime: '1400',
    defaultFrequency: 'daily',
    defaultInstructions: 'Empty urinary drainage bag, record volume, note color.',
    synonyms: ['empty foley', 'catheter bag'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.continence.catheter_obs',
    title: 'Catheter Drainage Observation',
    categoryId: 'cat-continence',
    roleCode: 'HCA',
    defaultTime: '1000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Observe catheter tubing for kinks or sediment; report reduced output to nurse.',
    synonyms: ['catheter observation', 'foley check'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 8. HCA — MOBILITY & TRANSFERS
  // ==========================================
  {
    slug: 'hca.mobility.transfer_supervision',
    title: 'Transfer — Supervision',
    categoryId: 'cat-mobility',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Standby assist/supervision during transfer per care plan.',
    synonyms: ['standby', 'supervise transfer'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.mobility.transfer_one_person',
    title: 'Transfer — One-Person Assist',
    categoryId: 'cat-mobility',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: '1-person assist with transfer belt per care plan.',
    synonyms: ['1 person assist', 'transfer belt'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.mobility.transfer_two_person',
    title: 'Transfer — Two-Person Assist',
    categoryId: 'cat-mobility',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Strictly 2 staff members required for safe transfer.',
    synonyms: ['2 person transfer', 'two person'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.mobility.mechanical_lift',
    title: 'Transfer — Mechanical Lift',
    categoryId: 'cat-mobility',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Use ceiling track or Hoyer lift with 2 staff members. Check sling size.',
    synonyms: ['hoyer', 'ceiling lift', 'mechanical lift'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.mobility.ambulation_assist',
    title: 'Ambulation Assistance',
    categoryId: 'cat-mobility',
    roleCode: 'HCA',
    defaultTime: '1030',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with walking in hallway using rollator walker.',
    synonyms: ['walk', 'ambulate', 'walking'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.mobility.wheelchair_assist',
    title: 'Wheelchair Mobility Assistance',
    categoryId: 'cat-mobility',
    roleCode: 'HCA',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist resident with wheelchair propulsion and positioning.',
    synonyms: ['wheelchair', 'porter'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 9. HCA — POSITIONING & SKIN CARE
  // ==========================================
  {
    slug: 'hca.positioning.reposition_bed',
    title: 'Reposition in Bed',
    categoryId: 'cat-positioning-skin',
    roleCode: 'HCA',
    defaultTime: '1000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Turn and reposition resident to relieve pressure points.',
    synonyms: ['reposition', 'turn', 'q2h turn'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.positioning.pressure_relief',
    title: 'Pressure-Relief Positioning',
    categoryId: 'cat-positioning-skin',
    roleCode: 'HCA',
    defaultTime: '1400',
    defaultFrequency: 'daily',
    defaultInstructions: 'Reposition in wheelchair, tilt-in-space, or bed for offloading.',
    synonyms: ['pressure relief', 'offload'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.positioning.heel_offloading',
    title: 'Heel Offloading',
    categoryId: 'cat-positioning-skin',
    roleCode: 'HCA',
    defaultTime: '1300',
    defaultFrequency: 'daily',
    defaultInstructions: 'Ensure heel boots applied or pillows placed under calves to float heels.',
    synonyms: ['heels', 'heel boots'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.positioning.skin_observation',
    title: 'Skin Observation During Care',
    categoryId: 'cat-positioning-skin',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Observe skin during hygiene; report redness or breakdown immediately to nurse.',
    synonyms: ['skin observation', 'skin check'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.positioning.report_redness',
    title: 'Report Redness / Skin Breakdown',
    categoryId: 'cat-positioning-skin',
    roleCode: 'HCA',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Notify LPN/RN of any new redness, rash, or skin tear.',
    synonyms: ['redness', 'breakdown', 'skin tear'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.positioning.barrier_cream',
    title: 'Routine Barrier Cream as Care Planned',
    categoryId: 'cat-positioning-skin',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Apply care-planned barrier cream to perineal area after cleansing.',
    synonyms: ['barrier cream', 'zinc', 'cavilon'],
    carePlanDependent: true,
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 10. HCA — HEALTH MONITORING (Observation Oriented)
  // ==========================================
  {
    slug: 'hca.monitoring.weekly_weight',
    title: 'Weekly Weight',
    categoryId: 'cat-health-monitoring',
    roleCode: 'HCA',
    defaultTime: '0730',
    defaultFrequency: 'weekly',
    defaultInstructions: 'Weigh resident before breakfast using calibrated chair/wheelchair scale.',
    synonyms: ['weight', 'scale', 'weigh'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.monitoring.monthly_weight',
    title: 'Monthly Weight',
    categoryId: 'cat-health-monitoring',
    roleCode: 'HCA',
    defaultTime: '0730',
    defaultFrequency: 'monthly',
    defaultInstructions: 'Obtain monthly weight and record.',
    synonyms: ['monthly weight'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.monitoring.general_obs',
    title: 'General Condition Observation',
    categoryId: 'cat-health-monitoring',
    roleCode: 'HCA',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Observe general wellness, energy, and alertness; report changes to nurse.',
    synonyms: ['general observation', 'condition'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.monitoring.pain_behaviour_obs',
    title: 'Pain Behaviour Observation',
    categoryId: 'cat-health-monitoring',
    roleCode: 'HCA',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Observe for grimacing, guarding, vocalizations, or restlessness; notify nurse.',
    synonyms: ['pain observation', 'grimacing', 'pain behaviour'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.monitoring.report_change',
    title: 'Report Change in Condition',
    categoryId: 'cat-health-monitoring',
    roleCode: 'HCA',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Promptly inform nurse of any noticeable decline or unusual symptoms.',
    synonyms: ['change in condition', 'report'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 11. HCA — SAFETY & OBSERVATION
  // ==========================================
  {
    slug: 'hca.safety.safety_round',
    title: 'Safety Round',
    categoryId: 'cat-safety-obs',
    roleCode: 'HCA',
    defaultTime: '1100',
    defaultFrequency: 'daily',
    defaultInstructions: 'Check environment, call bell within reach, brakes locked, pathways clear.',
    synonyms: ['safety round', 'safety check'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.safety.comfort_round',
    title: 'Comfort Round',
    categoryId: 'cat-safety-obs',
    roleCode: 'HCA',
    defaultTime: '1400',
    defaultFrequency: 'daily',
    defaultInstructions: 'Check resident comfort, offer water, ensure positioning is optimal.',
    synonyms: ['comfort round'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.safety.fall_prevention',
    title: 'Fall Prevention Check',
    categoryId: 'cat-safety-obs',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Ensure non-skid socks/shoes on, bed alarm active if ordered, walker in reach.',
    synonyms: ['fall prevention', 'fall check'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 12. HCA — OVERNIGHT CARE
  // ==========================================
  {
    slug: 'hca.overnight.safety_round',
    title: 'Overnight Safety Round',
    categoryId: 'cat-overnight',
    roleCode: 'HCA',
    defaultTime: '0100',
    defaultFrequency: 'daily',
    defaultInstructions: 'Perform quiet room safety and breathing check.',
    synonyms: ['night round', 'overnight check'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.overnight.toileting',
    title: 'Overnight Toileting / Continence',
    categoryId: 'cat-overnight',
    roleCode: 'HCA',
    defaultTime: '0200',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assist with nighttime toileting or continence change if awake/care planned.',
    synonyms: ['night toilet', 'night brief'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.overnight.repositioning',
    title: 'Overnight Repositioning',
    categoryId: 'cat-overnight',
    roleCode: 'HCA',
    defaultTime: '0300',
    defaultFrequency: 'daily',
    defaultInstructions: 'Gently reposition resident in bed to offload pressure points.',
    synonyms: ['night turn', 'night reposition'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 13. HCA — PALLIATIVE / COMFORT CARE
  // ==========================================
  {
    slug: 'hca.palliative.comfort_care',
    title: 'Comfort Care',
    categoryId: 'cat-palliative',
    roleCode: 'HCA',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Provide gentle comfort care: moisten lips, position with soft pillows.',
    synonyms: ['palliative comfort', 'comfort care'],
    carePlanDependent: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'hca.palliative.mouth_care',
    title: 'Mouth Care for Comfort',
    categoryId: 'cat-palliative',
    roleCode: 'HCA',
    defaultTime: '1000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Moisten oral mucosa with oral swabs and apply lip balm as planned.',
    synonyms: ['mouth care', 'oral swab'],
    carePlanDependent: true,
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 14. LPN — AM CARE, PM CARE & HS CARE NURSING REVIEW
  // ==========================================
  {
    slug: 'lpn.am.morning_nursing_review',
    title: 'Morning Nursing Review',
    categoryId: 'cat-am-care',
    roleCode: 'LPN',
    defaultTime: '0730',
    defaultFrequency: 'daily',
    defaultInstructions: 'Review overnight clinical handoff and prioritize morning clinical assessments.',
    synonyms: ['nursing review', 'morning review'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.pm.evening_nursing_review',
    title: 'Evening Nursing Review',
    categoryId: 'cat-pm-care',
    roleCode: 'LPN',
    defaultTime: '1730',
    defaultFrequency: 'daily',
    defaultInstructions: 'Review evening clinical status and medication follow-ups.',
    synonyms: ['evening review', 'pm review'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.hs.hs_nursing_review',
    title: 'HS Nursing Review',
    categoryId: 'cat-hs-care',
    roleCode: 'LPN',
    defaultTime: '2000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Review bedtime clinical status and prepare handoff for night nurse.',
    synonyms: ['hs review', 'bedtime nursing review', 'hs handoff'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 15. LPN — MEDICATION / TREATMENT
  // ==========================================
  {
    slug: 'lpn.medication.scheduled_task',
    title: 'Scheduled Medication-Related Task',
    categoryId: 'cat-med-treatment',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Administer scheduled medication per current MAR following MAR rights.',
    synonyms: ['med task', 'medication round', 'meds'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.medication.new_med_followup',
    title: 'New Medication Follow-up',
    categoryId: 'cat-med-treatment',
    roleCode: 'LPN',
    defaultTime: '1000',
    defaultFrequency: 'daily',
    defaultInstructions: 'Evaluate resident tolerance and observe for potential adverse effects of new medication.',
    synonyms: ['new med', 'med follow-up'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.medication.prn_effectiveness',
    title: 'PRN Medication Effectiveness Follow-up',
    categoryId: 'cat-med-treatment',
    roleCode: 'LPN',
    defaultTime: '1100',
    defaultFrequency: 'daily',
    defaultInstructions: 'Reassess symptom severity 30-60 mins after PRN administration and document on MAR.',
    synonyms: ['prn effectiveness', 'prn follow-up'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.medication.patch_application',
    title: 'Transdermal Patch Application / Change',
    categoryId: 'cat-med-treatment',
    roleCode: 'LPN',
    defaultTime: '0900',
    defaultFrequency: 'selected_days',
    defaultInstructions: 'Remove old patch, cleanse site, apply new patch rotating sites per MAR.',
    synonyms: ['patch', 'fentanyl patch', 'nitropatch', 'butrans'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.medication.eye_drops',
    title: 'Eye Drop Administration',
    categoryId: 'cat-med-treatment',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Instill prescribed ophthalmic drops per MAR order.',
    synonyms: ['eye drops', 'ophthalmic'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 16. LPN — DIABETES CARE
  // ==========================================
  {
    slug: 'lpn.diabetes.bg_check',
    title: 'Blood Glucose Check',
    categoryId: 'cat-diabetes',
    roleCode: 'LPN',
    defaultTime: '0730',
    defaultFrequency: 'daily',
    defaultInstructions: 'Perform fingerstick BG check before meal. Target: 4.0 - 10.0 mmol/L. Review current MAR/order.',
    synonyms: ['blood glucose', 'bg', 'glucometer', 'sugar', 'diabetes', 'bsi'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.diabetes.bg_insulin',
    title: 'BG Check + Scheduled Insulin',
    categoryId: 'cat-diabetes',
    roleCode: 'LPN',
    defaultTime: '0730',
    defaultFrequency: 'daily',
    defaultInstructions: 'Check BG; administer scheduled insulin per MAR following dual sign-off if required. Review current MAR/order.',
    synonyms: ['insulin', 'bg insulin', 'novorapid', 'lantus', 'humalog'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.diabetes.bg_sliding_scale',
    title: 'BG Check + Sliding Scale Insulin',
    categoryId: 'cat-diabetes',
    roleCode: 'LPN',
    defaultTime: '1130',
    defaultFrequency: 'daily',
    defaultInstructions: 'Check BG; calculate and administer sliding scale correction dose per MAR order.',
    synonyms: ['sliding scale', 'correction insulin', 'ssi'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.diabetes.cgm_check',
    title: 'CGM / Libre Blood Glucose Check',
    categoryId: 'cat-diabetes',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Scan continuous glucose sensor and record glucose reading and trend arrow.',
    synonyms: ['cgm', 'libre', 'freestyle libre', 'sensor'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.diabetes.hypoglycemia_followup',
    title: 'Hypoglycemia Follow-up',
    categoryId: 'cat-diabetes',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'once',
    defaultInstructions: 'Treat low BG (< 4.0 mmol/L) with 15g fast-acting carb; recheck in 15 mins per protocol.',
    synonyms: ['hypo', 'low sugar', 'hypoglycemia protocol'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 17. LPN — INJECTION
  // ==========================================
  {
    slug: 'lpn.injection.im_injection',
    title: 'Scheduled IM Injection',
    categoryId: 'cat-injection',
    roleCode: 'LPN',
    defaultTime: '0900',
    defaultFrequency: 'monthly',
    defaultInstructions: 'Administer prescribed intramuscular injection per MAR rotating sites.',
    synonyms: ['im injection', 'intramuscular'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.injection.sc_injection',
    title: 'Scheduled SC Injection',
    categoryId: 'cat-injection',
    roleCode: 'LPN',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Administer prescribed subcutaneous injection per MAR rotating sites.',
    synonyms: ['sc injection', 'subcut', 'fragmin', 'lovenox', 'prolia'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.injection.b12',
    title: 'Vitamin B12 / Cyanocobalamin Injection',
    categoryId: 'cat-injection',
    roleCode: 'LPN',
    defaultTime: '0900',
    defaultFrequency: 'monthly',
    defaultInstructions: 'Administer Vitamin B12 1000 mcg IM into deltoid / ventrogluteal site per MAR.',
    synonyms: ['b12', 'vitamin b12', 'cyanocobalamin'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 18. LPN — HEALTH MONITORING (Assessment Oriented)
  // ==========================================
  {
    slug: 'lpn.monitoring.full_vitals',
    title: 'Full Vital Signs',
    categoryId: 'cat-health-monitoring',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Measure BP, HR, RR, Temperature, and SpO2. Note abnormal findings.',
    synonyms: ['vitals', 'vital signs', 'bp', 'temp', 'pulse', 'spo2'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.monitoring.blood_pressure',
    title: 'Blood Pressure',
    categoryId: 'cat-health-monitoring',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Measure seated BP. Check against parameters per order.',
    synonyms: ['bp', 'blood pressure'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.monitoring.postural_vitals',
    title: 'Postural / Orthostatic Vital Signs',
    categoryId: 'cat-health-monitoring',
    roleCode: 'LPN',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Measure lying, sitting, and standing BP/HR; assess for orthostatic drop.',
    synonyms: ['postural vitals', 'orthostatic', 'orthostatic bp', 'postural'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.monitoring.general_assessment',
    title: 'General Nursing Assessment',
    categoryId: 'cat-health-monitoring',
    roleCode: 'LPN',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Complete focused clinical nursing assessment and document findings.',
    synonyms: ['assessment', 'nursing assessment', 'head to toe'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.monitoring.focused_assessment',
    title: 'Focused Nursing Assessment',
    categoryId: 'cat-health-monitoring',
    roleCode: 'LPN',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Complete targeted system assessment (e.g. respiratory, cardiac, abdomen).',
    synonyms: ['focused assessment'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.monitoring.change_in_condition',
    title: 'Change in Condition Assessment',
    categoryId: 'cat-health-monitoring',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'once',
    defaultInstructions: 'Comprehensive assessment upon acute change; notify RN/physician.',
    synonyms: ['condition change', 'acute change'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 19. LPN — WOUND CARE
  // ==========================================
  {
    slug: 'lpn.wound.treatment',
    title: 'Wound Treatment',
    categoryId: 'cat-wound-care',
    roleCode: 'LPN',
    defaultTime: '1000',
    defaultFrequency: 'selected_days',
    defaultInstructions: 'Cleanse wound with normal saline, apply ordered dressing per current wound protocol.',
    synonyms: ['wound', 'dressing', 'wound treatment', 'bandage'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.wound.dressing_change',
    title: 'Dressing Change',
    categoryId: 'cat-wound-care',
    roleCode: 'LPN',
    defaultTime: '1000',
    defaultFrequency: 'selected_days',
    defaultInstructions: 'Change dressing using aseptic technique per wound care plan.',
    synonyms: ['dressing change', 'bandage change'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.wound.assessment',
    title: 'Wound Assessment',
    categoryId: 'cat-wound-care',
    roleCode: 'LPN',
    defaultTime: '1030',
    defaultFrequency: 'weekly',
    defaultInstructions: 'Assess wound bed, exudate, odor, periwound skin, and healing progression.',
    synonyms: ['wound assessment', 'wound staging'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.wound.measurement',
    title: 'Wound Measurement',
    categoryId: 'cat-wound-care',
    roleCode: 'LPN',
    defaultTime: '1030',
    defaultFrequency: 'weekly',
    defaultInstructions: 'Measure length x width x depth (cm) and document in wound chart.',
    synonyms: ['wound measurement', 'wound size'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.wound.skin_tear',
    title: 'Skin Tear Treatment',
    categoryId: 'cat-wound-care',
    roleCode: 'LPN',
    defaultTime: '0930',
    defaultFrequency: 'daily',
    defaultInstructions: 'Cleanse with NS, realign skin flap gently, apply non-adherent dressing.',
    synonyms: ['skin tear', 'tear care'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 20. LPN — CATHETER / URINARY CARE
  // ==========================================
  {
    slug: 'lpn.catheter.assessment',
    title: 'Catheter Assessment',
    categoryId: 'cat-catheter-urinary',
    roleCode: 'LPN',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assess indwelling Foley/suprapubic catheter patency, securement device, and output quality.',
    synonyms: ['catheter assessment', 'foley assessment', 'catheter'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.catheter.site_care',
    title: 'Catheter Site Care',
    categoryId: 'cat-catheter-urinary',
    roleCode: 'LPN',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    defaultInstructions: 'Cleanse meatal/suprapubic site with soap and water; inspect for irritation.',
    synonyms: ['meatal care', 'catheter cleaning'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.catheter.in_and_out',
    title: 'In-and-Out Catheterization',
    categoryId: 'cat-catheter-urinary',
    roleCode: 'LPN',
    defaultTime: '1200',
    defaultFrequency: 'daily',
    defaultInstructions: 'Perform intermittent catheterization using sterile technique; record residual urine volume.',
    synonyms: ['in and out', 'intermittent catheter', 'straight cath'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 21. LPN — OSTOMY CARE
  // ==========================================
  {
    slug: 'lpn.ostomy.assessment',
    title: 'Ostomy Assessment',
    categoryId: 'cat-ostomy',
    roleCode: 'LPN',
    defaultTime: '0930',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assess stoma color, moisture, output volume/consistency, and peristomal skin.',
    synonyms: ['ostomy assessment', 'stoma assessment', 'colostomy', 'ileostomy'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.ostomy.appliance_change',
    title: 'Ostomy Appliance Change',
    categoryId: 'cat-ostomy',
    roleCode: 'LPN',
    defaultTime: '1000',
    defaultFrequency: 'selected_days',
    defaultInstructions: 'Change ostomy flange and pouch; measure stoma and apply skin barrier paste/ring.',
    synonyms: ['appliance change', 'ostomy bag change', 'flange change'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 22. LPN — RESPIRATORY CARE
  // ==========================================
  {
    slug: 'lpn.respiratory.assessment',
    title: 'Respiratory Assessment',
    categoryId: 'cat-respiratory',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Auscultate breath sounds, observe work of breathing, and check SpO2.',
    synonyms: ['chest assessment', 'breath sounds', 'respiratory'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.respiratory.o2_check',
    title: 'Oxygen Therapy Check',
    categoryId: 'cat-respiratory',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    defaultInstructions: 'Verify oxygen flow rate matches prescribed LPM, check tubing and skin behind ears.',
    synonyms: ['oxygen', 'o2 check', 'nasal cannula'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.respiratory.nebulizer',
    title: 'Nebulizer Treatment',
    categoryId: 'cat-respiratory',
    roleCode: 'LPN',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Administer ordered nebulized inhalation treatment; assess pre- and post-treatment lung sounds.',
    synonyms: ['nebulizer', 'aerosol', 'ventolin neb'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 23. LPN — LAB / SPECIMEN
  // ==========================================
  {
    slug: 'lpn.lab.urine_specimen',
    title: 'Urine Specimen Collection',
    categoryId: 'cat-lab-specimen',
    roleCode: 'LPN',
    defaultTime: '0730',
    defaultFrequency: 'once',
    defaultInstructions: 'Collect midstream or catheter urine sample for C&S / urinalysis per order.',
    synonyms: ['urine sample', 'urinalysis', 'c&s', 'specimen'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.lab.swab_collection',
    title: 'Swab Collection',
    categoryId: 'cat-lab-specimen',
    roleCode: 'LPN',
    defaultTime: '0900',
    defaultFrequency: 'once',
    defaultInstructions: 'Collect wound, MRSA, or viral swab per standard procedure.',
    synonyms: ['swab', 'wound swab', 'mrsa'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.lab.blood_specimen',
    title: 'Blood Specimen Collection — Where Authorized',
    categoryId: 'cat-lab-specimen',
    roleCode: 'LPN',
    defaultTime: '0730',
    defaultFrequency: 'once',
    defaultInstructions: 'Perform venipuncture collection if facility authorized and certified.',
    synonyms: ['blood draw', 'venipuncture', 'lab draw'],
    authorizationDependent: true,
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 24. LPN — PAIN / SYMPTOM MANAGEMENT
  // ==========================================
  {
    slug: 'lpn.pain.assessment',
    title: 'Pain Assessment',
    categoryId: 'cat-pain-symptom',
    roleCode: 'LPN',
    defaultTime: '0830',
    defaultFrequency: 'daily',
    defaultInstructions: 'Assess pain using 0-10 scale or PAINAD tool. Check effectiveness of analgesic interventions.',
    synonyms: ['pain assessment', 'pain scale', 'painad', 'pain'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.pain.reassessment',
    title: 'Pain Reassessment',
    categoryId: 'cat-pain-symptom',
    roleCode: 'LPN',
    defaultTime: '1100',
    defaultFrequency: 'daily',
    defaultInstructions: 'Reassess pain level following analgesia and non-pharmacological interventions.',
    synonyms: ['pain recheck', 'pain follow-up'],
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 25. LPN — CLINICAL FOLLOW-UP
  // ==========================================
  {
    slug: 'lpn.followup.post_fall_assessment',
    title: 'Post-Fall Assessment',
    categoryId: 'cat-clinical-followup',
    roleCode: 'LPN',
    defaultTime: '0800',
    defaultFrequency: 'once',
    defaultInstructions: 'Complete post-fall protocol, neuro vital signs, range of motion check, and pain evaluation.',
    synonyms: ['fall follow-up', 'post fall', 'neuro checks'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.followup.physician_np',
    title: 'Physician / NP Follow-up',
    categoryId: 'cat-clinical-followup',
    roleCode: 'LPN',
    defaultTime: '1100',
    defaultFrequency: 'daily',
    defaultInstructions: 'Review lab results/clinical changes with attending physician or nurse practitioner.',
    synonyms: ['doctor follow-up', 'physician update', 'np'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.followup.family_notification',
    title: 'Family Notification',
    categoryId: 'cat-clinical-followup',
    roleCode: 'LPN',
    defaultTime: '1300',
    defaultFrequency: 'once',
    defaultInstructions: 'Contact designated family/guardian regarding clinical update or new order.',
    synonyms: ['family call', 'notify family'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.followup.general_clinical',
    title: 'Clinical Follow-up',
    categoryId: 'cat-clinical-followup',
    roleCode: 'LPN',
    defaultTime: '1100',
    defaultFrequency: 'daily',
    defaultInstructions: 'Follow up on ordered diagnostic tests, therapy recommendations, or care plans.',
    synonyms: ['followup', 'clinical follow-up'],
    isPopular: true,
    isStandardTemplate: true,
    isActive: true
  },

  // ==========================================
  // 26. LPN — RESIDENT / FAMILY EDUCATION
  // ==========================================
  {
    slug: 'lpn.education.diabetes',
    title: 'Diabetes Education',
    categoryId: 'cat-education',
    roleCode: 'LPN',
    defaultTime: '1400',
    defaultFrequency: 'once',
    defaultInstructions: 'Reinforce diabetic meal choices, hypoglycemia symptom recognition, and foot care.',
    synonyms: ['diabetes teaching', 'teaching'],
    isStandardTemplate: true,
    isActive: true
  },
  {
    slug: 'lpn.education.medication',
    title: 'Medication Education',
    categoryId: 'cat-education',
    roleCode: 'LPN',
    defaultTime: '1400',
    defaultFrequency: 'once',
    defaultInstructions: 'Provide resident/family education regarding newly prescribed medications.',
    synonyms: ['med teaching', 'family education'],
    isStandardTemplate: true,
    isActive: true
  }
];

export const ALBERTA_TASK_TEMPLATES: CatalogTaskTemplate[] = RAW_ALBERTA_TASK_TEMPLATES.map(t => {
  if (t.attentionConfig) return t;
  const detection = detectAttentionIndicators(t.title, t.defaultInstructions);
  if (detection.suggestedIndicators.length > 0) {
    return {
      ...t,
      attentionConfig: {
        indicators: detection.suggestedIndicators,
        mealRelation: detection.mealRelation,
        equipmentNote: detection.equipmentNote,
        docRefNote: detection.docRefNote,
        metadata: detection.metadata.map(m => ({ ...m, source: 'catalog' as const })),
      },
    };
  }
  return t;
});

export const STANDARD_UNIT_TASK_TEMPLATES: UnitTaskTemplate[] = [
  // Start of Shift
  {
    slug: 'unit-receive-handoff',
    title: 'Receive Shift Handoff',
    roleCode: 'SHARED',
    shiftPhase: 'start',
    defaultTime: '0700',
    resultType: 'confirmation',
    defaultInstructions: 'Receive verbal and documented shift handoff from outgoing staff.',
    isActive: true
  },
  {
    slug: 'unit-review-tasksheet',
    title: 'Review TaskSheet / Assignment',
    roleCode: 'SHARED',
    shiftPhase: 'start',
    defaultTime: '0710',
    resultType: 'confirmation',
    defaultInstructions: 'Review today’s resident care assignments, scheduled times, and specific instructions.',
    isActive: true
  },
  {
    slug: 'unit-review-important-fyis',
    title: 'Review Important FYIs',
    roleCode: 'SHARED',
    shiftPhase: 'start',
    defaultTime: '0715',
    resultType: 'confirmation',
    defaultInstructions: 'Check FYI binder for newly active resident preferences, alerts, and facility communications.',
    isActive: true
  },
  {
    slug: 'unit-review-communications',
    title: 'Review Communications',
    roleCode: 'SHARED',
    shiftPhase: 'start',
    defaultTime: '0720',
    resultType: 'confirmation',
    defaultInstructions: 'Review communication book, pharmacy delivery updates, and unit notices.',
    isActive: true
  },
  {
    slug: 'unit-fridge-temp',
    title: 'Medication Fridge Temperature',
    roleCode: 'LPN',
    shiftPhase: 'start',
    defaultTime: '0730',
    resultType: 'temperature',
    resultConfig: {
      unit: '°C',
      min: 2.0,
      max: 8.0
    },
    defaultInstructions: 'Check digital thermometer. Expected range: 2.0°C to 8.0°C. If out of range, log action taken.',
    synonyms: ['fridge', 'temp', 'medication fridge', 'temperature'],
    isActive: true
  },
  {
    slug: 'unit-narcotic-count-in',
    title: 'Controlled Medication Count — Incoming',
    roleCode: 'LPN',
    shiftPhase: 'start',
    defaultTime: '0705',
    resultType: 'confirmation',
    resultConfig: {
      passLabel: 'Count Reconciled / OK',
      issueLabel: 'Discrepancy Noted'
    },
    defaultInstructions: 'Perform dual narcotic count with outgoing nurse. Sign controlled drug register.',
    synonyms: ['narcotic count', 'controlled count', 'med count'],
    isActive: true
  },
  {
    slug: 'unit-emergency-equipment',
    title: 'Emergency Equipment Check',
    roleCode: 'LPN',
    shiftPhase: 'start',
    defaultTime: '0745',
    resultType: 'pass_issue',
    resultConfig: {
      passLabel: 'Seals Intact & Operational',
      issueLabel: 'Issue / Restock Needed'
    },
    defaultInstructions: 'Verify emergency equipment, suction apparatus, oxygen tank levels, and AED status.',
    isActive: true
  },
  {
    slug: 'unit-review-wound-list',
    title: 'Review Wound / Treatment List',
    roleCode: 'LPN',
    shiftPhase: 'start',
    defaultTime: '0750',
    resultType: 'confirmation',
    defaultInstructions: 'Review active dressing changes and wound treatment schedule for the shift.',
    isActive: true
  },
  {
    slug: 'unit-review-outstanding-start',
    title: 'Review Outstanding Tasks',
    roleCode: 'SHARED',
    shiftPhase: 'start',
    defaultTime: '0755',
    resultType: 'confirmation',
    defaultInstructions: 'Check for carry-over tasks or pending lab orders from previous shift.',
    isActive: true
  },

  // During Shift
  {
    slug: 'unit-supply-check',
    title: 'Equipment / Supply Check',
    roleCode: 'SHARED',
    shiftPhase: 'during',
    defaultTime: '1300',
    resultType: 'confirmation',
    defaultInstructions: 'Ensure linen carts, PPE stations, and clinical supplies are stocked for the unit.',
    isActive: true
  },
  {
    slug: 'unit-fridge-recheck',
    title: 'Medication Fridge Temperature Recheck',
    roleCode: 'LPN',
    shiftPhase: 'during',
    defaultTime: '1400',
    resultType: 'temperature',
    resultConfig: {
      unit: '°C',
      min: 2.0,
      max: 8.0
    },
    defaultInstructions: 'Mid-shift temperature verification for clinical medication storage.',
    isActive: true
  },
  {
    slug: 'unit-treatment-cart-check',
    title: 'Treatment Cart / Supply Check',
    roleCode: 'LPN',
    shiftPhase: 'during',
    defaultTime: '1430',
    resultType: 'confirmation',
    defaultInstructions: 'Restock treatment cart dressings, syringes, and clinical supplies.',
    isActive: true
  },
  {
    slug: 'unit-outstanding-orders',
    title: 'Outstanding Orders Follow-up',
    roleCode: 'LPN',
    shiftPhase: 'during',
    defaultTime: '1500',
    resultType: 'confirmation',
    defaultInstructions: 'Review newly received prescriber orders, pharmacy faxes, and pending follow-ups.',
    isActive: true
  },

  // End of Shift
  {
    slug: 'unit-narcotic-count-out',
    title: 'Controlled Medication Count — Outgoing',
    roleCode: 'LPN',
    shiftPhase: 'end',
    defaultTime: '1855',
    resultType: 'confirmation',
    resultConfig: {
      passLabel: 'Count Reconciled / OK',
      issueLabel: 'Discrepancy Noted'
    },
    defaultInstructions: 'Complete dual count with incoming shift nurse and endorse keys.',
    isActive: true
  },
  {
    slug: 'unit-review-outstanding-end',
    title: 'Review Outstanding Tasks',
    roleCode: 'SHARED',
    shiftPhase: 'end',
    defaultTime: '1840',
    resultType: 'confirmation',
    defaultInstructions: 'Confirm all critical resident care and medications have been completed or endorsed.',
    isActive: true
  },
  {
    slug: 'unit-review-abnormal-findings',
    title: 'Review Abnormal Findings',
    roleCode: 'SHARED',
    shiftPhase: 'end',
    defaultTime: '1845',
    resultType: 'confirmation',
    defaultInstructions: 'Review and summarize abnormal vitals, BG readings, or skin concerns for handoff.',
    isActive: true
  },
  {
    slug: 'unit-complete-shift-handoff',
    title: 'Complete Shift Handoff',
    roleCode: 'SHARED',
    shiftPhase: 'end',
    defaultTime: '1850',
    resultType: 'checkbox_note',
    defaultInstructions: 'Provide comprehensive verbal and written shift endorsement to oncoming team.',
    isActive: true
  },
  {
    slug: 'unit-end-shift-communication',
    title: 'End-of-Shift Communication / Endorsement',
    roleCode: 'SHARED',
    shiftPhase: 'end',
    defaultTime: '1855',
    resultType: 'confirmation',
    defaultInstructions: 'Final communication handover completed.',
    isActive: true
  }
];
