import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DesignTokens } from "src/styles/designTokens";
import SearchableDropdown from "src/components/ui/SearchableDropdown";
import DateInput from "src/components/ui/DateInput";
import {
  useTiposMaquinaria,
  useCreateMaquinaria,
} from "src/hooks/data/query/useMaquinaria";
import {
  altaMaquinariaSchema,
  altaMaquinariaDefaultValues,
  AltaMaquinariaFormData,
} from "./util/altaMaquinariaValidation";
import { PropietarioTipo, TipoPermanencia } from "src/types/maquinaria";
import { useMemo } from "react";
import { MARCAS_MAQUINARIA } from "../constants/marcasMaquinaria";
import { useModal } from "src/modules/modals/ModalContext";
import { ModalEnum } from "src/modules/modals/modalTypes";

interface Props {
  constructionId: number;
  onSuccess: () => void;
}

const PROPIETARIO_OPTIONS: { value: PropietarioTipo; label: string }[] = [
  { value: "PROPIA", label: "Propia" },
  { value: "RENTADA", label: "Rentada" },
  { value: "SUBCONTRATISTA", label: "Subcontratista" },
];

const PERMANENCIA_OPTIONS: {
  value: TipoPermanencia;
  label: string;
  desc: string;
}[] = [
  { value: "RESIDENTE", label: "Residente", desc: "Permanece en la obra" },
  { value: "TRANSITORIA", label: "Transitoria", desc: "Visita puntual" },
];

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? <Text style={styles.errorText}>{message}</Text> : null;

