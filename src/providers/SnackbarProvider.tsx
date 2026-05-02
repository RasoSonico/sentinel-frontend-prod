import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar } from "react-native-paper";
import { StyleSheet, View } from "react-native";

export type SnackbarType = "success" | "error" | "info";

interface SnackbarAction {
  label: string;
  onPress: () => void;
}

interface SnackbarState {
  visible: boolean;
  message: string;
  type: SnackbarType;
  action?: SnackbarAction;
  duration?: number;
}

interface SnackbarContextValue {
  showSnackbar: (
    message: string,
    type?: SnackbarType,
    action?: SnackbarAction,
    duration?: number,
  ) => void;
  hideSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextValue | undefined>(
  undefined,
);

const SNACKBAR_COLORS: Record<SnackbarType, string> = {
  success: "#2e7d32",
  error: "#d32f2f",
  info: "#1976d2",
};

const DEFAULT_DURATION = 4000;

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: "",
    type: "info",
  });

  const showSnackbar = useCallback(
    (
      message: string,
      type: SnackbarType = "info",
      action?: SnackbarAction,
      duration: number = DEFAULT_DURATION,
    ) => {
      setSnackbar({
        visible: true,
        message,
        type,
        action,
        duration,
      });
    },
    [],
  );

  const hideSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
      {children}
      <View style={styles.snackbarContainer} pointerEvents="box-none">
        <Snackbar
          visible={snackbar.visible}
          onDismiss={hideSnackbar}
          duration={snackbar.duration}
          style={[
            styles.snackbar,
            { backgroundColor: SNACKBAR_COLORS[snackbar.type] },
          ]}
          action={
            snackbar.action
              ? {
                  label: snackbar.action.label,
                  onPress: () => {
                    snackbar.action?.onPress();
                    hideSnackbar();
                  },
                  textColor: "#fff",
                }
              : undefined
          }
        >
          {snackbar.message}
        </Snackbar>
      </View>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  snackbarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  snackbar: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
});
