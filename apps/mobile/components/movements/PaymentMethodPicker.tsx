import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CreditCard, Landmark, Wallet, ArrowRightLeft } from 'lucide-react-native';
import { PaymentMethod, PaymentMethodType } from '../../types';
import { C } from '../../constants/Colors';
import { Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';

type Props = {
  paymentMethods: PaymentMethod[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
};

const PM_ICONS: Record<PaymentMethodType, React.ComponentType<any>> = {
  credit: CreditCard,
  debit: CreditCard,
  cash: Wallet,
  transfer: ArrowRightLeft,
  other: Landmark,
};

export function PaymentMethodPicker({ paymentMethods, selectedId, onSelect, onClose }: Props) {
  return (
    <Modal visible presentationStyle="pageSheet" onRequestClose={onClose} animationType="slide">
      <SafeAreaView style={styles.wrapper} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>MÉTODO DE PAGO</Text>
          {/* @ts-ignore */}
          <TouchableOpacity onPress={onClose}><X size={20} color={C.textMuted} /></TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.noneOption} onPress={() => onSelect(null)}>
          <Text style={styles.noneText}>Sin método de pago</Text>
        </TouchableOpacity>

        <FlatList
          data={paymentMethods}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            const Icon = PM_ICONS[item.type] ?? Landmark;
            const color = item.color ?? C.primary;
            return (
              <TouchableOpacity
                style={[styles.pmItem, isSelected && { backgroundColor: `${color}22`, borderColor: color }]}
                onPress={() => onSelect(item.id)}
              >
                <View style={[styles.pmIcon, { backgroundColor: `${color}33` }]}>
                  <Icon size={20} color={color} />
                </View>
                <View style={styles.pmInfo}>
                  <Text style={styles.pmName}>{item.name}</Text>
                  {item.last_four && <Text style={styles.pmSub}>**** {item.last_four}</Text>}
                </View>
                {isSelected && (
                  <View style={[styles.checkDot, { backgroundColor: color }]} />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No hay métodos de pago</Text>}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { color: C.textMain, fontSize: FontSize.md, fontWeight: FontWeight.black },
  noneOption: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: C.borderDim,
  },
  noneText: { color: C.textMuted, fontSize: FontSize.sm, fontStyle: 'italic' },
  listContent: { padding: Spacing.base, gap: Spacing.sm },
  pmItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceAlt, borderRadius: Radius.block,
    padding: Spacing.md, borderWidth: 2, borderColor: 'transparent',
    marginBottom: Spacing.sm,
  },
  pmIcon: {
    width: 44, height: 44, borderRadius: Radius.block,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  pmInfo: { flex: 1 },
  pmName: { color: C.textMain, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  pmSub: { color: C.textMuted, fontSize: FontSize.xs, fontFamily: 'monospace' },
  checkDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { color: C.textMuted, textAlign: 'center', padding: Spacing.xl, fontSize: FontSize.sm },
});
