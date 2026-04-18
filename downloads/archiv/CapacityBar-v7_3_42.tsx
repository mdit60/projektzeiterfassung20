'use client';

// src/components/shared/CapacityBar.tsx
// ============================================================================
// PZE V7 - Kapazitaets-Anzeige Komponente
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
//
// Zeigt Auslastung mit Ampelfarben:
// - Gruen: 0-50% (viel Kapazitaet frei)
// - Gelb: 51-80% (eingeschraenkte Kapazitaet)
// - Rot: 81-100% (fast voll / ueberlastet)
// ============================================================================

import { CAPACITY_THRESHOLDS, getCapacityColor, CAPACITY_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

interface CapacityBarProps {
  /** Aktuelle Auslastung in Prozent (0-100+) */
  percentage: number;
  /** Gebuchte Stunden */
  hoursBooked?: number;
  /** Verfuegbare Stunden */
  hoursAvailable?: number;
  /** Verbleibende Stunden */
  hoursRemaining?: number;
  /** Kompakte Darstellung (nur Balken) */
  compact?: boolean;
  /** Breite des Balkens */
  width?: 'sm' | 'md' | 'lg' | 'full';
  /** Label anzeigen */
  showLabel?: boolean;
  /** Prozentwert anzeigen */
  showPercentage?: boolean;
  /** Stunden anzeigen */
  showHours?: boolean;
}

interface CapacityBadgeProps {
  /** Aktuelle Auslastung in Prozent (0-100+) */
  percentage: number;
  /** Kompakt (nur Zahl) oder mit Text */
  compact?: boolean;
}

interface CapacityIndicatorProps {
  /** Aktuelle Auslastung in Prozent (0-100+) */
  percentage: number;
  /** Groesse des Punktes */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const WIDTH_CLASSES = {
  sm: 'w-20',
  md: 'w-32',
  lg: 'w-48',
  full: 'w-full',
};

const DOT_SIZES = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function formatHours(hours: number): string {
  // Ganze Zahlen ohne Dezimalstelle, sonst eine Dezimalstelle
  if (Number.isInteger(hours)) {
    return hours.toString();
  }
  return hours.toFixed(1).replace('.', ',');
}

function getStatusText(percentage: number): string {
  if (percentage === 0) return 'Frei';
  if (percentage <= CAPACITY_THRESHOLDS.GREEN_MAX) return 'Verfuegbar';
  if (percentage <= CAPACITY_THRESHOLDS.YELLOW_MAX) return 'Eingeschraenkt';
  if (percentage < 100) return 'Fast voll';
  if (percentage === 100) return 'Ausgelastet';
  return 'Ueberbucht';
}

// ============================================================================
// CAPACITY BAR KOMPONENTE
// ============================================================================

export default function CapacityBar({
  percentage,
  hoursBooked,
  hoursAvailable,
  hoursRemaining,
  compact = false,
  width = 'md',
  showLabel = true,
  showPercentage = true,
  showHours = false,
}: CapacityBarProps) {
  const color = getCapacityColor(percentage);
  const colorClasses = CAPACITY_COLORS[color];
  
  // Prozent auf 100 begrenzen fuer Balken-Darstellung
  const displayPercentage = Math.min(percentage, 100);
  const isOverbooked = percentage > 100;

  if (compact) {
    // Nur Balken ohne Text
    return (
      <div className={`${WIDTH_CLASSES[width]} h-2 bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full ${colorClasses.bg} transition-all duration-300`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
    );
  }

  return (
    <div className={`${width === 'full' ? 'w-full' : WIDTH_CLASSES[width]}`}>
      {/* Label und Prozent */}
      {(showLabel || showPercentage) && (
        <div className="flex justify-between items-center mb-1">
          {showLabel && (
            <span className={`text-xs font-medium ${colorClasses.text}`}>
              {getStatusText(percentage)}
            </span>
          )}
          {showPercentage && (
            <span className={`text-xs font-semibold ${isOverbooked ? 'text-red-600' : colorClasses.text}`}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      {/* Balken */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses.bg} transition-all duration-300`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>

      {/* Stunden-Anzeige */}
      {showHours && hoursBooked !== undefined && hoursAvailable !== undefined && (
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">
            {formatHours(hoursBooked)} / {formatHours(hoursAvailable)} h
          </span>
          {hoursRemaining !== undefined && (
            <span className={`text-xs ${hoursRemaining < 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {hoursRemaining >= 0 ? `${formatHours(hoursRemaining)} h frei` : `${formatHours(Math.abs(hoursRemaining))} h ueber`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CAPACITY BADGE KOMPONENTE
// ============================================================================

export function CapacityBadge({ percentage, compact = false }: CapacityBadgeProps) {
  const color = getCapacityColor(percentage);
  const colorClasses = CAPACITY_COLORS[color];
  const isOverbooked = percentage > 100;

  if (compact) {
    return (
      <span
        className={`
          inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold
          ${isOverbooked ? 'bg-red-100 text-red-700' : `${colorClasses.lightBg} ${colorClasses.text}`}
        `}
      >
        {Math.round(percentage)}%
      </span>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${isOverbooked ? 'bg-red-100 text-red-700' : `${colorClasses.lightBg} ${colorClasses.text}`}
      `}
    >
      <span
        className={`w-2 h-2 rounded-full ${isOverbooked ? 'bg-red-500' : colorClasses.bg}`}
      />
      {getStatusText(percentage)}
    </span>
  );
}

// ============================================================================
// CAPACITY INDICATOR (Nur Punkt)
// ============================================================================

export function CapacityIndicator({ percentage, size = 'md' }: CapacityIndicatorProps) {
  const color = getCapacityColor(percentage);
  const colorClasses = CAPACITY_COLORS[color];
  const isOverbooked = percentage > 100;

  return (
    <span
      className={`
        inline-block rounded-full
        ${DOT_SIZES[size]}
        ${isOverbooked ? 'bg-red-500 animate-pulse' : colorClasses.bg}
      `}
      title={`${Math.round(percentage)}% - ${getStatusText(percentage)}`}
    />
  );
}

// ============================================================================
// CAPACITY SUMMARY (Fuer Dashboard)
// ============================================================================

interface CapacitySummaryProps {
  hoursAvailable: number;
  hoursBooked: number;
  hoursFunded: number;      // Stunden in gefoerderten Projekten
  hoursForFzul: number;     // Verfuegbar fuer FZul
  month: string;            // z.B. "Januar 2026"
}

export function CapacitySummary({
  hoursAvailable,
  hoursBooked,
  hoursFunded,
  hoursForFzul,
  month,
}: CapacitySummaryProps) {
  const percentage = hoursAvailable > 0 ? (hoursBooked / hoursAvailable) * 100 : 0;
  const color = getCapacityColor(percentage);
  const colorClasses = CAPACITY_COLORS[color];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Kapazitaet {month}</h4>
        <CapacityBadge percentage={percentage} compact />
      </div>

      {/* Haupt-Balken */}
      <CapacityBar
        percentage={percentage}
        hoursBooked={hoursBooked}
        hoursAvailable={hoursAvailable}
        hoursRemaining={hoursAvailable - hoursBooked}
        width="full"
        showHours
      />

      {/* Details */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-500">Gefoerdert</div>
          <div className="font-semibold text-gray-700">{formatHours(hoursFunded)} h</div>
        </div>
        <div className="bg-blue-50 rounded p-2">
          <div className="text-xs text-blue-600">Frei fuer FZul</div>
          <div className="font-semibold text-blue-700">{formatHours(hoursForFzul)} h</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROJEKT-BUDGET STATUS
// ============================================================================

interface ProjectBudgetBarProps {
  planned: number;          // Geplante Stunden/PM
  booked: number;           // Gebuchte Stunden/PM
  billed?: number;          // Abgerechnete Stunden/PM
  unit?: 'hours' | 'pm';    // Einheit
  showLabels?: boolean;
}

export function ProjectBudgetBar({
  planned,
  booked,
  billed = 0,
  unit = 'hours',
  showLabels = true,
}: ProjectBudgetBarProps) {
  const percentage = planned > 0 ? (booked / planned) * 100 : 0;
  const billedPercentage = planned > 0 ? (billed / planned) * 100 : 0;
  const remaining = planned - booked;
  
  const color = getCapacityColor(percentage);
  const colorClasses = CAPACITY_COLORS[color];
  
  const unitLabel = unit === 'pm' ? 'PM' : 'h';

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Gebucht: {formatHours(booked)} {unitLabel}</span>
          <span>Geplant: {formatHours(planned)} {unitLabel}</span>
        </div>
      )}

      {/* Balken mit zwei Ebenen */}
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
        {/* Gebuchte Stunden */}
        <div
          className={`absolute h-full ${colorClasses.bg} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        {/* Abgerechnete Stunden (dunkler) */}
        {billed > 0 && (
          <div
            className="absolute h-full bg-green-700 transition-all duration-300"
            style={{ width: `${Math.min(billedPercentage, 100)}%` }}
          />
        )}
      </div>

      {showLabels && (
        <div className="flex justify-between text-xs mt-1">
          <span className={remaining >= 0 ? 'text-gray-500' : 'text-red-600 font-medium'}>
            {remaining >= 0 
              ? `${formatHours(remaining)} ${unitLabel} offen`
              : `${formatHours(Math.abs(remaining))} ${unitLabel} ueberzogen`
            }
          </span>
          <span className="text-gray-500">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
