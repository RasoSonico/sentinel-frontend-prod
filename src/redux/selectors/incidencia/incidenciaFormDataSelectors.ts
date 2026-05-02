import { useSelector } from "react-redux";
import { RootState } from "src/redux/store";

export const useIncidentTypeById = (id: number) =>
  useSelector((state: RootState) => state.incidenciaFormData.typesById[id]);

export const useIncidentClassificationById = (id: number) =>
  useSelector(
    (state: RootState) => state.incidenciaFormData.classificationsById[id]
  );

export const useIncidentTypeNameById = (id: number) => {
  const type = useIncidentTypeById(id);
  return type ? type.name : "";
};

export const useIncidentClassificationNameById = (id: number) => {
  const classification = useIncidentClassificationById(id);
  return classification ? classification.name : "";
};

export const useIncidentTypeDescriptionById = (id: number) => {
  const type = useIncidentTypeById(id);
  return type ? type.description : "";
};

export const useIncidentClassificationDescriptionById = (id: number) => {
  const classification = useIncidentClassificationById(id);
  return classification ? classification.description : "";
};
