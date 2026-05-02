import { Modal, View, Pressable, Text } from "react-native";

interface ServerErrorModalProps {
  visible: boolean;
  onClose: () => void;
}

const ServerErrorModal: React.FC<ServerErrorModalProps> = ({
  visible,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 24,
          width: 320,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: "#F44336",
            marginBottom: 12,
          }}
        >
          Error del Servidor
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#333",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          El servidor no está disponible en este momento. No se pueden cargar
          sus datos. Por favor, inténtalo más tarde.
        </Text>
        <Pressable
          onPress={onClose}
          style={{
            backgroundColor: "#0366d6",
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 24,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            Cerrar
          </Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

export default ServerErrorModal;
