'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { ALL_AMENITIES, type Property, type PropertyPhoto } from '@/lib/types';
import { todayISODate } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Check, Loader2, Upload, X, Image as ImageIcon, Youtube, Hash, MapPin } from 'lucide-react';
import type { User } from '@/lib/types';
import type { PincodeLocation } from '@/lib/pincode';
import { PincodeLookupField } from '@/components/crm/PincodeLookupField';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

const STEPS = ['Property Details', 'Property Specs', 'Location', 'RERA & Developer', 'Features & Media', 'Listing Info'];
const PROPERTY_TYPES = ['Apartment', 'Villa', 'Penthouse', 'Commercial', 'Plot', 'Studio'];
const AGE_OPTIONS = ['New', '0-5', '5-10', '10-20', '20+'];
const FACING_OPTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const FURNISH_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];

interface FormData {
  propertyId: string;
  title: string; propertyType: string; bedrooms: string; bathrooms: string; carpetArea: string;
  price: string; priceUnit: string; floorNumber: string; totalFloors: string;
  ageOfProperty: string; facing: string; furnishing: string;
  locality: string; city: string; pincode: string; state: string; fullAddress: string; landmark: string;
  latitude: string; longitude: string;
  reraNumber: string; developerName: string; projectName: string; projectReraNumber: string;
  contactPerson: string; contactPhone: string; contactEmail: string; contactDesignation: string;
  description: string; youtubeUrl: string; amenities: string[];
  listedDate: string; assignedToId: string;
}

const defaultForm: FormData = {
  propertyId: '', title: '', propertyType: 'Apartment', bedrooms: '', bathrooms: '', carpetArea: '',
  price: '', priceUnit: 'Lakhs', floorNumber: '', totalFloors: '',
  ageOfProperty: '', facing: '', furnishing: '',
  locality: '', city: '', pincode: '', state: '', fullAddress: '', landmark: '',
  latitude: '', longitude: '',
  reraNumber: '', developerName: '', projectName: '', projectReraNumber: '',
  contactPerson: '', contactPhone: '', contactEmail: '', contactDesignation: '',
  description: '', youtubeUrl: '', amenities: [],
  listedDate: '', assignedToId: '',
};

