import { useMemo, useState, useEffect } from "react";
import { AvanceBaseResponse } from "src/realm/avanceBase/Response";

export function useAvanceFormFields(avanceBase: AvanceBaseResponse | null) {
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(
    null,
  );
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | null>(
    null,
  );
  const [selectedConceptId, setSelectedConceptId] = useState<number | null>(
    null,
  );

  const catalogOptions = useMemo(() => {
    if (!avanceBase) return [];
    return avanceBase.catalogs.map((c) => ({ label: c.name, value: c.id }));
  }, [avanceBase]);

  const selectedCatalog = useMemo(() => {
    if (!avanceBase || selectedCatalogId == null) return null;
    return avanceBase.catalogs.find((c) => c.id === selectedCatalogId) ?? null;
  }, [avanceBase, selectedCatalogId]);

  const workItemOptions = useMemo(() => {
    if (!selectedCatalog) return [];
    return selectedCatalog.work_items.map((wi) => ({
      label: wi.name,
      value: wi.id,
    }));
  }, [selectedCatalog]);

  const selectedWorkItem = useMemo(() => {
    if (!selectedCatalog || !selectedWorkItemId) return null;
    return selectedCatalog.work_items.find(
      (workItem) => workItem.id === selectedWorkItemId,
    );
  }, [selectedCatalog, selectedWorkItemId]);

  const conceptOptions = useMemo(() => {
    if (!selectedWorkItem) return [];
    return selectedWorkItem.concepts.map((concept) => ({
      label: concept.description,
      value: concept.id,
    }));
  }, [selectedWorkItem]);

  const selectedConcept = useMemo(() => {
    if (!selectedWorkItem || !selectedConceptId) return null;
    return selectedWorkItem.concepts.find(
      (concept) => concept.id === selectedConceptId,
    );
  }, [selectedWorkItem, selectedConceptId]);

  const selectedUnit = useMemo(() => {
    if (!selectedConcept) return "";
    return selectedConcept.unit;
  }, [selectedConcept]);

  // Reset work item if catalog changes
  useEffect(() => {
    setSelectedWorkItemId(null);
    setSelectedConceptId(null);
  }, [selectedCatalogId]);

  return {
    catalogOptions,
    selectedCatalog,
    workItemOptions,
    selectedWorkItem,
    conceptOptions,
    selectedCatalogId,
    setSelectedCatalogId,
    selectedWorkItemId,
    setSelectedWorkItemId,
    selectedConceptId,
    setSelectedConceptId,
    selectedUnit,
  };
}
