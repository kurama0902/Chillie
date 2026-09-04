import { useState } from 'react';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import ImagePicker from 'react-native-image-crop-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  IconButton,
  Menu,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppTheme, ChatMessage } from '@/types/types';
import {
  ChatAttachment,
  getAttachmentKind,
  MAX_ATTACHMENTS,
  mimeFromName,
} from './attachments';

type MessageComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  attachments: ChatAttachment[];
  onAttachmentsChange: (attachments: ChatAttachment[]) => void;
  replyTo: ChatMessage | null;
  displayName: string;
  onCancelReply: () => void;
  onSend: () => void;
  isSending: boolean;
};

export default function MessageComposer({
  draft,
  onDraftChange,
  attachments,
  onAttachmentsChange,
  replyTo,
  displayName,
  onCancelReply,
  onSend,
  isSending,
}: MessageComposerProps) {
  const theme = useTheme<AppTheme>();
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);

  const addMediaAttachments = async () => {
    setAttachmentMenuVisible(false);

    try {
      const picked = await ImagePicker.openPicker({
        mediaType: 'any',
        multiple: true,
        cropping: false,
      });
      const items = Array.isArray(picked) ? picked : [picked];
      const next = items.flatMap((item) => {
        const name = item.filename ?? 'attachment-' + Date.now();
        const type = item.mime || mimeFromName(name);
        const kind = getAttachmentKind(type, name);
        return kind ? [{ uri: item.path, name, type, kind }] : [];
      });

      onAttachmentsChange(
        [...attachments, ...next].slice(0, MAX_ATTACHMENTS),
      );
    } catch (error) {
      if ((error as { code?: string })?.code !== 'E_PICKER_CANCELLED') {
        console.error('media picker error:', error);
      }
    }
  };

  const addFileAttachments = async () => {
    setAttachmentMenuVisible(false);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'audio/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const next = result.assets.flatMap((asset) => {
        const type = asset.mimeType ?? mimeFromName(asset.name);
        const kind = getAttachmentKind(type, asset.name);
        return kind === 'file'
          ? [{ uri: asset.uri, name: asset.name, type, kind }]
          : [];
      });

      onAttachmentsChange(
        [...attachments, ...next].slice(0, MAX_ATTACHMENTS),
      );
    } catch (error) {
      console.error('file picker error:', error);
    }
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange(
      attachments.filter((_, attachmentIndex) => attachmentIndex !== index),
    );
  };

  const canSend = draft.trim().length > 0 || attachments.length > 0;

  return (
    <View style={styles.composer}>
      {replyTo ? (
        <View
          style={[
            styles.replyComposer,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <View
            style={[
              styles.replyComposerAccent,
              { backgroundColor: theme.colors.primary },
            ]}
          />
          <View style={styles.replyComposerContent}>
            <Text
              style={[
                styles.replyComposerLabel,
                { color: theme.colors.primary },
              ]}
            >
              Reply to {replyTo.isMine ? 'You' : displayName}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {replyTo.text || 'Attachment'}
            </Text>
          </View>
          <IconButton
            icon='close'
            size={18}
            onPress={onCancelReply}
            accessibilityLabel='Cancel reply'
          />
        </View>
      ) : null}

      {attachments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.attachmentsRow}
        >
          {attachments.map((attachment, index) => (
            <View
              key={attachment.uri + index}
              style={styles.attachmentPreview}
            >
              {attachment.kind === 'image' ? (
                <Image
                  source={{ uri: attachment.uri }}
                  style={styles.attachmentImage}
                  contentFit='cover'
                />
              ) : (
                <View
                  style={[
                    styles.filePreview,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      attachment.kind === 'video'
                        ? 'video-outline'
                        : 'file-outline'
                    }
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: theme.colors.onSurface,
                      maxWidth: 100,
                    }}
                  >
                    {attachment.name}
                  </Text>
                </View>
              )}
              <IconButton
                icon='close'
                size={16}
                iconColor={theme.colors.onSurface}
                style={styles.removeAttachment}
                onPress={() => removeAttachment(index)}
                accessibilityLabel={'Remove ' + attachment.name}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.composerRow}>
        <Menu
          visible={attachmentMenuVisible}
          onDismiss={() => setAttachmentMenuVisible(false)}
          anchor={
            <IconButton
              icon='paperclip'
              onPress={() => setAttachmentMenuVisible(true)}
              accessibilityLabel='Add attachment'
            />
          }
        >
          <Menu.Item
            leadingIcon='image-multiple'
            title='Images and videos'
            onPress={() => void addMediaAttachments()}
          />
          <Menu.Item
            leadingIcon='file-document-outline'
            title='PDF, TXT or audio'
            onPress={() => void addFileAttachments()}
          />
        </Menu>

        <TextInput
          mode='outlined'
          dense
          multiline
          value={draft}
          onChangeText={onDraftChange}
          placeholder='Message'
          style={styles.messageInput}
          contentStyle={styles.messageInputContent}
        />
        <IconButton
          icon='send'
          onPress={onSend}
          disabled={!canSend || isSending}
          iconColor={theme.colors.primary}
          accessibilityLabel='Send message'
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#777',
    paddingTop: 8,
    paddingBottom: 10,
  },
  replyComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  replyComposerAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  replyComposerContent: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  replyComposerLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  attachmentsRow: {
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  attachmentPreview: {
    width: 76,
    height: 64,
    borderRadius: 10,
    overflow: 'visible',
  },
  attachmentImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  filePreview: {
    width: 150,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  removeAttachment: {
    position: 'absolute',
    right: -4,
    top: -10,
    margin: 0,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    paddingHorizontal: 8,
  },
  messageInput: {
    flex: 1,
    maxHeight: 120,
  },
  messageInputContent: {
    paddingTop: 10,
  },
});