const AltaMaquinariaForm: React.FC<Props> = ({ constructionId, onSuccess }) => {
  const { data: tipos, isInitialLoading: loadingTipos } = useTiposMaquinaria();
  const createMaquinaria = useCreateMaquinaria();
  const { openModal } = useModal();

  const tipoOptions = useMemo(
    () =>
      (tipos ?? [])
        .filter((t) => t.is_active)
        .map((t) => ({ label: t.nombre, value: t.id })),
    [tipos],
  );

  const marcaOptions = useMemo(
    () => MARCAS_MAQUINARIA.map((m) => ({ value: m.id, label: m.name })),
    [],
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AltaMaquinariaFormData>({
    resolver: zodResolver(altaMaquinariaSchema),
    defaultValues: altaMaquinariaDefaultValues,
    mode: "onBlur",
  });

  const onSubmit = (data: AltaMaquinariaFormData) => {
    createMaquinaria.mutate(
      {
        construction: constructionId,
        tipo: data.tipo,
        marca: data.marca,
        modelo: data.modelo,
        propietario_tipo: data.propietario_tipo,
        tipo_permanencia: data.tipo_permanencia,
        fecha_ingreso: data.fecha_ingreso,
      },
      {
        onSuccess: () => {
          onSuccess();
        },
        onError: (error: Error) => {
          Alert.alert(
            "Error al registrar",
            error.message ??
              "No se pudo registrar la maquinaria. Intenta de nuevo.",
          );
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Tipo de maquinaria</Text>
        <Controller
          control={control}
          name="tipo"
          render={({ field: { value, onChange } }) =>
            loadingTipos ? (
              <ActivityIndicator color={DesignTokens.colors.primary[500]} />
            ) : (
              <SearchableDropdown
                infoLabel="Tipo"
                label="Selecciona el tipo"
                searchLabel="Busca el tipo de maquinaria"
                items={tipoOptions}
                selected={value ?? ""}
                onSelect={(id) => onChange(id)}
                quickSelect
              />
            )
          }
        />
        <FieldError message={errors.tipo?.message} />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Marca</Text>
          <Controller
            control={control}
            name="marca"
            render={({ field: { value, onChange } }) => {
              const selectedName = MARCAS_MAQUINARIA.find(
                (m) => m.slug === value,
              )?.name;
              return (
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.marcaTrigger,
                    errors.marca && styles.inputError,
                  ]}
                  onPress={() =>
                    openModal(ModalEnum.SearchablePicker, {
                      title: "Marca",
                      searchPlaceholder: "Busca la marca",
                      items: marcaOptions,
                      quickSelect: true,
                      onSelect: (id: number) => {
                        const brand = MARCAS_MAQUINARIA.find(
                          (m) => m.id === id,
                        );
                        if (brand) onChange(brand.slug);
                      },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={
                      selectedName ? styles.marcaValue : styles.marcaPlaceholder
                    }
                  >
                    {selectedName ?? "Selecciona la marca"}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
          <FieldError message={errors.marca?.message} />
        </View>

        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Modelo</Text>
          <Controller
            control={control}
            name="modelo"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={[styles.input, errors.modelo && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Ej. 320"
                placeholderTextColor={DesignTokens.colors.neutral[400]}
              />
            )}
          />
          <FieldError message={errors.modelo?.message} />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Permanencia en obra</Text>
        <Controller
          control={control}
          name="tipo_permanencia"
          render={({ field: { value, onChange } }) => (
            <View style={styles.permRow}>
              {PERMANENCIA_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.permBtn,
                    value === opt.value && styles.permBtnActive,
                  ]}
                  onPress={() => onChange(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.permTitle,
                      value === opt.value && styles.permTitleActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.permDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        <FieldError message={errors.tipo_permanencia?.message} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tipo de propiedad</Text>
        <Controller
          control={control}
          name="propietario_tipo"
          render={({ field: { value, onChange } }) => (
            <View style={styles.segmented}>
              {PROPIETARIO_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segmentBtn,
                    value === opt.value && styles.segmentBtnActive,
                  ]}
                  onPress={() => onChange(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      value === opt.value && styles.segmentTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        <FieldError message={errors.propietario_tipo?.message} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Fecha de ingreso</Text>
        <Controller
          control={control}
          name="fecha_ingreso"
          render={({ field: { value, onChange } }) => (
            <DateInput value={value} onChange={onChange} />
          )}
        />
        <FieldError message={errors.fecha_ingreso?.message} />
      </View>

      <TouchableOpacity
        style={[
          styles.submitBtn,
          createMaquinaria.isPending && styles.submitBtnDisabled,
        ]}
        onPress={handleSubmit(onSubmit)}
        disabled={createMaquinaria.isPending}
        activeOpacity={0.8}
      >
        {createMaquinaria.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.submitBtnText}>Registrar maquinaria</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: DesignTokens.borderRadius.md,
    padding: 12,
    fontSize: 15,
    color: DesignTokens.colors.neutral[800],
    backgroundColor: DesignTokens.colors.background.primary,
  },
  inputError: {
    borderColor: DesignTokens.colors.error[400],
  },
  marcaTrigger: {
    justifyContent: "center",
  },
  marcaValue: {
    fontSize: 15,
    color: DesignTokens.colors.neutral[800],
  },
  marcaPlaceholder: {
    fontSize: 15,
    color: DesignTokens.colors.neutral[400],
  },
  errorText: {
    fontSize: 12,
    color: DesignTokens.colors.error[500],
    marginTop: 4,
  },
  segmented: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
  },
  segmentBtnActive: {
    borderColor: DesignTokens.colors.primary[500],
    backgroundColor: DesignTokens.colors.primary[50],
  },
  segmentText: {
    fontSize: 13,
    color: DesignTokens.colors.neutral[600],
    fontWeight: DesignTokens.typography.fontWeight.medium,
  },
  segmentTextActive: {
    color: DesignTokens.colors.primary[700],
  },
  permRow: {
    flexDirection: "row",
    gap: 10,
  },
  permBtn: {
    flex: 1,
    padding: 12,
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    backgroundColor: DesignTokens.colors.background.secondary,
  },
  permBtnActive: {
    borderColor: DesignTokens.colors.primary[500],
    backgroundColor: DesignTokens.colors.primary[50],
  },
  permTitle: {
    fontSize: 14,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
  },
  permTitleActive: {
    color: DesignTokens.colors.primary[700],
  },
  permDesc: {
    fontSize: 11,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: DesignTokens.colors.executive.primary,
    borderRadius: DesignTokens.borderRadius.md,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    ...DesignTokens.shadows.md,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: DesignTokens.typography.fontWeight.bold,
  },
});

export default AltaMaquinariaForm;
