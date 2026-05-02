import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context';
import {
  Building2, Plus, Trash2, Edit2, X, Check, ChevronDown, Image,
  Package, Users, Maximize2, AlertCircle, Wrench, Archive,
  FileText, Filter, Home, ChevronRight, Upload, Eye
} from 'lucide-react';
import { PhysicalSpace, Asset, SpaceCategory, AssetCategory, AssetStatus } from '../types';

const SPACE_CATEGORIES: SpaceCategory[] = ['Templo', 'Residência', 'Social', 'Administrativo'];
const ASSET_CATEGORIES: AssetCategory[] = ['Som', 'Mobiliário', 'Eletro', 'Veículo', 'Ferramentas', 'Outros'];
const ASSET_STATUSES: AssetStatus[] = ['Bom', 'Manutenção', 'Inativo'];

const categoryColors: Record<SpaceCategory, string> = {
  'Templo': 'from-orange-500 to-red-600',
  'Residência': 'from-blue-500 to-blue-700',
  'Social': 'from-green-500 to-green-700',
  'Administrativo': 'from-purple-500 to-purple-700',
};

const categoryBg: Record<SpaceCategory, string> = {
  'Templo': 'bg-orange-50 border-orange-200',
  'Residência': 'bg-blue-50 border-blue-200',
  'Social': 'bg-green-50 border-green-200',
  'Administrativo': 'bg-purple-50 border-purple-200',
};

const categoryIcon: Record<SpaceCategory, React.ReactNode> = {
  'Templo': <Building2 size={20} />,
  'Residência': <Home size={20} />,
  'Social': <Users size={20} />,
  'Administrativo': <Archive size={20} />,
};

const statusColor: Record<AssetStatus, string> = {
  'Bom': 'bg-green-100 text-green-700',
  'Manutenção': 'bg-yellow-100 text-yellow-700',
  'Inativo': 'bg-gray-100 text-gray-500',
};

const statusIcon: Record<AssetStatus, React.ReactNode> = {
  'Bom': <Check size={12} />,
  'Manutenção': <Wrench size={12} />,
  'Inativo': <AlertCircle size={12} />,
};

const emptySpace: Omit<PhysicalSpace, 'id' | 'createdAt'> = {
  churchId: '',
  name: '',
  category: 'Templo',
  areaSqm: undefined,
  capacity: undefined,
  details: {},
  imageUrl: undefined,
};

const emptyAsset: Omit<Asset, 'id' | 'createdAt'> = {
  spaceId: '',
  name: '',
  quantity: 1,
  category: 'Mobiliário',
  status: 'Bom',
  imageUrl: undefined,
};

