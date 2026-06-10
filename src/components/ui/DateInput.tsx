import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DesignTokens } from "src/styles/designTokens";

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  style?: StyleProp<ViewStyle>;
}

const toDate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const DateInput: React.FC<Props> = ({
  value,
  onChange,
  maximumDate = new Date(),
  minimumDate,
  style,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const date = toDate(value);

  return (
    <>
      <TouchableOpacity
        style={[styles.input, style]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={DesignTokens.colors.neutral[500]}
        />
        <Text style={styles.dateText}>
          {format(date, "dd 'de' MMMM 'de' yyyy", { locale: es })}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(_, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) onChange(toDateString(selectedDate));
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.md,
    padding: 12,
    backgroundColor: DesignTokens.colors.background.primary,
  },
  dateText: {
    fontSize: 15,
    color: DesignTokens.colors.neutral[800],
  },
});

export default DateInput;
