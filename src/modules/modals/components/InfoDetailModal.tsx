import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/InfoDetailModal.styles";
import { BaseModalProps } from "../modalTypes";
import { DesignTokens } from "../../../styles/designTokens";

export interface InfoDetailModalProps extends BaseModalProps {
  title: string;
  content: string;
}

const InfoDetailModal: React.FC<InfoDetailModalProps> = ({
  title,
  content,
  onClose,
}) => {
  const width = Dimensions.get("window").width;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
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
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={DesignTokens.colors.primary[500]}
                />
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons
                name="close"
                size={18}
                color={DesignTokens.colors.neutral[600]}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.contentText}>{content}</Text>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default InfoDetailModal;
