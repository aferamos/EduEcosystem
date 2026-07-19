import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
}

export default function Input({ label, error, icon, hint, secureTextEntry, style, ...props }: Props) {
  const [secure, setSecure] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.container, error ? styles.containerError : undefined]}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : undefined, style]}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secure}
          autoCapitalize="none"
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setSecure(v => !v)} style={styles.eyeWrap}>
            {secure ? (
              <EyeOff size={18} color="#6B7280" />
            ) : (
              <Eye size={18} color="#6B7280" />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  containerError: { borderColor: '#C81E1E' },
  iconWrap: { paddingLeft: 12 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
  },
  inputWithIcon: { paddingLeft: 8 },
  eyeWrap: { paddingRight: 12 },
  error: { fontSize: 12, color: '#C81E1E' },
  hint: { fontSize: 12, color: '#6B7280' },
});
