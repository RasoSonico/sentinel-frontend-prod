import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import BottomSheet, { BottomSheetSectionList } from "@gorhom/bottom-sheet";
import BottomSheetBackdrop from "src/components/ui/BottomSheetBackdrop";
import {
  useAvanceBase,
  useAdvancesByCatalog,
  useTodayPhotos,
} from "src/hooks/data/query/useAvance";
import { useNetworkStatus } from "src/hooks/utils/useNetworkStatus";
import { ConstructionPhoto } from "src/types/avance";
import { PhysicalAdvanceResponse } from "src/types/entities";
import { DateUtils } from "src/utils/dateUtils";
import { DesignTokens } from "src/styles/designTokens";

// Pie de foto: hora local de TOMA (correlaciona visualmente con la hora del
// avance; la de carga puede ser horas después si se trabajó offline), con
// fallback a la de carga. Función estática de DateUtils — segura en un map.
const photoTimeLabel = (photo: ConstructionPhoto): string => {
  const source = photo.taken_at || photo.uploaded_at;
  if (!source) return "";
  try {
    return DateUtils.formatUTCForDisplay(source, "HH:mm");
  } catch {
    return "";
  }
};

const THUMBS_PER_ROW = 3;

interface Props {
  isVisible: boolean;
  onClose: () => void;
  constructionId: number | null;
  /** Tap en foto → abrir el avance que la respalda (cierra el sheet antes) */
  onOpenAdvance: (advanceId: number) => void;
}

interface PhotoRow {
  key: string;
  photos: ConstructionPhoto[];
}

interface GallerySection {
  title: string;
  data: PhotoRow[];
}

/**
 * Galería de fotos del día (ADR-003 D5, lámina L-01a): grid agrupado por
 * partida › sección. "Hoy" se define por el join con los avances del día
 * (misma definición que el contador de la franja); el breadcrumb sale de los
 * campos del avance detailed. Solo online.
 */
