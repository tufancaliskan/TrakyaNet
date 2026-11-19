import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { HubConnection, HubConnectionBuilder, HubConnectionState, HttpTransportType, LogLevel } from '@microsoft/signalr';
import { MessageCircle, Send } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { TOKEN_KEY, api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChannelType, Message } from '@/types/database';

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender_name: string;
};

function toChatMessage(message: Message): ChatMessage {
  return {
    id: message.id,
    content: message.content,
    created_at: message.created_at,
    sender_id: message.sender_id,
    sender_name: message.sender_name,
  };
}

export function RealtimeChat({
  channelType,
  channelId,
  keyboardOffset = 0,
  includeBottomInset = true,
}: {
  channelType: ChannelType;
  channelId: string | null;
  keyboardOffset?: number;
  includeBottomInset?: boolean;
}) {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const connectionRef = useRef<HubConnection | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const append = useCallback((message: ChatMessage) => {
    setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<Message[]>('/api/messages', {
        params: {
          channel_type: channelType,
          ...(channelId ? { channel_id: channelId } : {}),
        },
      });
      setMessages(data.map(toChatMessage));
    } catch (loadError) {
      setError(errorMessage(loadError, 'Sohbet yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }, [channelId, channelType]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const root = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
    if (!root) return;
    let active = true;
    const connection = new HubConnectionBuilder()
      .withUrl(`${root}/hubs/chat`, {
        accessTokenFactory: async () => (await AsyncStorage.getItem(TOKEN_KEY)) ?? '',
        transport: HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect()
      .configureLogging({
        log(level, message) {
          if (level < LogLevel.Error) return;
          if (message.includes('Server timeout') || message.includes('Connection disconnected')) return;
          console.error(message);
        },
      })
      .build();
    connectionRef.current = connection;
    connection.on('MessageReceived', (message: Message) => {
      if (message.channel_type !== channelType) return;
      if ((message.channel_id ?? null) !== channelId) return;
      append(toChatMessage(message));
    });
    connection.on('MessageDeleted', (payload: { id: string }) => {
      setMessages((current) => current.filter((item) => item.id !== payload.id));
    });
    connection
      .start()
      .then(() => connection.invoke('JoinChannel', channelType, channelId))
      .catch((connectError) => {
        if (active) setError(errorMessage(connectError, 'Sohbet canlı bağlanamadı.'));
      });
    return () => {
      active = false;
      connection.stop();
      if (connectionRef.current === connection) connectionRef.current = null;
    };
  }, [append, channelId, channelType]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  async function send() {
    const content = draft.trim();
    if (!content || !profile || sending) return;
    setSending(true);
    try {
      const connection = connectionRef.current;
      const sent =
        connection && connection.state === HubConnectionState.Connected
          ? await connection.invoke<Message>('SendMessage', channelType, channelId, content)
          : (
              await api.post<Message>('/api/messages', {
                channel_type: channelType,
                channel_id: channelId,
                content,
              })
            ).data;
      setDraft('');
      append(toChatMessage(sent));
    } catch (sendError) {
      Alert.alert('Mesaj gönderilemedi', errorMessage(sendError, 'Mesaj gönderilemedi.'));
    } finally {
      setSending(false);
    }
  }

  function confirmDelete(message: ChatMessage) {
    if (message.sender_id !== profile?.id) return;
    Alert.alert('Mesajı sil', 'Bu mesaj yalnızca senden silinir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/messages/${message.id}`);
          } catch (deleteError) {
            Alert.alert('Silinemedi', errorMessage(deleteError));
            return;
          }
          setMessages((current) => current.filter((item) => item.id !== message.id));
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.wine} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon={<MessageCircle color={colors.wine} size={28} />}
              title={error ? 'Sohbet açılamadı' : 'Henüz mesaj yok'}
              body={error ?? 'İlk mesajı sen yaz. Bu kanal canlı güncellenir.'}
            />
          }
          renderItem={({ item }) => {
            const mine = item.sender_id === profile?.id;
            return (
              <Pressable
                onLongPress={() => confirmDelete(item)}
                style={[styles.bubble, mine ? styles.mine : styles.other]}
              >
                {mine ? null : <Text style={styles.name}>{item.sender_name}</Text>}
                <Text style={[styles.content, mine && styles.contentMine]}>{item.content}</Text>
                <Text style={[styles.time, mine && styles.timeMine]}>{formatDateTime(item.created_at)}</Text>
              </Pressable>
            );
          }}
        />
      )}
      <View style={[styles.composer, { paddingBottom: includeBottomInset ? Math.max(insets.bottom, 10) : 10 }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Mesaj yaz"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
          style={styles.input}
        />
        <Pressable
          accessibilityLabel="Gönder"
          disabled={!draft.trim() || sending}
          onPress={send}
          style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}
        >
          {sending ? <ActivityIndicator color={colors.white} size="small" /> : <Send color={colors.white} size={18} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.wine,
    borderBottomRightRadius: 6,
  },
  other: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 6,
  },
  name: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  contentMine: {
    color: colors.cream,
  },
  time: {
    color: colors.muted,
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: colors.goldSoft,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: colors.cream,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    color: colors.ink,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.45,
  },
});
