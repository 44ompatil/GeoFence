import { useState, useEffect, useRef } from 'react';
import { X, Camera, ChevronDown } from 'lucide-react';
import ModalPortal from '../common/ModalPortal';

export default function PetModal({
  isOpen,
  onClose,
  onSave,
  editPet = null,
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState(3);
  const [photo, setPhoto] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editPet) {
      setName(editPet.name || '');
      setType(editPet.type || editPet.species || 'Dog');
      setBreed(editPet.breed || '');
      setAge(editPet.age !== undefined ? editPet.age : 3);
      setPhoto(editPet.photo || null);
      setPhotoName(editPet.photoName || (editPet.photo ? `${editPet.name.toLowerCase()}_profile.jpg` : ''));
    } else {
      setName('');
      setType('Dog');
      setBreed('');
      setAge(2);
      setPhoto(null);
      setPhotoName('');
    }
    setErrors({});
  }, [editPet, isOpen]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhoto(reader.result);
        setPhotoName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Pet name is required';
    if (!type || type === 'Select type') newErrors.type = 'Pet type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const petData = {
      ...(editPet || {}),
      name: name.trim(),
      type,
      species: type,
      breed: breed.trim() || (type === 'Dog' ? 'Mixed Breed' : 'Domestic Shorthair'),
      age: Number(age),
      photo,
      photoName,
      initial: name.trim().charAt(0).toUpperCase(),
      color: editPet?.color || '#B8865B',
      status: editPet?.status || 'Safe',
      riskLevel: editPet?.riskLevel || 'LOW',
      heading: editPet?.heading || 'NE',
      speed: editPet?.speed || '0.0 km/h',
      zone: editPet?.zone || 'Home Zone',
      mapCoords: editPet?.mapCoords || { x: 30 + Math.random() * 25, y: 32 + Math.random() * 20 },
      collarBattery: editPet?.collarBattery || 90,
    };

    onSave(petData);
  };

  const isEdit = Boolean(editPet);

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      <div className="w-full rounded-3xl bg-[#FAFBF7] p-6 sm:p-7 shadow-2xl border border-gray-200/80 overflow-y-auto max-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              {isEdit ? 'Edit Pet' : 'Add Pet'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {isEdit
                ? `Update ${name || 'pet'}'s profile and configuration.`
                : 'Add a new pet to your GeoFence account.'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl border border-gray-200 bg-white p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Pet Photo Upload / Preview */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Pet Photo
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />

            {photo ? (
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <img
                    src={photo}
                    alt={name || 'Pet'}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100"
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                      {photoName || 'pet_photo.jpg'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {breed || type} • Photo uploaded
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200/90 bg-white p-5 text-center cursor-pointer hover:border-gray-300 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 group-hover:bg-gray-200 transition-colors">
                  <Camera className="h-5 w-5" />
                </div>
                <p className="mt-2 text-xs sm:text-sm font-semibold text-gray-800">
                  Upload photo
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  JPG, PNG up to 5MB
                </p>
              </div>
            )}
          </div>

          {/* Row 1: Pet Name and Pet Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Pet Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                placeholder="e.g. Max"
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                  errors.name
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-gray-200 focus:border-[#006C3B] focus:ring-[#006C3B]'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Pet Type <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    if (errors.type) setErrors({ ...errors, type: null });
                  }}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-[#006C3B] focus:outline-none focus:ring-1 focus:ring-[#006C3B] cursor-pointer"
                >
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              {errors.type && (
                <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.type}</p>
              )}
            </div>
          </div>

          {/* Row 2: Breed and Age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Breed
              </label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="e.g. Golden Retriever"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-[#006C3B] focus:outline-none focus:ring-1 focus:ring-[#006C3B]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Age</label>
                <span className="text-xs font-bold text-gray-700">
                  {age} {age === 1 ? 'year' : 'years'}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-1.5 h-[38px]">
                <span className="text-[11px] font-semibold text-gray-400">0</span>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full accent-[#005A36] cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-gray-400">30</span>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#0B6B46] px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#03542C] transition-colors cursor-pointer"
            >
              {isEdit ? 'Save Changes' : 'Add Pet'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
