import React, { useState, useEffect } from 'react';
import { get, put } from '../services/api';
import type { DoctorScheduleItem } from '../types';
import { Modal } from './Modal';
import { useToast } from '../context/ToastContext';

interface DoctorRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: number | null;
  doctorName?: string;
  readOnly?: boolean;
  onSaved?: () => void;
}

const DAY_NAMES = [
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
  { index: 0, name: 'Sunday' },
];

export const DoctorRosterModal: React.FC<DoctorRosterModalProps> = ({
  isOpen,
  onClose,
  doctorId,
  doctorName,
  readOnly = false,
  onSaved,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<DoctorScheduleItem[]>([]);

  useEffect(() => {
    if (!isOpen || !doctorId) return;

    setLoading(true);
    get<DoctorScheduleItem[]>(`/doctors/${doctorId}/schedule`)
      .then((res) => {
        setSchedules(res || []);
      })
      .catch((err) => {
        showToast(err?.message || 'Failed to load doctor schedule', 'error');
        setSchedules([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, doctorId, showToast]);

  const handleAddShift = (dayIndex: number) => {
    setSchedules((prev) => [
      ...prev,
      {
        doctor_id: doctorId || undefined,
        day_of_week: dayIndex,
        start_time: '09:00',
        end_time: '12:00',
        slot_duration: 30,
        is_active: true,
      },
    ]);
  };

  const handleRemoveShift = (indexToRemove: number) => {
    setSchedules((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateShift = (
    indexToUpdate: number,
    field: keyof DoctorScheduleItem,
    value: any
  ) => {
    setSchedules((prev) =>
      prev.map((item, idx) => (idx === indexToUpdate ? { ...item, [field]: value } : item))
    );
  };

  const handleApplyPreset = (preset: 'standard' | 'morning' | 'weekends') => {
    if (!doctorId) return;
    if (preset === 'standard') {
      const newItems: DoctorScheduleItem[] = [];
      [1, 2, 3, 4, 5].forEach((day) => {
        newItems.push({
          doctor_id: doctorId,
          day_of_week: day,
          start_time: '09:00',
          end_time: '12:00',
          slot_duration: 30,
          is_active: true,
        });
        newItems.push({
          doctor_id: doctorId,
          day_of_week: day,
          start_time: '14:00',
          end_time: '16:30',
          slot_duration: 30,
          is_active: true,
        });
      });
      setSchedules(newItems);
    } else if (preset === 'morning') {
      const newItems: DoctorScheduleItem[] = [];
      [1, 2, 3, 4, 5].forEach((day) => {
        newItems.push({
          doctor_id: doctorId,
          day_of_week: day,
          start_time: '08:30',
          end_time: '13:00',
          slot_duration: 20,
          is_active: true,
        });
      });
      setSchedules(newItems);
    } else if (preset === 'weekends') {
      const newItems: DoctorScheduleItem[] = [];
      [6, 0].forEach((day) => {
        newItems.push({
          doctor_id: doctorId,
          day_of_week: day,
          start_time: '09:00',
          end_time: '14:00',
          slot_duration: 30,
          is_active: true,
        });
      });
      setSchedules(newItems);
    }
  };

  const handleSave = async () => {
    if (!doctorId) return;

    // Validate
    for (const s of schedules) {
      if (!s.start_time || !s.end_time) {
        showToast('Please specify both start and end time for all shifts.', 'error');
        return;
      }
      if (s.end_time <= s.start_time) {
        showToast(`End time must be after start time (${s.start_time} - ${s.end_time}).`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      await put(`/doctors/${doctorId}/schedule`, { schedules });
      showToast('Weekly roster updated & next 14-day slots refreshed successfully!', 'success');
      onSaved?.();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Weekly Schedule Roster — ${doctorName || 'Doctor'}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
                <span className="font-label-sm text-label-sm text-outline hidden sm:inline">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('standard')}
                  className="px-2.5 py-1 text-label-sm font-semibold rounded-md bg-surface-subtle hover:bg-surface-container-high text-secondary hover:text-brand-navy-deep border border-border-subtle transition-all"
                >
                  Standard (Mon-Fri)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('morning')}
                  className="px-2.5 py-1 text-label-sm font-semibold rounded-md bg-surface-subtle hover:bg-surface-container-high text-secondary hover:text-brand-navy-deep border border-border-subtle transition-all"
                >
                  Mornings Only
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-border-subtle text-secondary font-label-md font-bold hover:bg-surface-subtle transition-all"
            >
              Cancel
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="px-5 py-2 rounded-lg bg-primary text-on-primary font-label-md font-bold hover:bg-brand-navy-deep transition-all shadow-sm flex items-center gap-1.5"
              >
                {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                <span>Save Roster</span>
              </button>
            )}
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
            progress_activity
          </span>
          <p className="font-body-md text-secondary">Loading weekly roster...</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <p className="text-body-sm text-secondary">
            Configure the recurring weekly shifts for this doctor. The system automatically maintains rolling appointment slots for the next 14 days based on this template.
          </p>

          <div className="space-y-3">
            {DAY_NAMES.map(({ index: dayIdx, name: dayName }) => {
              const dayShifts = schedules
                .map((item, origIdx) => ({ item, origIdx }))
                .filter(({ item }) => item.day_of_week === dayIdx);

              const hasShifts = dayShifts.length > 0;

              return (
                <div
                  key={dayIdx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    hasShifts
                      ? 'bg-surface border-border-subtle shadow-xs'
                      : 'bg-surface-subtle/50 border-dashed border-border-subtle/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${hasShifts ? 'bg-status-success' : 'bg-outline/30'}`} />
                      <span className="font-label-md font-bold text-brand-navy-deep">{dayName}</span>
                      <span className="font-label-sm text-outline">
                        ({dayShifts.length} {dayShifts.length === 1 ? 'shift' : 'shifts'})
                      </span>
                    </div>

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleAddShift(dayIdx)}
                        className="px-2.5 py-1 text-label-sm font-semibold rounded-md bg-surface-subtle hover:bg-primary hover:text-on-primary text-primary border border-border-subtle transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        <span>Add Shift</span>
                      </button>
                    )}
                  </div>

                  {dayShifts.length === 0 ? (
                    <div className="py-2 text-label-sm text-outline italic">No working shifts scheduled (Day Off)</div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {dayShifts.map(({ item, origIdx }, shiftNum) => (
                        <div
                          key={origIdx}
                          className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-surface-subtle border border-border-subtle text-body-sm"
                        >
                          <span className="font-label-sm font-semibold text-secondary w-16">
                            Shift #{shiftNum + 1}:
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="font-label-sm text-outline">From</span>
                            <input
                              type="time"
                              disabled={readOnly}
                              value={item.start_time.slice(0, 5)}
                              onChange={(e) => handleUpdateShift(origIdx, 'start_time', e.target.value)}
                              className="h-8 px-2 rounded-md bg-surface border border-border-subtle text-label-sm font-semibold text-brand-navy-deep focus:border-primary focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-label-sm text-outline">To</span>
                            <input
                              type="time"
                              disabled={readOnly}
                              value={item.end_time.slice(0, 5)}
                              onChange={(e) => handleUpdateShift(origIdx, 'end_time', e.target.value)}
                              className="h-8 px-2 rounded-md bg-surface border border-border-subtle text-label-sm font-semibold text-brand-navy-deep focus:border-primary focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-label-sm text-outline">Slot:</span>
                            <select
                              disabled={readOnly}
                              value={item.slot_duration}
                              onChange={(e) => handleUpdateShift(origIdx, 'slot_duration', parseInt(e.target.value, 10))}
                              className="h-8 px-2 rounded-md bg-surface border border-border-subtle text-label-sm font-semibold text-brand-navy-deep focus:border-primary focus:outline-none"
                            >
                              <option value={15}>15 mins</option>
                              <option value={20}>20 mins</option>
                              <option value={30}>30 mins</option>
                              <option value={45}>45 mins</option>
                              <option value={60}>60 mins</option>
                            </select>
                          </div>

                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleRemoveShift(origIdx)}
                              className="ml-auto p-1 text-outline hover:text-status-error transition-colors"
                              title="Delete shift"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
};
