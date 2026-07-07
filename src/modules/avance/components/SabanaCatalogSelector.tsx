import React, { memo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SabanaCatalogOption } from "../hooks/useSabanaData";
import styles from "../styles/SabanaScreen.styles";
import { DesignTokens } from "src/styles/designTokens";

interface Props {
  catalogs: SabanaCatalogOption[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const SabanaCatalogSelector: React.FC<Props> = ({
  catalogs,
  selectedId,
  onSelect,
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);

  const selected = catalogs.find((c) => c.id === selectedId);

  const handleSelect = useCallback(
    (id: number) => {
      onSelect(id);
      setModalVisible(false);
    },
    [onSelect],
  );

  if (!selected) return null;

  const isMulti = catalogs.length > 1;

  return (
    <View style={styles.catalogSelector}>
      {isMulti ? (
        <TouchableOpacity
          style={styles.catalogSelectorTappable}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.catalogName} numberOfLines={2}>
              {selected.name}
            </Text>
            <Text style={styles.constructionName}>
              {selected.construction_name}
            </Text>
          </View>
          <Ionicons
            name="swap-horizontal-outline"
            size={18}
            color={DesignTokens.colors.neutral[400]}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.catalogSelectorStatic}>
          <Text style={styles.catalogName} numberOfLines={2}>
            {selected.name}
          </Text>
          <Text style={styles.constructionName}>
            {selected.construction_name}
          </Text>
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.4)",
            }}
          >
            <TouchableWithoutFeedback>
              <SafeAreaView
                style={{
                  backgroundColor: DesignTokens.colors.background.primary,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  maxHeight: "60%",
                }}
              >
                <Text style={styles.sheetTitle}>Seleccionar catálogo</Text>
                <FlatList
                  data={catalogs}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => {
                    const isActive = item.id === selectedId;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.sheetItem,
                          isActive && styles.sheetItemActive,
                        ]}
                        onPress={() => handleSelect(item.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.sheetItemName,
                            isActive && styles.sheetItemNameActive,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.sheetItemSub}>
                          {item.construction_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </SafeAreaView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default memo(SabanaCatalogSelector);
