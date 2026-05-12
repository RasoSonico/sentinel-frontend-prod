import { format, parseISO, startOfDay, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const FIVE_MINS_IN_MS = 5 * 60 * 1000;

/**
 * 🌍 UTC-First Date Utils for Global Applications
 *
 * ARCHITECTURE:
 * - Backend stores dates in UTC as YYYY-MM-DD strings
 * - Frontend treats all dates as UTC until display
 * - Only converts to local timezone for display purposes
 * - Optimized with memoization for performance
 */
export class DateUtils {
  // ✅ Memoization cache for performance - CLEARED FOR BUG FIX
  private static readonly formatCache = new Map<string, string>();
  private static readonly parseCache = new Map<string, Date>();

  /**
   * Parse UTC date string from backend (YYYY-MM-DD or ISO format) to Date object
   * Treats input as UTC to avoid timezone conversion issues
   */
  static parseUTCDate(utcDateString: string): Date {
    const cacheKey = `parse_${utcDateString}`;

    if (this.parseCache.has(cacheKey)) {
      return this.parseCache.get(cacheKey)!;
    }

    let date: Date;

    // Check if it's already an ISO string (contains 'T' and 'Z')
    if (utcDateString.includes("T") && utcDateString.includes("Z")) {
      // Already in ISO format, parse directly
      date = new Date(utcDateString);
    } else {
      // Assume YYYY-MM-DD format, append UTC time
      const utcISOString = `${utcDateString}T00:00:00.000Z`;
      date = new Date(utcISOString);
    }

    // Validate the parsed date
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${utcDateString}`);
    }

    this.parseCache.set(cacheKey, date);
    return date;
  }

  /**
   * Format UTC date for backend API (YYYY-MM-DD)
   * Converts local date to UTC date string
   */
  static toUTCDateString(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * ✅ Get today's date in user's timezone converted to UTC format for API calls
   * This ensures "today" means today in user's timezone, not UTC timezone
   */
  static getTodayUTC(): string {
    return this.localDateToUTC(new Date());
  }

  /**
   * ✅ Format UTC date string for display - AUTOMATIC TIMEZONE CONVERSION
   * Acts as interpreter: converts UTC to user's local timezone for display
   * Example: "2025-08-01T05:00:00Z" → "01 ago 2025" (in CDMX)
   */
  static formatUTCForDisplay(
    utcDateString: string,
    formatString: string = "dd MMM yyyy",
    locale = es,
  ): string {
    const cacheKey = `${utcDateString}_${formatString}_${locale.code}`;

    if (this.formatCache.has(cacheKey)) {
      return this.formatCache.get(cacheKey)!;
    }

    // ✅ Let JavaScript automatically convert UTC to local timezone
    // This is the "interpreter" function - it translates backend UTC to user's timezone
    const utcDate = new Date(utcDateString); // Automatically parses UTC and converts to local

    // Format the local date representation
    const formatted = format(utcDate, formatString, { locale });

    this.formatCache.set(cacheKey, formatted);
    return formatted;
  }

  /**
   * Convert local user date to UTC for API submission (DEPRECATED - use localDateRangeToUTC)
   * This function is incorrect for date filtering as it ignores timezone
   */
  static localDateToUTC(localDate: Date): string {
    // Create new date with same day but in UTC
    const utcDate = new Date(
      Date.UTC(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
      ),
    );

    return this.toUTCDateString(utcDate);
  }

  /**
   * ✅ Convert local date to full day UTC range for filtering
   * Input: User selects "10-sep-2025" in CDMX
   * Output: { start: "2025-09-10T05:00:00Z", end: "2025-09-11T04:59:59Z" }
   */
  static localDateToUTCRange(localDate: Date): { start: string; end: string } {
    // Start of day in local timezone (00:00:00)
    const startOfDay = new Date(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      0,
      0,
      0,
      0,
    );

    // End of day in local timezone (23:59:59.999)
    const endOfDay = new Date(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      23,
      59,
      59,
      999,
    );

    return {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString(),
    };
  }

  /**
   * ✅ Get today's date range in UTC for filtering
   * Returns full day range in UTC that represents "today" in local timezone
   */
  static getTodayUTCRange(): { start: string; end: string } {
    const today = new Date();
    return this.localDateToUTCRange(today);
  }

  /**
   * Get date ranges in UTC for API queries (DEPRECATED - use getUTCDateRangeForDays)
   */
  static getUTCDateRange(daysBack: number): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date();
    const startDate = subDays(today, daysBack);

    return {
      startDate: this.localDateToUTC(startDate),
      endDate: this.localDateToUTC(today),
    };
  }

  /**
   * ✅ Get UTC date range for multiple days back (timezone-aware)
   * Input: 6 days back = last 7 days including today
   * Output: Start of oldest day to end of today, both in UTC
   */
  static getUTCDateRangeForDays(daysBack: number): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date();
    const startDate = subDays(today, daysBack);

    // Get full day range for start date (00:00 to 23:59 local time → UTC)
    const startRange = this.localDateToUTCRange(startDate);

    // Get full day range for end date (today)
    const endRange = this.localDateToUTCRange(today);

    return {
      startDate: startRange.start, // Start of oldest day in UTC
      endDate: endRange.end, // End of today in UTC
    };
  }

  /**
   * Get preset date ranges for filters
   */
  static getPresetDateRanges() {
    const today = new Date();
    const todayUTC = this.localDateToUTC(today);

    return {
      today: (() => {
        const todayRange = this.getTodayUTCRange();
        return {
          type: "range" as const,
          startDate: todayRange.start,
          endDate: todayRange.end,
          label: "Hoy",
        };
      })(),

      yesterday: (() => {
        const yesterday = subDays(today, 1);
        const yesterdayRange = this.localDateToUTCRange(yesterday);
        return {
          type: "range" as const,
          startDate: yesterdayRange.start,
          endDate: yesterdayRange.end,
          label: "Ayer",
        };
      })(),

      last7Days: {
        type: "range" as const,
        ...this.getUTCDateRangeForDays(6),
        label: "Últimos 7 días",
      },

      last30Days: {
        type: "range" as const,
        ...this.getUTCDateRangeForDays(29),
        label: "Últimos 30 días",
      },

      thisMonth: (() => {
        // First day of current month to today (full days)
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        );
        const firstDayRange = this.localDateToUTCRange(firstDayOfMonth);
        const todayRange = this.localDateToUTCRange(today);

        return {
          type: "range" as const,
          startDate: firstDayRange.start, // Start of first day
          endDate: todayRange.end, // End of today
          label: "Este mes",
        };
      })(),

      lastMonth: (() => {
        // Full previous month (all days from start to end)
        const lastMonth = subMonths(today, 1);
        const startOfMonth = new Date(
          lastMonth.getFullYear(),
          lastMonth.getMonth(),
          1,
        );
        const endOfMonth = new Date(
          lastMonth.getFullYear(),
          lastMonth.getMonth() + 1,
          0,
        );

        const startRange = this.localDateToUTCRange(startOfMonth);
        const endRange = this.localDateToUTCRange(endOfMonth);

        return {
          type: "range" as const,
          startDate: startRange.start, // Start of first day of month
          endDate: endRange.end, // End of last day of month
          label: "Mes pasado",
        };
      })(),
    };
  }

  /**
   * Clear memoization cache (useful for memory management)
   */
  static clearCache(): void {
    this.formatCache.clear();
    this.parseCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): { formatCache: number; parseCache: number } {
    return {
      formatCache: this.formatCache.size,
      parseCache: this.parseCache.size,
    };
  }

  /**
   * Compare UTC date strings (for filtering logic)
   */
  static compareUTCDates(dateA: string, dateB: string): number {
    return dateA.localeCompare(dateB);
  }

  /**
   * Check if UTC date string is within range
   */
  static isDateInUTCRange(
    dateString: string,
    startDate?: string,
    endDate?: string,
  ): boolean {
    if (!startDate && !endDate) return true;

    if (startDate && this.compareUTCDates(dateString, startDate) < 0) {
      return false;
    }

    if (endDate && this.compareUTCDates(dateString, endDate) > 0) {
      return false;
    }

    return true;
  }

  /**
   * 🔍 Debug function to test date conversion flow
   */
  static debugDateFlow(utcDateString: string): void {
    console.group(`🔍 Debug Date Flow: ${utcDateString}`);

    try {
      const utcDate = this.parseUTCDate(utcDateString);
      console.log("1. Parsed UTC Date:", utcDate.toISOString());

      const formatted = this.formatUTCForDisplay(utcDateString);
      console.log("2. Formatted for Display:", formatted);

      // Test round trip
      const testLocalDate = new Date(
        utcDate.getUTCFullYear(),
        utcDate.getUTCMonth(),
        utcDate.getUTCDate(),
      );
      const roundTripUTC = this.localDateToUTC(testLocalDate);
      console.log("3. Round Trip UTC:", roundTripUTC);
      console.log(
        "4. Round Trip Match:",
        roundTripUTC === utcDateString ? "✅" : "❌",
      );
    } catch (error) {
      console.error("Debug Error:", error);
    }

    console.groupEnd();
  }

  /**
   * 🐛 Debug timezone issue with CDMX time
   */
  static debugTimezoneProblem(backendDateString: string): void {
    console.group(`🐛 Debugging timezone issue: ${backendDateString}`);

    try {
      console.log("1️⃣ Backend date string:", backendDateString);

      // Parse with our parseUTCDate function
      const parsedUTC = this.parseUTCDate(backendDateString);
      console.log("2️⃣ Parsed UTC Date:", parsedUTC.toISOString());
      console.log("3️⃣ UTC parts:", {
        year: parsedUTC.getUTCFullYear(),
        month: parsedUTC.getUTCMonth() + 1,
        date: parsedUTC.getUTCDate(),
        hours: parsedUTC.getUTCHours(),
      });

      // Create local representation (what we use for display)
      const localRepresentation = new Date(
        parsedUTC.getUTCFullYear(),
        parsedUTC.getUTCMonth(),
        parsedUTC.getUTCDate(),
      );
      console.log(
        "4️⃣ Local representation:",
        localRepresentation.toISOString(),
      );
      console.log("5️⃣ Local display date:", localRepresentation.toDateString());

      // Format with our function
      const formatted = this.formatUTCForDisplay(
        backendDateString,
        "dd MMM yyyy",
      );
      console.log("6️⃣ Our formatted:", formatted);

      // Compare with direct date-fns (what incidents use)
      const directFormatted = format(
        new Date(backendDateString),
        "dd MMM yyyy",
        { locale: es },
      );
      console.log("7️⃣ Direct date-fns:", directFormatted);

      // Show the difference
      console.log(
        "8️⃣ Results match:",
        formatted === directFormatted ? "✅" : "❌",
      );

      // Show local timezone info
      const localDate = new Date(backendDateString);
      console.log("9️⃣ Local timezone interpretation:", {
        toString: localDate.toString(),
        toDateString: localDate.toDateString(),
        getDate: localDate.getDate(),
        getTimezoneOffset: localDate.getTimezoneOffset(),
      });
    } catch (error) {
      console.error("❌ Error in timezone debug:", error);
    }

    console.groupEnd();
  }

  /**
   * 🧪 Test the new timezone-aware filtering system
   */
  static testTimezoneAwareFiltering(): void {
    console.group("🧪 Testing Timezone-Aware Date Filtering");

    const now = new Date();
    console.log("Current local time:", now.toString());
    console.log("Current timezone offset:", now.getTimezoneOffset(), "minutes");
    console.log("");

    // Test today's range
    console.group('📅 Testing "Today" filter');
    const todayRange = this.getTodayUTCRange();
    console.log("Local date selected: TODAY");
    console.log("UTC range for backend:", todayRange);
    console.log("Range covers:", {
      start: new Date(todayRange.start).toString(),
      end: new Date(todayRange.end).toString(),
    });
    console.groupEnd();

    // Test last 7 days
    console.group('📅 Testing "Last 7 days" filter');
    const last7Days = this.getUTCDateRangeForDays(6);
    console.log("Local range selected: Last 7 days (including today)");
    console.log("UTC range for backend:", last7Days);
    console.log("Range covers:", {
      start: new Date(last7Days.startDate).toString(),
      end: new Date(last7Days.endDate).toString(),
    });
    console.groupEnd();

    // Test with your CDMX example
    console.group("🇲🇽 CDMX Example Test");
    console.log(
      "Scenario: User registered advance on 10-sep-2025 at 18:46 CDMX time",
    );
    console.log("Backend stored it as: 2025-09-11T00:46:00Z");
    console.log("");

    // Simulate what happens when user selects "today" (assuming today is 10-sep)
    const mockToday = new Date("2025-09-10T12:00:00-05:00"); // Noon CDMX time
    const mockTodayRange = this.localDateToUTCRange(mockToday);
    console.log('When user selects "10-sep-2025" as today:');
    console.log("UTC range sent to backend:", mockTodayRange);
    console.log("Backend record: 2025-09-11T00:46:00Z");
    console.log(
      "Will match?",
      "2025-09-11T00:46:00Z" >= mockTodayRange.start &&
        "2025-09-11T00:46:00Z" <= mockTodayRange.end
        ? "✅ YES"
        : "❌ NO",
    );
    console.groupEnd();

    console.groupEnd();
  }

  /**
   * 🌍 Get device timezone information
   */
  static getDeviceTimezoneInfo(): {
    timezone: string;
    offsetMinutes: number;
    offsetHours: number;
    offsetString: string;
    currentTime: string;
  } {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = offsetMinutes / 60;
    const offsetString = `UTC${offsetHours <= 0 ? "+" : "-"}${Math.abs(
      offsetHours,
    )}`;

    return {
      timezone,
      offsetMinutes,
      offsetHours,
      offsetString,
      currentTime: now.toString(),
    };
  }

  /**
   * 🧪 Test timezone-aware date selection flow
   */
  static testDateSelectionFlow(selectedLocalDate: Date): void {
    console.group("🧪 Testing Date Selection Flow");

    const deviceInfo = this.getDeviceTimezoneInfo();
    console.log("📱 Device Timezone Info:", deviceInfo);
    console.log("");

    console.group("📅 User Selection");
    console.log("Selected date (local):", selectedLocalDate.toString());
    console.log(
      "Selected date (local date only):",
      selectedLocalDate.toDateString(),
    );
    console.log("Year/Month/Date:", {
      year: selectedLocalDate.getFullYear(),
      month: selectedLocalDate.getMonth() + 1,
      date: selectedLocalDate.getDate(),
    });
    console.groupEnd();

    console.group("🔄 Conversion to UTC Range");
    const utcRange = this.localDateToUTCRange(selectedLocalDate);
    console.log("UTC Range for backend:", utcRange);
    console.log("Range covers (local times):");
    console.log("  Start:", new Date(utcRange.start).toString());
    console.log("  End:", new Date(utcRange.end).toString());
    console.groupEnd();

    console.group("🖥️ Display Conversion");
    const displayStart = this.formatUTCForDisplay(
      utcRange.start,
      "dd MMM yyyy",
    );
    const displayEnd = this.formatUTCForDisplay(utcRange.end, "dd MMM yyyy");
    console.log("Display start date:", displayStart);
    console.log("Display end date:", displayEnd);
    console.log(
      "Should show same date?",
      displayStart === displayEnd ? "✅" : "❌",
    );

    // Test what display will show for the selected date
    const selectedDateAsUTC = `${selectedLocalDate.getFullYear()}-${String(
      selectedLocalDate.getMonth() + 1,
    ).padStart(2, "0")}-${String(selectedLocalDate.getDate()).padStart(
      2,
      "0",
    )}T12:00:00Z`;
    const midDayDisplay = this.formatUTCForDisplay(
      selectedDateAsUTC,
      "dd MMM yyyy",
    );
    console.log("Midday UTC display:", midDayDisplay);
    console.groupEnd();

    console.groupEnd();
  }

  /**
   * 🧪 Test the display timezone conversion (interpreter function)
   */
  static testDisplayConversion(): void {
    console.group(
      "🧪 Testing Display Timezone Conversion (Frontend as Interpreter)",
    );

    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const deviceOffset = new Date().getTimezoneOffset();

    console.log("📱 Device Info:");
    console.log("   Timezone:", deviceTimezone);
    console.log("   UTC Offset:", deviceOffset, "minutes");
    console.log("   Current time:", new Date().toString());
    console.log("");

    // Test cases with different UTC timestamps
    const testCases = [
      {
        name: "Backend: 01-ago 05:00 UTC (midnight in CDMX)",
        utc: "2025-08-01T05:00:00Z",
        expectedCDMX: "01 ago 2025",
      },
      {
        name: "Backend: 31-jul 22:00 UTC (evening in CDMX)",
        utc: "2025-07-31T22:00:00Z",
        expectedCDMX: "31 jul 2025",
      },
      {
        name: "Your original example: 11-sep 00:46 UTC",
        utc: "2025-09-11T00:46:00Z",
        expectedCDMX: "10 sep 2025",
      },
    ];

    testCases.forEach((testCase) => {
      console.group(`🔍 ${testCase.name}`);

      // Direct JavaScript parsing (what we now do)
      const directParsed = new Date(testCase.utc);
      const directFormatted = format(directParsed, "dd MMM yyyy", {
        locale: es,
      });

      // Our function
      const ourFormatted = this.formatUTCForDisplay(
        testCase.utc,
        "dd MMM yyyy",
      );

      console.log("UTC Input:", testCase.utc);
      console.log("Direct JS conversion:", directParsed.toString());
      console.log("Direct format result:", directFormatted);
      console.log("Our function result:", ourFormatted);
      console.log("Expected in CDMX:", testCase.expectedCDMX);
      console.log(
        "Match expected:",
        ourFormatted === testCase.expectedCDMX ? "✅" : "❌",
      );
      console.log(
        "Functions match:",
        directFormatted === ourFormatted ? "✅" : "❌",
      );

      console.groupEnd();
    });

    console.groupEnd();
  }
}

// Export commonly used formatters for performance
export const CommonDateFormats = {
  short: (utcDateString: string) => {
    try {
      return DateUtils.formatUTCForDisplay(utcDateString, "dd MMM");
    } catch (error) {
      console.warn("🚨 Short date format error:", { utcDateString, error });
      return "Fecha inválida";
    }
  },
  medium: (utcDateString: string) => {
    try {
      return DateUtils.formatUTCForDisplay(utcDateString, "dd MMM yyyy");
    } catch (error) {
      console.warn("🚨 Medium date format error:", { utcDateString, error });
      return "Fecha inválida";
    }
  },
  long: (utcDateString: string) => {
    try {
      return DateUtils.formatUTCForDisplay(
        utcDateString,
        "dd 'de' MMMM 'de' yyyy",
      );
    } catch (error) {
      console.warn("🚨 Long date format error:", { utcDateString, error });
      return "Fecha inválida";
    }
  },
  compact: (utcDateString: string) => {
    try {
      return DateUtils.formatUTCForDisplay(utcDateString, "dd/MM/yy");
    } catch (error) {
      console.warn("🚨 Compact date format error:", { utcDateString, error });
      return "Fecha inválida";
    }
  },
} as const;
