'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { ClientType, ClientPriority, ClientStatus, LeadSource } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Building2, Target, FileText, ChevronLeft, ChevronRight, Loader2, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STEPS = [
  { key: 'personal', label: 'Personal Info', icon: User },
  { key: 'requirements', label: 'Requirements', icon: Building2 },
  { key: 'source', label: 'Source & Status', icon: Target },
  { key: 'notes', label: 'Notes & Reminders', icon: FileText },
];

const CLIENT_TYPES: ClientType[] = ['Buyer', 'Seller', 'Tenant', 'Landlord', 'Investor'];
const PRIORITIES: ClientPriority[] = ['Hot', 'Warm', 'Cold'];
const STATUSES: ClientStatus[] = ['New Lead', 'Contacted', 'Site Visit Scheduled', 'Negotiation', 'Closed Won', 'Closed Lost', 'Inactive'];
const LEAD_SOURCES: LeadSource[] = ['Website', 'Referral', 'Social Media', 'Walk-in', 'Advertisement', 'JustDial', 'MagicBricks', '99Acres', 'Housing.com', 'Other'];
const BED_OPTIONS = [1, 2, 3, 4, 5];
const FURNISH_OPTIONS = ['Furnished', 'Semi-Furnished', 'Unfurnished'];

interface FormData {
  name: string; phone: string; alternatePhone: string; email: string;
  clientType: string; priority: string; budgetMin: string; budgetMax: string;
  preferredCity: string; preferredLocality: string;
  preferredType: string; preferredBeds: string; preferredFurnish: string;
  leadSource: string; status: string;
  notes: string; reminderDate: string; reminderNote: string;
}

const INITIAL_FORM: FormData = {
  name: '', phone: '', alternatePhone: '', email: '',
  clientType: 'Buyer', priority: 'Warm', budgetMin: '', budgetMax: '',
  preferredCity: '', preferredLocality: '',
  preferredType: '', preferredBeds: '', preferredFurnish: '',
  leadSource: '', status: 'New Lead',
  notes: '', reminderDate: '', reminderNote: '',
};

/** Combines locality + city into the legacy preferredLocation search string. */
function buildPreferredLocation(locality: string, city: string): string {
  return [locality.trim(), city.trim()].filter(Boolean).join(', ');
} // end buildPreferredLocation

function validateStep(step: number, data: FormData): string | null {
  switch (step) {
    case 0:
      if (!data.name.trim()) return 'Name is required.';
      if (!data.phone.trim()) return 'Phone number is required.';
      if (!/^\d{10}$/.test(data.phone.replace(/\D/g, ''))) return 'Enter a valid 10-digit phone number.';
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Enter a valid email address.';
      return null;
    case 1:
      if (!data.clientType) return 'Client type is required.';
      return null;
    case 2:
      if (!data.status) return 'Status is required.';
      return null;
    default: return null;
  }
}

