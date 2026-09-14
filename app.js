/**
 * NX OpenGL Trail — Client & Desktop Bridge Controller
 * Completely Silent (No Click/Audio Sounds) with High-Performance Bridge
 */

// ==========================================
// 1. DESKTOP BRIDGE INTEGRATION
// ==========================================
const DesktopBridge = {
  send(action, payload = {}) {
    const data = { action, payload, timestamp: Date.now() };
    console.log(`[NX-BRIDGE] Action dispatched:`, data);

    // 1. Microsoft WebView2 (C# WinForms / WPF / C++)
    if (window.chrome?.webview?.postMessage) {
      window.chrome.webview.postMessage(JSON.stringify(data));
    }
    // 2. Electron
    else if (window.electronAPI?.send) {
      window.electronAPI.send('nx-action', data);
    }
    // 3. CefSharp / Legacy WebBrowser
    else if (window.external?.notify) {
      window.external.notify(JSON.stringify(data));
    }
    // 4. Qt WebEngine (PyQt / C++)
    else if (window.qtBridge?.postMessage) {
      window.qtBridge.postMessage(JSON.stringify(data));
    }

    // Custom DOM event for wrapper scripts
    window.dispatchEvent(new CustomEvent('nx-desktop-event', { detail: data }));
  }
};

window.NXBridge = DesktopBridge;

