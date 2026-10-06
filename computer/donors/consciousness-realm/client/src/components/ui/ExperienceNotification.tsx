import { useState, useEffect } from "react";
import { useConsciousness } from "../../lib/stores/useConsciousness";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  message: string;
  type: 'experience' | 'field_switch' | 'field_unlock';
  color: string;
}

export default function ExperienceNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { fields, activeField } = useConsciousness();
  
  // Listen for experience gains and field changes
  useEffect(() => {
    const unsubscribe = useConsciousness.subscribe(
      (state) => ({ 
        totalExp: state.totalExperience, 
        activeField: state.activeField,
        fields: state.fields 
      }),
      (current, previous) => {
        // Experience gain notification
        if (current.totalExp > previous.totalExp) {
          const expGained = current.totalExp - previous.totalExp;
          const activeFieldData = current.fields.find(f => f.id === current.activeField);
          
          addNotification({
            id: `exp-${Date.now()}`,
            message: `+${expGained} XP`,
            type: 'experience',
            color: activeFieldData?.color || '#ffffff'
          });
        }
        
        // Field switch notification
        if (current.activeField !== previous.activeField) {
          const fieldData = current.fields.find(f => f.id === current.activeField);
          if (fieldData) {
            addNotification({
              id: `field-${Date.now()}`,
              message: `${fieldData.name} Field Activated`,
              type: 'field_switch',
              color: fieldData.color
            });
          }
        }
        
        // Field unlock notification
        const newlyUnlocked = current.fields.filter(f => 
          f.unlocked && !previous.fields.find(pf => pf.id === f.id)?.unlocked
        );
        
        newlyUnlocked.forEach(field => {
          addNotification({
            id: `unlock-${field.id}-${Date.now()}`,
            message: `🔓 ${field.name} Field Unlocked!`,
            type: 'field_unlock',
            color: field.color
          });
        });
      }
    );
    
    return unsubscribe;
  }, []);
  
  const addNotification = (notification: Notification) => {
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };
  
  return (
    <div className="fixed top-20 left-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: -100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="px-4 py-2 rounded-lg shadow-lg text-white font-semibold"
            style={{ 
              backgroundColor: `${notification.color}cc`,
              border: `2px solid ${notification.color}`,
              boxShadow: `0 0 20px ${notification.color}50`
            }}
          >
            {notification.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}