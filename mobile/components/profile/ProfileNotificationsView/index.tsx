import { View, Text, TouchableOpacity, Switch, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { useBankNotifications } from '../../../hooks/useBankNotifications';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useDialog } from '../../../context/DialogContext';
import { getItemWithLegacyKey } from '../../../lib/storage';
import { Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';
import { X, ShieldAlert, BellRing } from 'lucide-react-native';
import { styles } from './styles';

const BANK_SYNC_KEY = 'safadd_bank_sync';
const LEGACY_BANK_SYNC_KEY = 'safed_bank_sync';
const BANK_AUTO_ADD_KEY = 'safadd_bank_auto_add';
const LEGACY_BANK_AUTO_ADD_KEY = 'safed_bank_auto_add';

type Props = {
  onClose: () => void;
};

export function ProfileNotificationsView({ onClose }: Props) {
  const { session, webUser } = useAuth();
  const { theme: C } = useTheme();
  const { t } = useLanguage();
  const dialog = useDialog();
  const { isSupported, permissionGranted, requestPermission } = useBankNotifications({ 
    enabled: true, 
    userId: webUser?.id ? String(webUser.id) : '',
    accessToken: session?.access_token ?? null,
  });
  
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [autoAddEnabled, setAutoAddEnabled] = useState(false);

  useEffect(() => {
    Promise.all([
      getItemWithLegacyKey(BANK_SYNC_KEY, [LEGACY_BANK_SYNC_KEY]),
      getItemWithLegacyKey(BANK_AUTO_ADD_KEY, [LEGACY_BANK_AUTO_ADD_KEY]),
    ]).then(([syncValue, autoAddValue]) => {
      setSyncEnabled(syncValue === 'true');
      setAutoAddEnabled(autoAddValue === 'true');
    });
  }, []);

  const toggleSync = async (value: boolean) => {
    setSyncEnabled(value);
    await AsyncStorage.setItem(BANK_SYNC_KEY, String(value));
    if (!value) {
      setAutoAddEnabled(false);
      await AsyncStorage.setItem(BANK_AUTO_ADD_KEY, 'false');
    }
  };

  const toggleAutoAdd = async (value: boolean) => {
    setAutoAddEnabled(value);
    await AsyncStorage.setItem(BANK_AUTO_ADD_KEY, String(value));
  };

  const handleRequestPermission = async () => {
    if (Platform.OS !== 'android') {
      dialog.alert(t('mobile.profile.android_only_desc'), t('mobile.profile.not_supported_title'));
      return;
    }

    if (!isSupported) {
      dialog.alert(t('mobile.profile.module_unavailable_desc'), t('mobile.profile.module_unavailable_title'));
      return;
    }
    
    const granted = await requestPermission();
    if (!granted) {
      dialog.alert(t('mobile.profile.permission_denied_desc'), t('mobile.profile.permission_denied_title'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['top', 'bottom']}> 
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textMain }]}>{t('profile.autosync_title').toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.description, { color: C.textMain, backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
          {t('profile.notif_disclosure')}
        </Text>

        {Platform.OS === 'android' ? (
          <>
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardHeader}>
                <ShieldAlert size={20} color={permissionGranted ? C.incomeText : C.expenseText} />
                <Text style={[styles.cardTitle, { color: C.textMain }]}>{t('profile.notif_banks')}</Text>
              </View>
              
              <Text style={[styles.cardDesc, { color: C.textMuted }]}>
                {!isSupported
                  ? t('profile.notif_beta')
                  : permissionGranted 
                    ? t('profile.bank_linked') 
                    : t('profile.bank_unlinked')}
              </Text>
              
              {!permissionGranted && (
                <TouchableOpacity 
                  style={[styles.btn, { backgroundColor: isSupported ? C.primary : C.border }]}
                  onPress={handleRequestPermission}
                  disabled={!isSupported}
                >
                  <Text style={[styles.btnText, { color: isSupported ? C.primaryText : C.textMuted }]}>{t('btn.confirm').toUpperCase()}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <View style={styles.cardHeader}>
                  <BellRing size={20} color={C.primary} />
                  <Text style={[styles.cardTitle, { color: C.textMain }]}>{t('profile.notif_auto_save')}</Text>
                </View>
                <Text style={[styles.cardDesc, { color: C.textMuted, marginBottom: 0 }]}>
                  {t('profile.notif_auto_save_help')}
                </Text>
              </View>
              
              <Switch 
                value={autoAddEnabled} 
                onValueChange={toggleAutoAdd} 
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={autoAddEnabled ? C.primaryText : C.textMuted}
                disabled={!syncEnabled || !permissionGranted || !isSupported}
              />
            </View>

            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
              <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                <View style={styles.cardHeader}>
                  <BellRing size={20} color={C.primary} />
                  <Text style={[styles.cardTitle, { color: C.textMain }]}>{t('profile.notif_banks')}</Text>
                </View>
              </View>
              <Switch 
                value={syncEnabled} 
                onValueChange={toggleSync} 
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={syncEnabled ? C.primaryText : C.textMuted}
                disabled={!permissionGranted || !isSupported}
              />
            </View>

            <Text style={[styles.betaText, { color: C.textMuted }]}>{t('profile.notif_beta')}</Text>
          </>
        ) : (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.cardTitle, { color: C.textMain }]}>{t('profile.notif_beta')}</Text>
            <Text style={[styles.cardDesc, { color: C.textMuted }]}>
              {t('profile.notif_disclosure')}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
