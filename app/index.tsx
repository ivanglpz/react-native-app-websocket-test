import * as Crypto from "expo-crypto";
import { type ErrorBoundaryProps } from "expo-router";
import Storage, {
  SQLiteStorageSetItemUpdateFunction,
} from "expo-sqlite/kv-store";
import { StatusBar } from "expo-status-bar";
import { useAtomValue } from "jotai";
import { atomWithDefault } from "jotai/utils";
import { useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
const createStore = (key: string) => {
  return {
    get: async () => await Storage.getItem(key),
    set: async (value: string | SQLiteStorageSetItemUpdateFunction) =>
      await Storage.setItem(key, value),
  };
};

const USER_STORE = createStore("USER");

const USERID_ATOM = atomWithDefault(async (get) => {
  const persist = await USER_STORE.get();

  if (!persist) {
    const UUID = Crypto.randomUUID();
    USER_STORE.set(UUID);
    return UUID;
  }
  return persist;
});
const WEBSOCKET_URL = "wss://bewildered-yoshi-whil.koyeb.app/";

type PAYLOAD = {
  userId: string;
  message: string;
  type: string;
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "red" }}>
      <Text>{error.message}</Text>
      <Text onPress={retry}>Try Again?</Text>
    </View>
  );
}
export default function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<PAYLOAD[]>([]);
  const userId = useAtomValue(USERID_ATOM);
  const [state, setState] = useState<
    "INITIAL" | "DISCONNECT" | "RECONECT" | "CONNECT"
  >("INITIAL");
  const scroll = useRef<ScrollView>(null);
  const [text, setText] = useState("");
  const handleWebSocket = () => {
    const websocket = new WebSocket(WEBSOCKET_URL);

    websocket.onopen = (data) => {
      setState("CONNECT");
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event?.data ?? "{}");

      setMessages((prev) => [...prev, data]);
      scroll.current?.scrollToEnd({ animated: true });
    };

    websocket.onerror = (error) => {
      console.error("Error en WebSocket:", error);
    };

    websocket.onclose = () => {
      setState("DISCONNECT");
      setTimeout(() => {
        setState("RECONECT");
        handleWebSocket();
      }, 8000); // 8 segundos
    };

    setWs(websocket);
  };

  const handleSubmit = () => {
    if (text?.trim() === "") return;
    setText("");
    ws?.send(JSON.stringify({ userId, message: text, type: "MESSAGE" }));
  };

  useEffect(() => {
    handleWebSocket();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" translucent={false} />
      <SafeAreaView
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <View
          style={{
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <Text>Welcome to Chat Global</Text>
          <Text>ID: {userId}</Text>
          <Text>Status:{state}</Text>
        </View>
        <ScrollView
          ref={scroll}
          style={{
            flex: 1,
            backgroundColor: "#efeeee",
          }}
        >
          <View
            style={{
              width: "100%",
              height: "100%",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {messages?.map((e, index) => {
              return (
                <View key={index}>
                  <Text
                    style={{
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    {e?.userId === userId ? "Me" : e?.userId?.slice(0, 4)}
                  </Text>

                  <Text>Message: {e?.message}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <View
          style={{
            width: "100%",
            padding: 20,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          {/* < */}

          <TextInput
            style={styles.input}
            onChangeText={(e) => setText(e)}
            value={text}
            placeholder="Enter a message"
          />
          <TouchableOpacity
            style={{
              backgroundColor: "black",
              width: 50,
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 8,
            }}
            onPress={handleSubmit}
          >
            <Text
              style={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    height: 40,
    borderWidth: 1,
    padding: 10,
    flex: 1,
    borderRadius: 8,
  },
});
