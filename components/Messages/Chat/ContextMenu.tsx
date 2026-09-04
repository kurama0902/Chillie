import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Portal, Text, useTheme } from 'react-native-paper';
import { AppTheme, ChatMessage } from '@/types/types';

type MessageContextMenuProps = {
  message: ChatMessage | null;
  onClose: () => void;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
};

export default function MessageContextMenu({
  message,
  onClose,
  onReply,
  onEdit,
  onDelete,
}: MessageContextMenuProps) {
  const theme = useTheme<AppTheme>();

  if (!message) return null;

  return (
    <Portal>
      <View style={styles.overlay}>
        <BlurView
          intensity={55}
          tint={theme.dark ? 'dark' : 'light'}
          experimentalBlurMethod='dimezisBlurView'
          style={StyleSheet.absoluteFill}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.menu,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text
            numberOfLines={2}
            style={[
              styles.messagePreview,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {message.text || 'Attachment'}
          </Text>
          <Pressable
            style={styles.action}
            onPress={() => onReply(message)}
          >
            <MaterialCommunityIcons
              name='reply-outline'
              size={22}
              color={theme.colors.onSurface}
            />
            <Text style={{ color: theme.colors.onSurface }}>Reply</Text>
          </Pressable>
          <Pressable
            style={styles.action}
            onPress={() => onEdit(message)}
          >
            <MaterialCommunityIcons
              name='pencil-outline'
              size={22}
              color={theme.colors.onSurface}
            />
            <Text style={{ color: theme.colors.onSurface }}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.action}
            onPress={() => onDelete(message)}
          >
            <MaterialCommunityIcons
              name='delete-outline'
              size={22}
              color={theme.colors.error}
            />
            <Text style={{ color: theme.colors.error }}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  menu: {
    width: 240,
    borderRadius: 16,
    elevation: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  messagePreview: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 48,
    paddingHorizontal: 16,
  },
});
