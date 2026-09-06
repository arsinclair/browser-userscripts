// ==UserScript==
// @name         MusicBrainz: Change Release Quality
// @description  Adds shortcuts for increasing or decreasing a MusicBrainz release's data quality.
// @version      2026.09.06.1
// @license      MIT
// @author       Raman Sinclair
// @namespace    https://github.com/arsinclair/browser-userscripts
// @downloadURL  https://github.com/arsinclair/browser-userscripts/raw/dist/musicbrainz-change-release-quality.user.js
// @updateURL    https://github.com/arsinclair/browser-userscripts/raw/dist/musicbrainz-change-release-quality.user.js
// @match        *://*.musicbrainz.org/release/*
// @grant        none
// @run-at       document-idle
// @icon         https://raw.githubusercontent.com/arsinclair/browser-userscripts/master/src/assets/icon.jpg
// @tag          arsinclair
// ==/UserScript==

(function () {
    'use strict';

    // Forked from loujine's “MusicBrainz edit: Change release quality” userscript:
    // https://github.com/loujine/musicbrainz-scripts/blob/master/mb-edit-change_release_quality.user.js

    const EDIT_NOTE = "All available data has been entered.";
    const REQUEST_TIMEOUT_MS = 10_000;
    const RELEASE_PATH_PATTERN = /^\/release\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:\/|$)/iu;
    const QUALITY_VALUES = {
      low: 0,
      normal: 1,
      high: 2
    };
    const QUALITY_NAMES = ["low", "normal", "high"];
    function releaseIdFromUrl() {
      return RELEASE_PATH_PATTERN.exec(location.pathname)?.[1];
    }
    function isLoggedIn() {
      return document.querySelector('a[href*="/register"]') === null;
    }
    function isQualityName(value) {
      return typeof value === "string" && Object.hasOwn(QUALITY_VALUES, value);
    }
    async function getCurrentQuality(releaseId) {
      const url = new URL(`/ws/2/release/${encodeURIComponent(releaseId)}`, location.origin);
      url.searchParams.set("fmt", "json");
      const response = await fetch(url, {
        headers: {
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
      if (!response.ok) {
        throw new Error(`Could not load the release (HTTP ${response.status}).`);
      }
      const release = await response.json();
      if (typeof release !== "object" || release === null || !("quality" in release) || !isQualityName(release.quality)) {
        throw new Error("MusicBrainz returned an unknown release quality.");
      }
      return QUALITY_VALUES[release.quality];
    }
    async function postQuality(releaseId, quality) {
      const edit = new URLSearchParams({
        "change-release-quality.quality": String(quality),
        "change-release-quality.edit_note": EDIT_NOTE
      });
      return fetch(`/release/${encodeURIComponent(releaseId)}/change-quality`, {
        method: "POST",
        body: edit,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    }
    function createButton(direction) {
      const isUpgrade = direction === "upgrade";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = isUpgrade ? "▲" : "▼";
      button.title = `${isUpgrade ? "Increase" : "Decrease"} release data quality`;
      button.setAttribute("aria-label", button.title);
      Object.assign(button.style, {
        appearance: "none",
        background: "none",
        border: "0",
        color: isUpgrade ? "green" : "red",
        cursor: "pointer",
        padding: "0 0.15em"
      });
      return button;
    }
    function setStatus(status, message, color) {
      status.textContent = message;
      status.style.color = color;
    }
    function initialize() {
      if (!isLoggedIn()) return;
      const releaseId = releaseIdFromUrl();
      const changeQualityLink = document.querySelector('a[href*="/change-quality"]');
      if (!releaseId || !changeQualityLink) return;
      const validReleaseId = releaseId;
      const upgradeButton = createButton("upgrade");
      const downgradeButton = createButton("downgrade");
      const status = document.createElement("span");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      changeQualityLink.after(" ", upgradeButton, downgradeButton, " ", status);
      async function changeQuality(offset) {
        upgradeButton.disabled = true;
        downgradeButton.disabled = true;
        setStatus(status, "Updating…", "inherit");
        try {
          const currentQuality = await getCurrentQuality(validReleaseId);
          const nextQuality = currentQuality + offset;
          if (nextQuality < QUALITY_VALUES.low || nextQuality > QUALITY_VALUES.high) {
            setStatus(status, `Already ${QUALITY_NAMES[currentQuality]} quality.`, "inherit");
            return;
          }
          const response = await postQuality(validReleaseId, nextQuality);
          if (!response.ok) {
            throw new Error(`The edit failed (HTTP ${response.status}).`);
          }
          setStatus(status, `Changed to ${QUALITY_NAMES[nextQuality]} quality.`, "green");
        } catch (error) {
          console.error("[MusicBrainz Change Release Quality]", error);
          const message = error instanceof Error ? error.message : "The edit failed.";
          setStatus(status, message, "red");
        } finally {
          upgradeButton.disabled = false;
          downgradeButton.disabled = false;
        }
      }
      upgradeButton.addEventListener("click", () => void changeQuality(1));
      downgradeButton.addEventListener("click", () => void changeQuality(-1));
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initialize, {
        once: true
      });
    } else {
      initialize();
    }

})();
