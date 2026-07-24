/**
 * Blood group constants and compatibility data.
 */

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const URGENCY_LEVELS = [
  { value: 'critical', label: 'Critical', color: '#FF1744', description: 'Life-threatening — immediate response needed' },
  { value: 'urgent', label: 'Urgent', color: '#FF9100', description: 'Needed within 6 hours' },
  { value: 'standard', label: 'Standard', color: '#00E676', description: 'Needed within 24 hours' },
];

export const REQUEST_STATUSES = {
  pending_verification: { label: 'Pending Verification', color: '#FF9800' },
  pending: { label: 'Pending', color: '#FF9800' },
  matching: { label: 'Matching Donors', color: '#2196F3' },
  matched: { label: 'Donors Notified', color: '#4CAF50' },
  fulfilled: { label: 'Fulfilled', color: '#00E676' },
  cancelled: { label: 'Cancelled', color: '#9E9E9E' },
  expired: { label: 'Expired', color: '#F44336' },
};

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
  'Chandigarh', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
];

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];
