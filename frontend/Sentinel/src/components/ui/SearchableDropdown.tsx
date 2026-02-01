import React, { useMemo, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { TextInput } from "react-native-paper";
import { useModal } from "src/modules/modals/ModalContext";
import { ModalEnum } from "src/modules/modals/modalTypes";

export interface DropdownItemType {
  value: number;
  label: string;
}

interface SearchableDropdownProps {
  infoLabel?: string;
  label: string;
  searchLabel?: string;
  items: DropdownItemType[];
  onSelect: (valueId: number) => void;
  selected?: string | number;
  disabled?: boolean;
  maxDisplayLines?: number;
  quickSelect?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  infoLabel,
  label,
  searchLabel,
  items,
  onSelect,
  selected = "",
  disabled = false,
  maxDisplayLines,
  quickSelect,
}) => {
  const { openModal } = useModal();

  const value = useMemo(() => {
    const selectedIndex = items.findIndex((item) => item.value === selected);
    return items[selectedIndex]?.label || "";
  }, [selected, items]);

  const shouldTruncate = maxDisplayLines !== undefined && value.length > 0;

  const handleOnPress = useCallback(() => {
    if (disabled) return;

    openModal(ModalEnum.SearchablePicker, {
      title: infoLabel ?? label,
      searchPlaceholder: searchLabel || "Buscar...",
      items,
      onSelect,
      quickSelect,
    });
  }, [disabled, openModal, infoLabel, label, searchLabel, items, onSelect, quickSelect]);

  const handleInfoPress = useCallback(() => {
    openModal(ModalEnum.InfoDetail, {
      title: infoLabel ?? label,
      content: value,
    });
  }, [openModal, infoLabel, label, value]);

  return (
    <View>
      <TouchableOpacity onPress={handleOnPress}>
        <TextInput
          label={label}
          value={value}
          editable={false}
          right={
            shouldTruncate ? (
              <TextInput.Icon
                icon="information-outline"
                onPress={handleInfoPress}
              />
            ) : (
              <TextInput.Icon
                disabled={disabled}
                icon="menu-down"
                onPress={handleOnPress}
              />
            )
          }
          theme={{ colors: { primary: "#009BE1" } }}
          style={styles.input}
          multiline={!shouldTruncate}
          numberOfLines={shouldTruncate ? maxDisplayLines : undefined}
          disabled={disabled}
          onPress={handleOnPress}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: "white",
    borderRadius: 8,
  },
});

export default SearchableDropdown;
