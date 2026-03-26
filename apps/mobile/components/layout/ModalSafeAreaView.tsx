import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type ModalSafeAreaViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
};

export function ModalSafeAreaView({ children, style, edges = ['top', 'bottom'] }: ModalSafeAreaViewProps) {
  return (
    <SafeAreaView style={style} edges={edges}>
      {children}
    </SafeAreaView>
  );
}