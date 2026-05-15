import React, { useState, useMemo, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/SearchablePickerModal.styles";
import { BaseModalProps } from "../modalTypes";
import { DesignTokens } from "../../../styles/designTokens";

export interface PickerItem {
  value: number;
  label: string;
}

export interface SearchablePickerModalProps extends BaseModalProps {
  title: string;
  searchPlaceholder?: string;
  items: PickerItem[];
  onSelect: (value: number) => void;
  quickSelect?: boolean;
}

const PREVIEW_LINES = 2;

const SearchablePickerModal: React.FC<SearchablePickerModalProps> = ({
  title,
  searchPlaceholder = "Buscar...",
  items,
  onSelect,
  onClose,
  quickSelect = false,
}) => {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const width = Dimensions.get("window").width;

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, items],
  );

  const handleSelect = useCallback(
    (value: number) => {
      Keyboard.dismiss();
      onSelect(value);
      onClose();
    },
    [onSelect, onClose],
  );

  const toggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: PickerItem; index: number }) => {
      const isExpanded = expandedId === item.value;

      if (quickSelect) {
        return (
          <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => handleSelect(item.value)}
            activeOpacity={0.7}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemNumberBadge}>
                <Text style={styles.itemNumber}>{index + 1}</Text>
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemPreview}>{item.label}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }

      return (
        <View
          style={[
            styles.itemContainer,
            isExpanded && styles.itemContainerExpanded,
          ]}
        >
          <TouchableOpacity
            style={styles.itemHeader}
            onPress={() => toggleExpand(item.value)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.itemNumberBadge,
                isExpanded && styles.itemNumberBadgeExpanded,
              ]}
            >
              <Text
                style={[
                  styles.itemNumber,
                  isExpanded && styles.itemNumberExpanded,
                ]}
              >
                {index + 1}
              </Text>
            </View>
            <View style={styles.itemTextContainer}>
              <Text
                style={[
                  styles.itemPreview,
                  isExpanded && styles.itemPreviewExpanded,
                ]}
                numberOfLines={isExpanded ? undefined : PREVIEW_LINES}
              >
                {item.label}
              </Text>
              {!isExpanded && (
                <Text style={styles.tapHint}>Toca para ver completo</Text>
              )}
            </View>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={
                isExpanded
                  ? DesignTokens.colors.primary[500]
                  : DesignTokens.colors.neutral[400]
              }
              style={styles.expandIcon}
            />
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.expandedContent}>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => handleSelect(item.value)}
              >
                <Text style={styles.selectButtonText}>Seleccionar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    },
    [expandedId, toggleExpand, handleSelect, quickSelect],
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContainer, { width }]}
          >
            <View style={styles.handleBar} />

            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons
                  name="close"
                  size={18}
                  color={DesignTokens.colors.neutral[600]}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor={DesignTokens.colors.neutral[400]}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
            </View>

            <View style={styles.listContainer}>
              {filtered.length === 0 ? (
                <View style={styles.noResults}>
                  <Ionicons
                    name="search-outline"
                    size={48}
                    color={DesignTokens.colors.neutral[300]}
                  />
                  <Text style={styles.noResultsText}>
                    No se encontraron resultados
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.value.toString()}
                  renderItem={renderItem}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default SearchablePickerModal;
