import { useQueryClient } from "@tanstack/react-query";
import { View, Text } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useEnqueuedMutations } from "src/hooks/data/query/useEnqueuedMutations";

export const EnqueuedTransactionsList = () => {
  const enqueuedMutations = useEnqueuedMutations();
  const queryClient = useQueryClient();
  const queries = queryClient.getQueryCache().getAll();

  return (
    <ScrollView>
      <Text>Queries in cache: {queries.length}</Text>
      <Text>Successful</Text>
      {queries
        .filter((query) => query.state.status === "success")
        .map((query) => (
          <Text>{`${query.queryKey.join(" > ")}`}</Text>
        ))}
      <Text>Pending</Text>
      {queries
        .filter((query) => query.state.status === "pending")
        .map((query) => (
          <Text>{`${query.queryKey.join(" > ")}`}</Text>
        ))}
      <Text>Error</Text>
      {queries
        .filter((query) => query.state.status === "error")
        .map((query) => (
          <Text>{`${query.queryKey.join(" > ")}`}</Text>
        ))}
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
    </ScrollView>
  );
};
