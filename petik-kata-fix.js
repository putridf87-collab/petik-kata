/*
 * Petik Kata – responsive layout, hotspot progression and audio unlock fix.
 * Compatible with the standalone H5P GameMap 1.5 export used by this project.
 * Load this file before the document's DOMContentLoaded event (the supplied
 * apply script inserts it immediately before </body>).
 */
(function (root) {
  'use strict';

  const CONTENT_ID = '6ae15f67b9c31c2d15a86021';
  const CONTENT_KEY = 'cid-' + CONTENT_ID;
  const SCRIPT_MARKER = 'petik-kata-responsive-fix';
  const EXPECTED_STAGE_LABELS = [
    'Kenalan dulu yaa...',
    'Ayo bantu Keenan menemukan tanda baca yang tepat!',
    'Sekarang bantu Keenan menyalakan lentera cerita!',
    'Kita tiba di Jembatan Ukir!',
    'Penyunting Cilik',
    'Refleksi Panggung Kata'
  ];

  /**
   * Corrects the H5P GameMap's ambiguous start-node configuration.
   * Only applies to this exact six-stage map; it fails closed on other content.
   * Coordinates, neighbours, restrictions, and all exercise data are untouched.
   */
  function patchProgressionConfig(config) {
    const stages = config && config.gamemapSteps && config.gamemapSteps.gamemap &&
      config.gamemapSteps.gamemap.elements;

    if (!Array.isArray(stages) || stages.length !== EXPECTED_STAGE_LABELS.length) {
      return { applied: false, reason: 'stage-count-mismatch' };
    }

    const labelsMatch = stages.every(function (stage, index) {
      return stage && stage.label === EXPECTED_STAGE_LABELS[index];
    });

    if (!labelsMatch) {
      return { applied: false, reason: 'stage-label-mismatch' };
    }

    stages.forEach(function (stage, index) {
      stage.canBeStartStage = index === 0;
    });

    return { applied: true, startStageIndex: 0, stageCount: stages.length };
  }

  /** Updates the embedded JSON before H5P's DOM-ready initialization runs. */
  function patchEmbeddedContent(integration) {
    const content = integration && integration.contents && integration.contents[CONTENT_KEY];
    if (!content || typeof content.jsonContent !== 'string') {
      return { applied: false, reason: 'content-not-found' };
    }

    let config;
    try {
      config = JSON.parse(content.jsonContent);
    } catch (error) {
      return { applied: false, reason: 'invalid-json' };
    }

    const result = patchProgressionConfig(config);
    if (result.applied) {
      content.jsonContent = JSON.stringify(config);
    }
    return result;
  }

  const OUTER_CSS = [
    'html.h5p-iframe, html.h5p-iframe > body {',
    '  width: 100% !important; height: 100% !important; min-height: 100%;',
    '  margin: 0 !important; padding: 0 !important; overflow: hidden !important;',
    '}',
    'html.h5p-iframe > body > div:first-child {',
    '  width: 100vw !important; height: 100vh !important; height: 100dvh !important;',
    '  margin: 0 !important; padding: 0 !important; overflow: hidden !important;',
    '}',
    'html.h5p-iframe .h5p-content {',
    '  box-sizing: border-box !important; width: 100% !important;',
    '  height: 100% !important; min-height: 100% !important;',
    '  margin: 0 !important; border: 0 !important; overflow: hidden !important;',
    '}',
    'html.h5p-iframe .h5p-container, html.h5p-iframe .h5p-iframe-wrapper {',
    '  box-sizing: border-box !important; width: 100% !important;',
    '  height: 100% !important; min-height: 100% !important; overflow: hidden !important;',
    '}',
    'html.h5p-iframe iframe.h5p-iframe {',
    '  display: block !important; box-sizing: border-box !important;',
    '  width: 100% !important; height: 100% !important; min-height: 100% !important;',
    '  margin: 0 !important; border: 0 !important;',
    '}',
    'html.h5p-iframe .h5p-content-controls { display: none !important; }'
  ].join('\n');

  const INNER_CSS = [
    'html.h5p-iframe, html.h5p-iframe > body {',
    '  width: 100% !important; height: 100% !important; min-height: 100% !important;',
    '  margin: 0 !important; padding: 0 !important; overflow: hidden !important;',
    '}',
    'html.h5p-iframe .h5p-content {',
    '  box-sizing: border-box !important; width: 100% !important;',
    '  height: 100% !important; min-height: 100% !important;',
    '  margin: 0 !important; border: 0 !important; overflow: hidden !important;',
    '}',
    '.h5p-game-map { width: 100% !important; height: 100% !important; min-height: 100% !important; }',
    '.h5p-game-map-container { width: 100% !important; height: 100% !important; min-height: 100% !important; overflow: hidden !important; }',
    '.h5p-game-map-container .h5p-game-map-main {',
    '  box-sizing: border-box !important; width: 100% !important; height: 100% !important;',
    '  min-height: 0 !important; margin: 0 !important; overflow: hidden !important;',
    '}',
    '.h5p-game-map-toolbar-tool-bar .toolbar-headline { display: none !important; }'
  ].join('\n');

  function addStyle(doc, id, css) {
    if (!doc || !doc.head || doc.getElementById(id)) return;
    const style = doc.createElement('style');
    style.id = id;
    style.textContent = css;
    doc.head.appendChild(style);
  }

  function getGameMapInstance(frame) {
    try {
      const childWindow = frame.contentWindow;
      const instances = childWindow && childWindow.H5P && childWindow.H5P.instances;
      if (!Array.isArray(instances)) return null;
      return instances.find(function (instance) {
        return instance && instance.main && instance.main.map &&
          instance.main.toolbar && instance.main.contentDOM;
      }) || null;
    } catch (error) {
      return null;
    }
  }

  function installFrame(frame) {
    if (!frame || frame.__petikKataFixInstalled) return;
    frame.__petikKataFixInstalled = true;

    const outerWindow = root;
    let installed = false;
    let pollCount = 0;
    let pollTimer = null;

    function tryInstall() {
      pollCount += 1;
      let childWindow;
      let childDocument;
      try {
        childWindow = frame.contentWindow;
        childDocument = frame.contentDocument;
      } catch (error) {
        return false;
      }

      if (!childWindow || !childDocument || !childDocument.documentElement) return false;
      addStyle(childDocument, SCRIPT_MARKER + '-inner-css', INNER_CSS);

      const instance = getGameMapInstance(frame);
      if (!instance) return false;

      const main = instance.main;
      const map = main.map;
      const toolbar = main.toolbar;
      const image = map && map.image;
      if (!image || !toolbar || !main.contentDOM || typeof map.setFullscreen !== 'function') {
        return false;
      }

      installed = true;
      if (pollTimer) clearInterval(pollTimer);

      let fitQueued = false;
      function fitMap() {
        if (fitQueued) return;
        fitQueued = true;
        childWindow.requestAnimationFrame(function () {
          fitQueued = false;
          try {
            if (!image.complete || !image.naturalWidth) return;
            const contentRect = main.contentDOM.getBoundingClientRect();
            const width = Math.floor(main.contentDOM.clientWidth || contentRect.width);
            const toolbarHeight = toolbar.getFullHeight();
            const height = Math.floor((main.contentDOM.clientHeight || contentRect.height) - toolbarHeight);
            const imageRect = image.getBoundingClientRect();

            // The H5P map method preserves the source image aspect ratio and
            // applies the same dimensions to image, paths and hotspot layers.
            if (width < 120 || height < 120 || imageRect.width <= 0 || imageRect.height <= 0) return;
            map.setFullscreen(true, { width: width, height: height });
          } catch (error) {
            console.warn('[Petik Kata] Responsive map resize skipped:', error);
          }
        });
      }

      function removeAudioGestureListeners() {
        childDocument.removeEventListener('pointerdown', unlockAudioFromGesture, true);
        childDocument.removeEventListener('keydown', unlockAudioFromGesture, true);
      }

      function requestBackgroundAudio(fromUserGesture) {
        if (main.__petikKataAudioStarted || (main.__petikKataAudioPending && !fromUserGesture)) return;
        if (typeof main.tryStartBackgroundMusic !== 'function') return;

        // A trusted gesture may retry even while an autoplay attempt is pending.
        // Attempt IDs prevent an older rejected promise from muting a newer success.
        const attemptId = (main.__petikKataAudioAttempt || 0) + 1;
        main.__petikKataAudioAttempt = attemptId;
        main.__petikKataAudioPending = true;
        main.isAudioOn = true;
        let startPromise;
        try {
          // Attempt autoplay. Browsers may reject this until a real user gesture.
          startPromise = main.tryStartBackgroundMusic();
        } catch (error) {
          startPromise = Promise.reject(error);
        }

        Promise.resolve(startPromise).then(function () {
          if (main.__petikKataAudioAttempt !== attemptId) return;
          main.__petikKataAudioStarted = true;
          main.__petikKataAudioPending = false;
          toolbar.forceButton('audio', true, { noCallback: true });
          removeAudioGestureListeners();
        }).catch(function (error) {
          if (main.__petikKataAudioAttempt !== attemptId) return;
          main.isAudioOn = false;
          main.__petikKataAudioPending = false;
          toolbar.forceButton('audio', false, { noCallback: true });
          console.info('[Petik Kata] Audio menunggu interaksi pertama pengguna:', error && error.name ? error.name : 'autoplay-blocked');
        });
      }

      function unlockAudioFromGesture(event) {
        const target = event && event.target;
        // The native H5P speaker control already starts sound from a trusted click.
        if (target && typeof target.closest === 'function' && target.closest('.toolbar-button-audio')) {
          main.__petikKataAudioAttempt = (main.__petikKataAudioAttempt || 0) + 1;
          main.__petikKataAudioPending = false;
          removeAudioGestureListeners();
          return;
        }
        requestBackgroundAudio(true);
      }

      image.addEventListener('load', fitMap);
      childWindow.addEventListener('resize', fitMap, { passive: true });
      childWindow.addEventListener('orientationchange', fitMap, { passive: true });
      if (childWindow.visualViewport) {
        childWindow.visualViewport.addEventListener('resize', fitMap, { passive: true });
      }
      if (typeof childWindow.ResizeObserver === 'function') {
        const observer = new childWindow.ResizeObserver(fitMap);
        observer.observe(main.contentDOM);
        frame.__petikKataResizeObserver = observer;
      }

      childDocument.addEventListener('pointerdown', unlockAudioFromGesture, true);
      childDocument.addEventListener('keydown', unlockAudioFromGesture, true);
      outerWindow.addEventListener('resize', fitMap, { passive: true });
      outerWindow.addEventListener('orientationchange', fitMap, { passive: true });

      if (image.complete && image.naturalWidth > 0) fitMap();
      requestBackgroundAudio();

      console.info('[Petik Kata] Hotspot map responsive handler initialized.');
      return true;
    }

    pollTimer = setInterval(function () {
      if (tryInstall() || pollCount >= 100) {
        clearInterval(pollTimer);
        if (!installed) {
          console.warn('[Petik Kata] H5P GameMap belum siap; tidak ada koordinat hotspot yang diubah.');
        }
      }
    }, 200);

    frame.addEventListener('load', tryInstall);
    tryInstall();
  }

  function boot() {
    const progression = patchEmbeddedContent(root.H5PIntegration);
    if (progression.applied) {
      console.info('[Petik Kata] Urutan tahap diperbaiki: hanya tahap pertama menjadi titik mulai.');
    } else {
      console.warn('[Petik Kata] Konfigurasi urutan tahap tidak diubah:', progression.reason);
    }

    addStyle(root.document, SCRIPT_MARKER + '-outer-css', OUTER_CSS);

    function scanFrames() {
      root.document.querySelectorAll('iframe.h5p-iframe').forEach(installFrame);
    }

    scanFrames();
    if (typeof root.MutationObserver === 'function') {
      const observer = new root.MutationObserver(scanFrames);
      observer.observe(root.document.documentElement, { childList: true, subtree: true });
    }
    root.addEventListener('resize', scanFrames, { passive: true });
  }

  const api = {
    CONTENT_ID: CONTENT_ID,
    EXPECTED_STAGE_LABELS: EXPECTED_STAGE_LABELS.slice(),
    patchProgressionConfig: patchProgressionConfig,
    patchEmbeddedContent: patchEmbeddedContent
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root && root.document && !root.__petikKataResponsiveFixBooted) {
    root.__petikKataResponsiveFixBooted = true;
    boot();
  }
})(typeof window !== 'undefined' ? window : null);
