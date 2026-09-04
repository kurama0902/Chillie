import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { AppTheme, ChatMessage } from '@/types/types';
import {
  useGetMessagesInfiniteQuery,
  useSendMessageMutation,
} from '@/store/api';
import ChatHeader from './Header';
import ChatMessagesList from './List';
import MessageComposer from './SendMessage';
import MessageContextMenu from './ContextMenu';
import { ChatAttachment } from './attachments';

const firstParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export default function Chat() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const params = useLocalSearchParams<{
    chatId?: string | string[];
    name?: string | string[];
    lastname?: string | string[];
    image_url?: string | string[];
  }>();

  const chatId = firstParam(params.chatId);
  const name = firstParam(params.name) ?? 'Chat';
  const lastname = firstParam(params.lastname);
  const displayName = [name, lastname].filter(Boolean).join(' ');
  const imageUrl = firstParam(params.image_url);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [contextMessage, setContextMessage] = useState<ChatMessage | null>(
    null,
  );
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useGetMessagesInfiniteQuery(chatId ?? '', { skip: !chatId });
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const messages = useMemo(
    () => [...(data?.pages ?? [])].reverse().flatMap((page) => page.items),
    [data],
  );

  const loadOlderMessages = () => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!chatId || isSending || (!text && attachments.length === 0)) return;

    const body = new FormData();
    body.append('chatId', chatId);
    body.append('text', text);
    if (replyTo) body.append('replyToMessageId', replyTo.id);
    attachments.forEach((attachment) => {
      body.append('attachments[]', {
        uri: attachment.uri,
        type: attachment.type,
        name: attachment.name,
      } as any);
    });

    try {
      await sendMessage(body).unwrap();
      setDraft('');
      setAttachments([]);
      setReplyTo(null);
      await refetch();
    } catch (error) {
      console.error('sendMessage error:', error);
    }
  };

  const ownBackground = theme.dark
    ? theme.colors.primary
    : theme.colors.onPrimary;
  const ownText = theme.dark
    ? theme.colors.onPrimary
    : theme.colors.onSurface;
  const otherBackground = theme.dark
    ? theme.colors.onPrimary
    : theme.colors.onSurface;
  const otherText = theme.dark
    ? '#000000'
    : theme.colors.onPrimary;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ChatHeader
        displayName={displayName}
        imageUrl={imageUrl}
        onBack={() => router.back()}
      />

      <ChatMessagesList
        messages={messages}
        isLoading={isLoading}
        isFetchingNextPage={isFetchingNextPage}
        onLoadOlder={loadOlderMessages}
        ownBackground={ownBackground}
        ownText={ownText}
        otherBackground={otherBackground}
        otherText={otherText}
        onReply={setReplyTo}
        onLongPress={setContextMessage}
      />

      <MessageComposer
        draft={draft}
        onDraftChange={setDraft}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        replyTo={replyTo}
        displayName={displayName}
        onCancelReply={() => setReplyTo(null)}
        onSend={() => void handleSend()}
        isSending={isSending}
      />

      <MessageContextMenu
        message={contextMessage}
        onClose={() => setContextMessage(null)}
        onReply={(message) => {
          setReplyTo(message);
          setContextMessage(null);
        }}
        onEdit={() => setContextMessage(null)}
        onDelete={() => setContextMessage(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
