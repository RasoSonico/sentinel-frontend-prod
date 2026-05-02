import React from "react";
import LocationInfo from "../../components/LocationInfo";

interface AdvanceLocationSectionProps {
  loading: boolean;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  error?: boolean;
}

const AdvanceLocationSection: React.FC<AdvanceLocationSectionProps> = ({
  loading,
  location,
  error = false,
}) => <LocationInfo loading={loading} location={location} error={error} />;

export default AdvanceLocationSection;
