import { useState, useMemo } from "react";
import { DateFilter } from "src/components/ui/filters/DateRangeFilter";
import { DateUtils } from "src/utils/dateUtils";

interface UseDateRangeFilterReturn {
  dateFilter: DateFilter | null;
  setDateFilter: (filter: DateFilter | null) => void;
  // Computed values for API calls
  startDate: string | undefined;
  endDate: string | undefined;
  singleDate: string | undefined;
  // Helper functions
  clearFilter: () => void;
  hasFilter: boolean;
  isValidFilter: boolean;
}

/**
 * Custom hook for managing date range filter state and validation
 * Provides computed values for API integration and helper functions
 */
export const useDateRangeFilter = (
  initialValue: DateFilter | null = null
): UseDateRangeFilterReturn => {
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(initialValue);

  // Computed values for API calls - now all filters are ranges
  const apiValues = useMemo(() => {
    if (!dateFilter) {
      return {
        startDate: undefined,
        endDate: undefined,
        singleDate: undefined, // Kept for backwards compatibility
      };
    }

    // Handle legacy single date type (convert to range if needed)
    if (dateFilter.type === "single" && dateFilter.date) {
      // ✅ Parse UTC date and convert to proper day range
      const utcDate = DateUtils.parseUTCDate(dateFilter.date);
      const singleDayRange = DateUtils.localDateToUTCRange(utcDate);
      return {
        startDate: singleDayRange.start,
        endDate: singleDayRange.end,
        singleDate: undefined,
      };
    }

    // Handle range (new default)
    if (dateFilter.type === "range" && dateFilter.startDate && dateFilter.endDate) {
      return {
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        singleDate: undefined,
      };
    }

    return {
      startDate: undefined,
      endDate: undefined,
      singleDate: undefined,
    };
  }, [dateFilter]);

  // ✅ Validation using UTC utilities
  const isValidFilter = useMemo(() => {
    if (!dateFilter) return true; // No filter is valid

    if (dateFilter.type === "single") {
      try {
        return !!(dateFilter.date && DateUtils.parseUTCDate(dateFilter.date));
      } catch {
        return false;
      }
    }

    if (dateFilter.type === "range") {
      if (!dateFilter.startDate || !dateFilter.endDate) return false;
      
      try {
        DateUtils.parseUTCDate(dateFilter.startDate);
        DateUtils.parseUTCDate(dateFilter.endDate);
        return DateUtils.compareUTCDates(dateFilter.startDate, dateFilter.endDate) <= 0;
      } catch {
        return false;
      }
    }

    return false;
  }, [dateFilter]);

  // Helper functions
  const clearFilter = () => {
    setDateFilter(null);
  };

  const hasFilter = !!dateFilter;

  return {
    dateFilter,
    setDateFilter,
    startDate: apiValues.startDate,
    endDate: apiValues.endDate,
    singleDate: apiValues.singleDate,
    clearFilter,
    hasFilter,
    isValidFilter,
  };
};

/**
 * ✅ Utility function to create date filters programmatically using UTC
 */
export const createDateFilter = {
  single: (date: Date | string): DateFilter => ({
    type: "single",
    date: typeof date === "string" ? date : DateUtils.localDateToUTC(date),
  }),
  
  range: (startDate: Date | string, endDate: Date | string): DateFilter => ({
    type: "range",
    startDate: typeof startDate === "string" ? startDate : DateUtils.localDateToUTC(startDate),
    endDate: typeof endDate === "string" ? endDate : DateUtils.localDateToUTC(endDate),
  }),
  
  preset: (preset: {
    type: "range" | "single";
    startDate?: Date | string;
    endDate?: Date | string;
    date?: Date | string;
    label: string;
  }): DateFilter => {
    if (preset.type === "single" && preset.date) {
      return {
        type: "single",
        date: typeof preset.date === "string" ? preset.date : DateUtils.localDateToUTC(preset.date),
        label: preset.label,
      };
    }
    
    if (preset.type === "range" && preset.startDate && preset.endDate) {
      return {
        type: "range",
        startDate: typeof preset.startDate === "string" ? preset.startDate : DateUtils.localDateToUTC(preset.startDate),
        endDate: typeof preset.endDate === "string" ? preset.endDate : DateUtils.localDateToUTC(preset.endDate),
        label: preset.label,
      };
    }
    
    throw new Error("Invalid preset configuration");
  },
};