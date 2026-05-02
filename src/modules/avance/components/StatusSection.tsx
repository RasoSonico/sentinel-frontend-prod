import React from "react";
import { View, Text } from "react-native";
import ProgramStatusBadge from "./ProgramStatusBadge";
import styles from "./styles/StatusSection.styles";

interface StatusSectionProps {
  status: "completed" | "ahead" | "delayed" | "onSchedule";
}

const StatusSection: React.FC<StatusSectionProps> = ({ status }) => (
  <View style={styles.container}>
    <Text style={styles.label}>Estado del avance:</Text>
    <ProgramStatusBadge status={status} />
  </View>
);

export default StatusSection;
