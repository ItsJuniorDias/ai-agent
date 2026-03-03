import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function History() {
  const [history, setHistory] = useState([]);
  const router = useRouter();

  console.log("History screen rendered with history:", history);

  // Loads data whenever the screen gains focus
  useFocusEffect(
    useCallback(() => {
      const loadHistory = async () => {
        try {
          const storedHistory = await AsyncStorage.getItem("@chat_history");

          if (storedHistory) {
            const parsedHistory = JSON.parse(storedHistory);
            // Fixed: Now correctly renders only the 10 most recent items
            setHistory(parsedHistory.slice(0, 10));
          } else {
            setHistory([]);
          }
        } catch (e) {
          console.error("Error loading history:", e);
        }
      };

      loadHistory();
    }, []),
  );

  // Function to delete a specific item
  const handleDelete = (id) => {
    Alert.alert(
      "Delete conversation",
      "Are you sure you want to delete this conversation from your history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive", // Makes the text red on iOS
          onPress: async () => {
            try {
              // 1. Filters the list, removing the item with the matching ID
              const updatedHistory = history.filter((item) => item.id !== id);

              // 2. Updates the state visually right away
              setHistory(updatedHistory);

              // 3. Saves the newly updated list to AsyncStorage
              await AsyncStorage.setItem(
                "@chat_history",
                JSON.stringify(updatedHistory),
              );
            } catch (e) {
              console.error("Error deleting history:", e);
              Alert.alert("Error", "Could not delete the conversation.");
            }
          },
        },
      ],
    );
  };

  // Function that renders each list item (conversation)
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/(tabs)",
          params: { screen: "index", conversationId: item.id },
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.messages.some((msg) => msg.role === "user")
              ? item.messages.find((msg) => msg.role !== "user")?.text ||
                "No response"
              : "No user message"}
          </Text>

          <Text style={styles.cardDate}>{item.date}</Text>
        </View>

        {/* Delete button */}
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increases the touch area of the button
        >
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>Nothing saved yet.</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={<Text style={styles.title}>History</Text>}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F8",
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 32,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    // Shadows for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // Shadows for Android
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: "400",
    color: "#1A1A1A",
  },
  cardDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
  },
  cardResponse: {
    fontSize: 14,
    color: "#444",
    marginTop: 4,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#8E8E93",
    marginTop: 40,
    fontSize: 16,
  },
});
