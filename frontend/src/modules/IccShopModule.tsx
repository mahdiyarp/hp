import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { apiGet, apiPost, apiPatch, apiDelete } from '../services/api';

interface IccCategory {
  id: number;
  external_id: string;
  name: string;
  description?: string;
  parent_external_id?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

interface IccCenter {
  id: number;
  external_id: string;
  category_id: number;
  name: string;
  address?: string;
  phone?: string;
  manager_name?: string;
  location_lat?: string;
  location_lng?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

interface IccUnit {
  id: number;
  external_id: string;
  center_id: number;
  name: string;
  description?: string;
  unit_type?: string;
  capacity?: number;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

interface IccExtension {
  id: number;
  external_id: string;
  unit_id: number;
  name: string;
  responsible_name?: string;
  responsible_mobile?: string;
  status: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

type ViewType = 'categories' | 'centers' | 'units' | 'extensions';

export const IccShopModule: React.FC = () => {
  const { t } = useI18n();
  const [viewType, setViewType] = useState<ViewType>('categories');
  const [loading, setLoading] = useState(false);

  // Categories
  const [categories, setCategories] = useState<IccCategory[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '', parent_external_id: '', external_id: '' });

  // Centers
  const [centers, setCenters] = useState<IccCenter[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showCenterForm, setShowCenterForm] = useState(false);
  const [centerFormData, setCenterFormData] = useState({ name: '', address: '', phone: '', manager_name: '', external_id: '', category_id: 0 });

  // Units
  const [units, setUnits] = useState<IccUnit[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<number | null>(null);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitFormData, setUnitFormData] = useState({ name: '', description: '', unit_type: '', capacity: 0, external_id: '', center_id: 0 });

  // Extensions
  const [extensions, setExtensions] = useState<IccExtension[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [extensionFormData, setExtensionFormData] = useState({ name: '', responsible_name: '', responsible_mobile: '', status: 'active', external_id: '', unit_id: 0 });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) loadCenters(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCenter) loadUnits(selectedCenter);
  }, [selectedCenter]);

  useEffect(() => {
    if (selectedUnit) loadExtensions(selectedUnit);
  }, [selectedUnit]);

  // Categories
  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await apiGet<IccCategory[]>('/api/icc/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim() || !categoryFormData.external_id.trim()) {
      alert(t('please_fill_required_fields'));
      return;
    }
    try {
      await apiPost('/api/icc/categories', categoryFormData);
      loadCategories();
      setCategoryFormData({ name: '', description: '', parent_external_id: '', external_id: '' });
      setShowCategoryForm(false);
    } catch (error) {
      console.error('Error creating category:', error);
      alert(t('error'));
    }
  };

