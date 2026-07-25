import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Button, Menu } from "react-native-paper";
import ImagePicker from "react-native-image-crop-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useUpdateAvatarMutation } from "@/store/api";
import { UserState } from "@/types/types";

type SelectedImage = { uri: string; type: string; name: string };

type Props = {
  avatarUrl?: string | null;
  size?: number;
  onUpdated?: (user: UserState, localPath: string) => void;
  onSelected?: (image: SelectedImage) => void;
};

const AVATAR_PLACEHOLDER = require("../../assets/images/profileImages/avatarPlaceholder.jpg");

const CROP_OPTIONS = {
  mediaType: "photo",
  width: 1000,
  height: 1000,
  compressImageQuality: 0.8,
  cropping: true,
  cropperCircleOverlay: true,
  freeStyleCropEnabled: false,
  hideBottomControls: false,
  enableRotationGesture: false,
  cropperRotateButtonsHidden: false,
  cropperToolbarTitle: "Crop avatar",
} as const;

const normalizeUploadUri = (uri: string) => {
  if (uri.startsWith("content://") || uri.startsWith("file://")) return uri;
  if (uri.startsWith("file:/")) {
    return `file:///${uri.slice("file:/".length).replace(/^\/+/, "")}`;
  }
  if (uri.startsWith("/")) return `file://${uri}`;
  return uri;
};

const isCancel = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === "E_PICKER_CANCELLED";

export default function AvatarEditor({
  avatarUrl,
  size = 250,
  onUpdated,
  onSelected,
}: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [updateAvatar, { isLoading }] = useUpdateAvatarMutation();

  const currentAvatar = preview ?? avatarUrl ?? null;
  const avatarSource = currentAvatar
    ? { uri: currentAvatar }
    : AVATAR_PLACEHOLDER;

  const upload = async (image: {
    path: string;
    mime: string;
    filename?: string;
  }) => {
    const path = normalizeUploadUri(image.path);
    setPreview(path);

    const file: SelectedImage = {
      uri: path,
      type: image.mime,
      name: image.filename ?? "avatar.jpg",
    };

    if (onSelected) {
      onSelected(file);
      return;
    }

    const body = new FormData();
    body.append("avatar", file as any);

    try {
      const response = await updateAvatar(body).unwrap();
      onUpdated?.(response, path);
    } catch (error) {
      console.error("updateAvatar error:", error);
    }
  };

  const pickFromGallery = async () => {
    setMenuVisible(false);
    try {
      const image = await ImagePicker.openPicker(CROP_OPTIONS);
      await upload(image);
    } catch (error) {
      if (!isCancel(error)) console.error("openPicker error:", error);
    }
  };

  const cropCurrent = async () => {
    setMenuVisible(false);
    if (!currentAvatar) return;

    try {
      let path = currentAvatar;
      if (/^https?:\/\//.test(path)) {
        const downloaded = await FileSystem.downloadAsync(
          path,
          FileSystem.cacheDirectory + "avatar-src.jpg",
        );
        path = downloaded.uri;
      }

      const image = await ImagePicker.openCropper({
        ...CROP_OPTIONS,
        path,
      });
      await upload(image);
    } catch (error) {
      if (!isCancel(error)) console.error("openCropper error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Avatar.Image size={size} source={avatarSource} />
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            icon="camera"
            loading={isLoading}
            disabled={isLoading}
            style={styles.changeButton}
            onPress={() => setMenuVisible(true)}
          >
            Change avatar
          </Button>
        }
      >
        <Menu.Item
          onPress={pickFromGallery}
          title="Choose from gallery"
          leadingIcon="image"
        />
        <Menu.Item
          onPress={cropCurrent}
          title="Crop current avatar"
          leadingIcon="crop"
          disabled={!currentAvatar}
        />
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
  },
  changeButton: {
    borderRadius: 20,
  },
});
