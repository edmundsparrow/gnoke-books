(() => {
  'use strict';

  const pagesEl   = document.getElementById('pages');
  const pages     = Array.from(pagesEl.querySelectorAll('.page'));
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');
  const progress  = document.getElementById('progress');
  const total     = pages.length;
  let current     = 0;

  function layout() {
    pages.forEach((p, i) => {
      p.classList.remove('leaving-forward', 'leaving-back', 'hidden-forward', 'hidden-back');
      if (i === current) return;
      if (i < current) p.classList.add('hidden-back');
      else p.classList.add('hidden-forward');
    });
  }

  function render(prevIndex, direction) {
    pages.forEach((p, i) => {
      p.classList.remove('leaving-forward', 'leaving-back', 'hidden-forward', 'hidden-back');
      if (i === current) {
        p.scrollTop = 0;
        return;
      }
      if (i === prevIndex) {
        p.classList.add(direction === 'next' ? 'leaving-forward' : 'leaving-back');
      } else if (i < current) {
        p.classList.add('hidden-back');
      } else {
        p.classList.add('hidden-forward');
      }
    });
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;
    progress.textContent = `${current + 1} / ${total}`;
  }

  function goTo(index) {
    index = Math.max(0, Math.min(total - 1, index));
    if (index === current) return;
    const direction = index > current ? 'next' : 'back';
    const prevIndex = current;
    current = index;
    render(prevIndex, direction);
  }

  layout();
  prevBtn.disabled = true;
  progress.textContent = `1 / ${total}`;

  nextBtn.addEventListener('click', () => goTo(current + 1));
  prevBtn.addEventListener('click', () => goTo(current - 1));

  // Cover tap-to-open
  pages[0].addEventListener('click', () => goTo(1));

  // Table of contents jumps
  pagesEl.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => goTo(parseInt(el.dataset.goto, 10)));
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });

  // Swipe navigation
  let touchStartX = null, touchStartY = null;
  pagesEl.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  pagesEl.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goTo(current + 1);
      else goTo(current - 1);
    }
    touchStartX = null; touchStartY = null;
  }, { passive: true });

  // Feed slider — explicit pause control (touch has no :hover; CSS handles hover/focus-within)
  const feedTrack = document.getElementById('devFeedTrack');
  const feedPauseBtn = document.getElementById('feedPauseBtn');
  if (feedTrack && feedPauseBtn) {
    feedPauseBtn.addEventListener('click', () => {
      const paused = feedTrack.classList.toggle('paused');
      feedPauseBtn.textContent = paused ? '▶' : '⏸';
      feedPauseBtn.setAttribute('aria-pressed', String(paused));
      feedPauseBtn.setAttribute('aria-label', paused ? 'Resume scrolling feed' : 'Pause scrolling feed');
    });
  }

  // ---------- Install prompt ----------
  const installBanner = document.getElementById('installBanner');
  const installBtn     = document.getElementById('doInstall');
  const dismissBtn      = document.getElementById('dismissInstall');
  let deferredPrompt = null;
  let bannerAutoHide = null;

  const isRunningInstalled = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true; // iOS Safari's own standalone flag

  function showInstallBanner() {
    installBanner.classList.add('show');
    clearTimeout(bannerAutoHide);
    bannerAutoHide = setTimeout(() => {
      installBanner.classList.remove('show'); // slides back up via the existing CSS transition
    }, 15000);
  }

  function hideInstallBanner() {
    clearTimeout(bannerAutoHide);
    installBanner.classList.remove('show');
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    if (isRunningInstalled) return; // already installed and open as an app — never show this again
    deferredPrompt = e;
    if (!localStorage.getItem('emag-install-dismissed')) {
      showInstallBanner();
    }
  });

  installBtn.addEventListener('click', async () => {
    hideInstallBanner();
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    // Some browsers fire 'appinstalled' late or not at all after this flow —
    // don't rely on it alone once the user has accepted the prompt.
    if (choice && choice.outcome === 'accepted') {
      localStorage.setItem('emag-install-dismissed', '1');
    }
  });

  dismissBtn.addEventListener('click', () => {
    hideInstallBanner();
    localStorage.setItem('emag-install-dismissed', '1');
  });

  window.addEventListener('appinstalled', () => {
    hideInstallBanner();
    localStorage.setItem('emag-install-dismissed', '1');
  });

  // Belt-and-suspenders: if the app is (or becomes) standalone — installed via
  // the browser's own UI, not our button — hide the banner and never show it again.
  function hideIfInstalled() {
    const nowInstalled = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (nowInstalled) {
      hideInstallBanner();
      localStorage.setItem('emag-install-dismissed', '1');
    }
    return nowInstalled;
  }
  hideIfInstalled();
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', hideIfInstalled);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') hideIfInstalled();
  });

  // ---------- Service worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline dev server, ignore */ });
    });
  }

  // ---------- Manual force-update ----------
  // Bypasses the SW's normal cache-first/auto lifecycle entirely: unregisters
  // the worker, wipes every cache this origin owns, then does a real network
  // reload (cache: 'reload') so the very next load fetches everything fresh
  // and re-installs whatever the new sw.js/CACHE version brings.
  const forceUpdateBtn = document.getElementById('forceUpdateBtn');
  if (forceUpdateBtn) {
    forceUpdateBtn.addEventListener('click', async () => {
      forceUpdateBtn.classList.add('checking');
      forceUpdateBtn.textContent = '⟳ Updating…';
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (err) {
        // Even if unregister/cache-clear partially fails, still force the reload below.
      } finally {
        location.reload();
      }
    });
  }
})();