  // Centers
  const loadCenters = async (categoryId: number) => {
    setLoading(true);
    try {
      const data = await apiGet<IccCenter[]>(`/api/icc/centers?category_id=${categoryId}`);
      setCenters(data);
    } catch (error) {
      console.error('Error loading centers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCenter = async () => {
    if (!centerFormData.name.trim() || !centerFormData.external_id.trim() || !selectedCategory) {
      alert(t('please_fill_required_fields'));
      return;
    }
    try {
      await apiPost('/api/icc/centers', { ...centerFormData, category_id: selectedCategory });
      loadCenters(selectedCategory);
      setCenterFormData({ name: '', address: '', phone: '', manager_name: '', external_id: '', category_id: 0 });
      setShowCenterForm(false);
    } catch (error) {
      console.error('Error creating center:', error);
      alert(t('error'));
    }
  };

  // Units
  const loadUnits = async (centerId: number) => {
    setLoading(true);
    try {
      const data = await apiGet<IccUnit[]>(`/api/icc/units?center_id=${centerId}`);
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = async () => {
    if (!unitFormData.name.trim() || !unitFormData.external_id.trim() || !selectedCenter) {
      alert(t('please_fill_required_fields'));
      return;
    }
    try {
      await apiPost('/api/icc/units', { ...unitFormData, center_id: selectedCenter });
      loadUnits(selectedCenter);
      setUnitFormData({ name: '', description: '', unit_type: '', capacity: 0, external_id: '', center_id: 0 });
      setShowUnitForm(false);
    } catch (error) {
      console.error('Error creating unit:', error);
      alert(t('error'));
    }
  };

  // Extensions
  const loadExtensions = async (unitId: number) => {
    setLoading(true);
    try {
      const data = await apiGet<IccExtension[]>(`/api/icc/extensions?unit_id=${unitId}`);
      setExtensions(data);
    } catch (error) {
      console.error('Error loading extensions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExtension = async () => {
    if (!extensionFormData.name.trim() || !extensionFormData.external_id.trim() || !selectedUnit) {
      alert(t('please_fill_required_fields'));
      return;
    }
    try {
      await apiPost('/api/icc/extensions', { ...extensionFormData, unit_id: selectedUnit });
      loadExtensions(selectedUnit);
      setExtensionFormData({ name: '', responsible_name: '', responsible_mobile: '', status: 'active', external_id: '', unit_id: 0 });
      setShowExtensionForm(false);
    } catch (error) {
      console.error('Error creating extension:', error);
      alert(t('error'));
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          ICC Shop {t('integration')}
        </h1>
        <p className="text-gray-600">Category &gt; Centers &gt; Units &gt; Extensions</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => { setViewType('categories'); setSelectedCategory(null); }}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            viewType === 'categories'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
          }`}
        >
          دسته‌بندی‌ها
        </button>
        {selectedCategory && (
          <button
            onClick={() => setViewType('centers')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewType === 'centers'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
            }`}
          >
            مراکز
          </button>
        )}
        {selectedCenter && (
          <button
            onClick={() => setViewType('units')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewType === 'units'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
            }`}
          >
            واحدها
          </button>
        )}
        {selectedUnit && (
          <button
            onClick={() => setViewType('extensions')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewType === 'extensions'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
            }`}
          >
            شاخه‌ها
          </button>
        )}
      </div>

      {/* Categories View */}
      {viewType === 'categories' && (
        <div>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="mb-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            دسته‌بندی جدید
          </button>

          {showCategoryForm && (
            <div className="mb-6 p-6 bg-white rounded-lg shadow-lg">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="نام (الزامی)"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="ID ICC (الزامی)"
                  value={categoryFormData.external_id}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, external_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <textarea
                  placeholder="توضیح"
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCategory}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('save')}
                  </button>
                  <button
                    onClick={() => setShowCategoryForm(false)}
                    className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {loading ? (
              <p>{t('loading')}</p>
            ) : categories.length === 0 ? (
              <p className="text-gray-600">هنوز دسته‌بندی‌ای اضافه نشده</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedCategory(cat.id)}>
                  <h3 className="text-xl font-bold text-gray-800">{cat.name}</h3>
                  {cat.description && <p className="text-gray-600 mt-2">{cat.description}</p>}
                  <p className="text-sm text-gray-500 mt-2">ID: {cat.external_id}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Centers View */}
      {viewType === 'centers' && selectedCategory && (
        <div>
          <button
            onClick={() => setShowCenterForm(!showCenterForm)}
            className="mb-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            مرکز جدید
          </button>

          {showCenterForm && (
            <div className="mb-6 p-6 bg-white rounded-lg shadow-lg">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="نام (الزامی)"
                  value={centerFormData.name}
                  onChange={(e) => setCenterFormData({ ...centerFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="ID ICC (الزامی)"
                  value={centerFormData.external_id}
                  onChange={(e) => setCenterFormData({ ...centerFormData, external_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="آدرس"
                  value={centerFormData.address}
                  onChange={(e) => setCenterFormData({ ...centerFormData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="تلفن"
                  value={centerFormData.phone}
                  onChange={(e) => setCenterFormData({ ...centerFormData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="نام مدیر"
                  value={centerFormData.manager_name}
                  onChange={(e) => setCenterFormData({ ...centerFormData, manager_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCenter}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('save')}
                  </button>
                  <button
                    onClick={() => setShowCenterForm(false)}
                    className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {loading ? (
              <p>{t('loading')}</p>
            ) : centers.length === 0 ? (
              <p className="text-gray-600">هنوز مرکز‌ای اضافه نشده</p>
            ) : (
              centers.map((center) => (
                <div key={center.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedCenter(center.id)}>
                  <h3 className="text-xl font-bold text-gray-800">{center.name}</h3>
                  {center.manager_name && <p className="text-gray-600 mt-1">مدیر: {center.manager_name}</p>}
                  {center.address && <p className="text-gray-600 mt-1">آدرس: {center.address}</p>}
                  {center.phone && <p className="text-gray-600 mt-1">تلفن: {center.phone}</p>}
                  <p className="text-sm text-gray-500 mt-2">ID: {center.external_id}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Units View */}
      {viewType === 'units' && selectedCenter && (
        <div>
          <button
            onClick={() => setShowUnitForm(!showUnitForm)}
            className="mb-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            واحد جدید
          </button>

          {showUnitForm && (
            <div className="mb-6 p-6 bg-white rounded-lg shadow-lg">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="نام (الزامی)"
                  value={unitFormData.name}
                  onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="ID ICC (الزامی)"
                  value={unitFormData.external_id}
                  onChange={(e) => setUnitFormData({ ...unitFormData, external_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <textarea
                  placeholder="توضیح"
                  value={unitFormData.description}
                  onChange={(e) => setUnitFormData({ ...unitFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                />
                <input
                  type="text"
                  placeholder="نوع واحد"
                  value={unitFormData.unit_type}
                  onChange={(e) => setUnitFormData({ ...unitFormData, unit_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="ظرفیت"
                  value={unitFormData.capacity || ''}
                  onChange={(e) => setUnitFormData({ ...unitFormData, capacity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateUnit}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('save')}
                  </button>
                  <button
                    onClick={() => setShowUnitForm(false)}
                    className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {loading ? (
              <p>{t('loading')}</p>
            ) : units.length === 0 ? (
              <p className="text-gray-600">هنوز واحد‌ای اضافه نشده</p>
            ) : (
              units.map((unit) => (
                <div key={unit.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedUnit(unit.id)}>
                  <h3 className="text-xl font-bold text-gray-800">{unit.name}</h3>
                  {unit.description && <p className="text-gray-600 mt-1">{unit.description}</p>}
                  {unit.unit_type && <p className="text-gray-600 mt-1">نوع: {unit.unit_type}</p>}
                  {unit.capacity && <p className="text-gray-600 mt-1">ظرفیت: {unit.capacity}</p>}
                  <p className="text-sm text-gray-500 mt-2">ID: {unit.external_id}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Extensions View */}
      {viewType === 'extensions' && selectedUnit && (
        <div>
          <button
            onClick={() => setShowExtensionForm(!showExtensionForm)}
            className="mb-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            شاخه جدید
          </button>

          {showExtensionForm && (
            <div className="mb-6 p-6 bg-white rounded-lg shadow-lg">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="نام (الزامی)"
                  value={extensionFormData.name}
                  onChange={(e) => setExtensionFormData({ ...extensionFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="ID ICC (الزامی)"
                  value={extensionFormData.external_id}
                  onChange={(e) => setExtensionFormData({ ...extensionFormData, external_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="نام مسئول"
                  value={extensionFormData.responsible_name}
                  onChange={(e) => setExtensionFormData({ ...extensionFormData, responsible_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="تلفن مسئول"
                  value={extensionFormData.responsible_mobile}
                  onChange={(e) => setExtensionFormData({ ...extensionFormData, responsible_mobile: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <select
                  value={extensionFormData.status}
                  onChange={(e) => setExtensionFormData({ ...extensionFormData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                  <option value="pending">درانتظار</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateExtension}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('save')}
                  </button>
                  <button
                    onClick={() => setShowExtensionForm(false)}
                    className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {loading ? (
              <p>{t('loading')}</p>
            ) : extensions.length === 0 ? (
              <p className="text-gray-600">هنوز شاخه‌ای اضافه نشده</p>
            ) : (
              extensions.map((ext) => (
                <div key={ext.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <h3 className="text-xl font-bold text-gray-800">{ext.name}</h3>
                  {ext.responsible_name && <p className="text-gray-600 mt-1">مسئول: {ext.responsible_name}</p>}
                  {ext.responsible_mobile && <p className="text-gray-600 mt-1">تلفن: {ext.responsible_mobile}</p>}
                  <p className={`text-sm mt-2 px-3 py-1 rounded inline-block ${
                    ext.status === 'active' ? 'bg-green-100 text-green-800' :
                    ext.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ext.status === 'active' ? 'فعال' : ext.status === 'inactive' ? 'غیرفعال' : 'درانتظار'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">ID: {ext.external_id}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IccShopModule;