export const Infrastructure: React.FC = () => {
  const {
    user, availableChurches, currentChurch,
    physicalSpaces, assets,
    addPhysicalSpace, updatePhysicalSpace, deletePhysicalSpace, uploadSpacePhoto,
    addAsset, updateAsset, deleteAsset, uploadAssetPhoto,
  } = useApp();
  const { t } = useTranslation();

  const [activeView, setActiveView] = useState<'spaces' | 'assets'>('spaces');
  const [filterChurchId, setFilterChurchId] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingSpace, setEditingSpace] = useState<PhysicalSpace | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [spaceForm, setSpaceForm] = useState<Omit<PhysicalSpace, 'id' | 'createdAt'>>(emptySpace);
  const [assetForm, setAssetForm] = useState<Omit<Asset, 'id' | 'createdAt'>>(emptyAsset);
  const [detailKey, setDetailKey] = useState('');
  const [detailValue, setDetailValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingSpace, setUploadingSpace] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const spacePhotoRef = useRef<HTMLInputElement>(null);
  const assetPhotoRef = useRef<HTMLInputElement>(null);

  const effectiveChurchId = currentChurch?.id || user?.churchId || '';

  const userChurch = useMemo(() =>
    availableChurches.find(c => c.id === effectiveChurchId) || null,
    [availableChurches, effectiveChurchId]
  );

  const isSede = user?.role === 'SUPER_ADM' || userChurch?.type === 'SEDE';
  const hasMultipleUnits = availableChurches.length > 1;

  useEffect(() => {
    if (effectiveChurchId) setFilterChurchId(effectiveChurchId);
  }, [effectiveChurchId]);

  const myChurchIds = useMemo(() => {
    if (!user) return [];
    if (user.role === 'SUPER_ADM' && currentChurch) return [currentChurch.id, ...availableChurches.filter(c => c.parentId === currentChurch.id).map(c => c.id)];
    if (user.role === 'SUPER_ADM') return availableChurches.map(c => c.id);
    return availableChurches.map(c => c.id);
  }, [user, availableChurches, currentChurch]);

  const filteredSpaces = useMemo(() => {
    return physicalSpaces.filter(sp => {
      if (!myChurchIds.includes(sp.churchId)) return false;
      if (filterChurchId && sp.churchId !== filterChurchId) return false;
      if (filterCategory && sp.category !== filterCategory) return false;
      return true;
    });
  }, [physicalSpaces, myChurchIds, filterChurchId, filterCategory]);

  const selectedSpace = useMemo(() => physicalSpaces.find(s => s.id === selectedSpaceId) || null, [physicalSpaces, selectedSpaceId]);
  const spaceAssets = useMemo(() => selectedSpace ? assets.filter(a => a.spaceId === selectedSpace.id) : [], [assets, selectedSpace]);

  const openAddSpace = () => {
    setEditingSpace(null);
    setSpaceForm({ ...emptySpace, churchId: effectiveChurchId });
    setShowSpaceModal(true);
  };

  const openEditSpace = (sp: PhysicalSpace) => {
    setEditingSpace(sp);
    setSpaceForm({
      churchId: sp.churchId,
      name: sp.name,
      category: sp.category,
      areaSqm: sp.areaSqm,
      capacity: sp.capacity,
      details: { ...sp.details },
      imageUrl: sp.imageUrl,
    });
    setShowSpaceModal(true);
  };

  const openAddAsset = (spaceId?: string) => {
    setEditingAsset(null);
    setAssetForm({ ...emptyAsset, spaceId: spaceId || selectedSpaceId || '' });
    setShowAssetModal(true);
  };

  const openEditAsset = (a: Asset) => {
    setEditingAsset(a);
    setAssetForm({
      spaceId: a.spaceId,
      name: a.name,
      quantity: a.quantity,
      category: a.category,
      status: a.status,
      imageUrl: a.imageUrl,
    });
    setShowAssetModal(true);
  };

  const handleSpacePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSpace(true);
    const url = await uploadSpacePhoto(file);
    if (url) setSpaceForm(f => ({ ...f, imageUrl: url }));
    setUploadingSpace(false);
  };

  const handleAssetPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAsset(true);
    const url = await uploadAssetPhoto(file);
    if (url) setAssetForm(f => ({ ...f, imageUrl: url }));
    setUploadingAsset(false);
  };

  const handleSaveSpace = async () => {
    if (!spaceForm.name.trim()) return;
    setSaving(true);
    if (editingSpace) {
      await updatePhysicalSpace(editingSpace.id, spaceForm);
    } else {
      await addPhysicalSpace({ ...spaceForm, id: '' } as PhysicalSpace);
    }
    setSaving(false);
    setShowSpaceModal(false);
  };

  const handleSaveAsset = async () => {
    if (!assetForm.name.trim() || !assetForm.spaceId) return;
    setSaving(true);
    if (editingAsset) {
      await updateAsset(editingAsset.id, assetForm);
    } else {
      await addAsset({ ...assetForm, id: '' } as Asset);
    }
    setSaving(false);
    setShowAssetModal(false);
  };

  const handleDeleteSpace = async (id: string) => {
    if (!window.confirm(t('infrastructure.confirmDeleteSpace'))) return;
    await deletePhysicalSpace(id);
    if (selectedSpaceId === id) setSelectedSpaceId(null);
  };

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm(t('infrastructure.confirmDeleteAsset'))) return;
    await deleteAsset(id);
  };

  const addDetail = () => {
    if (!detailKey.trim()) return;
    setSpaceForm(f => ({ ...f, details: { ...f.details, [detailKey.trim()]: detailValue.trim() } }));
    setDetailKey('');
    setDetailValue('');
  };

  const removeDetail = (key: string) => {
    setSpaceForm(f => {
      const d = { ...f.details };
      delete d[key];
      return { ...f, details: d };
    });
  };

  const churchName = (id: string) => availableChurches.find(c => c.id === id)?.name || '—';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 size={26} className="text-orange-500" />
              {t('infrastructure.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('infrastructure.spaces')}</p>
          </div>
          <button
            onClick={openAddSpace}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} /> {t('infrastructure.newSpace')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          {isSede && hasMultipleUnits && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filterChurchId}
                onChange={e => setFilterChurchId(e.target.value)}
                className="text-sm bg-transparent outline-none text-gray-700 min-w-[140px]"
              >
                <option value="">Todas as Unidades</option>
                {availableChurches.filter(c => myChurchIds.includes(c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.type === 'SEDE' ? ' (Sede)' : ''}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <ChevronDown size={14} className="text-gray-400" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-sm bg-transparent outline-none text-gray-700 min-w-[130px]"
            >
              <option value="">Todas as Categorias</option>
              {SPACE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <span className="text-sm text-gray-400 flex items-center">{filteredSpaces.length} ambiente(s) encontrado(s)</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {filteredSpaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <Building2 size={36} className="text-orange-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600">{t('common.noData')}</h3>
            <button onClick={openAddSpace} className="mt-6 flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition">
              <Plus size={18} /> {t('infrastructure.newSpace')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredSpaces.map(sp => {
              const spAssets = assets.filter(a => a.spaceId === sp.id);
              const isResidence = sp.category === 'Residência';
              return (
                <div key={sp.id} className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden hover:shadow-md transition-all group ${categoryBg[sp.category]}`}>
                  {/* Image / Category Header */}
                  <div className={`relative h-36 bg-gradient-to-br ${categoryColors[sp.category]} flex items-center justify-center overflow-hidden`}>
                    {sp.imageUrl ? (
                      <img src={sp.imageUrl} alt={sp.name} className="w-full h-full object-cover absolute inset-0" />
                    ) : (
                      <div className="text-white/60">{categoryIcon[sp.category]}</div>
                    )}
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase backdrop-blur-sm">
                        {sp.category}
                      </span>
                      {isSede && !filterChurchId && (
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm ${availableChurches.find(c => c.id === sp.churchId)?.type === 'SEDE' ? 'bg-orange-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
                          {availableChurches.find(c => c.id === sp.churchId)?.type === 'SEDE' ? 'Sede' : 'Congregação'}
                        </span>
                      )}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditSpace(sp)} className="p-1.5 bg-white/80 rounded-lg hover:bg-white text-gray-700 shadow-sm"><Edit2 size={13} /></button>
                      <button onClick={() => handleDeleteSpace(sp.id)} className="p-1.5 bg-white/80 rounded-lg hover:bg-red-50 text-red-500 shadow-sm"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-base truncate">{sp.name}</h3>
                    <p className="text-xs text-gray-500 mb-3">{churchName(sp.churchId)}</p>

                    {isResidence ? (
                      <div className="space-y-1">
                        {sp.details && Object.entries(sp.details).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1.5 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            <span className="font-medium">{k}:</span> <span>{v}</span>
                          </div>
                        ))}
                        {(!sp.details || Object.keys(sp.details).length === 0) && (
                          <p className="text-xs text-gray-400 italic">Sem detalhes cadastrados</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        {sp.capacity != null && (
                          <div className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-2 py-1.5">
                            <Users size={13} className="text-orange-500" />
                            <span className="text-xs font-bold text-orange-700">{sp.capacity} pessoas</span>
                          </div>
                        )}
                        {sp.areaSqm != null && (
                          <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1.5">
                            <Maximize2 size={13} className="text-gray-500" />
                            <span className="text-xs font-bold text-gray-700">{sp.areaSqm} m²</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Package size={14} />
                        <span className="text-xs font-medium">{spAssets.length} iten(s)</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setSelectedSpaceId(sp.id); setShowInventoryModal(true); }}
                          className="flex items-center gap-1 text-xs text-orange-600 font-semibold hover:underline"
                        >
                          <Eye size={13} /> Ver Inventário
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => openAddAsset(sp.id)}
                          className="flex items-center gap-1 text-xs text-green-600 font-semibold hover:underline"
                        >
                          <Plus size={13} /> Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== SPACE MODAL ===== */}
      {showSpaceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editingSpace ? 'Editar Ambiente' : 'Novo Ambiente'}</h2>
              <button onClick={() => setShowSpaceModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Church selector — only for sede users with multiple units */}
              {isSede && hasMultipleUnits ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unidade / Congregação</label>
                  <select
                    value={spaceForm.churchId}
                    onChange={e => setSpaceForm(f => ({ ...f, churchId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <option value="">Selecionar...</option>
                    {availableChurches.filter(c => myChurchIds.includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.type === 'SEDE' ? ' (Sede)' : ''}</option>
                    ))}
                  </select>
                </div>
              ) : !isSede && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                  <Building2 size={15} className="text-blue-500 shrink-0" />
                  <span className="text-sm text-blue-700 font-medium">
                    {userChurch?.name || churchName(effectiveChurchId)}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('infrastructure.spaceName')}</label>
                <input
                  value={spaceForm.name}
                  onChange={e => setSpaceForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Templo Principal, Casa Pastoral Sede..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('infrastructure.spaceCategory')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {SPACE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSpaceForm(f => ({ ...f, category: cat }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${spaceForm.category === cat ? `border-orange-500 bg-orange-50 text-orange-700` : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {categoryIcon[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Área (m²)</label>
                  <input
                    type="number"
                    min="0"
                    value={spaceForm.areaSqm ?? ''}
                    onChange={e => setSpaceForm(f => ({ ...f, areaSqm: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="Ex: 120"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('infrastructure.capacity')}</label>
                  <input
                    type="number"
                    min="0"
                    value={spaceForm.capacity ?? ''}
                    onChange={e => setSpaceForm(f => ({ ...f, capacity: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="Ex: 300"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              {/* Details (for residences) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('infrastructure.details')}</label>
                <p className="text-xs text-gray-400 mb-2">Ex: Quartos → 3, Banheiros → 2, Garagem → Sim</p>
                <div className="space-y-1.5 mb-2">
                  {Object.entries(spaceForm.details || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                      <span className="text-sm font-medium text-gray-700 flex-1">{k}: {v}</span>
                      <button onClick={() => removeDetail(k)} className="text-red-400 hover:text-red-600"><X size={13} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={detailKey}
                    onChange={e => setDetailKey(e.target.value)}
                    placeholder="Campo (ex: Quartos)"
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <input
                    value={detailValue}
                    onChange={e => setDetailValue(e.target.value)}
                    placeholder="Valor (ex: 3)"
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <button onClick={addDetail} className="bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 transition">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Foto do Ambiente</label>
                <input type="file" accept="image/*" ref={spacePhotoRef} onChange={handleSpacePhotoUpload} className="hidden" />
                {spaceForm.imageUrl ? (
                  <div className="relative">
                    <img src={spaceForm.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                    <button
                      onClick={() => setSpaceForm(f => ({ ...f, imageUrl: undefined }))}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => spacePhotoRef.current?.click()}
                    disabled={uploadingSpace}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors"
                  >
                    {uploadingSpace ? (
                      <span className="text-sm animate-pulse">Enviando...</span>
                    ) : (
                      <>
                        <Upload size={20} className="mb-1" />
                        <span className="text-xs font-medium">Clique para enviar foto</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setShowSpaceModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">{t('common.cancel')}</button>
              <button
                onClick={handleSaveSpace}
                disabled={saving || !spaceForm.name.trim() || !spaceForm.churchId}
                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl shadow hover:shadow-md transition disabled:opacity-50"
              >
                {saving ? t('common.saving') : editingSpace ? t('common.save') : t('infrastructure.newSpace')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ASSET MODAL ===== */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editingAsset ? 'Editar Item' : 'Novo Item'}</h2>
              <button onClick={() => setShowAssetModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Space selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ambiente *</label>
                <select
                  value={assetForm.spaceId}
                  onChange={e => setAssetForm(f => ({ ...f, spaceId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value="">Selecionar ambiente...</option>
                  {physicalSpaces.filter(s => myChurchIds.includes(s.churchId)).map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {churchName(s.churchId)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('infrastructure.assetName')}</label>
                <input
                  value={assetForm.name}
                  onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Cadeira, Mesa, Teclado..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={assetForm.quantity}
                    onChange={e => setAssetForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoria</label>
                  <select
                    value={assetForm.category}
                    onChange={e => setAssetForm(f => ({ ...f, category: e.target.value as AssetCategory }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado</label>
                <div className="flex gap-2">
                  {ASSET_STATUSES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAssetForm(f => ({ ...f, status: s }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${assetForm.status === s ? statusColor[s] + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {statusIcon[s]} {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Foto do Item</label>
                <input type="file" accept="image/*" ref={assetPhotoRef} onChange={handleAssetPhotoUpload} className="hidden" />
                {assetForm.imageUrl ? (
                  <div className="relative">
                    <img src={assetForm.imageUrl} alt="Preview" className="w-full h-28 object-cover rounded-xl" />
                    <button
                      onClick={() => setAssetForm(f => ({ ...f, imageUrl: undefined }))}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => assetPhotoRef.current?.click()}
                    disabled={uploadingAsset}
                    className="w-full h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors"
                  >
                    {uploadingAsset ? (
                      <span className="text-sm animate-pulse">Enviando...</span>
                    ) : (
                      <>
                        <Upload size={18} className="mb-1" />
                        <span className="text-xs font-medium">Clique para enviar foto</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-3">
              <button onClick={() => setShowAssetModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">{t('common.cancel')}</button>
              <button
                onClick={handleSaveAsset}
                disabled={saving || !assetForm.name.trim() || !assetForm.spaceId}
                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl shadow hover:shadow-md transition disabled:opacity-50"
              >
                {saving ? t('common.saving') : editingAsset ? t('common.save') : t('infrastructure.newAsset')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== INVENTORY MODAL ===== */}
      {showInventoryModal && selectedSpace && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-orange-500" />
                  <h2 className="text-lg font-bold text-gray-900">Inventário: {selectedSpace.name}</h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{churchName(selectedSpace.churchId)} · {selectedSpace.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowInventoryModal(false); openAddAsset(selectedSpace.id); }}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-orange-500 text-white px-3 py-2 rounded-xl hover:bg-orange-600 transition"
                >
                  <Plus size={15} /> Adicionar Item
                </button>
                <button onClick={() => setShowInventoryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {spaceAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package size={40} className="text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">Nenhum item cadastrado neste ambiente</p>
                  <button
                    onClick={() => { setShowInventoryModal(false); openAddAsset(selectedSpace.id); }}
                    className="mt-4 text-sm text-orange-500 font-semibold hover:underline"
                  >
                    + Adicionar primeiro item
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase px-3 pb-1">
                    <div className="col-span-1"></div>
                    <div className="col-span-4">Item</div>
                    <div className="col-span-2 text-center">Qtd.</div>
                    <div className="col-span-2">Categoria</div>
                    <div className="col-span-2">Estado</div>
                    <div className="col-span-1"></div>
                  </div>
                  {spaceAssets.map(a => (
                    <div key={a.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl px-3 py-2.5 hover:bg-gray-100 transition group">
                      <div className="col-span-1">
                        {a.imageUrl ? (
                          <img src={a.imageUrl} alt={a.name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                            <Package size={14} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="col-span-4">
                        <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-sm font-bold text-gray-700">{a.quantity}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500">{a.category}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${statusColor[a.status]}`}>
                          {statusIcon[a.status]} {a.status}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setShowInventoryModal(false); openEditAsset(a); }} className="p-1 hover:bg-white rounded-lg text-gray-500"><Edit2 size={12} /></button>
                        <button onClick={() => handleDeleteAsset(a.id)} className="p-1 hover:bg-white rounded-lg text-red-400"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {spaceAssets.length > 0 && (
              <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-gray-500">Total de itens: <strong className="text-gray-800">{spaceAssets.length}</strong></span>
                  <span className="text-gray-500">Unidades: <strong className="text-gray-800">{spaceAssets.reduce((acc, a) => acc + a.quantity, 0)}</strong></span>
                  <span className="text-green-600">Bom: <strong>{spaceAssets.filter(a => a.status === 'Bom').length}</strong></span>
                  <span className="text-yellow-600">Manutenção: <strong>{spaceAssets.filter(a => a.status === 'Manutenção').length}</strong></span>
                  <span className="text-gray-400">Inativo: <strong>{spaceAssets.filter(a => a.status === 'Inativo').length}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
