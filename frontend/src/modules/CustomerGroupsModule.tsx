import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { api } from '../services/api';

interface CustomerGroup {
  id: number;
  name: string;
  description?: string;
  created_by_user_id: number;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  members: { id: number; person_id: string; added_at: string }[];
}

interface Person {
  id: string;
  name: string;
  type: string;
}

export const CustomerGroupsModule: React.FC = () => {
  const { t } = useI18n();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_shared: false,
  });
  const [selectedMemberId, setSelectedMemberId] = useState('');

  useEffect(() => {
    loadGroups();
    loadPersons();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/customer-groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersons = async () => {
    try {
      const response = await api.get('/api/persons');
      setPersons(response.data);
    } catch (error) {
      console.error('Error loading persons:', error);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.name.trim()) {
      alert(t('please_fill_required_fields'));
      return;
    }

    try {
      if (editingGroup) {
        await api.put(`/api/customer-groups/${editingGroup.id}`, formData);
      } else {
        await api.post('/api/customer-groups', formData);
      }
      loadGroups();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving group:', error);
      alert(t('error'));
    }
  };

  const handleDelete = async (groupId: number) => {
    if (!window.confirm(t('are_you_sure'))) return;

    try {
      await api.delete(`/api/customer-groups/${groupId}`);
      loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert(t('error'));
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroupId || !selectedMemberId) {
      alert(t('please_select_group_and_member'));
      return;
    }

    try {
      await api.post(`/api/customer-groups/${selectedGroupId}/members/${selectedMemberId}`);
      loadGroups();
      setSelectedMemberId('');
    } catch (error) {
      console.error('Error adding member:', error);
      alert(t('error'));
    }
  };

  const handleRemoveMember = async (groupId: number, personId: string) => {
    if (!window.confirm(t('are_you_sure'))) return;

    try {
      await api.delete(`/api/customer-groups/${groupId}/members/${personId}`);
      loadGroups();
    } catch (error) {
      console.error('Error removing member:', error);
      alert(t('error'));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', is_shared: false });
    setEditingGroup(null);
  };

  const handleEdit = (group: CustomerGroup) => {
    setFormData({
      name: group.name,
      description: group.description || '',
      is_shared: group.is_shared,
    });
    setEditingGroup(group);
    setShowForm(true);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          {t('customer_groups')}
        </h1>
        <p className="text-gray-600">{t('manage_customer_groups_description')}</p>
      </div>

      {/* Create Button */}
      <button
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        {t('create_group')}
      </button>

      {/* Form Modal */}
      {showForm && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">
            {editingGroup ? t('edit_group') : t('create_group')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('name')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder={t('group_name')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder={t('group_description')}
                rows={3}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_shared}
                onChange={(e) =>
                  setFormData({ ...formData, is_shared: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label className="ml-2 text-sm font-medium">
                {t('is_shared')}
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCreateOrUpdate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {t('save')}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-600">{t('loading')}</p>
        ) : groups.length === 0 ? (
          <p className="text-gray-600">{t('no_groups_yet')}</p>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
            >
              {/* Group Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-gray-600">{group.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {group.is_shared ? t('shared') : t('private')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(group)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                  >
                    {t('edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>

              {/* Members Section */}
              <div className="border-t pt-4">
                <h4 className="font-bold text-gray-700 mb-3">
                  {t('members')} ({group.members.length})
                </h4>

                {selectedGroupId === group.id && (
                  <div className="flex gap-2 mb-4">
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">{t('select_person')}</option>
                      {persons.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddMember}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      {t('add_member')}
                    </button>
                  </div>
                )}

                {group.members.length === 0 ? (
                  <p className="text-gray-600 text-sm">{t('no_members_yet')}</p>
                ) : (
                  <div className="space-y-2">
                    {group.members.map((member) => {
                      const person = persons.find((p) => p.id === member.person_id);
                      return (
                        <div
                          key={member.id}
                          className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                        >
                          <span className="text-gray-700">
                            {person?.name || member.person_id}
                          </span>
                          <button
                            onClick={() =>
                              handleRemoveMember(group.id, member.person_id)
                            }
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                          >
                            {t('remove')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedGroupId !== group.id && (
                  <button
                    onClick={() => setSelectedGroupId(group.id)}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm"
                  >
                    {t('add_member')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CustomerGroupsModule;