export function PropertyForm() {
  const { user, showPropertyForm, editingProperty, closePropertyForm } = useAppStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<PropertyPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPropertyForm) {
      setStep(0);
      setErrors({});
      if (editingProperty) {
        setForm({
          propertyId: editingProperty.propertyId || '',
          title: editingProperty.title, propertyType: editingProperty.propertyType,
          bedrooms: String(editingProperty.bedrooms || ''), bathrooms: String(editingProperty.bathrooms || ''),
          carpetArea: String(editingProperty.carpetArea || ''), price: String(editingProperty.price),
          priceUnit: editingProperty.priceUnit, floorNumber: String(editingProperty.floorNumber || ''),
          totalFloors: String(editingProperty.totalFloors || ''),
          ageOfProperty: editingProperty.ageOfProperty || '', facing: editingProperty.facing || '',
          furnishing: editingProperty.furnishing || '',
          locality: editingProperty.locality, city: editingProperty.city,
          pincode: editingProperty.pincode || '', state: editingProperty.state || '', fullAddress: editingProperty.fullAddress,
          landmark: editingProperty.landmark || '',
          latitude: editingProperty.latitude ? String(editingProperty.latitude) : '',
          longitude: editingProperty.longitude ? String(editingProperty.longitude) : '',
          reraNumber: editingProperty.reraNumber || '', developerName: editingProperty.developerName || '',
          projectName: editingProperty.projectName || '', projectReraNumber: editingProperty.projectReraNumber || '',
          contactPerson: editingProperty.contactPerson || '', contactPhone: editingProperty.contactPhone || '',
          contactEmail: editingProperty.contactEmail || '', contactDesignation: editingProperty.contactDesignation || '',
          description: editingProperty.description || '',
          youtubeUrl: editingProperty.youtubeUrl || '',
          amenities: editingProperty.amenities?.map(a => a.amenity) || [],
          listedDate: editingProperty.listedDate?.split('T')[0] || todayISODate(),
          assignedToId: editingProperty.assignedToId || user?.id || '',
        });
        setExistingPhotos(editingProperty.photos || []);
      } else {
        setForm({ ...defaultForm, listedDate: todayISODate(), assignedToId: user?.id || '' });
        setExistingPhotos([]);
      }
      setPhotos([]);
      if (user?.role === 'ADMIN') {
        fetch('/api/users?userId=' + user.id).then(r => r.json()).then(d => setAgents(d.users || [])).catch(() => {});
      }
    }
  }, [showPropertyForm, editingProperty, user]);

  const set = (key: keyof FormData, val: string | string[]) => setForm(f => ({ ...f, [key]: val }));

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.title.trim()) e.title = 'Title is required';
      if (!form.price || isNaN(Number(form.price))) e.price = 'Valid price required';
    }
    if (step === 2) {
      if (!form.locality.trim()) e.locality = 'Locality required';
      if (!form.city.trim()) e.city = 'City required';
      if (!form.fullAddress.trim()) e.fullAddress = 'Address required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setPhotos(prev => [...prev, ev.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const payload: any = {
        userId: user?.id,
        propertyId: form.propertyId.trim() || null,
        title: form.title, propertyType: form.propertyType,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        carpetArea: form.carpetArea ? parseFloat(form.carpetArea) : null,
        price: parseFloat(form.price), priceUnit: form.priceUnit,
        floorNumber: form.floorNumber ? parseInt(form.floorNumber) : null,
        totalFloors: form.totalFloors ? parseInt(form.totalFloors) : null,
        ageOfProperty: form.ageOfProperty || null, facing: form.facing || null,
        furnishing: form.furnishing || null,
        locality: form.locality, city: form.city, pincode: form.pincode || null, state: form.state || null,
        fullAddress: form.fullAddress, landmark: form.landmark || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        reraNumber: form.reraNumber || null, developerName: form.developerName || null,
        projectName: form.projectName || null, projectReraNumber: form.projectReraNumber || null,
        contactPerson: form.contactPerson || null, contactPhone: form.contactPhone || null,
        contactEmail: form.contactEmail || null, contactDesignation: form.contactDesignation || null,
        description: form.description || null,
        youtubeUrl: form.youtubeUrl.trim() || null,
        amenities: form.amenities,
        listedDate: form.listedDate,
        assignedToId: form.assignedToId || user?.id,
        status: editingProperty?.status || 'Active',
        newPhotos: photos,
      };
      if (editingProperty) payload.id = editingProperty.id;
      const method = editingProperty ? 'PUT' : 'POST';
      await fetch('/api/properties', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      closePropertyForm();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const Field = ({ label, name, type = 'text', placeholder, colSpan = 1 }: { label: string; name: keyof FormData; type?: string; placeholder?: string; colSpan?: number }) => (
    <div className={colSpan === 2 ? 'col-span-1 sm:col-span-2' : 'min-w-0'}>
      <Label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</Label>
      <Input type={type} value={form[name] as string} onChange={e => set(name, e.target.value)} placeholder={placeholder}
        className={cn('bg-muted border-border text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500/50', errors[name] && 'border-rose-500')} />
      {errors[name] && <p className="text-[10px] text-rose-400 mt-0.5">{errors[name]}</p>}
    </div>
  );

  const SelectField = ({ label, name, options, placeholder }: { label: string; name: keyof FormData; options: string[]; placeholder: string }) => (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</Label>
      <Select value={form[name] as string} onValueChange={v => set(name, v)}>
        <SelectTrigger className="border-border bg-muted text-foreground"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={showPropertyForm} onOpenChange={open => { if (!open) closePropertyForm(); }}>
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-hidden p-0 bg-popover border-border">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg font-bold text-foreground pr-8">
            {editingProperty ? 'Edit Property' : 'Add New Property'}
          </DialogTitle>
        </DialogHeader>

        {/* Step Tracker */}
        <div className="px-6 pt-2 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 min-w-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all flex-shrink-0',
                    i < step ? 'step-completed text-foreground' : i === step ? 'step-active text-cyan-400' : 'step-pending text-muted-foreground')}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={cn('text-[10px] font-medium hidden lg:block truncate', i === step ? 'text-cyan-400' : 'text-muted-foreground')}>{s}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Steps */}
        <div className="p-6 pt-4 space-y-4 max-h-[55vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1 block">
                  <Hash className="w-3 h-3" /> Property ID
                </Label>
                <Input value={form.propertyId} onChange={e => set('propertyId', e.target.value)} placeholder="Property ID"
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500/50" />
              </div>
              <Field label="Property Title *" name="title" placeholder="Property title" colSpan={1} />
              <SelectField label="Property Type" name="propertyType" options={PROPERTY_TYPES} placeholder="Select type" />
              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Bedrooms" name="bedrooms" type="number" placeholder="Bedrooms" />
                <Field label="Bathrooms" name="bathrooms" type="number" placeholder="Bathrooms" />
              </div>
              <Field label="Carpet Area (sq.ft)" name="carpetArea" type="number" placeholder="Area" />
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Price *</Label>
                <div className="flex gap-2">
                  <Input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="Price"
                    className={cn('flex-1 bg-muted border-border text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500/50', errors.price && 'border-rose-500')} />
                  <Select value={form.priceUnit} onValueChange={v => set('priceUnit', v)}>
                    <SelectTrigger className="w-28 border-border bg-muted text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Lakhs">Lakhs</SelectItem><SelectItem value="Crore">Crore</SelectItem></SelectContent>
                  </Select>
                </div>
                {errors.price && <p className="text-[10px] text-rose-400 mt-0.5">{errors.price}</p>}
              </div>
              <Field label="Floor Number" name="floorNumber" type="number" placeholder="Floor" />
              <Field label="Total Floors" name="totalFloors" type="number" placeholder="Total floors" />
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Age of Property" name="ageOfProperty" options={AGE_OPTIONS} placeholder="Select age" />
              <SelectField label="Facing Direction" name="facing" options={FACING_OPTIONS} placeholder="Select facing" />
              <SelectField label="Furnishing" name="furnishing" options={FURNISH_OPTIONS} placeholder="Select" />
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PincodeLookupField
                value={form.pincode}
                onChange={(pincode) => set('pincode', pincode)}
                onResolved={(loc: PincodeLocation) => {
                  setForm((f) => ({
                    ...f,
                    city: loc.city || f.city,
                    locality: loc.locality || f.locality,
                    state: loc.state || f.state,
                  }));
                }}
                onCoordinates={(lat, lng) => {
                  setForm((f) => ({ ...f, latitude: String(lat), longitude: String(lng) }));
                }}
                inputClassName="bg-muted border-border text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500/50 w-full px-3 py-2 rounded-md text-sm outline-none"
              />
              <Field label="State" name="state" placeholder="Auto-filled from pincode" />
              <Field label="Locality / Area *" name="locality" placeholder="Locality" />
              <Field label="City *" name="city" placeholder="City" />
              <Field label="Landmark" name="landmark" placeholder="Landmark" />
              <div className="col-span-1 sm:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Full Address *</Label>
                <Textarea value={form.fullAddress} onChange={e => set('fullAddress', e.target.value)} placeholder="Full address" rows={3}
                  className={cn('bg-muted border-border text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500/50', errors.fullAddress && 'border-rose-500')} />
                {errors.fullAddress && <p className="text-[10px] text-rose-400 mt-0.5">{errors.fullAddress}</p>}
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1 block">
                  <MapPin className="w-3 h-3" /> Mark Location on Map (click to place pin)
                </Label>
                <div className="rounded-xl overflow-hidden border border-border h-52">
                  <MapPicker
                    center={[form.latitude ? parseFloat(form.latitude) : 18.5204, form.longitude ? parseFloat(form.longitude) : 73.8567]}
                    onPositionChange={(lat, lng) => {
                      setForm(f => ({ ...f, latitude: String(lat), longitude: String(lng) }));
                    }}
                  />
                </div>
                {(form.latitude || form.longitude) && (
                  <p className="text-[10px] text-muted-foreground mt-1">{form.latitude}, {form.longitude}</p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="RERA Number" name="reraNumber" placeholder="RERA number" />
              <Field label="Developer / Builder" name="developerName" placeholder="Developer name" />
              <Field label="Project / Society" name="projectName" placeholder="Project name" />
              <Field label="Project RERA No." name="projectReraNumber" placeholder="" />
              <Field label="Contact Person" name="contactPerson" placeholder="Contact person" />
              <Field label="Contact Phone" name="contactPhone" placeholder="Phone" />
              <Field label="Contact Email" name="contactEmail" type="email" placeholder="Email" />
              <Field label="Designation" name="contactDesignation" placeholder="Designation" />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Description</Label>
                <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the property..." rows={3}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500/50" />
              </div>

              {/* YouTube Video Link */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5 block">
                  <Youtube className="w-3.5 h-3.5 text-rose-400" /> YouTube Video Link
                </Label>
                <div className="relative">
                  <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..."
                    className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500/50" />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5 block">
                  <ImageIcon className="w-3.5 h-3.5" /> Property Photos
                </Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {existingPhotos.map(p => (
                    <div key={p.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border group">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border group">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} type="button"
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 w-full rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-cyan-400 hover:border-cyan-500/30 transition-colors text-sm">
                  <Upload className="w-4 h-4" /> Upload Photos
                </button>
              </div>

              {/* Amenities */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {ALL_AMENITIES.map(a => (
                    <button key={a} type="button" onClick={() => set('amenities', form.amenities.includes(a) ? form.amenities.filter(x => x !== a) : [...form.amenities, a])}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        form.amenities.includes(a)
                          ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-sm'
                          : 'bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground/80'
                      )}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Listed Date</Label>
                <Input type="date" value={form.listedDate} onChange={e => set('listedDate', e.target.value)}
                  className="bg-muted border-border text-foreground focus:border-cyan-500/50" />
              </div>
              {(user?.role === 'ADMIN') ? (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned Agent</Label>
                  <Select value={form.assignedToId} onValueChange={v => set('assignedToId', v)}>
                    <SelectTrigger className="border-border bg-muted text-foreground"><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.role})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned Agent</Label>
                  <Input value={user?.name || ''} disabled className="bg-muted border-border text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-0 border-t border-border">
          <div className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</div>
          <div className="flex gap-2">
            {step > 0 && <Button variant="outline" onClick={prev} className="border-border text-foreground/80 bg-muted hover:bg-accent"><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>}
            {step < STEPS.length - 1 ? (
              <Button onClick={next} className="gradient-primary shadow-md shadow-cyan-900/30 border-0 text-white">Next<ChevronRight className="w-4 h-4 ml-1" /></Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="gradient-primary shadow-md shadow-cyan-900/30 border-0 text-white gap-1.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingProperty ? 'Update Property' : 'Create Property'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}