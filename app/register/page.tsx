'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CITIES, CATEGORIES } from '@/types';

const STEPS = ['Business Info', 'Location', 'Contact', 'Details', 'Media', 'Account'];

// ── CATEGORY DISPLAY NAMES ──
const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  pg: 'PG & Hostel',
  hostel: 'PG & Hostel',
  rental_house: 'Rental House',
  gym: 'Gym',
  turf: 'Turf & Sports',
  study_space: 'Study Space',
  salon: 'Salon & Parlour',
  hotel: 'Hotel & Guesthouse',
  coaching: 'Coaching Centre',
  homestay: 'Homestay',
  vehicle_rental: 'Vehicle Rental',
  couple_spot: 'Couple Spot & Hangout',
  school: 'School',
  hospital: 'Hospital',
  clinic: 'Clinic',
  shop: 'Shop',
  pharmacy: 'Pharmacy',
  service: 'Service',
  rental: 'Rental',
  other: 'Other',
};

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', pg: '🏠', hostel: '🏠', rental_house: '🏡',
  gym: '💪', turf: '⚽', study_space: '📚', salon: '💇', hotel: '🏨',
  coaching: '📖', homestay: '🏡', vehicle_rental: '🚗', couple_spot: '🌙',
  school: '🎓', hospital: '🏥', clinic: '🏥', shop: '🛍️', pharmacy: '💊',
  service: '🔧', rental: '🚗', other: '🏪',
};

// ── VIBE TAGS PER CATEGORY ──
const CATEGORY_VIBE_TAGS: Record<string, string[]> = {
  pg: ['Budget friendly', 'Premium', 'Parking available', 'Study friendly', 'Family friendly', 'Girls only', 'Boys only'],
  hostel: ['Budget friendly', 'Premium', 'Parking available', 'Study friendly', 'Family friendly', 'Girls only', 'Boys only'],
  rental_house: ['Budget friendly', 'Premium', 'Parking available', 'Family friendly', 'Quiet neighbourhood', 'Newly built', '24hr water supply'],
  homestay: ['Romantic getaway', 'Family friendly', 'Quiet and peaceful', 'Premium', 'Nature and outdoor', 'Parking available', 'Meals included', 'Scenic views'],
  vehicle_rental: ['Budget friendly', 'Premium', 'Self drive', 'Bikes available', 'Scooties available', 'Cars available', 'Delivery available', 'Fuel included'],
  gym: ['Budget friendly', 'Premium', 'Open early', 'Open late', 'Personal trainer', 'AC available', 'Ladies friendly', 'Cardio focused', 'Powerlifting', 'Yoga available'],
  turf: ['Friends hangout', 'Party and celebrations', 'Budget friendly', 'Premium', 'Open late', 'Floodlights', 'Covered turf', 'Football', 'Cricket', 'Basketball', 'Futsal'],
  cafe: ['Couple friendly', 'Friends hangout', 'Quiet and peaceful', 'Study and work', 'Budget friendly', 'Premium', 'Open late', 'Open early', 'Fast WiFi', 'Power outlets', 'Outdoor seating', 'Takeaway friendly', 'Instagrammable', 'Live music'],
  restaurant: ['Couple friendly', 'Family friendly', 'Friends hangout', 'Party and celebrations', 'Budget friendly', 'Premium', 'Open late', 'Outdoor seating', 'Takeaway friendly', 'Parking available', 'Naga cuisine', 'Veg friendly', 'Bar available', 'Instagrammable', 'Live music', 'Birthday celebrations'],
  study_space: ['Quiet and peaceful', 'Study and work', 'Budget friendly', 'Premium', 'Open early', 'Open late', 'AC available', 'Fast WiFi', 'Power outlets', 'Printing available', 'Private cabins', 'Café inside'],
  salon: ['Budget friendly', 'Premium', 'Open late', 'Ladies only', 'Mens only', 'Unisex', 'Bridal packages', 'Nail art', 'Hair colour', 'Facial available', 'Appointment required', 'Walk in welcome'],
  hotel: ['Family friendly', 'Quiet and peaceful', 'Premium', 'Budget friendly', 'Parking available', 'Fast WiFi', 'AC rooms', 'Breakfast included', 'Nature views', 'Near Kisama', 'Event hall available'],
  coaching: ['Study and work', 'Budget friendly', 'Premium', 'Morning batch', 'Evening batch', 'Online available', 'Small batch', 'Demo class available', 'Competitive exams', 'School subjects'],
  couple_spot: ['Couple hangout spot', 'Quiet and peaceful', 'Premium', 'Budget friendly', 'Nature and outdoor', 'Scenic views', 'Instagrammable', 'Live music', 'Food available', 'Private booking', 'Open late', 'Parking available'],
};

const DEFAULT_VIBES: Record<string, string[]> = {
  couple_spot: ['Couple hangout spot'],
  homestay: ['Family friendly'],
  study_space: ['Study and work'],
};

// ── FIELD DEFINITIONS ──
type FieldDef = {
  key: string;
  label: string;
  type: 'select' | 'multicheck' | 'number' | 'text' | 'range';
  options?: string[];
  placeholder?: string;
  rangeLabels?: [string, string];
};

