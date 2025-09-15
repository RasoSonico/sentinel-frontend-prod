import { useMemo } from 'react';
import { DateUtils, CommonDateFormats } from '../../utils/dateUtils';

/**
 * 🎯 High-performance date formatting hooks with memoization
 * 
 * These hooks automatically memoize formatted dates to prevent
 * unnecessary re-computations during re-renders.
 */

/**
 * Format single UTC date string for display
 */
export const useFormattedDate = (
  utcDateString: string | null | undefined,
  format: 'short' | 'medium' | 'long' | 'compact' = 'medium'
): string => {
  return useMemo(() => {
    if (!utcDateString) return 'Sin fecha';
    
    try {
      return CommonDateFormats[format](utcDateString);
    } catch (error) {
      console.warn('🚨 Date formatting error:', { utcDateString, error });
      return 'Fecha inválida';
    }
  }, [utcDateString, format]);
};

/**
 * Format multiple UTC date strings for display (batch processing)
 */
export const useFormattedDates = (
  utcDateStrings: (string | null | undefined)[],
  format: 'short' | 'medium' | 'long' | 'compact' = 'medium'
): string[] => {
  return useMemo(() => {
    return utcDateStrings.map(dateString => 
      dateString ? CommonDateFormats[format](dateString) : 'Sin fecha'
    );
  }, [utcDateStrings, format]);
};

/**
 * Custom date formatter with custom format string
 */
export const useCustomFormattedDate = (
  utcDateString: string | null | undefined,
  formatString: string = 'dd MMM yyyy'
): string => {
  return useMemo(() => {
    if (!utcDateString) return 'Sin fecha';
    
    return DateUtils.formatUTCForDisplay(utcDateString, formatString);
  }, [utcDateString, formatString]);
};

/**
 * Date range formatter for filters and displays
 */
export const useFormattedDateRange = (
  startDate: string | undefined,
  endDate: string | undefined,
  format: 'short' | 'medium' | 'long' | 'compact' = 'medium'
): string => {
  return useMemo(() => {
    if (!startDate || !endDate) return '';
    
    const formattedStart = CommonDateFormats[format](startDate);
    const formattedEnd = CommonDateFormats[format](endDate);
    
    // If same date, show only once
    if (startDate === endDate) {
      return formattedStart;
    }
    
    return `${formattedStart} - ${formattedEnd}`;
  }, [startDate, endDate, format]);
};

/**
 * Relative date formatter (today, yesterday, etc.)
 */
export const useRelativeDate = (
  utcDateString: string | null | undefined
): string => {
  return useMemo(() => {
    if (!utcDateString) return 'Sin fecha';
    
    const todayUTC = DateUtils.getTodayUTC();
    const utcDate = DateUtils.parseUTCDate(utcDateString);
    const today = new Date();
    
    // Calculate days difference in local timezone
    const localDate = new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate()
    );
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysDiff = Math.floor((todayLocal.getTime() - localDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (daysDiff) {
      case 0:
        return 'Hoy';
      case 1:
        return 'Ayer';
      case -1:
        return 'Mañana';
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
        return `Hace ${daysDiff} días`;
      default:
        return CommonDateFormats.medium(utcDateString);
    }
  }, [utcDateString]);
};

/**
 * Date validation hook for forms
 */
export const useDateValidation = () => {
  return useMemo(() => ({
    /**
     * Validate if date string is valid UTC format
     */
    isValidUTCDate: (dateString: string): boolean => {
      try {
        DateUtils.parseUTCDate(dateString);
        return true;
      } catch {
        return false;
      }
    },
    
    /**
     * Validate date range
     */
    isValidDateRange: (startDate: string, endDate: string): boolean => {
      try {
        return DateUtils.compareUTCDates(startDate, endDate) <= 0;
      } catch {
        return false;
      }
    },
    
    /**
     * Check if date is in the future
     */
    isFutureDate: (dateString: string): boolean => {
      try {
        const today = DateUtils.getTodayUTC();
        return DateUtils.compareUTCDates(dateString, today) > 0;
      } catch {
        return false;
      }
    }
  }), []);
};

/**
 * Date presets hook for filters
 */
export const useDatePresets = () => {
  return useMemo(() => DateUtils.getPresetDateRanges(), []);
};