// ==========================================
// 2. TOAST NOTIFICATION SYSTEM (SVGs, NO SOUND)
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const svgMap = {
    success: `<svg viewBox="0 0 24 24" class="toast-svg" style="color: #00ffaa;"><path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>`,
    warn: `<svg viewBox="0 0 24 24" class="toast-svg" style="color: #ffb703;"><path fill="currentColor" d="M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z"/></svg>`,
    info: `<svg viewBox="0 0 24 24" class="toast-svg" style="color: #00f2fe;"><path fill="currentColor" d="M11 9H13V7H11M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M11 17H13V11H11V17Z"/></svg>`
  };

  toast.innerHTML = `${svgMap[type] || svgMap.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px) scale(0.9)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==========================================
// 3. TERMINAL LOGGING
// ==========================================
function logTerminal(message, type = 'info', tag = '[ENGINE]') {
  const terminal = document.getElementById('terminal-body');
  if (!terminal) return;

  const line = document.createElement('div');
  line.className = `stream-line ${type}`;

  const time = new Date().toTimeString().split(' ')[0];
  line.innerHTML = `<span class="stream-tag">${tag}</span> [${time}] ${message}`;

  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

// ==========================================
// 4. REAL-TIME LICENSE COUNTDOWN TIMER
// ==========================================
let licenseCountdownInterval = null;

function startLicenseTimer(expiry, timeleft, subscription) {
  const timerElement = document.getElementById('trial-timer');
  const captionElement = document.getElementById('timer-caption');
  if (!timerElement) return;

  if (licenseCountdownInterval) {
    clearInterval(licenseCountdownInterval);
    licenseCountdownInterval = null;
  }

  // Update caption based on subscription type
  if (captionElement) {
    if (subscription && typeof subscription === 'string' && subscription.trim().length > 0 && subscription !== '-') {
      const cleanSub = subscription.trim();
      if (/trial/i.test(cleanSub)) {
        captionElement.innerText = 'TRIAL TIME LEFT';
      } else {
        captionElement.innerText = `${cleanSub.toUpperCase()} TIME LEFT`;
      }
    } else {
      captionElement.innerText = 'LICENSE TIME LEFT';
    }
  }

  // Check if license is Lifetime
  const isLifetime =
    (typeof expiry === 'string' && /life|never|perm/i.test(expiry)) ||
    (typeof timeleft === 'string' && /life|never|perm/i.test(timeleft)) ||
    (typeof expiry === 'number' && expiry > 4000000000);

  if (isLifetime) {
    timerElement.innerText = 'LIFETIME';
    timerElement.style.color = 'var(--cyan-primary)';
    if (captionElement) captionElement.innerText = 'LIFETIME ACCESS';
    return;
  }

  // Determine remaining duration in seconds
  let remainingSec = null;

  // 1. Check numeric timeleft (seconds)
  if (timeleft !== undefined && timeleft !== null && timeleft !== '' && timeleft !== '-') {
    const parsedTimeleft = parseInt(timeleft, 10);
    if (!isNaN(parsedTimeleft) && parsedTimeleft > 0) {
      remainingSec = parsedTimeleft;
    }
  }

  // 2. Check expiry as Unix epoch timestamp (seconds) or date string
  if ((remainingSec === null || remainingSec <= 0) && expiry && expiry !== '-') {
    const numExpiry = parseInt(expiry, 10);
    if (!isNaN(numExpiry) && numExpiry > 1000000000) {
      const nowSec = Math.floor(Date.now() / 1000);
      remainingSec = Math.max(0, numExpiry - nowSec);
    } else {
      const parsedDate = Date.parse(expiry);
      if (!isNaN(parsedDate)) {
        remainingSec = Math.max(0, Math.floor((parsedDate - Date.now()) / 1000));
      }
    }
  }

  // Fallback if no valid timing data could be extracted
  if (remainingSec === null) {
    timerElement.innerText = 'ACTIVE';
    timerElement.style.color = 'var(--cyan-primary)';
    return;
  }

  function updateDisplay() {
    if (remainingSec <= 0) {
      timerElement.innerText = 'EXPIRED';
      timerElement.style.color = '#ff3366';
      if (licenseCountdownInterval) {
        clearInterval(licenseCountdownInterval);
        licenseCountdownInterval = null;
      }
      return;
    }

    const days = Math.floor(remainingSec / 86400);
    const hours = String(Math.floor((remainingSec % 86400) / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((remainingSec % 3600) / 60)).padStart(2, '0');
    const seconds = String(remainingSec % 60).padStart(2, '0');

    if (days > 0) {
      timerElement.innerText = `${days}d ${hours}:${minutes}:${seconds}`;
    } else {
      timerElement.innerText = `${hours}:${minutes}:${seconds}`;
    }
    timerElement.style.color = 'var(--cyan-primary)';
  }

  updateDisplay();
  licenseCountdownInterval = setInterval(() => {
    if (remainingSec > 0) {
      remainingSec--;
      updateDisplay();
    } else {
      updateDisplay();
    }
  }, 1000);
}

// ==========================================
// 5. APPLICATION LOGIC & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initial placeholder state for timer
  const timerElement = document.getElementById('trial-timer');
  if (timerElement) timerElement.innerText = '--:--:--';

  // Elements
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const loginForm = document.getElementById('login-form');
  const licenseInput = document.getElementById('license-key');
  const btnPasteKey = document.getElementById('btn-paste-key');
  const btnQuickFill = document.getElementById('btn-quick-fill');
  const displayKey = document.getElementById('display-key');
  const btnLogout = document.getElementById('btn-logout');

  const btnRunOpenGL = document.getElementById('btn-run-opengl');
  const progressOpenGLWrap = document.getElementById('progress-opengl-wrap');
  const progressOpenGL = document.getElementById('progress-opengl');
  const statusOpenGL = document.getElementById('status-opengl');

  const btnFixVT = document.getElementById('btn-fix-vt');
  const progressVTWrap = document.getElementById('progress-vt-wrap');
  const progressVT = document.getElementById('progress-vt');
  const statusVT = document.getElementById('status-vt');

  const btnClearLog = document.getElementById('btn-clear-log');

  // Quick fill demo key
  if (btnQuickFill) {
    btnQuickFill.addEventListener('click', () => {
      licenseInput.value = '';
    });
  }

  // Paste key from clipboard
  if (btnPasteKey) {
    btnPasteKey.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim().length > 0) {
            licenseInput.value = text.trim();
            showToast('Key pasted from clipboard', 'info');
            return;
          }
        }
      } catch (err) {}
      showToast('Clipboard is empty', 'warn');
    });
  }

  const btnLogin = document.getElementById('btn-login');

  // Login submission (Strict LicenseAuth Verification)
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const key = licenseInput.value.trim();

      if (!key) {
        showToast('Please enter your license key', 'warn');
        licenseInput.classList.add('input-error');
        setTimeout(() => licenseInput.classList.remove('input-error'), 1200);
        return;
      }

      if (btnLogin) {
        btnLogin.disabled = true;
        const btnText = btnLogin.querySelector('.btn-core span');
        if (btnText) btnText.innerText = 'AUTHENTICATING...';
      }

      logTerminal(`Verifying license with authentication server...`, 'info', '[AUTH]');
      DesktopBridge.send('login_request', { licenseKey: key });

      // If running outside WebView2 (browser preview), notify user
      if (!window.chrome?.webview) {
        setTimeout(() => {
          if (btnLogin) {
            btnLogin.disabled = false;
            const btnText = btnLogin.querySelector('.btn-core span');
            if (btnText) btnText.innerText = 'ENTER DASHBOARD';
          }
          logTerminal('Desktop bridge offline. Please launch via OpenGL Test.exe to authenticate.', 'warn', '[AUTH]');
          showToast('Desktop bridge required for license authentication', 'warn');
        }, 1200);
      }
    });
  }

  // Handle messages from C++ Backend (LicenseAuth results & saved key)
  if (window.chrome?.webview) {
    window.chrome.webview.addEventListener('message', (event) => {
      let data = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (err) {}
      }
      if (!data) return;

      if (data.event === 'auth_result') {
        if (btnLogin) {
          btnLogin.disabled = false;
          const btnText = btnLogin.querySelector('.btn-core span');
          if (btnText) btnText.innerText = 'ENTER DASHBOARD';
        }

        if (data.success) {
          const verifiedKey = data.key || licenseInput.value.trim();
          displayKey.innerText = verifiedKey;
          logTerminal(`Authentication successful! Session granted.`, 'success', '[AUTH]');
          showToast(data.message || 'Welcome to NX OpenGL Pro Session', 'success');

          // Start active countdown timer with real key duration from panel
          startLicenseTimer(data.expiry, data.timeleft, data.subscription);

          loginView.classList.remove('active');
          setTimeout(() => {
            dashboardView.classList.add('active');
            logTerminal('Hardware render pipeline connected. Drivers: OK.', 'sys', '[GPU]');
          }, 180);
        } else {
          const errMsg = data.message || 'Invalid License Key';
          logTerminal(`Authentication failed: ${errMsg}`, 'warn', '[AUTH]');
          showToast(errMsg, 'warn');
          licenseInput.classList.add('input-error');
          setTimeout(() => licenseInput.classList.remove('input-error'), 1200);
        }
      } else if (data.event === 'saved_key') {
        if (data.key && licenseInput) {
          licenseInput.value = data.key;
          logTerminal(`Loaded saved license token from secure storage`, 'info', '[AUTH]');
        }
        if (data.expiry || data.timeleft) {
          startLicenseTimer(data.expiry, data.timeleft, data.subscription);
        }
      } else if (data.event === 'script_log') {
        const tag = data.tag || '[ENGINE]';
        const line = data.line || '';
        let type = 'info';
        if (line.includes('[+]') || line.includes('[SUCCESS]')) type = 'success';
        else if (line.includes('[!]') || line.includes('error') || line.includes('fail') || line.includes('denied')) type = 'warn';
        else if (line.includes('[*]')) type = 'accent';

        logTerminal(line, type, tag);

        // Dynamically progress bars based on real script steps
        if (tag === '[OPENGL]' && progressOpenGL) {
          if (line.includes('Step 1')) progressOpenGL.style.width = '20%';
          else if (line.includes('Step 3')) progressOpenGL.style.width = '40%';
          else if (line.includes('Step 5')) progressOpenGL.style.width = '60%';
          else if (line.includes('Step 7')) progressOpenGL.style.width = '75%';
          else if (line.includes('Step 9')) progressOpenGL.style.width = '90%';
          else if (line.includes('[SUCCESS]')) progressOpenGL.style.width = '100%';
        } else if (tag === '[FIX-VT]' && progressVT) {
          if (line.includes('Step 1')) progressVT.style.width = '25%';
          else if (line.includes('Step 2')) progressVT.style.width = '50%';
          else if (line.includes('Step 3')) progressVT.style.width = '70%';
          else if (line.includes('Step 4')) progressVT.style.width = '85%';
          else if (line.includes('[SUCCESS]')) progressVT.style.width = '100%';
        }
      } else if (data.event === 'server_status') {
        if (data.success) {
          const finalTag = data.action === 'fix_opengl' ? '[OPENGL]' : (data.action === 'restore_settings' ? '[FIX-VT]' : '[ENGINE]');
          logTerminal(data.message, 'success', finalTag);
          showToast(data.message, 'success');

          if (data.action === 'fix_opengl' || (!data.action && isOpenGLRunning)) {
            if (progressOpenGL) progressOpenGL.style.width = '100%';
            if (statusOpenGL) {
              statusOpenGL.innerText = 'Active OpenGL';
              statusOpenGL.style.color = 'var(--green-neon)';
            }
            if (btnRunOpenGL) {
              btnRunOpenGL.disabled = false;
              const textSpan = btnRunOpenGL.querySelector('.btn-text');
              if (textSpan) textSpan.innerText = '✔ OPENGL IS ACTIVE (RE-RUN)';
            }
            DesktopBridge.send('opengl_started', { fps: 144, status: 'active' });
            isOpenGLRunning = false;
          } else if (data.action === 'restore_settings' || (!data.action && isVTFixing)) {
            if (progressVT) progressVT.style.width = '100%';
            if (statusVT) {
              statusVT.innerText = 'RESTORED (DEFAULT)';
              statusVT.style.color = 'var(--green-neon)';
            }
            if (statusOpenGL) {
              statusOpenGL.innerText = 'INACTIVE (DIRECTX)';
              statusOpenGL.style.color = 'var(--text-muted)';
            }
            if (btnFixVT) {
              btnFixVT.disabled = false;
              const textSpan = btnFixVT.querySelector('.btn-text');
              if (textSpan) textSpan.innerText = '✔ SETTINGS RESTORED (FIX AGAIN)';
            }
            DesktopBridge.send('vt_fixed', { status: 'restored' });
            isVTFixing = false;
          }
        } else {
          logTerminal(`Error: ${data.message}`, 'warn', '[ERROR]');
          showToast(data.message, 'warn');
          if (btnRunOpenGL) {
            btnRunOpenGL.disabled = false;
            const textSpan = btnRunOpenGL.querySelector('.btn-text');
            if (textSpan) textSpan.innerText = 'RETRY OPENGL ENGINE';
          }
          if (btnFixVT) {
            btnFixVT.disabled = false;
            const textSpan = btnFixVT.querySelector('.btn-text');
            if (textSpan) textSpan.innerText = 'RETRY RESTORE';
          }
          isOpenGLRunning = false;
          isVTFixing = false;
        }
      } else if (data.event === 'gfx_log') {
        appendShellLog(data.message || '', data.type === 'warn' ? '[WARN] >' : (data.type === 'sys' ? '[SYS] >' : '[ENGINE] >'));
        logTerminal(data.message || '', data.type || 'info', '[GFX]');
      } else if (data.event === 'gfx_status') {
        const isConn = !!data.connected;
        const statusTxt = data.status || (isConn ? 'Connected' : 'Standby');
        const activePkg = data.package || '';

        isGameLoopConnected = isConn;
        if (btnConnectGL) {
          btnConnectGL.classList.toggle('connected', isConn);
          btnConnectGL.style.opacity = '1';
        }
        if (txtConnectGL) {
          txtConnectGL.innerText = isConn ? 'Disconnect' : 'Start GameLoop';
        }
        if (sysStatusText) {
          sysStatusText.innerText = statusTxt;
          sysStatusText.style.color = isConn ? '#00ffaa' : 'var(--cyan-primary)';
        }
        if (activePkg) {
          const pkgMap = {
            'com.tencent.ig': 'global',
            'com.pubg.krmobile': 'korea',
            'com.vng.pubgmobile': 'vietnam',
            'com.rekoo.pubgm': 'taiwan',
            'com.pubg.imobile': 'india'
          };
          const targetVal = pkgMap[activePkg];
          if (targetVal) {
            const grp = document.getElementById('grp-game-version');
            if (grp) {
              const b = grp.querySelector(`.option-btn[data-val="${targetVal}"]`);
              if (b) {
                grp.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
                b.classList.add('selected');
              }
            }
          }
        }
      } else if (data.event === 'gfx_current_settings') {
        if (window.NXApplySyncedGfx) {
          window.NXApplySyncedGfx(data.quality, data.fps, data.style, data.shadows, data.package);
        }
      } else if (data.event === 'gfx_task_complete') {
        const isSuccess = !!data.success;
        const msg = data.message || (isSuccess ? 'GFX applied successfully!' : 'GFX application failed.');
        appendShellLog(isSuccess ? `✔ ${msg}` : `✖ ${msg}`);
        showToast(msg, isSuccess ? 'success' : 'warn');
        if (btnApplyGFX) {
          btnApplyGFX.disabled = false;
          btnApplyGFX.style.opacity = '1';
        }
      } else if (data.event === 'emulator_killed') {
        isGameLoopConnected = false;
        if (btnConnectGL) {
          btnConnectGL.classList.remove('connected');
          btnConnectGL.style.opacity = '1';
        }
        if (txtConnectGL) txtConnectGL.innerText = 'Start GameLoop';
        if (sysStatusText) {
          sysStatusText.innerText = 'Standby';
          sysStatusText.style.color = 'var(--cyan-primary)';
        }
        if (btnKillEmulator) {
          btnKillEmulator.disabled = false;
        }
        showToast('All emulator processes terminated', 'warn');
      }
    });
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (licenseCountdownInterval) {
        clearInterval(licenseCountdownInterval);
        licenseCountdownInterval = null;
      }
      const timerElement = document.getElementById('trial-timer');
      if (timerElement) timerElement.innerText = '--:--:--';

      DesktopBridge.send('logout');
      dashboardView.classList.remove('active');
      setTimeout(() => {
        loginView.classList.add('active');
        showToast('Logged out of Pro session', 'info');
      }, 150);
    });
  }

  // ------------------------------------------
  // RUN OPENGL ACTION (SILENT, REAL EXECUTION)
  // ------------------------------------------
  let isOpenGLRunning = false;
  if (btnRunOpenGL) {
    btnRunOpenGL.addEventListener('click', () => {
      if (isOpenGLRunning) {
        showToast('OpenGL engine optimization already running...', 'warn');
        return;
      }

      isOpenGLRunning = true;
      btnRunOpenGL.disabled = true;
      const textSpan = btnRunOpenGL.querySelector('.btn-text');
      if (textSpan) textSpan.innerText = 'INITIALIZING GL ENGINE...';
      progressOpenGLWrap.classList.add('active');
      progressOpenGL.style.width = '10%';

      logTerminal('Initializing GameLoop OpenGL Engine...', 'accent', '[OPENGL]');
      DesktopBridge.send('run_opengl', { status: 'starting' });
    });
  }

  // ------------------------------------------
  // FIX VT ACTION (SILENT, REAL EXECUTION)
  // ------------------------------------------
  let isVTFixing = false;
  if (btnFixVT) {
    btnFixVT.addEventListener('click', () => {
      if (isVTFixing) {
        showToast('Restoration in progress...', 'warn');
        return;
      }

      isVTFixing = true;
      btnFixVT.disabled = true;
      const textSpan = btnFixVT.querySelector('.btn-text');
      if (textSpan) textSpan.innerText = 'RESTORING ORIGINAL SETTINGS...';
      progressVTWrap.classList.add('active');
      progressVT.style.width = '10%';

      logTerminal('Initializing GameLoop System Restore...', 'warn', '[FIX-VT]');
      DesktopBridge.send('fix_vt', { status: 'starting' });
    });
  }

  // ------------------------------------------
  // 1. SIDEBAR NAVIGATION TABS SWITCHING
  // ------------------------------------------
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      navItems.forEach(n => n.classList.remove('active'));
      btn.classList.add('active');

      tabPanes.forEach(pane => {
        if (pane.id === `tab-pane-${targetTab}`) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });

  // ------------------------------------------
  // 2. GFX ACTIVITY SHELL LOGGING
  // ------------------------------------------
  function appendShellLog(msg, prefix = '[SYS] >') {
    const shellLog = document.getElementById('shell-log');
    if (!shellLog) return;
    const time = new Date().toTimeString().split(' ')[0];
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-prefix">${prefix}</span> <span class="log-txt">[${time}] ${msg}</span>`;
    shellLog.appendChild(entry);
    shellLog.scrollTop = shellLog.scrollHeight;
  }

  // ------------------------------------------
  // 3. GFX OPTION BUTTON GROUPS
  // ------------------------------------------
  const optionButtons = document.querySelectorAll('.option-btn');
  optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const parentGroup = btn.closest('.btn-group');
      if (!parentGroup) return;

      // Deselect sibling buttons in same group
      parentGroup.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      // Select clicked button
      btn.classList.add('selected');

      const grpId = parentGroup.id;
      const val = btn.getAttribute('data-val');
      const label = btn.innerText.replace(/BETA/g, '').trim();

      // Remember preferences
      if (grpId === 'grp-game-version') localStorage.setItem('nx_gfx_version', val);
      if (grpId === 'grp-gfx-quality') localStorage.setItem('nx_gfx_quality', val);
      if (grpId === 'grp-fps') localStorage.setItem('nx_gfx_fps', val);
      if (grpId === 'grp-style') localStorage.setItem('nx_gfx_style', val);
      if (grpId === 'grp-shadows') localStorage.setItem('nx_gfx_shadows', val);

      appendShellLog(`Selected: ${label}`);
    });
  });

  // Restore saved GFX settings from localStorage if available
  try {
    const savedVersion = localStorage.getItem('nx_gfx_version');
    const savedQuality = localStorage.getItem('nx_gfx_quality');
    const savedFps = localStorage.getItem('nx_gfx_fps');
    const savedStyle = localStorage.getItem('nx_gfx_style');
    const savedShadows = localStorage.getItem('nx_gfx_shadows');

    const restoreGroup = (groupId, savedVal) => {
      if (!savedVal) return;
      const grp = document.getElementById(groupId);
      if (!grp) return;
      const targetBtn = grp.querySelector(`.option-btn[data-val="${savedVal}"]`);
      if (targetBtn) {
        grp.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        targetBtn.classList.add('selected');
      }
    };

    restoreGroup('grp-game-version', savedVersion);
    restoreGroup('grp-gfx-quality', savedQuality);
    restoreGroup('grp-fps', savedFps);
    restoreGroup('grp-style', savedStyle);
    restoreGroup('grp-shadows', savedShadows);
  } catch (err) {}

  // ------------------------------------------
  // 4. GAMELOOP GFX ACTIONS (START, APPLY, KILL)
  // ------------------------------------------
  let isGameLoopConnected = false;
  const btnConnectGL = document.getElementById('btn-connect-gameloop');
  const txtConnectGL = document.getElementById('txt-connect-gl');
  const sysStatusText = document.getElementById('sys-status-text');
  const btnApplyGFX = document.getElementById('btn-apply-gfx');
  const btnKillEmulator = document.getElementById('btn-kill-emulator');
  const hasNativeBridge = !!window.chrome?.webview;

  // Global Bridge Adapter for direct C++ ExecuteScript callbacks
  window.NXUpdateState = {
    setConnected: function(connected, statusText, activePkg) {
      isGameLoopConnected = !!connected;
      if (btnConnectGL) {
        btnConnectGL.classList.toggle('connected', isGameLoopConnected);
        btnConnectGL.style.opacity = '1';
      }
      if (txtConnectGL) {
        txtConnectGL.innerText = isGameLoopConnected ? 'Disconnect' : 'Start GameLoop';
      }
      if (sysStatusText) {
        sysStatusText.innerText = statusText || (isGameLoopConnected ? 'Connected' : 'Standby');
        sysStatusText.style.color = isGameLoopConnected ? '#00ffaa' : 'var(--cyan-primary)';
      }
    },
    addLogEntry: function(logText) {
      appendShellLog(logText);
    },
    onTaskComplete: function(msg, isSuccess) {
      if (btnApplyGFX) {
        btnApplyGFX.disabled = false;
        btnApplyGFX.style.opacity = '1';
      }
      showToast(msg, isSuccess ? 'success' : 'warn');
    }
  };

  // Connect / Start GameLoop
  if (btnConnectGL) {
    btnConnectGL.addEventListener('click', () => {
      if (!isGameLoopConnected) {
        if (txtConnectGL) txtConnectGL.innerText = 'Connecting...';
        btnConnectGL.style.opacity = '0.7';
        appendShellLog('Searching for GameLoop and hooking AOW render context...');
        logTerminal('Searching for GameLoop process & hooking...', 'accent', '[GFX]');
        DesktopBridge.send('connect_request', { target: 'gameloop' });

        // Fallback simulation only if running in standalone browser without C++ backend
        if (!hasNativeBridge) {
          setTimeout(() => {
            isGameLoopConnected = true;
            btnConnectGL.style.opacity = '1';
            btnConnectGL.classList.add('connected');
            if (txtConnectGL) txtConnectGL.innerText = 'Disconnect';
            if (sysStatusText) {
              sysStatusText.innerText = 'Connected (Hooked)';
              sysStatusText.style.color = '#00ffaa';
            }
            appendShellLog('✔ GameLoop process connected successfully. Ready to Apply GFX.');
            logTerminal('GameLoop process connected successfully.', 'success', '[GFX]');
            showToast('GameLoop Connected', 'success');
          }, 900);
        }
      } else {
        DesktopBridge.send('disconnect_request', {});
        if (!hasNativeBridge) {
          isGameLoopConnected = false;
          btnConnectGL.classList.remove('connected');
          btnConnectGL.style.opacity = '1';
          if (txtConnectGL) txtConnectGL.innerText = 'Start GameLoop';
          if (sysStatusText) {
            sysStatusText.innerText = 'Standby';
            sysStatusText.style.color = 'var(--cyan-primary)';
          }
          appendShellLog('GameLoop session disconnected.');
          logTerminal('GameLoop session disconnected.', 'info', '[GFX]');
          showToast('GameLoop Disconnected', 'info');
        }
      }
    });
  }

  // Apply GFX
  if (btnApplyGFX) {
    btnApplyGFX.addEventListener('click', () => {
      const selVersion = document.querySelector('#grp-game-version .option-btn.selected')?.dataset.val || 'global';
      const selQuality = document.querySelector('#grp-gfx-quality .option-btn.selected')?.dataset.val || 'smooth';
      const selFPS = document.querySelector('#grp-fps .option-btn.selected')?.dataset.val || '120';
      const selStyle = document.querySelector('#grp-style .option-btn.selected')?.dataset.val || 'classic';
      const selShadows = document.querySelector('#grp-shadows .option-btn.selected')?.dataset.val || 'disable';

      const config = {
        version: selVersion,
        quality: selQuality,
        fps: parseInt(selFPS, 10) || 120,
        style: selStyle,
        shadows: selShadows
      };

      appendShellLog(`Applying GFX Profile: [${selVersion.toUpperCase()}] ${selQuality.toUpperCase()} @ ${selFPS}FPS | ${selStyle} | Shadows: ${selShadows}`);
      logTerminal(`Applying GFX profile: ${selVersion.toUpperCase()} ${selQuality.toUpperCase()} ${selFPS}FPS`, 'info', '[GFX]');
      
      btnApplyGFX.disabled = true;
      btnApplyGFX.style.opacity = '0.7';

      DesktopBridge.send('apply_gfx', config);

      // Fallback simulation only if running in standalone browser without C++ backend
      if (!hasNativeBridge) {
        setTimeout(() => {
          appendShellLog('Overwriting UserCustom.ini & shadow render pipeline...');
        }, 350);

        setTimeout(() => {
          appendShellLog('Unlocking frame rates: 120 FPS profile active.');
        }, 750);

        setTimeout(() => {
          btnApplyGFX.disabled = false;
          btnApplyGFX.style.opacity = '1';
          appendShellLog('✔ GFX settings applied successfully.');
          logTerminal('GFX settings applied successfully.', 'success', '[GFX]');
          showToast('GFX Settings Applied!', 'success');
        }, 1200);
      }
    });
  }

  // Kill Emulator
  if (btnKillEmulator) {
    btnKillEmulator.addEventListener('click', () => {
      appendShellLog('Terminating emulator processes (AndroidEmulator.exe, aow_exe.exe)...');
      logTerminal('Terminating GameLoop emulator processes...', 'warn', '[SYS]');
      
      if (sysStatusText) {
        sysStatusText.innerText = 'Terminating...';
        sysStatusText.style.color = '#ff3366';
      }

      btnKillEmulator.disabled = true;
      DesktopBridge.send('kill_emulator', {});

      // Fallback simulation only if running in standalone browser without C++ backend
      if (!hasNativeBridge) {
        setTimeout(() => {
          btnKillEmulator.disabled = false;
          isGameLoopConnected = false;
          if (btnConnectGL) {
            btnConnectGL.classList.remove('connected');
            btnConnectGL.style.opacity = '1';
          }
          if (txtConnectGL) txtConnectGL.innerText = 'Start GameLoop';
          if (sysStatusText) {
            sysStatusText.innerText = 'Standby';
            sysStatusText.style.color = 'var(--cyan-primary)';
          }
          appendShellLog('✔ All emulator processes terminated cleanly.');
          logTerminal('All emulator instances halted.', 'sys', '[SYS]');
          showToast('Emulator Killed', 'warn');
        }, 800);
      }
    });
  }


  // Clear Terminal
  if (btnClearLog) {
    btnClearLog.addEventListener('click', () => {
      const terminal = document.getElementById('terminal-body');
      if (terminal) {
        terminal.innerHTML = '<div class="stream-line sys"><span class="stream-tag">[SYSTEM]</span> Logs flushed. Ready for commands.</div>';
      }
    });
  }

  // Social Links Bridge Log
  const channels = document.querySelectorAll('.channel-card');
  channels.forEach(card => {
    card.addEventListener('click', () => {
      const platform = card.querySelector('.channel-title')?.innerText || 'Channel';
      const url = card.getAttribute('href');
      logTerminal(`Opening official channel: ${platform}`, 'info', '[COMMUNITY]');
      DesktopBridge.send('open_external_link', { platform, url });
    });
  });

  // Security Lockdown: Block context menu and devtools shortcut inspection
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  window.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });
});
