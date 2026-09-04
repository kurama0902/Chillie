import { useState } from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { AppTheme } from '@/types/types';
import Gallery from '@/components/ProfileDetail/Gallery';

export type SetupProfileImage = {
  uri: string;
  type: string;
  name: string;
};

type ProfileImagesSlideProps = {
  initialImages?: SetupProfileImage[];
  onChange: (images: SetupProfileImage[]) => void;
};

const MAX_IMAGES = 10;

const isPickerCancel = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: string }).code === 'E_PICKER_CANCELLED';

export default function ProfileImagesSlide({
  initialImages = [],
  onChange,
}: ProfileImagesSlideProps) {
  const theme = useTheme<AppTheme>();
  const { height: screenHeight } = useWindowDimensions();
  const [images, setImages] = useState(initialImages);
  const [isPicking, setIsPicking] = useState(false);

  const addImages = async () => {
    if (isPicking || images.length >= MAX_IMAGES) return;

    setIsPicking(true);
    try {
      const picked = await ImagePicker.openPicker({
        mediaType: 'photo',
        multiple: true,
        cropping: false,
        compressImageMaxWidth: 1280,
        compressImageMaxHeight: 1280,
        compressImageQuality: 0.8,
      });
      const selected = Array.isArray(picked) ? picked : [picked];
      const next = selected
        .filter((image) => /^image\/(jpeg|png|webp)$/i.test(image.mime ?? ''))
        .map((image, index) => ({
          uri: image.path,
          type: image.mime,
          name:
            image.filename ??
            'photo_' + Date.now() + '_' + index + '.jpg',
        }));

      const nextImages = [...images, ...next].slice(0, MAX_IMAGES);
      setImages(nextImages);
      onChange(nextImages);
    } catch (error) {
      if (!isPickerCancel(error)) {
        console.error('profile images picker error:', error);
      }
    } finally {
      setIsPicking(false);
    }
  };

  const removeImage = (index: number) => {
    const nextImages = images.filter((_, imageIndex) => imageIndex !== index);
    setImages(nextImages);
    onChange(nextImages);
  };

  return (
    <View style={styles.container}>
      <Text variant='headlineLarge' style={styles.title}>
        Profile images
      </Text>
      <Text
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
      >
        Add at least one photo and up to 10 photos to show your profile.
      </Text>
      <Button
        mode='outlined'
        icon='image-plus'
        loading={isPicking}
        disabled={isPicking || images.length >= MAX_IMAGES}
        onPress={() => void addImages()}
        style={styles.addButton}
      >
        Add profile photos
      </Button>
      <View
        style={[styles.galleryFrame, { height: screenHeight * 0.4 }]}
      >
        <ScrollView
          style={styles.galleryScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.galleryContent}
        >
          <View style={styles.galleryContainer}>
            <Gallery
              title='Photos'
              images={images.map((image) => image.uri)}
              onDelete={removeImage}
            />
          </View>
        </ScrollView>
      </View>
      <Text style={[styles.count, { color: theme.colors.onSurfaceVariant }]}>
        {images.length}/{MAX_IMAGES} photos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  galleryFrame: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
  },
  galleryScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  galleryContent: {
    minHeight: '100%',
    width: '100%',
    paddingVertical: 8,
  },
  galleryContainer: {
    width: '100%',
  },
  addButton: {
    alignSelf: 'center',
  },
  count: {
    alignSelf: 'center',
  },
});
