import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

type ProfileGoalViewProps = {
    sym: string;
    newGoal: string;
    setNewGoal: React.Dispatch<React.SetStateAction<string>>;
    onCancel: () => void;
    onSave: () => void;
};

export const ProfileGoalView = ({ sym, newGoal, setNewGoal, onCancel, onSave }: ProfileGoalViewProps) => {
    const { t } = useLanguage();

    return (
        <div>
            <div className="profile-subview-label">{t('profile.configure_goal')}</div>

            <div className="profile-goal-form">
                <div>
                    <span className="profile-edit-field-label">{t('profile.goal_max_amount')} ({sym})</span>
                    <div className="profile-goal-input-wrap">
                        <span className="profile-goal-sym">{sym}</span>
                        <input
                            className="profile-goal-input"
                            type="number"
                            value={newGoal}
                            onChange={e => setNewGoal(e.target.value)}
                        />
                    </div>
                </div>
                <p className="profile-goal-hint">
                    {t('profile.goal_hint')}
                </p>
                <div className="profile-goal-actions">
                    <button className="profile-goal-cancel" onClick={onCancel}>{t('btn.cancel')}</button>
                    <button className="profile-goal-save" onClick={onSave}>{t('profile.goal_save_btn')}</button>
                </div>
            </div>
        </div>
    );
};