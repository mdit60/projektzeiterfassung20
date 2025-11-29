// ========================================
// Datei: src/components/ZahlungsanforderungDetail.tsx
// Modal-Komponente für ZA-Details und Bearbeitung
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// ============================================
// INTERFACES
// ============================================

interface PaymentRequest {
  id: string;
  project_id: string;
  request_number: number;
  period_start: string;
  period_end: string;
  personnel_costs: number;
  personnel_hours: number;
  overhead_costs: number;
  third_party_costs: number;
  rd_contract_costs: number;
  temp_personnel_costs: number;
  total_eligible_costs: number;
  funding_rate_applied: number;
  requested_amount: number;
  approved_amount: number | null;
  deductions: number | null;
  paid_amount: number | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  items?: PaymentRequestItem[];
  project?: {
    name: string;
    funding_reference: string;
  };
}

interface PaymentRequestItem {
  id: string;
  user_profile_id: string;
  employee_number: number;
  employee_name: string;
  qualification_group: string;
  hours_by_month: Record<string, number>;
  total_hours: number;
  hourly_rate: number;
  total_costs: number;
}

interface Props {
  zaId: string;
  onClose: () => void;
  onUpdate: () => void;
  canEdit: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('de-DE');
};

const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('de-DE');
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; label: string; icon: string; nextActions: string[] }> = {
    draft: { 
      color: 'bg-gray-100 text-gray-800', 
      label: 'Entwurf', 
      icon: '📝',
      nextActions: ['calculated', 'submitted']
    },
    calculated: { 
      color: 'bg-blue-100 text-blue-800', 
      label: 'Berechnet', 
      icon: '🔢',
      nextActions: ['submitted']
    },
    submitted: { 
      color: 'bg-yellow-100 text-yellow-800', 
      label: 'Eingereicht', 
      icon: '📤',
      nextActions: ['in_review', 'approved', 'rejected']
    },
    in_review: { 
      color: 'bg-orange-100 text-orange-800', 
      label: 'In Prüfung', 
      icon: '⏳',
      nextActions: ['approved', 'rejected', 'partial']
    },
    approved: { 
      color: 'bg-green-100 text-green-800', 
      label: 'Bewilligt', 
      icon: '✅',
      nextActions: ['paid']
    },
    paid: { 
      color: 'bg-emerald-100 text-emerald-800', 
      label: 'Ausgezahlt', 
      icon: '💰',
      nextActions: []
    },
    rejected: { 
      color: 'bg-red-100 text-red-800', 
      label: 'Abgelehnt', 
      icon: '❌',
      nextActions: []
    },
    partial: { 
      color: 'bg-purple-100 text-purple-800', 
      label: 'Teilweise bewilligt', 
      icon: '📊',
      nextActions: ['paid']
    },
  };
  return configs[status] || configs.draft;
};

// ============================================
// COMPONENT
// ============================================

