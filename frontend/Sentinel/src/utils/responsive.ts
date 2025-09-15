import { Dimensions } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Device type detection
export const isTablet = screenWidth >= 768;
export const isSmallPhone = screenWidth < 375;
export const isLargePhone = screenWidth >= 414;

/**
 * Get responsive spacing based on screen size
 * @param base - Base spacing value
 * @returns Adjusted spacing for current screen size
 */
export const getResponsiveSpacing = (base: number): number => {
  if (isTablet) return base * 1.5;
  if (isSmallPhone) return base * 0.8;
  return base;
};

/**
 * Get responsive font size based on screen size
 * @param base - Base font size
 * @returns Adjusted font size for current screen size (minimum 12px)
 */
export const getResponsiveFontSize = (base: number): number => {
  if (isTablet) return base * 1.2;
  if (isSmallPhone) return Math.max(base * 0.9, 12);
  return base;
};

/**
 * Get responsive width based on screen size
 * @param percentage - Percentage of screen width (0-1)
 * @returns Width in pixels
 */
export const getResponsiveWidth = (percentage: number): number => {
  return screenWidth * percentage;
};

/**
 * Get responsive height based on screen size
 * @param percentage - Percentage of screen height (0-1)
 * @returns Height in pixels
 */
export const getResponsiveHeight = (percentage: number): number => {
  return screenHeight * percentage;
};

/**
 * Get responsive icon size based on screen size
 * @param base - Base icon size
 * @returns Adjusted icon size
 */
export const getResponsiveIconSize = (base: number): number => {
  if (isTablet) return base * 1.3;
  if (isSmallPhone) return base * 0.9;
  return base;
};

/**
 * Get responsive border radius
 * @param base - Base border radius
 * @returns Adjusted border radius
 */
export const getResponsiveBorderRadius = (base: number): number => {
  if (isTablet) return base * 1.2;
  if (isSmallPhone) return base * 0.9;
  return base;
};

export const deviceInfo = {
  screenWidth,
  screenHeight,
  isTablet,
  isSmallPhone,
  isLargePhone,
};