'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { formatPrice, STATUS_COLORS, type Property } from '@/lib/types';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { ArrowLeft, Pencil, Trash2, MapPin, Bed, Bath, Maximize, Building2, Calendar, Compass, Clock, User, Phone, Mail, Briefcase, Tag, Home, Check, Handshake, CheckSquare2, Shield, Sofa, Layers, Youtube } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

export function PropertyDetail() {
  const { user, selectedId, navigate, goBack, openPropertyForm, openDeleteDialog } = useAppStore();
  const [property, setProperty] = useState<Property | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedId) return;
    const fetchProperty = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/properties?id=${selectedId}&userId=${user?.id}&role=${user?.role}`);
        const data = await res.json();
        setProperty(data.property || null);
      } catch { setProperty(null); }
      finally { setLoading(false); }
    };
    fetchProperty();
  }, [selectedId, user]);

  useEffect(() => {
    if (!selectedId || !user) return;
    const fetchLinked = async () => {
      try {
        const [dealRes, taskRes] = await Promise.all([
          fetch(`/api/deals?userId=${user.id}&role=${user.role}`).then(r => r.json()),
          fetch(`/api/tasks?userId=${user.id}&role=${user.role}&filter=all`).then(r => r.json()),
        ]);
        setDeals((dealRes.deals || []).filter((d: any) => d.propertyId === selectedId));
        setTasks((taskRes.tasks || []).filter((t: any) => t.propertyId === selectedId));
      } catch {}
    };
    fetchLinked();
  }, [selectedId, user]);

  if (loading) return <div className="p-6"><div className="h-96 shimmer rounded-2xl" /></div>;
  if (!property) return <div className="p-8 text-center text-muted-foreground">Property not found</div>;

  const isOwner = property.assignedToId === user?.id || user?.role === 'ADMIN';
  const youtubeEmbedId = property.youtubeUrl ? getYoutubeId(property.youtubeUrl) : null;

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <button onClick={goBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors self-start">
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </button>
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => openPropertyForm(property)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>
            <button onClick={() => openDeleteDialog('property', property.id, property.title)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {/* Hero */}
          {property.photos && property.photos.length > 0 ? (
            <div className="relative rounded-2xl overflow-hidden h-80">
              <img src={property.photos[0].url} alt={property.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-4 left-4">
                <Badge className={cn('badge-glossy', STATUS_COLORS[property.status])}>{property.status}</Badge>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-foreground">
                <h1 className="text-2xl font-bold drop-shadow-lg">{property.title}</h1>
                <p className="text-sm text-foreground/80 mt-1 flex items-center gap-1"><MapPin className="w-4 h-4" />{property.fullAddress}</p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden h-80 gradient-primary flex items-center justify-center">
              <Building2 className="w-20 h-20 text-foreground/20" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-4 left-4">
                <Badge className={cn('badge-glossy', STATUS_COLORS[property.status])}>{property.status}</Badge>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-foreground">
                <h1 className="text-2xl font-bold drop-shadow-lg">{property.title}</h1>
                <p className="text-sm text-foreground/80 mt-1 flex items-center gap-1"><MapPin className="w-4 h-4" />{property.fullAddress}</p>
              </div>
            </div>
          )}

          {/* Photo Gallery */}
          {property.photos && property.photos.length > 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {property.photos.slice(1, 5).map(p => (
                <div key={p.id} className="h-24 rounded-xl overflow-hidden border border-border">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Property ID */}
          {property.propertyId && (
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Tag className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Property ID</p>
                <p className="text-lg font-bold text-foreground font-mono">{property.propertyId}</p>
              </div>
            </div>
          )}

          {/* YouTube Video */}
          {youtubeEmbedId && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Youtube className="w-4 h-4 text-rose-400" />Property Video</h3>
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe src={`https://www.youtube.com/embed/${youtubeEmbedId}`} className="w-full h-full" allowFullScreen title="Property video" />
              </div>
            </div>
          )}

          {/* Description */}
          {property.description && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>
            </div>
          )}

          {/* Linked Deals */}
          {deals.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Handshake className="w-4 h-4 text-amber-500" />Linked Deals ({deals.length})</h3>
              <div className="space-y-2">
                {deals.map(d => (
                  <button key={d.id} onClick={() => navigate('deal-detail', d.id)} className="w-full text-left p-3 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground font-medium">{d.client?.name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{d.stage}</p>
                    </div>
                    <span className="text-sm font-bold gradient-text-gold">{d.dealValue ? formatPrice(d.dealValue, 'Lakhs') : '—'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Linked Tasks */}
          {tasks.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><CheckSquare2 className="w-4 h-4 text-cyan-400" />Linked Tasks ({tasks.length})</h3>
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className={cn('flex items-center gap-3 p-2.5 rounded-lg', t.isCompleted ? 'opacity-50' : 'bg-muted/50')}>
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center', t.isCompleted ? 'bg-cyan-600 border-cyan-600' : 'border-border')}>
                      {t.isCompleted && <Check className="w-3 h-3 text-foreground" />}
                    </div>
                    <span className={cn('text-sm flex-1', t.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground/80')}>{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="glass-card rounded-2xl p-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Price</p>
            <p className="text-3xl font-bold gradient-text-gold mt-1">{formatPrice(property.price, property.priceUnit)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {property.bedrooms !== null && property.bedrooms !== undefined && (
              <div className="glass-card rounded-xl p-4 text-center"><Bed className="w-5 h-5 text-cyan-400 mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{property.bedrooms}</p><p className="text-[10px] text-muted-foreground uppercase">Bedrooms</p></div>
            )}
            {property.bathrooms !== null && property.bathrooms !== undefined && (
              <div className="glass-card rounded-xl p-4 text-center"><Bath className="w-5 h-5 text-sky-400 mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{property.bathrooms}</p><p className="text-[10px] text-muted-foreground uppercase">Bathrooms</p></div>
            )}
            {property.carpetArea && (
              <div className="glass-card rounded-xl p-4 text-center"><Maximize className="w-5 h-5 text-amber-400 mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{property.carpetArea}</p><p className="text-[10px] text-muted-foreground uppercase">Sq. Ft.</p></div>
            )}
            <div className="glass-card rounded-xl p-4 text-center"><Layers className="w-5 h-5 text-violet-400 mx-auto mb-1" /><p className="text-lg font-bold text-foreground">{property.propertyType}</p><p className="text-[10px] text-muted-foreground uppercase">Type</p></div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">Property Details</h3>
            <div className="space-y-3">
              {property.furnishing && <DetailRow icon={Sofa} label="Furnishing" value={property.furnishing} />}
              {property.facing && <DetailRow icon={Compass} label="Facing" value={property.facing} />}
              {property.ageOfProperty && <DetailRow icon={Clock} label="Age" value={property.ageOfProperty} />}
              {property.floorNumber && <DetailRow icon={Layers} label="Floor" value={`${property.floorNumber} of ${property.totalFloors || '?'}`} />}
              <DetailRow icon={Calendar} label="Listed" value={formatDate(property.listedDate)} />
              {property.assignedTo && <DetailRow icon={User} label="Agent" value={property.assignedTo.name} />}
            </div>
          </div>

          {property.reraNumber && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" />RERA</h3>
              <p className="text-sm text-foreground/80 font-mono bg-muted px-3 py-2 rounded-lg border border-border">{property.reraNumber}</p>
            </div>
          )}

          {(property.developerName || property.projectName) && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-amber-400" />Developer</h3>
              <div className="space-y-3">
                {property.developerName && <DetailRow icon={Building2} label="Builder" value={property.developerName} />}
                {property.projectName && <DetailRow icon={Home} label="Project" value={property.projectName} />}
                {property.contactPerson && <DetailRow icon={User} label="Contact" value={property.contactPerson} />}
                {property.contactPhone && <DetailRow icon={Phone} label="Phone" value={property.contactPhone} />}
                {property.contactEmail && <DetailRow icon={Mail} label="Email" value={property.contactEmail} />}
              </div>
            </div>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-violet-400" />Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map(a => (
                  <span key={a.id} className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 badge-glossy">{a.amenity}</span>
                ))}
              </div>
            </div>
          )}

          {property.latitude && property.longitude && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-400" />Location</h3>
              <div className="h-40 rounded-xl overflow-hidden border border-border">
                <MapPicker
                  center={[property.latitude, property.longitude]}
                  onPositionChange={() => {}}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">{property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 min-w-0">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-shrink-0"><Icon className="w-3.5 h-3.5" />{label}</span>
      <span className="text-sm font-medium text-foreground/80 text-right break-words min-w-0">{value}</span>
    </div>
  );
}

function getYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}