export default function ZahlungsanforderungDetail({ zaId, onClose, onUpdate, canEdit }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [za, setZa] = useState<PaymentRequest | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    approved_amount: '',
    deductions: '',
    paid_amount: '',
    notes: '',
    third_party_costs: '',
  });

  // Sortierte Monate für Tabellenkopf
  const [months, setMonths] = useState<string[]>([]);

  // ============================================
  // DATA LOADING
  // ============================================

  useEffect(() => {
    loadZA();
  }, [zaId]);

  const loadZA = async () => {
    try {
      setLoading(true);
      setError('');

      // ZA mit Items laden
      const { data: zaData, error: zaError } = await supabase
        .from('payment_requests')
        .select(`
          *,
          project:projects (
            name,
            funding_reference,
            funding_rate,
            overhead_rate
          )
        `)
        .eq('id', zaId)
        .single();

      if (zaError) throw zaError;

      // Items laden
      const { data: items, error: itemsError } = await supabase
        .from('payment_request_items')
        .select('*')
        .eq('payment_request_id', zaId)
        .order('employee_number');

      if (itemsError) throw itemsError;

      const fullZa = { ...zaData, items: items || [] };
      setZa(fullZa);

      // Edit-Daten initialisieren
      setEditData({
        approved_amount: fullZa.approved_amount?.toString() || '',
        deductions: fullZa.deductions?.toString() || '',
        paid_amount: fullZa.paid_amount?.toString() || '',
        notes: fullZa.notes || '',
        third_party_costs: fullZa.third_party_costs?.toString() || '0',
      });

      // Alle Monate aus Items sammeln
      const allMonths = new Set<string>();
      (items || []).forEach((item: PaymentRequestItem) => {
        Object.keys(item.hours_by_month || {}).forEach(m => allMonths.add(m));
      });
      setMonths(Array.from(allMonths).sort());

    } catch (err: any) {
      console.error('Load ZA error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ACTIONS
  // ============================================

  const handleStatusChange = async (newStatus: string) => {
    if (!za) return;
    
    setSaving(true);
    setError('');
    
    try {
      const updates: Record<string, any> = { status: newStatus };
      
      // Automatische Timestamps
      if (newStatus === 'submitted') {
        updates.submitted_at = new Date().toISOString();
      } else if (newStatus === 'approved' || newStatus === 'partial') {
        updates.approved_at = new Date().toISOString();
        if (editData.approved_amount) {
          updates.approved_amount = parseFloat(editData.approved_amount);
        }
      } else if (newStatus === 'paid') {
        updates.paid_at = new Date().toISOString();
        if (editData.paid_amount) {
          updates.paid_amount = parseFloat(editData.paid_amount);
        } else if (za.approved_amount) {
          updates.paid_amount = za.approved_amount;
        }
      }

      const { error: updateError } = await supabase
        .from('payment_requests')
        .update(updates)
        .eq('id', za.id);

      if (updateError) throw updateError;

      setSuccess(`Status auf "${getStatusConfig(newStatus).label}" geändert`);
      loadZA();
      onUpdate();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!za) return;
    
    setSaving(true);
    setError('');

    try {
      const updates: Record<string, any> = {
        notes: editData.notes || null,
        updated_at: new Date().toISOString()
      };

      if (editData.approved_amount) {
        updates.approved_amount = parseFloat(editData.approved_amount);
      }
      if (editData.deductions) {
        updates.deductions = parseFloat(editData.deductions);
      }
      if (editData.paid_amount) {
        updates.paid_amount = parseFloat(editData.paid_amount);
      }
      if (editData.third_party_costs) {
        updates.third_party_costs = parseFloat(editData.third_party_costs);
        // Neuberechnung der Summen
        const newTotal = za.personnel_costs + za.overhead_costs + parseFloat(editData.third_party_costs);
        updates.total_eligible_costs = newTotal;
        updates.requested_amount = newTotal * (za.funding_rate_applied / 100);
      }

      const { error: updateError } = await supabase
        .from('payment_requests')
        .update(updates)
        .eq('id', za.id);

      if (updateError) throw updateError;

      setSuccess('Änderungen gespeichert');
      setEditMode(false);
      loadZA();
      onUpdate();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Zahlungsanforderung...</p>
        </div>
      </div>
    );
  }

  if (!za) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600">Zahlungsanforderung nicht gefunden</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">
            Schließen
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(za.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              Zahlungsanforderung Nr. {za.request_number}
            </h2>
            <p className="text-blue-100 text-sm">
              {za.project?.name} • {za.project?.funding_reference}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Status & Actions Bar */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <span className={`px-4 py-2 rounded-full text-lg font-medium ${statusConfig.color}`}>
                {statusConfig.icon} {statusConfig.label}
              </span>
              <div className="text-sm text-gray-500">
                <div>Erstellt: {formatDateTime(za.created_at)}</div>
                {za.submitted_at && <div>Eingereicht: {formatDate(za.submitted_at)}</div>}
                {za.approved_at && <div>Bewilligt: {formatDate(za.approved_at)}</div>}
                {za.paid_at && <div>Ausgezahlt: {formatDate(za.paid_at)}</div>}
              </div>
            </div>
            
            {canEdit && statusConfig.nextActions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {statusConfig.nextActions.map(action => {
                  const actionConfig = getStatusConfig(action);
                  return (
                    <button
                      key={action}
                      onClick={() => handleStatusChange(action)}
                      disabled={saving}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        action === 'rejected' 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : action === 'paid'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {actionConfig.icon} → {actionConfig.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600">Zeitraum</div>
              <div className="font-medium text-blue-900">
                {formatDate(za.period_start)} - {formatDate(za.period_end)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600">Stunden</div>
              <div className="font-bold text-xl text-purple-900">{za.personnel_hours?.toFixed(1)}h</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="text-sm text-amber-600">Personalkosten</div>
              <div className="font-bold text-xl text-amber-900">{formatCurrency(za.personnel_costs)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600">Angefordert</div>
              <div className="font-bold text-xl text-green-900">{formatCurrency(za.requested_amount)}</div>
            </div>
          </div>

          {/* Anlage 1a - Stunden */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="mr-2">📋</span> Anlage 1a - Abrechnung förderbarer Personenstunden
            </h3>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Nr.</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Mitarbeiter</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Gruppe</th>
                    {months.map(month => (
                      <th key={month} className="px-3 py-2 text-right font-medium text-gray-500">
                        {new Date(month + '-01').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium text-gray-900 bg-gray-100">Σ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(za.items || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{item.employee_number || idx + 1}</td>
                      <td className="px-3 py-2">{item.employee_name}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                          {item.qualification_group}
                        </span>
                      </td>
                      {months.map(month => (
                        <td key={month} className="px-3 py-2 text-right text-gray-600">
                          {(item.hours_by_month?.[month] || 0).toFixed(1)}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-medium bg-gray-50">
                        {item.total_hours.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 font-medium">Gesamt</td>
                    {months.map(month => {
                      const total = (za.items || []).reduce(
                        (sum, item) => sum + (item.hours_by_month?.[month] || 0), 0
                      );
                      return (
                        <td key={month} className="px-3 py-2 text-right font-medium">
                          {total.toFixed(1)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-bold">
                      {za.personnel_hours?.toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Anlage 1b - Kosten */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <span className="mr-2">📋</span> Anlage 1b - Abrechnung zuwendungsfähiger Personalkosten
            </h3>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Nr.</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Mitarbeiter</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Gruppe</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Stunden</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Stundensatz</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-900 bg-gray-100">Personalkosten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(za.items || []).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{item.employee_number || idx + 1}</td>
                      <td className="px-3 py-2">{item.employee_name}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                          {item.qualification_group}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{item.total_hours.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.hourly_rate)}</td>
                      <td className="px-3 py-2 text-right font-medium bg-gray-50">
                        {formatCurrency(item.total_costs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 font-medium">Gesamt</td>
                    <td className="px-3 py-2 text-right font-medium">{za.personnel_hours?.toFixed(1)}h</td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 text-right font-bold">{formatCurrency(za.personnel_costs)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Kostenübersicht */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Berechnung */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-4">📊 Kostenübersicht</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Personalkosten (Anlage 1b)</span>
                  <span className="font-medium">{formatCurrency(za.personnel_costs)}</span>
                </div>
                {za.overhead_costs > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>+ Gemeinkostenzuschlag</span>
                    <span>{formatCurrency(za.overhead_costs)}</span>
                  </div>
                )}
                {(editMode || za.third_party_costs > 0) && (
                  <div className="flex justify-between text-gray-600">
                    <span>+ Aufträge an Dritte</span>
                    {editMode ? (
                      <input
                        type="number"
                        value={editData.third_party_costs}
                        onChange={(e) => setEditData({ ...editData, third_party_costs: e.target.value })}
                        className="w-32 px-2 py-1 border rounded text-right"
                        step="0.01"
                      />
                    ) : (
                      <span>{formatCurrency(za.third_party_costs)}</span>
                    )}
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>= Zuwendungsfähige Kosten</span>
                  <span>{formatCurrency(za.total_eligible_costs)}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>× Fördersatz ({za.funding_rate_applied}%)</span>
                  <span></span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg">
                  <span className="font-bold text-green-700">= Angeforderte Zuwendung</span>
                  <span className="font-bold text-green-700">{formatCurrency(za.requested_amount)}</span>
                </div>
              </div>
            </div>

            {/* Bewilligung & Auszahlung */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">💰 Bewilligung & Auszahlung</h3>
                {canEdit && !editMode && ['in_review', 'approved', 'partial', 'paid'].includes(za.status) && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Bearbeiten
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Bewilligter Betrag</span>
                  {editMode ? (
                    <input
                      type="number"
                      value={editData.approved_amount}
                      onChange={(e) => setEditData({ ...editData, approved_amount: e.target.value })}
                      className="w-32 px-2 py-1 border rounded text-right"
                      step="0.01"
                      placeholder={za.requested_amount?.toString()}
                    />
                  ) : (
                    <span className="font-medium">{formatCurrency(za.approved_amount)}</span>
                  )}
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>- Kürzungen</span>
                  {editMode ? (
                    <input
                      type="number"
                      value={editData.deductions}
                      onChange={(e) => setEditData({ ...editData, deductions: e.target.value })}
                      className="w-32 px-2 py-1 border rounded text-right"
                      step="0.01"
                    />
                  ) : (
                    <span>{za.deductions ? formatCurrency(za.deductions) : '-'}</span>
                  )}
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Ausgezahlter Betrag</span>
                  {editMode ? (
                    <input
                      type="number"
                      value={editData.paid_amount}
                      onChange={(e) => setEditData({ ...editData, paid_amount: e.target.value })}
                      className="w-32 px-2 py-1 border rounded text-right"
                      step="0.01"
                    />
                  ) : (
                    <span className="font-bold text-green-700">{formatCurrency(za.paid_amount)}</span>
                  )}
                </div>
              </div>

              {editMode && (
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 border rounded text-gray-600 hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    disabled={saving}
                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {saving ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notizen */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">📝 Notizen</h3>
            {editMode ? (
              <textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Interne Notizen zur Zahlungsanforderung..."
              />
            ) : (
              <p className="text-gray-600">{za.notes || 'Keine Notizen'}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
          <div className="text-sm text-gray-500">
            ZA-{za.request_number} • Erstellt am {formatDate(za.created_at)}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Schließen
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              onClick={() => alert('PDF-Export wird in Phase 3 implementiert')}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}