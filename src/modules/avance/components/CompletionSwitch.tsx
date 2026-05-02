import React from "react";
import { View, Text, Switch } from "react-native";
import styles from "./styles/CompletionSwitch.styles";

interface CompletionSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
}

const CompletionSwitch: React.FC<CompletionSwitchProps> = ({
  value,
  onValueChange,
}) => (
  <View style={styles.container}>
    <Text style={styles.label}>Marcar concepto como completado</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#ecf0f1", true: "#2ecc7180" }}
      thumbColor={value ? "#2ecc71" : "#bdc3c7"}
    />
  </View>
);

export default CompletionSwitch;
