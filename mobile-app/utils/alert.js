import { Alert as RNAlert, Platform } from 'react-native';

/**
 * Cross-platform Alert wrapper.
 * Displays a premium custom HTML overlay on Web to avoid default browser alert boxes.
 */
const showWebAlert = (title, message, buttons) => {
  if (typeof document === 'undefined') return;

  // Clear existing alert if somehow open
  const existingAlert = document.getElementById('custom-alert-backdrop');
  if (existingAlert) {
    document.body.removeChild(existingAlert);
  }

  // Create backdrop container
  const backdrop = document.createElement('div');
  backdrop.id = 'custom-alert-backdrop';
  backdrop.style.position = 'fixed';
  backdrop.style.top = '0';
  backdrop.style.left = '0';
  backdrop.style.width = '100vw';
  backdrop.style.height = '100vh';
  backdrop.style.backgroundColor = 'rgba(15, 23, 42, 0.5)'; // Slate-900 overlay with opacity
  backdrop.style.display = 'flex';
  backdrop.style.alignItems = 'center';
  backdrop.style.justifyContent = 'center';
  backdrop.style.zIndex = '999999';
  backdrop.style.backdropFilter = 'blur(4px)';
  backdrop.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  // Create dialog container
  const dialog = document.createElement('div');
  dialog.style.backgroundColor = '#ffffff';
  dialog.style.borderRadius = '16px';
  dialog.style.padding = '24px';
  dialog.style.width = '90%';
  dialog.style.maxWidth = '400px';
  dialog.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
  dialog.style.animation = 'customAlertFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Inject keyframe animation if not already injected
  if (!document.getElementById('custom-alert-styles')) {
    const style = document.createElement('style');
    style.id = 'custom-alert-styles';
    style.innerHTML = `
      @keyframes customAlertFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  // Header Title
  const titleEl = document.createElement('h3');
  titleEl.innerText = title || 'Notification';
  titleEl.style.margin = '0 0 10px 0';
  titleEl.style.fontSize = '18px';
  titleEl.style.fontWeight = '700';
  titleEl.style.color = '#1e293b'; // Colors.textPrimary (slate-800)
  dialog.appendChild(titleEl);

  // Message body
  if (message) {
    const msgEl = document.createElement('p');
    msgEl.innerText = message;
    msgEl.style.margin = '0 0 24px 0';
    msgEl.style.fontSize = '14px';
    msgEl.style.lineHeight = '1.6';
    msgEl.style.color = '#64748b'; // Colors.textSecondary (slate-500)
    dialog.appendChild(msgEl);
  } else {
    titleEl.style.marginBottom = '24px';
  }

  // Footer Buttons
  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.style.gap = '12px';

  const closeAlert = () => {
    if (document.body.contains(backdrop)) {
      document.body.removeChild(backdrop);
    }
  };

  if (buttons && buttons.length > 0) {
    buttons.forEach((btn) => {
      const buttonEl = document.createElement('button');
      buttonEl.innerText = btn.text || 'OK';
      buttonEl.style.padding = '10px 18px';
      buttonEl.style.fontSize = '14px';
      buttonEl.style.fontWeight = '600';
      buttonEl.style.borderRadius = '8px';
      buttonEl.style.border = 'none';
      buttonEl.style.cursor = 'pointer';
      buttonEl.style.transition = 'all 0.15s ease';

      const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel' || btn.text?.toLowerCase() === 'no';
      if (isCancel) {
        buttonEl.style.backgroundColor = '#f1f5f9'; // borderLight
        buttonEl.style.color = '#64748b'; // textSecondary
        buttonEl.onmouseover = () => buttonEl.style.backgroundColor = '#e2e8f0';
        buttonEl.onmouseout = () => buttonEl.style.backgroundColor = '#f1f5f9';
      } else {
        buttonEl.style.backgroundColor = '#f97316'; // Colors.primary (Orange)
        buttonEl.style.color = '#ffffff';
        buttonEl.onmouseover = () => buttonEl.style.backgroundColor = '#ea580c'; // primaryDark
        buttonEl.onmouseout = () => buttonEl.style.backgroundColor = '#f97316';
      }

      buttonEl.onclick = () => {
        closeAlert();
        if (btn.onPress) {
          btn.onPress();
        }
      };
      footer.appendChild(buttonEl);
    });
  } else {
    // Default OK button
    const okBtn = document.createElement('button');
    okBtn.innerText = 'OK';
    okBtn.style.padding = '10px 18px';
    okBtn.style.fontSize = '14px';
    okBtn.style.fontWeight = '600';
    okBtn.style.borderRadius = '8px';
    okBtn.style.border = 'none';
    okBtn.style.cursor = 'pointer';
    okBtn.style.backgroundColor = '#f97316';
    okBtn.style.color = '#ffffff';
    okBtn.style.transition = 'all 0.15s ease';
    okBtn.onmouseover = () => okBtn.style.backgroundColor = '#ea580c';
    okBtn.onmouseout = () => okBtn.style.backgroundColor = '#f97316';

    okBtn.onclick = () => {
      closeAlert();
    };
    footer.appendChild(okBtn);
  }

  dialog.appendChild(footer);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
};

const Alert = {
  alert(title, message, buttons, options) {
    if (Platform.OS === 'web') {
      showWebAlert(title, message, buttons);
    } else {
      // Native iOS/Android Alert
      RNAlert.alert(title, message, buttons, options);
    }
  }
};

export default Alert;

