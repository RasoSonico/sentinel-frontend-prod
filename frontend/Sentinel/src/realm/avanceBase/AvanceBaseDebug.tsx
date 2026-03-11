import React from "react";
import { ScrollView, Text } from "react-native";
import { useAvanceBaseFromRealm } from "src/hooks/data/query/useAvance";

export const AvanceBaseDebug = () => {
  const avanceBase = useAvanceBaseFromRealm();

  if (!avanceBase) return <Text>No AvanceBase cached yet</Text>;

  return (
    <ScrollView>
      <Text>Generated at: {avanceBase.meta.generated_at}</Text>
      <Text>Total catalogs: {avanceBase.meta.total_catalogs}</Text>

      {avanceBase.catalogs.map((catalog) => (
        <React.Fragment key={catalog.id}>
          <Text>{`📁 ${catalog.name} (${catalog.construction_name})`}</Text>

          {catalog.work_items.map((wi) => (
            <React.Fragment key={wi.id}>
              <Text>{`  🧱 ${wi.name}`}</Text>
              {wi.concepts.map((c) => (
                <Text key={c.id}>{`    • ${c.description}`}</Text>
              ))}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
