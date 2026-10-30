import React, { useState, useEffect } from 'react';
import {
  Building2,
  Store,
  ShoppingBag,
  Save,
  Send,
  Calculator,
  Layers,
  MapPin,
  Tag,
  Info,
  AlertCircle,
} from 'lucide-react';
import GPSCapture from '../gps/GPSCapture';
import GeofenceWarning from '../gps/GeofenceWarning';
import PhotoUpload from './PhotoUpload';
import AutocompleteInput, { seedSuggestions } from './AutocompleteInput';
import useGeolocation from '../../hooks/useGeolocation';
import { saveFormState, loadFormState, clearFormState } from '../../utils/autosave';

const FORM_STORAGE_KEY = 'zebra_capture_form';

// Seed default suggestions for BOP autocomplete fields on first use
seedSuggestions('business_type', [
  'Sole Proprietorship',
  'Limited Liability Company (Ltd)',
  'Partnership',
  'Informal / Micro Enterprise',
  'Cooperative / Association',
  'Joint Venture',
  'Non-Profit Organization',
  'Franchise',
]);

seedSuggestions('business_category', [
  'Retail & Provisions (Class A / B)',
  'Hospitality, Restaurant & Chop Bar',
  'Financial, Banking & MoMo Agents',
  'Pharmacy, Chemist & Health Facility',
  'Artisans, Workshop & Auto Mechanics',
  'Manufacturing & Agro-Processing',
  'Private School & Day Care',
  'Wholesale & Distribution',
  'ICT & Telecommunications',
  'Logistics & Transport',
  'Construction & Building Materials',
  'Beauty Salon & Barber Shop',
  'Fuel Station & Gas Dealer',
  'Printing & Publishing',
]);

seedSuggestions('services_provided', [
  'Mobile Money transactions',
  'Sale of electrical appliances',
  'Auto brake repairs',
  'General provisions and groceries',
  'Restaurant and food services',
  'Tailoring and dressmaking',
  'Hairdressing and beauty services',
  'Pharmacy and drug retail',
  'Building materials and hardware',
]);