export function ClientForm() {
  const { user, showClientForm, editingClient, closeClientForm } = useAppStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showClientForm) {
      if (editingClient) {
        setForm({
          name: editingClient.name || '', phone: editingClient.phone || '',
          alternatePhone: editingClient.alternatePhone || '', email: editingClient.email || '',
          clientType: editingClient.clientType || 'Buyer', priority: editingClient.priority || 'Warm',
          budgetMin: editingClient.budgetMin ? String(editingClient.budgetMin) : '',
          budgetMax: editingClient.budgetMax ? String(editingClient.budgetMax) : '',
          preferredCity: editingClient.preferredCity || '',
          preferredLocality: editingClient.preferredLocality
            || (!editingClient.preferredCity ? (editingClient.preferredLocation || '') : ''),
          preferredType: editingClient.preferredType || '',
          preferredBeds: editingClient.preferredBeds ? String(editingClient.preferredBeds) : '',
          preferredFurnish: editingClient.preferredFurnish || '',
          leadSource: editingClient.leadSource || '', status: editingClient.status || 'New Lead',
          notes: editingClient.notes || '',
          reminderDate: editingClient.reminderDate ? editingClient.reminderDate.slice(0, 16) : '',
          reminderNote: editingClient.reminderNote || '',
        });
      } else { setForm(INITIAL_FORM); }
      setStep(0); setErrors(null);
    }
  }, [showClientForm, editingClient]);

  const updateField = (field: keyof FormData, value: string) => { setForm(prev => ({ ...prev, [field]: value })); setErrors(null); };
  const handleNext = () => { const err = validateStep(step, form); if (err) { setErrors(err); return; } setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const handleBack = () => { setStep(s => Math.max(s - 1, 0)); setErrors(null); };

  const handleSubmit = async () => {
    if (!user) return;
    const err = validateStep(step, form);
    if (err) { setErrors(err); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        userId: user.id, name: form.name.trim(), phone: form.phone.trim(),
        clientType: form.clientType, priority: form.priority, status: form.status,
      };
      if (form.alternatePhone.trim()) payload.alternatePhone = form.alternatePhone.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.budgetMin) payload.budgetMin = Number(form.budgetMin);
      if (form.budgetMax) payload.budgetMax = Number(form.budgetMax);
      payload.preferredCity = form.preferredCity.trim() || null;
      payload.preferredLocality = form.preferredLocality.trim() || null;
      payload.preferredLocation = buildPreferredLocation(form.preferredLocality, form.preferredCity) || null;
      if (form.preferredType) payload.preferredType = form.preferredType;
      if (form.preferredBeds) payload.preferredBeds = Number(form.preferredBeds);
      if (form.preferredFurnish) payload.preferredFurnish = form.preferredFurnish;
      if (form.leadSource) payload.leadSource = form.leadSource;
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.reminderDate) payload.reminderDate = new Date(form.reminderDate).toISOString();
      if (form.reminderNote.trim()) payload.reminderNote = form.reminderNote.trim();
      if (editingClient) payload.id = editingClient.id;

      const res = await fetch('/api/clients', {
        method: editingClient ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const data = await res.json(); setErrors(data.error || 'Something went wrong.'); return; }
      closeClientForm();
    } catch { setErrors('Failed to save client.'); }
    finally { setSubmitting(false); }
  };

  const darkInput = "h-10 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors";

  return (
    <Dialog open={showClientForm} onOpenChange={(open) => { if (!open) closeClientForm(); }}>
      <DialogContent className="sm:max-w-xl w-full p-0 gap-0 overflow-hidden bg-popover border-border">
        {/* Step Tracker */}
        <div className="px-6 pt-6 pb-4 border-b border-border min-w-0">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground pr-8">
              {editingClient ? 'Edit Client' : 'New Client'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length} — {STEPS[step].label}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mt-4 relative min-w-0 overflow-hidden">
            <div className="absolute top-4 left-[calc(12.5%+8px)] right-[calc(12.5%+8px)] h-0.5 bg-sidebar-border z-0" />
            <div className="absolute top-4 left-[calc(12.5%+8px)] h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 z-0 transition-all duration-300"
              style={{ width: step === 0 ? '0%' : `${(step / (STEPS.length - 1)) * 100}%` }} />
            {STEPS.map((s, i) => (
              <div key={s.key} className="relative z-10 flex flex-col items-center gap-1.5 min-w-0 flex-1">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0',
                  i < step ? 'step-completed text-foreground' : i === step ? 'step-active text-cyan-400' : 'step-pending text-muted-foreground')}>
                  {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-3.5 h-3.5" />}
                </div>
                <span className={cn('text-[10px] font-medium hidden sm:block truncate max-w-full px-0.5', i <= step ? 'text-cyan-400' : 'text-muted-foreground')}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Full Name <span className="text-rose-500">*</span></Label>
                    <Input placeholder="Full name" value={form.name} onChange={e => updateField('name', e.target.value)} className={darkInput} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Phone Number <span className="text-rose-500">*</span></Label>
                    <Input placeholder="9876543210" value={form.phone} onChange={e => updateField('phone', e.target.value.replace(/[^\d]/g, '').slice(0, 10))} className={darkInput} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Alternate Phone</Label>
                    <Input placeholder="Optional" value={form.alternatePhone} onChange={e => updateField('alternatePhone', e.target.value.replace(/[^\d]/g, '').slice(0, 10))} className={darkInput} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                    <Input type="email" placeholder="Email" value={form.email} onChange={e => updateField('email', e.target.value)} className={darkInput} />
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Client Type <span className="text-rose-500">*</span></Label>
                      <Select value={form.clientType} onValueChange={v => updateField('clientType', v)}>
                        <SelectTrigger className="h-10 rounded-xl bg-muted border-border text-foreground w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>{CLIENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Priority</Label>
                      <Select value={form.priority} onValueChange={v => updateField('priority', v)}>
                        <SelectTrigger className="h-10 rounded-xl bg-muted border-border text-foreground w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-xs font-medium text-muted-foreground">Min Budget (Lakhs)</Label><Input type="number" placeholder="30" value={form.budgetMin} onChange={e => updateField('budgetMin', e.target.value)} className={darkInput} min="0" /></div>
                    <div className="space-y-2"><Label className="text-xs font-medium text-muted-foreground">Max Budget (Lakhs)</Label><Input type="number" placeholder="80" value={form.budgetMax} onChange={e => updateField('budgetMax', e.target.value)} className={darkInput} min="0" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Preferred Locality</Label>
                      <Input placeholder="e.g. Andheri West" value={form.preferredLocality} onChange={e => updateField('preferredLocality', e.target.value)} className={darkInput} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Preferred City</Label>
                      <Input placeholder="e.g. Mumbai" value={form.preferredCity} onChange={e => updateField('preferredCity', e.target.value)} className={darkInput} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Property Type</Label>
                      <Select value={form.preferredType} onValueChange={v => updateField('preferredType', v)}>
                        <SelectTrigger className="h-10 rounded-xl bg-muted border-border text-foreground w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Apartment">Apartment</SelectItem><SelectItem value="Villa">Villa</SelectItem>
                          <SelectItem value="Penthouse">Penthouse</SelectItem><SelectItem value="Commercial">Commercial</SelectItem>
                          <SelectItem value="Plot">Plot</SelectItem><SelectItem value="Studio">Studio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Bedrooms</Label>
                      <Select value={form.preferredBeds} onValueChange={v => updateField('preferredBeds', v)}>
                        <SelectTrigger className="h-10 rounded-xl bg-muted border-border text-foreground w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>{BED_OPTIONS.map(b => <SelectItem key={b} value={String(b)}>{b} BHK</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Furnishing</Label>
                      <Select value={form.preferredFurnish} onValueChange={v => updateField('preferredFurnish', v)}>
                        <SelectTrigger className="h-10 rounded-xl bg-muted border-border text-foreground w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>{FURNISH_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Lead Source</Label>
                    <Select value={form.leadSource} onValueChange={v => updateField('leadSource', v)}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted border-border text-foreground w-full"><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Status <span className="text-rose-500">*</span></Label>
                    <Select value={form.status} onValueChange={v => updateField('status', v)}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted border-border text-foreground w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                    <Textarea placeholder="Any notes about this client..." value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3}
                      className="min-h-[100px] rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500/50 resize-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Reminder Date</Label>
                    <Input type="datetime-local" value={form.reminderDate} onChange={e => updateField('reminderDate', e.target.value)} className={darkInput} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Reminder Note</Label>
                    <Input placeholder="What to remember?" value={form.reminderNote} onChange={e => updateField('reminderNote', e.target.value)} className={darkInput} />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          {errors && <p className="text-xs text-rose-400 mt-3 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{errors}</p>}
        </div>

        <div className="px-6 py-4 border-t border-border bg-sidebar/50 flex items-center justify-between gap-2 min-w-0">
          <button onClick={closeClientForm} className="text-sm text-muted-foreground hover:text-foreground/80 flex-shrink-0">Cancel</button>
          <div className="flex items-center gap-2 flex-shrink-0">
            {step > 0 && (
              <button onClick={handleBack} className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border hover:bg-accent inline-flex items-center">
                <ChevronLeft className="w-4 h-4 mr-1" />Back
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button onClick={handleNext} className="px-4 py-2 rounded-xl text-sm font-medium text-white gradient-primary shadow-sm inline-flex items-center">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            )}
            {step === STEPS.length - 1 && (
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-medium text-white gradient-primary shadow-md shadow-cyan-900/30 min-w-[120px]">
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span>
                ) : (
                  <span>{editingClient ? 'Update Client' : 'Create Client'}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}