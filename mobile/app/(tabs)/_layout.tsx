import { useMemo, useState } from 'react';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform, TouchableOpacity, DeviceEventEmitter, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, List, BarChart2, User, Plus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { haptic } from '../../utils/haptics';
import { TransactionEditView } from '../../components/movements/TransactionEditView';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDashboardData } from '../../hooks/useDashboardData';

type TabRouteName = 'index' | 'movements' | 'stats' | 'profile';

function TabIcon({ Icon, color }: { Icon: React.ComponentType<{ size: number; color: string }>; color: string }) {
  return (
    <View style={styles.iconWrapper}>
      <Icon size={18} color={color} />
    </View>
  );
}

function TabBarGlyph({
  Icon,
  color,
  focused,
  label,
}: {
  Icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  focused: boolean;
  label: string;
}) {
  return (
    <View style={styles.tabGlyphWrap}>
      <TabIcon Icon={Icon} color={color} />
      <Text style={[styles.tabGlyphLabel, { color }, focused && styles.tabGlyphLabelFocused]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function AppTabBar({ state, descriptors, navigation, insets, onAddPress, viewportWidth }: BottomTabBarProps & { insets: { bottom: number }; onAddPress: () => void; viewportWidth: number }) {
  const { theme: C } = useTheme();
  const isWeb = Platform.OS === 'web';
  const routes = useMemo(() => state.routes.filter(route => route.name !== '+not-found') as (typeof state.routes[number] & { name: TabRouteName })[], [state]);
  const leftRoutes = routes.slice(0, 2);
  const rightRoutes = routes.slice(2);
  const webFixedStyle = isWeb ? ({ position: 'fixed' as any, left: 0, right: 0, bottom: 0, width: viewportWidth, zIndex: 1000 } as const) : null;

  const renderTabButton = (route: typeof routes[number]) => {
    const isFocused = state.index === state.routes.findIndex(item => item.key === route.key);
    const options = descriptors[route.key]?.options;
    const color = isFocused ? C.primary : C.textMuted;
    const label = typeof options?.title === 'string' ? options.title : route.name;
    const Icon = route.name === 'index' ? Home : route.name === 'movements' ? List : route.name === 'stats' ? BarChart2 : User;

    const onPress = () => {
      haptic.selection();
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        onPress={onPress}
        style={styles.navItem}
        activeOpacity={0.85}
      >
        <TabBarGlyph Icon={Icon} color={color} focused={isFocused} label={label} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.tabBarShell, { backgroundColor: C.bg, borderTopColor: C.borderDim }, isWeb && styles.tabBarShellWeb, webFixedStyle, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}> 
      <View style={[styles.tabBar, styles.navMenu, { backgroundColor: C.bg }]}> 
        {leftRoutes.map(renderTabButton)}
        <TouchableOpacity style={styles.addButton} onPress={() => { haptic.selection(); onAddPress(); }} activeOpacity={0.8}>
          <View style={styles.addButtonIcon}>
            <Plus size={28} color={C.textMain} strokeWidth={3} />
          </View>
        </TouchableOpacity>
        {rightRoutes.map(renderTabButton)}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme: C } = useTheme();
  const { t } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
    <Tabs
      detachInactiveScreens
      tabBar={(props) => <AppTabBar {...props} insets={insets} viewportWidth={width} onAddPress={() => setShowAdd(true)} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarGlyph Icon={Home} color={color} focused={focused} label={t('nav.dashboard')} />
          ),
        }}
        listeners={{ tabPress: () => haptic.selection() }}
      />
      <Tabs.Screen
        name="movements"
        options={{
          title: t('nav.movements'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarGlyph Icon={List} color={color} focused={focused} label={t('nav.movements')} />
          ),
        }}
        listeners={{ tabPress: () => haptic.selection() }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('nav.stats'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarGlyph Icon={BarChart2} color={color} focused={focused} label={t('nav.stats')} />
          ),
        }}
        listeners={{ tabPress: () => haptic.selection() }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarGlyph Icon={User} color={color} focused={focused} label={t('nav.profile')} />
          ),
        }}
        listeners={{ tabPress: () => haptic.selection() }}
      />
    </Tabs>

    {showAdd ? <AddTransactionSheet onClose={() => setShowAdd(false)} /> : null}
    </View>
  );
}

function AddTransactionSheet({ onClose }: { onClose: () => void }) {
  const { webUser, currency } = useAuth();
  const { categories, createTransaction } = useDashboardData(webUser?.id ?? null, currency);

  return (
    <TransactionEditView
      tx={null}
      categories={categories}
      userId={webUser?.id ?? ''}
      onSave={async (txInput) => {
        if (!webUser?.id) return false;
        const success = await createTransaction({ ...txInput, userId: webUser.id });
        if (success) {
          DeviceEventEmitter.emit('tx_saved');
          onClose();
        }
        return success;
      }}
      onClose={onClose}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBarShell: {
    borderTopWidth: 1,
    width: '100%',
  },
  tabBarShellWeb: {
    alignSelf: 'stretch',
  },
  tabBar: {
    elevation: 0,
    shadowOpacity: 0,
  },
  navMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    height: Platform.OS === 'web' ? 78 : 72,
    maxHeight: Platform.OS === 'web' ? 78 : 72,
    paddingHorizontal: 10,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  iconWrapper: {
    minWidth: 28,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabGlyphWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 64,
  },
  tabGlyphLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tabGlyphLabelFocused: {
    fontWeight: '800',
  },
  iconWrapperFocused: {},
  addButton: {
    display: 'flex',
    height: 56,
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  addButtonIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
