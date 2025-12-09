import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { askAI, type AIResponse, type Plan } from "../services/api";

interface ChatBotProps {
  userLocation: { latitude: number; longitude: number } | null;
  onRouteSelect?: (plan: Plan) => void;
  onViewRouteOptions?: (plans: Plan[]) => void;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  plans?: Plan[] | null;
}

export default function ChatBot({
  userLocation,
  onRouteSelect,
  onViewRouteOptions,
}: ChatBotProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isModalVisible && messages.length > 0) {
      // Scroll to bottom when new message is added
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isModalVisible]);

  const handleSend = async () => {
    if (!inputText.trim() || !userLocation || isLoading) return;

    const userMessage: Message = {
      role: "user",
      text: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Note: Context support may not be fully implemented in the backend yet
      // For now, we'll send requests without context to avoid errors
      // If context is needed in the future, we can re-enable it
      // const context =
      //   messages.length > 0
      //     ? messages.map(
      //         (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.text}`
      //       )
      //     : undefined;

      const response: AIResponse = await askAI(
        userMessage.text,
        userLocation.latitude,
        userLocation.longitude
        // context ? { context } : undefined
      );

      const assistantMessage: Message = {
        role: "assistant",
        text: response.text,
        plans: response.plans,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If the response includes route plans, automatically select the first one
      if (response.plans && response.plans.length > 0 && onRouteSelect) {
        onRouteSelect(response.plans[0]);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: Message = {
        role: "assistant",
        text: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsModalVisible(false);
  };

  const handleOpen = () => {
    setIsModalVisible(true);
    // Add welcome message if chat is empty
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          text: "Hi! I'm your NYU Transit assistant. I can help you find routes, plan trips, and answer questions about the shuttle system. How can I help you?",
        },
      ]);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <Text style={styles.chatButtonIcon}>💬</Text>
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>NYU Transit Assistant</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((message, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageContainer,
                    message.role === "user"
                      ? styles.userMessage
                      : styles.assistantMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.role === "user"
                        ? styles.userMessageText
                        : styles.assistantMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                  {message.plans && message.plans.length > 0 && (
                    <View style={styles.plansContainer}>
                      <Text style={styles.plansInfo}>
                        I found {message.plans.length} route option
                        {message.plans.length > 1 ? "s" : ""} for you.
                      </Text>
                      <TouchableOpacity
                        style={styles.viewRoutesButton}
                        onPress={() => {
                          if (onViewRouteOptions && message.plans) {
                            onViewRouteOptions(message.plans);
                            setIsModalVisible(false);
                          } else if (
                            onRouteSelect &&
                            message.plans &&
                            message.plans.length > 0
                          ) {
                            onRouteSelect(message.plans[0]);
                            setIsModalVisible(false);
                          }
                        }}
                      >
                        <Text style={styles.viewRoutesButtonText}>
                          View Route Options
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
              {isLoading && (
                <View
                  style={[styles.messageContainer, styles.assistantMessage]}
                >
                  <ActivityIndicator size="small" color="#8b5cf6" />
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ask me anything..."
                placeholderTextColor="#9ca3af"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                editable={!isLoading && userLocation !== null}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || !userLocation || isLoading) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || !userLocation || isLoading}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chatButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  chatButtonIcon: {
    fontSize: 28,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#6b7280",
    fontWeight: "300",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    maxWidth: "80%",
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#8b5cf6",
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "white",
  },
  assistantMessageText: {
    color: "#111827",
  },
  plansContainer: {
    marginTop: 12,
    gap: 8,
  },
  plansInfo: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  viewRoutesButton: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  viewRoutesButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  sendButton: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
