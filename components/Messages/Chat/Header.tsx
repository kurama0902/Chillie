import { Image } from 'expo-image';
import { View, StyleSheet } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { AppTheme } from '@/types/types';

type ChatHeaderProps = {
  displayName: string;
  imageUrl?: string;
  onBack: () => void;
};

export default function ChatHeader({
  displayName,
  imageUrl,
  onBack,
}: ChatHeaderProps) {
  const theme = useTheme<AppTheme>();

  return (
    <View style={styles.header}>
      <IconButton
        icon='arrow-left'
        onPress={onBack}
        accessibilityLabel='Go back'
      />
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.avatar} /> : null}
      <View style={styles.headerIdentity}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {displayName}
        </Text>
      </View>
      <View style={styles.headerActions}>
        <IconButton
          icon='phone'
          size={22}
          iconColor={theme.colors.onSurface}
          onPress={() => undefined}
          accessibilityLabel='Call'
        />
        <IconButton
          icon='video'
          size={22}
          iconColor={theme.colors.onSurface}
          onPress={() => undefined}
          accessibilityLabel='Video call'
        />
        <IconButton
          icon='dots-vertical'
          size={22}
          iconColor={theme.colors.onSurface}
          onPress={() => undefined}
          accessibilityLabel='More options'
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerIdentity: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