const FotosDelDiaSheet: React.FC<Props> = ({
  isVisible,
  onClose,
  constructionId,
  onOpenAdvance,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  // Precarga: la query arranca al montar el sheet (aterrizaje en el home),
  // no al abrirlo — cuando el usuario toca el contador la lista ya está lista
  const photosQuery = useTodayPhotos(constructionId ?? undefined);

  // Avances del día (cache Realm compartido) para el join foto → contexto
  const { data: avanceBase } = useAvanceBase();
  const catalogIds = avanceBase?.catalogs
    ? Array.from(avanceBase.catalogs).map((c) => c.id)
    : [];
  const { advances } = useAdvancesByCatalog({ catalogIds, detailed: true });

  const todayRange = DateUtils.getTodayUTCRange();
  const advancesById = new Map<number, PhysicalAdvanceResponse>();
  for (const advance of advances) {
    if (
      DateUtils.isDateInUTCRange(advance.date, todayRange.start, todayRange.end)
    ) {
      advancesById.set(advance.id, advance);
    }
  }

  // Agrupar por partida › sección (conceptos sin sección: solo partida)
  const groups = new Map<string, ConstructionPhoto[]>();
  let totalFotos = 0;
  for (const photo of photosQuery.data ?? []) {
    const advance = advancesById.get(photo.physical_advance);
    if (!advance) continue; // no es de un avance de hoy
    const title = advance.concept_section_name
      ? `${advance.work_item_name ?? "Sin partida"} › ${advance.concept_section_name}`
      : (advance.work_item_name ?? "Sin partida");
    const bucket = groups.get(title);
    if (bucket) {
      bucket.push(photo);
    } else {
      groups.set(title, [photo]);
    }
    totalFotos++;
  }

  const sections: GallerySection[] = Array.from(groups.entries()).map(
    ([title, photos]) => {
      const rows: PhotoRow[] = [];
      for (let i = 0; i < photos.length; i += THUMBS_PER_ROW) {
        rows.push({
          key: `${title}-${i}`,
          photos: photos.slice(i, i + THUMBS_PER_ROW),
        });
      }
      return { title, data: rows };
    },
  );

  const fechaLabel = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const renderEmpty = () => {
    if (photosQuery.isLoading) {
      return (
        <View style={sheetStyles.emptyState}>
          <ActivityIndicator
            size="small"
            color={DesignTokens.colors.primary[500]}
          />
          <Text style={sheetStyles.emptyText}>Cargando fotos…</Text>
        </View>
      );
    }
    if (isOnline === false || photosQuery.isError) {
      return (
        <View style={sheetStyles.emptyState}>
          <Text style={sheetStyles.emptyText}>
            La galería requiere conexión. Puedes ver las fotos por avance en el
            historial de hoy.
          </Text>
        </View>
      );
    }
    return (
      <View style={sheetStyles.emptyState}>
        <Text style={sheetStyles.emptyText}>Sin fotos registradas hoy.</Text>
      </View>
    );
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={["70%", "95%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={sheetStyles.background}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} onPress={onClose} />
      )}
    >
      <View style={sheetStyles.header}>
        <Text style={sheetStyles.title}>Fotos de hoy · {totalFotos}</Text>
        <Text style={sheetStyles.subtitle}>{fechaLabel}</Text>
      </View>
      <BottomSheetSectionList
        sections={sections}
        keyExtractor={(row: PhotoRow) => row.key}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={sheetStyles.sectionTitle}>
            {(section as GallerySection).title}
            <Text style={sheetStyles.sectionCount}>
              {" "}
              ·{" "}
              {(section as GallerySection).data.reduce(
                (acc, row) => acc + row.photos.length,
                0,
              )}{" "}
              fotos
            </Text>
          </Text>
        )}
        renderItem={({ item }: { item: PhotoRow }) => (
          <View style={sheetStyles.row}>
            {item.photos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                style={sheetStyles.thumbWrap}
                activeOpacity={0.8}
                onPress={() => onOpenAdvance(photo.physical_advance)}
              >
                <Image
                  source={{ uri: photo.thumbnail_url ?? undefined }}
                  style={sheetStyles.thumb}
                  resizeMode="cover"
                />
                <Text style={sheetStyles.thumbCaption}>
                  {photoTimeLabel(photo)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          sections.length > 0 ? (
            <Text style={sheetStyles.foot}>
              Toca una foto para abrir el avance que la respalda
            </Text>
          ) : null
        }
        contentContainerStyle={sheetStyles.content}
      />
    </BottomSheet>
  );
};

const sheetStyles = StyleSheet.create({
  background: {
    backgroundColor: DesignTokens.colors.background.primary,
    borderRadius: DesignTokens.components.bottomSheet.borderRadius,
  },
  header: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing.sm,
  },
  title: {
    fontSize: DesignTokens.typography.fontSize.base,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[800],
  },
  subtitle: {
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
  content: {
    paddingHorizontal: DesignTokens.spacing.lg,
    paddingBottom: DesignTokens.spacing["2xl"],
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.fontSize.sm,
    fontWeight: DesignTokens.typography.fontWeight.semibold,
    color: DesignTokens.colors.neutral[700],
    marginTop: DesignTokens.spacing.md,
    marginBottom: DesignTokens.spacing.sm,
  },
  sectionCount: {
    fontSize: DesignTokens.typography.fontSize.xs,
    fontWeight: DesignTokens.typography.fontWeight.normal,
    color: DesignTokens.colors.neutral[400],
  },
  row: {
    flexDirection: "row",
    gap: DesignTokens.spacing.sm,
    marginBottom: DesignTokens.spacing.sm,
  },
  thumbWrap: {
    flex: 1,
    maxWidth: `${100 / THUMBS_PER_ROW}%`,
  },
  thumb: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: DesignTokens.borderRadius.base,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  thumbCaption: {
    textAlign: "center",
    fontSize: 10.5,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  foot: {
    textAlign: "center",
    fontSize: DesignTokens.typography.fontSize.xs,
    color: DesignTokens.colors.neutral[400],
    marginTop: DesignTokens.spacing.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: DesignTokens.spacing["2xl"],
    gap: DesignTokens.spacing.sm,
  },
  emptyText: {
    fontSize: DesignTokens.typography.fontSize.sm,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    paddingHorizontal: DesignTokens.spacing.lg,
  },
});

export default FotosDelDiaSheet;
