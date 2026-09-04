import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { AppTheme } from '@/types/types';

type AboutYouSlideProps = {
  initialValue?: string;
  onChange: (value: string) => void;
};

export default function AboutYouSlide({
  initialValue = '',
  onChange,
}: AboutYouSlideProps) {
  const theme = useTheme<AppTheme>();
  const [value, setValue] = useState(initialValue);

  const handleChange = (text: string) => {
    const nextValue = text.slice(0, 500);
    setValue(nextValue);
    onChange(nextValue);
  };

  return (
    <View style={styles.container}>
      <Text variant='headlineLarge' style={styles.title}>
        Tell about yourself
      </Text>
      <TextInput
        mode='outlined'
        label='Tell people a little about yourself'
        multiline
        numberOfLines={5}
        maxLength={500}
        value={value}
        onChangeText={handleChange}
        style={styles.input}
      />
      <Text style={[styles.counter, { color: theme.colors.onSurfaceVariant }]}>
        {value.length}/500
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  input: {
    minHeight: 130,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: -6,
  },
});
