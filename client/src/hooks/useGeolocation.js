/**
 * @module hooks/useGeolocation
 * @description Core geolocation hook for GPS capture. Supports single-shot
 * capture, multi-reading averaging, accuracy threshold checking, and
 * manual pin placement.
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
 *   capturing: boolean,
 *   error: string|null,
 *   captureLocation: Function,
 *   averageReadings: Function,
 *   setManualPosition: Function,
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
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState(null);
  const [captureMethod, setCaptureMethod] = useState(null);
  const [readingCount, setReadingCount] = useState(0);
  const watchRef = useRef(null);

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
   * Captures a single GPS reading with high accuracy.
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

      setCapturing(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng, accuracy: acc, altitude: alt } = position.coords;
          setLatitude(lat);
          setLongitude(lng);
          setAccuracy(acc);
          setAltitude(alt);
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
  }, [ACCURACY_THRESHOLD]);

  /**
   * Takes multiple GPS readings and averages them for improved accuracy.
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
                // Small delay between readings to allow sensor updates
                setTimeout(takeReading, 800);
              } else {
                // Compute weighted average (weight by inverse accuracy)
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

                setLatitude(avgLat);
                setLongitude(avgLng);
                setAccuracy(bestAcc);
                setAltitude(finalAlt);
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
    []
  );

  /**
   * Sets a manual pin position (from map click).
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   */
  const setManualPosition = useCallback((lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    setAccuracy(null);
    setAltitude(null);
    setCaptureMethod('manual-pin');
    setReadingCount(0);
    setError(null);
    setCapturing(false);
  }, []);

  /**
   * Resets all geolocation state.
   */
  const reset = useCallback(() => {
    setLatitude(null);
    setLongitude(null);
    setAccuracy(null);
    setAltitude(null);
    setCapturing(false);
    setError(null);
    setCaptureMethod(null);
    setReadingCount(0);
  }, []);

  return {
    latitude,
    longitude,
    accuracy,
    altitude,
    capturing,
    error,
    captureLocation,
    averageReadings,
    setManualPosition,
    captureMethod,
    readingCount,
    reset,
  };
}
