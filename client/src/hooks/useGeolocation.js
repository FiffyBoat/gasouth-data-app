/**
 * @module hooks/useGeolocation
 * @description Core geolocation hook for GPS capture. Supports continuous
 * watchPosition warm-up (best reading auto-selected in background), single-shot capture,
 * multi-reading averaging, accuracy threshold checking, manual pin placement,
 * and an explicit isLocked state that unlocks the camera.
 */

import { useState, useCallback, useRef } from 'react';

const DEFAULT_ACCURACY_THRESHOLD = 15; // meters

/**
 * Custom hook that provides GPS location capture capabilities.
 *
 * @returns {{
 *   latitude: number|null,
 *   longitude: number|null,
 *   accuracy: number|null,
 *   altitude: number|null,
 *   isLocked: boolean,
 *   liveAccuracy: number|null,
 *   liveLatitude: number|null,
 *   liveLongitude: number|null,
 *   capturing: boolean,
 *   watchActive: boolean,
 *   error: string|null,
 *   captureLocation: Function,
 *   averageReadings: Function,
 *   setManualPosition: Function,
 *   startWatching: Function,
 *   stopWatching: Function,
 *   captureMethod: string|null,
 *   readingCount: number,
 *   reset: Function,
 * }}
 */
export default function useGeolocation() {
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [altitude, setAltitude] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  // Live incoming readings from background satellite warming (before lock)
  const [liveAccuracy, setLiveAccuracy] = useState(null);
  const [liveLatitude, setLiveLatitude] = useState(null);
  const [liveLongitude, setLiveLongitude] = useState(null);

  const [capturing, setCapturing] = useState(false);
  const [watchActive, setWatchActive] = useState(false);
  const [error, setError] = useState(null);
  const [captureMethod, setCaptureMethod] = useState(null);
  const [readingCount, setReadingCount] = useState(0);

  const watchRef = useRef(null);
  // Keeps the best reading seen so far while watching (lowest accuracy meters)
  const bestReadingRef = useRef(null);

  const ACCURACY_THRESHOLD = Number(
    import.meta.env.VITE_GPS_ACCURACY_THRESHOLD || DEFAULT_ACCURACY_THRESHOLD
  );

  /**
   * Resolves a user-friendly error message from a GeolocationPositionError.
   * @param {GeolocationPositionError} err
   * @returns {string}
   */
  const getErrorMessage = (err) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location access in your browser or phone settings, then try again.';
      case err.POSITION_UNAVAILABLE:
        return 'Your location is currently unavailable. Make sure GPS is turned on and you are outdoors with a clear sky view.';
      case err.TIMEOUT:
        return 'Location request timed out. Please move to an open area and try again.';
      default:
        return 'An unknown error occurred while capturing your location.';
    }
  };

  /**
   * Starts a continuous watchPosition stream that warms up satellite GPS.
   * Each incoming position updates liveAccuracy/liveLatitude/liveLongitude
   * and is compared against bestReadingRef. Does NOT set isLocked or
   * final coordinates until captureLocation() or "Lock GPS" is triggered.
   */
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) return;
    if (watchRef.current != null) return; // already watching

    bestReadingRef.current = null;
    setWatchActive(true);
    setError(null);

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng, accuracy: acc, altitude: alt } = position.coords;

        setLiveLatitude(lat);
        setLiveLongitude(lng);
        setLiveAccuracy(acc);

        const best = bestReadingRef.current;
        if (best === null || acc < best.acc) {
          bestReadingRef.current = { lat, lng, acc, alt };
        }
      },
      (err) => {
        setError(getErrorMessage(err));
        setWatchActive(false);
        watchRef.current = null;
        bestReadingRef.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  }, []);

  /**
   * Stops the active watchPosition stream.
   */
  const stopWatching = useCallback(() => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setWatchActive(false);
  }, []);

  /**
   * Locks the current best GPS reading from the watch stream (if active)
   * or falls back to a fresh single getCurrentPosition call.
   * Sets isLocked = true, unlocking the photo gate.
   * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
   */
  const captureLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = 'Geolocation is not supported by this browser.';
        setError(msg);
        reject(new Error(msg));
        return;
      }

      // --- Lock the best watch reading immediately if we have one ---
      if (bestReadingRef.current != null) {
        const { lat, lng, acc, alt } = bestReadingRef.current;
        stopWatching();
        setLatitude(lat);
        setLongitude(lng);
        setAccuracy(acc);
        setAltitude(alt);
        setIsLocked(true);
        setCaptureMethod('device-gps');
        setReadingCount(1);
        setCapturing(false);

        if (acc > ACCURACY_THRESHOLD) {
          setError(
            `Accuracy is ${Math.round(acc)}m — above the ${ACCURACY_THRESHOLD}m threshold. ` +
            `Try moving to open sky or use "Average Readings" for a better fix.`
          );
        } else {
          setError(null);
        }

        resolve({ latitude: lat, longitude: lng, accuracy: acc });
        return;
      }

      // --- Fallback: single-shot getCurrentPosition ---
      setCapturing(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng, accuracy: acc, altitude: alt } = position.coords;
          stopWatching();
          setLatitude(lat);
          setLongitude(lng);
          setAccuracy(acc);
          setAltitude(alt);
          setIsLocked(true);
          setCaptureMethod('device-gps');
          setReadingCount(1);
          setCapturing(false);

          if (acc > ACCURACY_THRESHOLD) {
            setError(
              `Accuracy is ${Math.round(acc)}m — above the ${ACCURACY_THRESHOLD}m threshold. Consider re-capturing or averaging readings.`
            );
          }

          resolve({ latitude: lat, longitude: lng, accuracy: acc });
        },
        (err) => {
          const msg = getErrorMessage(err);
          setError(msg);
          setCapturing(false);
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, [ACCURACY_THRESHOLD, stopWatching]);

  /**
   * Takes multiple GPS readings and averages them for improved accuracy.
   * Sets isLocked = true upon completion.
   * @param {number} [count=5] - Number of readings to take
   * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
   */
  const averageReadings = useCallback(
    (count = 5) => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          const msg = 'Geolocation is not supported by this browser.';
          setError(msg);
          reject(new Error(msg));
          return;
        }

        setCapturing(true);
        setError(null);
        setReadingCount(0);

        const readings = [];
        let completed = 0;

        const takeReading = () => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              readings.push({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                acc: position.coords.accuracy,
                alt: position.coords.altitude,
              });
              completed += 1;
              setReadingCount(completed);

              if (completed < count) {
                setTimeout(takeReading, 800);
              } else {
                let totalWeight = 0;
                let weightedLat = 0;
                let weightedLng = 0;
                let avgAlt = 0;
                let altCount = 0;

                readings.forEach((r) => {
                  const weight = 1 / Math.max(r.acc, 1);
                  totalWeight += weight;
                  weightedLat += r.lat * weight;
                  weightedLng += r.lng * weight;
                  if (r.alt != null) {
                    avgAlt += r.alt;
                    altCount += 1;
                  }
                });

                const avgLat = weightedLat / totalWeight;
                const avgLng = weightedLng / totalWeight;
                const bestAcc = Math.min(...readings.map((r) => r.acc));
                const finalAlt = altCount > 0 ? avgAlt / altCount : null;

                stopWatching();
                setLatitude(avgLat);
                setLongitude(avgLng);
                setAccuracy(bestAcc);
                setAltitude(finalAlt);
                setIsLocked(true);
                setCaptureMethod('averaged');
                setCapturing(false);

                resolve({ latitude: avgLat, longitude: avgLng, accuracy: bestAcc });
              }
            },
            (err) => {
              const msg = getErrorMessage(err);
              setError(msg);
              setCapturing(false);
              reject(new Error(msg));
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        };

        takeReading();
      });
    },
    [stopWatching]
  );

  /**
   * Sets a manual pin position (from map click or existing record preload).
   * Sets isLocked = true.
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} [acc=10] - Accuracy
   */
  const setManualPosition = useCallback((lat, lng, acc = 10) => {
    stopWatching();
    setLatitude(lat);
    setLongitude(lng);
    setAccuracy(acc);
    setAltitude(null);
    setIsLocked(true);
    setCaptureMethod('manual-pin');
    setReadingCount(0);
    setError(null);
    setCapturing(false);
  }, [stopWatching]);

  /**
   * Resets all geolocation state and locks.
   */
  const reset = useCallback(() => {
    stopWatching();
    setLatitude(null);
    setLongitude(null);
    setAccuracy(null);
    setAltitude(null);
    setIsLocked(false);
    setLiveAccuracy(null);
    setLiveLatitude(null);
    setLiveLongitude(null);
    setCapturing(false);
    setError(null);
    setCaptureMethod(null);
    setReadingCount(0);
  }, [stopWatching]);

  return {
    latitude,
    longitude,
    accuracy,
    altitude,
    isLocked,
    liveAccuracy,
    liveLatitude,
    liveLongitude,
    capturing,
    watchActive,
    error,
    captureLocation,
    averageReadings,
    setManualPosition,
    startWatching,
    stopWatching,
    captureMethod,
    readingCount,
    reset,
  };
}
