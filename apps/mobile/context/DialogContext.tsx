import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import { Spacing, FontSize, FontWeight, Radius } from '../constants/theme';
import { haptic } from '../utils/haptics';

type DialogOptions = {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'alert' | 'confirm' | 'danger';
    showCancel?: boolean;
    asyncAction?: () => Promise<void>;
};

type DialogContextType = {
    alert: (message: string, title?: string) => Promise<void>;
    confirm: (options: DialogOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
    const { t } = useLanguage();
    const { theme: C } = useTheme();

    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<DialogOptions>({ message: '' });
    const [resolvePromise, setResolvePromise] = useState<(value: boolean) => void>();
    const [loading, setLoading] = useState(false);

    const close = useCallback((result: boolean) => {
        setVisible(false);
        if (resolvePromise) resolvePromise(result);
    }, [resolvePromise]);

    const alert = useCallback((message: string, title?: string) => {
        return new Promise<void>((resolve) => {
            setOptions({
                title: title || t('btn.error'),
                message,
                type: 'alert',
                confirmText: 'OK',
            });
            setResolvePromise(() => () => resolve());
            setVisible(true);
            haptic.error();
        });
    }, [t]);

    const confirm = useCallback((opts: DialogOptions) => {
        return new Promise<boolean>((resolve) => {
            setOptions({
                title: opts.title || t('btn.warning'),
                type: opts.type || 'confirm',
                showCancel: opts.showCancel !== false,
                confirmText: opts.confirmText || t('btn.confirm'),
                cancelText: opts.cancelText || t('btn.cancel'),
                ...opts,
            });
            setResolvePromise(() => resolve);
            setVisible(true);
            haptic.selection();
        });
    }, [t]);

    const handleConfirm = async () => {
        if (!options.asyncAction) {
            close(true);
            return;
        }

        setLoading(true);
        try {
            await options.asyncAction();
            close(true);
        } catch (e) {
            console.error(e);
            // keep it open or handle error
        } finally {
            setLoading(false);
        }
    };

    return (
        <DialogContext.Provider value={{ alert, confirm }}>
            {children}
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => { if (!loading) close(false) }}
            >
                <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                    <View style={[styles.dialog, { backgroundColor: C.surface, borderColor: C.border }]}> 
                        {options.title && (
                            <Text style={[styles.title, { color: C.textMain }]}>
                                {options.title.toUpperCase()}
                            </Text>
                        )}
                        
                        <Text style={[styles.message, { color: C.textMuted }]}>
                            {options.message}
                        </Text>
                        
                        <View style={styles.actions}>
                            {options.showCancel !== false && options.type !== 'alert' && (
                                <TouchableOpacity 
                                    style={[styles.btn, styles.cancelBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                                    onPress={() => close(false)}
                                    disabled={loading}
                                >
                                    <Text style={[styles.btnText, { color: C.textMain }]}>
                                        {options.cancelText?.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            
                            <TouchableOpacity 
                                style={[
                                    styles.btn, 
                                    options.type === 'danger' ? { backgroundColor: C.expenseText, borderColor: C.expenseText } : { backgroundColor: C.primary, borderColor: C.primary },
                                    loading && { opacity: 0.7 }
                                ]}
                                onPress={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color={options.type === 'danger' ? '#fff' : C.primaryText} />
                                ) : (
                                    <Text style={[
                                        styles.btnText, 
                                        { color: options.type === 'danger' ? '#fff' : C.primaryText }
                                    ]}>
                                        {options.confirmText?.toUpperCase()}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </DialogContext.Provider>
    );
}

export function useDialog() {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error('useDialog must be used within DialogProvider');
    return ctx;
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    dialog: {
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderRadius: Radius.block,
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    title: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.black,
        letterSpacing: 0.5,
    },
    message: {
        fontSize: FontSize.base,
        lineHeight: 22,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    btn: {
        minWidth: 80,
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.block,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    cancelBtn: {
        borderWidth: 1,
    },
    btnText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.black,
        letterSpacing: 0.5,
    },
});
