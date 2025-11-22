import { View, Text } from "react-native";
import { useEnqueuedMutations } from "src/hooks/data/query/useEnqueuedMutations";

export const EnqueuedTransactionsList = () => {
  const enqueuedMutations = useEnqueuedMutations();

  return (
    <View>
      <Text>Transactions: {enqueuedMutations.length}</Text>
      <Text>
        Successful transactions:{" "}
        {enqueuedMutations.filter((m) => m.state.status === "success").length}
      </Text>
      {enqueuedMutations
        .filter((mutation) => mutation.state.status !== "success")
        .map((mutation, index) => (
          <View key={index}>
            <Text>{mutation.mutationKey?.join(" > ")}</Text>
            <Text>Status: {mutation.state.status}</Text>
            {mutation.variables && (
              <Text>Data: {JSON.stringify(mutation.variables)}</Text>
            )}
          </View>
        ))}
    </View>
  );
};