export default function RecordForm({ initialRecord, onSubmit, isSubmitting }) {
  const geo = useGeolocation();

  const [moduleType, setModuleType] = useState(initialRecord?.module || 'property');
  const [ghanaPostAddress, setGhanaPostAddress] = useState(initialRecord?.ghana_post_address || '');

  // Core Ratepayer & Contact Details
  const [ownerName, setOwnerName] = useState(initialRecord?.owner_name || '');
  const [ownerPhone, setOwnerPhone] = useState(initialRecord?.owner_phone || '');

  // Module Specific & Extended Attributes
  const [attributes, setAttributes] = useState(initialRecord?.attributes || {});

  // Photos
  const [photos, setPhotos] = useState(initialRecord?.photos || []);

  // Form validation errors state (for submit validation)
  const [formErrors, setFormErrors] = useState({});

  // Warnings
  const [geofenceWarning, setGeofenceWarning] = useState(null);

  // Clear specific field error when user edits it
  const updateFieldError = (field) => {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Load from autosave on initial mount if not editing an existing record
  useEffect(() => {
    if (!initialRecord) {
      const saved = loadFormState(FORM_STORAGE_KEY);
      if (saved) {
        if (saved.moduleType) setModuleType(saved.moduleType);
        if (saved.ownerName) setOwnerName(saved.ownerName);
        if (saved.ownerPhone) setOwnerPhone(saved.ownerPhone);
        if (saved.ghanaPostAddress) setGhanaPostAddress(saved.ghanaPostAddress);
        if (saved.attributes) setAttributes(saved.attributes);
        if (saved.latitude && saved.longitude) {
          geo.setManualPosition(saved.latitude, saved.longitude, saved.accuracy || 15);
        }
      }
    }
  }, []);

  // Autosave periodically
  useEffect(() => {
    if (!initialRecord) {
      saveFormState(FORM_STORAGE_KEY, {
        moduleType,
        ownerName,
        ownerPhone,
        ghanaPostAddress,
        attributes,
        latitude: geo.latitude,
        longitude: geo.longitude,
        accuracy: geo.accuracy,
      });
    }
  }, [moduleType, ownerName, ownerPhone, ghanaPostAddress, attributes, geo.latitude, geo.longitude]);

  const handleAttributeChange = (key, val) => {
    setAttributes((prev) => ({ ...prev, [key]: val }));
    updateFieldError(key);
  };

  const handleAddPhoto = (photoObj) => {
    setPhotos((prev) => [...prev, photoObj]);
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForSubmit = () => {
    const errors = {};

    if (geo.latitude == null || geo.longitude == null) {
      errors.gps = 'GPS coordinates are mandatory. Please capture device GPS or set a manual pin.';
    }

    if (!ownerName || !ownerName.trim()) {
      errors.owner_name = "Ratepayer's Name is required";
    }

    if (!ownerPhone || !ownerPhone.trim()) {
      errors.owner_phone = 'Phone number is required';
    } else {
      const cleanPhone = ownerPhone.replace(/[\s-]/g, '');
      if (cleanPhone.length < 9) {
        errors.owner_phone = 'Please enter a valid phone number (at least 9 digits)';
      }
    }

    if (moduleType === 'property') {
      if (!attributes.property_address || !attributes.property_address.trim()) {
        errors.property_address = 'Property address (House / Plot No.) is required';
      }
      if (!attributes.structural_type || !attributes.structural_type.trim()) {
        errors.structural_type = 'Structural / construction type is required';
      }
    } else if (moduleType === 'business') {
      if (!attributes.business_type || !attributes.business_type.trim()) {
        errors.business_type = 'Business type is required';
      }
      if (!attributes.business_category || !attributes.business_category.trim()) {
        errors.business_category = 'Business category (Fee-Fixing Class) is required';
      }
      if (!attributes.services_provided || !attributes.services_provided.trim()) {
        errors.services_provided = 'Services provided / goods description is required';
      }
    } else if (moduleType === 'market_stall') {
      if (!attributes.market_name || !attributes.market_name.trim()) {
        errors.market_name = 'Market / center name is required';
      }
      if (!attributes.stall_number || !attributes.stall_number.trim()) {
        errors.stall_number = 'Stall / shed / store number is required';
      }
      if (!attributes.commodity || !attributes.commodity.trim()) {
        errors.commodity = 'Commodity / trade description is required';
      }
    }

    return errors;
  };

  const handleFormSubmit = (status) => {
    if (status === 'submitted') {
      const errors = validateForSubmit();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } else {
      // Draft mode: only checks GPS coordinates
      if (geo.latitude == null || geo.longitude == null) {
        alert('Please capture or select the GPS location before saving a draft.');
        return;
      }
    }

    setFormErrors({});

    const payload = {
      module: moduleType,
      latitude: geo.latitude,
      longitude: geo.longitude,
      altitude: geo.altitude,
      accuracy_m: geo.accuracy,
      capture_method: geo.captureMethod || 'device-gps',
      ghana_post_address: ghanaPostAddress || null,
      owner_name: ownerName?.trim() || null,
      owner_phone: ownerPhone?.trim() || null,
      owner_id_type: null,
      owner_id_number: null,
      attributes,
      status,
      photos,
    };

    onSubmit(payload, () => {
      clearFormState(FORM_STORAGE_KEY);
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Missing Required Fields Alert Banner */}
      {Object.keys(formErrors).length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <h4 className="font-bold text-red-900">Submission Blocked — Mandatory Fields Required</h4>
            <p className="mt-0.5 text-red-700">
              Ga South Municipal Assembly standards require all core data (GPS, ratepayer details, and category specifications) to be fully entered before submitting for Supervisor review.
            </p>
            {formErrors.gps && (
              <p className="mt-1 font-semibold text-red-800 underline">⚠️ {formErrors.gps}</p>
            )}
          </div>
        </div>
      )}

      {/* Module Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200">
        <button
          type="button"
          onClick={() => setModuleType('property')}
          className={`py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            moduleType === 'property'
              ? 'bg-white text-primary-700 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Property Rate</span>
        </button>

        <button
          type="button"
          onClick={() => setModuleType('business')}
          className={`py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            moduleType === 'business'
              ? 'bg-white text-primary-700 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Business (BOP)</span>
        </button>

        <button
          type="button"
          onClick={() => setModuleType('market_stall')}
          className={`py-2.5 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            moduleType === 'market_stall'
              ? 'bg-white text-primary-700 shadow-sm font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Market Stall / Toll</span>
        </button>
      </div>

      {/* GPS Capture Card (Top Priority) */}
      <GPSCapture
        latitude={geo.latitude}
        longitude={geo.longitude}
        accuracy={geo.accuracy}
        altitude={geo.altitude}
        captureMethod={geo.captureMethod}
        capturing={geo.capturing}
        readingCount={geo.readingCount}
        error={geo.error}
        onCapture={geo.captureLocation}
        onAverage={() => geo.averageReadings(5)}
        onManualSelect={(lat, lng) => geo.setManualPosition(lat, lng, 15)}
        ghanaPostAddress={ghanaPostAddress}
        onGhanaPostChange={setGhanaPostAddress}
      />

      {/* Geofence Alert */}
      {geofenceWarning && (
        <GeofenceWarning
          warning={geofenceWarning}
          onDismiss={() => setGeofenceWarning(null)}
        />
      )}

      {/* Common Section: Ratepayer & Geographic Identification */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2 flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary-600" />
          Ratepayer & Geographic Location Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ratepayer's Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Nii Armah Mensah / Amanfro Royal Family"
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value);
                updateFieldError('owner_name');
              }}
              className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-1 focus:outline-none transition-colors ${
                formErrors.owner_name
                  ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                  : 'border-gray-300 focus:ring-primary-500'
              }`}
            />
            {formErrors.owner_name && (
              <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.owner_name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 0244123456"
              value={ownerPhone}
              onChange={(e) => {
                setOwnerPhone(e.target.value);
                updateFieldError('owner_phone');
              }}
              className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-1 focus:outline-none transition-colors ${
                formErrors.owner_phone
                  ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                  : 'border-gray-300 focus:ring-primary-500'
              }`}
            />
            {formErrors.owner_phone && (
              <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.owner_phone}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ratepayer Group / Classification
            </label>
            <select
              value={attributes.groups || 'individual_residential'}
              onChange={(e) => handleAttributeChange('groups', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-1 focus:ring-primary-500 focus:outline-none"
            >
              <option value="individual_residential">Individual / Residential Landlord</option>
              <option value="commercial_entity">Commercial / Corporate Entity</option>
              <option value="traders_association">Traders / Market Association</option>
              <option value="faith_based_ngo">Faith-Based / NGO / Educational</option>
              <option value="government_parastatal">Government / State Parastatal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Prominent Landmark
            </label>
            <input
              type="text"
              placeholder="e.g. Near Amanfro Toll Booth / Behind Galilea Total Station"
              value={attributes.landmark || ''}
              onChange={(e) => handleAttributeChange('landmark', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Street Name
            </label>
            <input
              type="text"
              placeholder="e.g. Winneba - Kasoa Main Highway / Top Town Road"
              value={attributes.street_name || ''}
              onChange={(e) => handleAttributeChange('street_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Collection Area
            </label>
            <input
              type="text"
              placeholder="e.g. Ngleshie Amanfro / Galilea / Iron City"
              value={attributes.collection_area || ''}
              onChange={(e) => handleAttributeChange('collection_area', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Sub Collection Area
            </label>
            <input
              type="text"
              placeholder="e.g. Amanfro Town / American Town / Christian Centre"
              value={attributes.sub_collection_area || ''}
              onChange={(e) => handleAttributeChange('sub_collection_area', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Property Rate Module Specific Fields */}
      {moduleType === 'property' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" />
              Property Identification
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                UPN (Unique Parcel Number)
              </label>
              <input
                type="text"
                placeholder="e.g. 01-042-019-002"
                value={attributes.upn || ''}
                onChange={(e) => handleAttributeChange('upn', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono uppercase focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Property Address (House / Plot No.) *
              </label>
              <input
                type="text"
                placeholder="e.g. Hse No. F.124/2, Plot 16"
                value={attributes.property_address || ''}
                onChange={(e) => handleAttributeChange('property_address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-1 focus:outline-none transition-colors ${
                  formErrors.property_address
                    ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
              />
              {formErrors.property_address && (
                <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.property_address}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Structural / Construction Type *
              </label>
              <select
                value={attributes.structural_type || ''}
                onChange={(e) => handleAttributeChange('structural_type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm bg-white focus:ring-1 focus:outline-none transition-colors ${
                  formErrors.structural_type
                    ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
              >
                <option value="">-- Select Structural / Construction Type --</option>
                <option value="Single Storey Sandcrete / Block">Single Storey Sandcrete / Block</option>
                <option value="Multi-Storey Commercial Block">Multi-Storey Commercial Block</option>
                <option value="Multi-Storey Residential Flats">Multi-Storey Residential Flats</option>
                <option value="Traditional Compound House">Traditional Compound House</option>
                <option value="Detached Bungalow / Villa">Detached Bungalow / Villa</option>
                <option value="Semi-Detached House">Semi-Detached House</option>
                <option value="Metal Container / Kiosk">Metal Container / Kiosk</option>
                <option value="Wooden Shed / Temporary Structure">Wooden Shed / Temporary Structure</option>
                <option value="Warehouse / Industrial Bay">Warehouse / Industrial Bay</option>
              </select>
              {formErrors.structural_type && (
                <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.structural_type}</p>
              )}
            </div>
          </div>

          {/* Budget Director-only fields notice */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-semibold">Valuation & Rate Assessment</span> — Property
              specifications (Valuation Number, Use Code, Rateable Value, Rate Impost) will be
              entered by the <span className="font-bold">Budget Director</span> during final
              authorization review.
            </div>
          </div>
        </div>
      )}

      {/* Business Operating Permit (BOP) Specific Fields */}
      {moduleType === 'business' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2 flex items-center gap-2">
            <Store className="w-4 h-4 text-primary-600" />
            Business Operating Permit (BOP) Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <AutocompleteInput
                fieldKey="business_type"
                label="Business Type *"
                required
                placeholder="e.g. Sole Proprietorship, Limited Liability..."
                value={attributes.business_type || ''}
                onChange={(val) => handleAttributeChange('business_type', val)}
                error={formErrors.business_type}
              />
            </div>

            <div>
              <AutocompleteInput
                fieldKey="business_category"
                label="Business Category (Fee-Fixing Class) *"
                required
                placeholder="e.g. Retail & Provisions, Hospitality..."
                value={attributes.business_category || ''}
                onChange={(val) => handleAttributeChange('business_category', val)}
                error={formErrors.business_category}
              />
            </div>

            <div className="sm:col-span-2">
              <AutocompleteInput
                fieldKey="services_provided"
                label="Service(s) Provided / Goods Sold *"
                required
                placeholder="e.g. Mobile Money transactions, Sale of electrical appliances..."
                value={attributes.services_provided || ''}
                onChange={(val) => handleAttributeChange('services_provided', val)}
                error={formErrors.services_provided}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Situated at Property Address
              </label>
              <input
                type="text"
                placeholder="e.g. Shop 4, Amanfro Station Road / Galilea Market"
                value={attributes.property_address || ''}
                onChange={(e) => handleAttributeChange('property_address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Host Property UPN (if known)
              </label>
              <input
                type="text"
                placeholder="e.g. 05-012-004-008"
                value={attributes.upn || ''}
                onChange={(e) => handleAttributeChange('upn', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono uppercase focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Market Stall Module */}
      {moduleType === 'market_stall' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm border-b border-gray-100 pb-2 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary-600" />
            Market Stall & Toll Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Market / Center Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kasoa New Market / Amanfro Community Market / Galilea Market"
                value={attributes.market_name || ''}
                onChange={(e) => handleAttributeChange('market_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-1 focus:outline-none transition-colors ${
                  formErrors.market_name
                    ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
              />
              {formErrors.market_name && (
                <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.market_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Stall / Shed / Store Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Block B, Shed 14"
                value={attributes.stall_number || ''}
                onChange={(e) => handleAttributeChange('stall_number', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-1 focus:outline-none transition-colors ${
                  formErrors.stall_number
                    ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
              />
              {formErrors.stall_number && (
                <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.stall_number}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Commodity / Trade Description *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vegetables, Provisions, Textiles"
                value={attributes.commodity || ''}
                onChange={(e) => handleAttributeChange('commodity', e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-1 focus:outline-none transition-colors ${
                  formErrors.commodity
                    ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
              />
              {formErrors.commodity && (
                <p className="text-xs text-red-600 mt-1 font-medium">{formErrors.commodity}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Toll / Rent Category
              </label>
              <select
                value={attributes.rent_category || 'daily_toll'}
                onChange={(e) => handleAttributeChange('rent_category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:ring-1 focus:ring-primary-500 focus:outline-none"
              >
                <option value="daily_toll">Daily Market Toll</option>
                <option value="monthly_rent">Monthly Lockable Store</option>
                <option value="annual_lease">Annual Shed Lease</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <PhotoUpload
          photos={photos}
          onAddPhoto={handleAddPhoto}
          onRemovePhoto={handleRemovePhoto}
          maxPhotos={4}
        />
      </div>

      {/* Action Submit Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleFormSubmit('draft')}
          className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>Save as Draft</span>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleFormSubmit('submitted')}
          className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>Submit for Review</span>
        </button>
      </div>
    </div>
  );
}