const CATEGORY_FIELDS: Record<string, { label: string; fields: FieldDef[] }> = {
  pg: {
    label: '🏠 PG & Hostel Details',
    fields: [
      { key: 'price_min', label: 'Price per month (min ₹)', type: 'number', placeholder: 'e.g. 3000' },
      { key: 'price_max', label: 'Price per month (max ₹)', type: 'number', placeholder: 'e.g. 5000' },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Boys', 'Girls', 'Both'] },
      { key: 'room_type', label: 'Room Type', type: 'select', options: ['Single', 'Double', 'Triple', 'Dormitory'] },
      { key: 'meals_included', label: 'Meals included', type: 'select', options: ['Yes', 'No'] },
      { key: 'wifi', label: 'WiFi', type: 'select', options: ['Yes', 'No'] },
      { key: 'ac', label: 'AC', type: 'select', options: ['Yes', 'No'] },
      { key: 'deposit', label: 'Deposit amount (₹)', type: 'number', placeholder: 'e.g. 5000' },
    ],
  },
  hostel: {
    label: '🏠 PG & Hostel Details',
    fields: [
      { key: 'price_min', label: 'Price per month (min ₹)', type: 'number', placeholder: 'e.g. 3000' },
      { key: 'price_max', label: 'Price per month (max ₹)', type: 'number', placeholder: 'e.g. 5000' },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Boys', 'Girls', 'Both'] },
      { key: 'room_type', label: 'Room Type', type: 'select', options: ['Single', 'Double', 'Triple', 'Dormitory'] },
      { key: 'meals_included', label: 'Meals included', type: 'select', options: ['Yes', 'No'] },
      { key: 'wifi', label: 'WiFi', type: 'select', options: ['Yes', 'No'] },
      { key: 'ac', label: 'AC', type: 'select', options: ['Yes', 'No'] },
      { key: 'deposit', label: 'Deposit amount (₹)', type: 'number', placeholder: 'e.g. 5000' },
    ],
  },
  rental_house: {
    label: '🏡 Rental House Details',
    fields: [
      { key: 'price_min', label: 'Price per month (min ₹)', type: 'number', placeholder: 'e.g. 5000' },
      { key: 'price_max', label: 'Price per month (max ₹)', type: 'number', placeholder: 'e.g. 10000' },
      { key: 'bhk', label: 'BHK', type: 'select', options: ['1BHK', '2BHK', '3BHK', 'Studio'] },
      { key: 'furnished', label: 'Furnished', type: 'select', options: ['Fully', 'Semi', 'Unfurnished'] },
      { key: 'parking', label: 'Parking', type: 'select', options: ['Yes', 'No'] },
      { key: 'preferred_tenant', label: 'Preferred tenant', type: 'select', options: ['Family', 'Bachelor', 'Any'] },
      { key: 'deposit', label: 'Deposit amount (₹)', type: 'number', placeholder: 'e.g. 10000' },
      { key: 'water_supply', label: 'Water supply', type: 'select', options: ['24hr', 'Limited'] },
    ],
  },
  gym: {
    label: '💪 Gym Details',
    fields: [
      { key: 'price_min', label: 'Monthly fee (min ₹)', type: 'number', placeholder: 'e.g. 500' },
      { key: 'price_max', label: 'Monthly fee (max ₹)', type: 'number', placeholder: 'e.g. 1500' },
      { key: 'trainer', label: 'Trainer available', type: 'select', options: ['Yes', 'No'] },
      { key: 'ac', label: 'AC', type: 'select', options: ['Yes', 'No'] },
      { key: 'opening_hours', label: 'Opening hours', type: 'text', placeholder: 'e.g. 6am–9pm' },
      { key: 'equipment', label: 'Equipment', type: 'select', options: ['Basic', 'Moderate', 'Fully equipped'] },
    ],
  },
  turf: {
    label: '⚽ Turf & Sports Details',
    fields: [
      { key: 'price_min', label: 'Price per hour (min ₹)', type: 'number', placeholder: 'e.g. 600' },
      { key: 'price_max', label: 'Price per hour (max ₹)', type: 'number', placeholder: 'e.g. 1200' },
      { key: 'sport_types', label: 'Sport types', type: 'multicheck', options: ['Football', 'Futsal', 'Cricket', 'Basketball', 'Multiple'] },
      { key: 'covered', label: 'Covered', type: 'select', options: ['Yes', 'No'] },
      { key: 'floodlights', label: 'Floodlights', type: 'select', options: ['Yes', 'No'] },
      { key: 'booking', label: 'Booking', type: 'select', options: ['Walkin', 'Advance only'] },
    ],
  },
  cafe: {
    label: '☕ Café Details',
    fields: [
      { key: 'wifi', label: 'WiFi', type: 'select', options: ['Yes', 'No'] },
      { key: 'study_friendly', label: 'Study friendly', type: 'select', options: ['Yes', 'No'] },
      { key: 'price_min', label: 'Average spend (min ₹)', type: 'number', placeholder: 'e.g. 100' },
      { key: 'price_max', label: 'Average spend (max ₹)', type: 'number', placeholder: 'e.g. 400' },
      { key: 'opening_hours', label: 'Opening hours', type: 'text', placeholder: 'e.g. 9am–10pm' },
      { key: 'outdoor_seating', label: 'Outdoor seating', type: 'select', options: ['Yes', 'No'] },
      { key: 'power_outlets', label: 'Power outlets', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  restaurant: {
    label: '🍽️ Restaurant Details',
    fields: [
      { key: 'cuisine', label: 'Cuisine type', type: 'select', options: ['Naga', 'Chinese', 'Indian', 'Continental', 'Mixed'] },
      { key: 'price_min', label: 'Average spend (min ₹)', type: 'number', placeholder: 'e.g. 150' },
      { key: 'price_max', label: 'Average spend (max ₹)', type: 'number', placeholder: 'e.g. 600' },
      { key: 'pure_veg', label: 'Pure veg', type: 'select', options: ['Yes', 'No'] },
      { key: 'home_delivery', label: 'Home delivery', type: 'select', options: ['Yes', 'No'] },
      { key: 'outdoor_seating', label: 'Outdoor seating', type: 'select', options: ['Yes', 'No'] },
      { key: 'opening_hours', label: 'Opening hours', type: 'text', placeholder: 'e.g. 11am–10pm' },
      { key: 'wifi', label: 'WiFi', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  study_space: {
    label: '📚 Study Space Details',
    fields: [
      { key: 'monthly_fee', label: 'Monthly fee (₹)', type: 'number', placeholder: 'e.g. 600' },
      { key: 'daily_fee', label: 'Daily fee (₹)', type: 'number', placeholder: 'e.g. 50' },
      { key: 'ac', label: 'AC', type: 'select', options: ['Yes', 'No'] },
      { key: 'wifi', label: 'WiFi', type: 'select', options: ['Yes', 'No'] },
      { key: 'opening_hours', label: 'Opening hours', type: 'text', placeholder: 'e.g. 6am–10pm' },
      { key: 'private_cabins', label: 'Private cabins', type: 'select', options: ['Yes', 'No'] },
      { key: 'printing', label: 'Printing available', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  salon: {
    label: '💇 Salon & Parlour Details',
    fields: [
      { key: 'salon_type', label: 'Type', type: 'select', options: ['Mens', 'Ladies', 'Unisex'] },
      { key: 'services', label: 'Services', type: 'multicheck', options: ['Haircut', 'Colour', 'Facial', 'Bridal', 'Nails', 'All'] },
      { key: 'price_min', label: 'Price (min ₹)', type: 'number', placeholder: 'e.g. 100' },
      { key: 'price_max', label: 'Price (max ₹)', type: 'number', placeholder: 'e.g. 2000' },
      { key: 'appointment', label: 'Appointment required', type: 'select', options: ['Yes', 'Walkin', 'Both'] },
      { key: 'opening_hours', label: 'Opening hours', type: 'text', placeholder: 'e.g. 10am–7pm' },
    ],
  },
  hotel: {
    label: '🏨 Hotel & Guesthouse Details',
    fields: [
      { key: 'price_min', label: 'Price per night (min ₹)', type: 'number', placeholder: 'e.g. 1000' },
      { key: 'price_max', label: 'Price per night (max ₹)', type: 'number', placeholder: 'e.g. 5000' },
      { key: 'ac_rooms', label: 'AC rooms', type: 'select', options: ['Yes', 'No'] },
      { key: 'wifi', label: 'WiFi', type: 'select', options: ['Yes', 'No'] },
      { key: 'parking', label: 'Parking', type: 'select', options: ['Yes', 'No'] },
      { key: 'meals_included', label: 'Meals included', type: 'select', options: ['Yes', 'No'] },
      { key: 'room_types', label: 'Room types', type: 'multicheck', options: ['Single', 'Double', 'Triple', 'Suite'] },
    ],
  },
  coaching: {
    label: '📖 Coaching Centre Details',
    fields: [
      { key: 'subjects', label: 'Subjects', type: 'multicheck', options: ['Science', 'Maths', 'English', 'Competitive', 'All'] },
      { key: 'price_min', label: 'Fee per month (min ₹)', type: 'number', placeholder: 'e.g. 500' },
      { key: 'price_max', label: 'Fee per month (max ₹)', type: 'number', placeholder: 'e.g. 2000' },
      { key: 'timing', label: 'Timing', type: 'text', placeholder: 'e.g. 4pm–7pm' },
      { key: 'online', label: 'Online available', type: 'select', options: ['Yes', 'No'] },
      { key: 'demo_class', label: 'Demo class', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  homestay: {
    label: '🏡 Homestay Details',
    fields: [
      { key: 'price_min', label: 'Price per night (min ₹)', type: 'number', placeholder: 'e.g. 1000' },
      { key: 'price_max', label: 'Price per night (max ₹)', type: 'number', placeholder: 'e.g. 3000' },
      { key: 'num_rooms', label: 'Number of rooms', type: 'number', placeholder: 'e.g. 4' },
      { key: 'meals_included', label: 'Meals included', type: 'select', options: ['Yes', 'No'] },
      { key: 'wifi', label: 'WiFi', type: 'select', options: ['Yes', 'No'] },
      { key: 'parking', label: 'Parking', type: 'select', options: ['Yes', 'No'] },
      { key: 'host_on_property', label: 'Host lives on property', type: 'select', options: ['Yes', 'No'] },
      { key: 'best_for', label: 'Best for', type: 'select', options: ['Family', 'Couples', 'Solo', 'Any'] },
      { key: 'pickup', label: 'Pickup available', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  vehicle_rental: {
    label: '🚗 Vehicle Rental Details',
    fields: [
      { key: 'vehicle_types', label: 'Vehicle types available', type: 'multicheck', options: ['Bike', 'Scooter', 'Car', 'Multiple'] },
      { key: 'price_per_day_min', label: 'Price per day (min ₹)', type: 'number', placeholder: 'e.g. 300' },
      { key: 'price_per_day_max', label: 'Price per day (max ₹)', type: 'number', placeholder: 'e.g. 2000' },
      { key: 'price_per_hour_min', label: 'Price per hour (min ₹)', type: 'number', placeholder: 'e.g. 50' },
      { key: 'price_per_hour_max', label: 'Price per hour (max ₹)', type: 'number', placeholder: 'e.g. 300' },
      { key: 'fuel_included', label: 'Fuel included', type: 'select', options: ['Yes', 'No'] },
      { key: 'helmet_provided', label: 'Helmet provided', type: 'select', options: ['Yes', 'No'] },
      { key: 'document_required', label: 'Document required', type: 'select', options: ['Licence', 'Aadhar', 'Both'] },
      { key: 'delivery', label: 'Delivery available', type: 'select', options: ['Yes', 'No'] },
      { key: 'opening_hours', label: 'Opening hours', type: 'text', placeholder: 'e.g. 7am–8pm' },
    ],
  },
  couple_spot: {
    label: '🌙 Couple Spot & Hangout Details',
    fields: [
      { key: 'spot_type', label: 'Type', type: 'select', options: ['Café', 'Restaurant', 'Park', 'Viewpoint', 'Resort', 'Other'] },
      { key: 'entry_fee', label: 'Entry fee', type: 'select', options: ['Free', 'Paid'] },
      { key: 'entry_fee_amount', label: 'Entry fee amount (₹)', type: 'number', placeholder: 'e.g. 100' },
      { key: 'best_time', label: 'Best time to visit', type: 'select', options: ['Morning', 'Evening', 'Night', 'Any'] },
      { key: 'private_seating', label: 'Private seating available', type: 'select', options: ['Yes', 'No'] },
      { key: 'wifi', label: 'WiFi', type: 'select', options: ['Yes', 'No'] },
      { key: 'price_min', label: 'Average spend (min ₹)', type: 'number', placeholder: 'e.g. 200' },
      { key: 'price_max', label: 'Average spend (max ₹)', type: 'number', placeholder: 'e.g. 800' },
      { key: 'opening_hours', label: 'Opening hours', type: 'text', placeholder: 'e.g. 10am–10pm' },
    ],
  },
  // Legacy categories that still need some fields
  school: {
    label: '🎓 School Details',
    fields: [
      { key: 'board', label: 'Board', type: 'select', options: ['CBSE', 'NBSE', 'State board'] },
      { key: 'school_type', label: 'Type', type: 'select', options: ['Private', 'Government'] },
      { key: 'classes', label: 'Classes', type: 'multicheck', options: ['Nursery to 5', '6 to 10', '11 to 12', 'All classes'] },
    ],
  },
  hospital: {
    label: '🏥 Hospital Details',
    fields: [
      { key: 'speciality', label: 'Speciality', type: 'multicheck', options: ['General', 'Dental', 'Eye', 'Ortho', 'Paediatric', 'Maternity', 'Surgery', 'Other'] },
      { key: 'hours', label: 'Hours', type: 'select', options: ['24 hours', 'Day only'] },
      { key: 'emergency', label: 'Emergency Services', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  clinic: {
    label: '🏥 Clinic Details',
    fields: [
      { key: 'speciality', label: 'Speciality', type: 'multicheck', options: ['General', 'Dental', 'Eye', 'Ortho', 'Paediatric', 'Skin', 'Other'] },
      { key: 'hours', label: 'Hours', type: 'select', options: ['24 hours', 'Day only'] },
      { key: 'emergency', label: 'Emergency Services', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  pharmacy: {
    label: '💊 Pharmacy Details',
    fields: [
      { key: 'hours', label: 'Hours', type: 'select', options: ['24 hours', 'Day only', 'Night only'] },
      { key: 'services', label: 'Services', type: 'multicheck', options: ['Home delivery', 'Online orders', 'Medical equipment'] },
      { key: 'emergency', label: 'Emergency', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  shop: {
    label: '🛍️ Shop Details',
    fields: [
      { key: 'shop_type', label: 'Shop Type', type: 'select', options: ['Clothing', 'Electronics', 'Grocery', 'Furniture', 'Stationery', 'Sports', 'Hardware', 'Other'] },
      { key: 'price_range', label: 'Price Range', type: 'select', options: ['Budget', 'Affordable', 'Mid-range', 'Premium'] },
      { key: 'services', label: 'Services', type: 'multicheck', options: ['Home delivery', 'Custom orders', 'Wholesale available'] },
    ],
  },
};

// ── CATEGORY FIELDS COMPONENT ──
function CategoryFields({ category, values, onChange }: {
  category: string;
  values: Record<string, string | string[]>;
  onChange: (key: string, val: string | string[]) => void;
}) {
  const cat = category.toLowerCase();
  const config = CATEGORY_FIELDS[cat];
  if (!config) return null;

  const toggleMulti = (key: string, option: string) => {
    const current = (values[key] as string[]) || [];
    const updated = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
    onChange(key, updated);
  };

  return (
    <div className="cat-fields-wrap" style={{ animation: 'fieldSlide 0.35s ease both' }}>
      <div className="cat-fields-title">{config.label}</div>
      {config.fields.map((field, fi) => (
        <div key={field.key} className="form-group" style={{ animation: `fieldSlide 0.3s ${fi * 0.04}s ease both` }}>
          <label className="form-label">{field.label}</label>
          {field.type === 'select' && (
            <select className="form-select" value={(values[field.key] as string) || ''} onChange={e => onChange(field.key, e.target.value)}>
              <option value="">Select…</option>
              {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {field.type === 'multicheck' && (
            <div className="tags-wrap">
              {field.options?.map(o => {
                const selected = ((values[field.key] as string[]) || []).includes(o);
                return (
                  <button key={o} type="button" className={`tag-btn ${selected ? 'selected' : ''}`} onClick={() => toggleMulti(field.key, o)}>
                    {selected ? '✓ ' : '+ '}{o}
                  </button>
                );
              })}
            </div>
          )}
          {field.type === 'number' && (
            <input className="form-input" type="number" value={(values[field.key] as string) || ''} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder} />
          )}
          {field.type === 'text' && (
            <input className="form-input" type="text" value={(values[field.key] as string) || ''} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── VIBE TAGS COMPONENT ──
function VibeTagsPicker({ selected, onChange, category }: {
  selected: string[];
  onChange: (tags: string[]) => void;
  category: string;
}) {
  const tags = CATEGORY_VIBE_TAGS[category.toLowerCase()] || [];
  const toggle = (label: string) => {
    onChange(selected.includes(label) ? selected.filter(t => t !== label) : [...selected, label]);
  };
  if (tags.length === 0) return null;
  return (
    <div className="vibe-section" style={{ animation: 'fieldSlide 0.35s 0.15s ease both' }}>
      <div className="vibe-title">✨ Vibe tags <span className="vibe-hint">— select all that apply</span></div>
      <div className="vibe-grid">
        {tags.map(label => {
          const active = selected.includes(label);
          return (
            <button key={label} type="button" className={`vibe-chip ${active ? 'active' : ''}`} onClick={() => toggle(label)}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ──
export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', category: '', city: '', address: '', landmark: '',
    phone: '', whatsapp: '', website: '',
    description: '', opening_hours: '',
  });
  const [customFields, setCustomFields] = useState<Record<string, string | string[]>>({});
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [account, setAccount] = useState({ email: '', password: '', confirm: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const MAX_PHOTOS_NEW = 2;
  const [photos, setPhotos] = useState<File[]>([]);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpResending, setOtpResending] = useState(false);

  // ── CUSTOMER SIGN-UP MODE ──────────────────────────────────────────────────
  const [regMode,          setRegMode]          = useState<'business' | 'customer'>('business')
  const [custName,         setCustName]         = useState('')
  const [custEmail,        setCustEmail]        = useState('')
  const [custPassword,     setCustPassword]     = useState('')
  const [custLoading,      setCustLoading]      = useState(false)
  const [custError,        setCustError]        = useState('')
  const [custShowOtp,      setCustShowOtp]      = useState(false)
  const [custOtpCode,      setCustOtpCode]      = useState('')
  const [custOtpLoading,   setCustOtpLoading]   = useState(false)
  const [custOtpError,     setCustOtpError]     = useState('')
  const [custOtpResending, setCustOtpResending] = useState(false)
  const [custOtpResent,    setCustOtpResent]    = useState(false)

  const handleGoogleLogin = async () => {
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/saved')}`;
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  };

  const handleCustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custName.trim())       { setCustError('Please enter your name.');                    return }
    if (custPassword.length < 6){ setCustError('Password must be at least 6 characters.');   return }
    setCustLoading(true); setCustError('')
    const { error } = await supabase.auth.signUp({
      email: custEmail,
      password: custPassword,
      options: { data: { full_name: custName.trim() } },
    })
    if (error) { setCustError(error.message.includes('already registered') ? 'An account with this email already exists.' : 'Could not create account. Please try again.'); setCustLoading(false); return }
    setCustShowOtp(true)
    setCustLoading(false)
  }

  const handleCustOtpVerify = async () => {
    if (custOtpCode.length !== 6) { setCustOtpError('Enter the 6-digit code.'); return }
    setCustOtpLoading(true); setCustOtpError('')
    const { error } = await supabase.auth.verifyOtp({ email: custEmail, token: custOtpCode, type: 'signup' })
    if (error) { setCustOtpError('Invalid or expired code. Try again.'); setCustOtpLoading(false); return }
    window.location.href = '/saved'
  }

  const handleCustOtpResend = async () => {
    setCustOtpResending(true); setCustOtpResent(false)
    await supabase.auth.resend({ type: 'signup', email: custEmail })
    setCustOtpResending(false); setCustOtpResent(true)
  }
  const [otpResent, setOtpResent] = useState(false);

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const updateCustom = (key: string, val: string | string[]) => setCustomFields(f => ({ ...f, [key]: val }));

  const handleCategoryChange = (cat: string) => {
    update('category', cat);
    setCustomFields({});
    const allowed = CATEGORY_VIBE_TAGS[cat.toLowerCase()] || [];
    const defaults = DEFAULT_VIBES[cat] || [];
    setVibeTags(defaults.filter(t => allowed.includes(t)));
  };

  const uploadPhotos = async (businessId: string) => {
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split('.').pop();
      const path = `${businessId}/${Date.now()}.${ext}`;
      const { data } = await supabase.storage.from('business-photos').upload(path, photo);
      if (data) {
        const { data: urlData } = supabase.storage.from('business-photos').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const uploadMenu = async (businessId: string) => {
    if (!menuFile) return null;
    const ext = menuFile.name.split('.').pop();
    const path = `menus/${businessId}/menu.${ext}`;
    const { data } = await supabase.storage.from('business-photos').upload(path, menuFile);
    if (data) {
      const { data: urlData } = supabase.storage.from('business-photos').getPublicUrl(path);
      return urlData.publicUrl;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (account.password !== account.confirm) { setError("Passwords don't match!"); return; }
    if (account.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError('');
    try {
      // Save business details to localStorage so they survive OTP verification
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
      localStorage.setItem('yana_pending_business', JSON.stringify({
        ...form,
        slug,
        email: account.email,
        custom_fields: customFields,
        vibe_tags: vibeTags.join(','),
      }));

      const { error: signUpErr } = await supabase.auth.signUp({ email: account.email, password: account.password });
      if (signUpErr) {
        localStorage.removeItem('yana_pending_business');
        const msg = signUpErr.message.includes('already registered') ? 'An account with this email already exists.' : 'Could not create account. Please try again.';
        throw new Error(msg);
      }

      setShowOtp(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
    setLoading(false);
  };

  const handleOtpVerify = async () => {
    if (otpCode.length !== 6) { setOtpError('Please enter the 6-digit code'); return; }
    setOtpLoading(true); setOtpError('');
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({ email: account.email, token: otpCode, type: 'signup' });
      if (verifyErr) throw verifyErr;
      // Session is now established — save pending business to DB
      const pending = localStorage.getItem('yana_pending_business');
      if (pending) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const payload = JSON.parse(pending);
          const res = await fetch('/api/register-business', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, signup_user_id: session.user.id }),
          });
          if (res.ok) {
            const { business } = await res.json();
            if (business?.id) {
              const [photoUrls, menuUrl] = await Promise.all([uploadPhotos(business.id), uploadMenu(business.id)]);
              if (photoUrls.length > 0 || menuUrl) {
                await fetch('/api/register-business/media', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ business_id: business.id, photos: photoUrls, menu_url: menuUrl }),
                });
              }
            }
            localStorage.removeItem('yana_pending_business');
          }
        }
      }
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Invalid or expired code. Try again.');
    }
    setOtpLoading(false);
  };

  const handleOtpResend = async () => {
    setOtpResending(true); setOtpResent(false);
    await supabase.auth.resend({ type: 'signup', email: account.email });
    setOtpResending(false); setOtpResent(true);
  };

  const canNext = [
    !!(form.name && form.category),
    !!(form.city && form.address),
    !!form.phone,
    true, true,
    !!(account.email && account.password && account.confirm),
  ];

  const handleResend = async () => {
    setResending(true);
    await supabase.auth.resend({ type: 'signup', email: account.email });
    setResending(false);
    setResent(true);
  };

  if (custShowOtp) return (
    <>
      <style>{styles}</style>
      <main className="reg-page">
        <div className="reg-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--white)', marginBottom: '0.75rem' }}>Verify your email</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '0.5rem', lineHeight: '1.6' }}>We sent a 6-digit code to</p>
          <p style={{ color: 'var(--white)', fontWeight: 600, marginBottom: '1.5rem' }}>{custEmail}</p>
          <input
            type="text" inputMode="numeric" maxLength={6}
            value={custOtpCode}
            onChange={e => { setCustOtpCode(e.target.value.replace(/\D/g, '')); setCustOtpError('') }}
            placeholder="000000" autoFocus
            style={{ display: 'block', margin: '0 auto 1rem', width: '100%', maxWidth: '220px', textAlign: 'center', letterSpacing: '0.5em', fontSize: '2rem', fontWeight: 700, background: 'var(--card)', border: `1.5px solid ${custOtpError ? '#f87171' : 'var(--border2)'}`, borderRadius: '12px', color: 'var(--white)', padding: '0.75rem', fontFamily: "'Sora', sans-serif", outline: 'none' }}
          />
          {custOtpError && <p style={{ color: '#f87171', fontSize: '0.88rem', marginBottom: '0.75rem' }}>{custOtpError}</p>}
          <button onClick={handleCustOtpVerify} disabled={custOtpLoading || custOtpCode.length !== 6}
            style={{ display: 'block', margin: '0 auto 1.25rem', width: '100%', maxWidth: '220px', padding: '0.85rem', background: 'var(--red)', border: 'none', borderRadius: '10px', color: '#fff', fontFamily: "'Sora', sans-serif", fontSize: '1rem', fontWeight: 600, cursor: (custOtpLoading || custOtpCode.length !== 6) ? 'default' : 'pointer', opacity: (custOtpLoading || custOtpCode.length !== 6) ? 0.6 : 1 }}>
            {custOtpLoading ? 'Verifying…' : 'Verify Code'}
          </button>
          {custOtpResent ? (
            <p style={{ color: '#4ade80', fontSize: '0.88rem', marginBottom: '1rem' }}>✓ New code sent. Check your inbox.</p>
          ) : (
            <button onClick={handleCustOtpResend} disabled={custOtpResending}
              style={{ background: 'transparent', border: '1.5px solid var(--border2)', borderRadius: '10px', color: 'var(--muted)', fontFamily: "'Sora', sans-serif", fontSize: '0.88rem', padding: '0.65rem 1.4rem', cursor: custOtpResending ? 'default' : 'pointer', marginBottom: '1rem', opacity: custOtpResending ? 0.5 : 1 }}>
              {custOtpResending ? 'Sending…' : 'Resend code'}
            </button>
          )}
          <div style={{ marginTop: '0.5rem' }}>
            <a href="/register" style={{ color: 'var(--muted)', fontSize: '0.82rem', textDecoration: 'none' }}>← Start over</a>
          </div>
        </div>
      </main>
    </>
  );

  if (showOtp) return (
    <>
      <style>{styles}</style>
      <main className="reg-page">
        <div className="reg-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔐</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--white)', marginBottom: '0.75rem' }}>Enter your code</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '0.5rem', lineHeight: '1.6' }}>We sent a 6-digit code to</p>
          <p style={{ color: 'var(--white)', fontWeight: 600, marginBottom: '1.5rem' }}>{account.email}</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
            placeholder="000000"
            autoFocus
            style={{
              display: 'block', margin: '0 auto 1rem',
              width: '100%', maxWidth: '220px', textAlign: 'center',
              letterSpacing: '0.5em', fontSize: '2rem', fontWeight: 700,
              background: 'var(--card)', border: `1.5px solid ${otpError ? '#f87171' : 'var(--border2)'}`,
              borderRadius: '12px', color: 'var(--white)', padding: '0.75rem',
              fontFamily: "'Sora', sans-serif", outline: 'none',
            }}
          />
          {otpError && <p style={{ color: '#f87171', fontSize: '0.88rem', marginBottom: '0.75rem' }}>{otpError}</p>}
          <button
            onClick={handleOtpVerify}
            disabled={otpLoading || otpCode.length !== 6}
            style={{
              display: 'block', margin: '0 auto 1.25rem',
              width: '100%', maxWidth: '220px', padding: '0.85rem',
              background: 'var(--red)', border: 'none', borderRadius: '10px',
              color: '#fff', fontFamily: "'Sora', sans-serif", fontSize: '1rem',
              fontWeight: 600, cursor: (otpLoading || otpCode.length !== 6) ? 'default' : 'pointer',
              opacity: (otpLoading || otpCode.length !== 6) ? 0.6 : 1,
            }}
          >
            {otpLoading ? 'Verifying…' : 'Verify Code'}
          </button>
          {otpResent ? (
            <p style={{ color: '#4ade80', fontSize: '0.88rem', marginBottom: '1rem' }}>✓ New code sent. Check your inbox.</p>
          ) : (
            <button
              onClick={handleOtpResend}
              disabled={otpResending}
              style={{ background: 'transparent', border: '1.5px solid var(--border2)', borderRadius: '10px', color: 'var(--muted)', fontFamily: "'Sora', sans-serif", fontSize: '0.88rem', padding: '0.65rem 1.4rem', cursor: otpResending ? 'default' : 'pointer', marginBottom: '1rem', opacity: otpResending ? 0.5 : 1 }}
            >
              {otpResending ? 'Sending…' : 'Resend code'}
            </button>
          )}
          <div style={{ marginTop: '0.5rem' }}>
            <a href="/register" style={{ color: 'var(--muted)', fontSize: '0.82rem', textDecoration: 'none' }}>← Start over</a>
          </div>
        </div>
      </main>
    </>
  );

  if (submitted) return (
    <>
      <style>{styles}</style>
      <main className="reg-page">
        <div className="reg-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', color: 'var(--white)', marginBottom: '0.75rem' }}>Check your email</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '0.5rem', lineHeight: '1.6' }}>
            We sent a verification link to
          </p>
          <p style={{ color: 'var(--white)', fontWeight: 600, marginBottom: '1.5rem' }}>{account.email}</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '2rem', lineHeight: '1.6' }}>
            Click the link in the email to activate your account. Check your spam folder if you don&apos;t see it.
          </p>
          {resent ? (
            <p style={{ color: '#4ade80', fontSize: '0.88rem', marginBottom: '1.5rem' }}>✓ Verification email resent.</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{ background: 'transparent', border: '1.5px solid var(--border2)', borderRadius: '10px', color: 'var(--muted)', fontFamily: "'Sora', sans-serif", fontSize: '0.88rem', padding: '0.7rem 1.4rem', cursor: resending ? 'default' : 'pointer', marginBottom: '1.5rem', opacity: resending ? 0.5 : 1 }}
            >
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
          <div>
            <a href="/login" style={{ color: 'var(--red)', fontSize: '0.88rem', textDecoration: 'none' }}>← Back to login</a>
          </div>
        </div>
      </main>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <main className="reg-page">
        {/* BRAND */}
        <div className="reg-brand">
          <a href="/">
            <span className="brand-yana">Yana</span>
            <span className="brand-naga">Nagaland</span>
          </a>
          <p>{regMode === 'customer' ? 'Create a free account' : 'List Your Business — It\'s Free'}</p>
        </div>

        {/* MODE TOGGLE */}
        <div className="reg-mode-wrap">
          <button className={`reg-mode-btn${regMode === 'business' ? ' active' : ''}`} onClick={() => setRegMode('business')}>
            🏪 List a Business
          </button>
          <button className={`reg-mode-btn${regMode === 'customer' ? ' active' : ''}`} onClick={() => setRegMode('customer')}>
            👤 Join as Customer
          </button>
        </div>

        {regMode === 'customer' ? (
          <div className="reg-card">
            <div className="step-heading">
              <h2>Create your account</h2>
              <p>Browse, save, and discover businesses across Nagaland.</p>
            </div>
            {/* Google OAuth */}
            <button type="button" className="reg-google-btn" onClick={handleGoogleLogin}>
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <div className="reg-or-divider"><span>or</span></div>

            <form onSubmit={handleCustSubmit} className="step-content" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={custName} onChange={e => setCustName(e.target.value)} placeholder="Your name" required />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={custEmail} onChange={e => setCustEmail(e.target.value)} placeholder="you@email.com" required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={custPassword} onChange={e => setCustPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
              </div>
              {custError && <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem', padding: '10px 14px', background: 'rgba(248,113,113,0.08)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>{custError}</div>}
              <button type="submit" disabled={custLoading}
                style={{ width: '100%', padding: '13px', background: 'var(--red)', border: 'none', borderRadius: '10px', color: '#fff', fontFamily: "'Sora', sans-serif", fontSize: '0.95rem', fontWeight: 700, cursor: custLoading ? 'default' : 'pointer', opacity: custLoading ? 0.65 : 1, marginTop: '8px' }}>
                {custLoading ? 'Creating account…' : 'Create Account →'}
              </button>
              <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                Already have an account? <a href="/login" style={{ color: 'var(--red)', textDecoration: 'none' }}>Sign in</a>
              </p>
            </form>
          </div>
        ) : (
        <>
        {/* STEPPER */}
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-item ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              <div className="step-bubble">{i < step ? '✓' : i + 1}</div>
              <span className="step-label">{s}</span>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        {/* CARD */}
        <div className="reg-card">
          <div className="step-heading">
            <h2>{STEPS[step]}</h2>
            <p>
              {step === 0 && 'Tell us about your business.'}
              {step === 1 && 'Where is your business located?'}
              {step === 2 && 'How can customers reach you?'}
              {step === 3 && 'Fill in details specific to your business type.'}
              {step === 4 && 'Add photos to attract more customers.'}
              {step === 5 && 'Create your account to manage your listing.'}
            </p>
          </div>

          {/* STEP 0: BUSINESS INFO */}
          {step === 0 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Naga Kitchen" />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <div className="cat-grid">
                  {CATEGORIES.filter(c => c !== 'other' && c !== 'service' && c !== 'rental').map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`cat-card ${form.category === c ? 'selected' : ''}`}
                      onClick={() => handleCategoryChange(c)}
                    >
                      <span className="cat-icon">{CATEGORY_ICONS[c] || '🏪'}</span>
                      <span className="cat-label">{CATEGORY_LABELS[c] || c}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`cat-card ${form.category === 'service' ? 'selected' : form.category === 'other' ? 'selected' : ''}`}
                    onClick={() => handleCategoryChange('other')}
                  >
                    <span className="cat-icon">🏪</span>
                    <span className="cat-label">Other</span>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Tell customers what makes your business special..." />
              </div>
              <div className="form-group">
                <label className="form-label">Opening Hours</label>
                <input className="form-input" value={form.opening_hours} onChange={e => update('opening_hours', e.target.value)} placeholder="e.g. Mon–Sat 9am–8pm, Sun Closed" />
              </div>
            </div>
          )}

          {/* STEP 1: LOCATION */}
          {step === 1 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">District *</label>
                <select className="form-select" value={form.city} onChange={e => update('city', e.target.value)}>
                  <option value="">Select district</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Address *</label>
                <input className="form-input" value={form.address} onChange={e => update('address', e.target.value)} placeholder="e.g. New NST Colony, Kohima" />
              </div>
              <div className="form-group">
                <label className="form-label">Nearby Landmark</label>
                <input className="form-input" value={form.landmark} onChange={e => update('landmark', e.target.value)} placeholder="e.g. Opposite NST Bus Stand" />
                <p className="form-note">Landmarks help customers find you faster!</p>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT */}
          {step === 2 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-input" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="9xxxxxxxxx" />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp Number</label>
                <input className="form-input" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="91xxxxxxxxxx (with country code)" />
              </div>
              <div className="form-group">
                <label className="form-label">Website / Facebook / Instagram</label>
                <input className="form-input" value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://facebook.com/yourbusiness" />
              </div>
            </div>
          )}

          {/* STEP 3: DETAILS (CATEGORY-SPECIFIC) */}
          {step === 3 && (
            <div className="step-content">
              {CATEGORY_FIELDS[form.category.toLowerCase()] ? (
                <>
                  <CategoryFields category={form.category} values={customFields} onChange={updateCustom} />
                  <VibeTagsPicker selected={vibeTags} onChange={setVibeTags} category={form.category} />
                </>
              ) : (
                <>
                  <div className="no-fields-msg">
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                    <p>No extra details needed for <strong>{CATEGORY_LABELS[form.category] || form.category}</strong>.</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.3rem' }}>Click Continue to add photos.</p>
                  </div>
                  <VibeTagsPicker selected={vibeTags} onChange={setVibeTags} category={form.category} />
                </>
              )}
            </div>
          )}

          {/* STEP 4: MEDIA */}
          {step === 4 && (
            <div className="step-content">
              <div className="form-group">
                <label className="form-label">Business Photos</label>
                <p className="form-note" style={{ marginBottom: '0.75rem' }}>Businesses with photos get <strong style={{ color: 'var(--red)' }}>3x more views</strong>!</p>
                <label className={`upload-box ${photos.length > 0 ? 'has-file' : ''}`}>
                  <span className="upload-icon">{photos.length > 0 ? '✓' : '📷'}</span>
                  <span>{photos.length > 0 ? `${photos.length} / ${MAX_PHOTOS_NEW} photo${photos.length > 1 ? 's' : ''} selected` : `Click to choose photos (max ${MAX_PHOTOS_NEW})`}</span>
                  <span className="upload-sub">JPG or PNG · Max 10MB each</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => setPhotos(prev => (Array.from(e.target.files || [])).slice(0, MAX_PHOTOS_NEW))}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Menu / Price List / Rate Card</label>
                <label className={`upload-box ${menuFile ? 'has-file' : ''}`}>
                  <span className="upload-icon">{menuFile ? '✓' : '📄'}</span>
                  <span>{menuFile ? menuFile.name : 'Upload PDF or photo (optional)'}</span>
                  <span className="upload-sub">PDF, JPG or PNG · Max 20MB</span>
                  <input type="file" accept=".pdf,image/*" onChange={e => setMenuFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: ACCOUNT */}
          {step === 5 && (
            <div className="step-content">
              <div className="account-info-box">
                <div>🔐</div>
                <div><strong>Almost done!</strong> Create an account to manage your listing — edit details, update photos, and see who&apos;s finding you.</div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" value={account.email} onChange={e => setAccount({ ...account, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={account.password} onChange={e => setAccount({ ...account, password: e.target.value })} placeholder="At least 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input className="form-input" type="password" value={account.confirm} onChange={e => setAccount({ ...account, confirm: e.target.value })} placeholder="Same password again" />
                {account.confirm && account.password !== account.confirm && (
                  <p className="form-note" style={{ color: '#f87171', marginTop: '0.4rem' }}>Passwords don&apos;t match</p>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: 'var(--red)', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.55 }}>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red)', textDecoration: 'none' }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red)', textDecoration: 'none' }}>Privacy Policy</a>
                </span>
              </label>
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          <div className="btn-row">
            {step > 0 && <button className="btn-back" onClick={() => setStep(step - 1)}>← Back</button>}
            {step < 5 ? (
              <button className="btn-next" onClick={() => setStep(step + 1)} disabled={!canNext[step]}>Continue →</button>
            ) : (
              <button className="btn-next" onClick={handleSubmit} disabled={loading || !canNext[5] || account.password !== account.confirm || !termsAccepted}>
                {loading ? 'Creating listing…' : 'Create Listing'}
              </button>
            )}
          </div>
        </div>
        <div className="login-link">Already have an account? <a href="/login">Sign in →</a></div>
        </>
        )}
      </main>
    </>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .reg-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 1.5rem 4rem;
    background: var(--bg);
    position: relative;
  }
  .reg-page::before {
    content: '';
    position: fixed; inset: 0;
    background:
      radial-gradient(ellipse 50% 40% at 15% 10%, rgba(192,57,43,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 85% 85%, rgba(212,160,23,0.03) 0%, transparent 60%);
    pointer-events: none; z-index: 0;
  }

  /* BRAND */
  .reg-brand { text-align: center; margin-bottom: 1.5rem; position: relative; z-index: 1; }

  /* MODE TOGGLE */
  .reg-mode-wrap { display: flex; gap: 0; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 4px; margin-bottom: 2rem; width: 100%; max-width: 480px; position: relative; z-index: 1; }
  .reg-mode-btn { flex: 1; padding: 11px 12px; background: transparent; border: none; border-radius: 9px; font-family: 'Sora', sans-serif; font-size: 0.82rem; font-weight: 500; color: rgba(255,255,255,0.45); cursor: pointer; transition: all 0.2s; }
  .reg-mode-btn.active { background: #1e1e1e; color: #fff; font-weight: 700; }
  .reg-mode-btn:hover:not(.active) { color: rgba(255,255,255,0.7); }
  .reg-brand a { text-decoration: none; display: flex; align-items: baseline; gap: 4px; justify-content: center; }
  .brand-yana { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: var(--white); letter-spacing: 1.5px; }
  .brand-naga { font-size: 0.65rem; letter-spacing: 4px; text-transform: uppercase; color: var(--muted2); }
  .reg-brand p { font-size: 0.8rem; color: var(--muted); margin-top: 0.4rem; letter-spacing: 0.1em; text-transform: uppercase; }

  /* STEPPER */
  .stepper {
    display: flex; align-items: flex-start;
    margin-bottom: 2rem; width: 100%; max-width: 600px;
    position: relative; z-index: 1;
  }
  .step-item { display: flex; flex-direction: column; align-items: center; position: relative; gap: 0.35rem; flex: 1; }
  .step-line { position: absolute; top: 17px; left: 50%; width: 100%; height: 2px; background: var(--border); z-index: 0; }
  .step-item.done .step-line, .step-item.active .step-line { background: rgba(192,57,43,0.4); }
  .step-bubble {
    width: 34px; height: 34px; border-radius: 50%;
    border: 2px solid var(--border2);
    background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.85rem; font-weight: 600; color: var(--muted);
    z-index: 1; position: relative; transition: all 0.3s;
  }
  .step-item.active .step-bubble { border-color: var(--red); color: var(--red); background: var(--red-bg); box-shadow: 0 0 0 4px rgba(192,57,43,0.08); }
  .step-item.done .step-bubble { border-color: var(--red); background: var(--red); color: #fff; }
  .step-label { font-size: 0.72rem; color: var(--muted); text-align: center; white-space: nowrap; transition: color 0.3s; }
  .step-item.active .step-label { color: var(--red); }
  .step-item.done .step-label { color: var(--off); }

  /* CARD */
  .reg-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 18px; padding: 2.25rem;
    width: 100%; max-width: 600px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    position: relative; overflow: hidden; z-index: 1;
  }
  .reg-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--red), transparent);
  }
  .step-heading { margin-bottom: 1.75rem; }
  .step-heading h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--white); margin-bottom: 0.3rem; }
  .step-heading p { color: var(--muted); font-size: 0.87rem; }

  /* GOOGLE BUTTON (customer mode) */
  .reg-google-btn {
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    padding: 12px 16px;
    background: #fff;
    border: 1.5px solid #e0e0e0;
    border-radius: 10px;
    font-family: 'Sora', sans-serif;
    font-size: 0.9rem; font-weight: 600;
    color: #1a1a1a;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
    margin-bottom: 0;
  }
  .reg-google-btn:hover {
    background: #f7f7f7;
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    transform: translateY(-1px);
  }
  .reg-or-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 1.2rem 0;
    color: #444;
    font-size: 0.75rem; letter-spacing: 0.08em;
  }
  .reg-or-divider::before, .reg-or-divider::after {
    content: ''; flex: 1;
    height: 1px; background: rgba(255,255,255,0.08);
  }
  .reg-or-divider span { white-space: nowrap; }

  /* ANIMATIONS */
  @keyframes fieldSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .step-content { animation: fieldSlide 0.25s ease; }

  /* FORM */
  .form-group { margin-bottom: 1.2rem; }
  .form-label {
    display: block; font-size: 0.8rem; color: var(--red);
    letter-spacing: 0.1em; text-transform: uppercase;
    margin-bottom: 0.45rem; font-weight: 600;
  }
  .form-note { font-size: 0.76rem; color: var(--muted); margin-top: 0.35rem; line-height: 1.4; }
  .form-input, .form-select, .form-textarea {
    width: 100%; padding: 0.8rem 1rem;
    background: rgba(0,0,0,0.3);
    border: 1.5px solid var(--border2);
    border-radius: 10px; color: var(--white);
    font-family: 'Sora', sans-serif; font-size: 1rem;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .form-input::placeholder, .form-textarea::placeholder { color: var(--muted2); }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: var(--red);
    box-shadow: 0 0 0 3px rgba(192,57,43,0.1);
  }
  .form-select option { background: var(--bg2); }
  .form-textarea { resize: vertical; min-height: 90px; line-height: 1.55; }

  /* CATEGORY GRID */
  .cat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 8px;
  }
  .cat-card {
    display: flex; flex-direction: column;
    align-items: center; gap: 6px;
    padding: 14px 8px;
    background: rgba(0,0,0,0.2);
    border: 1.5px solid var(--border);
    border-radius: 12px;
    cursor: pointer; transition: all 0.2s;
    font-family: 'Sora', sans-serif;
    color: var(--muted);
  }
  .cat-card:hover {
    border-color: var(--border2);
    background: rgba(255,255,255,0.03);
    color: var(--off);
  }
  .cat-card.selected {
    border-color: var(--red);
    background: var(--red-bg);
    color: var(--white);
    box-shadow: 0 0 0 3px rgba(192,57,43,0.08);
  }
  .cat-icon { font-size: 1.4rem; }
  .cat-label { font-size: 0.7rem; font-weight: 500; text-align: center; line-height: 1.3; }

  /* CATEGORY FIELDS */
  .cat-fields-wrap {
    background: rgba(192,57,43,0.04);
    border: 1px solid rgba(192,57,43,0.12);
    border-radius: 14px; padding: 1.25rem;
    margin-bottom: 1rem;
  }
  .cat-fields-title { font-size: 0.88rem; font-weight: 600; color: var(--red); margin-bottom: 1.25rem; }
  .tags-wrap { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .tag-btn {
    padding: 0.4rem 0.85rem;
    background: rgba(0,0,0,0.25);
    border: 1px solid var(--border2);
    border-radius: 20px; color: var(--muted);
    font-family: 'Sora', sans-serif; font-size: 0.78rem;
    cursor: pointer; transition: all 0.2s;
  }
  .tag-btn:hover { border-color: rgba(192,57,43,0.4); color: var(--off); }
  .tag-btn.selected { background: var(--red-bg); border-color: var(--red); color: var(--red); }

  /* VIBE TAGS */
  .vibe-section {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border);
  }
  .vibe-title {
    font-size: 0.82rem; font-weight: 600; color: var(--gold);
    margin-bottom: 0.75rem;
  }
  .vibe-hint { font-weight: 300; color: var(--muted); font-size: 0.75rem; }
  .vibe-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .vibe-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px;
    background: rgba(0,0,0,0.2);
    border: 1.5px solid var(--border);
    border-radius: 20px;
    color: var(--muted);
    font-family: 'Sora', sans-serif; font-size: 0.78rem;
    cursor: pointer; transition: all 0.2s;
  }
  .vibe-chip:hover {
    border-color: rgba(212,160,23,0.4);
    color: var(--off);
    background: rgba(212,160,23,0.04);
  }
  .vibe-chip.active {
    border-color: var(--gold);
    background: var(--gold-bg);
    color: var(--gold);
  }
  .vibe-emoji { font-size: 0.9rem; }

  /* NO FIELDS */
  .no-fields-msg { text-align: center; padding: 2rem 1rem; color: var(--muted); }
  .no-fields-msg strong { color: var(--white); }

  /* UPLOAD */
  .upload-box {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 0.4rem;
    width: 100%; padding: 1.75rem 1rem;
    border: 2px dashed var(--border2);
    border-radius: 12px; color: var(--muted);
    cursor: pointer; transition: border-color 0.2s, color 0.2s;
    text-align: center;
    font-family: 'Sora', sans-serif; font-size: 0.88rem;
  }
  .upload-box:hover { border-color: var(--red); color: var(--off); }
  .upload-box.has-file { border-color: var(--red); color: var(--red); }
  .upload-icon { font-size: 1.8rem; }
  .upload-sub { font-size: 0.72rem; color: var(--muted2); margin-top: 0.2rem; }

  /* ACCOUNT INFO */
  .account-info-box {
    display: flex; gap: 0.75rem;
    background: var(--red-bg);
    border: 1px solid rgba(192,57,43,0.15);
    border-radius: 10px; padding: 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.85rem; color: var(--muted); line-height: 1.5;
  }
  .account-info-box strong { color: var(--white); }

  /* ERROR */
  .error-msg {
    background: rgba(180,40,40,0.12);
    border: 1px solid rgba(180,40,40,0.3);
    border-radius: 8px; padding: 0.7rem 1rem;
    font-size: 0.85rem; color: #ff8080; margin-top: 1rem;
  }

  /* BUTTONS */
  .btn-row { display: flex; gap: 0.75rem; margin-top: 1.75rem; }
  .btn-back {
    flex: 0 0 auto; padding: 0.85rem 1.4rem;
    background: transparent;
    border: 1.5px solid var(--border2);
    border-radius: 10px; color: var(--muted);
    font-family: 'Sora', sans-serif; font-size: 0.95rem;
    cursor: pointer; transition: border-color 0.2s, color 0.2s;
  }
  .btn-back:hover { border-color: var(--red); color: var(--red); }
  .btn-next {
    flex: 1; padding: 0.85rem;
    background: var(--red);
    border: none; border-radius: 10px;
    color: white; font-family: 'Sora', sans-serif;
    font-size: 1rem; font-weight: 700;
    cursor: pointer; transition: all 0.15s;
    box-shadow: 0 4px 16px rgba(192,57,43,0.25);
  }
  .btn-next:hover:not(:disabled) { background: var(--red2); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(192,57,43,0.35); }
  .btn-next:disabled { opacity: 0.4; cursor: not-allowed; }

  /* LOGIN LINK */
  .login-link { margin-top: 1.5rem; font-size: 0.85rem; color: var(--muted); position: relative; z-index: 1; }
  .login-link a { color: var(--red); text-decoration: none; }
  .login-link a:hover { text-decoration: underline; }

  /* RESPONSIVE */
  @media (max-width: 520px) {
    .reg-page { padding: 2.5rem 1rem 4rem; }
    .reg-brand { margin-bottom: 3rem; }
    .reg-card { padding: 1.5rem 1.1rem; }
    .stepper { margin-bottom: 2.5rem; }
    .step-bubble { width: 42px; height: 42px; font-size: 1rem; }
    .step-line { top: 21px; }
    .step-label { display: none; }
    .cat-grid { grid-template-columns: repeat(4, 1fr); }
  }
`;
